import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditCharterService } from '../audit-charter/audit-charter.service';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AnnualControlAssessment } from './entities/annual-control-assessment.entity';
import { ExecutiveSession } from './entities/executive-session.entity';
import { ExternalAssuranceCoordination } from './entities/external-assurance-coordination.entity';

@Injectable()
export class AuditCommitteeService {
  constructor(
    private readonly auditCharterService: AuditCharterService,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(AuditUniverse)
    private readonly universeRepo: Repository<AuditUniverse>,
    @InjectRepository(AuditEngagement)
    private readonly engagementRepo: Repository<AuditEngagement>,
    @InjectRepository(AnnualControlAssessment)
    private readonly annualAssessmentRepo: Repository<AnnualControlAssessment>,
    @InjectRepository(ExecutiveSession)
    private readonly execSessionRepo: Repository<ExecutiveSession>,
    @InjectRepository(ExternalAssuranceCoordination)
    private readonly extAssuranceRepo: Repository<ExternalAssuranceCoordination>,
  ) {}

  // 1. Quản lý Điều lệ (Audit Charter) - Ủy quyền sang AuditCharterService chuẩn
  async getCharters() {
    return this.auditCharterService.getCharters();
  }

  async createCharter(data: any) {
    return this.auditCharterService.createCharter(data);
  }

  async updateCharterStatus(id: number, status: string, username: string) {
    return this.auditCharterService.updateCharterStatus(id, status, username);
  }

  // 2. Data cho 3 Lines of Defense Dashboard
  async get3LoDStats(
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    // Lấy tổng số đơn vị phân theo tuyến (chỉ select các cột cần thiết để tối ưu bộ nhớ)
    const uniQuery = this.universeRepo
      .createQueryBuilder('universe')
      .select(['universe.id', 'universe.lineOfDefense']);
    if (departmentId)
      uniQuery.andWhere('universe.legacyDepartment = :departmentId', {
        departmentId,
      });
    if (auditUniverse)
      uniQuery.andWhere('universe.name = :auditUniverse', { auditUniverse });
    const universe = await uniQuery.getMany();
    const l1Total = universe.filter((u) => u.lineOfDefense === 1).length || 1;
    const l2Total = universe.filter((u) => u.lineOfDefense === 2).length || 1;
    const l3Total = universe.filter((u) => u.lineOfDefense === 3).length || 1;

    const engQuery = this.engagementRepo
      .createQueryBuilder('engagement')
      .leftJoin('engagement.plan', 'plan')
      .select(['engagement.id'])
      .where('engagement.status = :status', { status: 'Completed' });
    if (departmentId)
      engQuery.andWhere('engagement.legacyAuditedDepartment = :departmentId', {
        departmentId,
      });
    if (year) engQuery.andWhere('plan.year = :year', { year: parseInt(year) });
    if (auditUniverse)
      engQuery.andWhere('engagement.auditUniverse = :auditUniverse', {
        auditUniverse,
      });
    const engagements = await engQuery.getMany();
    const completedCount = engagements.length;

    const l1Coverage = Math.min(
      Math.round(((completedCount * 0.5) / l1Total) * 100),
      100,
    );
    const l2Coverage = Math.min(
      Math.round(((completedCount * 0.3) / l2Total) * 100),
      100,
    );
    const l3Coverage = Math.min(
      Math.round(((completedCount * 0.2) / l3Total) * 100),
      100,
    );

    const findQuery = this.findingRepo
      .createQueryBuilder('finding')
      .leftJoin('finding.engagement', 'engagement')
      .leftJoin('engagement.plan', 'plan')
      .select(['finding.id', 'finding.riskLevel']);
    if (departmentId)
      findQuery.andWhere('engagement.legacyAuditedDepartment = :departmentId', {
        departmentId,
      });
    if (year) findQuery.andWhere('plan.year = :year', { year: parseInt(year) });
    if (auditUniverse)
      findQuery.andWhere('engagement.auditUniverse = :auditUniverse', {
        auditUniverse,
      });
    const allFindings = await findQuery.getMany();

    return {
      line1: {
        name: 'Tuyến 1: Kinh doanh & Vận hành',
        coverage: l1Coverage,
        issues: allFindings.filter(
          (f) => f.riskLevel === 'Low' || f.riskLevel === 'Medium',
        ).length,
      },
      line2: {
        name: 'Tuyến 2: QLRR & Tuân thủ',
        coverage: l2Coverage,
        issues: allFindings.filter((f) => f.riskLevel === 'High').length,
      },
      line3: {
        name: 'Tuyến 3: Kiểm toán Nội bộ',
        coverage: l3Coverage,
        issues: allFindings.filter((f) => f.riskLevel === 'Critical').length,
      },
    };
  }

  // 3. Highlight Stats cho BKS
  async getCommitteeHighlights(
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    const findQuery = this.findingRepo
      .createQueryBuilder('finding')
      .leftJoin('finding.engagement', 'engagement')
      .leftJoin('engagement.plan', 'plan')
      .select(['finding.id', 'finding.riskLevel']);

    if (departmentId)
      findQuery.andWhere('engagement.legacyAuditedDepartment = :departmentId', {
        departmentId,
      });
    if (year) findQuery.andWhere('plan.year = :year', { year: parseInt(year) });
    if (auditUniverse)
      findQuery.andWhere('engagement.auditUniverse = :auditUniverse', {
        auditUniverse,
      });

    const findings = await findQuery.getMany();
    const criticalFindings = findings.filter(
      (f) => f.riskLevel === 'Critical',
    ).length;
    const highFindings = findings.filter((f) => f.riskLevel === 'High').length;

    return {
      criticalFindings,
      highFindings,
      totalIssues: criticalFindings + highFindings,
      lastUpdate: new Date(),
    };
  }

