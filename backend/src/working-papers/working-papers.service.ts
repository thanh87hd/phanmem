import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateWorkingPaperDto } from './dto/create-working-paper.dto';
import { UpdateWorkingPaperDto } from './dto/update-working-paper.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import {
  WorkingPaper,
  WorkingPaperSampleStats,
} from './entities/working-paper.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';
import {
  teamMembersContainsClause,
  teamMembersJsonParam,
} from '../common/utils/team-members-filter.util';
import * as fs from 'fs';
import * as path from 'path';
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
import * as ExcelJS from 'exceljs';

import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QualityReviewsService } from '../quality-reviews/quality-reviews.service';
import { AuditMinutesService } from '../audit-findings/audit-minutes.service';
import { AuditReviewNotesService } from './audit-review-notes.service';
import type { AuthUserContext } from './dto/working-paper-types';
import { assertCanAccessWorkingPaper } from '../common/auth/object-access.util';

interface SampleDocxRow {
  cif?: string;
  accountNumber?: string;
  customerName?: string;
  testResult?: string;
  note?: string;
  sampleData?: { ghi_chu?: string };
}

@Injectable()
export class WorkingPapersService {
  /**
   * Các trường "nghiệp vụ soát xét" được phép ghi kể cả khi WP đã nộp/đã duyệt.
   * Mọi trường KHÁC trong payload PATCH được coi là NỘI DUNG của Giấy tờ làm việc.
   */
  private static readonly REVIEW_META_FIELDS: ReadonlySet<string> = new Set([
    'status',
    'reviewerId',
    'reviewedAt',
    'reviewNotes',
    'reviewHistory',
    'signoffStatus',
    'leadAuditorId',
    'leadApprovedAt',
    'submittedAt',
  ]);

  /**
   * Trạng thái Giấy tờ làm việc bị KHÓA CHỈNH SỬA NỘI DUNG
   * (UAT TC-WP-05 "Khóa chỉnh sửa đối với KTV lập" sau khi nộp,
   *  UAT TC-WP-08 "Không ai có thể chỉnh sửa nội dung nữa" sau khi duyệt).
   */
  private static readonly CONTENT_LOCKED_STATUSES: readonly string[] = [
    'Submitted',
    'Approved',
  ];

  constructor(
    @InjectRepository(WorkingPaper)
    private readonly workingPaperRepository: Repository<WorkingPaper>,
    @InjectRepository(AuditWorkstream)
    private readonly workstreamRepository: Repository<AuditWorkstream>,
    private readonly dataSource: DataSource,
    private readonly auditTrailService: AuditTrailService,
    private readonly notificationsService: NotificationsService,
    private readonly qualityReviewsService: QualityReviewsService,
    private readonly auditMinutesService: AuditMinutesService,
    private readonly auditReviewNotesService: AuditReviewNotesService,
  ) {}

  async getSampleStatsForWorkingPapers(
    wpIds: number[],
  ): Promise<Record<number, WorkingPaperSampleStats>> {
    if (!wpIds || wpIds.length === 0) return {};

    const statsMap: Record<number, WorkingPaperSampleStats> = {};
    for (const id of wpIds) {
      statsMap[id] = {
        total: 0,
        tested: 0,
        untested: 0,
        passed: 0,
        failed: 0,
        completionRate: 100,
        isCompleted: true,
      };
    }

    try {
      const rows = await this.dataSource.query(
        `SELECT 
          b."workingPaperId" as "wpId",
          COUNT(s.id) as "total",
          COUNT(CASE WHEN s."testResult" IS NOT NULL AND s."testResult" NOT IN ('NOT_TESTED', 'PENDING', 'not_tested', 'pending', '') THEN 1 END) as "tested",
          COUNT(CASE WHEN s."testResult" IN ('PASS', 'PASSED', 'pass', 'passed') THEN 1 END) as "passed",
          COUNT(CASE WHEN s."testResult" IN ('FAIL', 'FAILED', 'fail', 'failed', 'EXCEPTION', 'exception') THEN 1 END) as "failed"
        FROM audit_samples s
        JOIN audit_sample_batches b ON s."batchId" = b.id
        WHERE b."workingPaperId" = ANY($1)
        GROUP BY b."workingPaperId"`,
        [wpIds],
      );

      for (const r of rows) {
        const wpId = Number(r.wpId);
        const total = Number(r.total || 0);
        const tested = Number(r.tested || 0);
        const passed = Number(r.passed || 0);
        const failed = Number(r.failed || 0);
        const untested = Math.max(0, total - tested);
        const completionRate =
          total > 0 ? Math.round((tested / total) * 100) : 100;
        const isCompleted = total === 0 || untested === 0;

        statsMap[wpId] = {
          total,
          tested,
          untested,
          passed,
          failed,
          completionRate,
          isCompleted,
        };
      }
    } catch {
      // Fallback gracefully if tables are empty or query fails
    }

    return statsMap;
  }

