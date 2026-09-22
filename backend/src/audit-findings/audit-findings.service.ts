import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateAuditFindingDto } from './dto/create-audit-finding.dto';
import { UpdateAuditFindingDto } from './dto/update-audit-finding.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { WorkflowsService } from '../workflows/workflows.service';
import { ScopeFilterService } from '../utils/scope-filter.service';
import { AuditFindingsStatisticsService } from './audit-findings-statistics.service';

@Injectable()
export class AuditFindingsService {
  constructor(
    @InjectRepository(AuditFinding)
    private readonly auditFindingRepository: Repository<AuditFinding>,
    @InjectRepository(AuditWorkstream)
    private readonly workstreamRepository: Repository<AuditWorkstream>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepository: Repository<Recommendation>,
    private readonly workflowsService: WorkflowsService,
    private readonly statsService: AuditFindingsStatisticsService,
  ) {}

  async getFindingCodePrefix(
    engagementId?: number,
    workstreamId?: number,
  ): Promise<string> {
    let year = new Date().getFullYear();
    let unitCode = 'GEN';
    let processCode = 'GEN';

    if (engagementId) {
      const engagement = (await this.auditFindingRepository.manager
        .getRepository('AuditEngagement')
        .findOne({
          where: { id: engagementId },
          relations: ['plan'],
        })) as any;

      if (engagement) {
        if (engagement.plan && engagement.plan.year) {
          year = engagement.plan.year;
        } else if (engagement.startDate) {
          year = new Date(engagement.startDate).getFullYear() || year;
        }

        if (engagement.branchCode) {
          unitCode = engagement.branchCode.toUpperCase();
        } else if (engagement.legacyAuditedDepartment) {
          // Abbreviate department name, e.g. "Chi nhánh Hà Nội" -> "CNHN"
          const name = engagement.legacyAuditedDepartment;
          unitCode = name
            .split(' ')
            .map((word: string) => word.charAt(0))
            .join('')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
          if (unitCode.length > 6) unitCode = unitCode.substring(0, 6);
        }
      }
    }

    if (workstreamId) {
      const workstream = await this.workstreamRepository.findOne({
        where: { id: workstreamId },
      });
      if (workstream && workstream.title) {
        const title = workstream.title.toLowerCase();
        if (title.includes('tín dụng') || title.includes('cho vay')) {
          processCode = 'TD';
        } else if (title.includes('vận hành') || title.includes('dịch vụ')) {
          processCode = 'VH';
        } else if (
          title.includes('công nghệ') ||
          title.includes('hệ thống') ||
          title.includes('it') ||
          title.includes('bảo mật')
        ) {
          processCode = 'IT';
        } else if (title.includes('kế toán') || title.includes('tài chính')) {
          processCode = 'KT';
        } else if (title.includes('kho quỹ') || title.includes('tiền mặt')) {
          processCode = 'KQ';
        } else {
          processCode = title
            .split(' ')
            .map((word: string) => word.charAt(0))
            .join('')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
          if (processCode.length > 4) processCode = processCode.substring(0, 4);
        }
      }
    }

    return `FD-${year}-${unitCode}-${processCode}-`;
  }

  async generateFindingCode(
    engagementId?: number,
    workstreamId?: number,
  ): Promise<string> {
    const prefix = await this.getFindingCodePrefix(engagementId, workstreamId);
    const count = await this.auditFindingRepository
      .createQueryBuilder('finding')
      .where('finding.findingCode LIKE :prefix', { prefix: `${prefix}%` })
      .getCount();

    const seq = (count + 1).toString().padStart(3, '0');
    return `${prefix}${seq}`;
  }

