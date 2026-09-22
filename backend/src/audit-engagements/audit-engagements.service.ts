import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditEngagement } from './entities/audit-engagement.entity';
import { AuditWorkstream } from './entities/audit-workstream.entity';
import { AuditSchedule } from '../audit-schedules/entities/audit-schedule.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { EngagementChangeRequest } from './entities/engagement-change-request.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';
import { CreateAuditEngagementDto } from './dto/create-audit-engagement.dto';
import {
  AuditEngagementFilters,
  RiskAssessmentSource,
  AuthenticatedUserContext,
} from './dto/engagement-types';
import { IndependenceService } from '../independence/independence.service';

@Injectable()
export class AuditEngagementsService {
  constructor(
    @InjectRepository(AuditEngagement)
    private repo: Repository<AuditEngagement>,
    @InjectRepository(AuditWorkstream)
    private workstreamRepo: Repository<AuditWorkstream>,
    @InjectRepository(AuditSchedule)
    private scheduleRepo: Repository<AuditSchedule>,
    @InjectRepository(WorkingPaper)
    private workingPaperRepo: Repository<WorkingPaper>,
    @InjectRepository(EngagementChangeRequest)
    private changeRequestRepo: Repository<EngagementChangeRequest>,
    private independenceService: IndependenceService,
  ) {}

  create(createDto: CreateAuditEngagementDto): Promise<AuditEngagement> {
    const {
      auditedDepartment,
      planName,
      leadAuditor,
      isExpectedInfo,
      ...rest
    } = createDto as any;
    const entity = this.repo.create({
      ...rest,
      isExpectedInfo: isExpectedInfo ?? false,
      legacyAuditedDepartment:
        auditedDepartment || rest.legacyAuditedDepartment,
      legacyPlanName: planName || rest.legacyPlanName,
      legacyLeadAuditor: leadAuditor || rest.legacyLeadAuditor,
      status: rest.status || (isExpectedInfo ? 'Draft' : 'Planning'),
    } as unknown as AuditEngagement);
    return this.repo.save(entity);
  }

  async findAll(
    user?: AuthenticatedUserContext,
    filters?: AuditEngagementFilters,
  ) {
    const query = this.repo
      .createQueryBuilder('eng')
      .leftJoinAndSelect('eng.plan', 'plan')
      .leftJoinAndSelect('eng.leadAuditorUser', 'leadAuditorUser')
      .orderBy('eng.createdAt', 'DESC');

    if (filters?.planId) {
      query.andWhere('eng.planId = :planId', { planId: filters.planId });
    }
    if (filters?.status) {
      query.andWhere('eng.status = :status', { status: filters.status });
    }
    if (filters?.engagementType) {
      query.andWhere('eng.engagementType = :engagementType', {
        engagementType: filters.engagementType,
      });
    }
    if (filters?.ownerTeam) {
      query.andWhere('eng.ownerTeam = :ownerTeam', {
        ownerTeam: filters.ownerTeam,
      });
    }
    if (filters?.departmentId) {
      query.andWhere('eng.legacyAuditedDepartment = :departmentId', {
        departmentId: filters.departmentId,
      });
    }

    // CHÍNH SÁCH BẢO MẬT DỮ LIỆU (DATA SEGREGATION)
    const isAdmin = ScopeFilterService.isAdminRole(user?.role);
    const roleLower = (user?.role || '').toString().toLowerCase();
    const isAuditee =
      roleLower.includes('đơn vị') || roleLower.includes('auditee');

    if (user && !isAdmin) {
      if (isAuditee) {
        // Đơn vị chỉ thấy các cuộc KT liên quan đến phòng ban của mình
        query.andWhere('eng.legacyAuditedDepartment = :dept', {
          dept: user.legacyDepartment,
        });
      } else {
        // KTV/Trưởng đoàn/Chuyên gia... chỉ thấy các cuộc KT được phân công hoặc cùng TeamCode
        query.andWhere(
          '(eng.leadAuditorId = :userId OR eng.teamMembers LIKE :likeUserId OR eng.ownerTeam = :team OR EXISTS (SELECT 1 FROM audit_workstreams aws WHERE aws."engagementId" = eng.id AND (aws."assignedAuditorId" = :userId OR aws."reviewerId" = :userId)))',
          {
            userId: user.userId,
            likeUserId: `%"userId":${user.userId}%`,
            team: user.teamCode,
          },
        );
      }
    }

    const list = await query.getMany();
    return list.map((eng) => ({
      ...eng,
      leadAuditor:
        eng.legacyLeadAuditor ||
        eng.leadAuditorUser?.fullName ||
        (eng as any).leadAuditor ||
        '',
      planName:
        eng.legacyPlanName || eng.plan?.name || (eng as any).planName || '',
      auditedDepartment:
        (eng.auditedDepartment as any)?.name ||
        eng.legacyAuditedDepartment ||
        eng.branchName ||
        (eng as any).auditedDepartment ||
        '',
    }));
  }

