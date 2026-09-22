const fs = require('fs');
const path = require('path');
const ExcelJS = require('../node_modules/exceljs');

const UPLOAD_DIR = path.resolve(__dirname, '../../docs/THUCTE/UPLOAD');
const ARCHIVE_DIR = path.join(UPLOAD_DIR, 'archive_drafts');

async function main() {
  console.log('=== BẮT ĐẦU CHUẨN HÓA BỘ FILE EXCEL GO-LIVE LPBANK ===');

  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }

  // 1. FILE 01: Cơ cấu tổ chức đầy đủ (Hội sở + Mạng lưới Chi nhánh toàn quốc từ CoreBanking T24)
  console.log('-> 1. Đang tạo File 01: 01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx...');
  await generateFile01();

  // 2. FILE 02: Danh sách nhân sự KTV và Lãnh đạo ĐVKD (Auditee)
  console.log('-> 2. Đang tạo File 02: 02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx...');
  await generateFile02();

  // 3. FILE 07A: Đổi tên / sao chép từ file 07 cũ
  console.log('-> 3. Đang chuẩn hóa File 07A: 07A_Tap_Mau_Giao_Dich_Chon_Mau_Tin_Dung.xlsx...');
  const file07Old = path.join(UPLOAD_DIR, '07_Tap_Mau_Giao_Dich_Chon_Mau_Tin_Dung.xlsx');
  const file07ANew = path.join(UPLOAD_DIR, '07A_Tap_Mau_Giao_Dich_Chon_Mau_Tin_Dung.xlsx');
  if (fs.existsSync(file07Old)) {
    fs.copyFileSync(file07Old, file07ANew);
  }

  // 4. FILE 07B: Tập mẫu giao dịch Phi tín dụng (Kho quỹ, Huy động, Thẻ, Bảo lãnh)
  console.log('-> 4. Đang tạo File 07B: 07B_Tap_Mau_Giao_Dich_Chon_Mau_Phi_Tin_Dung.xlsx...');
  await generateFile07B();

  // 5. FILE 13: Danh sách kiến nghị tồn đọng từ kỳ kiểm toán trước
  console.log('-> 5. Đang tạo File 13: 13_Danh_Sach_Kien_Nghi_Ton_Dong_Theo_Doi_Khac_Phuc.xlsx...');
  await generateFile13();

  // 6. FILE 14: Dữ liệu chỉ số rủi ro KRI hàng tháng theo ĐVKD
  console.log('-> 6. Đang tạo File 14: 14_Du_Lieu_Chi_So_Rui_Ro_KRI_Hang_Thang.xlsx...');
  await generateFile14();

  // 7. Di chuyển các file nháp cũ vào archive_drafts để thư mục upload sạch sẽ
  console.log('-> 7. Đang lưu trữ các tệp nháp cũ vào archive_drafts...');
  const filesToArchive = [
    'Mau_Bieu_Co_Cau_To_Chuc_LPBank_Chuan.xlsx',
    '07_Tap_Mau_Giao_Dich_Chon_Mau_Tin_Dung.xlsx',
    'Bo_Ho_So_Rui_Ro_KTNB_ALL_1787926244671.xlsx',
    'maloimap_v3.xlsx'
  ];
  for (const f of filesToArchive) {
    const src = path.join(UPLOAD_DIR, f);
    if (fs.existsSync(src)) {
      const dest = path.join(ARCHIVE_DIR, f);
      fs.copyFileSync(src, dest);
      fs.unlinkSync(src);
      console.log(`   Đã lưu trữ: ${f} -> archive_drafts/`);
    }
  }

  console.log('=== HOÀN TẤT CHUẨN HÓA BỘ 15 FILE EXCEL GO-LIVE ===');
}