  async create(createAuditFindingDto: CreateAuditFindingDto, user?: any) {
    // Auto-fill reportedByAuditorId (Người báo cáo) using the logged in user's ID
    if (user && user.userId && !createAuditFindingDto.reportedByAuditorId) {
      createAuditFindingDto.reportedByAuditorId = user.userId;
    }

    const saved = await this.auditFindingRepository.manager.transaction(
      async (manager) => {
        if (!createAuditFindingDto.findingCode) {
          const prefix = await this.getFindingCodePrefix(
            createAuditFindingDto.engagementId,
            createAuditFindingDto.workstreamId,
          );

          // Khóa nguyên tử advisory lock theo hash của prefix trong suốt transaction
          await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
            prefix,
          ]);

          const maxRes = await manager.query(
            `SELECT "findingCode" FROM audit_findings WHERE "findingCode" LIKE $1 ORDER BY "findingCode" DESC LIMIT 1`,
            [`${prefix}%`],
          );

          let nextSeq = 1;
          if (maxRes && maxRes.length > 0) {
            const lastCode = maxRes[0].findingCode;
            const match = lastCode.match(/(\d+)$/);
            if (match) {
              nextSeq = parseInt(match[1], 10) + 1;
            }
          }
          const seq = nextSeq.toString().padStart(3, '0');
          createAuditFindingDto.findingCode = `${prefix}${seq}`;
        }

        const finding = manager.create(AuditFinding, createAuditFindingDto);
        return await manager.save(finding);
      },
    );

    if (saved.recommendation || saved.status === 'Confirmed') {
      await this.ensureRecommendationForFinding(saved.id);
    }
    return (await this.findOne(saved.id)) || saved;
  }

  async findAll(user?: any, engagementId?: number, limit = 500) {
    const query = this.auditFindingRepository
      .createQueryBuilder('finding')
      .leftJoinAndSelect('finding.engagement', 'engagement')
      .leftJoinAndSelect('finding.workingPaper', 'wp')
      .leftJoinAndSelect('finding.workstream', 'workstream')
      .leftJoinAndSelect('finding.personnel', 'personnel')
      .leftJoinAndSelect('finding.minute', 'minute')
      .leftJoinAndSelect(
        'finding.internalDefectCodeEntity',
        'internalDefectCodeEntity',
      )
      .leftJoinAndSelect(
        'finding.nd340DefectCodeEntity',
        'nd340DefectCodeEntity',
      )
      .leftJoinAndSelect(
        'finding.nhanSuDefectCodeEntity',
        'nhanSuDefectCodeEntity',
      )
      .leftJoinAndSelect(
        'finding.businessProcessEntity',
        'businessProcessEntity',
      )
      .leftJoinAndSelect('finding.managingBranch', 'managingBranch')
      .leftJoinAndSelect('finding.proposerUser', 'proposerUser')
      .leftJoinAndSelect('finding.appraiserUser', 'appraiserUser')
      .leftJoinAndSelect('finding.businessLeaderUser', 'businessLeaderUser')
      .leftJoinAndSelect('finding.recommendations', 'recommendations')
      .orderBy('finding.createdAt', 'DESC');

    if (engagementId) {
      query.andWhere('finding.engagementId = :engagementId', { engagementId });
    }

    const isAdmin = ScopeFilterService.isAdminRole(user?.role);
    const roleLower = (user?.role || '').toString().toLowerCase();
    const isAuditee =
      roleLower.includes('đơn vị được kiểm toán') ||
      roleLower.includes('auditee');

    if (user && isAuditee && user.userId) {
      const userEnt = (await this.auditFindingRepository.manager
        .getRepository('User')
        .findOne({ where: { id: user.userId } })) as any;
      if (userEnt && userEnt.legacyDepartment) {
        query.andWhere('engagement.legacyAuditedDepartment = :dept', {
          dept: userEnt.legacyDepartment,
        });
      } else {
        return [];
      }
    } else if (user && !isAdmin) {
      query.andWhere(
        '(engagement.leadAuditorId = :userId OR engagement."teamMembers" @> :jsonUser::jsonb OR engagement."teamMembers"::text LIKE :likeUserId OR wp.creatorId = :userId OR wp.reviewerId = :userId OR workstream.assignedAuditorId = :userId OR workstream.reviewerId = :userId)',
        {
          userId: user.userId,
          jsonUser: JSON.stringify([{ userId: user.userId }]),
          likeUserId: `%"userId":${user.userId}%`,
        },
      );
    }
    query.take(limit);
    return query.getMany();
  }

  async getMultiDimensionalStats(
    user?: any,
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    return this.statsService.getMultiDimensionalStats(
      user,
      departmentId,
      year,
      auditUniverse,
    );
  }

  findOne(id: number) {
    return this.auditFindingRepository.findOne({
      where: { id },
      relations: [
        'personnel',
        'minute',
        'internalDefectCodeEntity',
        'nd340DefectCodeEntity',
        'nhanSuDefectCodeEntity',
        'businessProcessEntity',
        'managingBranch',
        'proposerUser',
        'appraiserUser',
        'businessLeaderUser',
        'recommendations',
      ],
    });
  }

  async update(id: number, updateAuditFindingDto: any, user?: any) {
    const finding = await this.findOne(id);
    if (!finding) throw new NotFoundException('Finding not found');

    const newStatus = updateAuditFindingDto.status;
    if (newStatus && newStatus !== finding.status) {
      // 1. Withdrawal validation
      if (newStatus === 'Withdrawn') {
        const reason = updateAuditFindingDto.withdrawalReason?.trim();
        if (!reason) {
          throw new BadRequestException(
            'Cần cung cấp lý do rút phát hiện (withdrawalReason) khi chuyển trạng thái Withdrawn.',
          );
        }
        finding.withdrawalReason = reason;
        finding.withdrawnById = user?.userId || null;
        finding.withdrawnAt = new Date();
      }

      // 2. Backward transition validation (reverting from UnderReview, Confirmed, Reported, Closed back to Draft/Open/Returned)
      const forwardStates = ['UnderReview', 'Confirmed', 'Reported', 'Closed'];
      const backwardTargets = ['Draft', 'Open', 'Returned'];
      if (
        forwardStates.includes(finding.status) &&
        backwardTargets.includes(newStatus)
      ) {
        const reason =
          updateAuditFindingDto.returnReason?.trim() ||
          updateAuditFindingDto.reason?.trim();
        if (!reason) {
          throw new BadRequestException(
            `Cần cung cấp lý do trả lại/điều chỉnh (returnReason) khi chuyển ngược phát hiện từ ${finding.status} về ${newStatus}.`,
          );
        }
        finding.returnReason = reason;
        finding.returnedById = user?.userId || null;
        finding.returnedAt = new Date();
      }

      // 3. Confirmation audit
      if (newStatus === 'Confirmed') {
        finding.confirmedById = user?.userId || null;
        finding.confirmedAt = new Date();
      }
    }

    // Logic Workflow Động
    const workflowDef =
      await this.workflowsService.findByEntity('AuditFinding');
    if (
      workflowDef &&
      updateAuditFindingDto.status &&
      updateAuditFindingDto.status !== finding.status
    ) {
      let currentStatus = finding.status;

      // Auto-map trạng thái cũ
      if (currentStatus === 'Open') {
        const firstStep = workflowDef.steps[0];
        currentStatus = firstStep ? firstStep.statusValue : finding.status;
      }

      const nextStep = await this.workflowsService.getNextStep(
        'AuditFinding',
        currentStatus,
      );
      if (nextStep && nextStep.statusValue === updateAuditFindingDto.status) {
        if (
          user &&
          !(await this.workflowsService.validatePermission(nextStep, [
            user.role,
          ]))
        ) {
          throw new ForbiddenException(
            `Bạn không có quyền chuyển sang trạng thái ${nextStep.stepName}. Yêu cầu role: ${nextStep.requiredRole}`,
          );
        }
      }
    }

    // Merge new values
    Object.assign(finding, updateAuditFindingDto);

    // Save to trigger cascades for personnel array
    const updated = await this.auditFindingRepository.save(finding);

    if (
      updated &&
      (updated.recommendation || updateAuditFindingDto.status === 'Confirmed')
    ) {
      await this.ensureRecommendationForFinding(updated.id);
    }
    return this.findOne(id);
  }

  async remove(id: number, user?: any) {
    const finding = await this.findOne(id);
    if (!finding) throw new NotFoundException('Finding not found');

    if (user) {
      const isAdmin = ScopeFilterService.isAdminRole(user.role);

      if (!isAdmin) {
        throw new ForbiddenException(
          'Bạn không có quyền xóa phát hiện kiểm toán. Hãy liên hệ Quản trị viên hệ thống.',
        );
      }
    }

    // IIA GIAS 2024 compliance: Only Draft or Open findings can be deleted.
    // Findings in review, confirmed, reported, or closed cannot be deleted.
    if (finding.status !== 'Draft' && finding.status !== 'Open') {
      throw new BadRequestException(
        `Không thể xóa phát hiện kiểm toán ở trạng thái ${finding.status}. Chỉ có thể xóa phát hiện ở trạng thái Draft hoặc Open. Đối với phát hiện đã duyệt/báo cáo, vui lòng thực hiện thủ tục Rút phát hiện (Withdrawn).`,
      );
    }

    await this.recommendationRepository.delete({ findingId: id });
    await this.auditFindingRepository.delete(id);
    return { success: true };
  }

  async ensureRecommendationForFinding(findingId: number) {
    const finding = await this.auditFindingRepository.findOne({
      where: { id: findingId },
      relations: ['engagement', 'workingPaper', 'workstream', 'managingBranch'],
    });
    if (!finding || !finding.recommendation) return null;

    const existing = await this.recommendationRepository.findOne({
      where: { findingId: finding.id },
    });

    const department =
      finding.recommendationTarget ||
      finding.managingBranch?.name ||
      finding.managingBranchName ||
      finding.engagement?.legacyAuditedDepartment ||
      finding.engagement?.branchName ||
      finding.branchCode ||
      'Chưa xác định';

    const departmentId =
      finding.responsibleUnitId ||
      finding.managingBranchId ||
      finding.engagement?.auditedDepartmentId;

    if (existing) {
      let changed = false;
      if (existing.finding !== finding.findingTitle) {
        existing.finding = finding.findingTitle;
        changed = true;
      }
      if (
        finding.recommendation &&
        existing.recommendation !== finding.recommendation
      ) {
        existing.recommendation = finding.recommendation;
        changed = true;
      }
      if (departmentId && !existing.departmentId) {
        existing.departmentId = departmentId;
        changed = true;
      }
      if (changed) {
        return this.recommendationRepository.save(existing);
      }
      return existing;
    }

    const recommendation = this.recommendationRepository.create({
      findingId: finding.id,
      finding: finding.findingTitle,
      recommendation: finding.recommendation,
      departmentId,
      legacyDepartment: department,
      assignedToId: finding.reportedByAuditorId || undefined,
      assignedTo: finding.engagement?.legacyLeadAuditor || undefined,
      ktnbReviewerId: finding.engagement?.leadAuditorId || undefined,
      ktnbReviewerName: finding.engagement?.legacyLeadAuditor || undefined,
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      status: 'Open',
      closureStatus: 'Open',
      progressPercent: 0,
      remediationFeasibility: true,
      escalationLevel: 0,
      slaStatus: 'In SLA',
      selfMonitored: false,
    });

    return this.recommendationRepository.save(recommendation);
  }

  async exportFindingsExcel(user?: any) {
    const findings = await this.findAll(user);

    const data = findings.map((f) => ({
      'Mã phát hiện': f.findingCode || '',
      'Tiêu đề': f.findingTitle || '',
      'Mức rủi ro': f.riskLevel || '',
      'Trạng thái': f.status || '',
      'Mã lỗi nội bộ':
        f.legacyInternalDefectCode || f.internalDefectCodeEntity?.code || '',
      'Mã vi phạm NĐ 340':
        f.legacyNd340DefectCode || f.nd340DefectCodeEntity?.code || '',
      'Mã vi phạm Nhân sự':
        f.legacyNhanSuDefectCode || f.nhanSuDefectCodeEntity?.code || '',
      'Số tiền phạt (VND)': f.actualFineAmount || 0,
      'Mã Chi nhánh': f.branchCode || '',
      Vùng: f.region || '',
      'Phân loại nhóm': f.findingCategory || '',
      'Tính chất': f.findingNature || '',
      'Nghiệp vụ': f.operationType || '',
      'Quy trình vi phạm': f.legacyBusinessProcess || '',
      'Số CIF / Tài khoản': f.cifOrAccount || '',
      'Tên khách hàng': f.customerName || '',
      'Sản phẩm': f.productName || '',
      'Loại KH': f.customerType || '',
      'Quy định vi phạm': f.criteria || '',
      'Hiện trạng': f.condition || '',
      'Hậu quả': f.consequence || '',
      'Nguyên nhân': f.cause || '',
      'Khuyến nghị': f.recommendation || '',
      'Ý kiến giải trình ĐVKD': f.auditeeResponse || '',
      'Đối tượng kiến nghị': f.recommendationTarget || '',
      'Cán bộ đề xuất': f.legacyProposerOfficer || '',
      'Cán bộ thẩm định': f.legacyAppraiserOfficer || '',
      'Lãnh đạo phê duyệt': f.legacyBusinessLeader || '',
    }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    if (data.length > 0) {
      ws.columns = Object.keys(data[0]).map((key) => ({ header: key, key }));
      data.forEach((item) => ws.addRow(item));
    }
    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async getKpcsStats(user?: any) {
    const findings = await this.findAll(user);

    const total = findings.length;
    const byCategory = {
      QuanTri: 0,
      HoatDong: 0,
      KiemSoatVanHanh: 0,
      CNTT: 0,
      Khac: 0,
    };
    const byNature = { HeThong: 0, TuanThu: 0, CaNhan: 0, Khac: 0 };
    const byRiskLevel = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    const byStatus = {
      Open: 0,
      Confirmed: 0,
      Disputed: 0,
      Closed: 0,
      Resolved: 0,
    };

    findings.forEach((f) => {
      const cat = f.findingCategory;
      if (
        cat === 'QuanTri' ||
        cat === 'HoatDong' ||
        cat === 'KiemSoatVanHanh' ||
        cat === 'CNTT'
      ) {
        byCategory[cat]++;
      } else {
        byCategory.Khac++;
      }

      const nat = f.findingNature;
      if (nat === 'HeThong' || nat === 'TuanThu' || nat === 'CaNhan') {
        byNature[nat]++;
      } else {
        byNature.Khac++;
      }

      const risk = f.riskLevel;
      if (
        risk === 'Critical' ||
        risk === 'High' ||
        risk === 'Medium' ||
        risk === 'Low'
      ) {
        byRiskLevel[risk]++;
      }

      const status = f.status || 'Open';
      if (status in byStatus) {
        byStatus[status as keyof typeof byStatus]++;
      }
    });

    const recRepo =
      this.auditFindingRepository.manager.getRepository('Recommendation');
    const recQuery = recRepo
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.auditFinding', 'finding')
      .leftJoinAndSelect('finding.engagement', 'engagement');

    if (user && !this.isPrivilegedUser(user)) {
      recQuery.andWhere(
        '(engagement.leadAuditorId = :userId OR engagement.teamMembers LIKE :likeUserId OR rec.assignedToId = :userId)',
        { userId: user.userId, likeUserId: `%"userId":${user.userId}%` },
      );
    }
    const recs = await recQuery.getMany();
    const totalRecs = recs.length;
    const completedRecs = recs.filter(
      (r) => r.status === 'Completed' || r.status === 'Verified',
    ).length;
    const kpcsRatio =
      totalRecs > 0 ? Math.round((completedRecs / totalRecs) * 100) : 100;

    return {
      totalFindings: total,
      byCategory,
      byNature,
      byRiskLevel,
      byStatus,
      totalRecommendations: totalRecs,
      completedRecommendations: completedRecs,
      kpcsRatio,
    };
  }

  private isPrivilegedUser(user?: any) {
    return ScopeFilterService.isAdminRole(user?.role);
  }
}