  async findOne(id: number) {
    const eng = await this.repo.findOne({
      where: { id },
      relations: [
        'workstreams',
        'leadAuditorUser',
        'plan',
        'auditedDepartment',
      ],
    });
    if (!eng) return null;
    return {
      ...eng,
      leadAuditor:
        eng.legacyLeadAuditor ||
        eng.leadAuditorUser?.fullName ||
        (eng as any).leadAuditor ||
        '',
      planName:
        eng.legacyPlanName || eng.plan?.name || (eng as any).planName || '',
      auditedDepartment:
        (eng.auditedDepartment as any)?.name ||
        eng.legacyAuditedDepartment ||
        eng.branchName ||
        (eng as any).auditedDepartment ||
        '',
    };
  }

  async createFromRiskAssessment(assessment: RiskAssessmentSource) {
    const highRiskLevels = [
      'high',
      'critical',
      'hạng 4',
      'hang 4',
      'hạng 5',
      'hang 5',
    ];
    const riskLevel = String(assessment.riskLevel || '').toLowerCase();
    if (!highRiskLevels.some((level) => riskLevel.includes(level))) {
      return null;
    }

    const existing = await this.repo.findOne({
      where: { sourceRiskAssessmentId: assessment.id },
    });
    if (existing) return existing;

    const engagement = this.repo.create({
      name: `CTKT ${assessment.legacyUniverseName || assessment.legacyDepartment || assessment.id}`,
      status: 'Planning',
      workspaceStatus: 'Open',
      engagementType: 'Planned',
      sourceRiskAssessmentId: assessment.id,
      sourceAuditUniverseId: assessment.auditUniverseId,
      riskLevel: assessment.riskLevel,
      residualRiskScore: assessment.residualRiskScore,
      auditCategory: assessment.auditCategory,
      branchName: assessment.legacyDepartment,
      legacyAuditedDepartment: assessment.legacyDepartment,
      scope:
        assessment.riskDescription ||
        assessment.notes ||
        `Phạm vi kiểm toán theo đánh giá rủi ro ${assessment.assessmentYear}`,
      objective:
        assessment.mitigationPlan ||
        `Kiểm toán hoạt động có mức rủi ro ${assessment.riskLevel}`,
    });

    return this.repo.save(engagement);
  }

  private isPrivileged(user?: any) {
    return ScopeFilterService.isAdminRole(user?.role);
  }

  private async assertCanManageEngagement(id: number, user?: any) {
    if (this.isPrivileged(user)) return;
    const engagement = await this.repo.findOne({ where: { id } });
    if (!engagement) throw new NotFoundException('Không tìm thấy CTKT');
    if (engagement.leadAuditorId !== user?.userId) {
      throw new ForbiddenException(
        'Chỉ Trưởng đoàn hoặc quản trị được cập nhật workspace CTKT',
      );
    }
  }

  async findWorkstreams(engagementId: number, user?: any) {
    const query = this.workstreamRepo
      .createQueryBuilder('ws')
      .where('ws.engagementId = :engagementId', { engagementId })
      .orderBy('ws.createdAt', 'ASC');

    if (user && !this.isPrivileged(user)) {
      const engagement = await this.repo.findOne({
        where: { id: engagementId },
      });
      if (engagement?.leadAuditorId !== user.userId) {
        query.andWhere(
          '(ws.assignedAuditorId = :userId OR ws.reviewerId = :userId)',
          { userId: user.userId },
        );
      }
    }

    return query.getMany();
  }

  async createWorkstream(engagementId: number, dto: any, user?: any) {
    await this.assertCanManageEngagement(engagementId, user);
    const entity = this.workstreamRepo.create({
      ...dto,
      engagementId,
      status: dto.status || 'Draft',
    });
    return this.workstreamRepo.save(entity);
  }