// -------------------------------------------------------------
// HÀM TẠO FILE 01
// -------------------------------------------------------------
async function generateFile01() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Co_Cau_To_Chuc');

  const headers = [
    'Mã đơn vị',
    'Tên đơn vị',
    'Loại đơn vị',
    'Đơn vị cha (Mã)',
    'Vùng quản lý',
    'Chức năng nhiệm vụ',
    'Mô tả',
    'Trạng thái',
    'Mã T24',
    'Mã QL T24'
  ];
  ws.addRow(headers);

  // 1.1. Cơ cấu Hội sở chuẩn
  const hoiSoRows = [
    ['BOD', 'Hội đồng Quản trị', 'HoiDong', '', 'Hội sở', 'Quản trị chiến lược, định hướng hoạt động toàn hệ thống', 'Cơ quan quản trị cao nhất của LPBank', 'Active', 'BOD', ''],
    ['BKS', 'Ban Kiểm soát', 'BanKiemSoat', 'BOD', 'Hội sở', 'Kiểm tra, giám sát hoạt động quản trị điều hành toàn ngân hàng', 'Cơ quan giám sát độc lập trực thuộc ĐHĐCĐ', 'Active', 'BKS', 'BOD'],
    ['BOM', 'Ban Tổng Giám đốc', 'BanGiamDoc', 'BOD', 'Hội sở', 'Điều hành mọi hoạt động kinh doanh hàng ngày', 'Cơ quan điều hành cao nhất', 'Active', 'BOM', 'BOD'],
    ['KTNB', 'Khối Kiểm toán Nội bộ', 'Khoi', 'BKS', 'Hội sở', 'Kiểm tra, đánh giá độc lập hệ thống kiểm soát nội bộ và quản trị rủi ro', 'Trực thuộc Ban Kiểm soát theo Thông tư 13/2018/TT-NHNN', 'Active', 'KTNB', 'BKS'],
    ['KTNB_NV1', 'Phòng Kiểm toán Nghiệp vụ 1 (Tín dụng & Nguồn vốn)', 'PhongBan', 'KTNB', 'Hội sở', 'Kiểm toán hoạt động cấp tín dụng, đầu tư, ngân quỹ và kinh doanh vốn', 'Phòng nghiệp vụ kiểm toán chuyên sâu Tín dụng', 'Active', 'KTNB_NV1', 'KTNB'],
    ['KTNB_NV2', 'Phòng Kiểm toán Nghiệp vụ 2 (Vận hành & Kế toán)', 'PhongBan', 'KTNB', 'Hội sở', 'Kiểm toán vận hành chi nhánh, kế toán tài chính và thanh toán', 'Phòng nghiệp vụ kiểm toán Chi nhánh & Vận hành', 'Active', 'KTNB_NV2', 'KTNB'],
    ['KTNB_CNTT', 'Phòng Kiểm toán Công nghệ Thông tin', 'PhongBan', 'KTNB', 'Hội sở', 'Kiểm toán an toàn thông tin, hạ tầng hệ thống CoreBanking và CSDL', 'Kiểm toán CNTT & An ninh mạng', 'Active', 'KTNB_CNTT', 'KTNB'],
    ['KTNB_GSCL', 'Phòng Giám sát Kiểm toán & Đảm bảo Chất lượng', 'PhongBan', 'KTNB', 'Hội sở', 'Giám sát kiểm toán liên tục, hậu kiểm, theo dõi khắc phục kiến nghị và QA', 'Phòng ĐBCL & Giám sát liên tục', 'Active', 'KTNB_GSCL', 'KTNB'],
    ['QLRR', 'Khối Quản trị Rủi ro', 'Khoi', 'BOM', 'Hội sở', 'Thiết lập chính sách, đo lường và quản trị rủi ro toàn hàng', 'Quản trị rủi ro cấp 2 (2nd Line)', 'Active', 'QLRR', 'BOM'],
    ['TDPD', 'Khối Thẩm định & Phê duyệt', 'Khoi', 'BOM', 'Hội sở', 'Thẩm định độc lập và phê duyệt cấp tín dụng theo thẩm quyền', 'Độc lập với Khối Kinh doanh', 'Active', 'TDPD', 'BOM'],
    ['KHDN', 'Khối Khách hàng Doanh nghiệp', 'Khoi', 'BOM', 'Hội sở', 'Phát triển kinh doanh mảng doanh nghiệp và định chế tài chính', 'Khối kinh doanh CIB & SME', 'Active', 'KHDN', 'BOM'],
    ['KHCN', 'Khối Khách hàng Cá nhân (Bán lẻ)', 'Khoi', 'BOM', 'Hội sở', 'Phát triển kinh doanh sản phẩm bán lẻ, cho vay tiêu dùng và huy động', 'Khối kinh doanh Retail Banking', 'Active', 'KHCN', 'BOM'],
    ['VHANH', 'Khối Vận hành', 'Khoi', 'BOM', 'Hội sở', 'Vận hành tập trung thanh toán, tài trợ thương mại và kho quỹ', 'Vận hành toàn hàng', 'Active', 'VHANH', 'BOM'],
    ['CNTT', 'Khối Công nghệ Thông tin & Ngân hàng số', 'Khoi', 'BOM', 'Hội sở', 'Quản trị hạ tầng, phát triển ứng dụng ngân hàng số và an toàn thông tin', 'Khối IT & Digital Banking', 'Active', 'CNTT', 'BOM'],
    ['TCKT', 'Khối Tài chính Kế toán', 'Khoi', 'BOM', 'Hội sở', 'Quản lý tài chính, lập báo cáo tài chính và quyết toán thuế', 'Kế toán tài chính toàn hàng', 'Active', 'TCKT', 'BOM'],
    ['QTNNL', 'Khối Quản trị Nguồn Nhân lực', 'Khoi', 'BOM', 'Hội sở', 'Hoạch định nhân sự, đào tạo, tuyển dụng và chế độ chính sách', 'Khối nhân sự toàn hàng', 'Active', 'QTNNL', 'BOM']
  ];
  hoiSoRows.forEach(r => ws.addRow(r));

  // 1.2. Đọc mạng lưới Chi nhánh từ tệp CoreBanking thực tế (Mang luoi - LPB - 1.7.26.xlsx)
  const networkPath = path.resolve(__dirname, '../../docs/Mau bieu/Mang luoi - LPB - 1.7.26.xlsx');
  if (fs.existsSync(networkPath)) {
    const netWb = new ExcelJS.Workbook();
    await netWb.xlsx.readFile(networkPath);
    const netWs = netWb.getWorksheet('TONG HOP');
    if (netWs) {
      const addedCodes = new Set(hoiSoRows.map(r => r[0]));
      addedCodes.add('000');
      addedCodes.add('VN0010001');

      for (let r = 4; r <= netWs.rowCount; r++) {
        const row = netWs.getRow(r);
        const t24Code = String(row.getCell(7).value || '').trim();
        const t24Name = String(row.getCell(8).value || '').trim();
        const t24ParentCode = String(row.getCell(11).value || '').trim();
        const rawType = String(row.getCell(14).value || '').trim();
        const region = String(row.getCell(18).value || row.getCell(17).value || 'Hội sở').trim();

        if (!t24Code || t24Code === '000' || addedCodes.has(t24Code)) continue;
        addedCodes.add(t24Code);

        let unitType = 'PGD';
        if (rawType.toUpperCase() === 'CN' || rawType.toLowerCase().includes('chi nhánh')) {
          unitType = 'ChiNhanh';
        } else if (rawType.toLowerCase().includes('hội sở')) {
          unitType = 'HoiSo';
        }

        const parentCode = (t24ParentCode && t24ParentCode !== t24Code) ? t24ParentCode : 'BOM';

        ws.addRow([
          t24Code,
          t24Name,
          unitType,
          parentCode,
          region,
          unitType === 'ChiNhanh' ? `Kinh doanh tiền tệ, tín dụng, dịch vụ ngân hàng tại địa bàn ${t24Name}` : `Giao dịch trực tiếp với khách hàng trực thuộc ${t24ParentCode}`,
          `Đơn vị kinh doanh mạng lưới LPBank mã T24 ${t24Code}`,
          'Active',
          t24Code,
          t24ParentCode
        ]);
      }
    }
  }

  // Format header
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF99D1C' } };
  ws.columns.forEach(c => { c.width = 25; });
  ws.getColumn(2).width = 38;
  ws.getColumn(6).width = 40;

  // Thêm sheet Huong_Dan
  const wsGuide = wb.addWorksheet('Huong_Dan');
  wsGuide.addRow(['HƯỚNG DẪN CẤU TRÚC DANH MỤC CƠ CẤU TỔ CHỨC LPBANK']);
  wsGuide.addRow(['1. File này bao gồm toàn bộ Khối/Phòng ban Hội sở và 100% Chi nhánh, PGD toàn hàng theo mã CoreBanking T24.']);
  wsGuide.addRow(['2. Cột "Loại đơn vị" nhận các giá trị: HoiDong, BanKiemSoat, BanGiamDoc, Khoi, PhongBan, ChiNhanh, PGD.']);
  wsGuide.addRow(['3. Cột "Đơn vị cha (Mã)" phục vụ xây dựng cây tổ chức Org-Chart nhiều cấp.']);
  wsGuide.addRow(['4. Đảm bảo nạp file này ĐẦU TIÊN khi khởi tạo hệ thống (Bước 1 Go-Live Runbook).']);

  const outPath = path.join(UPLOAD_DIR, '01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`   -> Đã ghi: ${outPath} (${ws.rowCount} dòng)`);
}

