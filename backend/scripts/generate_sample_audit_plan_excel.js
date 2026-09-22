const ExcelJS = require('exceljs');
const path = require('path');

async function createAuditPlanSampleFile() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LPBank - Internal Audit System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Ke_Hoach_Kiem_Toan_Nam', {
    views: [{ showGridLines: true }]
  });

  // Title block
  worksheet.mergeCells('A1:O1');
  const orgCell = worksheet.getCell('A1');
  orgCell.value = 'NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN LỘC PHÁT VIỆT NAM (LPBANK) - BAN KIỂM SOÁT';
  orgCell.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF593116' } };
  orgCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(1).height = 24;

  worksheet.mergeCells('A2:O2');
  const titleCell = worksheet.getCell('A2');
  titleCell.value = 'KẾ HOẠCH KIỂM TOÁN NỘI BỘ NĂM 2026 - CHI TIẾT NGUỒN LỰC, ĐỐI TƯỢNG & CĂN CỨ LỰA CHỌN';
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF8A3C00' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(2).height = 28;

  worksheet.mergeCells('A3:O3');
  const noteCell = worksheet.getCell('A3');
  noteCell.value = 'Căn cứ Quy chế KTNB 3001 & Quy trình KTNB 3002 | Ban hành kèm theo Quyết định của Ban Kiểm soát LPBank';
  noteCell.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF666666' } };
  noteCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.getRow(3).height = 20;

  worksheet.addRow([]); // Blank row 4

  // Table Headers (Row 5)
  const headers = [
    'Năm kế hoạch',
    'Tên kế hoạch',
    'Phòng KTNB phụ trách',
    'Mã đối tượng KT',
    'Tên đối tượng / Quy trình kiểm toán',
    'Phân loại',
    'Mức độ rủi ro',
    'Quý dự kiến',
    'Tháng dự kiến',
    'Ngày công dự kiến',
    'Số lượng KTV',
    'Trưởng đoàn dự kiến',
    'Căn cứ / Giải trình lựa chọn',
    'Trạng thái kế hoạch',
    'Ý kiến phê duyệt',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 30;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEA9105' }, // LPBank Brand Gold
    };
    cell.font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCC7A00' } },
      left: { style: 'thin', color: { argb: 'FFCC7A00' } },
      bottom: { style: 'medium', color: { argb: 'FF8A3C00' } },
      right: { style: 'thin', color: { argb: 'FFCC7A00' } },
    };
  });

  const sampleRows = [
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'CN-TB',
      'Chi nhánh Thái Bình - Toàn diện hoạt động kinh doanh (Tín dụng, Huy động & Dịch vụ)',
      'ChiNhanh',
      'Hạng 4 (Cao)',
      'Q1',
      'Tháng 03',
      15,
      4,
      'Nguyễn Văn Kiểm',
      'Dư nợ tín dụng tăng trưởng nóng > 35%, nợ nhóm 2 tăng mạnh; chu kỳ 2 năm chưa kiểm toán toàn diện theo QC 3001',
      'Bản nháp',
      ''
    ],
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'IT-SEC',
      'Khối CNTT - Quản lý An toàn thông tin, Trung tâm Dữ liệu & Ứng dụng Ngân hàng số',
      'HeThong',
      'Hạng 5 (Rất cao)',
      'Q1',
      'Tháng 02',
      20,
      3,
      'Trần Công Nghệ',
      'Hệ thống công nghệ thông tin trọng yếu của Ngân hàng, bắt buộc kiểm toán hàng năm theo Thông tư 09/2020/TT-NHNN',
      'Bản nháp',
      ''
    ],
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'CN-TNA',
      'Chi nhánh Tây Nghệ An - Nghiệp vụ Tín dụng, Bảo lãnh & Xử lý thu hồi nợ',
      'ChiNhanh',
      'Hạng 3 (Trung bình)',
      'Q2',
      'Tháng 04',
      12,
      3,
      'Lê Thị Thu',
      'Đến hạn kiểm toán định kỳ 2 năm, chi nhánh có biến động nhân sự chủ chốt (Giám đốc CN mới)',
      'Bản nháp',
      ''
    ],
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'HS-QLRR',
      'Khối Quản trị Rủi ro - Đánh giá mô hình đo lường rủi ro tín dụng & Khung an toàn vốn Basel III',
      'HoiSo',
      'Hạng 4 (Cao)',
      'Q2',
      'Tháng 06',
      15,
      3,
      'Hoàng Rủi Ro',
      'Định kỳ rà soát tính hợp lệ của mô hình xếp hạng tín dụng nội bộ và kịch bản kiểm tra sức chịu tải (Stress test)',
      'Bản nháp',
      ''
    ],
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'CN-HCM',
      'Chi nhánh TP. Hồ Chí Minh - Hoạt động Tài trợ Thương mại, Thanh toán Quốc tế & Ngoại hối',
      'ChiNhanh',
      'Hạng 4 (Cao)',
      'Q3',
      'Tháng 07',
      14,
      4,
      'Vũ Thị Lan',
      'Quy mô giao dịch ngoại hối và L/C lớn nhất hệ thống, rủi ro tuân thủ quy định quản lý ngoại hối và phòng chống rửa tiền',
      'Bản nháp',
      ''
    ],
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'HS-VH',
      'Khối Vận hành - Trung tâm Thanh toán Tập trung & Xử lý Giao dịch đa kênh',
      'HoiSo',
      'Hạng 3 (Trung bình)',
      'Q3',
      'Tháng 09',
      10,
      2,
      'Đặng Vận Hành',
      'Đánh giá rủi ro tác nghiệp sau khi hợp nhất quy trình giao dịch thanh toán điện tử liên ngân hàng (CITAD/NAPAS)',
      'Bản nháp',
      ''
    ],
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'HS-TCKT',
      'Khối Tài chính - Kế toán: Quản lý Chi phí hoạt động, Đầu tư TSCĐ & Mua sắm tập trung',
      'HoiSo',
      'Hạng 2 (Thấp)',
      'Q4',
      'Tháng 10',
      10,
      2,
      'Phạm Kế Toán',
      'Mức rủi ro thấp nhưng cần kiểm tra tính tuân thủ quy chế tài chính và chi phí tập trung theo định hướng chỉ đạo của BKS',
      'Bản nháp',
      ''
    ],
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'PGD-TH',
      'Phòng giao dịch Tiền Hải (trực thuộc CN Thái Bình) - Kiểm toán đột xuất quản lý tiền mặt & kho quỹ',
      'PGD',
      'Hạng 4 (Cao)',
      'Q4',
      'Tháng 11',
      5,
      2,
      'Nguyễn Văn Kiểm',
      'Cảnh báo từ Giám sát liên tục về tần suất giao dịch vượt hạn mức và rủi ro điều chuyển tiền mặt cuối ngày',
      'Bản nháp',
      ''
    ],
    [
      2026,
      'Kế hoạch Kiểm toán nội bộ năm 2026',
      'Toàn khối',
      'CN-DN',
      'Chi nhánh Đà Nẵng - Nghiệp vụ Thẩm định & Cấp tín dụng Khách hàng Doanh nghiệp (SME)',
      'ChiNhanh',
      'Hạng 3 (Trung bình)',
      'Q4',
      'Tháng 12',
      12,
      3,
      'Bùi Đức Tâm',
      'Chu kỳ kiểm toán 2 năm, rà soát chất lượng tín dụng và định giá tài sản bảo đảm là bất động sản du lịch',
      'Bản nháp',
      ''
    ],
  ];

  sampleRows.forEach((row, index) => {
    const dataRow = worksheet.addRow(row);
    dataRow.height = 24;

    const isEven = index % 2 === 0;
    const bgFill = isEven ? 'FFFFFFFF' : 'FFFDF8F2';

    dataRow.eachCell((cell, colNumber) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgFill },
      };
      cell.font = {
        name: 'Segoe UI',
        size: 10,
        color: { argb: 'FF2D3748' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      // Alignment specific to columns
      if (colNumber === 1 || colNumber === 4 || colNumber === 6 || colNumber === 8 || colNumber === 9 || colNumber === 14) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if (colNumber === 10 || colNumber === 11) {
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }

      // Highlight risk level
      if (colNumber === 7) {
        const val = String(cell.value || '');
        if (val.includes('5') || val.includes('Rất cao')) {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF9B1C1C' } };
        } else if (val.includes('4') || val.includes('Cao')) {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFC2410C' } };
        } else if (val.includes('3') || val.includes('Trung bình')) {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFD97706' } };
        } else {
          cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
        }
      }
    });
  });

  // Column Widths
  worksheet.getColumn(1).width = 14;  // Năm
  worksheet.getColumn(2).width = 34;  // Tên kế hoạch
  worksheet.getColumn(3).width = 20;  // Phòng KTNB
  worksheet.getColumn(4).width = 16;  // Mã đối tượng
  worksheet.getColumn(5).width = 50;  // Tên đối tượng/quy trình
  worksheet.getColumn(6).width = 14;  // Phân loại
  worksheet.getColumn(7).width = 18;  // Mức độ rủi ro
  worksheet.getColumn(8).width = 14;  // Quý dự kiến
  worksheet.getColumn(9).width = 14;  // Tháng dự kiến
  worksheet.getColumn(10).width = 18; // Ngày công
  worksheet.getColumn(11).width = 14; // Số lượng KTV
  worksheet.getColumn(12).width = 22; // Trưởng đoàn
  worksheet.getColumn(13).width = 55; // Căn cứ / Giải trình
  worksheet.getColumn(14).width = 18; // Trạng thái
  worksheet.getColumn(15).width = 24; // Ý kiến phê duyệt

  const targetPath = path.resolve(__dirname, '../../docs/THUCTE/UPLOAD/12_Ke_Hoach_Kiem_Toan_Nam_Chi_Tiet_LPBank.xlsx');
  await workbook.xlsx.writeFile(targetPath);
  console.log(`Successfully generated LPBank Audit Plan Excel template at: ${targetPath}`);
}

createAuditPlanSampleFile().catch(console.error);
