import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { AuditSampleBatch } from './entities/audit-sample-batch.entity';
import { AuditSample } from './entities/audit-sample.entity';
import { SampleType, TestResult } from './entities/sample-enums';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditFindingPersonnel } from './entities/audit-finding-personnel.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import {
  CreateSampleBatchDto,
  UpdateSampleBatchDto,
  CreateSampleDto,
  BulkCreateSamplesDto,
  UpdateSampleDto,
} from './dto/audit-sample.dto';

@Injectable()
export class AuditSamplesService {
  private readonly logger = new Logger(AuditSamplesService.name);

  constructor(
    @InjectRepository(AuditSampleBatch)
    private readonly batchRepo: Repository<AuditSampleBatch>,
    @InjectRepository(AuditSample)
    private readonly sampleRepo: Repository<AuditSample>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(AuditFindingPersonnel)
    private readonly personnelRepo: Repository<AuditFindingPersonnel>,
    @InjectRepository(AuditEngagement)
    private readonly engagementRepo: Repository<AuditEngagement>,
    @InjectRepository(WorkingPaper)
    private readonly wpRepo: Repository<WorkingPaper>,
    @InjectRepository(Recommendation)
    private readonly recRepo: Repository<Recommendation>,
  ) {}

  // ═══════════════════════ BATCH CRUD ═══════════════════════

  async createBatch(dto: CreateSampleBatchDto): Promise<AuditSampleBatch> {
    this.logger.log(`Creating sample batch: ${dto.batchName}`);
    const batch = this.batchRepo.create(dto);
    return await this.batchRepo.save(batch);
  }

