import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { UpdateRecommendationDto } from './dto/update-recommendation.dto';
import {
  RecommendationFilters,
  AuthenticatedUserContext,
  SubmitPlanDto,
  ProgressUpdateDto,
} from './dto/recommendation-types';
import {
  teamMembersContainsClause,
  teamMembersJsonParam,
} from '../common/utils/team-members-filter.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Not, In } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Recommendation } from './entities/recommendation.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { User } from '../users/entities/user.entity';
import { RecommendationExportUtil } from './utils/recommendation-export.util';
import {
  RecommendationStatus,
  RecommendationClosureStatus,
  RecommendationSlaStatus,
  RiskAcceptanceStatus,
} from './entities/recommendation.enums';
import { MailService } from '../mail/mail.service';

import { NotificationsService } from '../notifications/notifications.service';
import {
  isAdminRole,
  isLanhDaoRole,
  isBKSRole,
  isAuditeeRole,
  isTeamLeadRole,
} from '../utils/role-checker.util';
import { assertCanAccessRecommendation } from '../common/auth/object-access.util';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    @InjectRepository(Recommendation)
    private readonly repo: Repository<Recommendation>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  async create(dto: CreateRecommendationDto, user?: AuthenticatedUserContext) {
    if (user && user.userId && !dto.assignedToId) {
      dto.assignedToId = user.userId;
    }

    // Dual-mapping (ADR-0010): Tự động điền finding snapshot và phòng ban từ AuditFinding nếu có findingId
    if (dto.findingId && !dto.finding) {
      const finding = await this.findingRepo.findOne({
        where: { id: dto.findingId },
      });
      if (finding) {
        dto.finding = finding.findingTitle;
        if (!dto.departmentId) {
          dto.departmentId =
            finding.responsibleUnitId || finding.managingBranchId;
        }
        if (!dto.department && finding.managingBranchName) {
          dto.department = finding.managingBranchName;
        }
      }
    }

    const rec = this.repo.create(dto);
    return this.repo.save(rec);
  }

  async findAll(
    user?: AuthenticatedUserContext,
    filters?: RecommendationFilters,
  ) {
    const query = this.repo
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.auditFinding', 'finding')
      .leftJoinAndSelect('finding.engagement', 'engagement')
      .leftJoinAndSelect('finding.workstream', 'workstream')
      .leftJoinAndSelect('rec.assignedToUser', 'assignedToUser')
      .orderBy('rec.createdAt', 'DESC');

    if (filters?.findingId) {
      query.andWhere('rec.findingId = :findingId', {
        findingId: filters.findingId,
      });
    }
    if (filters?.slaStatus) {
      query.andWhere('rec.slaStatus = :slaStatus', {
        slaStatus: filters.slaStatus,
      });
    }
    if (filters?.closureStatus) {
      query.andWhere('rec.closureStatus = :closureStatus', {
        closureStatus: filters.closureStatus,
      });
    }
    if (filters?.department) {
      query.andWhere('rec.legacyDepartment LIKE :department', {
        department: `%${filters.department}%`,
      });
    }
    if (filters?.selfMonitored !== undefined) {
      query.andWhere('rec.selfMonitored = :selfMonitored', {
        selfMonitored: filters.selfMonitored,
      });
    }
    if (filters?.engagementId) {
      query.andWhere('finding.engagementId = :engagementId', {
        engagementId: filters.engagementId,
      });
    }

    const roleStr = (user?.role || '').toString();
    const isAdmin = isAdminRole(roleStr);
    const isLanhDaoKTNB = isLanhDaoRole(roleStr);
    const isBKS = isBKSRole(roleStr);
    const isAuditee = isAuditeeRole(roleStr);

    if (user && !isAdmin && !isLanhDaoKTNB && !isBKS) {
      if (isAuditee) {
        query.andWhere(
          '(rec.legacyDepartment = :dept OR rec.auditeeOwnerId = :userId)',
          { dept: user.legacyDepartment, userId: user.userId },
        );
        const auditeeRows = await query.getMany();
        return auditeeRows.map((rec) => this.withAuditeeAliases(rec));
      }
      query.andWhere(
        `(engagement.leadAuditorId = :userId OR ${teamMembersContainsClause('engagement')} OR rec.ktnbReviewerId = :userId OR rec.assignedToId = :userId OR workstream.assignedAuditorId = :userId OR workstream.reviewerId = :userId)`,
        { userId: user.userId, jsonUser: teamMembersJsonParam(user.userId) },
      );
    }
    const rows = await query.getMany();
    return rows.map((rec) => this.withAuditeeAliases(rec));
  }

  async findOne(
    id: number,
    user?:
      | AuthenticatedUserContext
      | {
          userId?: number;
          id?: number;
          role?: string;
          legacyDepartment?: string;
          department?: string;
          jobTitle?: string;
        },
  ) {
    const rec = await this.repo.findOne({
      where: { id },
      relations: ['auditFinding', 'auditFinding.engagement', 'assignedToUser'],
    });
    if (!rec) return null;
    const mapped = this.withAuditeeAliases(rec);
    if (user) {
      assertCanAccessRecommendation(mapped, user, 'READ');
    }
    return mapped;
  }

  /**
   * LỖI ĐÃ SỬA (TC-AUD-04 — lệch tên trường giữa DB và cổng ĐVĐKT):
   *
   * Cột entity là `legacyAuditeeUnitHead` / `legacyAuditeePoc`, nhưng toàn bộ
   * frontend (AuditeePortal, ActionPlanTrackerTab, Recommendations,
   * RecommendationTimeline) đọc `auditeeUnitHead` / `auditeePoc`.
   *
   * Hệ quả quan sát được trên production: form "Cập nhật tiến độ" luôn nạp
   * rỗng cho hai ô "Trưởng Đơn vị chịu trách nhiệm" và "Nhân sự đầu mối của
   * Đơn vị" — tức là đúng triệu chứng "bấm Cập nhật tiến độ không ra thông tin"
   * mà Tester báo cáo. Dữ liệu ĐÃ có trong DB nhưng không có đường nào tới UI.
   *
   * Sửa ở BIÊN API (thay vì đổi tên cột) để không phải migration dữ liệu và
   * không phá vỡ các bản ghi cũ; đồng thời giữ nguyên tên cột lịch sử.
   */
  private withAuditeeAliases(rec: Recommendation): Recommendation {
    const legacy = rec as unknown as {
      legacyAuditeeUnitHead?: string | null;
      legacyAuditeePoc?: string | null;
    };
    return Object.assign(rec, {
      auditeeUnitHead: legacy.legacyAuditeeUnitHead ?? null,
      auditeePoc: legacy.legacyAuditeePoc ?? null,
    });
  }

  /** Find recommendations for a specific department (for Auditee Portal) */
  findByDepartment(legacyDepartment: string) {
    return this.repo.find({
      where: { legacyDepartment },
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Payload khôi phục trạng thái khi kiến nghị KHÔNG còn quá hạn (hạn ở tương
   * lai hoặc đến hạn hôm nay). Dùng CHUNG cho cron `checkAndMarkOverdue()` và
   * API `update()` để hai đường ghi luôn nhất quán:
   *  - slaStatus: 'QuaHan' -> 'ChuaDenHan' (giữ nguyên 'GiaHan' — gia hạn chỉ
   *    chặn việc ghi đè trạng thái SLA, không chặn việc khôi phục mức leo thang).
   *  - escalationLevel: đưa về 0 khi > 0, nếu không thì lần vi phạm sau sẽ không
   *    bao giờ gửi được thông báo nữa (điều kiện gửi là `newLevel > storedLevel`)
   *    và thông báo Level 1 bị "nuốt" im lặng.
   *  - status: 'Overdue' -> 'InProgress' nếu progressPercent > 0, ngược lại
   *    'NotStarted'. Nhờ đó getStats().overdue (đếm theo status = 'Overdue')
   *    không còn tính nhầm một kiến nghị đã được dời hạn và không còn trễ.
   * Trả về object rỗng khi không có gì cần ghi (tránh update rỗng).
   */
  private buildOverdueResetPayload(
    rec: Pick<
      Recommendation,
      'slaStatus' | 'escalationLevel' | 'status' | 'progressPercent'
    >,
  ): QueryDeepPartialEntity<Recommendation> {
    const resetData: QueryDeepPartialEntity<Recommendation> = {};
    if (rec.slaStatus === 'QuaHan') {
      resetData.slaStatus = 'ChuaDenHan';
    }
    if ((rec.escalationLevel ?? 0) > 0) {
      resetData.escalationLevel = 0;
    }
    if (rec.status === 'Overdue') {
      resetData.status =
        (rec.progressPercent ?? 0) > 0 ? 'InProgress' : 'NotStarted';
    }
    return resetData;
  }

  /**
   * Find overdue recommendations and escalate based on the Overdue Escalation Matrix.
   *
   * Quy tắc khôi phục khi kiến nghị KHÔNG còn quá hạn được tập trung trong
   * `buildOverdueResetPayload()` (xem chú thích ở helper) và được dùng chung với
   * API `update()` để tránh lệch dữ liệu giữa hai đường ghi.
   */
  async checkAndMarkOverdue(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];
    const todayMs = new Date(today).getTime();

    let count = 0;
    const batchSize = 100;
    let offset = 0;
    let hasMore = true;

    // Người nhận báo cáo BKS/CAE cho Level 3, tra cứu tối đa 1 lần cho mỗi lần
    // chạy: undefined = chưa tra cứu, null = không tìm thấy (dùng dự phòng).
    let bksRecipientId: number | null | undefined = undefined;

    while (hasMore) {
      const pendingRecs = await this.repo.find({
        where: {
          status: In(['NotStarted', 'InProgress', 'Overdue']),
        },
        take: batchSize,
        skip: offset,
      });

      if (pendingRecs.length === 0) {
        hasMore = false;
        break;
      }

      for (const rec of pendingRecs) {
        if (rec.dueDate && rec.dueDate < today) {
          const dueDateMs = new Date(rec.dueDate).getTime();
          const diffTime = Math.abs(todayMs - dueDateMs);
          const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let newLevel = 0;
          let warningMsg = '';
          const notifyRecipientId = rec.assignedToId || 1; // Default to Admin/CAE if unassigned

          if (daysOverdue >= 60) {
            newLevel = 3;
            warningMsg = `🔴 CẢNH BÁO CẤP CAO (Level 3 - Quá hạn ≥ 60 ngày): Kiến nghị kiểm toán tại đơn vị '${rec.legacyDepartment}' đã quá hạn ${daysOverdue} ngày. Vấn đề được báo cáo khẩn cấp lên Ban Kiểm Soát & Giám đốc Khối KTNB!`;
          } else if (daysOverdue >= 30) {
            newLevel = 2;
            warningMsg = `🟠 CẢNH BÁO CẤP 2 (Level 2 - Quá hạn ≥ 30 ngày): Kiến nghị tại đơn vị '${rec.legacyDepartment}' đã quá hạn ${daysOverdue} ngày. Cảnh báo leo thang gửi Giám đốc Vùng và Phó Tổng Giám đốc phụ trách!`;
          } else if (daysOverdue >= 15) {
            newLevel = 1;
            warningMsg = `🟡 CẢNH BÁO CẤP 1 (Level 1 - Quá hạn ≥ 15 ngày): Kiến nghị tại đơn vị '${rec.legacyDepartment}' đã quá hạn ${daysOverdue} ngày. Nhắc nhở gửi trực tiếp Giám đốc Chi nhánh/Đơn vị.`;
          }

          const shouldEscalate = newLevel > rec.escalationLevel;

          const updateData: Partial<Recommendation> = {
            status: 'Overdue',
          };

          if (rec.slaStatus !== 'GiaHan') {
            updateData.slaStatus = 'QuaHan';
          }

          if (shouldEscalate) {
            updateData.escalationLevel = newLevel;
            updateData.escalatedAt = new Date();

            // Gửi thông báo hệ thống tự động
            await this.notificationsService.create({
              type: newLevel === 3 ? 'error' : 'warning',
              title: `Cảnh báo leo thang Level ${newLevel}`,
              message: warningMsg,
              recipientId: notifyRecipientId,
              link: `/recommendations?id=${rec.id}`,
            });

            // Gửi thông báo bổ sung cho Ban Kiểm Soát / CAE khi ở mức Level 3
            if (newLevel === 3) {
              if (bksRecipientId === undefined) {
                bksRecipientId = await this.resolveBksRecipientId();
              }
              // Báo cáo BKS phải tới đúng Ban Kiểm Soát / Giám đốc Khối KTNB (CAE),
              // KHÔNG phải người được phân công xử lý kiến nghị. Chỉ khi hệ thống
              // không tìm được người nhận BKS/CAE mới dùng lại người được phân công
              // (hoặc Admin id 1 nếu chưa phân công).
              const reportRecipientId = bksRecipientId ?? notifyRecipientId;
              try {
                await this.notificationsService.create({
                  type: 'error',
                  title: `BÁO CÁO BAN KIỂM SOÁT`,
                  message: `Báo cáo khẩn cấp: Đơn vị '${rec.legacyDepartment}' chậm khắc phục kiến nghị từ 60 ngày trở lên. Tiêu đề: ${rec.recommendation.substring(0, 40)}...`,
                  recipientId: reportRecipientId,
                  link: `/recommendations?id=${rec.id}`,
                });
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                this.logger.warn(
                  `Không thể tạo notification cấp 3: ${msg}`,
                );
              }
            }

            // Gửi Email cảnh báo (Xử lý ngầm)
            this.mailService
              .sendOverdueWarning(
                'admin@nganhang.vn',
                rec.recommendation,
                rec.dueDate,
                rec.legacyDepartment,
              )
              .catch((e) => this.logger.error('Lỗi gửi email SLA', e));

            count++;
          } else if (rec.escalationLevel > newLevel) {
            // Hạ mức leo thang khi hạn được dời lại gần hơn nhưng vẫn trong quá
            // khứ (ví dụ: Level 2 -> còn 5 ngày trễ). Mức lưu trữ phải phản ánh
            // đúng mức vi phạm hiện tại, nếu không lần vi phạm sau ở cùng mức sẽ
            // không gửi được thông báo (điều kiện gửi là `newLevel > storedLevel`).
            updateData.escalationLevel = newLevel;
          }

          await this.repo.update(rec.id, updateData);
        } else {
          // Kiến nghị không còn quá hạn (hạn ở tương lai hoặc đến hạn hôm nay):
          // khôi phục trạng thái SLA, mức leo thang và trạng thái xử lý.
          const resetData = this.buildOverdueResetPayload(rec);
          if (Object.keys(resetData).length > 0) {
            await this.repo.update(rec.id, resetData);
          }
        }
      }
      offset += batchSize;
    }
    return count;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSlaCron() {
    await this.checkAndMarkOverdue();
  }

  /** ĐVĐKT cập nhật kế hoạch khắc phục */
  async submitRemediationPlan(
    id: number,
    plan: string,
    targetDate?: string,
    extra?: Partial<SubmitPlanDto>,
    user?: AuthenticatedUserContext | { userId?: number; role?: string; legacyDepartment?: string; department?: string; jobTitle?: string },
  ) {
    const existingRec = await this.findOne(id);
    if (!existingRec) throw new NotFoundException('Không tìm thấy kiến nghị');
    if (user) {
      assertCanAccessRecommendation(existingRec, user, 'UPDATE');
    }

    const updatePayload: Partial<Recommendation> = {
      remediationPlan: plan,
      auditeeTargetDate: targetDate,
      status: 'InProgress',
    };
    if (extra) {
      if (extra.remediationFeasibility !== undefined)
        updatePayload.remediationFeasibility = extra.remediationFeasibility;
      if (extra.remediationUnfeasibleReason)
        updatePayload.remediationUnfeasibleReason =
          extra.remediationUnfeasibleReason;
      if (extra.auditeeProposal)
        updatePayload.auditeeProposal = extra.auditeeProposal;
      if (extra.monitoringCycle)
        updatePayload.monitoringCycle = extra.monitoringCycle;
      if (extra.auditeeUnitHead)
        updatePayload.legacyAuditeeUnitHead = extra.auditeeUnitHead;
      if (extra.auditeePoc)
        updatePayload.legacyAuditeePoc = extra.auditeePoc;
    }
    await this.repo.update(id, updatePayload);
    const rec = await this.findOne(id);
    if (!rec) return null;

    // Gửi thông báo cho KTV/Trưởng đoàn
    if (rec.assignedToId) {
      await this.notificationsService.create({
        type: 'info',
        title: 'Kế hoạch khắc phục mới',
        message: `Đơn vị đã gửi kế hoạch khắc phục cho kiến nghị: ${rec.recommendation?.substring(0, 50)}...`,
        recipientId: rec.assignedToId,
        link: `/recommendations?id=${id}`,
      });
    }
    return rec;
  }

  /** ĐVĐKT cập nhật tiến độ / Hoàn thành */
  async updateProgress(
    id: number,
    progressPercent: number,
    response?: string,
    notes?: string,
    extra?: Partial<ProgressUpdateDto>,
    user?: AuthenticatedUserContext | { userId?: number; role?: string; legacyDepartment?: string; department?: string; jobTitle?: string },
  ) {
    const existingRec = await this.findOne(id);
    if (!existingRec) throw new NotFoundException('Không tìm thấy kiến nghị');
    if (user) {
      assertCanAccessRecommendation(existingRec, user, 'UPDATE');
    }

    const update: QueryDeepPartialEntity<Recommendation> = { progressPercent };
    if (response) update.response = response;
    if (notes) update.auditeeNotes = notes;

    if (extra) {
      if (extra.remediationFeasibility !== undefined)
        update.remediationFeasibility = extra.remediationFeasibility;
      if (extra.remediationUnfeasibleReason)
        update.remediationUnfeasibleReason = extra.remediationUnfeasibleReason;
      if (extra.auditeeProposal) update.auditeeProposal = extra.auditeeProposal;
      if (extra.monitoringCycle) update.monitoringCycle = extra.monitoringCycle;
      if (extra.legacyAuditeeUnitHead)
        update.legacyAuditeeUnitHead = extra.legacyAuditeeUnitHead;
      if (extra.legacyAuditeePoc)
        update.legacyAuditeePoc = extra.legacyAuditeePoc;
      if (extra.evidenceLink !== undefined)
        update.evidenceLink = extra.evidenceLink;
    }

    if (progressPercent >= 100) {
      update.status = 'Completed';
      update.closureStatus = 'PendingKTNBReview';
      update.completedAt = new Date();
    } else if (progressPercent > 0) {
      update.status = 'InProgress';
      update.closureStatus = 'PendingAuditeeAction';
    }

    await this.repo.update(id, update);
    const rec = await this.findOne(id);
    if (!rec) return null;

    // Thông báo cho KTV khi hoàn thành
    if (progressPercent >= 100 && rec.assignedToId) {
      await this.notificationsService.create({
        type: 'success',
        title: 'Kiến nghị đã hoàn thành',
        message: `Đơn vị báo cáo đã hoàn thành kiến nghị: ${rec.recommendation?.substring(0, 50)}... Vui lòng xác nhận.`,
        recipientId: rec.assignedToId,
        link: `/recommendations?id=${id}`,
      });
    }

    return rec;
  }

  /** KTV xác nhận kiến nghị đã được khắc phục */
  async verify(
    id: number,
    notes: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    this.assertUpdateAccess(rec, user);

    await this.repo.update(id, {
      status: 'Verified',
      verificationNotes: notes,
      closureStatus: 'PendingTeamLeadOpinion',
    });
    return this.findOne(id);
  }

  async requestClosure(
    id: number,
    user?: AuthenticatedUserContext | { userId?: number; role?: string },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    if (user) {
      assertCanAccessRecommendation(rec, user, 'UPDATE');
    }
    await this.repo.update(id, {
      status: rec.status === 'NotStarted' ? 'InProgress' : rec.status,
      closureStatus: 'PendingKTNBReview',
    });
    return this.findOne(id);
  }

  async ktnbReview(
    id: number,
    notes: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string; username?: string; fullName?: string },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    const roleStr = (user?.role || '').toString();
    if (isAuditeeRole(roleStr)) {
      throw new ForbiddenException(
        'Đơn vị được kiểm toán không có quyền thẩm tra hồ sơ kiến nghị',
      );
    }
    if (
      rec.ktnbReviewerId &&
      rec.ktnbReviewerId !== user?.userId &&
      !this.isPrivileged(user)
    ) {
      throw new ForbiddenException(
        'Chỉ người rà soát KTNB được xác nhận kiến nghị này',
      );
    }
    await this.repo.update(id, {
      ktnbReviewNotes: notes || '',
      ktnbReviewedAt: new Date(),
      ktnbReviewedBy: user?.userId,
      status: 'Verified',
      closureStatus: 'PendingTeamLeadOpinion',
      verificationNotes: notes || rec.verificationNotes,
    });
    return this.findOne(id);
  }

  async teamLeadOpinion(
    id: number,
    opinion: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string; username?: string; fullName?: string },
  ) {
    if (!opinion)
      throw new BadRequestException('Vui lòng nhập ý kiến Trưởng đoàn');
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    await this.assertTeamLeadAccess(rec, user);
    await this.repo.update(id, {
      teamLeadClosureOpinion: opinion,
      teamLeadClosureOpinionBy: user?.userId,
      teamLeadClosureOpinionByName: user?.username,
      teamLeadClosureOpinionAt: new Date(),
      closureStatus: 'PendingTeamLeadOpinion',
    });
    return this.findOne(id);
  }

  async close(
    id: number,
    closedReason: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    if (user) {
      assertCanAccessRecommendation(rec, user, 'CLOSE');
    }
    const roleStr = (user?.role || '').toString();
    if (isAuditeeRole(roleStr)) {
      throw new ForbiddenException(
        'Đơn vị được kiểm toán không có quyền phê duyệt đóng kiến nghị',
      );
    }
    if (!rec.teamLeadClosureOpinion) {
      throw new BadRequestException(
        'Không thể đóng kiến nghị khi chưa có ý kiến Trưởng đoàn',
      );
    }
    if (!closedReason || closedReason.trim() === '') {
      throw new BadRequestException('Vui lòng nhập lý do đóng kiến nghị');
    }
    await this.repo.update(id, {
      status: 'Verified',
      closureStatus: 'Closed',
      closedAt: new Date(),
      closedBy: user?.userId,
      closedReason: closedReason || '',
    });
    return this.findOne(id);
  }

  async setSelfMonitor(
    id: number,
    selfMonitored: boolean,
    selfMonitorFrequency?: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    this.assertUpdateAccess(rec, user);

    if (
      selfMonitored &&
      (!selfMonitorFrequency || selfMonitorFrequency.trim() === '')
    ) {
      throw new BadRequestException(
        'Vui lòng nhập chu kỳ theo dõi khi chuyển kiến nghị sang tự theo dõi',
      );
    }
    await this.repo.update(id, {
      selfMonitored,
      selfMonitorFrequency: selfMonitored ? selfMonitorFrequency : null,
    });
    return this.findOne(id);
  }

  // ===== IIA Standard 7.3: Management Risk Acceptance Workflow =====
  async requestRiskAcceptance(
    id: number,
    reason: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string; fullName?: string; username?: string },
  ) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Vui lòng nêu rõ lý do xin chấp nhận rủi ro');
    }
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');

    await this.repo.update(id, {
      riskAcceptanceStatus: 'PendingCAE',
      riskAcceptanceReason: reason,
      riskAcceptanceRequestedById: user?.userId,
      riskAcceptanceRequestedByName: user?.fullName || user?.username,
      riskAcceptanceRequestedAt: new Date(),
    });
    return this.findOne(id);
  }

  async reviewRiskAcceptanceByCAE(
    id: number,
    forwardToBks: boolean,
    notes: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    if (rec.riskAcceptanceStatus !== 'PendingCAE') {
      throw new BadRequestException(
        'Kiến nghị không ở trạng thái chờ CAE đánh giá rủi ro',
      );
    }

    if (forwardToBks) {
      await this.repo.update(id, {
        riskAcceptanceStatus: 'PendingBKS',
        riskAcceptanceNotes:
          notes || 'CAE đã đánh giá và chuyển BKS/HĐQT xem xét phê duyệt',
      });
    } else {
      await this.repo.update(id, {
        riskAcceptanceStatus: 'Rejected',
        riskAcceptanceNotes:
          notes ||
          'CAE từ chối đề xuất chấp nhận rủi ro (Rủi ro vượt khẩu vị rủi ro)',
      });
    }
    return this.findOne(id);
  }

  async approveRiskAcceptance(
    id: number,
    notes: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string; fullName?: string; username?: string },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    if (
      rec.riskAcceptanceStatus !== 'PendingCAE' &&
      rec.riskAcceptanceStatus !== 'PendingBKS'
    ) {
      throw new BadRequestException(
        'Kiến nghị không ở trạng thái chờ phê duyệt chấp nhận rủi ro',
      );
    }

    await this.repo.update(id, {
      riskAcceptanceStatus: 'Accepted',
      riskAcceptanceApprovedById: user?.userId,
      riskAcceptanceApprovedByName: user?.fullName || user?.username,
      riskAcceptanceApprovedAt: new Date(),
      riskAcceptanceNotes:
        notes ||
        'Ban Lãnh đạo / BKS chấp thuận chấp nhận rủi ro theo Chuẩn mực IIA 7.3',
      closureStatus: 'Closed',
      closedAt: new Date(),
      closedBy: user?.userId,
      closedReason: `Chấp nhận rủi ro theo Chuẩn mực IIA Standard 7.3: ${notes || rec.riskAcceptanceReason || 'Đã phê duyệt'}`,
    });
    return this.findOne(id);
  }

  async rejectRiskAcceptance(
    id: number,
    notes: string,
    user?: AuthenticatedUserContext | { userId?: number; role?: string },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    await this.repo.update(id, {
      riskAcceptanceStatus: 'Rejected',
      riskAcceptanceNotes: notes || 'Từ chối chấp thuận chấp nhận rủi ro',
    });
    return this.findOne(id);
  }

  async exportFull(): Promise<Buffer> {
    const recs = await this.repo.find({
      relations: [
        'auditFinding',
        'auditFinding.engagement',
        'auditFinding.workstream',
        'assignedToUser',
      ],
      order: { createdAt: 'DESC' },
    });
    const findings = await this.findingRepo.find({
      relations: ['engagement', 'workstream', 'workingPaper'],
      order: { createdAt: 'DESC' },
    });

    return RecommendationExportUtil.buildWorkbook(recs, findings);
  }

  /**
   * Xác định người nhận báo cáo cấp cao cho cảnh báo Level 3 (BÁO CÁO BAN KIỂM SOÁT).
   *
   * Thứ tự ưu tiên theo vai trò (dùng lại bộ từ khoá ở role-checker.util.ts,
   * không hard-code username):
   *   1. Ban Kiểm Soát (BKS)
   *   2. Lãnh đạo KTNB / Giám đốc Khối (CAE)
   *   3. Admin
   * Trả về null khi không tìm được ai — khi đó nơi gọi dùng lại người được phân
   * công xử lý (assignedToId) hoặc Admin id 1 làm dự phòng.
   */
  private async resolveBksRecipientId(): Promise<number | null> {
    try {
      const users = await this.repo.manager.getRepository(User).find({
        relations: ['role'],
        order: { id: 'ASC' },
      });

      const roleNameOf = (user: User): string =>
        (user?.role?.name || (user?.role as unknown as string) || '').toString();

      const findByRole = (
        matches: (role: string) => boolean,
      ): User | undefined => users.find((user) => matches(roleNameOf(user)));

      const target =
        findByRole(isBKSRole) ??
        findByRole(isLanhDaoRole) ??
        findByRole(isAdminRole);

      return target?.id ?? null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Không xác định được người nhận BKS/CAE, dùng người được phân công: ${msg}`,
      );
      return null;
    }
  }

  private isPrivileged(user?: AuthenticatedUserContext | { role?: string }) {
    const roleStr = (user?.role || '').toString();
    return isAdminRole(roleStr) || isLanhDaoRole(roleStr);
  }

  private async assertTeamLeadAccess(
    rec: Recommendation,
    user?: AuthenticatedUserContext | { role?: string; userId?: number },
  ) {
    if (this.isPrivileged(user)) return;
    const roleStr = (user?.role || '').toString();
    if (isAuditeeRole(roleStr)) {
      throw new ForbiddenException(
        'Đơn vị được kiểm toán không có quyền nhập ý kiến Trưởng đoàn',
      );
    }
    const finding =
      rec.auditFinding ||
      (rec.findingId
        ? await this.findingRepo.findOne({
            where: { id: rec.findingId },
            relations: ['engagement'],
          })
        : null);
    const isTeamLead = isTeamLeadRole(roleStr);
    const isEngagementLead =
      finding?.engagement?.leadAuditorId === user?.userId;
    const isStandaloneAuditStaff =
      !finding?.engagement && !isAuditeeRole(roleStr);

    if (!isTeamLead && !isEngagementLead && !isStandaloneAuditStaff) {
      throw new ForbiddenException(
        'Chỉ Trưởng đoàn phụ trách được nhập ý kiến đóng kiến nghị',
      );
    }
  }

  private assertUpdateAccess(
    rec: Recommendation,
    user?: AuthenticatedUserContext | { role?: string; userId?: number },
  ) {
    if (!user) return; // if called internally
    if (this.isPrivileged(user)) return;

    // Regular auditor can only update if assigned
    if (rec.assignedToId !== user.userId) {
      throw new ForbiddenException(
        'Bạn không được phân công xử lý kiến nghị này',
      );
    }
  }

  async update(
    id: number,
    dto: UpdateRecommendationDto,
    user?: AuthenticatedUserContext | { role?: string; userId?: number },
  ) {
    const existingRec = await this.findOne(id);
    if (!existingRec) throw new NotFoundException('Không tìm thấy kiến nghị');
    if (user) {
      assertCanAccessRecommendation(existingRec, user, 'UPDATE');
    }
    this.assertUpdateAccess(existingRec, user);

    if (dto.closureStatus === 'Closed' || dto.status === 'Closed') {
      throw new BadRequestException(
        'Không thể đóng kiến nghị trực tiếp qua update. Vui lòng thực hiện quy trình đóng kiến nghị (close) với đầy đủ ý kiến Trưởng đoàn và lý do đóng.',
      );
    }

    await this.repo.update(id, dto);
    const rec = await this.findOne(id);
    if (rec && dto.dueDate && !dto.slaStatus) {
      const today = new Date().toISOString().split('T')[0];
      if (
        rec.dueDate < today &&
        rec.slaStatus !== 'GiaHan' &&
        rec.status !== 'Completed' &&
        rec.status !== 'Verified' &&
        rec.closureStatus !== 'Closed'
      ) {
        await this.repo.update(id, { slaStatus: 'QuaHan', status: 'Overdue' });
      } else if (rec.dueDate >= today) {
        // Hạn mới không còn ở quá khứ: áp dụng ĐÚNG quy tắc khôi phục của cron
        // (slaStatus + escalationLevel + status) ngay trong lượt ghi này, thay vì
        // chỉ đổi slaStatus rồi để escalationLevel/status lệch cho tới lần chạy
        // cron kế tiếp (tối đa ~24h): getStats().overdue đếm nhầm và lần vi phạm
        // lại ở cùng mức sẽ không gửi được thông báo.
        const resetData = this.buildOverdueResetPayload(rec);
        if (Object.keys(resetData).length > 0) {
          await this.repo.update(id, resetData);
        }
      }
    }
    return this.findOne(id);
  }

  async remove(
    id: number,
    user?: AuthenticatedUserContext | { role?: string; userId?: number },
  ) {
    const rec = await this.findOne(id);
    if (!rec) throw new NotFoundException('Không tìm thấy kiến nghị');
    if (user && !this.isPrivileged(user)) {
      throw new ForbiddenException(
        'Chỉ quản trị viên mới có quyền xóa kiến nghị',
      );
    }
    if (rec.status === 'Verified' || rec.closureStatus === 'Closed') {
      throw new BadRequestException(
        'Không thể xóa kiến nghị đã được xác nhận hoàn thành (Verified) hoặc đã đóng (Closed).',
      );
    }
    await this.repo.delete(id);
    return { success: true };
  }

  /** Thống kê cho dashboard */
  async getStats() {
    const total = await this.repo.count();
    const completed = await this.repo.count({ where: { status: 'Completed' } });
    const verified = await this.repo.count({ where: { status: 'Verified' } });
    const overdue = await this.repo.count({ where: { status: 'Overdue' } });
    const inProgress = await this.repo.count({
      where: { status: 'InProgress' },
    });
    const slaChuaDenHan = await this.repo.count({
      where: { slaStatus: 'ChuaDenHan' },
    });
    const slaQuaHan = await this.repo.count({ where: { slaStatus: 'QuaHan' } });
    const slaGiaHan = await this.repo.count({ where: { slaStatus: 'GiaHan' } });
    const selfMonitoredCount = await this.repo.count({
      where: { selfMonitored: true },
    });

    const all = await this.repo.find({
      relations: ['auditFinding', 'auditFinding.engagement'],
    });
    const byFindingRiskLevel: Record<string, number> = {};
    const byDepartment: Record<
      string,
      { total: number; done: number; completionRate: number }
    > = {};
    const byEngagement: Record<
      string,
      { total: number; done: number; completionRate: number }
    > = {};
    let pendingTeamLeadOpinion = 0;

    for (const rec of all) {
      const risk = rec.auditFinding?.riskLevel || 'Unknown';
      byFindingRiskLevel[risk] = (byFindingRiskLevel[risk] || 0) + 1;

      const dept = rec.legacyDepartment || 'Không xác định';
      if (!byDepartment[dept])
        byDepartment[dept] = { total: 0, done: 0, completionRate: 0 };
      byDepartment[dept].total++;

      const eng = rec.auditFinding?.engagement?.name || 'Không xác định';
      if (!byEngagement[eng])
        byEngagement[eng] = { total: 0, done: 0, completionRate: 0 };
      byEngagement[eng].total++;

      const done = rec.status === 'Verified' || rec.closureStatus === 'Closed';
      if (done) {
        byDepartment[dept].done++;
        byEngagement[eng].done++;
      }
      if (rec.closureStatus === 'PendingTeamLeadOpinion')
        pendingTeamLeadOpinion++;
    }

    Object.values(byDepartment).forEach(
      (v) =>
        (v.completionRate = v.total ? Math.round((v.done / v.total) * 100) : 0),
    );
    Object.values(byEngagement).forEach(
      (v) =>
        (v.completionRate = v.total ? Math.round((v.done / v.total) * 100) : 0),
    );

    return {
      total,
      completed,
      verified,
      overdue,
      inProgress,
      byFindingRiskLevel,
      byDepartment,
      byEngagement,
      pendingTeamLeadOpinion,
      slaChuaDenHan,
      slaQuaHan,
      slaGiaHan,
      selfMonitoredCount,
    };
  }
}
