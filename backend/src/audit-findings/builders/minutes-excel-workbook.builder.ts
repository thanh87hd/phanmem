import * as ExcelJS from 'exceljs';
import { MinutesExportContext } from './minutes-export.types';

export class MinutesExcelWorkbookBuilder {
  static async build(ctx: MinutesExportContext): Promise<Buffer> {
    const { minute, engagement, mode } = ctx;
    const { findings, samples } = ctx;

    const ptdSamples = samples.filter(
      (s) =>
        s.operationType === 'PTD' ||
        s.businessProcess?.includes('quỹ') ||
        s.businessProcess?.includes('PGDBĐ') ||
        s.damagedAcqtSeries ||
        s.userCrossEnv ||
        s.reconciliationCashDiff,
    );
    const creditSamples = samples.filter(
      (s) => s.operationType === 'TD' || (s.loanAmount && s.loanAmount > 0),
    );

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LPBank - Hệ thống Kiểm toán nội bộ (AMS)';
    workbook.created = new Date();

    const headerFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF003366' },
    };
    const headerFont: Partial<ExcelJS.Font> = {
      name: 'Times New Roman',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      right: { style: 'thin', color: { argb: 'FFD3D3D3' } },
    };

    // ══════════════════════════════════════════════════════════════════════
    // SHEET 1: TỔNG HỢP PHÁT HIỆN (MB04 - PHỤ LỤC 5A)
    // ══════════════════════════════════════════════════════════════════════
    const wsFindings = workbook.addWorksheet('Chi tiết sai phạm');
    wsFindings.views = [{ state: 'frozen', ySplit: 5 }];

    // Banner
    wsFindings.mergeCells('A1:U1');
    const titleCell = wsFindings.getCell('A1');
    titleCell.value = 'TỔNG HỢP PHÁT HIỆN KIỂM TOÁN (MB04 - PHỤ LỤC 5A)';
    titleCell.font = {
      name: 'Times New Roman',
      size: 14,
      bold: true,
      color: { argb: 'FF003366' },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    wsFindings.getRow(1).height = 28;

    wsFindings.mergeCells('A2:U2');
    const subCell = wsFindings.getCell('A2');
    subCell.value = `Đơn vị: ${minute.auditedUnitName || engagement?.branchName || 'Chi nhánh'} | Đoàn kiểm toán: ${minute.leadAuditorName || engagement?.legacyLeadAuditor || 'Trưởng đoàn'} | Ngày lập: ${minute.issueDate || new Date().toISOString().split('T')[0]}`;
    subCell.font = { name: 'Times New Roman', size: 10, italic: true };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // Header columns - Full LPBank Standard with 3D Defect Codes & Penalties
    const findingHeaders = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Mã phát hiện', key: 'findingCode', width: 15 },
      { header: 'Nghiệp vụ', key: 'operationType', width: 14 },
      { header: 'Mã lỗi nội bộ', key: 'internalDefectCode', width: 18 },
      { header: 'Mã vi phạm NĐ 340', key: 'nd340DefectCode', width: 18 },
      { header: 'Mã vi phạm Nhân sự', key: 'nhanSuDefectCode', width: 18 },
      { header: 'Số tiền phạt (VND)', key: 'actualFineAmount', width: 18 },
      {
        header: 'Thông tin chọn mẫu / CIF / GD',
        key: 'cifOrAccount',
        width: 26,
      },
      { header: 'Tên KH / Đối tượng', key: 'customerName', width: 24 },
      {
        header: 'Nội dung phát hiện (Hiện trạng)',
        key: 'condition',
        width: 45,
      },
      {
        header: 'Căn cứ pháp lý / Quy chế (Criteria)',
        key: 'criteria',
        width: 35,
      },
      { header: 'Nguyên nhân vi phạm', key: 'cause', width: 30 },
      { header: 'Hậu quả rủi ro', key: 'consequence', width: 30 },
      { header: 'Mức độ rủi ro', key: 'riskLevel', width: 16 },
      { header: 'CB Đề xuất (Maker)', key: 'proposerOfficer', width: 20 },
      { header: 'CB Thẩm định (Checker)', key: 'appraiserOfficer', width: 20 },
      { header: 'CB Phê duyệt (Approver)', key: 'businessLeader', width: 20 },
      {
        header: 'Cán bộ chịu trách nhiệm chính',
        key: 'primaryOfficer',
        width: 28,
      },
      { header: 'Lịch sử vi phạm', key: 'violationHistory', width: 16 },
      { header: 'Kiến nghị xử lý của ĐKT', key: 'recommendation', width: 40 },
      { header: 'Ý kiến giải trình ĐVKD', key: 'auditeeResponse', width: 35 },
    ];