  async create(
    createWorkingPaperDto: CreateWorkingPaperDto,
    user?: AuthUserContext,
  ) {
    if (user && user.userId && !createWorkingPaperDto.creatorId) {
      createWorkingPaperDto.creatorId = user.userId;
    }
    if (!createWorkingPaperDto.creator) {
      createWorkingPaperDto.creator =
        user?.fullName || user?.username || 'KTV Kiểm toán';
    }

    // Auto-inherit from AuditEngagement if engagementId is provided
    if (createWorkingPaperDto.engagementId) {
      try {
        const eng = await this.dataSource
          .getRepository(AuditEngagement)
          .findOne({
            where: { id: createWorkingPaperDto.engagementId },
          });
        if (eng) {
          if (!createWorkingPaperDto.planName) {
            createWorkingPaperDto.planName = eng.name;
          }
          if (!createWorkingPaperDto.reviewerId && eng.leadAuditorId) {
            createWorkingPaperDto.reviewerId = eng.leadAuditorId;
          }
        }
      } catch (e) {
        // non-blocking
      }
    }

    // Auto-inherit from AuditWorkstream if workstreamId is provided
    if (createWorkingPaperDto.workstreamId) {
      try {
        const ws = await this.workstreamRepository.findOne({
          where: { id: createWorkingPaperDto.workstreamId },
        });
        if (ws) {
          if (!createWorkingPaperDto.objectives && ws.scope) {
            createWorkingPaperDto.objectives = ws.scope;
          }
          if (!createWorkingPaperDto.riskDescription && ws.riskArea) {
            createWorkingPaperDto.riskDescription = ws.riskArea;
          }
          if (ws.assignedAuditorId && !createWorkingPaperDto.creatorId) {
            createWorkingPaperDto.creatorId = ws.assignedAuditorId;
            createWorkingPaperDto.creator =
              ws.assignedAuditorName || createWorkingPaperDto.creator;
          }
          if (ws.reviewerId && !createWorkingPaperDto.reviewerId) {
            createWorkingPaperDto.reviewerId = ws.reviewerId;
          }
        }
      } catch (e) {
        // non-blocking
      }
    }

    if (!createWorkingPaperDto.planName) {
      createWorkingPaperDto.planName = 'Kế hoạch kiểm toán chung';
    }
    if (!createWorkingPaperDto.status) {
      createWorkingPaperDto.status = 'Draft';
    }
    createWorkingPaperDto.reviewHistory = [];

    const wp = this.workingPaperRepository.create(createWorkingPaperDto);
    const savedWp = await this.workingPaperRepository.save(wp);

    // Tự động khởi tạo Batch Ma trận mẫu (40 Cột hoặc 20 Cột) nếu là WP Tín dụng / Phi tín dụng
    if (
      savedWp.domain === 'credit' ||
      savedWp.domain === 'ptd' ||
      savedWp.domain === 'op'
    ) {
      try {
        const existingBatch = await this.dataSource.query(
          `SELECT id FROM audit_sample_batches WHERE "workingPaperId" = $1 LIMIT 1`,
          [savedWp.id],
        );
        if (!existingBatch || existingBatch.length === 0) {
          const isCredit = savedWp.domain === 'credit';
          const batchName = isCredit
            ? `Lô mẫu Tín dụng 40 Cột - ${savedWp.referenceCode || savedWp.title}`
            : `Lô mẫu Phi tín dụng 20 Cột - ${savedWp.referenceCode || savedWp.title}`;
          const sampleType = isCredit
            ? 'CREDIT_AUDIT_40_COLS'
            : 'PTD_REMEDIATION_20_COLS';
          await this.dataSource.query(
            `INSERT INTO audit_sample_batches ("batchName", "sampleType", "engagementId", "workingPaperId", "sampleSize", "createdBy", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, 0, $5, NOW(), NOW())`,
            [
              batchName,
              sampleType,
              savedWp.engagementId || null,
              savedWp.id,
              user?.fullName || 'KTV',
            ],
          );
        }
      } catch (e) {
        // Non-blocking batch creation
      }
    }

    return this.findOne(savedWp.id);
  }