// -------------------------------------------------------------
// HÀM TẠO FILE 02
// -------------------------------------------------------------
async function generateFile02() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Nhan_Su_KTV_Va_Auditee');

  const headers = [
    'Mã nhân viên',
    'Tên đăng nhập',
    'Họ và tên',
    'Email',
    'Số điện thoại',
    'Phòng ban',
    'Chức danh',
    'Vai trò',
    'Nơi làm việc'
  ];
  ws.addRow(headers);

  // 2.1. Đội ngũ Kiểm toán viên (Auditors & Lead Auditors)
  const auditors = [
    ['LPB-KT001', 'danhpc', 'Phan Cảnh Danh', 'danhpc@lpbank.com.vn', '0912345678', 'Phòng Kiểm toán Nghiệp vụ 1', 'Kiểm toán viên cao cấp', 'lead_auditor', 'Hội sở Hà Nội'],
    ['LPB-KT002', 'oanhnt', 'Nguyễn Thị Oanh', 'oanhnt@lpbank.com.vn', '0912345679', 'Phòng Kiểm toán Nghiệp vụ 1', 'Kiểm toán viên chính', 'auditor', 'Hội sở Hà Nội'],
    ['LPB-KT003', 'haidv', 'Đoàn Văn Hải', 'haidv@lpbank.com.vn', '0912345680', 'Phòng Kiểm toán Nghiệp vụ 2', 'Kiểm toán viên', 'auditor', 'Hội sở Hà Nội'],
    ['LPB-KT004', 'dungna', 'Nguyễn Anh Dũng', 'dungna@lpbank.com.vn', '0912345681', 'Phòng Kiểm toán Công nghệ Thông tin', 'KTV CNTT cao cấp', 'auditor', 'Hội sở Hà Nội'],
    ['LPB-KT005', 'huonglt', 'Lê Thu Hương', 'huonglt@lpbank.com.vn', '0912345682', 'Phòng Giám sát Kiểm toán & ĐBCL', 'Chuyên viên Đảm bảo chất lượng', 'auditor', 'Hội sở Hà Nội'],
    ['LPB-KT006', 'tuanvm', 'Vũ Minh Tuấn', 'tuanvm@lpbank.com.vn', '0912345683', 'Phòng Kiểm toán Nghiệp vụ 1', 'Kiểm toán viên', 'auditor', 'Văn phòng đại diện Miền Nam'],
    ['LPB-KT007', 'trangnt', 'Nguyễn Thu Trang', 'trangnt@lpbank.com.vn', '0912345684', 'Phòng Kiểm toán Nghiệp vụ 2', 'Kiểm toán viên chính', 'lead_auditor', 'Văn phòng đại diện Miền Trung'],
    ['LPB-KT008', 'minhnv', 'Nguyễn Văn Minh', 'minhnv@lpbank.com.vn', '0912345685', 'Phòng Kiểm toán Công nghệ Thông tin', 'KTV Hệ thống & An ninh mạng', 'auditor', 'Hội sở Hà Nội']
  ];
  auditors.forEach(r => ws.addRow(r));

  // 2.2. Đội ngũ Lãnh đạo Đơn vị được kiểm toán (Auditees / Branch Managers)
  const auditees = [
    ['LPB-MGR001', 'hanoibm', 'Trần Quốc Tuấn', 'tuan.tq@lpbank.com.vn', '0913222333', 'Chi nhánh Hà Nội', 'Giám đốc Chi nhánh', 'branch_manager', 'Chi nhánh Hà Nội'],
    ['LPB-ACC001', 'hanoicacc', 'Nguyễn Thị Lan', 'lan.nt@lpbank.com.vn', '0913333444', 'Chi nhánh Hà Nội', 'Kế toán trưởng', 'auditee', 'Chi nhánh Hà Nội'],
    ['LPB-TD001', 'hanoitd', 'Vũ Đức Thắng', 'thang.vd@lpbank.com.vn', '0913444555', 'Chi nhánh Hà Nội', 'Trưởng phòng Khách hàng Doanh nghiệp', 'auditee', 'Chi nhánh Hà Nội'],
    ['LPB-VH001', 'hanoivh', 'Lê Phương Thảo', 'thao.lp@lpbank.com.vn', '0913555666', 'Chi nhánh Hà Nội', 'Trưởng phòng Dịch vụ Khách hàng', 'auditee', 'Chi nhánh Hà Nội'],

    ['LPB-MGR002', 'tayngheanbm', 'Nguyễn Văn Hội', 'hoi.nv@lpbank.com.vn', '0914111222', 'Chi nhánh Tây Nghệ An', 'Giám đốc Chi nhánh', 'branch_manager', 'Chi nhánh Tây Nghệ An'],
    ['LPB-ACC002', 'tayngheanacc', 'Phạm Thị Mai', 'mai.pt@lpbank.com.vn', '0914222333', 'Chi nhánh Tây Nghệ An', 'Kế toán trưởng', 'auditee', 'Chi nhánh Tây Nghệ An'],
    ['LPB-TD002', 'tayngheantd', 'Đặng Quốc Hưng', 'hung.dq@lpbank.com.vn', '0914333444', 'Chi nhánh Tây Nghệ An', 'Trưởng phòng Tín dụng', 'auditee', 'Chi nhánh Tây Nghệ An'],
    ['LPB-VH002', 'tayngheanvh', 'Hoàng Đình Toàn', 'toan.hd@lpbank.com.vn', '0914444555', 'Chi nhánh Tây Nghệ An', 'Trưởng phòng Dịch vụ Khách hàng', 'auditee', 'Chi nhánh Tây Nghệ An'],

    ['LPB-MGR003', 'saigonbm', 'Trịnh Minh Đức', 'duc.tm@lpbank.com.vn', '0915111222', 'Chi nhánh Sài Gòn', 'Giám đốc Chi nhánh', 'branch_manager', 'Chi nhánh Sài Gòn'],
    ['LPB-ACC003', 'saigonacc', 'Đặng Thu Hà', 'ha.dt@lpbank.com.vn', '0915222333', 'Chi nhánh Sài Gòn', 'Kế toán trưởng', 'auditee', 'Chi nhánh Sài Gòn'],
    ['LPB-TD003', 'saigontd', 'Nguyễn Hoàng Long', 'long.nh@lpbank.com.vn', '0915333444', 'Chi nhánh Sài Gòn', 'Trưởng phòng KHDN', 'auditee', 'Chi nhánh Sài Gòn'],

    ['LPB-MGR004', 'danangbm', 'Phan Thanh Sơn', 'son.pt@lpbank.com.vn', '0916111222', 'Chi nhánh Đà Nẵng', 'Giám đốc Chi nhánh', 'branch_manager', 'Chi nhánh Đà Nẵng'],
    ['LPB-ACC004', 'danangacc', 'Võ Thị Quỳnh', 'quynh.vt@lpbank.com.vn', '0916222333', 'Chi nhánh Đà Nẵng', 'Kế toán trưởng', 'auditee', 'Chi nhánh Đà Nẵng'],

    ['LPB-MGR005', 'thanglongbm', 'Đỗ Hoàng Long', 'long.dh@lpbank.com.vn', '0917111222', 'Chi nhánh Thăng Long', 'Giám đốc Chi nhánh', 'branch_manager', 'Chi nhánh Thăng Long'],
    ['LPB-ACC005', 'thanglongacc', 'Bùi Minh Hạnh', 'hanh.bm@lpbank.com.vn', '0917222333', 'Chi nhánh Thăng Long', 'Kế toán trưởng', 'auditee', 'Chi nhánh Thăng Long'],

    ['LPB-MGR006', 'canthobm', 'Lý Tấn Phát', 'phat.lt@lpbank.com.vn', '0918111222', 'Chi nhánh Cần Thơ', 'Giám đốc Chi nhánh', 'branch_manager', 'Chi nhánh Cần Thơ'],
    ['LPB-MGR007', 'haiphongbm', 'Nguyễn Kiên Cường', 'cuong.nk@lpbank.com.vn', '0919111222', 'Chi nhánh Hải Phòng', 'Giám đốc Chi nhánh', 'branch_manager', 'Chi nhánh Hải Phòng'],
    ['LPB-MGR008', 'daklakbm', 'Trương Quang Huy', 'huy.tq@lpbank.com.vn', '0920111222', 'Chi nhánh Đắk Lắk', 'Giám đốc Chi nhánh', 'branch_manager', 'Chi nhánh Đắk Lắk']
  ];
  auditees.forEach(r => ws.addRow(r));

  // Format header
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF99D1C' } };
  ws.columns.forEach(c => { c.width = 24; });
  ws.getColumn(3).width = 28;
  ws.getColumn(4).width = 30;
  ws.getColumn(6).width = 36;

  const outPath = path.join(UPLOAD_DIR, '02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`   -> Đã ghi: ${outPath} (${ws.rowCount} dòng: ${auditors.length} KTV + ${auditees.length} Auditee)`);
}