    wsFindings.getRow(4).values = findingHeaders.map((h) => h.header);
    wsFindings.getRow(4).height = 28;
    wsFindings.columns = findingHeaders.map((h) => ({
      key: h.key,
      width: h.width,
    }));

    const r4 = wsFindings.getRow(4);
    r4.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = borderStyle;
    });

    findings.forEach((f, idx) => {
      const primaryP = f.personnel
        ? f.personnel
            .filter((p: any) => p.responsibilityType === 'Primary')
            .map(
              (p: any) =>
                `${p.officerName || p.legacyOfficerName} (${p.officerRole || p.role})`,
            )
            .join('; ')
        : '';
      const internalCode =
        f.legacyInternalDefectCode || f.internalDefectCodeEntity?.code || '';
      const nd340Code =
        f.legacyNd340DefectCode || f.nd340DefectCodeEntity?.code || '';
      const nhanSuCode =
        f.legacyNhanSuDefectCode || f.nhanSuDefectCodeEntity?.code || '';
      const proposer =
        f.legacyProposerOfficer || f.proposerUser?.fullName || '';
      const appraiser =
        f.legacyAppraiserOfficer || f.appraiserUser?.fullName || '';
      const leader =
        f.legacyBusinessLeader || f.businessLeaderUser?.fullName || '';

      const row = wsFindings.addRow({
        stt: idx + 1,
        findingCode: f.findingCode || `FD-${f.id}`,
        operationType: f.operationType || f.findingCategory || 'Chung',
        internalDefectCode: internalCode,
        nd340DefectCode: nd340Code,
        nhanSuDefectCode: nhanSuCode,
        actualFineAmount: f.actualFineAmount || 0,
        cifOrAccount: f.cifOrAccount || '',
        customerName: f.customerName || '',
        condition: f.condition || f.findingTitle || '',
        criteria: f.criteria || '',
        cause: f.cause || '',
        consequence: f.consequence || '',
        riskLevel:
          f.riskLevel === 'High' || f.riskLevel === 'Cao'
            ? 'Cao'
            : f.riskLevel === 'Medium' || f.riskLevel === 'Trung bình'
              ? 'Trung bình'
              : 'Thấp',
        proposerOfficer: proposer,
        appraiserOfficer: appraiser,
        businessLeader: leader,
        primaryOfficer: primaryP || proposer || '',
        violationHistory: f.violationHistory || 'Lần đầu',
        recommendation: f.recommendation || '',
        auditeeResponse: f.auditeeResponse || '',
      });
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 10 };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = borderStyle;
        if (colNumber === 7) {
          cell.numFmt = '#,##0';
        }
      });
      row.height = 36;
    });
    wsFindings.autoFilter = 'A4:U4';

    // ══════════════════════════════════════════════════════════════════════
    // SHEET 2: BẢNG KÊ CHI TIẾT PTD & QUỸ (HỖ TRỢ ĐỐI SOÁT > 1.000 DÒNG)
    // ══════════════════════════════════════════════════════════════════════
    const wsPtd = workbook.addWorksheet('Bang_Ke_Chi_Tiet_PTD');
    wsPtd.views = [{ state: 'frozen', ySplit: 5 }];

    wsPtd.mergeCells('A1:R1');
    const ptdTitle = wsPtd.getCell('A1');
    ptdTitle.value =
      'BẢNG KÊ CHI TIẾT MẪU KIỂM TRA PHI TÍN DỤNG, KHO QUỸ & PGDBĐ';
    ptdTitle.font = {
      name: 'Times New Roman',
      size: 14,
      bold: true,
      color: { argb: 'FF003366' },
    };
    ptdTitle.alignment = { horizontal: 'center', vertical: 'middle' };
    wsPtd.getRow(1).height = 28;

    wsPtd.mergeCells('A2:R2');
    const ptdSub = wsPtd.getCell('A2');
    ptdSub.value = `Dữ liệu đối soát chi tiết (Tổng số: ${ptdSamples.length} mẫu kiểm tra) | File hỗ trợ ĐVKD chạy hàm Pivot/VLOOKUP`;
    ptdSub.font = { name: 'Times New Roman', size: 10, italic: true };
    ptdSub.alignment = { horizontal: 'center', vertical: 'middle' };

    const ptdHeaders = [
      { header: 'STT', key: 'stt', width: 8 },
      { header: 'Quy trình / Nghiệp vụ', key: 'businessProcess', width: 22 },
      { header: 'Mã ĐVKD / Bưu cục', key: 'postalAgencyCode', width: 18 },
      { header: 'Số CIF / Tài khoản / Số GD', key: 'cifOrAccount', width: 26 },
      { header: 'Tên Khách hàng / Đối tượng', key: 'customerName', width: 25 },
      { header: 'Số tiền GD / Số dư (VND)', key: 'loanAmount', width: 20 },
      { header: 'Ngày giao dịch', key: 'disbursementDate', width: 14 },
      { header: 'Giờ duyệt Uni', key: 'uniTime', width: 14 },
      { header: 'Giờ duyệt T24', key: 't24Time', width: 14 },
      { header: 'Lệch duyệt (phút)', key: 'uniVsT24DiffMinutes', width: 16 },
      { header: 'User lập (Maker)', key: 'proposerOfficer', width: 18 },
      { header: 'User duyệt (Checker)', key: 'appraiserOfficer', width: 18 },
      {
        header: 'Lệch tiền mặt nộp LPBank',
        key: 'reconciliationCashDiff',
        width: 22,
      },
      { header: 'Chậm in/duyệt BC (ngày)', key: 'reportDelayDays', width: 20 },
      { header: 'Số seri ACQT báo hỏng', key: 'damagedAcqtSeries', width: 20 },
      { header: 'User phân quyền chéo', key: 'userCrossEnv', width: 22 },
      { header: 'Ghi nhận sai phạm của KTV', key: 'condition', width: 38 },
      { header: 'Kết quả đối soát ĐVKD', key: 'auditeeProposal', width: 30 },
    ];

    wsPtd.getRow(4).values = ptdHeaders.map((h) => h.header);
    wsPtd.getRow(4).height = 26;
    wsPtd.columns = ptdHeaders.map((h) => ({ key: h.key, width: h.width }));

    const rPtd4 = wsPtd.getRow(4);
    rPtd4.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      cell.border = borderStyle;
    });

    ptdSamples.forEach((s, idx) => {
      const row = wsPtd.addRow({
        stt: idx + 1,
        businessProcess: s.businessProcess || 'Phi tín dụng',
        postalAgencyCode: s.postalAgencyCode || s.branchCode || '',
        cifOrAccount: s.cifOrAccount || '',
        customerName: s.customerName || '',
        loanAmount: s.loanAmount || 0,
        disbursementDate: s.testedAt
          ? s.testedAt.toISOString().split('T')[0]
          : '',
        uniTime: s.sampleData?.uniTime || '',
        t24Time: s.sampleData?.t24Time || '',
        uniVsT24DiffMinutes: s.uniVsT24DiffMinutes || 0,
        proposerOfficer: s.proposerOfficer || '',
        appraiserOfficer: s.appraiserOfficer || s.businessLeader || '',
        reconciliationCashDiff: s.reconciliationCashDiff || 0,
        reportDelayDays: s.reportDelayDays || 0,
        damagedAcqtSeries: s.damagedAcqtSeries || '',
        userCrossEnv: s.userCrossEnv || '',
        condition: s.condition || s.recommendationText || '',
        auditeeProposal: s.auditeeProposal || s.auditeeExplanation || '',
      });
      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Times New Roman', size: 10 };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = borderStyle;
        if (colNumber === 6 || colNumber === 13) {
          cell.numFmt = '#,##0';
        }
      });
      row.height = 24;
    });
    wsPtd.autoFilter = 'A4:R4';

    // ══════════════════════════════════════════════════════════════════════
    // SHEET 3: MA TRẬN TÍN DỤNG 40 CỘT (NẾU CÓ DỮ LIỆU TÍN DỤNG)
    // ══════════════════════════════════════════════════════════════════════
    if (creditSamples.length > 0) {
      const wsTd = workbook.addWorksheet('Mau_Kiem_Tra_TD_40Cot');
      wsTd.views = [{ state: 'frozen', ySplit: 5 }];

      wsTd.mergeCells('A1:P1');
      const tdTitle = wsTd.getCell('A1');
      tdTitle.value = 'BẢNG KÊ CHI TIẾT MẪU KIỂM TRA TÍN DỤNG (MA TRẬN 40 CỘT)';
      tdTitle.font = {
        name: 'Times New Roman',
        size: 14,
        bold: true,
        color: { argb: 'FF003366' },
      };
      tdTitle.alignment = { horizontal: 'center', vertical: 'middle' };
      wsTd.getRow(1).height = 28;

      const tdHeaders = [
        { header: 'STT', key: 'stt', width: 8 },
        { header: 'Mã CIF / Tài khoản', key: 'cifOrAccount', width: 20 },
        { header: 'Tên Khách hàng', key: 'customerName', width: 25 },
        { header: 'Số Hợp đồng TD', key: 'contractNumber', width: 20 },
        { header: 'Số Khế ước', key: 'accountNumber', width: 20 },
        { header: 'Số tiền giải ngân (VND)', key: 'loanAmount', width: 20 },
        {
          header: 'Dư nợ hiện tại (VND)',
          key: 'outstandingBalance',
          width: 20,
        },
        { header: 'Nhóm nợ', key: 'debtGroup', width: 12 },
        { header: 'Mục đích vay vốn', key: 'loanPurpose', width: 24 },
        { header: 'Tài sản bảo đảm (TSBĐ)', key: 'collateralInfo', width: 28 },
        { header: 'Giá trị định giá TSBĐ', key: 'collateralValue', width: 20 },
        { header: 'Cán bộ thẩm định', key: 'proposerOfficer', width: 20 },
        { header: 'Cán bộ phê duyệt', key: 'appraiserOfficer', width: 20 },
        { header: 'Sai phạm ghi nhận', key: 'condition', width: 40 },
        { header: 'Rủi ro còn lại', key: 'residualRisk', width: 15 },
        { header: 'Ý kiến giải trình ĐVKD', key: 'auditeeProposal', width: 35 },
      ];

      wsTd.getRow(4).values = tdHeaders.map((h) => h.header);
      wsTd.getRow(4).height = 26;
      wsTd.columns = tdHeaders.map((h) => ({ key: h.key, width: h.width }));

      const rTd4 = wsTd.getRow(4);
      rTd4.eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };
        cell.border = borderStyle;
      });

      creditSamples.forEach((s, idx) => {
        const row = wsTd.addRow({
          stt: idx + 1,
          cifOrAccount: s.cifOrAccount || '',
          customerName: s.customerName || '',
          contractNumber:
            s.sampleData?.contractNumber || s.sampleData?.soHopDong || '',
          accountNumber: s.cifOrAccount || '',
          loanAmount: s.loanAmount || 0,
          outstandingBalance: s.loanAmount || 0,
          debtGroup: s.debtGroup || 'Nhóm 1',
          loanPurpose: s.loanPurpose || '',
          collateralInfo:
            s.sampleData?.collateralInfo || s.sampleData?.tsbd || '',
          collateralValue: s.sampleData?.collateralValue || 0,
          proposerOfficer: s.proposerOfficer || '',
          appraiserOfficer: s.appraiserOfficer || s.businessLeader || '',
          condition: s.condition || s.recommendationText || '',
          residualRisk: s.residualRisk || 'Trung bình',
          auditeeProposal: s.auditeeProposal || s.auditeeExplanation || '',
        });
        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Times New Roman', size: 10 };
          cell.alignment = { vertical: 'middle', wrapText: true };
          cell.border = borderStyle;
          if (colNumber === 6 || colNumber === 7 || colNumber === 11) {
            cell.numFmt = '#,##0';
          }
        });
        row.height = 24;
      });
      wsTd.autoFilter = 'A4:P4';
    }

    const uint8Array = await workbook.xlsx.writeBuffer();
    return Buffer.from(uint8Array);
  }
}