  async updateWorkstream(id: number, dto: any, user?: any) {
    const existing = await this.workstreamRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy phần hành');
    await this.assertCanManageEngagement(existing.engagementId, user);
    await this.workstreamRepo.update(id, dto);
    return this.workstreamRepo.findOne({ where: { id } });
  }

  async deleteWorkstream(id: number, user?: any) {
    const existing = await this.workstreamRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy phần hành');
    await this.assertCanManageEngagement(existing.engagementId, user);
    await this.workstreamRepo.delete(id);
    return { success: true };
  }

  async completeWorkstream(id: number, user?: any) {
    const ws = await this.workstreamRepo.findOne({ where: { id } });
    if (!ws) throw new NotFoundException('Không tìm thấy phần hành');
    if (!this.isPrivileged(user) && ws.assignedAuditorId !== user?.userId) {
      throw new ForbiddenException(
        'Chỉ KTV phụ trách được đánh dấu hoàn thành phần hành',
      );
    }
    await this.workstreamRepo.update(id, {
      status: 'Completed',
      completedAt: new Date(),
    });
    return this.workstreamRepo.findOne({ where: { id } });
  }

  async reviewWorkstream(
    id: number,
    dto: { status: string; reviewNotes?: string },
    user?: any,
  ) {
    const ws = await this.workstreamRepo.findOne({ where: { id } });
    if (!ws) throw new NotFoundException('Không tìm thấy phần hành');
    await this.assertCanManageEngagement(ws.engagementId, user);
    const status = dto.status === 'Rework' ? 'Rework' : 'Reviewed';
    await this.workstreamRepo.update(id, {
      status,
      reviewedAt: status === 'Reviewed' ? new Date() : undefined,
      reviewNotes: dto.reviewNotes || '',
    });
    return this.workstreamRepo.findOne({ where: { id } });
  }

  /**
   * Trưởng đoàn trình duyệt Kế hoạch Đề cương, Nhân sự & Mẫu chọn (Bước 1 quy trình)
   * Có thể trình duyệt nhiều lần sau các đợt yêu cầu chỉnh sửa (Rework)
   */
  async submitProposal(id: number, user?: any, notes?: string) {
    const engagement = await this.repo.findOne({ where: { id } });
    if (!engagement)
      throw new NotFoundException('Không tìm thấy cuộc kiểm toán');

    const history = engagement.proposalReviewHistory || [];
    const nextIter = history.length + 1;
    const historyEntry = {
      iteration: nextIter,
      action: 'SUBMIT' as const,
      actorId: user?.userId || engagement.leadAuditorId || 0,
      actorName:
        user?.fullName ||
        user?.username ||
        engagement.legacyLeadAuditor ||
        'Trưởng đoàn kiểm toán',
      role: 'Trưởng đoàn kiểm toán',
      timestamp: new Date().toISOString(),
      notes:
        notes ||
        'Trình duyệt Kế hoạch đề cương, phân công nhân sự & danh mục mẫu chọn',
    };

    engagement.proposalStatus = 'Submitted';
    engagement.proposalSubmittedAt = new Date();
    engagement.proposalNotes = historyEntry.notes;
    engagement.proposalReviewHistory = [...history, historyEntry];

    return this.repo.save(engagement);
  }

  /**
   * Trưởng ban KTNB / Người có thẩm quyền phê duyệt Kế hoạch Đề cương & Ký QĐ thành lập Đoàn
   * Chuyển trạng thái cuộc kiểm toán sang Fieldwork và tự động kích hoạt bàn giao mẫu cho KTV
   */
  async approveProposal(id: number, user?: any, notes?: string) {
    const engagement = await this.repo.findOne({ where: { id } });
    if (!engagement)
      throw new NotFoundException('Không tìm thấy cuộc kiểm toán');

    const history = engagement.proposalReviewHistory || [];
    const nextIter = history.length + 1;
    const historyEntry = {
      iteration: nextIter,
      action: 'APPROVE' as const,
      actorId: user?.userId || 0,
      actorName: user?.fullName || user?.username || 'Trưởng ban KTNB',
      role: 'Trưởng Ban KTNB',
      timestamp: new Date().toISOString(),
      notes: notes || 'Đã phê duyệt đề cương & chương trình kiểm toán',
    };

    engagement.proposalStatus = 'Approved';
    engagement.proposalApprovedAt = new Date();
    engagement.proposalApprovedBy = historyEntry.actorName;
    engagement.proposalNotes = historyEntry.notes;
    engagement.status = 'Fieldwork'; // Chuyển ngay sang Bước 2: Thực hiện kiểm toán thực địa
    engagement.isOfficialized = true;
    engagement.officializedAt = new Date();
    engagement.officializedBy = historyEntry.actorName;
    engagement.proposalReviewHistory = [...history, historyEntry];

    return this.repo.save(engagement);
  }