// -------------------------------------------------------------
// HÀM TẠO FILE 07B: Giao dịch Phi Tín dụng & Kho quỹ
// -------------------------------------------------------------
async function generateFile07B() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Mau_Giao_Dich_Phi_Tin_Dung');

  const headers = [
    'Mã giao dịch',
    'Số CIF',
    'Tên khách hàng/Đối tác',
    'Loại nghiệp vụ',
    'Số tiền (VNĐ)',
    'Thời gian giao dịch',
    'Chi nhánh thực hiện',
    'Giao dịch viên/Kiểm soát viên',
    'Kiểm toán viên phụ trách',
    'Mô tả & Dấu hiệu kiểm tra'
  ];
  ws.addRow(headers);

  const sampleTransactions = [
    ['TXN-KQ-001', 'CIF1002345', 'Công ty TNHH Vận Tải Đông Đô', 'Rút tiền mặt giá trị lớn tại quầy', 1850000000, '2026-01-15 10:30:00', 'Chi nhánh Hà Nội', 'Trần Thị Thu / Lê Văn Bình', 'Đoàn Văn Hải', 'Rút tiền mặt vượt 500 triệu không thông báo trước theo quy định điều chuyển kho quỹ'],
    ['TXN-KQ-002', 'CIF1009876', 'Bà Nguyễn Thị Mai Hương', 'Nộp tiền mặt ngoại tệ tại quầy', 1250000000, '2026-01-18 14:15:00', 'Chi nhánh Thăng Long', 'Phạm Quỳnh Nga / Vũ Thu Hà', 'Đoàn Văn Hải', 'Giao dịch nộp 50,000 USD tiền mặt không xuất trình đủ chứng từ nguồn gốc hợp lệ'],
    ['TXN-KQ-003', 'INTERNAL-001', 'Kho quỹ Chi nhánh Tây Nghệ An', 'Tồn quỹ tiền mặt cuối ngày', 4200000000, '2026-01-20 17:00:00', 'Chi nhánh Tây Nghệ An', 'Trương Bá Tùng / Hoàng Đình Toàn', 'Nguyễn Thị Oanh', 'Tồn quỹ thực tế 4.2 tỷ vượt Hạn mức tồn quỹ bình quân (HMTQBQ quy định 2.5 tỷ) liên tục 5 ngày'],
    ['TXN-KQ-004', 'ATM-TNA-01', 'Cây ATM 01 Trụ sở Chi nhánh', 'Kiểm quỹ ATM định kỳ', 350000000, '2026-01-22 09:00:00', 'Chi nhánh Tây Nghệ An', 'Nguyễn Văn Nam / Lê Văn Đức', 'Nguyễn Thị Oanh', 'Biên bản kiểm quỹ ATM lập thiếu chữ ký của Trưởng phòng Dịch vụ khách hàng'],
    ['TXN-BL-001', 'CIF2001122', 'Công ty CP Xây Dựng Số 1 Nghệ An', 'Phát hành bảo lãnh thanh toán', 3200000000, '2026-02-02 11:20:00', 'Chi nhánh Tây Nghệ An', 'Đặng Quốc Hưng / Nguyễn Văn Hội', 'Phan Cảnh Danh', 'Phát hành bảo lãnh không phong tỏa tài khoản tiền gửi ký quỹ 100% khi chưa có phê duyệt miễn giảm'],
    ['TXN-BL-002', 'CIF2003344', 'Công ty TNHH Thiết Bị Y Tế Thủ Đô', 'Bảo lãnh dự thầu', 5000000000, '2026-02-05 15:45:00', 'Chi nhánh Hà Nội', 'Vũ Đức Thắng / Trần Quốc Tuấn', 'Phan Cảnh Danh', 'Thư bảo lãnh phát hành vượt thẩm quyền ủy quyền của Giám đốc Chi nhánh'],
    ['TXN-HD-001', 'CIF3005566', 'Ông Lê Tuấn Kiệt', 'Tất toán sổ tiết kiệm rút trước hạn', 800000000, '2026-02-10 09:40:00', 'Chi nhánh Sài Gòn', 'Nguyễn Thị Diễm / Đặng Thu Hà', 'Vũ Minh Tuấn', 'Áp dụng lãi suất không kỳ hạn nhưng nhân viên tính sai ngày thực gửi làm phát sinh chênh lệch lãi'],
    ['TXN-HD-002', 'CIF3007788', 'Bà Phan Kim Ngân', 'Mở sổ tiết kiệm đứng tên hộ', 600000000, '2026-02-12 16:10:00', 'Chi nhánh Cần Thơ', 'Lâm Bích Ngọc / Lý Tấn Phát', 'Vũ Minh Tuấn', 'Thiếu văn bản ủy quyền hợp pháp của chủ sở hữu tiền gửi tiết kiệm'],
    ['TXN-THE-001', 'CIF4001234', 'Ông Đinh Gia Huy', 'Phát hành thẻ tín dụng quốc tế Visa Platinum', 200000000, '2026-02-15 10:15:00', 'Chi nhánh Đà Nẵng', 'Trần Thu Dung / Phan Thanh Sơn', 'Nguyễn Thu Trang', 'Hồ sơ chứng minh thu nhập sao kê lương ngân hàng khác có dấu hiệu làm giả con dấu'],
    ['TXN-QL-001', 'EXP-HN-001', 'Trung tâm Hội nghị Quốc tế', 'Chi phí hội nghị khách hàng cuối năm', 185000000, '2026-02-18 14:00:00', 'Chi nhánh Hà Nội', 'Nguyễn Thị Lan / Trần Quốc Tuấn', 'Đoàn Văn Hải', 'Hóa đơn GTGT điện tử phát hành sau ngày diễn ra sự kiện 15 ngày, thiếu hợp đồng dịch vụ đính kèm'],
    ['TXN-QL-002', 'EXP-TNA-001', 'Nhà cung cấp văn phòng phẩm Hải Đăng', 'Chi mua sắm CCDC & Văn phòng phẩm', 68000000, '2026-02-20 16:30:00', 'Chi nhánh Tây Nghệ An', 'Phạm Thị Mai / Nguyễn Văn Hội', 'Nguyễn Thị Oanh', 'Hồ sơ mua sắm thiếu 03 bảng báo giá cạnh tranh theo quy chế mua sắm nội bộ LPBank'],
    ['TXN-TREO-001', 'ACCOUNT-3999', 'Tài khoản chờ xử lý thanh toán liên ngân hàng', 'Treo tài khoản nội bộ quá hạn', 450000000, '2026-02-22 08:30:00', 'Khối Vận hành', 'Bùi Văn Hùng / Hoàng Thị Yến', 'Đoàn Văn Hải', 'Khoản tiền treo tài khoản 3999 quá 30 ngày chưa tìm được đối soát nguyên nhân'],
    ['TXN-KH-001', 'CIF5004433', 'Bà Hoàng Thuỳ Trang', 'Chuyển tiền kiều hối Western Union', 350000000, '2026-02-24 11:00:00', 'Chi nhánh Hải Phòng', 'Lê Mỹ Linh / Nguyễn Kiên Cường', 'Đoàn Văn Hải', 'Giao dịch viên chi trả kiều hối nhưng CCCD của khách hàng đã hết hạn sử dụng'],
    ['TXN-KQ-005', 'TRANSFER-002', 'Điều chuyển tiền mặt liên chi nhánh', 'Lệnh điều chuyển tiền mặt', 5000000000, '2026-02-26 13:30:00', 'Chi nhánh Đắk Lắk', 'Trần Đình Trọng / Trương Quang Huy', 'Nguyễn Thu Trang', 'Biên bản bàn giao tiền mặt trên xe chuyên dùng thiếu chữ ký của bảo vệ áp tải']
  ];
  sampleTransactions.forEach(r => ws.addRow(r));

  // Format header
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF99D1C' } };
  ws.columns.forEach(c => { c.width = 24; });
  ws.getColumn(3).width = 35;
  ws.getColumn(5).numFmt = '#,##0';
  ws.getColumn(10).width = 45;

  const outPath = path.join(UPLOAD_DIR, '07B_Tap_Mau_Giao_Dich_Chon_Mau_Phi_Tin_Dung.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`   -> Đã ghi: ${outPath} (${ws.rowCount} dòng)`);
}