  async findAll(
    user?: AuthUserContext,
    type?: string,
    engagementId?: number,
    assignedOnly?: boolean,
    status?: string,
  ) {
    const query = this.workingPaperRepository
      .createQueryBuilder('wp')
      .leftJoinAndSelect('wp.engagement', 'engagement')
      .leftJoinAndSelect('wp.workstream', 'workstream')
      .leftJoinAndSelect('wp.creatorUser', 'creatorUser')
      .leftJoinAndSelect('wp.reviewerUser', 'reviewerUser')
      .orderBy('wp.createdAt', 'DESC');

    if (type) {
      query.andWhere('wp.type = :type', { type });
    }

    if (engagementId) {
      query.andWhere('wp.engagementId = :engagementId', { engagementId });
    }

    if (status && status !== 'ALL' && status !== 'all') {
      query.andWhere('wp.status = :status', { status });
    }

    const isAdmin = ScopeFilterService.isAdminRole(user?.role);

    if (assignedOnly && user?.userId) {
      query.andWhere(
        '(wp.creatorId = :myUserId OR workstream.assignedAuditorId = :myUserId)',
        { myUserId: user.userId },
      );
    } else if (user && !isAdmin) {
      query.andWhere(
        `(wp.creatorId = :userId OR wp.reviewerId = :userId OR engagement.leadAuditorId = :userId OR ${teamMembersContainsClause('engagement')} OR workstream.assignedAuditorId = :userId OR workstream.reviewerId = :userId)`,
        { userId: user.userId, jsonUser: teamMembersJsonParam(user.userId) },
      );
    }
    const wps = await query.getMany();
    const wpIds = wps.map((w) => w.id);
    const statsMap = await this.getSampleStatsForWorkingPapers(wpIds);

    return wps.map((wp) => {
      wp.sampleStats = statsMap[wp.id] || {
        total: 0,
        tested: 0,
        untested: 0,
        passed: 0,
        failed: 0,
        completionRate: 100,
        isCompleted: true,
      };
      return wp;
    });
  }

  async findOne(id: number, user?: AuthUserContext) {
    const wp = await this.workingPaperRepository.findOne({
      where: { id },
      relations: ['workstream', 'engagement', 'creatorUser', 'reviewerUser'],
    });
    if (!wp) return null;

    if (user) {
      assertCanAccessWorkingPaper(wp, user, 'READ');
    }

    const statsMap = await this.getSampleStatsForWorkingPapers([wp.id]);
    wp.sampleStats = statsMap[wp.id] || {
      total: 0,
      tested: 0,
      untested: 0,
      passed: 0,
      failed: 0,
      completionRate: 100,
      isCompleted: true,
    };
    return wp;
  }

  /**
   * Liệt kê các trường NỘI DUNG (không thuộc nghiệp vụ soát xét) có trong payload.
   * Dùng cho khóa chỉnh sửa nội dung ở trạng thái Submitted/Approved.
   */
  private getContentFields(dto?: UpdateWorkingPaperDto): string[] {
    if (!dto) return [];
    return Object.keys(dto).filter(
      (key) =>
        (dto as Record<string, unknown>)[key] !== undefined &&
        !WorkingPapersService.REVIEW_META_FIELDS.has(key),
    );
  }

  /**
   * Nguyên tắc 4 mắt (Four-Eyes) + phân quyền phê duyệt.
   * Dùng CHUNG cho approve() (POST /:id/approve) và update() khi PATCH chuyển
   * trạng thái sang 'Approved' — tránh bypass qua endpoint PATCH chung.
   */
  private assertCanApprove(wp: WorkingPaper, user?: AuthUserContext): void {
    // Nguyên tắc 4 mắt: KTV lập không được tự duyệt WP của chính mình
    if (wp.creatorId && user?.userId && wp.creatorId === user.userId) {
      throw new BadRequestException(
        'Theo nguyên tắc 4 mắt (Four-Eyes), kiểm toán viên lập hồ sơ không được tự phê duyệt Working Paper của chính mình',
      );
    }

    const isReviewer = !!user?.userId && wp.reviewerId === user.userId;
    const isLead = !!user?.userId && wp.engagement?.leadAuditorId === user.userId;
    const isWorkstreamReviewer =
      !!user?.userId && wp.workstream?.reviewerId === user.userId;
    const isAdmin = ScopeFilterService.isAdminRole(user?.role);
    if (!isReviewer && !isLead && !isWorkstreamReviewer && !isAdmin) {
      throw new BadRequestException(
        'Chỉ Trưởng đoàn hoặc Người soát xét mới có quyền phê duyệt Giấy tờ làm việc',
      );
    }
  }

