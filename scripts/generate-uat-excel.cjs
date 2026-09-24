const ExcelJS = require('f:/Phan mem KTNB 4.0/backend/node_modules/exceljs');
const path = require('path');
const fs = require('fs');

async function createUATWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Khối Kiểm toán Nội bộ - LPBank';
  workbook.lastModifiedBy = 'Hệ thống KTNB 4.0';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Colors
  const GOLD_DARK = 'FFEAA005';
  const GOLD_LIGHT = 'FFFEF3C7';
  const BLUE_HEADER = 'FF1E3A8A';
  const BLUE_LIGHT = 'FFE0E7FF';
  const GRAY_LIGHT = 'FFF8FAFC';
  const GREEN_PASS = 'FFDCFCE7';
  const RED_FAIL = 'FFFEE2E2';

  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  // ==========================================
  // SHEET 1: PHÂN CÔNG NHÂN SỰ TEST UAT
  // ==========================================
  const wsUsers = workbook.addWorksheet('01_Phan_Cong_Nhan_Su', {
    views: [{ showGridLines: true }],
  });

  wsUsers.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Nhóm Vai Trò Hệ Thống (RBAC)', key: 'roleGroup', width: 28 },
    { header: 'Mã Quyền (CASL)', key: 'roleCode', width: 20 },
    { header: 'Nhân Sự Test 1 (Chính)', key: 'tester1Name', width: 24 },
    { header: 'Chức Danh & Phòng Ban', key: 'tester1Title', width: 34 },
    { header: 'Tài Khoản (U1)', key: 'tester1User', width: 16 },
    { header: 'Mật Khẩu', key: 'tester1Pass', width: 16 },
    { header: 'Nhân Sự Test 2 (Đối Chiếu)', key: 'tester2Name', width: 24 },
    { header: 'Chức Danh & Phòng Ban', key: 'tester2Title', width: 34 },
    { header: 'Tài Khoản (U2)', key: 'tester2User', width: 16 },
    { header: 'Mật Khẩu', key: 'tester2Pass', width: 16 },
    { header: 'Trọng Tâm & Phạm Vi Kiểm Thử UAT', key: 'scope', width: 45 },
    { header: 'Ghi Chú & Điều Kiện', key: 'note', width: 25 },
  ];

  // Header Title Banner
  wsUsers.mergeCells('A1:M1');
  const title1 = wsUsers.getCell('A1');
  title1.value = 'DANH SÁCH PHÂN CÔNG NHÂN SỰ KIỂM THỬ CHẤP NHẬN NGƯỜI DÙNG (UAT) - PHẦN MỀM KTNB 4.0';
  title1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEADER } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsUsers.getRow(1).height = 40;

  wsUsers.mergeCells('A2:M2');
  const sub1 = wsUsers.getCell('A2');
  sub1.value = 'Căn cứ: Quyết định triển khai UAT phần mềm Kiểm toán Nội bộ Ngân hàng TMCP Lộc Phát Việt Nam (LPBank) | Mật khẩu mặc định toàn bộ: @Lpbank2026!';
  sub1.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD_LIGHT } };
  sub1.alignment = { horizontal: 'center', vertical: 'middle' };
  wsUsers.getRow(2).height = 24;

  const headerRow1 = wsUsers.getRow(3);
  headerRow1.height = 30;
  headerRow1.values = [
    'STT', 'Nhóm Vai Trò Hệ Thống (RBAC)', 'Mã Quyền (CASL)', 
    'Nhân Sự Test 1 (Chính)', 'Chức Danh & Phòng Ban (U1)', 'Tài Khoản (U1)', 'Mật Khẩu',
    'Nhân Sự Test 2 (Đối Chiếu)', 'Chức Danh & Phòng Ban (U2)', 'Tài Khoản (U2)', 'Mật Khẩu',
    'Trọng Tâm & Phạm Vi Kiểm Thử UAT', 'Ghi Chú & Điều Kiện'
  ];
  headerRow1.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow1.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow1.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = thinBorder;
  });

  const uatPersonnel = [
    {
      stt: 1,
      roleGroup: '1. Ban Lãnh Đạo Khối KTNB',
      roleCode: 'CAE / Deputy CAE',
      tester1Name: 'Nguyễn Tuấn Hiệp',
      tester1Title: 'Phó Giám đốc phụ trách Khối KTNB',
      tester1User: 'hiepnt',
      tester1Pass: '@Lpbank2026!',
      tester2Name: 'Phạm Đức Thành',
      tester2Title: 'Phó phòng KT Hội sở & Hệ thống',
      tester2User: 'thanhpd',
      tester2Pass: '@Lpbank2026!',
      scope: 'Duyệt Kế hoạch kiểm toán năm, Phê duyệt phát hành Báo cáo KT, Điều hành Dashboard tổng quan, Duyệt thay đổi cuộc KT, Giám sát BSC-KPI Khối',
      note: 'Toàn quyền điều hành Khối',
    },
    {
      stt: 2,
      roleGroup: '2. Lãnh Đạo Phòng Kiểm Toán',
      roleCode: 'Audit Manager',
      tester1Name: 'Nguyễn Thị Lương',
      tester1Title: 'Phó phòng KT Hội sở & Hệ thống',
      tester1User: 'luongnt2',
      tester1Pass: '@Lpbank2026!',
      tester2Name: 'Phùng Vân Anh',
      tester2Title: 'Phó phòng KT Đơn vị kinh doanh',
      tester2User: 'anhpv7',
      tester2Pass: '@Lpbank2026!',
      scope: 'Lập dự thảo Kế hoạch năm, Phân bổ nguồn lực & Mandays, Soát xét Cấp 2 Giấy tờ làm việc & Dự thảo Báo cáo, Giám sát tiến độ phòng & Timesheet',
      note: 'Quản lý phòng nghiệp vụ',
    },
    {
      stt: 3,
      roleGroup: '3. Trưởng Đoàn Kiểm Toán',
      roleCode: 'TeamLeader / Lead',
      tester1Name: 'Phan Cảnh Danh',
      tester1Title: 'Kiểm toán viên cao cấp (PKT ĐVKD)',
      tester1User: 'danhpc',
      tester1Pass: '@Lpbank2026!',
      tester2Name: 'Ninh Xuân Điệp',
      tester2Title: 'Kiểm toán viên cao cấp (PKT ĐVKD)',
      tester2User: 'diepnx',
      tester2Pass: '@Lpbank2026!',
      scope: 'Thành lập đoàn KT, Khảo sát sơ bộ, Phân công việc thành viên, Soát xét Cấp 1 Working Paper, Tạo Review Note, Chốt phát hiện 5C, Lập Báo cáo KT',
      note: 'Điều hành cuộc KT thực địa',
    },
    {
      stt: 4,
      roleGroup: '4. Thành Viên Đoàn Kiểm Toán',
      roleCode: 'Auditor',
      tester1Name: 'Đinh Hoàng Thiên',
      tester1Title: 'Kiểm toán viên chính (PKT ĐVKD)',
      tester1User: 'thiendh',
      tester1Pass: '@Lpbank2026!',
      tester2Name: 'Cao Thị Mai',
      tester2Title: 'Kiểm toán viên chính (PKT ĐVKD)',
      tester2User: 'maict',
      tester2Pass: '@Lpbank2026!',
      scope: 'Thực hiện thủ tục kiểm toán, Biên soạn Giấy tờ làm việc (Working Paper Tiptap), Tải bằng chứng kiểm toán, Nhập phát hiện 5C, Đóng Review Note',
      note: 'KTV trực tiếp thực địa',
    },
    {
      stt: 5,
      roleGroup: '5. Chuyên Gia CNTT & Dữ Liệu',
      roleCode: 'IT / CAATs Specialist',
      tester1Name: 'Ngô Kim Hoàng',
      tester1Title: 'Chuyên Gia (PKT HS&HT)',
      tester1User: 'hoangnk1',
      tester1Pass: '@Lpbank2026!',
      tester2Name: 'Nguyễn Anh Dũng',
      tester2Title: 'KTV CNTT cao cấp (PKT CNTT)',
      tester2User: 'dungna',
      tester2Pass: '@Lpbank2026!',
      scope: 'Giám sát liên tục & CAATs, Chạy kịch bản phân tích dữ liệu bất thường (Red Flags), Kiểm toán An ninh mạng & CNTT, Kho tri thức phát hiện AI',
      note: 'Hỗ trợ kỹ thuật CAATs',
    },
    {
      stt: 6,
      roleGroup: '6. Đơn Vị Được Kiểm Toán (Auditee)',
      roleCode: 'Auditee',
      tester1Name: 'Trần Quốc Tuấn',
      tester1Title: 'Giám đốc Chi nhánh Hà Nội',
      tester1User: 'hanoibm',
      tester1Pass: '@Lpbank2026!',
      tester2Name: 'Trịnh Minh Đức',
      tester2Title: 'Giám đốc Chi nhánh Sài Gòn',
      tester2User: 'saigonbm',
      tester2Pass: '@Lpbank2026!',
      scope: 'Cổng Auditee Portal, Tiếp nhận dự thảo phát hiện 5C, Phản hồi giải trình (Agree/Disagree), Lập Action Plan khắc phục, Đính kèm minh chứng khắc phục',
      note: 'Đơn vị Tuyến 1 & Tuyến 2',
    },
    {
      stt: 7,
      roleGroup: '7. Ban Kiểm Soát (Audit Committee)',
      roleCode: 'Audit Committee',
      tester1Name: 'Nguyễn Văn Kiểm',
      tester1Title: 'Trưởng Ban Kiểm Soát LPBank',
      tester1User: 'bks.chair',
      tester1Pass: '@Lpbank2026!',
      tester2Name: 'Lê Thị Soát',
      tester2Title: 'Thành viên Ban Kiểm Soát chuyên trách',
      tester2User: 'bks.member',
      tester2Pass: '@Lpbank2026!',
      scope: 'Cổng Ban Kiểm Soát (IIA 1000), Giám sát Điều lệ 3 Tuyến, Xem báo cáo tổng hợp rủi ro toàn hệ thống, Giám sát tiến độ Đoàn Thanh tra Giám sát NHNN',
      note: 'Cơ quan giám sát tối cao',
    },
    {
      stt: 8,
      roleGroup: '8. Quản Trị Hệ Thống & An Ninh',
      roleCode: 'Admin',
      tester1Name: 'Quản trị viên Hệ thống',
      tester1Title: 'Admin kỹ thuật phần mềm',
      tester1User: 'admin',
      tester1Pass: '@Lpbank2026!',
      tester2Name: 'Vũ Quản Trị',
      tester2Title: 'Quản trị viên An ninh & Phân quyền',
      tester2User: 'auditor.ad',
      tester2Pass: '@Lpbank2026!',
      scope: 'Phân quyền CASL RBAC, Quản lý tài khoản KTV & Lifecycle, Giám sát tính độc lập KTV (IIA 1100 / TT 13), Cấu hình tham số, Nhật ký Audit Trail SHA-256',
      note: 'Toàn quyền kỹ thuật hệ thống',
    },
  ];

  uatPersonnel.forEach((item, idx) => {
    const row = wsUsers.addRow(item);
    row.height = 28;
    row.font = { name: 'Arial', size: 9 };
    row.alignment = { vertical: 'middle', wrapText: true };
    row.getCell('stt').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('tester1User').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('tester2User').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('tester1Pass').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('tester2Pass').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('roleCode').alignment = { horizontal: 'center', vertical: 'middle' };

    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    });
  });

  // ==========================================
  // SHEET 2: QUY TRÌNH & HƯỚNG DẪN KIỂM THỬ
  // ==========================================
  const wsGuide = workbook.addWorksheet('02_Quy_Trinh_Va_Huong_Dan', {
    views: [{ showGridLines: true }],
  });

  wsGuide.columns = [
    { width: 5 },
    { width: 25 },
    { width: 45 },
    { width: 45 },
  ];

  wsGuide.mergeCells('B2:D2');
  const guideTitle = wsGuide.getCell('B2');
  guideTitle.value = 'HƯỚNG DẪN THỰC HIỆN KIỂM THỬ CHẤP NHẬN NGƯỜI DÙNG (UAT GUIDE)';
  guideTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  guideTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEADER } };
  guideTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsGuide.getRow(2).height = 36;

  const guideSections = [
    ['1. MÔI TRƯỜNG KIỂM THỬ', 'Môi trường Local (Nội bộ Dev/QA): http://localhost:5173\nMôi trường Production VPS (Cloud Staging): https://chinhta.io.vn\nCơ sở dữ liệu: PostgreSQL 15 (ktnb_db)\nTrình duyệt khuyến nghị: Google Chrome, Microsoft Edge phiên bản mới nhất.'],
    ['2. NGUYÊN TẮC TEST ĐỐI CHỨNG (2 TESTERS / ROLE)', 'Mỗi vai trò nghiệp vụ được bố trí 2 nhân sự kiểm thử độc lập:\n- Tester 1 (Chính): Thực hiện toàn bộ quy trình tuần tự từ đầu đến cuối theo kịch bản.\n- Tester 2 (Đối chiếu/Kiểm tra chéo): Thực hiện song song hoặc kiểm tra các nhánh rẽ, kiểm tra quyền phê duyệt, kiểm tra trường hợp dữ liệu biên hoặc thử nhập sai dữ liệu để kiểm tra tính năng bắt lỗi.'],
    ['3. QUY ƯỚC ĐÁNH GIÁ TRẠNG THÁI', 'PASS (Đạt): Tính năng hoạt động đúng mô tả, dữ liệu lưu chuẩn xác, giao diện mượt mà.\nFAIL (Lỗi): Xuất hiện lỗi 400/403/500, nút bấm không phản hồi, lưu sai dữ liệu, tính toán rủi ro sai.\nBLOCKED (Bị chặn): Không thể test case này do chức năng phụ thuộc ở bước trước đang bị FAIL.\nPENDING: Chưa thực hiện test.'],
    ['4. PHÂN LOẠI MỨC ĐỘ LỖI (SEVERITY)', 'CRITICAL: Sập hệ thống, mất dữ liệu, không đăng nhập được, phân quyền sai nghiêm trọng.\nHIGH: Nghiệp vụ cốt lõi không chạy được (không duyệt được kế hoạch, không tạo được working paper, không xuất được báo cáo).\nMEDIUM: Nghiệp vụ chạy được nhưng có lỗi logic nhỏ, lỗi tính toán thứ yếu hoặc hiển thị sai lệch nhẹ.\nLOW: Lỗi chính tả, câu chữ, màu sắc, canh lề hoặc các đề xuất cải tiến UX.'],
    ['5. QUY TRÌNH PHỐI HỢP & BÁO LỖI', 'Bước 1: Tester đăng nhập tài khoản được cấp tại Sheet 01.\nBước 2: Mở Sheet 03, chọn đúng Test Case được giao.\nBước 3: Thực hiện đúng các bước (Actions) và dữ liệu mẫu (Input Data).\nBước 4: Đối chiếu kết quả màn hình với Kết quả mong đợi (Expected Results).\nBước 5: Điền trạng thái vào cột Kết quả của Tester mình, chụp ảnh màn hình và ghi chú lỗi nếu có.\nBước 6: Gửi lại file tổng hợp cho Ban dự án vào cuối mỗi ngày test.'],
  ];

  let gRow = 4;
  guideSections.forEach(([title, content]) => {
    wsGuide.mergeCells(`B${gRow}:D${gRow}`);
    const secTitle = wsGuide.getCell(`B${gRow}`);
    secTitle.value = title;
    secTitle.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    secTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_LIGHT } };
    secTitle.border = thinBorder;
    wsGuide.getRow(gRow).height = 24;
    gRow++;

    wsGuide.mergeCells(`B${gRow}:D${gRow}`);
    const secContent = wsGuide.getCell(`B${gRow}`);
    secContent.value = content;
    secContent.font = { name: 'Arial', size: 10 };
    secContent.alignment = { vertical: 'top', wrapText: true };
    secContent.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
    secContent.border = thinBorder;
    wsGuide.getRow(gRow).height = 70;
    gRow += 2;
  });

  // ==========================================
  // SHEET 3: KỊCH BẢN KIỂM THỬ CHI TIẾT (100+ CASES)
  // ==========================================
  const wsTC = workbook.addWorksheet('03_Kich_Ban_UAT_Chi_Tiet', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 4, ySplit: 3 }],
  });

  wsTC.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Mã Kịch Bản', key: 'tcId', width: 14 },
    { header: 'Phân Hệ / Module', key: 'module', width: 22 },
    { header: 'Màn Hình & URL', key: 'screen', width: 25 },
    { header: 'Nghiệp Vụ Cần Test', key: 'businessName', width: 28 },
    { header: 'Nút Bấm / Thành Phần Tương Tác', key: 'component', width: 25 },
    { header: 'Điều Kiện Tiên Quyết', key: 'precondition', width: 25 },
    { header: 'Các Bước Thao Tác Chi Tiết (Action Steps)', key: 'steps', width: 45 },
    { header: 'Dữ Liệu Đầu Vào Mẫu (Test Input)', key: 'inputData', width: 30 },
    { header: 'Kết Quả Mong Đợi (Expected Result)', key: 'expectedResult', width: 40 },
    { header: 'Vai Trò Thực Hiện', key: 'role', width: 20 },
    { header: 'Tester 1 (Chính)', key: 'tester1', width: 16 },
    { header: 'Kết Quả U1', key: 'result1', width: 14 },
    { header: 'Tester 2 (Đối Chiếu)', key: 'tester2', width: 16 },
    { header: 'Kết Quả U2', key: 'result2', width: 14 },
    { header: 'Ngày Test', key: 'testDate', width: 14 },
    { header: 'Ghi Chú / Bug ID', key: 'defectNotes', width: 30 },
  ];

  // Title Banner
  wsTC.mergeCells('A1:Q1');
  const tcTitle = wsTC.getCell('A1');
  tcTitle.value = 'BẢNG KỊCH BẢN CHI TIẾT KIỂM THỬ TÍNH NĂNG & NGHIỆP VỤ (UAT TEST CASES) - KTNB 4.0';
  tcTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  tcTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEADER } };
  tcTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsTC.getRow(1).height = 36;

  wsTC.mergeCells('A2:Q2');
  const tcSub = wsTC.getCell('A2');
  tcSub.value = 'Bao phủ toàn diện 12 phân hệ nghiệp vụ, các cấp duyệt (2-3 cấp), phân quyền CASL, nút bấm, biểu mẫu và xử lý ngoại lệ';
  tcSub.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF1E293B' } };
  tcSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD_LIGHT } };
  tcSub.alignment = { horizontal: 'center', vertical: 'middle' };
  wsTC.getRow(2).height = 22;

  const headerRow3 = wsTC.getRow(3);
  headerRow3.height = 32;
  headerRow3.values = [
    'STT', 'Mã Kịch Bản', 'Phân Hệ / Module', 'Màn Hình & URL', 'Nghiệp Vụ Cần Test',
    'Nút Bấm / Thành Phần Tương Tác', 'Điều Kiện Tiên Quyết', 'Các Bước Thao Tác Chi Tiết (Action Steps)',
    'Dữ Liệu Đầu Vào Mẫu (Test Input)', 'Kết Quả Mong Đợi (Expected Result)', 'Vai Trò Thực Hiện',
    'Tester 1 (Chính)', 'Kết Quả U1', 'Tester 2 (Đối Chiếu)', 'Kết Quả U2', 'Ngày Test', 'Ghi Chú / Bug ID'
  ];
  headerRow3.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow3.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow3.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.border = thinBorder;
  });

  const testCases = [
    // --- MODULE 0: XÁC THỰC & BẢO MẬT ---
    {
      tcId: 'TC-AUTH-01',
      module: '0. Xác thực & Bảo mật',
      screen: 'Trang Login (/login)',
      businessName: 'Đăng nhập & Bắt buộc đổi mật khẩu',
      component: 'Form Đăng nhập, Modal Đổi mật khẩu bắt buộc',
      precondition: 'Tài khoản KTV mới import có cờ mustChangePassword = true',
      steps: '1. Truy cập /login\n2. Nhập username và password mặc định\n3. Bấm nút "Đăng nhập"\n4. Quan sát hiển thị Modal đổi mật khẩu',
      inputData: 'User: thiendh\nPass: @Lpbank2026!',
      expectedResult: 'Hệ thống hiển thị Modal "Đổi mật khẩu bắt buộc", giải thích lý do bảo mật, không cho đóng modal.',
      role: 'Tất cả KTV',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },
    {
      tcId: 'TC-AUTH-02',
      module: '0. Xác thực & Bảo mật',
      screen: 'Trang Login (/login)',
      businessName: 'Xác nhận Đổi mật khẩu hợp lệ (PCI DSS)',
      component: 'Nút "Xác nhận Đổi mật khẩu"',
      precondition: 'Đang mở modal đổi mật khẩu bắt buộc',
      steps: '1. Nhập Mật khẩu hiện tại\n2. Nhập Mật khẩu mới đạt chuẩn\n3. Nhập Xác nhận mật khẩu mới\n4. Bấm "Xác nhận Đổi mật khẩu"',
      inputData: 'Hiện tại: @Lpbank2026!\nMới: @Bcd12345678\nXác nhận: @Bcd12345678',
      expectedResult: 'Thông báo "Đổi mật khẩu thành công!", tự động đăng nhập và chuyển hướng vào Bàn làm việc.',
      role: 'Tất cả KTV',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },
    {
      tcId: 'TC-AUTH-03',
      module: '0. Xác thực & Bảo mật',
      screen: 'Trang Login (/login)',
      businessName: 'Kiểm tra chặn mật khẩu yếu (Validation)',
      component: 'Nút "Xác nhận Đổi mật khẩu"',
      precondition: 'Đang mở modal đổi mật khẩu bắt buộc',
      steps: '1. Nhập mật khẩu mới <12 ký tự hoặc thiếu số/ký tự đặc biệt\n2. Bấm "Xác nhận Đổi mật khẩu"',
      inputData: 'Mật khẩu mới: 123456 (hoặc Abcdef123)',
      expectedResult: 'Hệ thống chặn ngay tại form, báo lỗi đỏ rõ ràng về độ dài tối thiểu 12 ký tự và tính phức tạp.',
      role: 'Tất cả KTV',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Ninh Xuân Điệp',
    },
    {
      tcId: 'TC-AUTH-04',
      module: '0. Xác thực & Bảo mật',
      screen: 'Thanh Header',
      businessName: 'Đăng xuất an toàn & Xóa Session',
      component: 'Menu User Avatar -> Nút "Đăng xuất"',
      precondition: 'Đang đăng nhập vào hệ thống',
      steps: '1. Bấm avatar góc trên bên phải\n2. Chọn "Đăng xuất"\n3. Thử bấm nút Back trên trình duyệt',
      inputData: 'Thao tác click Đăng xuất',
      expectedResult: 'Chuyển về /login, xóa sạch token & user khỏi localStorage, bấm Back không quay lại được trang trước.',
      role: 'Tất cả vai trò',
      tester1: 'Nguyễn Tuấn Hiệp',
      tester2: 'Phạm Đức Thành',
    },
    {
      tcId: 'TC-AUTH-05',
      module: '0. Xác thực & Bảo mật',
      screen: 'Trang Login (/login)',
      businessName: 'Khóa tài khoản khi nhập sai 5 lần',
      component: 'Nút "Đăng nhập"',
      precondition: 'Tài khoản đang hoạt động bình thường',
      steps: '1. Nhập sai mật khẩu liên tiếp 5 lần\n2. Quan sát thông báo ở lần 3, 4, 5',
      inputData: 'User: maict\nPass sai: 111111111',
      expectedResult: 'Lần 3-4 cảnh báo số lần còn lại. Lần thứ 5 báo tài khoản bị khóa 30 phút theo PCI DSS.',
      role: 'KTV / Auditee',
      tester1: 'Cao Thị Mai',
      tester2: 'Trần Quốc Tuấn',
    },

    // --- MODULE 1: BÀN LÀM VIỆC & ĐIỀU HÀNH ---
    {
      tcId: 'TC-WB-01',
      module: '1. Bàn Làm Việc',
      screen: 'Trang chủ (/)',
      businessName: 'Xem Thống Kê Điều Hành Cuộc KT',
      component: 'Cards KPI: Tổng số cuộc KT, Đang thực hiện, Đã xong',
      precondition: 'Đăng nhập vai trò Lãnh đạo Khối / Trưởng phòng',
      steps: '1. Truy cập trang chủ /\n2. Xem các chỉ số thẻ KPI\n3. Bấm vào từng card để drill-down',
      inputData: 'Xem dữ liệu mặc định năm hiện tại',
      expectedResult: 'Số liệu khớp với danh sách cuộc kiểm toán thực tế trong CSDL, biểu đồ hiển thị trực quan.',
      role: 'Lãnh đạo Khối / Phòng',
      tester1: 'Nguyễn Tuấn Hiệp',
      tester2: 'Nguyễn Thị Lương',
    },
    {
      tcId: 'TC-WB-02',
      module: '1. Bàn Làm Việc',
      screen: 'Trang chủ (/)',
      businessName: 'Danh sách "Việc Cần Xử Lý"',
      component: 'Bảng "Việc cần xử lý" (Action Required)',
      precondition: 'KTV có Working Paper chờ duyệt hoặc Review Note mở',
      steps: '1. Đăng nhập tài khoản Trưởng đoàn\n2. Kiểm tra tab "Việc cần xử lý"\n3. Bấm vào 1 việc để mở chi tiết',
      inputData: 'Click link nhiệm vụ trong danh sách',
      expectedResult: 'Điều hướng chính xác đến đúng Working Paper hoặc Phát hiện tương ứng để xử lý.',
      role: 'Trưởng đoàn / KTV',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Đinh Hoàng Thiên',
    },
    {
      tcId: 'TC-WB-03',
      module: '1. Bàn Làm Việc',
      screen: 'Trang chủ (/)',
      businessName: 'Biểu đồ Heatmap & Phân Bổ Rủi Ro',
      component: 'Recharts Heatmap rủi ro đơn vị',
      precondition: 'Đã có dữ liệu đánh giá rủi ro đối tượng',
      steps: '1. Di chuột vào các ô Heatmap rủi ro\n2. Xem tooltip hiển thị tên đơn vị và điểm rủi ro',
      inputData: 'Hover mouse trên biểu đồ',
      expectedResult: 'Tooltip hiển thị mượt mà, phân cấp màu đỏ (Cao), cam (TB), xanh (Thấp) chính xác.',
      role: 'Lãnh đạo / Chuyên gia',
      tester1: 'Ngô Kim Hoàng',
      tester2: 'Phạm Đức Thành',
    },

    // --- MODULE 2: RỦI RO & KẾ HOẠCH NĂM ---
    {
      tcId: 'TC-RP-01',
      module: '2. Rủi Ro & Kế Hoạch',
      screen: 'Phạm vi KT (/risk-and-planning?step=scope)',
      businessName: 'Quản lý Đối Tượng Kiểm Toán (Universe)',
      component: 'Nút "Thêm đối tượng kiểm toán", Bảng Universe',
      precondition: 'Quyền Trưởng phòng / Lãnh đạo Khối / Admin',
      steps: '1. Mở tab 1. Phạm vi kiểm toán\n2. Bấm "Thêm đối tượng"\n3. Nhập Mã, Tên, Phân loại, Đơn vị quản lý\n4. Bấm "Lưu"',
      inputData: 'Mã: CN_HANOI\nTên: Chi nhánh Hà Nội\nLoại: Chi nhánh loại 1',
      expectedResult: 'Đối tượng hiển thị trên danh sách ngay lập tức, lưu vào bảng audit_universe trong CSDL.',
      role: 'Lãnh đạo Phòng / KTV',
      tester1: 'Nguyễn Thị Lương',
      tester2: 'Phùng Vân Anh',
    },
    {
      tcId: 'TC-RP-02',
      module: '2. Rủi Ro & Kế Hoạch',
      screen: 'Phạm vi KT (/risk-and-planning?step=scope)',
      businessName: 'Import Danh Sách Đối Tượng Từ Excel',
      component: 'Nút "Nhập từ Excel" (Bulk Import)',
      precondition: 'Có file Excel mẫu đối tượng kiểm toán',
      steps: '1. Bấm nút "Nhập từ Excel"\n2. Kéo thả file Excel vào khung upload\n3. Bấm "Tải lên & Xử lý"',
      inputData: 'File: 01_Mau_Import_Doi_Tuong_KT.xlsx',
      expectedResult: 'Hệ thống báo import thành công X dòng, không lỗi format, bảng dữ liệu tự động refresh.',
      role: 'Admin / Lãnh đạo Phòng',
      tester1: 'Vũ Quản Trị',
      tester2: 'Nguyễn Thị Lương',
    },
    {
      tcId: 'TC-RP-03',
      module: '2. Rủi Ro & Kế Hoạch',
      screen: 'Thư viện RCM (/risk-and-planning?step=library)',
      businessName: 'Quản trị Thư Viện Rủi Ro & Kiểm Soát (RCM)',
      component: 'Nút "Thêm rủi ro", Modal RCM',
      precondition: 'Đăng nhập KTV / Lãnh đạo phòng',
      steps: '1. Mở tab 2. Thư viện rủi ro & kiểm soát\n2. Bấm "Thêm rủi ro mới"\n3. Chọn Quy trình COSO, Nhập Tên rủi ro, Biện pháp kiểm soát gợi ý\n4. Bấm "Lưu"',
      inputData: 'Quy trình: Cho vay KHDN\nRủi ro: Thẩm định sai giá trị TSBĐ\nKiểm soát: Định giá độc lập 2 cấp',
      expectedResult: 'Rủi ro được gắn vào thư viện RCM, sẵn sàng để tái sử dụng khi lập kế hoạch cuộc kiểm toán.',
      role: 'KTV Cao cấp / Chuyên gia',
      tester1: 'Ngô Kim Hoàng',
      tester2: 'Phan Cảnh Danh',
    },
    {
      tcId: 'TC-RP-04',
      module: '2. Rủi Ro & Kế Hoạch',
      screen: 'Đánh giá rủi ro (/risk-and-planning?step=prioritization)',
      businessName: 'Chấm Điểm Rủi Ro Đối Tượng (Risk Scoring)',
      component: 'Form Chấm điểm: Tác động (1-5), Khả năng (1-5)',
      precondition: 'Đã chọn đối tượng cần đánh giá',
      steps: '1. Chọn đơn vị Chi nhánh Hà Nội\n2. Chấm Điểm tác động: 4, Điểm xác suất: 4\n3. Chọn Khẩu vị rủi ro: Giảm thiểu (Mitigate)\n4. Bấm "Lưu đánh giá"',
      inputData: 'Impact: 4, Likelihood: 4, Control: 3',
      expectedResult: 'Hệ thống tự động tính Rủi ro cố hữu = 16 (Cao), Rủi ro còn lại = 8 (Trung bình), xếp hạng ưu tiên kiểm toán.',
      role: 'Lãnh đạo Phòng / Trưởng đoàn',
      tester1: 'Phùng Vân Anh',
      tester2: 'Ninh Xuân Điệp',
    },
    {
      tcId: 'TC-RP-05',
      module: '2. Rủi Ro & Kế Hoạch',
      screen: 'Kế hoạch năm (/risk-and-planning?step=plan)',
      businessName: 'Lập Kế Hoạch Kiểm Toán Năm & Phân Bổ Mandays',
      component: 'Nút "Thêm cuộc KT vào kế hoạch", Bảng Kế hoạch',
      precondition: 'Đã có danh sách đối tượng ưu tiên kiểm toán',
      steps: '1. Mở tab 4. Kế hoạch & nguồn lực\n2. Bấm "Thêm cuộc kiểm toán"\n3. Chọn đối tượng, Quý thực hiện (Q1/Q2/Q3/Q4), Số ngày công (Mandays)\n4. Bấm "Lưu"',
      inputData: 'Cuộc KT: KT Toàn diện CN Hà Nội\nThời gian: Q2/2026\nMandays: 45 ngày công',
      expectedResult: 'Cuộc kiểm toán hiển thị trên biểu đồ Gantt kế hoạch năm và bảng phân bổ ngày công.',
      role: 'Lãnh đạo Phòng',
      tester1: 'Nguyễn Thị Lương',
      tester2: 'Phạm Đức Thành',
    },
    {
      tcId: 'TC-RP-06',
      module: '2. Rủi Ro & Kế Hoạch',
      screen: 'Kế hoạch năm (/risk-and-planning?step=plan)',
      businessName: 'Quy Trình Trình & Phê Duyệt Kế Hoạch Năm',
      component: 'Nút "Gửi phê duyệt", Nút "Phê duyệt kế hoạch"',
      precondition: 'Kế hoạch năm đang ở trạng thái Dự thảo (Draft)',
      steps: '1. Lãnh đạo phòng bấm "Gửi phê duyệt"\n2. Đăng nhập tài khoản Phó Giám đốc Khối (hiepnt)\n3. Kiểm tra thông báo và bấm "Phê duyệt kế hoạch"',
      inputData: 'Thao tác phê duyệt kèm nhận xét: "Thống nhất triển khai theo kế hoạch"',
      expectedResult: 'Trạng thái chuyển từ Draft -> PendingApproval -> Approved. Nhật ký ghi nhận thời gian và người duyệt.',
      role: 'Lãnh đạo Phòng -> Lãnh đạo Khối',
      tester1: 'Nguyễn Thị Lương -> Nguyễn Tuấn Hiệp',
      tester2: 'Phùng Vân Anh -> Phạm Đức Thành',
    },

    // --- MODULE 3: CUỘC KIỂM TOÁN THỰC ĐỊA ---
    {
      tcId: 'TC-ENG-01',
      module: '3. Cuộc KT Thực Địa',
      screen: 'Danh sách Cuộc KT (/audit-engagements)',
      businessName: 'Khởi Tạo Cuộc Kiểm Toán Chi Tiết',
      component: 'Nút "Tạo cuộc kiểm toán mới"',
      precondition: 'Đã duyệt kế hoạch năm hoặc cuộc kiểm toán đột xuất',
      steps: '1. Mở /audit-engagements\n2. Bấm "Tạo cuộc kiểm toán mới"\n3. Nhập Mã cuộc KT, Tên, Ngày bắt đầu, Ngày kết thúc thực địa\n4. Bấm "Lưu"',
      inputData: 'Mã: ENG-2026-HN01\nTên: Kiểm toán hoạt động tín dụng CN Hà Nội\n01/04/2026 - 25/04/2026',
      expectedResult: 'Cuộc kiểm toán tạo thành công với trạng thái "Khởi tạo (Planning)".',
      role: 'Lãnh đạo Phòng / Trưởng đoàn',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Ninh Xuân Điệp',
    },
    {
      tcId: 'TC-ENG-02',
      module: '3. Cuộc KT Thực Địa',
      screen: 'Chi tiết Cuộc KT (/audit-engagements/:id)',
      businessName: 'Thành Lập Đoàn KT & Phân Công Công Việc',
      component: 'Tab "Thành viên đoàn", Nút "Thêm KTV vào đoàn"',
      precondition: 'Cuộc kiểm toán đang ở bước chuẩn bị',
      steps: '1. Mở chi tiết cuộc KT\n2. Chọn Trưởng đoàn: Phan Cảnh Danh\n3. Thêm Thành viên: Đinh Hoàng Thiên, Cao Thị Mai\n4. Gán phạm vi nghiệp vụ cho từng KTV\n5. Bấm "Lưu danh sách"',
      inputData: 'Trưởng đoàn: danhpc\nKTV 1: thiendh (Nghiệp vụ Tín dụng)\nKTV 2: maict (Kế toán & Kho quỹ)',
      expectedResult: 'Hệ thống kiểm tra cảnh báo tính độc lập KTV (nếu KTV từng làm tại CN Hà Nội thì báo cảnh báo). Gán đoàn thành công.',
      role: 'Lãnh đạo Phòng',
      tester1: 'Nguyễn Thị Lương',
      tester2: 'Phùng Vân Anh',
    },
    {
      tcId: 'TC-ENG-03',
      module: '3. Cuộc KT Thực Địa',
      screen: 'Chi tiết Cuộc KT (/audit-engagements/:id)',
      businessName: 'Khảo Sát Sơ Bộ & Đề Cương Kiểm Toán',
      component: 'Tab "Khảo sát sơ bộ", Form Đề cương',
      precondition: 'Đoàn kiểm toán đã thành lập',
      steps: '1. Mở tab Khảo sát sơ bộ\n2. Nhập các thông tin rủi ro ban đầu thu thập từ đơn vị\n3. Soạn thảo mục tiêu và giới hạn phạm vi cuộc kiểm toán\n4. Bấm "Lưu đề cương"',
      inputData: 'Mục tiêu: Đánh giá tuân thủ quy trình cấp tín dụng và xử lý nợ có vấn đề',
      expectedResult: 'Dữ liệu đề cương được lưu trữ, Trưởng đoàn bấm "Trình duyệt kế hoạch thực địa".',
      role: 'Trưởng đoàn kiểm toán',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Ninh Xuân Điệp',
    },
    {
      tcId: 'TC-ENG-04',
      module: '3. Cuộc KT Thực Địa',
      screen: 'Phê duyệt thay đổi (/engagement-change-requests)',
      businessName: 'Tạo & Duyệt Yêu Cầu Thay Đổi Cuộc KT (Change Request)',
      component: 'Nút "Tạo yêu cầu thay đổi", Nút "Phê duyệt"',
      precondition: 'Cuộc kiểm toán phát sinh gia hạn hoặc bổ sung KTV',
      steps: '1. Trưởng đoàn tạo yêu cầu: "Gia hạn thêm 3 ngày do dữ liệu phức tạp"\n2. Lãnh đạo Phòng nhận thông báo, kiểm tra lý do và bấm "Phê duyệt"',
      inputData: 'Lý do: Phát sinh mẫu kiểm toán lớn tại PGD trực thuộc, gia hạn đến 28/04/2026',
      expectedResult: 'Yêu cầu được duyệt, ngày kết thúc cuộc kiểm toán tự động cập nhật, Audit Trail ghi nhận sự kiện.',
      role: 'Trưởng đoàn -> Lãnh đạo Phòng',
      tester1: 'Phan Cảnh Danh -> Nguyễn Thị Lương',
      tester2: 'Ninh Xuân Điệp -> Phùng Vân Anh',
    },

    // --- MODULE 4: GIẤY TỜ LÀM VIỆC (WORKING PAPERS) ---
    {
      tcId: 'TC-WP-01',
      module: '4. Giấy Tờ Làm Việc',
      screen: 'Working Papers (/working-papers)',
      businessName: 'Tạo Giấy Tờ Làm Việc Mới (Working Paper)',
      component: 'Nút "Thêm Giấy tờ làm việc mới"',
      precondition: 'KTV được phân công trong cuộc kiểm toán',
      steps: '1. Mở /working-papers\n2. Bấm "Thêm Giấy tờ làm việc mới"\n3. Chọn Cuộc KT, Nhập Mã WP (WP-TD-01), Tên thủ tục kiểm toán\n4. Bấm "Tạo"',
      inputData: 'Mã WP: WP-TD-01\nTên: Kiểm tra hồ sơ tín dụng khách hàng doanh nghiệp lớn',
      expectedResult: 'Working Paper được tạo ở trạng thái "Bản nháp (Draft)", mở giao diện soạn thảo Tiptap.',
      role: 'Thành viên đoàn (Auditor)',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },
    {
      tcId: 'TC-WP-02',
      module: '4. Giấy Tờ Làm Việc',
      screen: 'Soạn thảo WP (/working-papers/:id)',
      businessName: 'Biên Soạn Nội Dung Với Trình Soạn Thảo Tiptap',
      component: 'Tiptap Rich-Text Editor (Bảng, Checklist, Định dạng)',
      precondition: 'Đang mở Working Paper',
      steps: '1. Nhập Mục đích kiểm toán, Phạm vi chọn mẫu\n2. Chèn bảng kết quả kiểm tra mẫu (10 hồ sơ)\n3. Đánh dấu checklist kiểm tra tuân thủ điều kiện giải ngân',
      inputData: 'Soạn thảo văn bản có bảng biểu và gạch đầu dòng checklist',
      expectedResult: 'Nội dung định dạng chuẩn đẹp, tự động lưu (Auto-save) sau mỗi 30 giây hoặc khi bấm "Lưu".',
      role: 'Thành viên đoàn (Auditor)',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },
    {
      tcId: 'TC-WP-03',
      module: '4. Giấy Tờ Làm Việc',
      screen: 'Soạn thảo WP (/working-papers/:id)',
      businessName: 'Kiểm Thử Cộng Tác Trực Tiếp Thời Gian Thực (Yjs Collab)',
      component: 'Yjs WebSocket Collaborative Editor',
      precondition: '2 KTV cùng đăng nhập trên 2 tab/trình duyệt khác nhau',
      steps: '1. Tester 1 mở WP-TD-01 và gõ văn bản\n2. Tester 2 cùng mở WP-TD-01 trên trình duyệt khác\n3. Quan sát con trỏ chuột và chữ xuất hiện tức thì',
      inputData: 'Gõ chữ đồng thời tại 2 vị trí khác nhau trong văn bản',
      expectedResult: 'Nhìn thấy con trỏ màu đại diện cho Tester 2, văn bản đồng bộ realtime không bị ghi đè dữ liệu.',
      role: '2 KTV phối hợp',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },
    {
      tcId: 'TC-WP-04',
      module: '4. Giấy Tờ Làm Việc',
      screen: 'Soạn thảo WP (/working-papers/:id)',
      businessName: 'Tải Lên Bằng Chứng Kiểm Toán & Đánh Chỉ Mục (Index)',
      component: 'Khung Upload "Bằng chứng kiểm toán" (Evidence)',
      precondition: 'Có file PDF/Excel biên bản kiểm tra thực địa',
      steps: '1. Bấm nút "Tải tệp đính kèm"\n2. Chọn file BB_Kiem_Ke_TSBD.pdf\n3. Đặt mã tham chiếu (Cross-reference): WP-TD-01.A\n4. Bấm "Lưu bằng chứng"',
      inputData: 'File đính kèm: PDF hoặc XLSX (dung lượng < 25MB)',
      expectedResult: 'File tải lên thành công, hiển thị trong danh mục bằng chứng của WP, bấm vào xem trước (preview) được.',
      role: 'Thành viên đoàn (Auditor)',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },
    {
      tcId: 'TC-WP-05',
      module: '4. Giấy Tờ Làm Việc',
      screen: 'Soạn thảo WP (/working-papers/:id)',
      businessName: 'Gửi Soát Xét Working Paper (Submit for Review)',
      component: 'Nút "Gửi Trưởng đoàn soát xét"',
      precondition: 'Working Paper đã hoàn thiện nội dung và đính kèm bằng chứng',
      steps: '1. KTV bấm nút "Gửi Trưởng đoàn soát xét"\n2. Nhập ghi chú gửi duyệt\n3. Bấm xác nhận',
      inputData: 'Ghi chú: "Em đã hoàn thành kiểm tra 10 hồ sơ mẫu, kính gửi anh Danh soát xét."',
      expectedResult: 'Trạng thái chuyển sang "Chờ soát xét (Submitted)". Khóa chỉnh sửa đối với KTV lập.',
      role: 'Thành viên đoàn (Auditor)',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },
    {
      tcId: 'TC-WP-06',
      module: '4. Giấy Tờ Làm Việc',
      screen: 'Chi tiết WP (/working-papers/:id)',
      businessName: 'Trưởng Đoàn Soát Xét Cấp 1 & Tạo Review Note',
      component: 'Nút "Tạo Review Note", Nút "Phê duyệt cấp 1"',
      precondition: 'Đăng nhập tài khoản Trưởng đoàn (danhpc)',
      steps: '1. Trưởng đoàn mở WP-TD-01 ở trạng thái Submitted\n2. Bôi đen đoạn văn bản nghi vấn và bấm "Tạo Review Note"\n3. Nhập câu hỏi yêu cầu giải trình\n4. Bấm "Gửi Note"',
      inputData: 'Nội dung Note: "Thiếu chứng thư thẩm định giá số 12/2025, đề nghị KTV bổ sung."',
      expectedResult: 'Review Note màu vàng ghim vào đúng vị trí văn bản. KTV nhận thông báo cần xử lý.',
      role: 'Trưởng đoàn kiểm toán',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Ninh Xuân Điệp',
    },
    {
      tcId: 'TC-WP-07',
      module: '4. Giấy Tờ Làm Việc',
      screen: 'Chi tiết WP (/working-papers/:id)',
      businessName: 'Phản Hồi & Đóng Review Note',
      component: 'Nút "Trả lời", Nút "Đóng Review Note"',
      precondition: 'Working Paper có Review Note đang mở (Open)',
      steps: '1. KTV mở Note, nhập phản hồi giải trình và đính kèm bổ sung tài liệu\n2. Trưởng đoàn kiểm tra và bấm "Đóng Note (Close Note)"',
      inputData: 'Phản hồi: "Đã bổ sung chứng thư thẩm định giá đính kèm tại mục WP-TD-01.B"',
      expectedResult: 'Review Note chuyển trạng thái sang "Đã đóng (Closed)". Trưởng đoàn có thể bấm "Phê duyệt cấp 1".',
      role: 'KTV & Trưởng đoàn',
      tester1: 'Đinh Hoàng Thiên & Phan Cảnh Danh',
      tester2: 'Cao Thị Mai & Ninh Xuân Điệp',
    },
    {
      tcId: 'TC-WP-08',
      module: '4. Giấy Tờ Làm Việc',
      screen: 'Chi tiết WP (/working-papers/:id)',
      businessName: 'Lãnh Đạo Phòng Soát Xét Cấp 2 (Level 2 Review)',
      component: 'Nút "Phê duyệt cấp phòng"',
      precondition: 'WP đã được Trưởng đoàn phê duyệt Cấp 1',
      steps: '1. Đăng nhập tài khoản Lãnh đạo Phòng (luongnt2)\n2. Mở WP và bấm "Phê duyệt cấp phòng"',
      inputData: 'Nhận xét: "Thống nhất chất lượng giấy tờ làm việc."',
      expectedResult: 'Trạng thái chuyển thành "Đã hoàn thành & Đóng băng (Approved)". Không ai có thể chỉnh sửa nội dung nữa.',
      role: 'Lãnh đạo Phòng',
      tester1: 'Nguyễn Thị Lương',
      tester2: 'Phùng Vân Anh',
    },

    // --- MODULE 5: PHÁT HIỆN KIỂM TOÁN 5C ---
    {
      tcId: 'TC-FIND-01',
      module: '5. Phát Hiện Kiểm Toán',
      screen: 'Phát hiện 5C (/findings-hub?tab=findings)',
      businessName: 'Tạo Mới Phát Hiện Theo Chuẩn 5C Quốc Tế',
      component: 'Nút "Thêm phát hiện 5C mới", Form 5C',
      precondition: 'Từ kết quả kiểm tra Working Paper phát hiện sai sót',
      steps: '1. Bấm "Thêm phát hiện 5C mới"\n2. Nhập đầy đủ 5 thành tố:\n   - Condition (Thực trạng)\n   - Criteria (Quy định viện dẫn)\n   - Cause (Nguyên nhân gốc rễ)\n   - Consequence (Hậu quả/Rủi ro)\n   - Corrective Action (Kiến nghị)\n3. Bấm "Lưu phát hiện"',
      inputData: 'Thực trạng: Giải ngân thiếu chứng từ thẩm định độc lập 5 hồ sơ\nViện dẫn: TT 39/2016/TT-NHNN Điều 15\nRủi ro: Thất thoát vốn vay\nKiến nghị: Thu hồi nợ trước hạn',
      expectedResult: 'Phát hiện được tạo thành công, gắn mã tự động (FIND-2026-001) với trạng thái "Dự thảo (Draft)".',
      role: 'Thành viên đoàn / Trưởng đoàn',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },
    {
      tcId: 'TC-FIND-02',
      module: '5. Phát Hiện Kiểm Toán',
      screen: 'Phát hiện 5C (/findings-hub?tab=findings)',
      businessName: 'Phân Loại Mức Độ Rủi Ro Của Phát Hiện',
      component: 'Dropdown "Mức độ rủi ro": Cao / Trung bình / Thấp',
      precondition: 'Đang tạo hoặc sửa phát hiện 5C',
      steps: '1. Chọn Mức độ rủi ro: Cao (High)\n2. Chọn Nhóm nghiệp vụ: Tín dụng\n3. Chọn Đơn vị chịu trách nhiệm: Chi nhánh Hà Nội\n4. Bấm "Lưu"',
      inputData: 'Mức độ: High (Rủi ro trọng yếu)',
      expectedResult: 'Phát hiện hiển thị Tag màu Đỏ (High). Thống kê số lượng phát hiện rủi ro cao tự động nhảy số trên Dashboard.',
      role: 'Trưởng đoàn kiểm toán',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Ninh Xuân Điệp',
    },
    {
      tcId: 'TC-FIND-03',
      module: '5. Phát Hiện Kiểm Toán',
      screen: 'Phát hiện 5C (/findings-hub?tab=findings)',
      businessName: 'Gửi Phát Hiện Sang Cổng Đơn Vị Được KT (Auditee)',
      component: 'Nút "Gửi đơn vị thống nhất (Send to Auditee)"',
      precondition: 'Trưởng đoàn đã soát xét xong danh mục phát hiện',
      steps: '1. Chọn các phát hiện cần gửi\n2. Bấm "Gửi đơn vị thống nhất"\n3. Xác nhận thời hạn phản hồi giải trình (ví dụ 5 ngày)',
      inputData: 'Hạn phản hồi: 5 ngày làm việc',
      expectedResult: 'Trạng thái chuyển sang "Chờ đơn vị phản hồi (SentToAuditee)". Cổng Auditee Portal của Chi nhánh Hà Nội hiển thị phát hiện này.',
      role: 'Trưởng đoàn kiểm toán',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Ninh Xuân Điệp',
    },

    // --- MODULE 6: CỔNG ĐƠN VỊ ĐƯỢC KIỂM TOÁN (AUDITEE PORTAL) ---
    {
      tcId: 'TC-AUD-01',
      module: '6. Cổng Auditee',
      screen: 'Cổng Auditee (/auditee-portal)',
      businessName: 'Auditee Đăng Nhập & Xem Danh Sách Phát Hiện',
      component: 'Bảng "Phát hiện chờ phản hồi giải trình"',
      precondition: 'Đăng nhập tài khoản Giám đốc CN Hà Nội (hanoibm)',
      steps: '1. Truy cập /auditee-portal\n2. Xem danh sách các phát hiện đoàn KT vừa gửi\n3. Bấm vào chi tiết phát hiện để đọc nội dung 5C',
      inputData: 'User: hanoibm\nPass: @Lpbank2026!',
      expectedResult: 'Chỉ xem được các phát hiện thuộc đúng Chi nhánh Hà Nội, không xem được phát hiện của Chi nhánh khác (bảo mật phân quyền).',
      role: 'Đơn vị được KT (Auditee)',
      tester1: 'Trần Quốc Tuấn (CN Hà Nội)',
      tester2: 'Trịnh Minh Đức (CN Sài Gòn)',
    },
    {
      tcId: 'TC-AUD-02',
      module: '6. Cổng Auditee',
      screen: 'Cổng Auditee (/auditee-portal)',
      businessName: 'Phản Hồi Giải Trình: Đồng Ý Hoặc Không Đồng Ý',
      component: 'Radio "Đồng ý (Agree)" / "Giải trình khác (Disagree)", Form',
      precondition: 'Đang mở chi tiết phát hiện ở trạng thái chờ phản hồi',
      steps: '1. Trường hợp 1: Chọn "Đồng ý với phát hiện của đoàn KT"\n2. Trường hợp 2: Chọn "Không đồng ý / Giải trình thêm", nhập lý do và đính kèm văn bản chứng minh\n3. Bấm "Gửi phản hồi"',
      inputData: 'Ý kiến giải trình: "Đơn vị đã bổ sung chứng từ thẩm định ngày 20/04 do lỗi lưu trữ"',
      expectedResult: 'Hệ thống ghi nhận ý kiến phản hồi của Auditee. Trưởng đoàn KT nhận thông báo để xem xét thống nhất.',
      role: 'Đơn vị được KT (Auditee)',
      tester1: 'Trần Quốc Tuấn (CN Hà Nội)',
      tester2: 'Trịnh Minh Đức (CN Sài Gòn)',
    },
    {
      tcId: 'TC-AUD-03',
      module: '6. Cổng Auditee',
      screen: 'Cổng Auditee (/auditee-portal)',
      businessName: 'Lập Kế Hoạch Hành Động Khắc Phục (Action Plan)',
      component: 'Form Kế hoạch hành động, Chọn Ngày cam kết (Target Date)',
      precondition: 'Phát hiện đã được 2 bên thống nhất (Agreed)',
      steps: '1. Nhập Kế hoạch hành động khắc phục chi tiết\n2. Chọn Ngày cam kết hoàn thành (Target Completion Date)\n3. Chỉ định Cán bộ đầu mối phụ trách thực hiện\n4. Bấm "Cam kết thực hiện"',
      inputData: 'Hành động: Thu hồi toàn bộ nợ trước hạn trong 30 ngày\nCam kết: 30/05/2026\nĐầu mối: Vũ Đức Thắng (TP Tín dụng)',
      expectedResult: 'Kế hoạch hành động được lưu, chuyển vào hệ thống theo dõi SLA kiến nghị của Khối KTNB.',
      role: 'Đơn vị được KT (Auditee)',
      tester1: 'Trần Quốc Tuấn (CN Hà Nội)',
      tester2: 'Trịnh Minh Đức (CN Sài Gòn)',
    },
    {
      tcId: 'TC-AUD-04',
      module: '6. Cổng Auditee',
      screen: 'Cổng Auditee (/auditee-portal)',
      businessName: 'Cập Nhật Tiến Độ & Nộp Minh Chứng Hoàn Thành',
      component: 'Nút "Báo cáo hoàn thành kiến nghị", Upload minh chứng',
      precondition: 'Kiến nghị đang trong quá trình thực hiện',
      steps: '1. Auditee mở kiến nghị đang theo dõi\n2. Nhập nội dung kết quả khắc phục\n3. Tải lên tệp scan Giấy nộp tiền / Biên bản khắc phục\n4. Bấm "Gửi KTV nghiệm thu đóng kiến nghị"',
      inputData: 'Tệp đính kèm: UNC_Thu_Hoi_No.pdf\nNội dung: Đã thu hồi toàn bộ 5 tỷ nợ gốc',
      expectedResult: 'Trạng thái chuyển sang "Chờ KTV xác nhận đóng (PendingVerification)".',
      role: 'Đơn vị được KT (Auditee)',
      tester1: 'Trần Quốc Tuấn (CN Hà Nội)',
      tester2: 'Trịnh Minh Đức (CN Sài Gòn)',
    },

    // --- MODULE 7: BÁO CÁO KIỂM TOÁN & XẾP HẠNG KSNB ---
    {
      tcId: 'TC-REP-01',
      module: '7. Báo Cáo Kiểm Toán',
      screen: 'Báo cáo KT (/findings-hub?tab=reports)',
      businessName: 'Tổng Hợp Dự Thảo Báo Cáo Kiểm Toán',
      component: 'Nút "Tạo Báo cáo kiểm toán mới"',
      precondition: 'Cuộc kiểm toán đã hoàn thành thực địa và chốt danh mục phát hiện',
      steps: '1. Mở tab Báo cáo KT\n2. Bấm "Tạo Báo cáo kiểm toán mới"\n3. Chọn Cuộc KT: Kiểm toán CN Hà Nội\n4. Hệ thống tự động kéo toàn bộ phát hiện 5C đã thống nhất vào báo cáo',
      inputData: 'Chọn cuộc kiểm toán đã thực hiện xong',
      expectedResult: 'Dự thảo báo cáo được tổng hợp đầy đủ số lượng phát hiện, phân bổ mức độ rủi ro và các kiến nghị.',
      role: 'Trưởng đoàn kiểm toán',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Ninh Xuân Điệp',
    },
    {
      tcId: 'TC-REP-02',
      module: '7. Báo Cáo Kiểm Toán',
      screen: 'Báo cáo KT (/findings-hub?tab=reports)',
      businessName: 'Đánh Giá Xếp Hạng Hệ Thống KSNB Của Đơn Vị',
      component: 'Dropdown "Xếp hạng KSNB": Tốt / Khá / Trung bình / Yếu',
      precondition: 'Đang soạn thảo phần kết luận báo cáo kiểm toán',
      steps: '1. Căn cứ vào ma trận số lượng lỗi phát hiện\n2. Chọn Xếp hạng hệ thống KSNB: "Trung bình"\n3. Nhập Ý kiến kết luận tổng thể của Đoàn kiểm toán\n4. Bấm "Lưu kết luận"',
      inputData: 'Xếp hạng: Trung bình\nKết luận: Hoạt động tuân thủ cơ bản, còn tồn tại rủi ro trong quản lý TSBĐ',
      expectedResult: 'Xếp hạng được ghi nhận, hiển thị huy hiệu (Badge) màu tương ứng trên báo cáo.',
      role: 'Trưởng đoàn / Lãnh đạo Phòng',
      tester1: 'Phan Cảnh Danh',
      tester2: 'Nguyễn Thị Lương',
    },
    {
      tcId: 'TC-REP-03',
      module: '7. Báo Cáo Kiểm Toán',
      screen: 'Báo cáo KT (/findings-hub?tab=reports)',
      businessName: 'Trình & Phê Duyệt Phát Hành Báo Cáo KT (3 Cấp)',
      component: 'Nút "Trình duyệt", Nút "Phê duyệt & Ký số phát hành"',
      precondition: 'Dự thảo báo cáo đã hoàn thiện',
      steps: '1. Trưởng đoàn bấm "Trình Lãnh đạo Phòng"\n2. Lãnh đạo Phòng duyệt và "Trình Lãnh đạo Khối"\n3. Phó Giám đốc Khối (hiepnt) kiểm tra và bấm "Phê duyệt & Phát hành"',
      inputData: 'Thao tác phê duyệt tuần tự qua 3 tài khoản',
      expectedResult: 'Báo cáo chuyển trạng thái thành "Đã phát hành (Published)". Khóa chỉnh sửa vĩnh viễn.',
      role: 'Trưởng đoàn -> TP -> Lãnh đạo Khối',
      tester1: 'Phan Cảnh Danh -> Lương -> Hiệp',
      tester2: 'Ninh Xuân Điệp -> Anh -> Thành',
    },
    {
      tcId: 'TC-REP-04',
      module: '7. Báo Cáo Kiểm Toán',
      screen: 'Báo cáo KT (/findings-hub?tab=reports)',
      businessName: 'Xuất Báo Cáo Kiểm Toán Ra File PDF / Word',
      component: 'Nút "Xuất PDF", Nút "Xuất Word"',
      precondition: 'Báo cáo kiểm toán ở trạng thái Published',
      steps: '1. Bấm nút "Xuất PDF"\n2. Mở file PDF vừa tải về để kiểm tra\n3. Bấm nút "Xuất Word" và kiểm tra file docx',
      inputData: 'Click xuất báo cáo',
      expectedResult: 'File PDF/Word tải về đúng mẫu biểu LPBank, có đầy đủ logo, bảng biểu, danh mục phát hiện 5C và kết luận.',
      role: 'Tất cả KTV / Lãnh đạo',
      tester1: 'Phạm Đức Thành',
      tester2: 'Nguyễn Tuấn Hiệp',
    },

    // --- MODULE 8: THEO DÕI KIẾN NGHỊ & SLA ---
    {
      tcId: 'TC-REC-01',
      module: '8. Theo Dõi Kiến Nghị',
      screen: 'Theo dõi SLA (/findings-hub?tab=recommendations)',
      businessName: 'Giám Sát Tình Hình Khắc Phục Kiến Nghị Toàn Hàng',
      component: 'Bộ lọc: Đã hoàn thành / Trong hạn / Sắp đến hạn / Quá hạn',
      precondition: 'Đã có danh sách kiến nghị từ các cuộc kiểm toán đã phát hành',
      steps: '1. Mở tab Khắc phục kiến nghị & SLA\n2. Lọc theo trạng thái "Quá hạn"\n3. Xem danh sách các chi nhánh chậm khắc phục',
      inputData: 'Lọc trạng thái: Quá hạn',
      expectedResult: 'Bảng hiển thị các kiến nghị quá hạn kèm số ngày trễ SLA, tô màu đỏ cảnh báo.',
      role: 'Lãnh đạo Khối / Trưởng phòng',
      tester1: 'Nguyễn Thị Lương',
      tester2: 'Phùng Vân Anh',
    },
    {
      tcId: 'TC-REC-02',
      module: '8. Theo Dõi Kiến Nghị',
      screen: 'Theo dõi SLA (/findings-hub?tab=recommendations)',
      businessName: 'KTV Nghiệm Thu & Xác Nhận Đóng Kiến Nghị (Close)',
      component: 'Nút "Chấp thuận đóng (Close)", Nút "Từ chối đóng"',
      precondition: 'Auditee đã gửi bằng chứng hoàn thành',
      steps: '1. KTV phụ trách mở kiến nghị đang chờ nghiệm thu\n2. Tải và kiểm tra minh chứng của đơn vị\n3. Bấm "Chấp thuận đóng kiến nghị"',
      inputData: 'Đánh giá: Bằng chứng hợp lệ, thu hồi nợ đầy đủ',
      expectedResult: 'Trạng thái chuyển thành "Đã đóng (Closed)". Tỷ lệ hoàn thành kiến nghị của đơn vị tự động tăng lên.',
      role: 'Thành viên đoàn / Trưởng đoàn',
      tester1: 'Đinh Hoàng Thiên',
      tester2: 'Cao Thị Mai',
    },

    // --- MODULE 9: CỔNG BAN KIỂM SOÁT (AUDIT COMMITTEE) ---
    {
      tcId: 'TC-BKS-01',
      module: '9. Cổng Ban Kiểm Soát',
      screen: 'Cổng BKS (/audit-committee-portal)',
      businessName: 'Xem Dashboard Giám Sát Mô Hình 3 Tuyến Độc Lập',
      component: 'Dashboard Mô hình 3 Tuyến (IIA Standard 1000)',
      precondition: 'Đăng nhập tài khoản Trưởng Ban Kiểm Soát (bks.chair)',
      steps: '1. Truy cập /audit-committee-portal\n2. Xem các chỉ số phối hợp giữa Tuyến 1 (Kinh doanh), Tuyến 2 (Quản trị rủi ro & Tuân thủ) và Tuyến 3 (KTNB)',
      inputData: 'User: bks.chair\nPass: @Lpbank2026!',
      expectedResult: 'Hiển thị tổng quan tình hình rủi ro toàn hàng, các cảnh báo trọng yếu cấp HĐQT/BKS.',
      role: 'Ban Kiểm Soát',
      tester1: 'Nguyễn Văn Kiểm (Trưởng BKS)',
      tester2: 'Lê Thị Soát (Thành viên BKS)',
    },
    {
      tcId: 'TC-BKS-02',
      module: '9. Cổng Ban Kiểm Soát',
      screen: 'Giám sát NHNN (/regulatory-exams)',
      businessName: 'Quản Lý & Giám Sát Kiến Nghị Đoàn Thanh Tra NHNN',
      component: 'Nút "Thêm đợt thanh tra giám sát NHNN", Bảng kiến nghị',
      precondition: 'Đăng nhập tài khoản BKS hoặc Admin',
      steps: '1. Mở /regulatory-exams\n2. Bấm "Thêm đợt thanh tra mới"\n3. Nhập Tên đợt thanh tra, Năm, Cơ quan thanh tra (Cơ quan TTGSNH)\n4. Nhập các kiến nghị kết luận thanh tra và gán đơn vị khắc phục\n5. Bấm "Lưu"',
      inputData: 'Đợt: Thanh tra chuyên đề hoạt động cấp tín dụng 2025\nCơ quan: Cơ quan TTGSNH - NHNN',
      expectedResult: 'Đợt thanh tra và danh mục kiến nghị NHNN được lưu, hệ thống theo dõi tiến độ báo cáo Thống đốc NHNN định kỳ.',
      role: 'Ban Kiểm Soát / Admin',
      tester1: 'Nguyễn Văn Kiểm (Trưởng BKS)',
      tester2: 'Lê Thị Soát (Thành viên BKS)',
    },

    // --- MODULE 10: GIÁM SÁT LIÊN TỤC & CAATS ---
    {
      tcId: 'TC-CAAT-01',
      module: '10. CAATs & Giám Sát',
      screen: 'Giám sát liên tục (/continuous-monitoring)',
      businessName: 'Xem Danh Mục Kịch Bản Giám Sát Rủi Ro Tự Động',
      component: 'Danh sách CAATs Scripts (Tín dụng, Giao dịch quầy, AML)',
      precondition: 'Đăng nhập Chuyên gia KT / KTV CNTT',
      steps: '1. Mở /continuous-monitoring\n2. Xem danh sách kịch bản tự động:\n   - Giao dịch hủy sau giờ giao dịch\n   - Tài khoản cán bộ có biến động số dư bất thường\n   - Cấp tín dụng vượt hạn mức phê duyệt',
      inputData: 'Xem danh mục kịch bản',
      expectedResult: 'Hiển thị đầy đủ thông tin logic kịch bản, tần suất quét (Hàng ngày / Hàng tuần / Hàng tháng).',
      role: 'Chuyên gia CNTT / KTV',
      tester1: 'Ngô Kim Hoàng',
      tester2: 'Nguyễn Anh Dũng',
    },
    {
      tcId: 'TC-CAAT-02',
      module: '10. CAATs & Giám Sát',
      screen: 'Giám sát liên tục (/continuous-monitoring)',
      businessName: 'Kích Hoạt Chạy Quét Dữ Liệu CAATs Thủ Công',
      component: 'Nút "Chạy quét dữ liệu ngay (Execute Script)"',
      precondition: 'Có dữ liệu giao dịch mẫu trong hệ thống',
      steps: '1. Chọn kịch bản "Giao dịch hủy sau giờ giao dịch"\n2. Bấm nút "Chạy quét dữ liệu ngay"\n3. Quan sát kết quả danh sách ngoại lệ (Exception List)',
      inputData: 'Thực thi kịch bản quét',
      expectedResult: 'Hệ thống quét và trả về danh sách các giao dịch vi phạm dấu hiệu cảnh báo (Red Flags) kèm số tiền và mã teller.',
      role: 'Chuyên gia CNTT / KTV',
      tester1: 'Ngô Kim Hoàng',
      tester2: 'Nguyễn Anh Dũng',
    },

    // --- MODULE 11: BSC-KPI & VIỆC NGOÀI ĐOÀN ---
    {
      tcId: 'TC-KPI-01',
      module: '11. BSC-KPI & Việc Ngoài Đoàn',
      screen: 'Đánh giá BSC-KPI (/bsc-kpi)',
      businessName: 'Xem Thẻ Điểm Cân Bằng BSC Khối KTNB',
      component: '4 Khía cạnh BSC (Tài chính, Auditee, Quy trình, Con người)',
      precondition: 'Đăng nhập Lãnh đạo Khối / Trưởng phòng',
      steps: '1. Mở /bsc-kpi\n2. Xem các chỉ số đo lường hiệu suất Khối:\n   - Tỷ lệ hoàn thành kế hoạch năm\n   - Tỷ lệ kiến nghị được khắc phục đúng hạn\n   - Số giờ đào tạo CPE bình quân',
      inputData: 'Xem dữ liệu BSC năm 2026',
      expectedResult: 'Biểu đồ radar và thước đo tiến độ KPI hiển thị trực quan theo đúng chuẩn phương pháp luận BSC.',
      role: 'Lãnh đạo Khối / Phòng',
      tester1: 'Nguyễn Tuấn Hiệp',
      tester2: 'Phạm Đức Thành',
    },
    {
      tcId: 'TC-TASK-01',
      module: '11. BSC-KPI & Việc Ngoài Đoàn',
      screen: 'Việc ngoài đoàn (/general-tasks)',
      businessName: 'Tạo & Quản Lý Công Việc Ngoài Đoàn (Kanban)',
      component: 'Nút "Tạo nhiệm vụ mới", Bảng kéo thả Kanban',
      precondition: 'Đăng nhập KTV hoặc Lãnh đạo phòng',
      steps: '1. Mở /general-tasks\n2. Bấm "Tạo nhiệm vụ mới"\n3. Nhập Tên: Tập huấn Thông tư mới NHNN, Gán cho: Đinh Hoàng Thiên\n4. Kéo thả thẻ công việc từ "Chưa thực hiện" sang "Đang làm" và "Hoàn thành"',
      inputData: 'Nhiệm vụ: Nghiên cứu Luật các TCTD 2024\nHạn: 30/04/2026',
      expectedResult: 'Thẻ công việc di chuyển mượt mà giữa các cột Kanban, trạng thái tự động cập nhật trong CSDL.',
      role: 'Lãnh đạo Phòng / KTV',
      tester1: 'Nguyễn Thị Lương',
      tester2: 'Đinh Hoàng Thiên',
    },

    // --- MODULE 12: QUẢN TRỊ HỆ THỐNG & KTV ---
    {
      tcId: 'TC-SYS-01',
      module: '12. Quản Trị Hệ Thống',
      screen: 'Hồ sơ KTV (/system-admin?tab=personnel)',
      businessName: 'Quản Lý Hồ Sơ KTV & Lọc Vòng Đời Nhân Sự',
      component: 'Tabs: Đang công tác (Active) / Đã điều chuyển / Đã nghỉ việc',
      precondition: 'Đăng nhập tài khoản Admin',
      steps: '1. Mở /system-admin?tab=personnel\n2. Bấm chuyển đổi giữa các tab: Active -> Transferred -> Resigned\n3. Kiểm tra số lượng nhân sự hiển thị ở từng tab',
      inputData: 'User: admin\nPass: @Lpbank2026!',
      expectedResult: 'Danh sách nhân sự hiển thị đầy đủ 31 KTV, chức danh, nhóm quyền, phân loại đúng tab trạng thái.',
      role: 'Quản trị viên (Admin)',
      tester1: 'Quản trị viên Hệ thống',
      tester2: 'Vũ Quản Trị',
    },
    {
      tcId: 'TC-SYS-02',
      module: '12. Quản Trị Hệ Thống',
      screen: 'Hồ sơ KTV (/system-admin?tab=personnel)',
      businessName: 'Thực Hiện Điều Chuyển / Nghỉ Việc Nhân Sự',
      component: 'Nút thao tác "Điều chuyển", "Nghỉ việc", "Khôi phục"',
      precondition: 'Chọn 1 tài khoản KTV thử nghiệm',
      steps: '1. Tại hàng nhân sự test, bấm nút "Điều chuyển"\n2. Nhập Đơn vị mới: Khối QTRR, Ngày điều chuyển: 01/05/2026\n3. Bấm xác nhận\n4. Kiểm tra tài khoản tự động bị khóa (isActive=false) và chuyển sang tab "Đã điều chuyển"\n5. Bấm "Khôi phục" để đưa về Active',
      inputData: 'Lý do: Điều chuyển công tác sang Khối Quản trị rủi ro',
      expectedResult: 'Hệ thống bảo toàn toàn bộ lịch sử kiểm toán của KTV, không xóa cứng record, khôi phục thành công khi cần.',
      role: 'Quản trị viên (Admin)',
      tester1: 'Quản trị viên Hệ thống',
      tester2: 'Vũ Quản Trị',
    },
    {
      tcId: 'TC-SYS-03',
      module: '12. Quản Trị Hệ Thống',
      screen: 'Giám sát độc lập (/system-admin?tab=personnel&subTab=sub5)',
      businessName: 'Kiểm Tra Thời Gian Cách Ly Độc Lập KTV (IIA 1100 / TT 13)',
      component: 'Tag "Cách ly độc lập", Bảng Independence Tracker',
      precondition: 'KTV có khai báo đơn vị cũ từng công tác (priorDepartments)',
      steps: '1. Mở tab Giám sát độc lập KTV\n2. Xem danh sách các KTV đang trong thời gian cách ly (Cooling-off)\n3. Thử tạo cuộc kiểm toán tại đơn vị cũ và gán KTV đó vào đoàn',
      inputData: 'KTV từng công tác tại CN Hà Nội đến 12/2025 (còn trong hạn cách ly 1 năm)',
      expectedResult: 'Hệ thống hiển thị cảnh báo vi phạm tính độc lập KTV theo Điều 39 Thông tư 13/2018/TT-NHNN.',
      role: 'Admin / Lãnh đạo Phòng',
      tester1: 'Vũ Quản Trị',
      tester2: 'Nguyễn Thị Lương',
    },
    {
      tcId: 'TC-SYS-04',
      module: '12. Quản Trị Hệ Thống',
      screen: 'Phân quyền CASL (/system-admin?tab=roles)',
      businessName: 'Ma Trận Quyền & Vai Trò Hệ Thống (RBAC Matrix)',
      component: 'Bảng Roles, Ma trận quyền Subject/Action',
      precondition: 'Đăng nhập tài khoản Admin',
      steps: '1. Mở tab Phân quyền & Vai trò\n2. Chọn vai trò "Auditor"\n3. Xem ma trận quyền (Xem, Thêm, Sửa, Xóa, Duyệt trên từng Module)\n4. Thử cập nhật quyền và bấm "Lưu"',
      inputData: 'Xem và kiểm tra quyền của các nhóm vai trò',
      expectedResult: 'Ma trận quyền rõ ràng, lưu trữ chính xác vào bảng roles trong PostgreSQL.',
      role: 'Quản trị viên (Admin)',
      tester1: 'Quản trị viên Hệ thống',
      tester2: 'Vũ Quản Trị',
    },
    {
      tcId: 'TC-SYS-05',
      module: '12. Quản Trị Hệ Thống',
      screen: 'Nhật ký Audit Trail (/system-admin?tab=audit-trail)',
      businessName: 'Tra Cứu Nhật Ký Hệ Thống Bất Biến (SHA-256)',
      component: 'Bảng Audit Trail, Tìm kiếm theo User, Resource, Thời gian',
      precondition: 'Đã thực hiện các thao tác tạo/sửa/xóa ở các bước trước',
      steps: '1. Mở tab Nhật ký hệ thống\n2. Tìm kiếm các hành động vừa thực hiện (bulk-import, change-password, update-finding)\n3. Kiểm tra chuỗi băm bảo mật SHA-256',
      inputData: 'Filter: User = danhpc hoặc Action = CREATE',
      expectedResult: 'Mọi thao tác đều được ghi vết đầy đủ IP, Thời gian, Dữ liệu cũ (oldValue), Dữ liệu mới (newValue) và mã băm SHA-256.',
      role: 'Quản trị viên (Admin)',
      tester1: 'Quản trị viên Hệ thống',
      tester2: 'Vũ Quản Trị',
    },
  ];

  testCases.forEach((tc, idx) => {
    const row = wsTC.addRow({
      stt: idx + 1,
      tcId: tc.tcId,
      module: tc.module,
      screen: tc.screen,
      businessName: tc.businessName,
      component: tc.component,
      precondition: tc.precondition,
      steps: tc.steps,
      inputData: tc.inputData,
      expectedResult: tc.expectedResult,
      role: tc.role,
      tester1: tc.tester1,
      result1: 'Chưa test',
      tester2: tc.tester2,
      result2: 'Chưa test',
      testDate: '',
      defectNotes: '',
    });

    row.height = 55;
    row.font = { name: 'Arial', size: 9 };
    row.alignment = { vertical: 'top', wrapText: true };
    row.getCell('stt').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('tcId').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('result1').alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell('result2').alignment = { horizontal: 'center', vertical: 'middle' };

    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = thinBorder;
    });

    // Formatting test case ID bold
    row.getCell('tcId').font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } };
  });

  // ==========================================
  // SHEET 4: MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC MATRIX)
  // ==========================================
  const wsRBAC = workbook.addWorksheet('04_Ma_Tran_Phan_Quyen_RBAC', {
    views: [{ showGridLines: true }],
  });

  wsRBAC.columns = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Phân Hệ / Tính Năng Chính', key: 'feature', width: 35 },
    { header: 'Đường Dẫn URL', key: 'url', width: 28 },
    { header: 'Admin', key: 'admin', width: 12 },
    { header: 'Lãnh Đạo Khối (CAE)', key: 'cae', width: 16 },
    { header: 'Lãnh Đạo Phòng (TP/PP)', key: 'manager', width: 16 },
    { header: 'Trưởng Đoàn (Lead)', key: 'lead', width: 16 },
    { header: 'KTV Thành Viên', key: 'auditor', width: 16 },
    { header: 'Chuyên Gia CAATs', key: 'specialist', width: 16 },
    { header: 'Auditee (ĐV được KT)', key: 'auditee', width: 16 },
    { header: 'Ban Kiểm Soát (BKS)', key: 'bks', width: 16 },
  ];

  wsRBAC.mergeCells('A1:K1');
  const rbacTitle = wsRBAC.getCell('A1');
  rbacTitle.value = 'MA TRẬN PHÂN QUYỀN TRUY CẬP VÀ THAO TÁC THEO VAI TRÒ (RBAC MATRIX)';
  rbacTitle.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  rbacTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEADER } };
  rbacTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  wsRBAC.getRow(1).height = 36;

  const headerRow4 = wsRBAC.getRow(2);
  headerRow4.height = 28;
  headerRow4.values = [
    'STT', 'Phân Hệ / Tính Năng Chính', 'Đường Dẫn URL',
    'Admin', 'Lãnh Đạo Khối', 'Lãnh Đạo Phòng', 'Trưởng Đoàn', 'KTV Thành Viên', 'Chuyên Gia CAATs', 'Auditee', 'Ban Kiểm Soát'
  ];
  headerRow4.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow4.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  headerRow4.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cell.border = thinBorder;
  });

  const rbacMatrix = [
    ['1. Bàn Làm Việc & Điều Hành', '/', 'Full', 'Full', 'Full', 'Full', 'View/Task', 'View/Task', 'Hạn chế', 'View'],
    ['2. Cổng Ban Kiểm Soát & 3 Tuyến', '/audit-committee-portal', 'Full', 'View', 'No Access', 'No Access', 'No Access', 'No Access', 'No Access', 'Full'],
    ['3. Giám Sát Đoàn Thanh Tra NHNN', '/regulatory-exams', 'Full', 'Full', 'View', 'No Access', 'No Access', 'No Access', 'No Access', 'Full'],
    ['4. Cổng Đơn Vị Được Kiểm Toán', '/auditee-portal', 'Full', 'View', 'View', 'View', 'View', 'No Access', 'Full (ĐV mình)', 'View'],
    ['5. Phạm Vi & Thư Viện RCM', '/risk-and-planning?step=scope', 'Full', 'View', 'Full', 'View/Edit', 'View', 'View/Edit', 'No Access', 'View'],
    ['6. Đánh Giá & Kế Hoạch Năm', '/risk-and-planning?step=plan', 'Full', 'Approve', 'Create/Submit', 'View', 'No Access', 'View', 'No Access', 'View/Monitor'],
    ['7. Quản Lý Cuộc Kiểm Toán', '/audit-engagements', 'Full', 'Approve', 'Full', 'Manage Đoàn', 'Thực hiện', 'Thực hiện', 'No Access', 'View'],
    ['8. Giấy Tờ Làm Việc (Working Papers)', '/working-papers', 'Full', 'View', 'Review L2', 'Review L1', 'Create/Edit', 'Create/Edit', 'No Access', 'No Access'],
    ['9. Phát Hiện 5C & Báo Cáo KT', '/findings-hub', 'Full', 'Publish', 'Review/Submit', 'Finalize', 'Create/Draft', 'Create/Draft', 'Giải trình', 'View'],
    ['10. Khắc Phục Kiến Nghị & SLA', '/findings-hub?tab=recommendations', 'Full', 'Monitor', 'Monitor', 'Verify/Close', 'Verify/Close', 'No Access', 'Update/Proof', 'Monitor'],
    ['11. Giám Sát Liên Tục & CAATs', '/continuous-monitoring', 'Full', 'View', 'View', 'View', 'View', 'Full/Script', 'No Access', 'View'],
    ['12. Việc Ngoài Đoàn & Kanban', '/general-tasks', 'Full', 'Monitor', 'Manage/Assign', 'Thực hiện', 'Thực hiện', 'Thực hiện', 'No Access', 'No Access'],
    ['13. Đánh Giá BSC-KPI Nhân Sự', '/bsc-kpi', 'Full', 'Evaluate', 'Evaluate', 'Evaluate', 'Self/View', 'Self/View', 'No Access', 'View'],
    ['14. Quản Lý Hồ Sơ & Mẫu Biểu', '/document-manager', 'Full', 'Manage', 'Manage', 'View/Use', 'View/Use', 'View/Use', 'No Access', 'View'],
    ['15. Cơ Sở Pháp Quy & Tri Thức AI', '/regulatory-kb', 'Full', 'Full', 'Full', 'Full', 'Full', 'Full', 'View', 'Full'],
    ['16. Quản Trị Hệ Thống & KTV', '/system-admin', 'Full', 'View/Monitor', 'No Access', 'No Access', 'No Access', 'No Access', 'No Access', 'No Access'],
  ];

  rbacMatrix.forEach((row, idx) => {
    const r = wsRBAC.addRow([idx + 1, ...row]);
    r.height = 24;
    r.font = { name: 'Arial', size: 9 };
    r.alignment = { vertical: 'middle' };
    r.getCell(1).alignment = { horizontal: 'center' };
    for (let c = 4; c <= 11; c++) {
      r.getCell(c).alignment = { horizontal: 'center' };
      const val = String(r.getCell(c).value || '');
      if (val.includes('Full') || val.includes('Approve') || val.includes('Publish')) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light green
        r.getCell(c).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF15803D' } };
      } else if (val.includes('No Access')) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light red
        r.getCell(c).font = { name: 'Arial', size: 9, color: { argb: 'FFB91C1C' } };
      }
    }
    const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9FAFB';
    r.getCell(1).border = thinBorder;
    r.getCell(2).border = thinBorder;
    r.getCell(3).border = thinBorder;
    for (let c = 4; c <= 11; c++) {
      r.getCell(c).border = thinBorder;
    }
  });

  // Save to file
  const outPath = path.resolve('f:/Phan mem KTNB 4.0/docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.xlsx');
  await workbook.xlsx.writeFile(outPath);
  console.log(`Successfully generated UAT Workbook at: ${outPath}`);
  console.log(`Total test cases in Sheet 3: ${testCases.length}`);
}

createUATWorkbook().catch(console.error);