  // ===== 4. TT13 Điều 65 & IIA Standard 11.3: Báo Cáo Đánh Giá Tổng Thể KSNB Hàng Năm =====
  getAnnualAssessments(year?: number) {
    const where: any = {};
    if (year) where.year = year;
    return this.annualAssessmentRepo.find({ where, order: { year: 'DESC' } });
  }

  async getAnnualAssessment(id: number): Promise<AnnualControlAssessment> {
    const record = await this.annualAssessmentRepo.findOne({ where: { id } });
    if (!record) throw new NotFoundException(`Annual Assessment #${id} not found`);
    return record;
  }

  createAnnualAssessment(data: Partial<AnnualControlAssessment>, user?: any) {
    const assessment = this.annualAssessmentRepo.create({
      ...data,
      preparedById: user?.userId || user?.id,
      preparedByName: user?.fullName || user?.username,
      status: 'Draft',
    });
    return this.annualAssessmentRepo.save(assessment);
  }

  async updateAnnualAssessment(id: number, data: Partial<AnnualControlAssessment>) {
    const assessment = await this.getAnnualAssessment(id);
    if (assessment.status === 'ApprovedByBks') {
      throw new BadRequestException('Không thể chỉnh sửa Báo cáo Đánh giá KSNB đã được BKS phê duyệt');
    }
    Object.assign(assessment, data);
    return this.annualAssessmentRepo.save(assessment);
  }

  async approveAnnualAssessment(id: number, bksNotes: string, user?: any) {
    const assessment = await this.getAnnualAssessment(id);
    assessment.status = 'ApprovedByBks';
    assessment.approvedByBksId = user?.userId || user?.id;
    assessment.approvedByBksName = user?.fullName || user?.username || 'Ban Kiểm Soát';
    assessment.approvedByBksAt = new Date();
    assessment.bksOpinionNotes = bksNotes || 'BKS phê duyệt Đánh giá Tổng thể Hệ thống KSNB theo TT13 Đ.65';
    return this.annualAssessmentRepo.save(assessment);
  }

  // ===== 5. IIA Standard 2.2 & TT13 Điều 60: Phiên Họp Kín Độc Lập CAE - BKS =====
  getExecutiveSessions(year?: number) {
    const where: any = {};
    if (year) where.year = year;
    return this.execSessionRepo.find({ where, order: { meetingDate: 'DESC' } });
  }

  async getExecutiveSession(id: number): Promise<ExecutiveSession> {
    const session = await this.execSessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException(`Executive Session #${id} not found`);
    return session;
  }

  createExecutiveSession(data: Partial<ExecutiveSession>, user?: any) {
    const session = this.execSessionRepo.create({
      ...data,
      hasManagementPresent: false, // Bắt buộc false theo IIA Standard 2.2
      recordedById: user?.userId || user?.id,
      recordedByName: user?.fullName || user?.username,
      status: data.status || 'Scheduled',
    });
    return this.execSessionRepo.save(session);
  }

  async updateExecutiveSession(id: number, data: Partial<ExecutiveSession>) {
    const session = await this.getExecutiveSession(id);
    Object.assign(session, data);
    return this.execSessionRepo.save(session);
  }

  async minuteExecutiveSession(
    id: number,
    minutesSummary: string,
    actionItems?: any[],
    user?: any,
  ) {
    const session = await this.getExecutiveSession(id);
    session.status = 'Minuted';
    session.minutesSummary = minutesSummary;
    if (actionItems) session.actionItems = actionItems;
    session.recordedById = user?.userId || user?.id;
    session.recordedByName = user?.fullName || user?.username;
    return this.execSessionRepo.save(session);
  }

  // ===== 6. IIA Standard 9.5 & Basel BCBS: Điều Phối Bảo Đảm Bên Ngoài =====
  getCoordinations(year?: number) {
    const where: any = {};
    if (year) where.auditYear = year;
    return this.extAssuranceRepo.find({ where, order: { auditYear: 'DESC' } });
  }

  async getCoordination(id: number): Promise<ExternalAssuranceCoordination> {
    const coord = await this.extAssuranceRepo.findOne({ where: { id } });
    if (!coord) throw new NotFoundException(`Assurance Coordination #${id} not found`);
    return coord;
  }

  createCoordination(data: Partial<ExternalAssuranceCoordination>) {
    const entity = this.extAssuranceRepo.create(data);
    return this.extAssuranceRepo.save(entity);
  }

  async updateCoordination(id: number, data: Partial<ExternalAssuranceCoordination>) {
    const coord = await this.getCoordination(id);
    Object.assign(coord, data);
    return this.extAssuranceRepo.save(coord);
  }

  async deleteCoordination(id: number): Promise<void> {
    const coord = await this.getCoordination(id);
    await this.extAssuranceRepo.remove(coord);
  }
}