  /**
   * Trưởng ban KTNB yêu cầu review lại/chỉnh sửa Kế hoạch Đề cương & Mẫu chọn
   * Tăng biến đếm proposalRevisionCount (để tính điểm KPI chất lượng lập KH của Trưởng đoàn)
   */
  async rejectProposal(id: number, notes: string, user?: any) {
    if (!notes)
      throw new BadRequestException(
        'Vui lòng nhập lý do yêu cầu chỉnh sửa đề cương',
      );
    const engagement = await this.repo.findOne({ where: { id } });
    if (!engagement)
      throw new NotFoundException('Không tìm thấy cuộc kiểm toán');

    const history = engagement.proposalReviewHistory || [];
    const nextIter = history.length + 1;
    const historyEntry = {
      iteration: nextIter,
      action: 'REWORK' as const,
      actorId: user?.userId || 0,
      actorName: user?.fullName || user?.username || 'Trưởng ban KTNB',
      role: 'Trưởng Ban KTNB',
      timestamp: new Date().toISOString(),
      notes: notes,
    };

    engagement.proposalStatus = 'Rework';
    engagement.proposalRevisionCount =
      (engagement.proposalRevisionCount || 0) + 1;
    engagement.proposalNotes = notes;
    engagement.proposalReviewHistory = [...history, historyEntry];

    return this.repo.save(engagement);
  }

  async requestClose(id: number, notes = '', user?: any) {
    await this.assertCanManageEngagement(id, user);
    await this.validateCloseReadiness(id);
    await this.repo.update(id, {
      workspaceStatus: 'ReadyToClose',
      closeNotes: notes,
    });
    return this.findOne(id);
  }

  async closeWorkspace(id: number, notes = '', user?: any) {
    await this.assertCanManageEngagement(id, user);
    await this.validateCloseReadiness(id);
    await this.repo.update(id, {
      workspaceStatus: 'Closed',
      status: 'Completed',
      closedAt: new Date(),
      closedBy: user?.userId,
      closeNotes: notes,
    });
    return this.findOne(id);
  }

  private async validateCloseReadiness(id: number) {
    const workstreams = await this.workstreamRepo.find({
      where: { engagementId: id },
    });
    const incomplete = workstreams.filter(
      (ws) => ws.status !== 'Completed' && ws.status !== 'Reviewed',
    );
    if (incomplete.length > 0) {
      throw new BadRequestException(
        'Không thể đóng CTKT khi còn phần hành chưa completed',
      );
    }
    const unreviewed = workstreams.filter((ws) => ws.status !== 'Reviewed');
    if (unreviewed.length > 0) {
      throw new BadRequestException(
        'Không thể đóng CTKT khi còn phần hành chưa reviewed',
      );
    }
    const openWps = await this.workingPaperRepo.find({
      where: { engagementId: id },
    });
    const pendingWps = openWps.filter(
      (wp) => !['Approved'].includes(wp.status),
    );
    if (pendingWps.length > 0) {
      throw new BadRequestException(
        'Không thể đóng CTKT khi còn working paper chưa được phê duyệt',
      );
    }
  }