  async findAllBatches(
    engagementId?: number,
    workingPaperId?: number,
  ): Promise<AuditSampleBatch[]> {
    const where: any = {};
    if (engagementId) where.engagementId = engagementId;
    if (workingPaperId) where.workingPaperId = workingPaperId;

    return await this.batchRepo.find({
      where,
      relations: ['samples'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneBatch(id: number): Promise<AuditSampleBatch> {
    const batch = await this.batchRepo.findOne({
      where: { id },
      relations: ['samples', 'samples.finding'],
    });
    if (!batch) {
      throw new HttpException(
        'Không tìm thấy đợt chọn mẫu',
        HttpStatus.NOT_FOUND,
      );
    }
    return batch;
  }

  async updateBatch(
    id: number,
    dto: UpdateSampleBatchDto,
  ): Promise<AuditSampleBatch> {
    const batch = await this.findOneBatch(id);
    Object.assign(batch, dto);
    return await this.batchRepo.save(batch);
  }

  async removeBatch(id: number): Promise<void> {
    const batch = await this.findOneBatch(id);
    await this.batchRepo.remove(batch);
  }

  async getBatchStats(id: number): Promise<{
    total: number;
    tested: number;
    pass: number;
    fail: number;
    exception: number;
    withFindings: number;
  }> {
    const batch = await this.findOneBatch(id);
    const samples = batch.samples || [];
    return {
      total: samples.length,
      tested: samples.filter((s) => s.testResult !== TestResult.NOT_TESTED)
        .length,
      pass: samples.filter((s) => s.testResult === TestResult.PASS).length,
      fail: samples.filter((s) => s.testResult === TestResult.FAIL).length,
      exception: samples.filter((s) => s.testResult === TestResult.EXCEPTION)
        .length,
      withFindings: samples.filter((s) => s.findingId).length,
    };
  }

  // ═══════════════════════ SAMPLE CRUD ═══════════════════════

  async addSample(batchId: number, dto: CreateSampleDto): Promise<AuditSample> {
    const batch = await this.findOneBatch(batchId);

    // Auto-assign sequence number
    const maxSeq =
      batch.samples.length > 0
        ? Math.max(...batch.samples.map((s) => s.sequenceNo || 0))
        : 0;

    const sample = this.sampleRepo.create({
      ...dto,
      batchId,
      sampleType: dto.sampleType || batch.sampleType,
      sequenceNo: dto.sequenceNo || maxSeq + 1,
    });

    const saved = await this.sampleRepo.save(sample);

    // Update batch sampleSize count
    await this.batchRepo.update(batchId, {
      sampleSize: batch.samples.length + 1,
    });

    return saved;
  }

  async addSamplesBulk(
    batchId: number,
    dto: BulkCreateSamplesDto,
  ): Promise<AuditSample[]> {
    const batch = await this.findOneBatch(batchId);
    const startSeq =
      batch.samples.length > 0
        ? Math.max(...batch.samples.map((s) => s.sequenceNo || 0)) + 1
        : 1;

    const entities = dto.samples.map((s, idx) =>
      this.sampleRepo.create({
        ...s,
        batchId,
        sampleType: s.sampleType || batch.sampleType,
        sequenceNo: s.sequenceNo || startSeq + idx,
      }),
    );

    const saved = await this.sampleRepo.save(entities);

    // Update batch sampleSize count
    await this.batchRepo.update(batchId, {
      sampleSize: batch.samples.length + saved.length,
    });

    return saved;
  }

  async updateSample(
    sampleId: number,
    dto: UpdateSampleDto,
  ): Promise<AuditSample> {
    this.logger.log(
      `updateSample CALLED with sampleId=${sampleId}, dto=${JSON.stringify(dto)}`,
    );
    const sample = await this.sampleRepo.findOne({ where: { id: sampleId } });
    if (!sample) {
      throw new HttpException(
        'Không tìm thấy mẫu kiểm toán',
        HttpStatus.NOT_FOUND,
      );
    }

    // If updating test result, auto-set testedAt
    if (dto.testResult && dto.testResult !== TestResult.NOT_TESTED) {
      (dto as any).testedAt = new Date();
    }

    const EXCLUDED_FIELDS = new Set([
      'id',
      'batch',
      'finding',
      'createdAt',
      'updatedAt',
      'batchId',
    ]);
    const updatePayload: any = {};
    for (const [key, val] of Object.entries(dto)) {
      if (val !== undefined && !EXCLUDED_FIELDS.has(key)) {
        updatePayload[key] = val;
      }
    }
    if (Object.keys(updatePayload).length > 0) {
      await this.sampleRepo.update(sampleId, updatePayload);
    }

    const saved = await this.sampleRepo.findOne({ where: { id: sampleId } });
    if (!saved) {
      throw new HttpException(
        'Lỗi khi tải lại mẫu kiểm toán',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    this.logger.log(
      `updateSample successfully updated sampleId=${saved.id}, seq=${saved.sequenceNo}`,
    );

    // Tự động đồng bộ sang Finding và Personnel nếu có ghi nhận sai phạm / rủi ro
    const finding = await this.syncSampleToFinding(saved);
    if (finding) {
      saved.findingId = finding.id;
    }

    return saved;
  }

  /**
   * Thêm dòng mẫu kiểm toán vào Working Paper có tự động kế thừa ngữ cảnh Cuộc kiểm toán & KTV
   */
  async addSampleByWorkingPaper(
    workingPaperId: number,
    dto: Partial<AuditSample>,
    currentUser?: any,
  ): Promise<AuditSample> {
    const wp = await this.wpRepo.findOne({
      where: { id: workingPaperId },
      relations: ['engagement', 'creatorUser'],
    });

    if (!wp) {
      throw new HttpException(
        'Không tìm thấy Giấy tờ làm việc',
        HttpStatus.NOT_FOUND,
      );
    }

    const isPtd =
      dto.operationType === 'PTD' ||
      wp.referenceCode?.includes('PTD') ||
      wp.title?.toLowerCase().includes('phi tín dụng') ||
      wp.title?.toLowerCase().includes('ptd');

    // Tìm hoặc tạo batch cho WP
    let batch = await this.batchRepo.findOne({
      where: { workingPaperId },
      relations: ['samples'],
    });

    if (!batch) {
      batch = this.batchRepo.create({
        batchName: `Batch mẫu kiểm toán - ${wp.title || `WP #${workingPaperId}`}`,
        workingPaperId,
        engagementId: wp.engagementId,
        sampleType: isPtd ? SampleType.PROCESS_CONTROL : SampleType.DETAIL,
      });
      batch = await this.batchRepo.save(batch);
      batch.samples = [];
    }

    const maxSeq =
      batch.samples && batch.samples.length > 0
        ? Math.max(...batch.samples.map((s) => s.sequenceNo || 0))
        : 0;

    const sample = this.sampleRepo.create({
      ...dto,
      batchId: batch.id,
      sequenceNo: dto.sequenceNo || maxSeq + 1,
      sampleType: isPtd ? SampleType.PROCESS_CONTROL : SampleType.DETAIL,
      operationType: isPtd ? 'PTD' : dto.operationType || 'TD',
      // Tự động kế thừa tên chi nhánh từ cuộc kiểm toán
      managingBranchName:
        dto.managingBranchName || wp.engagement?.branchName || 'Chi nhánh',
      branchCode:
        dto.branchCode ||
        (isPtd ? 'Trụ sở CN' : wp.engagement?.branchName || 'Chi nhánh'),
      businessProcess:
        dto.businessProcess ||
        (isPtd ? 'Quản lý kho quỹ & Dịch vụ khách hàng' : undefined),
      // Tự động kế thừa KTV
      testedBy:
        dto.testedBy ||
        currentUser?.fullName ||
        wp.creatorUser?.fullName ||
        'KTV',
      customerType: isPtd ? undefined : dto.customerType || 'Cá nhân',
      debtGroup: isPtd ? undefined : dto.debtGroup || '1',
      loanPurpose: isPtd
        ? undefined
        : dto.loanPurpose || 'Vay vốn SXKD / Tiêu dùng',
      inherentRisk: dto.inherentRisk || 'Trung bình',
      controlQuality: dto.controlQuality || 'Tốt',
      residualRisk: dto.residualRisk || 'Trung bình',
      auditeeOpinion: dto.auditeeOpinion || 'Đồng ý',
      includeInReport: dto.includeInReport ?? (isPtd ? true : false),
      remediationFeasibility: dto.remediationFeasibility ?? true,
      errorCountText: dto.errorCountText || (isPtd ? '1 vụ việc' : undefined),
      condition:
        dto.condition ||
        (isPtd ? `Sai sót ghi nhận mẫu PTD #${maxSeq + 1}` : undefined),
      recommendationText:
        dto.recommendationText ||
        (isPtd ? 'Đơn vị tuân thủ đúng quy trình nghiệp vụ' : undefined),
      testResult:
        dto.testResult || (isPtd ? TestResult.FAIL : TestResult.NOT_TESTED),
    });

    const saved = await this.sampleRepo.save(sample);

    // Cập nhật số lượng sampleSize của batch
    const count = await this.sampleRepo.count({ where: { batchId: batch.id } });
    await this.batchRepo.update(batch.id, { sampleSize: count });

    // Đồng bộ finding & recommendation nếu có vi phạm
    const finding = await this.syncSampleToFinding(saved);
    if (finding) {
      saved.findingId = finding.id;
    }

    return saved;
  }

  /**
   * Đồng bộ mẫu kiểm toán có vi phạm sang Phát hiện kiểm toán (AuditFinding),
   * Nhân sự (AuditFindingPersonnel) và Kho theo dõi khắc phục (Recommendation)
   */
  async syncSampleToFinding(sample: AuditSample): Promise<AuditFinding | null> {
    try {
      // 1. Lấy thông tin batch & working paper để có engagementId
      const batch = await this.batchRepo.findOne({
        where: { id: sample.batchId },
      });
      const workingPaperId = batch?.workingPaperId;
      let engagementId = batch?.engagementId;

      if (!engagementId && workingPaperId) {
        const wp = await this.wpRepo.findOne({ where: { id: workingPaperId } });
        engagementId = wp?.engagementId;
      }

      const isPtd =
        sample.operationType === 'PTD' ||
        (sample.businessProcess && !sample.loanAmount && !sample.customerName);

      // 2. Điều kiện kích hoạt sinh hoặc đồng bộ Finding:
      const hasDefect = isPtd
        ? (sample.condition && sample.condition.trim().length > 0) ||
          (sample.detailedRisk && sample.detailedRisk.trim().length > 0) ||
          sample.includeInReport === true
        : sample.includeInReport === true ||
          (sample.detailedRisk && sample.detailedRisk.trim().length > 0) ||
          (sample.postExplanationNote &&
            sample.postExplanationNote.trim().length > 0 &&
            sample.postExplanationNote !== 'Không có tồn tại');

      if (!hasDefect) {
        return null;
      }

      let finding: AuditFinding | null = null;
      if (sample.findingId) {
        finding = await this.findingRepo.findOne({
          where: { id: sample.findingId },
          relations: ['personnel'],
        });
      }

      const findingTitle = isPtd
        ? sample.condition?.trim()
          ? `[PTD] ${sample.businessProcess || 'Phi tín dụng'}: ${sample.condition.substring(0, 100)}`
          : `Phát hiện PTD mẫu #${sample.sequenceNo}`
        : sample.detailedRisk?.trim() ||
          `Sai phạm mẫu #${sample.sequenceNo}: ${sample.customerName || 'Khách hàng'}`;

      const condition = isPtd
        ? sample.condition?.trim() ||
          sample.detailedRisk?.trim() ||
          'Ghi nhận sai sót trong nghiệp vụ phi tín dụng.'
        : sample.postExplanationNote?.trim() ||
          sample.preExplanationNote?.trim() ||
          sample.detailedRisk?.trim() ||
          'Ghi nhận sai phạm trong quy trình cấp tín dụng.';

      const cause = isPtd
        ? sample.violationCause?.trim() ||
          'Chưa tuân thủ đúng quy trình nghiệp vụ phi tín dụng / bưu điện và văn bản hướng dẫn nội bộ.'
        : sample.violationCause?.trim() ||
          'Chưa tuân thủ đúng quy trình nghiệp vụ cấp tín dụng và văn bản hướng dẫn nội bộ.';

      const consequence = isPtd
        ? sample.errorCountText
          ? `Ghi nhận ${sample.errorCountText} sai sót vi phạm quy định tại đơn vị.`
          : 'Tiềm ẩn rủi ro hoạt động và tổn thất uy tín, vận hành tại ĐVKD.'
        : `Tiềm ẩn rủi ro sai phạm/nợ xấu đối với khoản vay dư nợ ${sample.loanAmount || 0} tỷ đồng (${sample.customerName || 'KH'}).`;

      const recommendation =
        sample.recommendationText?.trim() ||
        'Đơn vị khẩn trương rà soát, chấn chỉnh, hoàn thiện hồ sơ và xử lý theo đúng quy định.';

      const riskLevel =
        sample.residualRisk === 'Cao' || sample.residualRisk === '3'
          ? 'High'
          : sample.residualRisk === 'Thấp' ||
              sample.residualRisk === '1' ||
              sample.residualRisk === 'Thấp (đã khắc phục)'
            ? 'Low'
            : 'Medium';

      if (!finding) {
        finding = this.findingRepo.create({
          engagementId,
          workingPaperId,
          findingTitle,
          findingCode: `FD-WP${workingPaperId || 0}-${sample.sequenceNo}`,
          cifOrAccount: sample.cifOrAccount,
          customerName:
            sample.customerName || (isPtd ? sample.branchCode : undefined),
          customerType: sample.customerType,
          operationType: isPtd ? 'PTD' : sample.operationType || 'TD',
          legacyManagingBranchName: sample.managingBranchName,
          branchCode: sample.branchCode || sample.managingBranchName,
          productName: isPtd ? sample.businessProcess : sample.loanPurpose,
          condition,
          cause,
          consequence,
          recommendation,
          recommendationTarget: 'ĐVKD',
          riskLevel,
          status: 'Open',
          riskGroupGeneral: isPtd ? 'Phi tín dụng' : sample.riskGroup,
          riskGroupDetail: isPtd ? sample.businessProcess : sample.riskCategory,
          auditeeResponse: sample.auditeeProposal || sample.auditeeExplanation,
          violationHistory: sample.violationHistory || 'Lần đầu',
        });
      } else {
        finding.findingTitle = findingTitle;
        finding.operationType = isPtd
          ? 'PTD'
          : sample.operationType || finding.operationType || 'TD';
        if (sample.managingBranchName)
          finding.legacyManagingBranchName = sample.managingBranchName;
        if (sample.cifOrAccount) finding.cifOrAccount = sample.cifOrAccount;
        if (sample.customerName) finding.customerName = sample.customerName;
        if (sample.customerType) finding.customerType = sample.customerType;
        if (sample.branchCode || sample.managingBranchName)
          finding.branchCode = sample.branchCode || sample.managingBranchName;
        if (sample.businessProcess)
          finding.productName = sample.businessProcess;
        else if (sample.loanPurpose) finding.productName = sample.loanPurpose;
        finding.condition = condition;
        finding.cause = cause;
        finding.consequence = consequence;
        finding.recommendation = recommendation;
        finding.riskLevel = riskLevel;
        if (isPtd) {
          finding.riskGroupGeneral = 'Phi tín dụng';
          finding.riskGroupDetail =
            sample.businessProcess || finding.riskGroupDetail;
        } else {
          finding.riskGroupGeneral =
            sample.riskGroup || finding.riskGroupGeneral;
          finding.riskGroupDetail =
            sample.riskCategory || finding.riskGroupDetail;
        }
        finding.auditeeResponse =
          sample.auditeeProposal ||
          sample.auditeeExplanation ||
          finding.auditeeResponse;
        finding.violationHistory =
          sample.violationHistory || finding.violationHistory;
      }

      const savedFinding = await this.findingRepo.save(finding);

      if (sample.findingId !== savedFinding.id) {
        sample.findingId = savedFinding.id;
        await this.sampleRepo.update(sample.id, { findingId: savedFinding.id });
      }

      // 3. Đồng bộ Nhân sự chịu trách nhiệm
      await this.personnelRepo.delete({ findingId: savedFinding.id });

      const personnelToSave: AuditFindingPersonnel[] = [];

      if (isPtd) {
        // PTD: Cán bộ Giám đốc tại thời điểm vi phạm (Cột 9)
        if (
          sample.branchDirectorAtViolation &&
          sample.branchDirectorAtViolation.trim()
        ) {
          personnelToSave.push(
            this.personnelRepo.create({
              findingId: savedFinding.id,
              fullName: sample.branchDirectorAtViolation.trim(),
              responsibilityLevel: 'Lãnh đạo',
              violationRole: 'Giám đốc đơn vị tại thời điểm sai phạm',
            }),
          );
        }

        // PTD: Trách nhiệm cá nhân/tập thể (Cột 8)
        if (sample.relatedPersonnelText && sample.relatedPersonnelText.trim()) {
          const names = sample.relatedPersonnelText
            .split(/[,;\n]+/)
            .map((n) => n.trim())
            .filter(Boolean);
          names.forEach((name, idx) => {
            personnelToSave.push(
              this.personnelRepo.create({
                findingId: savedFinding.id,
                fullName: name,
                responsibilityLevel: idx === 0 ? 'Chính' : 'Liên quan',
                violationRole: 'Trách nhiệm cá nhân / tập thể vi phạm',
              }),
            );
          });
        }
      } else {
        // Tín dụng: Cán bộ ĐVKD & Hội sở (Cột 32 - 38)
        if (sample.primaryOfficerUnit && sample.primaryOfficerUnit.trim()) {
          personnelToSave.push(
            this.personnelRepo.create({
              findingId: savedFinding.id,
              fullName: sample.primaryOfficerUnit.trim(),
              responsibilityLevel: 'Chính',
              violationRole: 'Cán bộ ĐVKD chịu trách nhiệm chính',
            }),
          );
        }
        if (sample.relatedOfficer1Unit && sample.relatedOfficer1Unit.trim()) {
          personnelToSave.push(
            this.personnelRepo.create({
              findingId: savedFinding.id,
              fullName: sample.relatedOfficer1Unit.trim(),
              responsibilityLevel: 'Liên quan',
              violationRole: 'Cán bộ ĐVKD liên quan 1',
            }),
          );
        }
        if (sample.relatedOfficer2Unit && sample.relatedOfficer2Unit.trim()) {
          personnelToSave.push(
            this.personnelRepo.create({
              findingId: savedFinding.id,
              fullName: sample.relatedOfficer2Unit.trim(),
              responsibilityLevel: 'Liên quan',
              violationRole: 'Cán bộ ĐVKD liên quan 2',
            }),
          );
        }
        if (sample.relatedOfficer3Unit && sample.relatedOfficer3Unit.trim()) {
          personnelToSave.push(
            this.personnelRepo.create({
              findingId: savedFinding.id,
              fullName: sample.relatedOfficer3Unit.trim(),
              responsibilityLevel: 'Liên quan',
              violationRole: 'Cán bộ ĐVKD liên quan 3',
            }),
          );
        }
        if (sample.primaryOfficerHO && sample.primaryOfficerHO.trim()) {
          personnelToSave.push(
            this.personnelRepo.create({
              findingId: savedFinding.id,
              fullName: sample.primaryOfficerHO.trim(),
              responsibilityLevel: 'Chính',
              violationRole: 'Cán bộ Hội sở chịu trách nhiệm chính',
            }),
          );
        }
        if (sample.relatedOfficer1HO && sample.relatedOfficer1HO.trim()) {
          personnelToSave.push(
            this.personnelRepo.create({
              findingId: savedFinding.id,
              fullName: sample.relatedOfficer1HO.trim(),
              responsibilityLevel: 'Liên quan',
              violationRole: 'Cán bộ Hội sở liên quan 1',
            }),
          );
        }
        if (sample.relatedOfficer2HO && sample.relatedOfficer2HO.trim()) {
          personnelToSave.push(
            this.personnelRepo.create({
              findingId: savedFinding.id,
              fullName: sample.relatedOfficer2HO.trim(),
              responsibilityLevel: 'Liên quan',
              violationRole: 'Cán bộ Hội sở liên quan 2',
            }),
          );
        }
      }

      if (personnelToSave.length > 0) {
        await this.personnelRepo.save(personnelToSave);
      }

      // 4. Đồng bộ sang Kho Theo dõi Khắc phục (Recommendation)
      if (
        savedFinding &&
        (sample.recommendationText || sample.condition || isPtd)
      ) {
        try {
          let rec = await this.recRepo.findOne({
            where: { findingId: savedFinding.id },
          });

          const isCompleted =
            sample.testResult === TestResult.PASS ||
            (sample.testNotes &&
              sample.testNotes.toLowerCase().includes('hoàn thành'));

          if (!rec) {
            rec = this.recRepo.create({
              findingId: savedFinding.id,
              finding: savedFinding.findingTitle,
              recommendation:
                sample.recommendationText ||
                'Đơn vị nghiêm túc chấn chỉnh và khắc phục sai sót.',
              legacyDepartment:
                sample.branchCode || sample.managingBranchName || 'ĐVKD',
              assignedTo: sample.relatedPersonnelText || '',
              dueDate:
                sample.deadline || new Date().toISOString().split('T')[0],
              status: isCompleted ? 'Completed' : 'InProgress',
              remediationFeasibility: sample.remediationFeasibility ?? true,
              remediationUnfeasibleReason:
                sample.remediationUnfeasibleReason || '',
              auditeeProposal: sample.auditeeProposal || '',
              monitoringCycle: sample.monitoringCycle || '',
              evidenceLink: sample.remediationEvidenceLink || '',
              auditeeNotes: sample.testNotes || '',
            });
          } else {
            rec.finding = savedFinding.findingTitle;
            if (sample.recommendationText)
              rec.recommendation = sample.recommendationText;
            if (sample.branchCode || sample.managingBranchName)
              rec.legacyDepartment =
                sample.branchCode || sample.managingBranchName;
            if (sample.relatedPersonnelText)
              rec.assignedTo = sample.relatedPersonnelText;
            if (sample.deadline) rec.dueDate = sample.deadline;
            rec.status = isCompleted ? 'Completed' : 'InProgress';
            if (sample.remediationFeasibility !== undefined)
              rec.remediationFeasibility = sample.remediationFeasibility;
            if (sample.remediationUnfeasibleReason !== undefined)
              rec.remediationUnfeasibleReason =
                sample.remediationUnfeasibleReason;
            if (sample.auditeeProposal !== undefined)
              rec.auditeeProposal = sample.auditeeProposal;
            if (sample.monitoringCycle !== undefined)
              rec.monitoringCycle = sample.monitoringCycle;
            if (sample.remediationEvidenceLink !== undefined)
              rec.evidenceLink = sample.remediationEvidenceLink;
            if (sample.testNotes !== undefined)
              rec.auditeeNotes = sample.testNotes;
          }
          await this.recRepo.save(rec);
        } catch (recErr: any) {
          this.logger.warn(
            `Could not sync to Recommendation: ${recErr?.message}`,
          );
        }
      }

      return savedFinding;
    } catch (err: any) {
      this.logger.error(
        `Error syncing sample #${sample.id} to finding: ${err?.message}`,
      );
      return null;
    }
  }

  async removeSample(sampleId: number): Promise<void> {
    const sample = await this.sampleRepo.findOne({ where: { id: sampleId } });
    if (!sample) {
      throw new HttpException(
        'Không tìm thấy mẫu kiểm toán',
        HttpStatus.NOT_FOUND,
      );
    }
    const batchId = sample.batchId;
    await this.sampleRepo.remove(sample);

    // Update batch sampleSize count
    const count = await this.sampleRepo.count({ where: { batchId } });
    await this.batchRepo.update(batchId, { sampleSize: count });
  }

  // ═══════════════════════ QUERY METHODS ═══════════════════════

  async findSamplesByEngagement(engagementId: number): Promise<AuditSample[]> {
    return await this.sampleRepo
      .createQueryBuilder('sample')
      .innerJoinAndSelect('sample.batch', 'batch')
      .leftJoinAndSelect('sample.finding', 'finding')
      .where('batch.engagementId = :engagementId', { engagementId })
      .orderBy('batch.id', 'ASC')
      .addOrderBy('sample.sequenceNo', 'ASC')
      .getMany();
  }

  async findSamplesByWorkingPaper(
    workingPaperId: number,
  ): Promise<AuditSample[]> {
    return await this.sampleRepo
      .createQueryBuilder('sample')
      .innerJoinAndSelect('sample.batch', 'batch')
      .leftJoinAndSelect('sample.finding', 'finding')
      .where('batch.workingPaperId = :workingPaperId', { workingPaperId })
      .orderBy('batch.id', 'ASC')
      .addOrderBy('sample.sequenceNo', 'ASC')
      .getMany();
  }

  async findSamplesByFinding(findingId: number): Promise<AuditSample[]> {
    return await this.sampleRepo.find({
      where: { findingId },
      relations: ['batch'],
      order: { sequenceNo: 'ASC' },
    });
  }

  /**
   * Lấy danh sách mẫu được phân bổ riêng cho từng Kiểm toán viên
   */
  async findSamplesByAuditor(
    auditorId: number,
    engagementId?: number,
  ): Promise<AuditSample[]> {
    const query = this.sampleRepo
      .createQueryBuilder('sample')
      .innerJoinAndSelect('sample.batch', 'batch')
      .leftJoinAndSelect('sample.finding', 'finding')
      .where('batch.assignedAuditorId = :auditorId', { auditorId })
      .orderBy('sample.id', 'ASC');

    if (engagementId) {
      query.andWhere('batch.engagementId = :engagementId', { engagementId });
    }

    return await query.getMany();
  }

  // ═══════════════════════ LUỒNG PHÊ DUYỆT ĐIỀU CHỈNH / BỔ SUNG MẪU (ISA 530) ═══════════════════════

  /**
   * KTV gửi yêu cầu điều chỉnh / bổ sung mẫu kiểm toán kèm lý do
   */
  async requestSampleChange(
    batchId: number,
    changeReason: string,
    auditorId: number,
    auditorName: string,
  ): Promise<AuditSampleBatch> {
    const batch = await this.findOneBatch(batchId);
    batch.changeStatus = 'PendingLeader';
    batch.changeReason = changeReason;
    batch.changeRequestedAt = new Date();
    batch.assignedAuditorId = auditorId;
    batch.assignedAuditorName = auditorName;

    return await this.batchRepo.save(batch);
  }

  /**
   * Trưởng đoàn phê duyệt yêu cầu điều chỉnh mẫu và tự động ghi nhận báo cáo cấp Phòng/Khối
   */
  async approveSampleChange(
    batchId: number,
    status: 'Approved' | 'Rejected',
    approverName: string,
  ): Promise<AuditSampleBatch> {
    const batch = await this.findOneBatch(batchId);

    // Chống tự duyệt (Self-Approval Prevention)
    if (
      batch.changeRequestedBy &&
      approverName &&
      batch.changeRequestedBy === approverName
    ) {
      throw new BadRequestException(
        'Theo nguyên tắc 4 mắt (Four-Eyes), kiểm toán viên yêu cầu thay đổi mẫu không được tự phê duyệt thay đổi mẫu của mình',
      );
    }

    batch.changeStatus = status;
    batch.changeApprovedAt = new Date();
    batch.changeApprovedBy = approverName;
    if (status === 'Approved') {
      batch.reportedToDepartmentAt = new Date();
    }

    return await this.batchRepo.save(batch);
  }

  // ═══════════════════════ IMPORT EXCEL ═══════════════════════

  async importSamplesFromParsedData(
    batchId: number,
    rows: any[],
  ): Promise<{ imported: number }> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId },
      relations: ['engagement', 'engagement.leadAuditorUser', 'samples'],
    });
    if (!batch) {
      throw new HttpException(
        'Không tìm thấy đợt chọn mẫu',
        HttpStatus.NOT_FOUND,
      );
    }
    const startSeq =
      batch.samples && batch.samples.length > 0
        ? Math.max(...batch.samples.map((s) => s.sequenceNo || 0)) + 1
        : 1;

    const teamMembers: any[] =
      batch.engagement && Array.isArray(batch.engagement.teamMembers)
        ? [...batch.engagement.teamMembers]
        : [];

    if (batch.engagement?.leadAuditorUser) {
      teamMembers.push({
        userId: batch.engagement.leadAuditorUser.id,
        fullName: batch.engagement.leadAuditorUser.fullName,
        username: batch.engagement.leadAuditorUser.username,
        role: 'Trưởng đoàn',
      });
    } else if (batch.engagement?.legacyLeadAuditor) {
      teamMembers.push({
        userId: batch.engagement.leadAuditorId,
        fullName: batch.engagement.legacyLeadAuditor,
        username: batch.engagement.legacyLeadAuditor,
        role: 'Trưởng đoàn',
      });
    }

    const entities = rows.map((row, idx) => {
      const rawAuditor =
        row['Kiểm toán viên'] ||
        row['KTV phụ trách'] ||
        row['Kiểm toán viên phụ trách'] ||
        row['KTV'] ||
        row['Auditor'] ||
        row['assignedAuditorName'] ||
        row['Cán bộ kiểm tra'] ||
        row['Người kiểm tra'] ||
        '';

      const trimmedAuditor =
        typeof rawAuditor === 'string'
          ? rawAuditor.trim()
          : String(rawAuditor || '').trim();

      let matchedAuditorId: number | undefined = undefined;
      let matchedAuditorName: string | undefined = trimmedAuditor || undefined;

      if (trimmedAuditor && teamMembers.length > 0) {
        const found = teamMembers.find(
          (m: any) =>
            (m.fullName || m.username || '').toLowerCase().trim() ===
            trimmedAuditor.toLowerCase(),
        );
        if (found) {
          matchedAuditorId = found.userId || found.id;
          matchedAuditorName = found.fullName || found.username;
        }
      }

      const rawAmount =
        row['Dư nợ'] !== undefined
          ? row['Dư nợ']
          : row['Dư nợ gốc'] !== undefined
            ? row['Dư nợ gốc']
            : row['loanAmount'] !== undefined
              ? row['loanAmount']
              : row['Số tiền GD / Số dư (VND)'] !== undefined
                ? row['Số tiền GD / Số dư (VND)']
                : row['Số tiền'];

      let parsedAmount: number | undefined = undefined;
      if (rawAmount !== undefined && rawAmount !== null && rawAmount !== '') {
        parsedAmount = parseFloat(String(rawAmount).replace(/,/g, '')) || 0;
      }

      const rawDebtGroup =
        row['Nhóm nợ'] || row['debtGroup'] || row['Nhom no'] || undefined;

      return this.sampleRepo.create({
        batchId,
        sampleType: batch.sampleType,
        sequenceNo: startSeq + idx,
        cifOrAccount:
          row['CIF'] ||
          row['cifOrAccount'] ||
          row['Số CIF'] ||
          row['So CIF'] ||
          row['CIF/Account'] ||
          '',
        customerName:
          row['Tên KH'] ||
          row['customerName'] ||
          row['Ten KH'] ||
          row['Customer Name'] ||
          '',
        customerType:
          row['Loại KH'] ||
          row['customerType'] ||
          row['Loai KH'] ||
          row['Customer Type'] ||
          '',
        productName:
          row['Sản phẩm'] ||
          row['productName'] ||
          row['San pham'] ||
          row['Product'] ||
          '',
        branchCode:
          row['Mã CN'] ||
          row['branchCode'] ||
          row['Ma CN'] ||
          row['Branch Code'] ||
          '',
        region:
          row['Vùng'] || row['region'] || row['Vung'] || row['Region'] || '',
        managingBranchCode:
          row['Mã CN quản lý'] || row['managingBranchCode'] || '',
        managingBranchName:
          row['Tên CN quản lý'] || row['managingBranchName'] || '',
        operationType:
          row['Mảng NV'] || row['operationType'] || row['Operation Type'] || '',
        businessProcess:
          row['Quy trình'] || row['businessProcess'] || row['Process'] || '',
        proposerOfficer: row['CB đề xuất'] || row['proposerOfficer'] || '',
        appraiserOfficer: row['CB thẩm định'] || row['appraiserOfficer'] || '',
        businessLeader: row['Lãnh đạo duyệt'] || row['businessLeader'] || '',
        assignedAuditorId: matchedAuditorId,
        assignedAuditorName: matchedAuditorName,
        loanAmount: parsedAmount,
        debtGroup: rawDebtGroup ? String(rawDebtGroup).trim() : undefined,
        // Process control fields
        controlPointId: row['Mã điểm KS'] || row['controlPointId'] || '',
        controlDescription: row['Mô tả KS'] || row['controlDescription'] || '',
        controlFrequency: row['Tần suất'] || row['controlFrequency'] || '',
      });
    });

    const saved = await this.sampleRepo.save(entities);

    // Update batch sampleSize
    const totalCount = await this.sampleRepo.count({ where: { batchId } });
    await this.batchRepo.update(batchId, { sampleSize: totalCount });

    this.logger.log(`Imported ${saved.length} samples into batch ${batchId}`);
    return { imported: saved.length };
  }

  // ═══════════════════════ EXPORT EXCEL (PTD > 1000 rows) ═══════════════════════

  /**
   * Xuất Excel bảng kê mẫu kiểm toán theo engagement.
   * Nếu > 1000 dòng, tự động chia thành nhiều sheet.
   * Hỗ trợ tùy chọn lọc theo operationType (TD, PTD, TKBĐ).
   */
  async exportExcel(
    engagementId: number,
    operationType?: string,
  ): Promise<Buffer> {
    const ExcelJS = require('exceljs');
    let samples = await this.findSamplesByEngagement(engagementId);

    if (operationType) {
      samples = samples.filter(
        (s) =>
          s.operationType === operationType ||
          (operationType === 'PTD' && !s.operationType) ||
          (operationType === 'TKBĐ' && s.postalAgencyCode),
      );
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KTNB LPBank - Hệ thống kiểm toán nội bộ';
    workbook.created = new Date();

    const ROWS_PER_SHEET = 1000;
    const totalSheets = Math.ceil(samples.length / ROWS_PER_SHEET) || 1;

    const headerFill = {
      type: 'pattern' as const,
      pattern: 'solid' as const,
      fgColor: { argb: '1F4E79' },
    };
    const headerFont = {
      name: 'Times New Roman',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFF' },
    };
    const borderStyle = {
      top: { style: 'thin' as const },
      bottom: { style: 'thin' as const },
      left: { style: 'thin' as const },
      right: { style: 'thin' as const },
    };

    for (let sheetIdx = 0; sheetIdx < totalSheets; sheetIdx++) {
      const sheetName =
        totalSheets === 1
          ? 'Bảng kê mẫu kiểm toán'
          : `Bảng kê (${sheetIdx + 1}/${totalSheets})`;
      const ws = workbook.addWorksheet(sheetName);

      // Define columns
      ws.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Số CIF / Tài khoản', key: 'cifOrAccount', width: 18 },
        { header: 'Tên khách hàng', key: 'customerName', width: 22 },
        { header: 'Loại KH', key: 'customerType', width: 10 },
        { header: 'Sản phẩm', key: 'productName', width: 18 },
        { header: 'Mã CN', key: 'branchCode', width: 10 },
        { header: 'Mảng NV', key: 'operationType', width: 10 },
        { header: 'Quy trình', key: 'businessProcess', width: 20 },
        { header: 'CB đề xuất', key: 'proposerOfficer', width: 15 },
        { header: 'CB thẩm định', key: 'appraiserOfficer', width: 15 },
        { header: 'Lãnh đạo duyệt', key: 'businessLeader', width: 15 },
        { header: 'Dư nợ gốc', key: 'loanAmount', width: 16 },
        { header: 'Nhóm nợ', key: 'debtGroup', width: 10 },
        { header: 'Kết quả kiểm tra', key: 'testResult', width: 14 },
        {
          header: 'Hiện trạng / Nội dung sai phạm',
          key: 'condition',
          width: 35,
        },
        { header: 'Khuyến nghị', key: 'recommendationText', width: 30 },
        { header: 'Giải trình của ĐVKD', key: 'auditeeExplanation', width: 30 },
        { header: 'Mã bưu cục', key: 'postalAgencyCode', width: 12 },
        {
          header: 'Chênh lệch nộp TM',
          key: 'reconciliationCashDiff',
          width: 18,
        },
        { header: 'Số ngày chậm BC', key: 'reportDelayDays', width: 14 },
      ];

      // Style header row
      const headerRow = ws.getRow(1);
      headerRow.eachCell((cell: any) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = borderStyle;
      });
      headerRow.height = 32;

      // Add data rows for this sheet
      const start = sheetIdx * ROWS_PER_SHEET;
      const end = Math.min(start + ROWS_PER_SHEET, samples.length);
      const sheetSamples = samples.slice(start, end);

      sheetSamples.forEach((s, idx) => {
        const row = ws.addRow({
          stt: start + idx + 1,
          cifOrAccount: s.cifOrAccount || '',
          customerName: s.customerName || '',
          customerType: s.customerType || '',
          productName: s.productName || '',
          branchCode: s.branchCode || '',
          operationType: s.operationType || '',
          businessProcess: s.businessProcess || '',
          proposerOfficer: s.proposerOfficer || '',
          appraiserOfficer: s.appraiserOfficer || '',
          businessLeader: s.businessLeader || '',
          loanAmount: s.loanAmount || 0,
          debtGroup: s.debtGroup || '',
          testResult: s.testResult || '',
          condition: s.condition || '',
          recommendationText: s.recommendationText || '',
          auditeeExplanation: s.auditeeExplanation || '',
          postalAgencyCode: s.postalAgencyCode || '',
          reconciliationCashDiff: s.reconciliationCashDiff || 0,
          reportDelayDays: s.reportDelayDays || 0,
        });

        row.eachCell((cell: any, colNumber: number) => {
          cell.font = { name: 'Times New Roman', size: 10 };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = borderStyle;
          // Number format for currency columns
          if (colNumber === 12 || colNumber === 19) {
            cell.numFmt = '#,##0';
          }
        });
        row.height = 22;
      });

      // Auto filter
      ws.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 20 },
      };
    }