  async update(
    id: number,
    updateWorkingPaperDto: UpdateWorkingPaperDto,
    user?: AuthUserContext,
    /**
     * Cờ NỘI BỘ cho các luồng đồng bộ hợp lệ (importSyncOffline / import Excel):
     * cho phép ghi nội dung kể cả khi WP đang ở trạng thái Submitted/Approved.
     * Controller PATCH KHÔNG bao giờ truyền cờ này.
     */
    options?: { allowContentEditWhileLocked?: boolean },
  ) {
    const currentWp = await this.findOne(id);
    if (!currentWp) {
      throw new NotFoundException('Không tìm thấy Giấy tờ làm việc');
    }

    if (currentWp.status === 'Locked') {
      throw new BadRequestException(
        'Giấy tờ làm việc đã bị Khóa (Locked), không thể chỉnh sửa.',
      );
    }

    // ═══ FOUR-EYES + IIA 1311 ═══
    // PATCH chuyển trạng thái sang 'Approved' phải tuân thủ ĐÚNG các kiểm soát của
    // approve() (Four-Eyes, phân quyền người soát xét, cổng chất lượng IIA 1311)
    if (updateWorkingPaperDto.status === 'Approved') {
      this.assertCanApprove(currentWp, user);
      await this.auditReviewNotesService.assertCanSignOff(
        id,
        currentWp.workstreamId,
      );
    }

    if (user) {
      assertCanAccessWorkingPaper(currentWp, user, 'UPDATE');
    }

    // ═══ KHÓA CHỈNH SỬA NỘI DUNG (UAT TC-WP-05 & TC-WP-08) ═══
    // WP ở trạng thái Submitted/Approved chỉ nhận các trường nghiệp vụ soát xét
    // (trạng thái, người duyệt, ghi chú soát xét...). Mọi thay đổi nội dung bị chặn.
    if (
      !options?.allowContentEditWhileLocked &&
      WorkingPapersService.CONTENT_LOCKED_STATUSES.includes(currentWp.status)
    ) {
      const contentFields = this.getContentFields(updateWorkingPaperDto);
      if (contentFields.length > 0) {
        throw new BadRequestException(
          `Giấy tờ làm việc đang ở trạng thái ${currentWp.status} nên không thể chỉnh sửa nội dung (${contentFields.join(', ')}). Vui lòng yêu cầu Trưởng đoàn trả lại hồ sơ (Rework) nếu cần thay đổi.`,
        );
      }
    }

    // ═══ COMPLETION GATE: Ràng buộc hoàn thành ma trận mẫu trước khi nộp duyệt ═══
    const isSubmittingOrApproving =
      updateWorkingPaperDto.status === 'PendingReview' ||
      updateWorkingPaperDto.status === 'Submitted' ||
      updateWorkingPaperDto.status === 'Approved';

    if (isSubmittingOrApproving) {
      const stats = currentWp?.sampleStats;
      if (stats && stats.total > 0 && stats.untested > 0) {
        throw new BadRequestException(
          `Không thể nộp hoặc phê duyệt Giấy tờ làm việc: Ma trận mẫu kiểm tra được phân giao còn ${stats.untested}/${stats.total} mẫu chưa được kiểm tra đánh giá kết quả. Vui lòng hoàn thành toàn bộ các mẫu trước khi nộp!`,
        );
      }
    }



    if (
      user &&
      (updateWorkingPaperDto.status === 'Approved' ||
        updateWorkingPaperDto.status === 'Rejected')
    ) {
      if (!updateWorkingPaperDto.reviewerId) {
        updateWorkingPaperDto.reviewerId = user.userId;
      }
      if (!updateWorkingPaperDto.reviewedAt) {
        updateWorkingPaperDto.reviewedAt = new Date();
      }
    }
    await this.workingPaperRepository.update(
      id,
      updateWorkingPaperDto as QueryDeepPartialEntity<WorkingPaper>,
    );
    const updated = await this.findOne(id);
    if (
      updateWorkingPaperDto.status === 'Approved' &&
      updated?.engagementId &&
      this.auditMinutesService
    ) {
      try {
        await this.auditMinutesService.collateFromWorkingPapers(
          updated.engagementId,
          user,
        );
      } catch (err) {
        // Non-blocking
      }
    }
    return updated;
  }