  async update(id: number, updateDto: any) {
    const { auditedDepartment, planName, leadAuditor, ...rest } = updateDto;
    const cleanDto: any = { ...rest };
    if (auditedDepartment !== undefined) {
      cleanDto.legacyAuditedDepartment = auditedDepartment;
    }
    if (planName !== undefined) {
      cleanDto.legacyPlanName = planName;
    }
    if (leadAuditor !== undefined) {
      cleanDto.legacyLeadAuditor = leadAuditor;
    }

    // ===== IIA Standard 1.2: Independence Auto-Block =====
    // Kiểm tra xung đột lợi ích khi phân công thành viên đoàn
    const departmentName =
      auditedDepartment ||
      cleanDto.legacyAuditedDepartment ||
      (await this.repo.findOne({ where: { id } }))?.legacyAuditedDepartment ||
      '';

    if (departmentName) {
      // Check lead auditor
      if (cleanDto.leadAuditorId) {
        const check = await this.independenceService.checkAssignmentSafety(
          cleanDto.leadAuditorId,
          leadAuditor || '',
          departmentName,
        );
        if (!check.safe) {
          throw new BadRequestException(
            `[Chặn phân công - Xung đột độc lập] Trưởng đoàn: ${check.reason}`,
          );
        }
      }

      // Check team members
      if (cleanDto.teamMembers && Array.isArray(cleanDto.teamMembers)) {
        for (const member of cleanDto.teamMembers) {
          const check = await this.independenceService.checkAssignmentSafety(
            member.userId,
            member.fullName || '',
            departmentName,
          );
          if (!check.safe) {
            throw new BadRequestException(
              `[Chặn phân công - Xung đột độc lập] ${member.fullName}: ${check.reason}`,
            );
          }
        }
      }
    }
    // ===== End Independence Auto-Block =====

    await this.repo.update(id, cleanDto);
    const updated = await this.findOne(id);

    if (updated && updated.startDate && updated.endDate) {
      // 1. Xóa các lịch công tác cũ liên quan đến cuộc kiểm toán này
      await this.scheduleRepo.delete({ engagementId: id });

      // 2. Tạo lịch mới cho Trưởng đoàn
      const schedulesToCreate: any[] = [];
      if (updated.leadAuditorId) {
        schedulesToCreate.push(
          this.scheduleRepo.create({
            userId: updated.leadAuditorId,
            userName: updated.legacyLeadAuditor || 'Trưởng đoàn',
            engagementId: updated.id,
            engagementName: updated.name,
            startDate: updated.startDate,
            endDate: updated.endDate,
            status: 'Confirmed', // Đã chốt nên để trạng thái Confirmed/Planned
            teamCode: updated.ownerTeam,
            role: 'Trưởng đoàn kiểm toán',
            isBackup: false,
            location: updated.branchName || 'Tại chỗ',
            travelRequired: !!updated.branchName,
            notes: `[Đã chốt] Trưởng đoàn kiểm toán cho cuộc KT: ${updated.name}`,
          }),
        );
      }

      // 3. Tạo lịch mới cho các Thành viên đoàn
      if (updated.teamMembers && updated.teamMembers.length > 0) {
        for (const tm of updated.teamMembers) {
          schedulesToCreate.push(
            this.scheduleRepo.create({
              userId: tm.userId,
              userName: tm.fullName,
              engagementId: updated.id,
              engagementName: updated.name,
              startDate: updated.startDate,
              endDate: updated.endDate,
              status: 'Confirmed',
              teamCode: updated.ownerTeam,
              role: tm.role || 'Thành viên',
              isBackup: tm.role?.includes('Dự phòng') || false,
              location: updated.branchName || 'Tại chỗ',
              travelRequired:
                !!updated.branchName && !tm.role?.includes('Dự phòng'),
              notes: `[Đã chốt] ${tm.role || 'Thành viên'} cho cuộc KT: ${updated.name}`,
            }),
          );
        }
      }

      if (schedulesToCreate.length > 0) {
        await this.scheduleRepo.save(schedulesToCreate);
      }
    }

    return updated;
  }

  remove(id: number) {
    return this.repo.delete(id);
  }

  // --- Change Request Methods ---

  async createChangeRequest(
    engagementId: number,
    userId: number,
    username: string,
    payload: any,
  ) {
    const engagement = await this.findOne(engagementId);
    if (!engagement) {
      throw new NotFoundException(`AuditEngagement ${engagementId} not found`);
    }

    const { reason, ...requestedChanges } = payload;
    if (!reason) {
      throw new BadRequestException('Bắt buộc phải có lý do thay đổi');
    }

    const request = this.changeRequestRepo.create({
      engagementId,
      requesterId: userId,
      requesterName: username,
      requestedChanges,
      reason,
      status: 'Pending',
    });

    return this.changeRequestRepo.save(request);
  }

  async getChangeRequests(status?: string) {
    const query = this.changeRequestRepo
      .createQueryBuilder('cr')
      .leftJoinAndSelect('cr.engagement', 'engagement')
      .orderBy('cr.createdAt', 'DESC');

    if (status) {
      query.where('cr.status = :status', { status });
    }

    return query.getMany();
  }