// -------------------------------------------------------------
// HÀM TẠO FILE 13: Kiến nghị tồn đọng từ các kỳ kiểm toán trước
// -------------------------------------------------------------
async function generateFile13() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Kien_Nghi_Ton_Dong');

  const headers = [
    'Mã kiến nghị',
    'Mã phát hiện',
    'Cuộc kiểm toán gốc',
    'Năm kiểm toán',
    'Chi nhánh chịu trách nhiệm',
    'Nghiệp vụ',
    'Nội dung sai sót chi tiết',
    'Số lượng sai sót',
    'Kiến nghị kiểm toán của KTV',
    'Trách nhiệm cá nhân/tập thể',
    'Họ tên Giám đốc tại thời điểm sai phạm',
    'Hạn chót khắc phục',
    'Trạng thái khắc phục',
    'Tiến độ (%)',
    'Cán bộ phê duyệt khắc phục',
    'Ngày phê duyệt',
    'Kỳ theo dõi',
    'Đường link / Ghi chú chứng từ'
  ];
  ws.addRow(headers);

  const sampleRemediations = [
    ['REC-2025-001', 'FND-2025-TNA-01', 'Kiểm toán Toàn diện CN Tây Nghệ An năm 2025', 2025, 'Chi nhánh Tây Nghệ An', 'Kho quỹ', 'Công tác quản lý tồn quỹ tiền mặt cuối ngày vượt HMTQBQ tháng liên tục 5/17 tháng', 5, 'Chi nhánh tuân thủ chặt chẽ hạn mức tồn quỹ bình quân được giao, thực hiện điều chuyển kịp thời về Hội sở', 'Phòng Dịch vụ Khách hàng', 'Nguyễn Văn Hội', '2025-12-31', 'Đang khắc phục', 70, 'Phan Cảnh Danh', '2026-01-15', 'T01/2026', 'Đã nộp biên bản điều chuyển quỹ, đang theo dõi tháng tiếp theo'],
    ['REC-2025-002', 'FND-2025-TNA-02', 'Kiểm toán Toàn diện CN Tây Nghệ An năm 2025', 2025, 'Chi nhánh Tây Nghệ An', 'Tín dụng', 'Hồ sơ vay thiếu biên bản kiểm tra sau giải ngân định kỳ 6 tháng đối với 12 khách hàng', 12, 'Tổ chức kiểm tra thực địa, hoàn thiện toàn bộ biên bản kiểm tra sử dụng vốn vay và lưu hồ sơ tín dụng', 'Phòng Tín dụng / CBTD', 'Nguyễn Văn Hội', '2025-11-30', 'Đã khắc phục một phần', 50, 'Phan Cảnh Danh', '2026-01-20', 'T01/2026', 'Đã bổ sung 6/12 khách hàng, 6 khách hàng còn lại cam kết hoàn thành trước 31/03/2026'],
    ['REC-2025-003', 'FND-2025-HN-01', 'Kiểm toán Chuyên đề Tín dụng Doanh nghiệp CN Hà Nội', 2025, 'Chi nhánh Hà Nội', 'Tín dụng', 'Tài sản bảo đảm là quyền đòi nợ chưa đăng ký giao dịch bảo đảm tại Trung tâm giao dịch tài sản', 3, 'Khẩn trương thực hiện đăng ký biện pháp bảo đảm tại Cục Đăng ký quốc gia giao dịch bảo đảm theo quy định', 'Phòng KHDN / Pháp chế CN', 'Trần Quốc Tuấn', '2025-10-31', 'Chưa khắc phục', 20, 'Phan Cảnh Danh', '2026-01-10', 'T01/2026', 'Khách hàng đang khiếu nại tranh chấp hợp đồng gốc'],
    ['REC-2025-004', 'FND-2025-HN-02', 'Kiểm toán Toàn diện CN Hà Nội năm 2025', 2025, 'Chi nhánh Hà Nội', 'Kế toán', 'Hạch toán phân bổ chi phí sửa chữa trụ sở PGD không đúng kỳ kế toán quý 3/2025', 1, 'Thực hiện bút toán điều chỉnh kế toán đúng niên độ và trích lập dự phòng đầy đủ', 'Phòng Kế toán & DVKH', 'Trần Quốc Tuấn', '2025-12-31', 'Đã hoàn thành', 100, 'Lê Thu Hương', '2026-01-05', 'T12/2025', 'Đã kiểm tra chứng từ điều chỉnh số bút toán GL-2025-9921 hợp lệ'],
    ['REC-2025-005', 'FND-2025-TL-01', 'Kiểm toán Toàn diện CN Thăng Long năm 2025', 2025, 'Chi nhánh Thăng Long', 'Bảo lãnh', 'Phát hành cam kết bảo lãnh thực hiện hợp đồng nhưng hồ sơ năng lực nhà thầu chưa được thẩm định đầy đủ', 2, 'Rà soát lại quy trình thẩm định bảo lãnh, yêu cầu khách hàng bổ sung báo cáo tài chính kiểm toán', 'Phòng KHDN', 'Đỗ Hoàng Long', '2025-12-15', 'Đang khắc phục', 60, 'Nguyễn Thu Trang', '2026-01-18', 'T01/2026', 'Khách hàng đã nộp BCTC có kiểm toán, đang làm phụ lục rà soát'],
    ['REC-2025-006', 'FND-2025-SG-01', 'Kiểm toán Chuyên đề Tín dụng Tiêu dùng CN Sài Gòn', 2025, 'Chi nhánh Sài Gòn', 'Tín dụng', 'Hồ sơ vay mua ô tô giải ngân vào tài khoản bên bán nhưng thiếu hóa đơn giá trị gia tăng sau 30 ngày', 8, 'Thu thập đầy đủ hóa đơn GTGT điện tử hợp pháp và giấy chứng nhận đăng ký xe bản gốc', 'Phòng KHCN', 'Trịnh Minh Đức', '2025-11-15', 'Đã khắc phục một phần', 75, 'Vũ Minh Tuấn', '2026-01-22', 'T01/2026', 'Đã thu hồi 6/8 hóa đơn, 2 bộ hồ sơ xe đang chờ cấp biển số'],
    ['REC-2025-007', 'FND-2025-DN-01', 'Kiểm toán Vận hành & Kho quỹ CN Đà Nẵng', 2025, 'Chi nhánh Đà Nẵng', 'Kho quỹ', 'Camera giám sát khu vực cửa kho tiền có góc chết, dữ liệu lưu trữ chỉ đạt 20 ngày (quy định 90 ngày)', 1, 'Lắp đặt bổ sung 02 camera góc rộng và nâng cấp ổ cứng lưu trữ đầu ghi NVR đảm bảo lưu trữ tối thiểu 90 ngày', 'Phòng Vận hành & Quản trị mạng', 'Phan Thanh Sơn', '2025-10-15', 'Đã hoàn thành', 100, 'Nguyễn Thu Trang', '2025-11-01', 'T11/2025', 'Biên bản nghiệm thu thiết bị IT-DN-2025-11 kèm video xác nhận'],
    ['REC-2025-008', 'FND-2025-CT-01', 'Kiểm toán Toàn diện CN Cần Thơ năm 2025', 2025, 'Chi nhánh Cần Thơ', 'Tín dụng', 'Định giá lại tài sản bảo đảm là đất nông nghiệp trễ hạn định kỳ 12 tháng đối với 15 hợp đồng thế chấp', 15, 'Phối hợp với Phòng Định giá độc lập thực hiện khảo sát thực địa và ban hành chứng thư định giá lại', 'Phòng Khách hàng', 'Lý Tấn Phát', '2025-12-31', 'Đang khắc phục', 40, 'Vũ Minh Tuấn', '2026-02-05', 'T02/2026', 'Đã định giá lại được 6 tài sản, 9 tài sản đang khảo sát hiện trường']
  ];
  sampleRemediations.forEach(r => ws.addRow(r));

  // Format header
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF99D1C' } };
  ws.columns.forEach(c => { c.width = 22; });
  ws.getColumn(3).width = 38;
  ws.getColumn(7).width = 45;
  ws.getColumn(9).width = 45;
  ws.getColumn(18).width = 40;

  const outPath = path.join(UPLOAD_DIR, '13_Danh_Sach_Kien_Nghi_Ton_Dong_Theo_Doi_Khac_Phuc.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`   -> Đã ghi: ${outPath} (${ws.rowCount} dòng)`);
}