  async submitForReview(id: number, user: AuthUserContext) {
    const wp = await this.findOne(id);
    if (!wp) throw new NotFoundException('Không tìm thấy Giấy tờ làm việc');
    if (wp.status !== 'Draft' && wp.status !== 'Rework') {
      throw new BadRequestException(
        'Chỉ WP ở trạng thái Draft hoặc Rework mới được gửi',
      );
    }

    // Completion gate: kiểm tra 100% mẫu đã được đánh giá
    const stats = wp?.sampleStats;
    if (stats && stats.total > 0 && stats.untested > 0) {
      throw new BadRequestException(
        `Không thể nộp duyệt: Còn ${stats.untested}/${stats.total} mẫu chưa được kiểm tra đánh giá. Vui lòng hoàn thành 100% mẫu kiểm tra trước khi nộp!`,
      );
    }

    const isCreator = wp.creatorId === user?.userId;
    const isAssigned = wp.workstream?.assignedAuditorId === user?.userId;
    const isLead = wp.engagement?.leadAuditorId === user?.userId;
    const isAdmin = ScopeFilterService.isAdminRole(user?.role);
    if (!isCreator && !isAssigned && !isLead && !isAdmin) {
      throw new BadRequestException(
        'Bạn không có quyền nộp duyệt Giấy tờ làm việc này',
      );
    }

    const history = Array.isArray(wp.reviewHistory)
      ? [...wp.reviewHistory]
      : [];
    history.push({
      iteration: history.length + 1,
      action: 'SUBMIT',
      actorId: user?.userId || user?.id || 0,
      actorName: user?.fullName || user?.username || 'KTV Kiểm toán',
      role: user?.role || 'Auditor',
      timestamp: new Date().toISOString(),
      notes: 'KTV đã hoàn thành kiểm thử và nộp hồ sơ cho Trưởng đoàn soát xét',
    });

    await this.workingPaperRepository.update(id, {
      status: 'Submitted',
      submittedAt: new Date(),
      reviewHistory: history,
    });

    // Ghi Audit Trail
    if (this.auditTrailService && user?.userId) {
      await this.auditTrailService.log({
        action: 'UPDATE',
        resource: 'working-papers',
        resourceId: +id,
        userId: user.userId,
        username: user.username,
        newValue: { status: 'Submitted' },
        oldValue: { status: wp.status },
      });
    }

    // Gửi thông báo tới người soát xét
    if (wp.reviewerId && this.notificationsService) {
      await this.notificationsService.create({
        type: 'REVIEW_REQUEST',
        title: 'Yêu cầu soát xét Working Paper',
        message: `WP "${wp.title}" đã được gửi để soát xét bởi ${user?.fullName || user?.username}`,
        recipientId: wp.reviewerId,
        senderId: user?.userId,
        link: '/working-papers',
        relatedEntity: 'WorkingPaper',
        relatedEntityId: +id,
      });
    }

    // Khởi tạo hoặc cập nhật hồ sơ QAIP (Đánh giá chất lượng 3 cấp)
    if (this.qualityReviewsService) {
      const existingQr =
        await this.qualityReviewsService.findByWorkingPaper(+id);
      if (!existingQr) {
        await this.qualityReviewsService.create({
          workingPaperId: +id,
          workingPaperTitle: wp.title,
          selfReviewStatus: 'Pending',
          supervisorReviewStatus: 'Pending',
          independentReviewStatus: 'Pending',
          overallStatus: 'InReview',
        });
      } else {
        await this.qualityReviewsService.update(existingQr.id, {
          overallStatus: 'InReview',
        });
      }
    }

    return this.findOne(id);
  }

