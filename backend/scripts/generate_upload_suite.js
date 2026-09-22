const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const uploadDir = path.resolve(__dirname, '../../docs/THUCTE/UPLOAD');
const thucTeDir = path.resolve(__dirname, '../../docs/THUCTE');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function writeExcel(filename, sheetName, data, colWidths = []) {
  const ws = XLSX.utils.json_to_sheet(data);
  if (colWidths.length > 0) {
    ws['!cols'] = colWidths.map(w => ({ wch: w }));
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const filePath = path.join(uploadDir, filename);
  XLSX.writeFile(wb, filePath);
  console.log(`✅ Created: ${filename} (${data.length} records)`);
}

// ═══════════════════════════════════════════════════════════════════
// 1. FILE: 02_Danh_Sach_Nhan_Su_KTV_LPBank.xlsx (Module: users / personnel)
// ═══════════════════════════════════════════════════════════════════
const personnelData = [
  {
    'Mã nhân viên': 'LPB-KT001',
    'Tên đăng nhập': 'danhpc',
    'Họ và tên': 'Phan Cảnh Danh',
    'Email': 'danhpc@lpbank.com.vn',
    'Số điện thoại': '0912345678',
    'Phòng ban': 'Phòng Kiểm toán Nghiệp vụ 1',
    'Chức danh': 'Kiểm toán viên cao cấp',
    'Vai trò': 'Trưởng đoàn',
    'Nơi làm việc': 'Hội sở Hà Nội',
  },
  {
    'Mã nhân viên': 'LPB-KT002',
    'Tên đăng nhập': 'haikd',
    'Họ và tên': 'Khổng Duy Hải',
    'Email': 'haikd@lpbank.com.vn',
    'Số điện thoại': '0912345679',
    'Phòng ban': 'Phòng Kiểm toán Nghiệp vụ 1',
    'Chức danh': 'Trưởng phòng KTNV 1',
    'Vai trò': 'Trưởng đoàn',
    'Nơi làm việc': 'Hội sở Hà Nội',
  },
  {
    'Mã nhân viên': 'LPB-KT003',
    'Tên đăng nhập': 'thoht',
    'Họ và tên': 'Hoàng Thị Thơ',
    'Email': 'thoht@lpbank.com.vn',
    'Số điện thoại': '0912345680',
    'Phòng ban': 'Phòng Kiểm toán Nghiệp vụ 2',
    'Chức danh': 'Kiểm toán viên chính',
    'Vai trò': 'Kiểm toán viên',
    'Nơi làm việc': 'Hội sở Hà Nội',
  },
  {
    'Mã nhân viên': 'LPB-KT004',
    'Tên đăng nhập': 'anhlt32',
    'Họ và tên': 'Lê Thị Ánh',
    'Email': 'anhlt32@lpbank.com.vn',
    'Số điện thoại': '0912345681',
    'Phòng ban': 'Phòng Kiểm toán Nghiệp vụ 2',
    'Chức danh': 'Kiểm toán viên',
    'Vai trò': 'Kiểm toán viên',
    'Nơi làm việc': 'Hội sở Hà Nội',
  },
  {
    'Mã nhân viên': 'LPB-KT005',
    'Tên đăng nhập': 'binhph',
    'Họ và tên': 'Phạm Hải Bình',
    'Email': 'binhph@lpbank.com.vn',
    'Số điện thoại': '0912345682',
    'Phòng ban': 'Phòng Kiểm toán CNTT',
    'Chức danh': 'Chuyên gia Kiểm toán CNTT',
    'Vai trò': 'Kiểm toán viên',
    'Nơi làm việc': 'Hội sở Hà Nội',
  },
  {
    'Mã nhân viên': 'LPB-KT006',
    'Tên đăng nhập': 'nguyenvana',
    'Họ và tên': 'Nguyễn Văn An',
    'Email': 'nguyenvana@lpbank.com.vn',
    'Số điện thoại': '0912345683',
    'Phòng ban': 'Phòng Kiểm toán Nghiệp vụ 1',
    'Chức danh': 'Kiểm toán viên',
    'Vai trò': 'Kiểm toán viên',
    'Nơi làm việc': 'Chi nhánh Thái Bình',
  },
  {
    'Mã nhân viên': 'LPB-KT007',
    'Tên đăng nhập': 'tranthib',
    'Họ và tên': 'Trần Thị Bích',
    'Email': 'tranthib@lpbank.com.vn',
    'Số điện thoại': '0912345684',
    'Phòng ban': 'Phòng Kiểm toán Nghi vụ 2',
    'Chức danh': 'Kiểm toán viên',
    'Vai trò': 'Kiểm toán viên',
    'Nơi làm việc': 'Chi nhánh Tây Nghệ An',
  },
  {
    'Mã nhân viên': 'LPB-KT008',
    'Tên đăng nhập': 'lethic',
    'Họ và tên': 'Lê Thị Cúc',
    'Email': 'lethic@lpbank.com.vn',
    'Số điện thoại': '0912345685',
    'Phòng ban': 'Phòng Kiểm toán Giám sát từ xa',
    'Chức danh': 'Chuyên viên Phân tích Dữ liệu',
    'Vai trò': 'Kiểm toán viên',
    'Nơi làm việc': 'Hội sở Hà Nội',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 2. FILE: 03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx (Module: audit-universe)
// ═══════════════════════════════════════════════════════════════════
const universeData = [
  {
    'Tên quy trình / hoạt động': 'Kiểm toán toàn diện Chi nhánh Thái Bình',
    'Đơn vị phụ trách': 'Chi nhánh Thái Bình',
    'Mã đơn vị phụ trách': 'CN_THAIBINH',
    'Phân loại': 'ChiNhanh',
    'Quy mô tài sản/GD (1–10)': 8,
    'Rủi ro vận hành T2 (1–10)': 7,
    'Sai phạm lịch sử (1–10)': 6,
    'Ngày kiểm toán gần nhất': '2025-06-15',
    'Năm KT tiếp theo': 2026,
    'Phòng KTNB phụ trách': 'PKT_DVKD',
    'Tuyến phòng thủ': 'Tuyen1',
  },
  {
    'Tên quy trình / hoạt động': 'Kiểm toán toàn diện Chi nhánh Tây Nghệ An',
    'Đơn vị phụ trách': 'Chi nhánh Tây Nghệ An',
    'Mã đơn vị phụ trách': 'CN_TAYNGHEAN',
    'Phân loại': 'ChiNhanh',
    'Quy mô tài sản/GD (1–10)': 7,
    'Rủi ro vận hành T2 (1–10)': 8,
    'Sai phạm lịch sử (1–10)': 7,
    'Ngày kiểm toán gần nhất': '2025-08-20',
    'Năm KT tiếp theo': 2026,
    'Phòng KTNB phụ trách': 'PKT_DVKD',
    'Tuyến phòng thủ': 'Tuyen1',
  },
  {
    'Tên quy trình / hoạt động': 'Kiểm toán Chuyên đề Cấp Tín dụng KHDN Hội sở',
    'Đơn vị phụ trách': 'Khối Khách hàng Doanh nghiệp',
    'Mã đơn vị phụ trách': 'KHOI_KHDN',
    'Phân loại': 'HoiSo',
    'Quy mô tài sản/GD (1–10)': 10,
    'Rủi ro vận hành T2 (1–10)': 8,
    'Sai phạm lịch sử (1–10)': 5,
    'Ngày kiểm toán gần nhất': '2025-04-10',
    'Năm KT tiếp theo': 2026,
    'Phòng KTNB phụ trách': 'PKT_HoiSo',
    'Tuyến phòng thủ': 'Tuyen2',
  },
  {
    'Tên quy trình / hoạt động': 'Kiểm toán An ninh An toàn Thông tin & Core Banking',
    'Đơn vị phụ trách': 'Khối Công nghệ Thông tin',
    'Mã đơn vị phụ trách': 'KHOI_CNTT',
    'Phân loại': 'HeThong',
    'Quy mô tài sản/GD (1–10)': 9,
    'Rủi ro vận hành T2 (1–10)': 9,
    'Sai phạm lịch sử (1–10)': 4,
    'Ngày kiểm toán gần nhất': '2025-11-05',
    'Năm KT tiếp theo': 2026,
    'Phòng KTNB phụ trách': 'PKT_CNTT',
    'Tuyến phòng thủ': 'Tuyen2',
  },
  {
    'Tên quy trình / hoạt động': 'Kiểm toán Hoạt động Kho quỹ & Điều hòa Tiền mặt',
    'Đơn vị phụ trách': 'Trung tâm Quản lý Ngân quỹ',
    'Mã đơn vị phụ trách': 'TT_NGANQUY',
    'Phân loại': 'HoiSo',
    'Quy mô tài sản/GD (1–10)': 8,
    'Rủi ro vận hành T2 (1–10)': 6,
    'Sai phạm lịch sử (1–10)': 4,
    'Ngày kiểm toán gần nhất': '2025-05-18',
    'Năm KT tiếp theo': 2026,
    'Phòng KTNB phụ trách': 'PKT_HoiSo',
    'Tuyến phòng thủ': 'Tuyen1',
  },
  {
    'Tên quy trình / hoạt động': 'Kiểm toán Tuân thủ Phòng chống Rửa tiền (AML/CFT)',
    'Đơn vị phụ trách': 'Khối Pháp chế & Tuân thủ',
    'Mã đơn vị phụ trách': 'KHOI_TUANTHU',
    'Phân loại': 'HoiSo',
    'Quy mô tài sản/GD (1–10)': 8,
    'Rủi ro vận hành T2 (1–10)': 9,
    'Sai phạm lịch sử (1–10)': 5,
    'Ngày kiểm toán gần nhất': '2025-09-12',
    'Năm KT tiếp theo': 2026,
    'Phòng KTNB phụ trách': 'PKT_HoiSo',
    'Tuyến phòng thủ': 'Tuyen2',
  },
  {
    'Tên quy trình / hoạt động': 'Kiểm toán PGD Quỳ Hợp - BĐT Nghệ An',
    'Đơn vị phụ trách': 'PGD Quỳ Hợp',
    'Mã đơn vị phụ trách': 'PGD_QUYHOP',
    'Phân loại': 'PGD',
    'Quy mô tài sản/GD (1–10)': 5,
    'Rủi ro vận hành T2 (1–10)': 7,
    'Sai phạm lịch sử (1–10)': 8,
    'Ngày kiểm toán gần nhất': '2025-07-22',
    'Năm KT tiếp theo': 2026,
    'Phòng KTNB phụ trách': 'PKT_DVKD',
    'Tuyến phòng thủ': 'Tuyen1',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 3. FILE: 04_Tieu_Chi_Danh_Gia_Rui_Ro_Criteria.xlsx (Module: risk-criteria)
// ═══════════════════════════════════════════════════════════════════
const criteriaData = [
  {
    'Tên tiêu chí': 'Quy mô Dư nợ Tín dụng & Tài sản sinh lời',
    'Trọng số': 25,
    'Phân loại rủi ro': 'Định lượng',
    'Phân loại đối tượng': 'ChiNhanh',
    'Mô tả chi tiết': 'Đơn vị có quy mô dư nợ tín dụng trên 3.000 tỷ đồng hoặc tốc độ tăng trưởng tín dụng vượt 20%/năm',
  },
  {
    'Tên tiêu chí': 'Tỷ lệ nợ xấu & Nợ cần chú ý (Nhóm 2)',
    'Trọng số': 25,
    'Phân loại rủi ro': 'Định lượng',
    'Phân loại đối tượng': 'ChiNhanh',
    'Mô tả chi tiết': 'Tỷ lệ nợ xấu trên 2.5% hoặc tỷ lệ nợ nhóm 2 tăng đột biến trên 5% tổng dư nợ trong 6 tháng gần nhất',
  },
  {
    'Tên tiêu chí': 'Sai phạm phát hiện tại các cuộc kiểm toán trước',
    'Trọng số': 20,
    'Phân loại rủi ro': 'Định lượng',
    'Phân loại đối tượng': 'ALL',
    'Mô tả chi tiết': 'Số lượng phát hiện rủi ro cao chưa khắc phục hoặc tái diễn cùng hành vi vi phạm',
  },
  {
    'Tên tiêu chí': 'Biến động nhân sự chủ chốt & Gian lận nội bộ',
    'Trọng số': 15,
    'Phân loại rủi ro': 'Định tính',
    'Phân loại đối tượng': 'ChiNhanh',
    'Mô tả chi tiết': 'Thay đổi Giám đốc Chi nhánh, Trưởng phòng Tín dụng, Kế toán trưởng trong vòng 6 tháng hoặc có đơn thư tố cáo',
  },
  {
    'Tên tiêu chí': 'Mức độ phức tạp của sản phẩm & Hệ thống CNTT',
    'Trọng số': 15,
    'Phân loại rủi ro': 'Định tính',
    'Phân loại đối tượng': 'HoiSo',
    'Mô tả chi tiết': 'Quy trình triển khai sản phẩm mới hoặc hệ thống nghiệp vụ core mới có can thiệp API bên thứ ba',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 4. FILE: 05_Bang_Danh_Gia_Rui_Ro_Don_Vi_Assessments.xlsx (Module: risk-assessments)
// ═══════════════════════════════════════════════════════════════════
const assessmentData = [
  {
    'Quy trình / đơn vị': 'Chi nhánh Thái Bình',
    'Mã quy trình / đối tượng': 'CN_THAIBINH',
    'Phòng ban chịu trách nhiệm': 'Chi nhánh Thái Bình',
    'Nhóm kiểm toán': 'ChiNhanh',
    'Năm đánh giá': 2026,
    'Ảnh hưởng': 4,
    'Khả năng': 4,
    'Hiệu quả kiểm soát': 'Trung bình',
    'Mức độ rủi ro': 'Cao',
    'Rủi ro còn lại': 16,
    'Tần suất kiểm toán': 'Hàng năm',
    'Tốc độ rủi ro': 'Nhanh',
    'Khẩu vị rủi ro': 'Giảm thiểu',
    'Ghi chú': 'Quy mô dư nợ tăng nhanh, nợ nhóm 2 có xu hướng tăng',
  },
  {
    'Quy trình / đơn vị': 'Chi nhánh Tây Nghệ An',
    'Mã quy trình / đối tượng': 'CN_TAYNGHEAN',
    'Phòng ban chịu trách nhiệm': 'Chi nhánh Tây Nghệ An',
    'Nhóm kiểm toán': 'ChiNhanh',
    'Năm đánh giá': 2026,
    'Ảnh hưởng': 4,
    'Khả năng': 4,
    'Hiệu quả kiểm soát': 'Yếu',
    'Mức độ rủi ro': 'Cao',
    'Rủi ro còn lại': 18,
    'Tần suất kiểm toán': 'Hàng năm',
    'Tốc độ rủi ro': 'Nhanh',
    'Khẩu vị rủi ro': 'Giảm thiểu',
    'Ghi chú': 'Có sai phạm về định giá TSBĐ và kiểm tra sau vay trong kỳ trước',
  },
  {
    'Quy trình / đơn vị': 'Khối Khách hàng Doanh nghiệp',
    'Mã quy trình / đối tượng': 'KHOI_KHDN',
    'Phòng ban chịu trách nhiệm': 'Khối KHDN Hội sở',
    'Nhóm kiểm toán': 'HoiSo',
    'Năm đánh giá': 2026,
    'Ảnh hưởng': 5,
    'Khả năng': 3,
    'Hiệu quả kiểm soát': 'Tốt',
    'Mức độ rủi ro': 'Cao',
    'Rủi ro còn lại': 15,
    'Tần suất kiểm toán': 'Hàng năm',
    'Tốc độ rủi ro': 'Trung bình',
    'Khẩu vị rủi ro': 'Giảm thiểu',
    'Ghi chú': 'Quy mô khoản vay lớn, rủi ro tập trung cao',
  },
  {
    'Quy trình / đơn vị': 'Khối Công nghệ Thông tin',
    'Mã quy trình / đối tượng': 'KHOI_CNTT',
    'Phòng ban chịu trách nhiệm': 'Khối CNTT Hội sở',
    'Nhóm kiểm toán': 'HeThong',
    'Năm đánh giá': 2026,
    'Ảnh hưởng': 5,
    'Khả năng': 3,
    'Hiệu quả kiểm soát': 'Tốt',
    'Mức độ rủi ro': 'Cao',
    'Rủi ro còn lại': 15,
    'Tần suất kiểm toán': 'Hàng năm',
    'Tốc độ rủi ro': 'Rất nhanh',
    'Khẩu vị rủi ro': 'Tránh né',
    'Ghi chú': 'Trọng yếu an ninh mạng và an toàn dữ liệu Core Banking',
  },
  {
    'Quy trình / đơn vị': 'PGD Quỳ Hợp',
    'Mã quy trình / đối tượng': 'PGD_QUYHOP',
    'Phòng ban chịu trách nhiệm': 'PGD Quỳ Hợp',
    'Nhóm kiểm toán': 'PGD',
    'Năm đánh giá': 2026,
    'Ảnh hưởng': 3,
    'Khả năng': 4,
    'Hiệu quả kiểm soát': 'Yếu',
    'Mức độ rủi ro': 'Trung bình',
    'Rủi ro còn lại': 12,
    'Tần suất kiểm toán': 'Hàng năm',
    'Tốc độ rủi ro': 'Trung bình',
    'Khẩu vị rủi ro': 'Giảm thiểu',
    'Ghi chú': 'Địa bàn miền núi, rủi ro quản lý quỹ và tín dụng tiêu dùng',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 5. FILE: 06_Thu_Vien_Rui_Ro_Kiem_Soat_RCM_LPBank.xlsx (Module: risk-control-matrix)
// ═══════════════════════════════════════════════════════════════════
const { standardRcmData } = require('./seed_standard_rcm');
const rcmExcelRows = standardRcmData.map(item => ({
  'Tên quy trình': item.processName,
  'Quy trình con': item.subProcess,
  'Mục tiêu kinh doanh': item.businessObjective,
  'Tên rủi ro': item.riskName,
  'Mô tả rủi ro': item.riskDescription,
  'Mức độ rủi ro': item.inherentRiskScore === 'Critical' ? 'Nghiêm trọng' : (item.inherentRiskScore === 'High' ? 'Cao' : 'Trung bình'),
  'Tên chốt kiểm soát': item.controlName,
  'Mô tả chốt kiểm soát': item.controlDescription,
  'Loại kiểm soát': item.controlType === 'Preventive' ? 'Phòng ngừa' : 'Phát hiện',
  'Tần suất': item.controlFrequency,
  'Mức độ tự động': item.controlAutomation === 'Automated' ? 'Tự động' : (item.controlAutomation === 'Manual' ? 'Thủ công' : 'Bán tự động'),
  'Thủ tục kiểm toán': item.testProcedure,
  'Bằng chứng kỳ vọng': item.expectedEvidence,
}));

// ═══════════════════════════════════════════════════════════════════
// 6. FILE: 07_Tap_Mau_Giao_Dich_Chon_Mau_Tin_Dung.xlsx (Module: transactions / samples)
// ═══════════════════════════════════════════════════════════════════
const sampleTransactions = [
  {
    'Mã giao dịch': 'TXN-TD-2026-001',
    'Số CIF': 'CIF889911',
    'Tên khách hàng': 'Nguyễn Văn Hùng',
    'Số tiền': 2500000000,
    'Thời gian': '2026-01-15',
    'Sản phẩm vay': 'Cho vay mua nhà trả góp',
    'Tài sản bảo đảm': 'BĐS GCN số BS 123456 tại TP Thái Bình',
    'Chi nhánh': 'Chi nhánh Thái Bình',
    'Cán bộ xử lý': 'Trần Văn Mạnh (CBTD)',
    'Kiểm toán viên phụ trách': 'Phan Cảnh Danh',
    'Mô tả': 'Giải ngân món vay mua bất động sản, hạn mức 2.5 tỷ, thời hạn 120 tháng',
  },
  {
    'Mã giao dịch': 'TXN-TD-2026-002',
    'Số CIF': 'CIF889912',
    'Tên khách hàng': 'Công ty CP Đầu tư Thương mại Đông Á',
    'Số tiền': 15000000000,
    'Thời gian': '2026-01-20',
    'Sản phẩm vay': 'Cho vay bổ sung vốn lưu động',
    'Tài sản bảo đảm': 'Quyền tài sản phát sinh từ hợp đồng kinh tế và kho hàng',
    'Chi nhánh': 'Chi nhánh Thái Bình',
    'Cán bộ xử lý': 'Lê Thị Thu (CBTD KHDN)',
    'Kiểm toán viên phụ trách': 'Phan Cảnh Danh',
    'Mô tả': 'Giải ngân theo hạn mức vốn lưu động, chuyển khoản bên thụ hưởng',
  },
  {
    'Mã giao dịch': 'TXN-TD-2026-003',
    'Số CIF': 'CIF889913',
    'Tên khách hàng': 'Vũ Đình Toàn',
    'Số tiền': 900000000,
    'Thời gian': '2026-02-05',
    'Sản phẩm vay': 'Cho vay sản xuất kinh doanh cá thể',
    'Tài sản bảo đảm': 'Xe ô tô Ford Everest BKS 17A-123.45',
    'Chi nhánh': 'Chi nhánh Thái Bình',
    'Cán bộ xử lý': 'Nguyễn Thế Anh (CBTD)',
    'Kiểm toán viên phụ trách': 'Hoàng Thị Thơ',
    'Mô tả': 'Vay kinh doanh nông sản, thế chấp ô tô con',
  },
  {
    'Mã giao dịch': 'TXN-TD-2026-004',
    'Số CIF': 'CIF889914',
    'Tên khách hàng': 'Phạm Thị Lan',
    'Số tiền': 1200000000,
    'Thời gian': '2026-02-12',
    'Sản phẩm vay': 'Cho vay tiêu dùng có TSBĐ',
    'Tài sản bảo đảm': 'BĐS đất ở tại Hưng Hà, Thái Bình',
    'Chi nhánh': 'Chi nhánh Thái Bình',
    'Cán bộ xử lý': 'Trần Văn Mạnh (CBTD)',
    'Kiểm toán viên phụ trách': 'Lê Thị Ánh',
    'Mô tả': 'Vay tiêu dùng gia đình, kiểm tra sau vay đến hạn 30 ngày',
  },
  {
    'Mã giao dịch': 'TXN-TD-2026-005',
    'Số CIF': 'CIF889915',
    'Tên khách hàng': 'Công ty TNHH Xây dựng & Cầu đường 17',
    'Số tiền': 22000000000,
    'Thời gian': '2026-02-28',
    'Sản phẩm vay': 'Bảo lãnh thực hiện hợp đồng & Cho vay thi công',
    'Tài sản bảo đảm': 'Máy móc thiết bị và BĐS nhà xưởng',
    'Chi nhánh': 'Chi nhánh Tây Nghệ An',
    'Cán bộ xử lý': 'Đặng Quốc Huy (CBTD KHDN)',
    'Kiểm toán viên phụ trách': 'Phan Cảnh Danh',
    'Mô tả': 'Hạn mức tín dụng thi công gói thầu đường bộ quốc gia',
  },
  {
    'Mã giao dịch': 'TXN-TD-2026-006',
    'Số CIF': 'CIF889916',
    'Tên khách hàng': 'Nguyễn Thị Hoa',
    'Số tiền': 350000000,
    'Thời gian': '2026-03-01',
    'Sản phẩm vay': 'Cho vay thấu chi tín chấp qua lương',
    'Tài sản bảo đảm': 'Không có TSBĐ (Tín chấp)',
    'Chi nhánh': 'PGD Quỳ Hợp',
    'Cán bộ xử lý': 'Hoàng Văn Nam (CBTD)',
    'Kiểm toán viên phụ trách': 'Trần Thị Bích',
    'Mô tả': 'Cấp hạn mức thấu chi tiêu dùng cán bộ công chức',
  },
  {
    'Mã giao dịch': 'TXN-TD-2026-007',
    'Số CIF': 'CIF889917',
    'Tên khách hàng': 'Bùi Văn Hào',
    'Số tiền': 850000000,
    'Thời gian': '2026-03-05',
    'Sản phẩm vay': 'Cho vay nông nghiệp nông thôn',
    'Tài sản bảo đảm': 'QSDĐ nông nghiệp trồng cam Quỳ Hợp',
    'Chi nhánh': 'PGD Quỳ Hợp',
    'Cán bộ xử lý': 'Hoàng Văn Nam (CBTD)',
    'Kiểm toán viên phụ trách': 'Trần Thị Bích',
    'Mô tả': 'Đầu tư mở rộng trang trại cây ăn quả',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 7. FILE: 08_Danh_Muc_Phat_Hien_Mau_Audit_Findings.xlsx (Module: audit-findings)
// ═══════════════════════════════════════════════════════════════════
const findingsData = [
  {
    'Tiêu đề': 'Chưa cập nhật lại chứng thư định giá tài sản bảo đảm định kỳ 12 tháng',
    'Hiện trạng': 'Tại thời điểm kiểm toán ngày 10/03/2026, hồ sơ HĐTD số 2024/08/HĐTD của Công ty CP Đầu tư Thương mại Đông Á có BĐS thế chấp tại GCN QSDĐ số BD 123456 chưa được định giá lại theo chu kỳ 12 tháng quy định.',
    'Nguyên nhân': 'CBTD và lãnh đạo phòng Khách hàng doanh nghiệp chưa theo dõi sát sao lịch tái định giá tài sản trên hệ thống.',
    'Hậu quả': 'Tiềm ẩn nguy cơ giá trị thực tế của TSBĐ sụt giảm làm tỷ lệ LTV vượt quá mức an toàn cho phép theo quy định của Ngân hàng.',
    'Khuyến nghị': '1. Yêu cầu Chi nhánh phối hợp với khách hàng và công ty thẩm định giá độc lập hoàn tất chứng thư định giá trước ngày 30/04/2026; 2. Rà soát toàn bộ danh mục TSBĐ đến hạn định giá lại tại Chi nhánh.',
    'Mức độ rủi ro': 'Cao',
  },
  {
    'Tiêu đề': 'Biên bản kiểm tra sau cho vay lập hình thức, thiếu hóa đơn chứng từ chứng minh mục đích sử dụng vốn',
    'Hiện trạng': 'Hồ sơ vay tiêu dùng của khách hàng Nguyễn Văn Hùng giải ngân số tiền 2.5 tỷ đồng ngày 15/01/2026 nhưng đến ngày kiểm toán chưa có hóa đơn GTGT hoặc chứng từ chứng minh chuyển tiền thanh toán mua nhà.',
    'Nguyên nhân': 'CBTD kiểm tra sử dụng vốn qua loa, chỉ ghi nhận dựa trên lời khai miệng của khách hàng mà không yêu cầu cung cấp chứng từ gốc đối chiếu.',
    'Hậu quả': 'Không kiểm soát được dòng tiền vay, tiềm ẩn rủi ro khách hàng chuyển vốn sang đầu cơ kinh doanh trái phép hoặc đảo nợ.',
    'Khuyến nghị': 'Yêu cầu Chi nhánh làm việc ngay với khách hàng để thu thập đầy đủ chứng từ chứng minh mục đích sử dụng vốn; trường hợp không cung cấp được phải lập biên bản và có phương án xử lý thu hồi nợ trước hạn.',
    'Mức độ rủi ro': 'Cao',
  },
  {
    'Tiêu đề': 'Tồn quỹ tiền mặt cuối ngày vượt hạn mức định mức được giao nhưng không điều chuyển về Hội sở',
    'Hiện trạng': 'Trong tháng 01 và tháng 02/2026, Chi nhánh Thái Bình có 04 ngày tồn quỹ tiền mặt cuối ngày vượt trần bảo hiểm kho quỹ từ 2 đến 3.5 tỷ đồng mà không lập biên bản giải trình hoặc đề xuất điều chuyển tiền mặt về Hội sở.',
    'Nguyên nhân': 'Kế toán trưởng và Giám đốc Chi nhánh chủ quan, giữ tiền mặt dự phòng chi trả cho các giao dịch lớn vào sáng hôm sau nhưng không xin ý kiến phê duyệt tạm thời của Khối Quản lý Ngân quỹ.',
    'Hậu quả': 'Vi phạm quy định về an toàn kho quỹ và hợp đồng bảo hiểm rủi ro kho quỹ của Ngân hàng.',
    'Khuyến nghị': 'Yêu cầu Chi nhánh tuân thủ nghiêm ngặt định mức tồn quỹ cuối ngày; trường hợp cần giữ tiền mặt chi trả đột xuất phải có tờ trình gửi Khối Ngân quỹ phê duyệt ngoại lệ trước 16h00.',
    'Mức độ rủi ro': 'Trung bình',
  },
  {
    'Tiêu đề': 'Tài khoản người dùng của cán bộ thôi việc chưa được vô hiệu hóa kịp thời trên hệ thống nội bộ',
    'Hiện trạng': 'Kiểm tra đối chiếu 12 cán bộ thôi việc tại Chi nhánh trong năm 2025 phát hiện 02 cán bộ đã nghỉ việc trên 15 ngày nhưng tài khoản đăng nhập máy trạm và email nội bộ vẫn ở trạng thái Active.',
    'Nguyên nhân': 'Bộ phận Nhân sự Chi nhánh gửi thông báo thôi việc chậm cho Bộ phận Quản trị User CNTT Hội sở.',
    'Hậu quả': 'Nguy cơ rò rỉ dữ liệu thông tin bảo mật và truy cập trái phép vào tài nguyên ngân hàng.',
    'Khuyến nghị': 'Khối Nhân sự và Khối CNTT rà soát tự động hóa quy trình khóa user ngay khi có quyết định chấm dứt hợp đồng lao động có hiệu lực.',
    'Mức độ rủi ro': 'Cao',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 8. FILE: 09_Luat_Kiem_Toan_Giam_Sat_Lien_Tuc_Rules.xlsx (Module: audit-rules)
// ═══════════════════════════════════════════════════════════════════
const auditRulesData = [
  {
    'Rule ID': 'RULE-TD-001',
    'Mảng nghiệp vụ': 'Tín dụng',
    'Tên luật giám sát': 'Cảnh báo khoản vay giải ngân sát hạn mức phê duyệt tối đa (>=98%)',
    'Mức độ cảnh báo': 'Đỏ',
    'SLA Xử lý (giờ)': 24,
    'Mô tả rủi ro': 'Khoản vay giải ngân chạm trần hạn mức, có dấu hiệu kê khống nhu cầu vốn hoặc đảo nợ',
    'Điều kiện logic': 'Amount >= 0.98 * ApprovedLimit AND Status == "Disbursed"',
  },
  {
    'Rule ID': 'RULE-TD-002',
    'Mảng nghiệp vụ': 'Tín dụng',
    'Tên luật giám sát': 'Cảnh báo nợ nhóm 2 (nợ cần chú ý) tăng đột biến trên 10% tại ĐVKD trong tháng',
    'Mức độ cảnh báo': 'Đỏ',
    'SLA Xử lý (giờ)': 48,
    'Mô tả rủi ro': 'Chất lượng tín dụng của Chi nhánh suy giảm nhanh chóng, nguy cơ chuyển dịch nợ xấu nhóm 3-5',
    'Điều kiện logic': 'DebtGroup2Ratio_CurrentMonth - DebtGroup2Ratio_PreviousMonth >= 0.10',
  },
  {
    'Rule ID': 'RULE-KQ-001',
    'Mảng nghiệp vụ': 'Kho quỹ',
    'Tên luật giám sát': 'Cảnh báo tồn quỹ tiền mặt vượt định mức bảo hiểm kho quỹ cuối ngày',
    'Mức độ cảnh báo': 'Cam',
    'SLA Xử lý (giờ)': 12,
    'Mô tả rủi ro': 'Tồn quỹ vượt hạn mức bảo hiểm tăng rủi ro mất an toàn tài sản tiền mặt tại Chi nhánh/PGD',
    'Điều kiện logic': 'CashBalance_EndOfDay > InsuranceApprovedLimit',
  },
  {
    'Rule ID': 'RULE-IT-001',
    'Mảng nghiệp vụ': 'CNTT',
    'Tên luật giám sát': 'Cảnh báo can thiệp trực tiếp câu lệnh DDL/DML vào CSDL Core Banking ngoài giờ hành chính',
    'Mức độ cảnh báo': 'Đỏ',
    'SLA Xử lý (giờ)': 4,
    'Mô tả rủi ro': 'Quyền đặc quyền DBA/Admin can thiệp CSDL sản xuất không qua quy trình kiểm soát thay đổi (CAB)',
    'Điều kiện logic': 'Action IN ["UPDATE", "DELETE", "DROP"] AND Time NOT BETWEEN 08:00 AND 17:30 AND TicketId IS NULL',
  },
  {
    'Rule ID': 'RULE-AML-001',
    'Mảng nghiệp vụ': 'Phòng chống rửa tiền',
    'Tên luật giám sát': 'Cảnh báo giao dịch tiền mặt giá trị lớn từ 400 triệu đồng chưa lập báo cáo CTR',
    'Mức độ cảnh báo': 'Cam',
    'SLA Xử lý (giờ)': 24,
    'Mô tả rủi ro': 'Vi phạm quy định báo cáo giao dịch giá trị lớn cho Cục Phòng chống Rửa tiền - NHNN',
    'Điều kiện logic': 'CashTransactionAmount >= 400000000 AND CtrReportStatus != "Submitted"',
  },
];

// Copy Working Papers from docs/THUCTE to UPLOAD
function copyExistingWorkingPapers() {
  const wpCreditSrc = path.join(thucTeDir, 'WP_TD_CN Tây Nghệ An - Tổng hợp final 1 1.xlsx');
  const wpCreditDest = path.join(uploadDir, '10_Mau_Giay_To_Lam_Viec_Tin_Dung_40Cot.xlsx');
  if (fs.existsSync(wpCreditSrc)) {
    fs.copyFileSync(wpCreditSrc, wpCreditDest);
    console.log(`✅ Copied: 10_Mau_Giay_To_Lam_Viec_Tin_Dung_40Cot.xlsx`);
  }

  const wpPtdSrc = path.join(thucTeDir, 'PTD, TKBĐ-TNA-Theo doi khac phuc.xlsx');
  const wpPtdDest = path.join(uploadDir, '11_Mau_Giay_To_Lam_Viec_Phi_Tin_Dung_20Cot.xlsx');
  if (fs.existsSync(wpPtdSrc)) {
    fs.copyFileSync(wpPtdSrc, wpPtdDest);
    console.log(`✅ Copied: 11_Mau_Giay_To_Lam_Viec_Phi_Tin_Dung_20Cot.xlsx`);
  }
}

async function main() {
  console.log('Generating complete upload suite in docs/THUCTE/UPLOAD...');
  
  writeExcel('02_Danh_Sach_Nhan_Su_KTV_LPBank.xlsx', 'Nhan_Su_KTV', personnelData, [18, 18, 26, 28, 18, 32, 26, 20, 24]);
  writeExcel('03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx', 'Audit_Universe', universeData, [45, 30, 20, 16, 25, 25, 25, 25, 18, 22, 18]);
  writeExcel('04_Tieu_Chi_Danh_Gia_Rui_Ro_Criteria.xlsx', 'Risk_Criteria', criteriaData, [45, 14, 20, 22, 60]);
  writeExcel('05_Bang_Danh_Gia_Rui_Ro_Don_Vi_Assessments.xlsx', 'Risk_Assessments', assessmentData, [35, 25, 30, 18, 15, 14, 14, 20, 16, 16, 20, 16, 18, 40]);
  writeExcel('06_Thu_Vien_Rui_Ro_Kiem_Soat_RCM_LPBank.xlsx', 'RCM_LPBank', rcmExcelRows, [28, 28, 35, 35, 45, 18, 35, 45, 18, 15, 18, 45, 40]);
  writeExcel('07_Tap_Mau_Giao_Dich_Chon_Mau_Tin_Dung.xlsx', 'Tap_Mau_Giao_Dich', sampleTransactions, [22, 16, 32, 22, 16, 30, 35, 26, 26, 26, 45]);
  writeExcel('08_Danh_Muc_Phat_Hien_Mau_Audit_Findings.xlsx', 'Findings', findingsData, [45, 60, 45, 45, 60, 18]);
  writeExcel('09_Luat_Kiem_Toan_Giam_Sat_Lien_Tuc_Rules.xlsx', 'Audit_Rules', auditRulesData, [18, 25, 45, 18, 18, 55, 50]);

  copyExistingWorkingPapers();

  console.log('\n🎉 ALL EXCEL TEMPLATES CREATED SUCCESSFULLY IN docs/THUCTE/UPLOAD!');
}

main().catch(err => {
  console.error('Error generating suite:', err);
  process.exit(1);
});