// -------------------------------------------------------------
// HÀM TẠO FILE 14: Chỉ số rủi ro KRI hàng tháng theo ĐVKD
// -------------------------------------------------------------
async function generateFile14() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Du_Lieu_KRI_Hang_Thang');

  const headers = [
    'Mã ĐVKD',
    'Tên ĐVKD',
    'Vùng',
    'Kỳ báo cáo',
    'Tổng dư nợ (Tỷ VNĐ)',
    'Tỷ lệ nợ xấu NPL (%)',
    'Tỷ lệ nợ nhóm 2 (%)',
    'Tăng trưởng tín dụng (%/năm)',
    'Số ngày tồn quỹ vượt HMTQ',
    'Số bút toán hủy/sửa sai',
    'Tỷ lệ nhân sự biến động (%)',
    'Điểm KRI tổng hợp',
    'Xếp hạng rủi ro KRI'
  ];
  ws.addRow(headers);

  const sampleKRIs = [
    ['VN0011000', 'Chi nhánh Hà Nội', 'Vùng 3', '2025-12', 4500.5, 1.35, 2.15, 14.5, 2, 8, 5.2, 42.5, 'Trung bình'],
    ['VN0011000', 'Chi nhánh Hà Nội', 'Vùng 3', '2026-01', 4620.0, 1.42, 2.30, 15.1, 1, 6, 4.8, 44.0, 'Trung bình'],
    ['VN0011001', 'Chi nhánh Thăng Long', 'Vùng 3', '2025-12', 3200.0, 0.95, 1.80, 12.0, 0, 4, 3.5, 32.0, 'Thấp'],
    ['VN0011001', 'Chi nhánh Thăng Long', 'Vùng 3', '2026-01', 3280.5, 0.98, 1.75, 12.8, 0, 3, 3.1, 31.5, 'Thấp'],
    ['VN0014000', 'Chi nhánh Tây Nghệ An', 'Vùng 2', '2025-12', 2850.0, 2.45, 4.10, 8.5, 5, 15, 8.5, 68.5, 'Cao'],
    ['VN0014000', 'Chi nhánh Tây Nghệ An', 'Vùng 2', '2026-01', 2890.0, 2.52, 4.25, 8.9, 4, 12, 7.8, 70.0, 'Cao'],
    ['VN0017000', 'Chi nhánh Sài Gòn', 'Vùng 5', '2025-12', 5800.0, 1.85, 3.20, 16.2, 3, 11, 9.2, 58.0, 'Trung bình'],
    ['VN0017000', 'Chi nhánh Sài Gòn', 'Vùng 5', '2026-01', 5950.0, 1.92, 3.35, 16.8, 2, 9, 8.5, 59.5, 'Trung bình'],
    ['VN0015000', 'Chi nhánh Đà Nẵng', 'Vùng 4', '2025-12', 3100.0, 1.20, 2.05, 11.5, 1, 5, 4.2, 38.0, 'Thấp'],
    ['VN0015000', 'Chi nhánh Đà Nẵng', 'Vùng 4', '2026-01', 3160.0, 1.25, 2.10, 12.0, 0, 4, 4.0, 37.5, 'Thấp'],
    ['VN0018000', 'Chi nhánh Cần Thơ', 'Vùng 6', '2025-12', 2400.0, 2.15, 3.80, 9.8, 4, 14, 6.5, 62.0, 'Cao'],
    ['VN0018000', 'Chi nhánh Cần Thơ', 'Vùng 6', '2026-01', 2440.0, 2.20, 3.90, 10.2, 3, 10, 6.1, 63.5, 'Cao'],
    ['VN0012000', 'Chi nhánh Hải Phòng', 'Vùng 1', '2025-12', 3600.0, 1.10, 1.95, 13.5, 1, 7, 5.0, 36.5, 'Thấp'],
    ['VN0012000', 'Chi nhánh Hải Phòng', 'Vùng 1', '2026-01', 3680.0, 1.15, 2.00, 14.0, 1, 5, 4.6, 37.0, 'Thấp'],
    ['VN0016000', 'Chi nhánh Đắk Lắk', 'Vùng 4', '2025-12', 2650.0, 2.65, 4.40, 7.5, 6, 18, 9.8, 74.0, 'Rất cao'],
    ['VN0016000', 'Chi nhánh Đắk Lắk', 'Vùng 4', '2026-01', 2700.0, 2.70, 4.50, 7.8, 5, 16, 9.2, 75.5, 'Rất cao']
  ];
  sampleKRIs.forEach(r => ws.addRow(r));

  // Format header
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF99D1C' } };
  ws.columns.forEach(c => { c.width = 22; });
  ws.getColumn(2).width = 30;

  const outPath = path.join(UPLOAD_DIR, '14_Du_Lieu_Chi_So_Rui_Ro_KRI_Hang_Thang.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`   -> Đã ghi: ${outPath} (${ws.rowCount} dòng)`);
}

main().catch(err => {
  console.error('LỖI THỰC THI SCRIPT:', err);
  process.exit(1);
});