  async requestRework(id: number, notes: string, user: AuthUserContext) {
    if (!notes || !notes.trim()) {
      throw new BadRequestException(
        'Vui lòng nhập lý do và ý kiến chỉ đạo yêu cầu chỉnh sửa',
      );
    }

    const wp = await this.findOne(id);
    if (!wp) throw new NotFoundException('Không tìm thấy Giấy tờ làm việc');
    if (wp.status !== 'Submitted') {
      throw new BadRequestException('Chỉ WP đang chờ duyệt mới có thể trả lại');
    }

    const isReviewer = wp.reviewerId === user?.userId;
    const isLead = wp.engagement?.leadAuditorId === user?.userId;
    const isWorkstreamReviewer = wp.workstream?.reviewerId === user?.userId;
    const isAdmin = ScopeFilterService.isAdminRole(user?.role);
    if (!isReviewer && !isLead && !isWorkstreamReviewer && !isAdmin) {
      throw new BadRequestException(
        'Chỉ Trưởng đoàn hoặc Người soát xét mới có quyền yêu cầu chỉnh sửa',
      );
    }

    const history = Array.isArray(wp.reviewHistory)
      ? [...wp.reviewHistory]
      : [];
    history.push({
      iteration: history.length + 1,
      action: 'REWORK',
      actorId: user?.userId || user?.id || 0,
      actorName: user?.fullName || user?.username || 'Trưởng đoàn',
      role: user?.role || 'LeadAuditor',
      timestamp: new Date().toISOString(),
      notes: notes.trim(),
    });

    await this.workingPaperRepository.update(id, {
      status: 'Rework',
      reviewNotes: notes.trim(),
      reviewerId: user?.userId,
      reviewedAt: new Date(),
      reviewHistory: history,
    });

    // Ghi Audit Trail
    if (this.auditTrailService && user?.userId) {
      await this.auditTrailService.log({
        action: 'UPDATE',
        resource: 'working-papers',
        resourceId: +id,
        userId: user.userId,
        username: user.username,
        newValue: { status: 'Rework', reviewNotes: notes.trim() },
        oldValue: { status: wp.status },
      });
    }

    // Thông báo cho KTV lập WP
    if (wp.creatorId && this.notificationsService) {
      await this.notificationsService.create({
        type: 'REWORK',
        title: 'Working Paper cần chỉnh sửa lại',
        message: `WP "${wp.title}" cần chỉnh sửa: ${notes.trim()}`,
        recipientId: wp.creatorId,
        senderId: user?.userId,
        link: '/working-papers',
        relatedEntity: 'WorkingPaper',
        relatedEntityId: +id,
      });
    }

    return this.findOne(id);
  }

  async approve(id: number, notes: string, user: AuthUserContext) {
    const wp = await this.findOne(id);
    if (!wp) throw new NotFoundException('Không tìm thấy Giấy tờ làm việc');
    if (wp.status !== 'Submitted') {
      throw new BadRequestException(
        'Chỉ WP đang chờ duyệt mới có thể phê duyệt',
      );
    }

    // Nguyên tắc 4 mắt (Four-Eyes) + phân quyền người phê duyệt
    // (dùng chung helper với update() để không lộ đường bypass qua PATCH)
    this.assertCanApprove(wp, user);

    // Completion gate: Ma trận mẫu phải hoàn thành 100%
    const stats = wp?.sampleStats;
    if (stats && stats.total > 0 && stats.untested > 0) {
      throw new BadRequestException(
        `Không thể phê duyệt: Ma trận mẫu còn ${stats.untested}/${stats.total} mẫu chưa được đánh giá.`,
      );
    }

    // IIA 1311 Quality Gate: Toàn bộ Review Notes (MB-10) phải ở trạng thái CLOSED
    await this.auditReviewNotesService.assertCanSignOff(id, wp.workstreamId);

    const isLead = !!user?.userId && wp.engagement?.leadAuditorId === user.userId;

    const history = Array.isArray(wp.reviewHistory)
      ? [...wp.reviewHistory]
      : [];
    history.push({
      iteration: history.length + 1,
      action: 'APPROVE',
      actorId: user?.userId || user?.id || 0,
      actorName: user?.fullName || user?.username || 'Trưởng đoàn',
      role: user?.role || 'LeadAuditor',
      timestamp: new Date().toISOString(),
      notes: notes?.trim() || 'Đã phê duyệt đạt chuẩn chất lượng IIA',
    });

    await this.workingPaperRepository.update(id, {
      status: 'Approved',
      signoffStatus: 'APPROVED',
      reviewerId: user?.userId,
      reviewedAt: new Date(),
      leadAuditorId: isLead ? user?.userId : wp.leadAuditorId,
      leadApprovedAt: isLead ? new Date() : wp.leadApprovedAt,
      reviewNotes: notes?.trim() || wp.reviewNotes,
      reviewHistory: history,
    });

    // Tự động tổng hợp phát hiện, mẫu sai sót & nhân sự vào Biên bản kiểm toán (MB04) của đoàn
    if (wp.engagementId && this.auditMinutesService) {
      try {
        await this.auditMinutesService.collateFromWorkingPapers(
          wp.engagementId,
          user,
        );
      } catch (err) {
        // Non-blocking
      }
    }

    // Ghi Audit Trail
    if (this.auditTrailService && user?.userId) {
      await this.auditTrailService.log({
        action: 'UPDATE',
        resource: 'working-papers',
        resourceId: +id,
        userId: user.userId,
        username: user.username,
        newValue: { status: 'Approved' },
        oldValue: { status: wp.status },
      });
    }

    // Thông báo cho KTV lập WP
    if (wp.creatorId && this.notificationsService) {
      await this.notificationsService.create({
        type: 'APPROVED',
        title: 'Working Paper đã được phê duyệt',
        message: `WP "${wp.title}" đã được duyệt bởi ${user?.fullName || user?.username}`,
        recipientId: wp.creatorId,
        senderId: user?.userId,
        link: '/working-papers',
        relatedEntity: 'WorkingPaper',
        relatedEntityId: +id,
      });
    }

    return this.findOne(id);
  }

