export const WORKING_PAPER_TEMPLATES: Record<string, any> = {
  credit: {
    domainPrefix: 'CREDIT',
    title: 'Kiểm toán Quy trình Cấp tín dụng & Thẩm định tài sản bảo đảm',
    objectives: `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính đầy đủ, hợp pháp và hợp lệ của hồ sơ thẩm định tín dụng, đảm bảo việc phê duyệt tuân thủ đúng thẩm quyền quy định.
- Đánh giá tính hiện hữu, tính thanh khoản và giá trị định giá của tài sản thế chấp bảo đảm cho khoản vay.
- Đánh giá việc kiểm tra sau cho vay và giám sát dòng tiền giải ngân của khách hàng.
- Phù hợp với Tiêu chuẩn IIA 1200 (Tính chuyên nghiệp) và Tiêu chuẩn IIA 2100 (Quản trị rủi ro).`,
    riskDescription: `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro cán bộ tín dụng thông đồng, định giá quá cao giá trị tài sản bảo đảm hoặc bỏ qua bước thẩm định thực tế.
- Rủi ro khách hàng sử dụng vốn sai mục đích, phát sinh nợ xấu, tổn thất vốn của LPBank.
- Rủi ro hồ sơ pháp lý tài sản bị tranh chấp, không thể phát mãi thu hồi nợ khi xảy ra biến cố.`,
    methodology: `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Kiểm tra tài liệu (Vouching): Rà soát tờ trình thẩm định, biên bản định giá, hồ sơ công chứng thế chấp.
- Phỏng vấn (Inquiry): Phỏng vấn cán bộ tín dụng và cán bộ kiểm soát rủi ro về quy trình chốt chặn phê duyệt.
- Đối chiếu chéo (Reconciliation): Đối chiếu hạn mức tín dụng được duyệt trên Core với tờ trình phê duyệt bản cứng.`,
    sampleSelection: `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp chọn mẫu: Chọn mẫu ngẫu nhiên hệ thống (Systematic Sampling) kết hợp chọn mẫu theo phán đoán rủi ro (Judgmental Sampling) đối với các khoản vay phát sinh mới trong kỳ.
- Kích thước mẫu: Chọn 25 hồ sơ giải ngân lớn nhất và 5 hồ sơ giải ngân sát hạn mức phê duyệt.
- Tổng thể mẫu (Population): Toàn bộ danh sách giải ngân của Chi nhánh/Phân khúc trong kỳ đánh giá rủi ro.`,
    procedures: `Bước 1: Thu thập danh sách giải ngân và hồ sơ pháp lý khách hàng.
- Thủ tục thực tế: Trích xuất lịch sử giải ngân trên Core Banking và đối chiếu với hồ sơ lưu trữ bản cứng.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng (Evidence Reference): Hồ sơ số 01 - 25.

Bước 2: Kiểm tra chốt kiểm soát phê duyệt tín dụng.
- Thủ tục thực tế: Đối chiếu chữ ký của cấp phê duyệt với bảng phân quyền phê duyệt tín dụng của LPBank.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Biên bản phê duyệt Hội đồng Tín dụng.

Bước 3: Kiểm tra định giá và thẩm định thực tế tài sản bảo đảm.
- Thủ tục thực tế: Rà soát biên bản định giá tài sản bảo đảm, kiểm tra sự tồn tại của ảnh chụp thực địa và tọa độ định vị GPS.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Chứng thư định giá & ảnh chụp thực địa TSĐB.`,
    conclusion: `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Kiểm soát nội bộ đối với quy trình cấp tín dụng vận hành [Hiệu quả / Hiệu quả một phần / Không hiệu quả].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: Thiếu ảnh chụp thực địa có gắn tọa độ GPS đối với 3 tài sản thế chấp là bất động sản ngoại tỉnh.
   - Phát hiện 2: Biên bản họp phê duyệt hạn mức tín dụng thiếu chữ ký chốt của thành viên độc lập kiểm soát rủi ro.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-CREDIT-01, F-CREDIT-02] để gửi Trưởng đoàn xem xét.`
  },
  it: {
    domainPrefix: 'IT',
    title: 'Kiểm toán Sự cố Core Banking & Quản trị tính liên tục hoạt động',
    objectives: `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính hiệu quả của các biện pháp bảo vệ thông tin, kiểm soát truy cập và quản lý tài khoản người dùng trên hệ thống core.
- Đánh giá quy trình quản lý sự cố, quy trình khôi phục sau thảm họa và tính liên tục vận hành.
- Phù hợp với Tiêu chuẩn IIA 2110.A2 (Đánh giá quản trị CNTT) và tiêu chuẩn bảo mật ISO 27001 / COBIT 2019.`,
    riskDescription: `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro truy cập trái phép vào cơ sở dữ liệu core banking gây rò rỉ dữ liệu nhạy cảm của khách hàng.
- Rủi ro sự cố hệ thống kéo dài (downtime) mà không có failover tự động dẫn đến gián đoạn thanh toán toàn diện.
- Rủi ro tài khoản đặc quyền (Superuser) không được giám sát nhật ký (Audit logs) phát sinh gian lận nội bộ.`,
    methodology: `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Phân tích Nhật ký (Log Analysis): Rà soát nhật ký truy cập hệ thống của các tài khoản Admin.
- Quan sát thực tế (Observation): Kiểm tra chốt an ninh phòng máy chủ và vị trí đặt máy chủ DR backup.
- Chạy vết cấu hình (Vulnerability/Config Check): Kiểm tra cấu hình mật mã và chính sách mật khẩu.`,
    sampleSelection: `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp chọn mẫu: Chọn mẫu theo chủ đích (Judgmental Sampling) nhắm vào các tài khoản có quyền truy cập cao nhất và các sự kiện lỗi hệ thống mức độ nghiêm trọng trong năm.
- Kích thước mẫu: Kiểm tra 100% tài khoản Admin đang hoạt động và rà soát chi tiết 3 sự cố downtime nghiêm trọng nhất.`,
    procedures: `Bước 1: Kiểm tra phân quyền và quản lý tài khoản đặc quyền.
- Thủ tục thực tế: Trích xuất danh sách tài khoản có quyền Admin từ Database và đối chiếu với danh sách phê duyệt của Khối Công nghệ.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: System User Directory logs.

Bước 2: Rà soát nhật ký Audit Logs của tài khoản đặc quyền.
- Thủ tục thực tế: Chạy query kiểm tra tính liên tục của Audit Logs, đảm bảo không có khoảng trống thời gian log bị tắt hoặc bị xóa.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Splunk log query screenshots.

Bước 3: Rà soát quy trình diễn tập DR và khôi phục sự cố.
- Thủ tục thực tế: Kiểm tra biên bản diễn tập khôi phục thảm họa gần nhất và đo lường chỉ số RTO/RPO thực tế.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: DR Drill Report 2026.`,
    conclusion: `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Kiểm soát an toàn thông tin vận hành [Hiệu quả / Hiệu quả một phần / Không hiệu quả].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: 02 tài khoản cựu nhân sự đã nghỉ việc từ tháng 03/2026 vẫn chưa bị de-active quyền truy cập hệ thống Core.
   - Phát hiện 2: Nhật ký hoạt động của tài khoản quản trị CSDL chưa được lưu trữ độc lập tại phân vùng bảo mật riêng.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-IT-01, F-IT-02] để gửi Trưởng đoàn xem xét.`
  },
  op: {
    domainPrefix: 'OP',
    title: 'Kiểm toán Vận hành Quỹ và Giao dịch Tiền mặt tại Chi nhánh',
    objectives: `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính tuân thủ quy trình kiểm kê quỹ, đối chiếu chứng từ kế toán cuối ngày và hạch toán chi phí.
- Đánh giá tính hiệu lực của kiểm soát phân tách trách nhiệm giữa kế toán viên và thủ quỹ.
- Đánh giá quy trình phê duyệt và thanh toán chi phí hoạt động nội bộ.`,
    riskDescription: `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro thất thoát tiền mặt tại quỹ do không thực hiện đúng quy định kiểm kê chéo cuối ngày.
- Rủi ro gian lận hạch toán khống chi phí mua sắm để trục lợi cá nhân.
- Rủi ro cán bộ kiêm nhiệm nhiều vai trò xung đột (lập phiếu và phê duyệt thanh toán).`,
    methodology: `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Kiểm tra thực tế (Physical Inspection): Tham gia chứng kiến kiểm kê quỹ tiền mặt đột xuất tại chi nhánh.
- Vouching: Kiểm tra tính hợp pháp của các hóa đơn VAT và chứng từ thanh toán đính kèm phiếu chi.
- Đối chiếu chéo: So sánh số dư sổ quỹ tiền mặt với số dư trên tài khoản GL Core Banking.`,
    sampleSelection: `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp chọn mẫu: Chọn mẫu ngẫu nhiên (Random Sampling) kết hợp chọn mẫu theo ngưỡng giá trị lớn (Monetary Unit Sampling).
- Kích thước mẫu: Chọn 30 chứng từ chi tiêu mua sắm nội bộ có giá trị lớn nhất và 10 chứng từ chọn ngẫu nhiên trong năm.`,
    procedures: `Bước 1: Chứng kiến kiểm kê quỹ tiền mặt đột xuất.
- Thủ tục thực tế: Thực hiện đếm tiền mặt thực tế tại két và đối chiếu với biên bản khóa sổ quỹ thời gian thực.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Biên bản kiểm quỹ ngày dd/mm/yyyy.

Bước 2: Kiểm tra chốt kiểm soát phê duyệt và phân tách trách nhiệm.
- Thủ tục thực tế: Rà soát danh sách user hạch toán và phê duyệt trên Core, đảm bảo không có tình trạng 1 user thực hiện cả 2 bước.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: GL Accounting transaction logs.

Bước 3: Rà soát tính hợp lệ của hóa đơn, chứng từ chi tiêu.
- Thủ tục thực tế: Tra cứu mã hóa đơn trên cổng thông tin của Tổng cục Thuế để xác thực hóa đơn đang hoạt động, không phải hóa đơn khống.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Hóa đơn điện tử VAT references.`,
    conclusion: `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Kiểm soát vận hành và kế toán hạch toán [Hiệu quả / Hiệu quả một phần / Không hiệu quả].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: Có 03 khoản chi mua sắm tài sản cố định trên 50 triệu đồng không thực hiện chào giá cạnh tranh 3 bên theo quy chế.
   - Phát hiện 2: Biên bản kiểm kê quỹ tiền mặt cuối ngày thiếu chữ ký xác nhận độc lập của Kiểm soát viên/Giám đốc Chi nhánh.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-OP-01] để gửi Trưởng đoàn xem xét.`
  }
};