  async approveChangeRequest(
    reqId: number,
    reviewerId: number,
    reviewerName: string,
  ) {
    const request = await this.changeRequestRepo.findOne({
      where: { id: reqId },
      relations: ['engagement'],
    });

    if (!request) {
      throw new NotFoundException(`Change Request ${reqId} not found`);
    }

    if (request.status !== 'Pending') {
      throw new BadRequestException(
        `Change Request is already ${request.status}`,
      );
    }

    // Chống tự duyệt (Self-Approval Prevention)
    if (
      request.requesterId &&
      reviewerId &&
      request.requesterId === reviewerId
    ) {
      throw new BadRequestException(
        'Theo nguyên tắc 4 mắt (Four-Eyes), người gửi yêu cầu điều chỉnh không được tự phê duyệt yêu cầu của mình',
      );
    }

    const executeApprovalInTransaction = async (manager: any) => {
      // Apply changes to engagement
      const engagementId = request.engagementId;
      await this.update(engagementId, request.requestedChanges);

      // Update request status
      request.status = 'Approved';
      request.reviewerId = reviewerId;
      request.reviewerName = reviewerName;

      const changeRepo = manager.getRepository
        ? manager.getRepository(EngagementChangeRequest)
        : this.changeRequestRepo;
      return changeRepo.save(request);
    };

    if (
      this.changeRequestRepo.manager &&
      typeof this.changeRequestRepo.manager.transaction === 'function'
    ) {
      return this.changeRequestRepo.manager.transaction(
        executeApprovalInTransaction,
      );
    }
    return executeApprovalInTransaction(
      this.changeRequestRepo.manager || this.changeRequestRepo,
    );
  }

  async rejectChangeRequest(
    reqId: number,
    reviewerId: number,
    reviewerName: string,
    reviewNotes: string,
  ) {
    const request = await this.changeRequestRepo.findOne({
      where: { id: reqId },
    });
    if (!request) {
      throw new NotFoundException(`Change Request ${reqId} not found`);
    }

    if (request.status !== 'Pending') {
      throw new BadRequestException(
        `Change Request is already ${request.status}`,
      );
    }

    request.status = 'Rejected';
    request.reviewerId = reviewerId;
    request.reviewerName = reviewerName;
    request.reviewNotes = reviewNotes || 'Không có ghi chú';

    return this.changeRequestRepo.save(request);
  }

  // ═══════════════════════ XUẤT KẾ HOẠCH KIỂM TOÁN (MB01A & MB02A) ═══════════════════════