  async remove(id: number, user?: AuthUserContext) {
    const wp = await this.findOne(id);
    if (!wp) {
      throw new NotFoundException('Không tìm thấy Giấy tờ làm việc');
    }
    if (user) {
      assertCanAccessWorkingPaper(wp, user, 'DELETE');
    }
    if (
      wp.status === 'Submitted' ||
      wp.status === 'Approved' ||
      wp.status === 'Locked'
    ) {
      throw new BadRequestException(
        `Không thể xóa Giấy tờ làm việc ở trạng thái ${wp.status}. Chỉ có thể xóa WP ở trạng thái Draft hoặc Rework.`,
      );
    }
    await this.workingPaperRepository.delete(id);
    return { success: true };
  }

  async generateWord(id: number): Promise<Buffer> {
    const wp = await this.findOne(id);
    if (!wp) throw new NotFoundException('Working Paper not found');

    const templatePath = path.join(process.cwd(), 'templates', 'MB04.docx');
    if (!fs.existsSync(templatePath)) {
      throw new BadRequestException('Không tìm thấy file mẫu (MB04.docx).');
    }

    const samples = await this.dataSource.query(
      `SELECT s.* FROM audit_samples s 
       JOIN audit_sample_batches b ON s."batchId" = b.id 
       WHERE b."workingPaperId" = $1`,
      [id],
    );

    const fileContent = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(fileContent);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const stripHtml = (html: string) =>
      html ? html.replace(/<[^>]+>/g, '') : '';

    doc.render({
      legacyPlanName: wp.legacyPlanName || 'Chưa có thông tin',
      title: wp.title || 'Biên bản Kiểm tra',
      referenceCode: wp.referenceCode || 'N/A',
      status: wp.status || 'N/A',
      objectives: stripHtml(wp.objectives) || 'Không có mục tiêu',
      methodology: stripHtml(wp.methodology) || 'Không có phương pháp',
      procedures: stripHtml(wp.procedures) || 'Không có thủ tục',
      sampleSelection: stripHtml(wp.sampleSelection) || 'Không có chọn mẫu',
      riskDescription: stripHtml(wp.riskDescription) || 'Không có rủi ro',
      conclusion: stripHtml(wp.conclusion) || 'Không có kết luận',
      samples: (samples as SampleDocxRow[]).map((s) => ({
        cif: s.cif || s.accountNumber || 'N/A',
        customerName: s.customerName || 'N/A',
        testResult: s.testResult || 'N/A',
        issue:
          s.note ||
          (s.sampleData ? s.sampleData.ghi_chu : '') ||
          'Không có vấn đề',
      })),
    });

    return doc
      .getZip()
      .generate({ type: 'nodebuffer', compression: 'DEFLATE' });
  }