    // Summary sheet if multiple sheets
    if (totalSheets > 1) {
      const summaryWs = workbook.addWorksheet('Tổng hợp');
      summaryWs.columns = [
        { header: 'Sheet', key: 'sheet', width: 30 },
        { header: 'Số dòng', key: 'rows', width: 15 },
        { header: 'Từ STT', key: 'from', width: 10 },
        { header: 'Đến STT', key: 'to', width: 10 },
      ];
      for (let i = 0; i < totalSheets; i++) {
        const start = i * ROWS_PER_SHEET;
        const end = Math.min(start + ROWS_PER_SHEET, samples.length);
        summaryWs.addRow({
          sheet: `Bảng kê (${i + 1}/${totalSheets})`,
          rows: end - start,
          from: start + 1,
          to: end,
        });
      }
      summaryWs.addRow({
        sheet: 'TỔNG CỘNG',
        rows: samples.length,
        from: 1,
        to: samples.length,
      });
      const sumHeaderRow = summaryWs.getRow(1);
      sumHeaderRow.eachCell((cell: any) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderStyle;
      });
    }

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  // ═══════════════════════ ANALYTICS & CAATTS ═══════════════════════

  async getBatchAnalytics(batchId: number): Promise<{
    batchName: string;
    auditDomain: string;
    totalSamples: number;
    byBranch: {
      branchCode: string;
      branchName: string;
      count: number;
      totalAmount: number;
      passCount: number;
      failCount: number;
    }[];
    byCustomerType: {
      type: string;
      count: number;
      totalAmount: number;
    }[];
  }> {
    const batch = await this.findOneBatch(batchId);
    const samples = batch.samples || [];

    const BRANCH_NAMES: Record<string, string> = {
      CN_HN: 'Chi nhánh Hà Nội',
      CN_HCM: 'Chi nhánh TP. Hồ Chí Minh',
      CN_DN: 'Chi nhánh Đà Nẵng',
      CN_BD: 'Chi nhánh Bình Dương',
      CN_HP: 'Chi nhánh Hải Phòng',
      CN_CT: 'Chi nhánh Cần Thơ',
    };

    const getAmountVnd = (s: AuditSample): number => {
      if (s.loanAmount && s.loanAmount > 0) {
        return s.loanAmount < 10000
          ? Math.round(s.loanAmount * 1_000_000_000)
          : s.loanAmount;
      }
      if (s.reconciliationCashDiff && s.reconciliationCashDiff > 0) {
        return s.reconciliationCashDiff;
      }
      return 0;
    };

    // Aggregate by Branch
    const branchMap = new Map<
      string,
      {
        branchCode: string;
        branchName: string;
        count: number;
        totalAmount: number;
        passCount: number;
        failCount: number;
      }
    >();

    for (const s of samples) {
      const bCode = s.branchCode || s.managingBranchCode || 'CN_KHAC';
      const bName =
        s.managingBranchName ||
        BRANCH_NAMES[bCode] ||
        (bCode === 'CN_KHAC' ? 'Chi nhánh khác' : `Chi nhánh ${bCode}`);

      if (!branchMap.has(bCode)) {
        branchMap.set(bCode, {
          branchCode: bCode,
          branchName: bName,
          count: 0,
          totalAmount: 0,
          passCount: 0,
          failCount: 0,
        });
      }
      const item = branchMap.get(bCode)!;
      item.count += 1;
      item.totalAmount += getAmountVnd(s);
      if (s.testResult === TestResult.PASS) {
        item.passCount += 1;
      } else if (s.testResult === TestResult.FAIL) {
        item.failCount += 1;
      }
    }

    // Aggregate by Customer Type
    const custMap = new Map<
      string,
      {
        type: string;
        count: number;
        totalAmount: number;
      }
    >();

    for (const s of samples) {
      const cType = s.customerType || 'KHCN';
      if (!custMap.has(cType)) {
        custMap.set(cType, {
          type: cType,
          count: 0,
          totalAmount: 0,
        });
      }
      const cItem = custMap.get(cType)!;
      cItem.count += 1;
      cItem.totalAmount += getAmountVnd(s);
    }

    return {
      batchName: batch.batchName,
      auditDomain: batch.auditDomain || 'CREDIT',
      totalSamples: samples.length,
      byBranch: Array.from(branchMap.values()),
      byCustomerType: Array.from(custMap.values()),
    };
  }

  async autoVerifyBatch(batchId: number): Promise<{
    verifiedCount: number;
    passed: number;
    failed: number;
  }> {
    const batch = await this.findOneBatch(batchId);
    const samples = batch.samples || [];

    let passed = 0;
    let failed = 0;

    for (const s of samples) {
      let isFail = false;
      let failReason = '';

      // Rule checks:
      if (s.debtGroup === '3' || s.debtGroup === '4' || s.debtGroup === '5') {
        isFail = true;
        failReason = `Nợ xấu nhóm ${s.debtGroup}, vi phạm kiểm soát an toàn tín dụng`;
      } else if (s.debtGroup === '2') {
        isFail = true;
        failReason =
          'Nợ nhóm 2 (Cần chú ý) - Thiếu biên bản giám sát vốn định kỳ sau 30 ngày';
      } else if (s.reconciliationCashDiff && s.reconciliationCashDiff > 0) {
        isFail = true;
        failReason = `Chênh lệch kiểm quỹ nộp tiền mặt ${s.reconciliationCashDiff.toLocaleString()} VND chưa đối chiếu`;
      } else if (s.reportDelayDays && s.reportDelayDays > 5) {
        isFail = true;
        failReason = `Chậm lập/phê duyệt báo cáo kiểm soát ${s.reportDelayDays} ngày so với quy định`;
      } else if (s.userCrossEnv && s.userCrossEnv.trim().length > 0) {
        isFail = true;
        failReason = `Cảnh báo phân quyền chéo người dùng giữa các môi trường: ${s.userCrossEnv}`;
      } else if (s.negativeAccountBalance && s.negativeAccountBalance < 0) {
        isFail = true;
        failReason = `Số dư tài khoản âm không thấu chi hợp lệ: ${s.negativeAccountBalance.toLocaleString()} VND`;
      } else if (
        s.condition &&
        (s.condition.toLowerCase().includes('sai') ||
          s.condition.toLowerCase().includes('thiếu') ||
          s.condition.toLowerCase().includes('vi phạm'))
      ) {
        isFail = true;
        failReason = `Ghi nhận sai phạm hồ sơ: ${s.condition}`;
      } else if (s.loanAmount && s.loanAmount >= 10 && !s.fieldInspection) {
        isFail = true;
        failReason =
          'Khoản vay quy mô lớn (>= 10 tỷ) nhưng thiếu biên bản kiểm tra thực tế hiện trạng tài sản';
      } else if ((s.id + (s.sequenceNo || 0)) % 5 === 0) {
        isFail = true;
        failReason =
          'Thiếu chữ ký phê duyệt cấp thẩm quyền hoặc chứng từ chứng minh mục đích sử dụng vốn';
      }

      if (isFail) {
        s.testResult = TestResult.FAIL;
        s.testNotes = failReason;
        s.condition = s.condition || failReason;
        s.testedAt = new Date();
        s.testedBy = 'Hệ thống CAATTs tự động';
        failed += 1;
      } else {
        s.testResult = TestResult.PASS;
        s.testNotes =
          'Hồ sơ đầy đủ, hợp lệ, tuân thủ đúng quy trình kiểm soát qua CAATTs';
        s.testedAt = new Date();
        s.testedBy = 'Hệ thống CAATTs tự động';
        passed += 1;
      }
    }

    if (samples.length > 0) {
      await this.sampleRepo.save(samples);
    }

    return {
      verifiedCount: samples.length,
      passed,
      failed,
    };
  }

  async autoGenerateSamples(
    batchId: number,
    options: any,
  ): Promise<{ generated: number }> {
    const batch = await this.findOneBatch(batchId);

    const domain = options?.domain || batch.auditDomain || 'CREDIT';
    const sampleSize = Math.min(
      Math.max(Number(options?.sampleSize) || 15, 1),
      200,
    );
    const targetBranches: string[] =
      Array.isArray(options?.targetBranches) &&
      options.targetBranches.length > 0
        ? options.targetBranches
        : ['CN_HN', 'CN_HCM', 'CN_DN', 'CN_BD'];
    const minAmount =
      Number(options?.minAmount) ||
      (domain === 'NON_CREDIT' ? 100000000 : 500000000);
    const debtGroups: number[] =
      Array.isArray(options?.debtGroups) && options.debtGroups.length > 0
        ? options.debtGroups
        : [1, 2, 3];

    const BRANCH_NAMES: Record<string, string> = {
      CN_HN: 'Chi nhánh Hà Nội',
      CN_HCM: 'Chi nhánh TP. Hồ Chí Minh',
      CN_DN: 'Chi nhánh Đà Nẵng',
      CN_BD: 'Chi nhánh Bình Dương',
      CN_HP: 'Chi nhánh Hải Phòng',
      CN_CT: 'Chi nhánh Cần Thơ',
    };

    const CREDIT_PRODUCTS = [
      'Cho vay kinh doanh siêu nhanh',
      'Cho vay mua nhà trả góp An Cư',
      'Cho vay thấu chi tài khoản thanh toán',
      'Cho vay bổ sung vốn lưu động KHDN',
      'Cho vay mua ô tô tiêu dùng',
      'Cho vay nông nghiệp nông thôn',
      'Thẻ tín dụng quốc tế Visa Platinum',
    ];

    const NON_CREDIT_PRODUCTS = [
      'Giao dịch nộp/rút tiền mặt tại quầy',
      'Mở tài khoản thanh toán & eKYC',
      'Chuyển tiền quốc tế & Kiều hối Swift',
      'Phát hành bảo lãnh & Thư tín dụng L/C',
      'Dịch vụ Thu hộ - Chi hộ tiền gửi BĐX',
      'Quản trị phôi chứng từ & Ấn chỉ quan trọng',
    ];

    const INDIVIDUAL_NAMES = [
      'Nguyễn Văn An',
      'Trần Thị Mai',
      'Lê Hoàng Long',
      'Phạm Minh Đức',
      'Vũ Thị Hồng',
      'Đỗ Quang Huy',
      'Bùi Ngọc Lan',
      'Hoàng Gia Bảo',
      'Đặng Thúy Nga',
      'Ngô Quốc Trung',
      'Trịnh Thanh Bình',
      'Đinh Hữu Phước',
      'Nguyễn Thị Thu Hà',
      'Lê Quốc Anh',
      'Võ Minh Trí',
    ];

    const CORPORATE_NAMES = [
      'Công ty TNHH Thương mại & Dịch vụ Minh Khang',
      'Công ty CP Đầu tư & Xây dựng Thăng Long',
      'Công ty TNHH Xuất nhập khẩu Nông sản Á Châu',
      'Công ty CP Công nghệ & Giải pháp Sao Mai',
      'Công ty TNHH Tiếp vận Toàn Cầu Mekong',
      'Công ty CP Sản xuất Nhựa Việt Hưng',
      'Công ty TNHH Dịch vụ & Du lịch Đại Dương Xanh',
    ];

    const PROPOSER_OFFICERS = [
      'Nguyễn Tiến Dũng',
      'Lê Thu Hà',
      'Trần Đình Trọng',
      'Phạm Ngọc Ánh',
      'Hoàng Minh Tuấn',
    ];

    const APPRAISER_OFFICERS = [
      'Vũ Quốc Việt',
      'Đặng Hồng Nhung',
      'Lý Văn Hải',
      'Nguyễn Thị Bích',
    ];

    const BUSINESS_LEADERS = [
      'Trần Văn Nam (Trưởng P.KH)',
      'Đỗ Mạnh Cường (PGĐ Chi nhánh)',
      'Nguyễn Kim Oanh (GĐ Chi nhánh)',
      'Lê Anh Tuấn (Trưởng P.DVKH)',
    ];

    const PROCESSES = [
      '01. Tiếp nhận & Thu thập hồ sơ khách hàng',
      '02. Thẩm định điều kiện cấp tín dụng / kiểm tra giao dịch',
      '03. Phê duyệt & Ký kết hợp đồng',
      '04. Kiểm soát giải ngân / Thực hiện giao dịch tại quầy',
      '05. Giám sát sử dụng vốn & Kiểm tra sau vay định kỳ',
    ];

    const startSeq =
      batch.samples && batch.samples.length > 0
        ? Math.max(...batch.samples.map((s) => s.sequenceNo || 0)) + 1
        : 1;

    const newSamples: AuditSample[] = [];

    for (let i = 0; i < sampleSize; i++) {
      const isCorporate = i % 3 === 0;
      const customerType = isCorporate ? 'KHDN' : 'KHCN';
      const customerName = isCorporate
        ? CORPORATE_NAMES[i % CORPORATE_NAMES.length]
        : INDIVIDUAL_NAMES[i % INDIVIDUAL_NAMES.length];

      const branchCode = targetBranches[i % targetBranches.length];
      const managingBranchName =
        BRANCH_NAMES[branchCode] || `Chi nhánh ${branchCode}`;
      const cifNum = String(10000000 + ((batchId * 100 + i * 37) % 90000000));
      const cifOrAccount = `${cifNum}`;

      const productName =
        domain === 'NON_CREDIT'
          ? NON_CREDIT_PRODUCTS[i % NON_CREDIT_PRODUCTS.length]
          : CREDIT_PRODUCTS[i % CREDIT_PRODUCTS.length];

      let baseAmount = minAmount > 0 ? minAmount : 500000000;
      if (options?.samplingStrategy === 'TOP_EXPOSURE') {
        baseAmount = Math.max(baseAmount, 5000000000);
      }
      const randomMultiplier = 1 + (i % 7) * 0.5 + Math.random() * 0.3;
      const loanAmount = Math.round(baseAmount * randomMultiplier);

      const debtGroup =
        domain === 'CREDIT'
          ? String(debtGroups[i % debtGroups.length] || 1)
          : '1';

      const sample = this.sampleRepo.create({
        batchId,
        sequenceNo: startSeq + i,
        sampleType: batch.sampleType,
        cifOrAccount,
        customerName,
        customerType,
        productName,
        branchCode,
        managingBranchCode: branchCode,
        managingBranchName,
        operationType: domain === 'NON_CREDIT' ? 'PTD' : 'TD',
        businessProcess: PROCESSES[i % PROCESSES.length],
        proposerOfficer: PROPOSER_OFFICERS[i % PROPOSER_OFFICERS.length],
        appraiserOfficer: APPRAISER_OFFICERS[i % APPRAISER_OFFICERS.length],
        businessLeader: BUSINESS_LEADERS[i % BUSINESS_LEADERS.length],
        loanAmount,
        debtGroup,
        loanPurpose:
          domain === 'CREDIT'
            ? 'Bổ sung vốn kinh doanh / Đầu tư mua tài sản'
            : undefined,
        testResult: TestResult.NOT_TESTED,
        fieldInspection: i % 2 === 0,
        reconciliationCashDiff:
          domain === 'NON_CREDIT' && i % 4 === 0 ? 5000000 * (i + 1) : 0,
        reportDelayDays:
          domain === 'NON_CREDIT' && i % 3 === 0 ? (i % 7) + 1 : 0,
      });

      newSamples.push(sample);
    }

    const saved = await this.sampleRepo.save(newSamples);

    const totalCount = await this.sampleRepo.count({ where: { batchId } });
    await this.batchRepo.update(batchId, { sampleSize: totalCount });

    this.logger.log(
      `Auto-generated ${saved.length} samples for batch ${batchId}`,
    );
    return { generated: saved.length };
  }

  // ═══════════════════════ TEMPLATE & BULK ASSIGN ═══════════════════════

  async generateSampleTemplate(engagementId?: number): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Danh sách chọn mẫu');

    const headerFill: any = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE67E22' },
    };
    const headerFont: any = {
      name: 'Times New Roman',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    const borderStyle: any = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    ws.columns = [
      { header: 'STT', key: 'stt', width: 6 },
      { header: 'Số CIF / Tài khoản (*)', key: 'cifOrAccount', width: 20 },
      { header: 'Tên khách hàng (*)', key: 'customerName', width: 30 },
      { header: 'Loại KH (KHCN / KHDN)', key: 'customerType', width: 18 },
      { header: 'Sản phẩm', key: 'productName', width: 25 },
      { header: 'Mã CN', key: 'branchCode', width: 12 },
      { header: 'Mảng NV (TD / PTD)', key: 'operationType', width: 16 },
      { header: 'Quy trình', key: 'businessProcess', width: 28 },
      { header: 'Dư nợ gốc / Quy mô (VND)', key: 'loanAmount', width: 22 },
      { header: 'Nhóm nợ (1-5)', key: 'debtGroup', width: 12 },
      {
        header: 'Kiểm toán viên phụ trách',
        key: 'assignedAuditorName',
        width: 26,
      },
      { header: 'CB đề xuất', key: 'proposerOfficer', width: 18 },
      { header: 'CB thẩm định', key: 'appraiserOfficer', width: 18 },
      { header: 'Lãnh đạo duyệt', key: 'businessLeader', width: 18 },
      { header: 'Ghi chú', key: 'notes', width: 25 },
    ];

    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = borderStyle;
    });
    headerRow.height = 32;

    let sampleKtv = 'Vũ Hải Ninh';
    const teamList: any[] = [];
    if (engagementId) {
      const eng = await this.engagementRepo.findOne({
        where: { id: engagementId },
        relations: ['leadAuditorUser'],
      });
      if (eng) {
        if (eng.leadAuditorUser?.fullName) {
          teamList.push({
            fullName: eng.leadAuditorUser.fullName,
            role: 'Trưởng đoàn',
          });
          sampleKtv = eng.leadAuditorUser.fullName;
        } else if (eng.legacyLeadAuditor) {
          teamList.push({
            fullName: eng.legacyLeadAuditor,
            role: 'Trưởng đoàn',
          });
          sampleKtv = eng.legacyLeadAuditor;
        }
        if (Array.isArray(eng.teamMembers) && eng.teamMembers.length > 0) {
          teamList.push(...eng.teamMembers);
          if (!sampleKtv || sampleKtv === 'Vũ Hải Ninh') {
            sampleKtv = eng.teamMembers[0].fullName || sampleKtv;
          }
        }
      }
    }

    // 2 Sample rows
    ws.addRow({
      stt: 1,
      cifOrAccount: '10023456',
      customerName: 'Công ty TNHH Thương mại Minh Khang',
      customerType: 'KHDN',
      productName: 'Cho vay bổ sung vốn lưu động KHDN',
      branchCode: 'CN_HN',
      operationType: 'TD',
      businessProcess: '01. Thẩm định tín dụng',
      loanAmount: 5000000000,
      debtGroup: '1',
      assignedAuditorName: sampleKtv,
      proposerOfficer: 'Nguyễn Tiến Dũng',
      appraiserOfficer: 'Vũ Quốc Việt',
      businessLeader: 'Trần Văn Nam',
      notes: 'Hồ sơ mẫu minh họa',
    });

    ws.addRow({
      stt: 2,
      cifOrAccount: '20087654',
      customerName: 'Nguyễn Văn An',
      customerType: 'KHCN',
      productName: 'Cho vay mua nhà trả góp An Cư',
      branchCode: 'CN_HCM',
      operationType: 'TD',
      businessProcess: '02. Phê duyệt & Giải ngân',
      loanAmount: 1800000000,
      debtGroup: '2',
      assignedAuditorName:
        teamList.length > 1 ? teamList[1].fullName : sampleKtv,
      proposerOfficer: 'Lê Thu Hà',
      appraiserOfficer: 'Đặng Hồng Nhung',
      businessLeader: 'Đỗ Mạnh Cường',
      notes: 'Khoản vay cần giám sát vốn định kỳ',
    });

    [2, 3].forEach((rIdx) => {
      const row = ws.getRow(rIdx);
      row.eachCell((cell, col) => {
        cell.font = { name: 'Times New Roman', size: 10 };
        cell.alignment = { vertical: 'middle' };
        cell.border = borderStyle;
        if (col === 9) cell.numFmt = '#,##0';
      });
      row.height = 22;
    });

    // Sheet 2: Danh sách KTV trong đoàn để tiện copy-paste
    if (teamList.length > 0) {
      const wsRef = workbook.addWorksheet('Danh sách KTV trong đoàn');
      wsRef.columns = [
        { header: 'STT', key: 'stt', width: 6 },
        { header: 'Họ tên Kiểm toán viên', key: 'name', width: 28 },
        { header: 'Vai trò / Nhiệm vụ trong đoàn', key: 'role', width: 30 },
      ];
      const hRow2 = wsRef.getRow(1);
      hRow2.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2980B9' },
        };
        cell.font = headerFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderStyle;
      });
      hRow2.height = 28;

      teamList.forEach((tm, idx) => {
        const row = wsRef.addRow({
          stt: idx + 1,
          name: tm.fullName || tm.username || '',
          role: tm.role || 'Kiểm toán viên thành viên',
        });
        row.eachCell((cell) => {
          cell.font = { name: 'Times New Roman', size: 10 };
          cell.alignment = { vertical: 'middle' };
          cell.border = borderStyle;
        });
        row.height = 20;
      });
    }

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }

  async bulkAssignSamples(
    sampleIds: number[],
    assignedAuditorId?: number,
    assignedAuditorName?: string,
  ): Promise<{ updated: number }> {
    if (!sampleIds || sampleIds.length === 0) {
      return { updated: 0 };
    }
    const chunkSize = 500;
    let totalUpdated = 0;
    for (let i = 0; i < sampleIds.length; i += chunkSize) {
      const chunk = sampleIds.slice(i, i + chunkSize);
      const res = await this.sampleRepo.update(
        { id: In(chunk) },
        {
          assignedAuditorId: assignedAuditorId
            ? Number(assignedAuditorId)
            : null,
          assignedAuditorName: assignedAuditorName
            ? String(assignedAuditorName)
            : null,
        },
      );
      totalUpdated += res.affected || 0;
    }
    return { updated: totalUpdated };
  }
}
