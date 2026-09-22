import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { WorkingPaper } from './entities/working-paper.entity';
import {
  AuditSampleBatch,
  SampleType,
  SamplingMethod,
} from '../audit-findings/entities/audit-sample-batch.entity';
import {
  AuditSample,
  TestResult,
} from '../audit-findings/entities/audit-sample.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { AuditFindingPersonnel } from '../audit-findings/entities/audit-finding-personnel.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import * as ExcelJS from 'exceljs';
import { getExcelCellString } from '../common/utils/excel.util';

@Injectable()
export class WorkingPapersDataExchangeService {
  private readonly logger = new Logger(WorkingPapersDataExchangeService.name);

  constructor(
    @InjectRepository(WorkingPaper)
    private readonly wpRepo: Repository<WorkingPaper>,
    @InjectRepository(AuditSampleBatch)
    private readonly batchRepo: Repository<AuditSampleBatch>,
    @InjectRepository(AuditSample)
    private readonly sampleRepo: Repository<AuditSample>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(AuditFindingPersonnel)
    private readonly personnelRepo: Repository<AuditFindingPersonnel>,
    @InjectRepository(Recommendation)
    private readonly recRepo: Repository<Recommendation>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Helper: Tìm hoặc tạo Batch mẫu cho Working Paper
   */
  private async getOrCreateBatch(
    wp: WorkingPaper,
    batchName: string,
    sampleType: SampleType = SampleType.DETAIL,
  ): Promise<AuditSampleBatch> {
    let batch = await this.batchRepo.findOne({
      where: { workingPaperId: wp.id },
      order: { id: 'ASC' },
    });
    if (!batch) {
      batch = this.batchRepo.create({
        workingPaperId: wp.id,
        engagementId: wp.engagementId,
        batchName: batchName || `Mẫu kiểm toán - ${wp.title}`,
        sampleType,
        samplingMethod: SamplingMethod.JUDGMENTAL,
        sampleSize: 0,
        populationSize: 0,
      });
      batch = await this.batchRepo.save(batch);
    }
    return batch;
  }

  /**
   * Tính toán Rủi ro còn lại (Residual Risk) dựa trên Inherent Risk và Control Quality theo ma trận LPBank
   */
  public calculateResidualRisk(inherent: string, quality: string): string {
    const inh = (inherent || '').toLowerCase();
    const qua = (quality || '').toLowerCase();

    if (
      inh.includes('cao') ||
      inh.includes('critical') ||
      inh.includes('high')
    ) {
      if (qua.includes('rất tốt') || qua.includes('tốt')) return 'Trung bình';
      return 'Cao';
    }
    if (inh.includes('trung bình') || inh.includes('medium')) {
      if (qua.includes('rất tốt') || qua.includes('tốt')) return 'Thấp';
      if (qua.includes('yếu') || qua.includes('kém')) return 'Cao';
      return 'Trung bình';
    }
    if (inh.includes('thấp') || inh.includes('low')) {
      if (qua.includes('yếu') || qua.includes('kém')) return 'Trung bình';
      return 'Thấp';
    }
    return 'Trung bình';
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. IMPORT CREDIT WORKING PAPER (40 CỘT TÍN DỤNG)
  // ═══════════════════════════════════════════════════════════════
  async importCreditWorkingPaper(
    wpId: number,
    fileInput: string | Buffer,
    user?: any,
  ) {
    const wp = await this.wpRepo.findOne({
      where: { id: wpId },
      relations: ['engagement'],
    });
    if (!wp)
      throw new BadRequestException(`Không tìm thấy Working Paper #${wpId}`);

    const workbook = new ExcelJS.Workbook();
    if (Buffer.isBuffer(fileInput)) {
      await workbook.xlsx.load(fileInput as any);
    } else {
      await workbook.xlsx.readFile(fileInput);
    }

    // Tìm sheet WP - TD (hoặc sheet chứa chữ 'WP')
    const ws =
      workbook.getWorksheet('WP - TD') ||
      workbook.getWorksheet('WP-TD') ||
      workbook.worksheets.find(
        (s) =>
          s.name.toUpperCase().includes('TD') ||
          s.name.toUpperCase().includes('CREDIT'),
      ) ||
      workbook.worksheets[0];

    if (!ws)
      throw new BadRequestException(
        'File Excel không có sheet dữ liệu phù hợp (WP - TD).',
      );

    const batch = await this.getOrCreateBatch(
      wp,
      `Mẫu Tín dụng (40 Cột) - ${wp.title}`,
      SampleType.DETAIL,
    );

    // Xóa các mẫu cũ trong batch nếu đang ghi đè
    await this.sampleRepo.delete({ batchId: batch.id });

    const samplesToInsert: AuditSample[] = [];
    const findingsCreated: AuditFinding[] = [];

    let seq = 1;
    ws.eachRow((row, rowNumber) => {
      // Dòng 1 là Tiêu đề chính, Dòng 2 là Sub-header / Gợi ý, Dữ liệu từ Dòng 3
      if (rowNumber < 3) return;

      const getVal = (colIdx: number): string => {
        return getExcelCellString(row.getCell(colIdx).value);
      };

      const branchName = getVal(2);
      const cif = getVal(3);
      const customerName = getVal(4);
      const loanAmountRaw = getVal(5).replace(/,/g, '');
      const loanAmount = parseFloat(loanAmountRaw) || 0;
      const debtGroup = getVal(6);
      const auditor = getVal(7);
      const loanPurpose = getVal(8);
      const customerType = getVal(9); // KHDN / KHCN

      // Nếu không có tên KH hoặc CIF hoặc Mã CN thì bỏ qua dòng rỗng
      if (!cif && !customerName && !branchName) return;

      const preExplanationNote = getVal(10);
      const fieldInspectionInfo = getVal(11);
      const auditeeOfficer = getVal(12);
      const interviewAuditeeOfficer = getVal(13);
      const fieldInspection =
        getVal(14).toUpperCase().includes('X') ||
        getVal(14) === '1' ||
        getVal(14).toLowerCase().includes('true');
      const fieldInspectionResult = getVal(15);
      const auditeeExplanation = getVal(16);
      const auditorResponse = getVal(17);
      const postExplanationNote = getVal(18);

      const riskGroup = getVal(19);
      const riskCategory = getVal(20);
      const detailedRisk = getVal(21);
      const violationCause = getVal(22);
      const violationCauseType = getVal(23);
      const inherentRisk = getVal(24) || 'Trung bình';
      const controlQuality = getVal(25) || 'Trung bình';
      let residualRisk = getVal(26);
      if (!residualRisk) {
        residualRisk = this.calculateResidualRisk(inherentRisk, controlQuality);
      }

      const recommendationText = getVal(27);
      const relatedPersonnelText = getVal(28);
      const violationHistory = getVal(29);
      const responsibleDepartment = getVal(30);
      const deadline = getVal(31);

      const primaryOfficerUnit = getVal(32);
      const relatedOfficer1Unit = getVal(33);
      const relatedOfficer2Unit = getVal(34);
      const relatedOfficer3Unit = getVal(35);
      const primaryOfficerHO = getVal(36);
      const relatedOfficer1HO = getVal(37);
      const relatedOfficer2HO = getVal(38);

      const auditeeOpinion = getVal(39);
      const includeInReportRaw = getVal(40);
      const includeInReport =
        !includeInReportRaw ||
        includeInReportRaw.toUpperCase().includes('Y') ||
        includeInReportRaw.toUpperCase().includes('X') ||
        includeInReportRaw === '1';

      // Tạo đối tượng AuditSample
      const sample = this.sampleRepo.create({
        batchId: batch.id,
        sequenceNo: seq++,
        sampleType: SampleType.DETAIL,
        branchCode: branchName,
        managingBranchName: branchName,
        cifOrAccount: cif,
        customerName: customerName,
        loanAmount: loanAmount,
        debtGroup: debtGroup,
        testedBy: auditor || user?.username || 'KTV',
        loanPurpose: loanPurpose,
        customerType: customerType || 'KHCN',
        operationType: 'TD',
        businessProcess: riskGroup || 'Cấp tín dụng',
        auditeeOfficer: auditeeOfficer,
        interviewAuditeeOfficer: interviewAuditeeOfficer,
        fieldInspection: fieldInspection,
        fieldInspectionInfo: fieldInspectionInfo,
        fieldInspectionResult: fieldInspectionResult,
        preExplanationNote: preExplanationNote,
        auditeeExplanation: auditeeExplanation,
        auditorResponse: auditorResponse,
        postExplanationNote: postExplanationNote,
        riskGroup: riskGroup,
        riskCategory: riskCategory,
        detailedRisk: detailedRisk,
        violationCause: violationCause,
        violationCauseType: violationCauseType,
        inherentRisk: inherentRisk,
        controlQuality: controlQuality,
        residualRisk: residualRisk,
        recommendationText: recommendationText,
        relatedPersonnelText: relatedPersonnelText,
        violationHistory: violationHistory,
        responsibleDepartment: responsibleDepartment,
        deadline: deadline,
        primaryOfficerUnit: primaryOfficerUnit,
        relatedOfficer1Unit: relatedOfficer1Unit,
        relatedOfficer2Unit: relatedOfficer2Unit,
        relatedOfficer3Unit: relatedOfficer3Unit,
        primaryOfficerHO: primaryOfficerHO,
        relatedOfficer1HO: relatedOfficer1HO,
        relatedOfficer2HO: relatedOfficer2HO,
        auditeeOpinion: auditeeOpinion,
        includeInReport: includeInReport,
        testResult:
          detailedRisk || preExplanationNote || postExplanationNote
            ? TestResult.FAIL
            : TestResult.PASS,
      });

      samplesToInsert.push(sample);
    });

    const executeInTransaction = async (manager: EntityManager) => {
      const sampleRepository = manager.getRepository(AuditSample);
      const batchRepository = manager.getRepository(AuditSampleBatch);
      const findingRepository = manager.getRepository(AuditFinding);
      const personnelRepository = manager.getRepository(AuditFindingPersonnel);

      const savedSamples = await sampleRepository.save(samplesToInsert);

      // Cập nhật kích thước mẫu vào batch
      await batchRepository.update(batch.id, {
        sampleSize: savedSamples.length,
      });

      // Tự động tạo Audit Findings cho các mẫu có lỗi/rủi ro chi tiết
      const failedSamples = savedSamples.filter(
        (s) => s.detailedRisk || s.postExplanationNote || s.preExplanationNote,
      );
      for (const fsamp of failedSamples) {
        const findingTitle =
          fsamp.detailedRisk ||
          fsamp.postExplanationNote ||
          `Tồn tại hồ sơ ${fsamp.customerName} (${fsamp.cifOrAccount})`;

        const findingData: any = {
          engagementId: wp.engagementId,
          workstreamId: wp.workstreamId,
          workingPaperId: wp.id,
          findingTitle: findingTitle,
          findingCode: `FD-TD-${wp.id}-${fsamp.sequenceNo}`,
          branchCode: fsamp.branchCode,
          legacyManagingBranchName:
            fsamp.managingBranchName || fsamp.branchCode,
          operationType: 'TD',
          customerType: fsamp.customerType,
          cifOrAccount: fsamp.cifOrAccount,
          customerName: fsamp.customerName,
          productName: fsamp.loanPurpose,
          condition:
            fsamp.postExplanationNote ||
            fsamp.preExplanationNote ||
            fsamp.detailedRisk ||
            '',
          cause:
            fsamp.violationCause ||
            'Chưa tuân thủ đúng quy trình nghiệp vụ cấp tín dụng.',
          consequence: `Tiềm ẩn rủi ro nợ quá hạn/nợ xấu và sai phạm quy định nội bộ đối với khoản vay ${fsamp.loanAmount || 0} tỷ đồng.`,
          recommendation:
            fsamp.recommendationText ||
            'Đơn vị khẩn trương rà soát, khắc phục và bổ sung hồ sơ theo quy định.',
          recommendationTarget: 'ĐVKD',
          riskLevel:
            fsamp.residualRisk === 'Cao'
              ? 'High'
              : fsamp.residualRisk === 'Thấp'
                ? 'Low'
                : 'Medium',
          status: 'Open',
          riskGroupGeneral: fsamp.riskGroup,
          riskGroupDetail: fsamp.riskCategory,
          auditeeResponse: fsamp.auditeeExplanation,
        };
        const finding = findingRepository.create(findingData);
        const savedFinding: any = await findingRepository.save(finding as any);
        findingsCreated.push(savedFinding);

        // Link findingId ngược lại cho sample
        await sampleRepository.update(fsamp.id, { findingId: savedFinding.id });

        // Tạo personnel records nếu có
        if (fsamp.primaryOfficerUnit) {
          await personnelRepository.save(
            personnelRepository.create({
              findingId: savedFinding.id,
              fullName: fsamp.primaryOfficerUnit,
              responsibilityLevel: 'Chính',
              violationRole: 'Cán bộ ĐVKD chịu trách nhiệm chính',
            }),
          );
        }
        if (fsamp.relatedOfficer1Unit) {
          await personnelRepository.save(
            personnelRepository.create({
              findingId: savedFinding.id,
              fullName: fsamp.relatedOfficer1Unit,
              responsibilityLevel: 'Liên quan',
              violationRole: 'Cán bộ ĐVKD liên quan',
            }),
          );
        }
        if (fsamp.primaryOfficerHO) {
          await personnelRepository.save(
            personnelRepository.create({
              findingId: savedFinding.id,
              fullName: fsamp.primaryOfficerHO,
              responsibilityLevel: 'Chính',
              violationRole: 'Cán bộ Hội sở chịu trách nhiệm chính',
            }),
          );
        }
      }

      this.logger.log(
        `Imported ${savedSamples.length} credit samples and created ${findingsCreated.length} findings for WP #${wpId}`,
      );

      return {
        success: true,
        totalSamples: savedSamples.length,
        findingsCreated: findingsCreated.length,
        batchId: batch.id,
      };
    };

    if (this.dataSource && typeof this.dataSource.transaction === 'function') {
      return this.dataSource.transaction(executeInTransaction);
    }
    const fallbackManager = this.dataSource
      ? this.dataSource.manager
      : this.sampleRepo.manager;
    return executeInTransaction(fallbackManager);
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. EXPORT CREDIT WORKING PAPER (40 CỘT CHUẨN THỰC TẾ)
  // ═══════════════════════════════════════════════════════════════
  async exportCreditWorkingPaper(wpId: number): Promise<Buffer> {
    const wp = await this.wpRepo.findOne({
      where: { id: wpId },
      relations: ['engagement'],
    });
    if (!wp)
      throw new BadRequestException(`Working Paper #${wpId} không tồn tại`);

    const samples = await this.sampleRepo
      .createQueryBuilder('sample')
      .innerJoin('sample.batch', 'batch')
      .where('batch.workingPaperId = :wpId', { wpId })
      .orderBy('sample.sequenceNo', 'ASC')
      .getMany();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KTNB AMS';
    workbook.created = new Date();

    // 1. Sheet WP - TD
    const ws = workbook.addWorksheet('WP - TD', {
      views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }],
    });

    const headersRow1 = [
      'TT',
      'Tên CN',
      'Mã KH',
      'Tên KH',
      'Dư nợ (tỷ đồng)',
      'Nhóm nợ',
      'KTV',
      'Mục đích vay vốn',
      'Phân loại KH',
      'Nội dung ghi nhận trước giải trình',
      'Thông tin đi thực địa KH',
      'CVKH quản lý',
      'Phỏng vấn CB QLKH',
      'Kiểm tra thực tế',
      'Kết quả kiểm tra thực tế KH',
      'ĐVKD giải trình',
      'Đoàn kiểm toán trả lời giải trình ĐVKD',
      'Nội dung ghi nhận sau giải trình',
      'Nhóm rủi ro',
      'Danh mục rủi ro',
      'Rủi ro chi tiết',
      'Nguyên nhân vi phạm',
      'Phân loại nguyên nhân vi phạm',
      'Mức độ rủi ro',
      'Chất lượng kiểm soát',
      'Rủi ro còn lại',
      'Kiến nghị',
      'Nhân sự liên quan',
      'Lịch sử/tính chất vi phạm',
      'Trách nhiệm thực hiện (phòng/ban)',
      'Thời hạn thực hiện',
      'Trách nhiệm chính',
      'Trách nhiệm người liên quan 1 (ĐVKD)',
      'Trách nhiệm người liên quan 2 (ĐVKD)',
      'Trách nhiệm người liên quan 3 (ĐVKD)',
      'Trách nhiệm người chính (Hội sở)',
      'Trách nhiệm người liên quan 1 (Hội sở)',
      'Trách nhiệm người liên quan 2 (Hội sở)',
      'Ý kiến của Đơn vị',
      'Lên báo cáo phát hành',
    ];

    const headersRow2 = [
      '',
      'Ghi tên CN',
      'Ghi mã KH',
      'Ghi tên KH',
      'Dư nợ/số dư BL',
      'Ghi nhóm nợ tổng CL001',
      'Phân công',
      'Ghi các mục đích vay của KH',
      'KHDN/ KHCN',
      'Ghi nhận chi tiết (phải có đầu mục theo nhận diện rui ro)',
      'Nhập các thông tin cần làm rõ khi đi thực địa',
      'Nhập tên CVKH quản lý khoản vay',
      'Kết quả phỏng vấn QLKH',
      'Tích "X" các KH kiểm tra thực tế',
      'Kết quả kiểm tra thực tế KH',
      'Nội dung giải trình của ĐVKD và hồ sơ bổ sung',
      'Đoàn kiểm toán phản hồi giải trình của ĐVKD',
      'Nội dung còn lại sau khi ĐVKD giải trình/bổ sung hồ sơ',
      'Chọn theo LIST',
      'Chọn theo LIST',
      'Chọn theo LIST',
      'Nhập nguyên nhân gốc rễ',
      'Chọn theo LIST',
      'Tự động',
      'Tự đánh giá theo LIST',
      '=Mức độ rủi ro x Chất lượng kiểm soát',
      'Ghi kiến nghị',
      'Ghi theo từng rui ro/vi phạm',
      'Lần đầu/lặp lại',
      'Ghi đơn vị phụ trách thực hiện kiến nghị',
      'Ghi thời hạn',
      'Nhân sự chịu trách nhiệm chính',
      'Nhân sự chịu trách nhiệm liên quan',
      'Nhân sự chịu trách nhiệm liên quan',
      '',
      'Nhân sự chịu trách nhiệm liên quan',
      'Nhân sự chịu trách nhiệm liên quan',
      '',
      'Ý kiến của đơn vị (đồng ý/không đồng ý)',
      '',
    ];

    const r1 = ws.addRow(headersRow1);
    const r2 = ws.addRow(headersRow2);

    // Styling Header
    r1.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    r1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '002060' },
    };
    r1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    r2.font = { italic: true, color: { argb: '333333' }, size: 9 };
    r2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9E1F2' },
    };
    r2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Fill Data
    samples.forEach((s, idx) => {
      const dataRow = [
        s.sequenceNo || idx + 1,
        s.branchCode || s.managingBranchName || '',
        s.cifOrAccount || '',
        s.customerName || '',
        s.loanAmount || 0,
        s.debtGroup || '',
        s.testedBy || '',
        s.loanPurpose || '',
        s.customerType || 'KHCN',
        s.preExplanationNote || '',
        s.fieldInspectionInfo || '',
        s.auditeeOfficer || '',
        s.interviewAuditeeOfficer || '',
        s.fieldInspection ? 'X' : '',
        s.fieldInspectionResult || '',
        s.auditeeExplanation || '',
        s.auditorResponse || '',
        s.postExplanationNote || '',
        s.riskGroup || '',
        s.riskCategory || '',
        s.detailedRisk || '',
        s.violationCause || '',
        s.violationCauseType || '',
        s.inherentRisk || '',
        s.controlQuality || '',
        s.residualRisk || '',
        s.recommendationText || '',
        s.relatedPersonnelText || '',
        s.violationHistory || '',
        s.responsibleDepartment || '',
        s.deadline || '',
        s.primaryOfficerUnit || '',
        s.relatedOfficer1Unit || '',
        s.relatedOfficer2Unit || '',
        s.relatedOfficer3Unit || '',
        s.primaryOfficerHO || '',
        s.relatedOfficer1HO || '',
        s.relatedOfficer2HO || '',
        s.auditeeOpinion || 'Đồng ý',
        s.includeInReport ? 'X' : '',
      ];
      const row = ws.addRow(dataRow);
      row.alignment = { vertical: 'top', wrapText: true };
    });

    // Auto-fit Column widths
    ws.columns.forEach((col, idx) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = getExcelCellString(cell.value).length;
        if (len > maxLen && len < 45) maxLen = len;
      });
      col.width = maxLen + 2;
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. IMPORT PTD & REMEDIATION (20 CỘT PHI TÍN DỤNG & KHẮC PHỤC)
  // ═══════════════════════════════════════════════════════════════
  async importPtdWorkingPaper(
    wpId: number,
    fileInput: string | Buffer,
    user?: any,
  ) {
    const wp = await this.wpRepo.findOne({
      where: { id: wpId },
      relations: ['engagement'],
    });
    if (!wp)
      throw new BadRequestException(`Không tìm thấy Working Paper #${wpId}`);

    const workbook = new ExcelJS.Workbook();
    if (Buffer.isBuffer(fileInput)) {
      await workbook.xlsx.load(fileInput as any);
    } else {
      await workbook.xlsx.readFile(fileInput);
    }

    const ws =
      workbook.getWorksheet('PTD') ||
      workbook.getWorksheet('Sheet1') ||
      workbook.worksheets[0];

    if (!ws)
      throw new BadRequestException(
        'File Excel không có sheet dữ liệu PTD phù hợp.',
      );

    const batch = await this.getOrCreateBatch(
      wp,
      `Mẫu Phi Tín Dụng & Khắc Phục - ${wp.title}`,
      SampleType.PROCESS_CONTROL,
    );

    await this.sampleRepo.delete({ batchId: batch.id });

    const samplesToInsert: AuditSample[] = [];
    const recommendationsToInsert: Recommendation[] = [];

    let seq = 1;
    ws.eachRow((row, rowNumber) => {
      if (rowNumber < 2) return; // Dòng 1 là Tiêu đề cột

      const getVal = (colIdx: number): string => {
        return getExcelCellString(row.getCell(colIdx).value);
      };

      const managingBranch = getVal(2);
      const subUnit = getVal(3);
      const operationType = getVal(4);
      const errorContent = getVal(5);
      const errorCount = getVal(6);
      const recommendation = getVal(7);
      const responsiblePersonnel = getVal(8);
      const directorAtViolation = getVal(9);
      const riskLevel = getVal(10);
      const completionDate = getVal(11);
      const remediationStatus = getVal(12);
      const feasibility = !getVal(13).toLowerCase().includes('không');
      const unfeasibleReason = getVal(14);
      const auditeeProposal = getVal(15);
      const approver = getVal(16);
      const approvedDate = getVal(17);
      const monitoringCycle = getVal(18);
      const evidenceLink = getVal(19);
      const note = getVal(20);

      if (!errorContent && !operationType) return;

      const sample = this.sampleRepo.create({
        batchId: batch.id,
        sequenceNo: seq++,
        sampleType: SampleType.PROCESS_CONTROL,
        managingBranchName: managingBranch,
        branchCode: subUnit,
        operationType: 'PTD',
        businessProcess: operationType,
        condition: errorContent,
        detailedRisk: errorContent,
        errorCountText: errorCount,
        recommendationText: recommendation,
        relatedPersonnelText: responsiblePersonnel,
        branchDirectorAtViolation: directorAtViolation,
        inherentRisk: riskLevel.includes('3')
          ? 'Cao'
          : riskLevel.includes('1')
            ? 'Thấp'
            : 'Trung bình',
        residualRisk: riskLevel.includes('3')
          ? 'Cao'
          : riskLevel.includes('1')
            ? 'Thấp'
            : 'Trung bình',
        deadline: completionDate,
        remediationFeasibility: feasibility,
        remediationUnfeasibleReason: unfeasibleReason,
        auditeeProposal: auditeeProposal,
        remediationApprover: approver,
        remediationApprovedDate: approvedDate,
        monitoringCycle: monitoringCycle,
        remediationEvidenceLink: evidenceLink,
        testNotes: note,
        testResult: errorContent ? TestResult.FAIL : TestResult.PASS,
      });

      samplesToInsert.push(sample);

      // Tạo Recommendation vào kho theo dõi khắc phục
      if (recommendation || errorContent) {
        const rec = this.recRepo.create({
          finding: `[PTD] ${operationType}: ${errorContent.substring(0, 100)}...`,
          recommendation:
            recommendation ||
            'Đơn vị nghiêm túc chấn chỉnh và khắc phục sai sót.',
          legacyDepartment: subUnit || managingBranch,
          assignedTo: responsiblePersonnel,
          dueDate: completionDate || new Date().toISOString().split('T')[0],
          status:
            remediationStatus.toLowerCase().includes('xong') ||
            remediationStatus.toLowerCase().includes('hoàn thành')
              ? 'Completed'
              : 'InProgress',
          remediationFeasibility: feasibility,
          remediationUnfeasibleReason: unfeasibleReason,
          auditeeProposal: auditeeProposal,
          monitoringCycle: monitoringCycle,
          evidenceLink: evidenceLink,
          auditeeNotes: note,
        });
        recommendationsToInsert.push(rec);
      }
    });

    const executePtdInTransaction = async (manager: EntityManager) => {
      const sampleRepository = manager.getRepository(AuditSample);
      const recRepository = manager.getRepository(Recommendation);
      const batchRepository = manager.getRepository(AuditSampleBatch);

      const savedSamples = await sampleRepository.save(samplesToInsert);
      if (recommendationsToInsert.length > 0) {
        await recRepository.save(recommendationsToInsert);
      }

      await batchRepository.update(batch.id, {
        sampleSize: savedSamples.length,
      });

      return {
        success: true,
        totalSamples: savedSamples.length,
        recommendationsCreated: recommendationsToInsert.length,
      };
    };

    if (this.dataSource && typeof this.dataSource.transaction === 'function') {
      return this.dataSource.transaction(executePtdInTransaction);
    }
    const fallbackManager = this.dataSource
      ? this.dataSource.manager
      : this.sampleRepo.manager;
    return executePtdInTransaction(fallbackManager);
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. EXPORT PTD & REMEDIATION (20 CỘT CHUẨN THỰC TẾ)
  // ═══════════════════════════════════════════════════════════════
  async exportPtdWorkingPaper(wpId: number): Promise<Buffer> {
    const samples = await this.sampleRepo
      .createQueryBuilder('sample')
      .innerJoin('sample.batch', 'batch')
      .where('batch.workingPaperId = :wpId', { wpId })
      .orderBy('sample.sequenceNo', 'ASC')
      .getMany();

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('PTD', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }],
    });

    const headers = [
      'STT',
      'CN Quản lý',
      'Đơn vị',
      'Nghiệp vụ',
      'Nội dung sai sót chi tiết',
      'Số lượng sai sót',
      'Kiến nghị/Khuyến nghị của KTV dành cho ĐVKD',
      'Trách nhiệm cá nhân/tập thể',
      'Họ tên Giám đốc tại thời điểm sai phạm',
      'Mức độ rủi ro',
      'Ngày hoàn thành khắc phục',
      'Trình trạng khắc phục',
      'Đánh giá khả năng tiếp tục khắc phục (Có/Không)',
      'Nguyên nhân (Nếu không khắc phục được)',
      'Đề xuất của Đơn vị được kiểm toán',
      'Cán bộ phê duyệt khắc phục',
      'Ngày phê duyệt',
      'Kỳ theo dõi (theo tháng)',
      'Đường link scan chứng từ khắc phục',
      'Ghi chú',
    ];

    const hRow = ws.addRow(headers);
    hRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    hRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F4E78' },
    };
    hRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };

    samples.forEach((s, idx) => {
      const rowData = [
        s.sequenceNo || idx + 1,
        s.managingBranchName || '',
        s.branchCode || '',
        s.businessProcess || '',
        s.condition || s.detailedRisk || '',
        s.errorCountText || '',
        s.recommendationText || '',
        s.relatedPersonnelText || '',
        s.branchDirectorAtViolation || '',
        s.residualRisk || 'Trung bình',
        s.deadline || '',
        s.testResult === TestResult.PASS ? 'Đã hoàn thành' : 'Đang xử lý',
        s.remediationFeasibility ? 'Có' : 'Không',
        s.remediationUnfeasibleReason || '',
        s.auditeeProposal || '',
        s.remediationApprover || '',
        s.remediationApprovedDate || '',
        s.monitoringCycle || '',
        s.remediationEvidenceLink || '',
        s.testNotes || '',
      ];
      ws.addRow(rowData);
    });

    ws.columns.forEach((col) => {
      col.width = 22;
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. GENERATE CREDIT TEMPLATE EXCEL (MẪU 40 CỘT CHUẨN THỰC TẾ)
  // ═══════════════════════════════════════════════════════════════
  async generateCreditTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KTNB AMS';
    workbook.created = new Date();

    const ws = workbook.addWorksheet('WP - TD', {
      views: [{ state: 'frozen', xSplit: 4, ySplit: 2 }],
    });

    const headersRow1 = [
      'TT',
      'Tên CN',
      'Mã KH',
      'Tên KH',
      'Dư nợ (tỷ đồng)',
      'Nhóm nợ',
      'KTV',
      'Mục đích vay vốn',
      'Phân loại KH',
      'Nội dung ghi nhận trước giải trình',
      'Thông tin đi thực địa KH',
      'CVKH quản lý',
      'Phỏng vấn CB QLKH',
      'Kiểm tra thực tế',
      'Kết quả kiểm tra thực tế KH',
      'ĐVKD giải trình',
      'Đoàn kiểm toán trả lời giải trình ĐVKD',
      'Nội dung ghi nhận sau giải trình',
      'Nhóm rủi ro',
      'Danh mục rủi ro',
      'Rủi ro chi tiết',
      'Nguyên nhân vi phạm',
      'Phân loại nguyên nhân vi phạm',
      'Mức độ rủi ro',
      'Chất lượng kiểm soát',
      'Rủi ro còn lại',
      'Kiến nghị',
      'Nhân sự liên quan',
      'Lịch sử/tính chất vi phạm',
      'Trách nhiệm thực hiện (phòng/ban)',
      'Thời hạn thực hiện',
      'Trách nhiệm chính',
      'Trách nhiệm người liên quan 1 (ĐVKD)',
      'Trách nhiệm người liên quan 2 (ĐVKD)',
      'Trách nhiệm người liên quan 3 (ĐVKD)',
      'Trách nhiệm người chính (Hội sở)',
      'Trách nhiệm người liên quan 1 (Hội sở)',
      'Trách nhiệm người liên quan 2 (Hội sở)',
      'Ý kiến của Đơn vị',
      'Lên báo cáo phát hành',
    ];

    const headersRow2 = [
      '',
      'Ghi tên CN',
      'Ghi mã KH',
      'Ghi tên KH',
      'Dư nợ/số dư BL',
      'Ghi nhóm nợ tổng CL001',
      'Phân công',
      'Ghi các mục đích vay của KH',
      'KHDN/ KHCN',
      'Ghi nhận chi tiết (phải có đầu mục theo nhận diện rui ro)',
      'Nhập các thông tin cần làm rõ khi đi thực địa',
      'Nhập tên CVKH quản lý khoản vay',
      'Kết quả phỏng vấn QLKH',
      'Đánh dấu X nếu đi thực tế',
      'Ghi nhận kết quả kiểm tra thực tế tại ĐVKD/KH',
      'Ghi nhận giải trình của ĐVKD',
      'Kết luận của Đoàn sau khi đối chiếu giải trình',
      'Ghi nhận sau giải trình',
      'Chọn trong danh mục nhóm rủi ro (01-09)',
      'Danh mục rủi ro chi tiết',
      'Chi tiết sai phạm/rủi ro',
      'Nguyên nhân dẫn đến sai sót',
      'Phân loại nguyên nhân (1-7)',
      'Cao/Trung bình/Thấp',
      'Rất tốt/Tốt/Trung bình/Yếu/Rất yếu',
      'Cao/Trung bình/Thấp (Tính tự động)',
      'Kiến nghị khắc phục chi tiết',
      'Họ tên & Chức danh nhân sự liên quan',
      'Lặp lại/Lần đầu',
      'Phòng ban phụ trách khắc phục',
      'Ngày hoàn thành (DD/MM/YYYY)',
      'Nhân sự chịu trách nhiệm chính',
      'Nhân sự chịu trách nhiệm liên quan',
      'Nhân sự chịu trách nhiệm liên quan',
      'Nhân sự chịu trách nhiệm liên quan',
      'Nhân sự chịu trách nhiệm chính (Hội sở)',
      'Nhân sự chịu trách nhiệm liên quan',
      'Nhân sự chịu trách nhiệm liên quan',
      'Đồng ý / Không đồng ý',
      'Đánh dấu X nếu đưa lên Báo cáo',
    ];

    const r1 = ws.addRow(headersRow1);
    const r2 = ws.addRow(headersRow2);

    r1.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    r1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '002060' },
    };
    r1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    r2.font = { italic: true, color: { argb: '333333' }, size: 9 };
    r2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9E1F2' },
    };
    r2.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

    // Thêm 2 dòng dữ liệu mẫu thực tế
    ws.addRow([
      1,
      'Chi nhánh Hà Nội',
      '0123456789',
      'Công ty TNHH Thương mại & Xây dựng ABC',
      15.5,
      'Nhóm 1',
      'Phạm Đức Thành',
      'Bổ sung vốn lưu động kinh doanh sắt thép',
      'KHDN',
      'Hồ sơ thẩm định thiếu chứng thư định giá lại TSBĐ theo định kỳ 12 tháng theo quy định.',
      'Đã đi kiểm tra kho hàng thực tế tại KCN Quang Minh.',
      'Nguyễn Văn A (CBTD)',
      'CBTD xác nhận chưa đôn đốc khách hàng gửi báo cáo tài chính quý gần nhất.',
      'X',
      'Hàng hóa tồn kho thực tế giảm 30% so với báo cáo quý IV.',
      'ĐVKD giải trình do khách hàng vừa xuất hàng đi dự án chưa kịp quyết toán.',
      'Đoàn KT ghi nhận giải trình nhưng yêu cầu bổ sung chứng từ luân chuyển hàng.',
      'Thiếu chứng thư thẩm định lại giá trị TSBĐ định kỳ & chưa cập nhật dòng tiền.',
      '04. Công tác nhận và quản lý TSBĐ',
      'Quản lý và định giá lại TSBĐ',
      'Không thực hiện định giá lại TSBĐ theo quy định định kỳ hàng năm',
      'Cán bộ tín dụng quá tải công việc, bỏ sót lịch định giá lại TSBĐ',
      '1. Cá nhân - Chủ quan',
      'Cao',
      'Trung bình',
      'Trung bình',
      'Yêu cầu Chi nhánh thuê đơn vị thẩm định độc lập định giá lại TSBĐ trong tháng 04/2026',
      'Nguyễn Văn A (CBTD), Trần Thị B (Trưởng phòng KH)',
      'Lần đầu',
      'Phòng Khách hàng Doanh nghiệp',
      '30/04/2026',
      'Nguyễn Văn A',
      'Trần Thị B',
      '',
      '',
      '',
      '',
      '',
      'Đồng ý',
      'X',
    ]);

    ws.addRow([
      2,
      'Chi nhánh Hà Nội',
      '0987654321',
      'Nguyễn Văn C',
      2.0,
      'Nhóm 1',
      'Nguyễn Thị Lương',
      'Vay mua nhà ở',
      'KHCN',
      'Giải ngân trước khi hoàn tất đăng ký giao dịch bảo đảm tài sản hình thành từ vốn vay.',
      'Kiểm tra hiện trạng căn hộ chung cư đã nhận bàn giao.',
      'Lê Văn D (CBTD)',
      'CBTD đã gửi hồ sơ sang Văn phòng ĐKĐĐ nhưng chưa nhận lại sổ.',
      'X',
      'Khách hàng đã nhận nhà và vào ở thực tế.',
      'ĐVKD giải trình do Văn phòng ĐKĐĐ quá tải thủ tục.',
      'Yêu cầu Chi nhánh theo dõi sát sao và hoàn thiện đăng ký giao dịch bảo đảm.',
      'Chậm hoàn thiện hồ sơ đăng ký giao dịch bảo đảm sau giải ngân.',
      '06. Công tác giải ngân, phát hành bảo lãnh, thu nợ',
      'Điều kiện tiên quyết giải ngân',
      'Chưa hoàn tất biện pháp bảo đảm trước khi giải ngân',
      'Áp lực chỉ tiêu giải ngân cuối tháng',
      '1. Cá nhân - Chủ quan',
      'Trung bình',
      'Tốt',
      'Thấp',
      'Khẩn trương lấy kết quả đăng ký giao dịch bảo đảm lưu hồ sơ tín dụng',
      'Lê Văn D (CBTD)',
      'Lần đầu',
      'Phòng Khách hàng Cá nhân',
      '15/04/2026',
      'Lê Văn D',
      '',
      '',
      '',
      '',
      '',
      '',
      'Đồng ý',
      'X',
    ]);

    ws.columns.forEach((col) => {
      col.width = 20;
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. GENERATE PTD TEMPLATE EXCEL (MẪU 20 CỘT CHUẨN THỰC TẾ)
  // ═══════════════════════════════════════════════════════════════
  async generatePtdTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('PTD', {
      views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }],
    });

    const headers = [
      'STT',
      'CN Quản lý',
      'Đơn vị',
      'Nghiệp vụ',
      'Nội dung sai sót chi tiết',
      'Số lượng sai sót',
      'Kiến nghị/Khuyến nghị của KTV dành cho ĐVKD',
      'Trách nhiệm cá nhân/tập thể',
      'Họ tên Giám đốc tại thời điểm sai phạm',
      'Mức độ rủi ro',
      'Ngày hoàn thành khắc phục',
      'Trình trạng khắc phục',
      'Đánh giá khả năng tiếp tục khắc phục (Có/Không)',
      'Nguyên nhân (Nếu không khắc phục được)',
      'Đề xuất của Đơn vị được kiểm toán',
      'Cán bộ phê duyệt khắc phục',
      'Ngày phê duyệt',
      'Kỳ theo dõi (theo tháng)',
      'Đường link scan chứng từ khắc phục',
      'Ghi chú',
    ];

    const hRow = ws.addRow(headers);
    hRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 10 };
    hRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '1F4E78' },
    };
    hRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };

    ws.addRow([
      1,
      'Chi nhánh Hà Nội',
      'CN_HN',
      'Dịch vụ Khách hàng & Quỹ',
      'Bàn giao chìa khóa kho quỹ và mã số két sắt không lập biên bản phân định trách nhiệm',
      '2 vụ việc',
      'Kiểm điểm trách nhiệm thủ quỹ và kế toán trưởng, tái đào tạo quy trình quản lý kho quỹ',
      'Lê Thị C (Thủ quỹ), Vũ Văn D (Kế toán trưởng)',
      'Hoàng Minh E',
      'Cao',
      '15/05/2026',
      'Đang xử lý',
      'Có',
      '',
      'Đã ban hành quy chế phân quyền và bàn giao mới tại quỹ',
      'Phạm Đức Thành (Trưởng đoàn KT)',
      '20/03/2026',
      'Tháng 03/2026',
      'https://drive.lpbank.vn/evidence/ptd-01.pdf',
      'Theo dõi tại kỳ kiểm toán tiếp theo',
    ]);

    ws.addRow([
      2,
      'Chi nhánh Hà Nội',
      'CN_HN',
      'Kế toán & Thanh toán quốc tế',
      'Hồ sơ chuyển tiền quốc tế thiếu giấy phép nhập khẩu hàng hóa đối với mặt hàng quản lý chuyên ngành',
      '1 bộ hồ sơ',
      'Yêu cầu khách hàng bổ sung giấy phép nhập khẩu trước ngày 30/04/2026',
      'Phạm Thị H (Chuyên viên TTQT)',
      'Hoàng Minh E',
      'Trung bình',
      '30/04/2026',
      'Đã hoàn thành',
      'Có',
      '',
      'Đã thu thập đầy đủ giấy phép bổ sung',
      'Phạm Đức Thành (Trưởng đoàn KT)',
      '25/03/2026',
      'Tháng 03/2026',
      'https://drive.lpbank.vn/evidence/ptd-02.pdf',
      'Đã đóng kiến nghị',
    ]);

    ws.columns.forEach((col) => {
      col.width = 22;
    });

    return (await workbook.xlsx.writeBuffer()) as unknown as Buffer;
  }
}