  async generateExcel(id: number): Promise<Buffer> {
    const wp = await this.findOne(id);
    if (!wp) throw new BadRequestException('Working Paper không tồn tại');

    const data = [
      ['[A] THONG TIN CHUNG'],
      ['Working Paper ID', wp.id],
      ['Engagement', wp.engagement?.name || ''],
      ['Creator', typeof wp.legacyCreator === 'string' ? wp.legacyCreator : ''],
      [''],
      ['[B] KET QUA KTV'],
      ['[1] Muc Tieu & Pham Vi'],
      [wp.objectives || ''],
      [''],
      ['[2] Phuong Phap'],
      [wp.methodology || ''],
      [''],
      ['[3] Mo ta rui ro'],
      [wp.riskDescription || ''],
      [''],
      ['[4] Chon Mau'],
      [wp.sampleSelection || ''],
      [''],
      ['[5] Thu Tuc Kiem Toan'],
      [wp.procedures || ''],
      [''],
      ['[6] Ket Luan'],
      [wp.conclusion || ''],
    ];

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('WorkingPaper');
    data.forEach((row) => ws.addRow(row));
    return (await wb.xlsx.writeBuffer()) as unknown as Buffer;
  }

  async importSyncOffline(
    id: number,
    filePathOrBuffer: string | Buffer,
    user: AuthUserContext,
  ) {
    const workbook = new ExcelJS.Workbook();
    if (Buffer.isBuffer(filePathOrBuffer)) {
      await workbook.xlsx.load(
        filePathOrBuffer as unknown as Parameters<
          typeof workbook.xlsx.load
        >[0],
      );
    } else {
      await workbook.xlsx.readFile(filePathOrBuffer);
    }
    const worksheet = workbook.worksheets[0];
    const aoa: unknown[][] = [];
    worksheet.eachRow((row) => {
      const rowValues = Array.isArray(row.values) ? row.values.slice(1) : [];
      aoa.push(rowValues);
    });

    let objectives = '';
    let methodology = '';
    let conclusion = '';
    let riskDescription = '';
    let sampleSelection = '';
    let procedures = '';
    let wpId: unknown = null;

    for (let i = 0; i < aoa.length; i++) {
      const row = aoa[i];
      if (!row || row.length === 0) continue;
      const key = String(row[0]).trim();
      if (key.includes('Working Paper ID')) {
        wpId = row[1];
      } else if (key.includes('[1] Muc Tieu & Pham Vi')) {
        objectives = aoa[i + 1] ? String(aoa[i + 1][0] || '') : '';
      } else if (key.includes('[2] Phuong Phap')) {
        methodology = aoa[i + 1] ? String(aoa[i + 1][0] || '') : '';
      } else if (key.includes('[3] Ket Luan Kiem Toan')) {
        conclusion = aoa[i + 1] ? String(aoa[i + 1][0] || '') : '';
      } else if (key.includes('[4] Mo Ta Rui Ro')) {
        riskDescription = aoa[i + 1] ? String(aoa[i + 1][0] || '') : '';
      } else if (key.includes('[5] Phuong Phap Chon Mau')) {
        sampleSelection = aoa[i + 1] ? String(aoa[i + 1][0] || '') : '';
      } else if (key.includes('[6] Thu Tuc Chi Tiet')) {
        procedures = aoa[i + 1] ? String(aoa[i + 1][0] || '') : '';
      }
    }

    if (Number(wpId) !== +id) {
      throw new BadRequestException(
        `ID của file Excel (${wpId}) không khớp với ID giấy tờ làm việc (${id})`,
      );
    }

    const updatedWp = await this.update(
      +id,
      {
        objectives,
        methodology,
        conclusion,
        riskDescription,
        sampleSelection,
        procedures,
        status: 'Draft',
        // syncSource: 'ExcelOfflineSync', // Removed because not in DTO
      },
      user,
      // Cờ nội bộ: luồng đồng bộ Excel ngoại tuyến được phép ghi nội dung
      // kể cả khi WP đang Submitted/Approved (đồng bộ sẽ đưa WP về Draft),
      // trong khi endpoint PATCH thông thường vẫn bị khóa chỉnh sửa.
      { allowContentEditWhileLocked: true },
    );

    return updatedWp;
  }
}