  /**
   * Sinh Kế hoạch kiểm toán chi tiết dạng Word:
   * - MB01A: Kế hoạch kiểm toán Chi nhánh
   * - MB02A: Kế hoạch kiểm toán Phòng Giao dịch Bưu điện (PGDBĐ / Tiết kiệm bưu điện)
   */
  async generatePlanWord(id: number, templateType?: string): Promise<Buffer> {
    const engagement = await this.repo.findOne({
      where: { id },
      relations: ['leadAuditorUser', 'auditedDepartment', 'plan'],
    });
    if (!engagement) {
      throw new NotFoundException(`Không tìm thấy cuộc kiểm toán #${id}`);
    }

    const {
      Document,
      Packer,
      Paragraph,
      TextRun,
      Table,
      TableRow,
      TableCell,
      WidthType,
      AlignmentType,
      BorderStyle,
      HeadingLevel,
    } = require('docx');

    const mode =
      templateType ||
      (engagement.auditCategory === 'HEAD_OFFICE' ||
      engagement.auditCategory === 'THEMATIC'
        ? 'MB03A'
        : engagement.auditCategory === 'PGDBD_TKBD'
          ? 'MB02A'
          : 'MB01A');
    const isHsc =
      mode === 'MB03A' ||
      engagement.auditCategory === 'HEAD_OFFICE' ||
      engagement.auditCategory === 'THEMATIC';
    const isPostal =
      !isHsc && (mode === 'MB02A' || engagement.auditCategory === 'PGDBD_TKBD');

    const unitName =
      engagement.branchName ||
      engagement.legacyAuditedDepartment ||
      engagement.name;
    const postalName =
      engagement.postalDepartmentName ||
      'Bưu điện tỉnh / Bưu điện trung tâm đối tác';
    const leadName =
      engagement.legacyLeadAuditor ||
      engagement.leadAuditorUser?.fullName ||
      'Trưởng đoàn';
    const decisionNo = engagement.decisionNo || `QĐ-KTNB-${engagement.id}`;
    const period =
      engagement.fieldworkStartDate && engagement.fieldworkEndDate
        ? `từ ngày ${engagement.fieldworkStartDate} đến ngày ${engagement.fieldworkEndDate}`
        : 'theo kế hoạch đã phê duyệt';

    const children: any[] = [];

    // Header Quốc hiệu / Ngân hàng
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN LỘC PHÁT VIỆT NAM',
            bold: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'KHỐI KIỂM TOÁN NỘI BỘ',
            bold: true,
            size: 22,
            underline: {},
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Tiêu đề
    const titleText = isHsc
      ? 'KẾ HOẠCH KIỂM TOÁN NGHIỆP VỤ / QUY TRÌNH / CHUYÊN ĐỀ\nTẠI KHỐI / VĂN PHÒNG HỘI SỞ CHÍNH (MB03A)'
      : isPostal
        ? 'KẾ HOẠCH KIỂM TOÁN HOẠT ĐỘNG CUNG CẤP DỊCH VỤ NGÂN HÀNG\nTẠI PHÒNG GIAO DỊCH BƯU ĐIỆN (MB02A)'
        : 'KẾ HOẠCH KIỂM TOÁN NGHIỆP VỤ TÍN DỤNG, PHI TÍN DỤNG VÀ QUẢN LÝ PGDBĐ\nTẠI ĐƠN VỊ KINH DOANH (MB01A)';

    children.push(
      new Paragraph({
        children: [new TextRun({ text: titleText, bold: true, size: 26 })],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: isHsc
              ? `Đối tượng / Quy trình kiểm toán: ${unitName}`
              : `Đơn vị được kiểm toán: ${unitName}${isPostal ? ` (Kênh phối hợp: ${postalName})` : ''}`,
            italics: true,
            size: 22,
          }),
        ],
        alignment: AlignmentType.CENTER,
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // Bảng tóm tắt thông tin đoàn kiểm toán
    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Cuộc kiểm toán',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              width: { size: 25, type: WidthType.PERCENTAGE },
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: engagement.name, size: 20 })],
                }),
              ],
              width: { size: 75, type: WidthType.PERCENTAGE },
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Mã cuộc / Phân loại',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${engagement.engagementCode || engagement.id} | ${isPostal ? 'PGDBĐ / Tiết kiệm bưu điện' : 'Chi nhánh'}`,
                      size: 20,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Trưởng đoàn', bold: true, size: 20 }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: leadName, bold: true, size: 20 }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Thời gian thực hiện',
                      bold: true,
                      size: 20,
                    }),
                  ],
                }),
              ],
              shading: { fill: 'F2F2F2' },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [new TextRun({ text: period, size: 20 })],
                }),
              ],
            }),
          ],
        }),
      ],
    });
    children.push(summaryTable);
    children.push(new Paragraph({ text: '' }));

    // I. Mục tiêu kiểm toán
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'I. MỤC TIÊU KIỂM TOÁN', bold: true, size: 22 }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: isHsc
              ? '1. Đánh giá tính đầy đủ, chặt chẽ và mức độ phù hợp của hệ thống quy chế, quy trình nghiệp vụ cấp toàn hàng.\n2. Kiểm tra việc thiết kế và tính hữu hiệu trong vận hành của các chốt kiểm soát tự động/thủ công trên hệ thống phần mềm (CoreBanking, LOS, eBanking, AML...).\n3. Nhận diện các điểm nghẽn rủi ro hoạt động, rủi ro an ninh thông tin và kiến nghị hoàn thiện chính sách lên Ban Điều hành / Hội đồng Quản trị.'
              : isPostal
                ? '1. Đánh giá tính tuân thủ các quy định nghiệp vụ về cung cấp dịch vụ ngân hàng tại PGDBĐ (huy động vốn, quản lý quỹ, đối soát số liệu).\n2. Kiểm tra việc tuân thủ quy chế phối hợp giữa LPBank và Tổng công ty Bưu điện Việt Nam (VietnamPost).\n3. Nhận diện các rủi ro vận hành, nguy cơ chiếm dụng vốn và gian lận nghiệp vụ.'
                : '1. Đánh giá sự tuân thủ các quy định pháp luật và quy chế nội bộ về hoạt động tín dụng, phi tín dụng, ngân quỹ và quản lý vận hành.\n2. Đo lường hiệu lực và tính hữu hiệu của hệ thống kiểm soát nội bộ tại Chi nhánh.\n3. Đề xuất các biện pháp xử lý, khắc phục tồn tại và phòng ngừa rủi ro.',
            size: 20,
          }),
        ],
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // II. Phạm vi kiểm toán
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'II. PHẠM VI VÀ PHƯƠNG PHÁP KIỂM TOÁN',
            bold: true,
            size: 22,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: isHsc
              ? `Phạm vi kiểm toán bao gồm toàn bộ các quy trình nghiệp vụ trọng yếu thuộc chức năng nhiệm vụ của ${unitName}, hệ thống dữ liệu số liệu toàn hàng trong thời kỳ kiểm toán và các đơn vị, đối tác liên quan trực tiếp.`
              : isPostal
                ? `Phạm vi kiểm toán bao gồm các điểm Bưu điện - Văn hóa xã, Bưu cục trực thuộc ${postalName}. Kiểm tra dữ liệu đối soát trên CoreBanking, khớp đúng tồn quỹ tiền mặt và hồ sơ sổ sách lưu trữ.`
                : `Phạm vi kiểm toán gồm toàn bộ hoạt động Tín dụng (cho vay KHCN, KHDN, bảo lãnh, tài sản bảo đảm) và Phi tín dụng (kế toán, thanh toán, kho quỹ, thẻ, eBanking) tại ${unitName}.`,
            size: 20,
          }),
        ],
      }),
    );
    children.push(new Paragraph({ text: '' }));

    // III. Phân công thành viên đoàn
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'III. PHÂN CÔNG THÀNH VIÊN ĐOÀN KIỂM TOÁN',
            bold: true,
            size: 22,
          }),
        ],
        heading: HeadingLevel.HEADING_2,
      }),
    );

    let membersDesc = `1. ${leadName} - Trưởng đoàn: Điều hành chung, tổng hợp và ký phát hành Biên bản kiểm toán.\n`;
    if (engagement.teamMembers && Array.isArray(engagement.teamMembers)) {
      engagement.teamMembers.forEach((m, idx) => {
        if (m.fullName && m.fullName !== leadName) {
          membersDesc += `${idx + 2}. ${m.fullName} - ${m.role || 'Thành viên'}: Phụ trách kiểm tra hồ sơ mảng nghiệp vụ.\n`;
        }
      });
    }
    children.push(
      new Paragraph({
        children: [new TextRun({ text: membersDesc, size: 20 })],
      }),
    );

    const doc = new Document({
      sections: [{ children }],
    });

    return await Packer.toBuffer(doc);
  }

  // ═══════════════════════ CHÍNH THỨC HÓA ĐOÀN KIỂM TOÁN (IIA 2200 & TT 13) ═══════════════════════

  /**
   * Pha 2: Chính thức hóa Đoàn kiểm toán khi bước vào thời điểm thực hiện
   */
  async officializeEngagement(
    id: number,
    payload: {
      fieldworkStartDate: string;
      fieldworkEndDate: string;
      leadAuditorId?: number;
      leadAuditorName?: string;
      teamMembers: { userId: number; fullName: string; role: string }[];
      decisionDocUrl?: string;
      proposalDocUrl?: string;
      outlineDocUrl?: string;
      samplingPlanDocUrl?: string;
    },
    user?: any,
  ): Promise<AuditEngagement> {
    const engagement = await this.repo.findOne({ where: { id } });
    if (!engagement) {
      throw new NotFoundException(`Không tìm thấy cuộc kiểm toán #${id}`);
    }

    engagement.isOfficialized = true;
    engagement.officializedAt = new Date();
    engagement.officializedBy = user?.username || 'System';
    engagement.status = 'Fieldwork'; // Chuyển từ Planning sang Fieldwork

    if (payload.fieldworkStartDate)
      engagement.fieldworkStartDate = payload.fieldworkStartDate;
    if (payload.fieldworkEndDate)
      engagement.fieldworkEndDate = payload.fieldworkEndDate;
    if (payload.leadAuditorId) engagement.leadAuditorId = payload.leadAuditorId;
    if (payload.leadAuditorName)
      engagement.legacyLeadAuditor = payload.leadAuditorName;
    if (payload.teamMembers) engagement.teamMembers = payload.teamMembers;

    if (payload.decisionDocUrl)
      engagement.decisionDocUrl = payload.decisionDocUrl;
    if (payload.proposalDocUrl)
      engagement.proposalDocUrl = payload.proposalDocUrl;
    if (payload.outlineDocUrl) engagement.outlineDocUrl = payload.outlineDocUrl;
    if (payload.samplingPlanDocUrl)
      engagement.samplingPlanDocUrl = payload.samplingPlanDocUrl;

    return await this.repo.save(engagement);
  }
}
