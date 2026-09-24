# KỊCH BẢN KIỂM THỬ CHẤP NHẬN NGƯỜI DÙNG (UAT TEST PLAN & SCENARIOS)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ 4.0 - LPBANK

- **Cơ quan ban hành:** Ban Quản lý Dự án & Khối Kiểm toán Nội bộ - Ngân hàng TMCP Lộc Phát Việt Nam (LPBank)
- **Tài liệu kiểm thử đi kèm:** [`docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.xlsx`](file:///f:/Phan%20mem%20KTNB%204.0/docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.xlsx)
- **Môi trường Local:** `http://localhost:5173` (Backend: `http://localhost:3001/api`)
- **Môi trường Cloud VPS:** `https://chinhta.io.vn` (Backend: `https://chinhta.io.vn/api`)
- **Mật khẩu mặc định toàn bộ tài khoản:** `@Lpbank2026!`

---

## PHẦN I. DANH SÁCH TÀI KHOẢN & PHÂN CÔNG 2 NHÂN SỰ CHO TỪNG VAI TRÒ TEST

Mỗi vai trò nghiệp vụ trong chu trình Kiểm toán Nội bộ Ngân hàng được bố trí **02 nhân sự kiểm thử độc lập**:
- **Tester 1 (Chính):** Thực hiện luồng nghiệp vụ chính từ đầu đến cuối theo quy trình chuẩn.
- **Tester 2 (Đối chiếu & Kiểm tra chéo):** Thực hiện song song, kiểm tra các trường hợp ngoại lệ (Negative cases), thử nghiệm nhập sai dữ liệu để kiểm tra tính năng bắt lỗi, hoặc kiểm tra quyền phê duyệt chéo.

| STT | Nhóm Vai Trò Hệ Thống | Mã Quyền CASL | Nhân Sự Test 1 (Chính) | Chức Danh & Phòng Ban | Username / Mật Khẩu | Nhân Sự Test 2 (Đối Chiếu) | Chức Danh & Phòng Ban | Username / Mật Khẩu | Trọng Tâm Kiểm Thử Nghiệp Vụ |
| :---: | :--- | :---: | :--- | :--- | :---: | :--- | :--- | :---: | :--- |
| **1** | **Ban Lãnh Đạo Khối KTNB** | `CAE / Deputy CAE` | **Nguyễn Tuấn Hiệp** | Phó Giám đốc phụ trách Khối KTNB | `hiepnt`<br>`@Lpbank2026!` | **Phạm Đức Thành** | Phó phòng KT Hội sở & Hệ thống | `thanhpd`<br>`@Lpbank2026!` | Phê duyệt Kế hoạch KT năm; Phê duyệt & Ký số phát hành Báo cáo KT; Điều hành Dashboard KPI tổng quan; Phê duyệt thay đổi cuộc KT; Giám sát BSC-KPI Khối. |
| **2** | **Lãnh Đạo Phòng Kiểm Toán** | `Audit Manager` | **Nguyễn Thị Lương** | Phó phòng KT Hội sở & Hệ thống | `luongnt2`<br>`@Lpbank2026!` | **Phùng Vân Anh** | Phó phòng KT Đơn vị kinh doanh | `anhpv7`<br>`@Lpbank2026!` | Lập dự thảo Kế hoạch năm; Phân bổ nguồn lực & Mandays; Soát xét Cấp 2 Giấy tờ làm việc & Dự thảo Báo cáo; Giám sát tiến độ phòng; Quản lý Timesheet. |
| **3** | **Trưởng Đoàn Kiểm Toán** | `TeamLeader / Lead` | **Phan Cảnh Danh** | Kiểm toán viên cao cấp (PKT ĐVKD) | `danhpc`<br>`@Lpbank2026!` | **Ninh Xuân Điệp** | Kiểm toán viên cao cấp (PKT ĐVKD) | `diepnx`<br>`@Lpbank2026!` | Thành lập đoàn KT; Khảo sát sơ bộ; Phân công việc thành viên; Soát xét Cấp 1 Working Paper; Tạo Review Note; Chốt phát hiện 5C; Lập Báo cáo KT; Họp kết thúc. |
| **4** | **Thành Viên Đoàn KT (Auditor)** | `Auditor` | **Đinh Hoàng Thiên** | Kiểm toán viên chính (PKT ĐVKD) | `thiendh`<br>`@Lpbank2026!` | **Cao Thị Mai** | Kiểm toán viên chính (PKT ĐVKD) | `maict`<br>`@Lpbank2026!` | Thực hiện thủ tục kiểm toán; Biên soạn Giấy tờ làm việc (Working Paper Tiptap); Tải bằng chứng; Nhập phát hiện 5C; Phản hồi & Đóng Review Note. |
| **5** | **Chuyên Gia CNTT & Dữ Liệu** | `CAATs Specialist` | **Ngô Kim Hoàng** | Chuyên Gia (PKT HS&HT) | `hoangnk1`<br>`@Lpbank2026!` | **Nguyễn Anh Dũng** | KTV CNTT cao cấp (PKT CNTT) | `dungna`<br>`@Lpbank2026!` | Giám sát liên tục & CAATs; Chạy kịch bản phân tích dữ liệu bất thường (Red Flags); Kiểm toán An ninh mạng & CNTT; Khai phá kho tri thức phát hiện AI. |
| **6** | **Đơn Vị Được Kiểm Toán (Auditee)** | `Auditee` | **Trần Quốc Tuấn** | Giám đốc Chi nhánh Hà Nội | `hanoibm`<br>`@Lpbank2026!` | **Trịnh Minh Đức** | Giám đốc Chi nhánh Sài Gòn | `saigonbm`<br>`@Lpbank2026!` | Cổng Auditee Portal; Tiếp nhận dự thảo phát hiện 5C; Phản hồi giải trình (Agree/Disagree); Lập Action Plan khắc phục; Đính kèm minh chứng đóng kiến nghị. |
| **7** | **Ban Kiểm Soát (Audit Committee)** | `Audit Committee` | **Nguyễn Văn Kiểm** | Trưởng Ban Kiểm Soát LPBank | `bks.chair`<br>`@Lpbank2026!` | **Lê Thị Soát** | Thành viên Ban Kiểm Soát chuyên trách | `bks.member`<br>`@Lpbank2026!` | Cổng Ban Kiểm Soát (IIA 1000); Giám sát Mô hình 3 Tuyến độc lập; Xem báo cáo tổng hợp rủi ro toàn hệ thống; Giám sát tiến độ Đoàn Thanh tra NHNN. |
| **8** | **Quản Trị Hệ Thống & An Ninh** | `Admin` | **Quản trị viên Hệ thống** | Admin kỹ thuật phần mềm | `admin`<br>`@Lpbank2026!` | **Vũ Quản Trị** | Quản trị viên An ninh & Phân quyền | `auditor.ad`<br>`@Lpbank2026!` | Phân quyền CASL RBAC; Quản lý tài khoản KTV & Vòng đời nhân sự; Giám sát tính độc lập KTV (IIA 1100 / TT 13); Cấu hình tham số; Nhật ký Audit Trail SHA-256. |

---

## PHẦN II. MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC ACCESS MATRIX)

| STT | Phân Hệ / Màn Hình Chức Năng | URL | Admin | Lãnh Đạo Khối (CAE) | Lãnh Đạo Phòng (TP/PP) | Trưởng Đoàn (Lead) | KTV Thành Viên | Chuyên Gia CAATs | Auditee (ĐV được KT) | Ban Kiểm Soát (BKS) |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | Bàn Làm Việc & Điều Hành | `/` | **Full** | **Full** | **Full** | **Full** | View/Task | View/Task | Hạn chế | View |
| 2 | Cổng Ban Kiểm Soát (IIA 1000) | `/audit-committee-portal` | **Full** | View | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | **Full** |
| 3 | Giám Sát Đoàn Thanh Tra NHNN | `/regulatory-exams` | **Full** | **Full** | View | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | **Full** |
| 4 | Cổng Đơn Vị Được Kiểm Toán | `/auditee-portal` | **Full** | View | View | View | View | ❌ Chặn | **Full (ĐV mình)** | View |
| 5 | Phạm Vi & Thư Viện RCM | `/risk-and-planning?step=scope` | **Full** | View | **Full** | View/Edit | View | View/Edit | ❌ Chặn | View |
| 6 | Đánh Giá Rủi Ro & Kế Hoạch Năm | `/risk-and-planning?step=plan` | **Full** | **Approve** | Create/Submit | View | ❌ Chặn | View | ❌ Chặn | View/Monitor |
| 7 | Quản Lý Cuộc Kiểm Toán | `/audit-engagements` | **Full** | **Approve** | **Full** | Manage Đoàn | Thực hiện | Thực hiện | ❌ Chặn | View |
| 8 | Giấy Tờ Làm Việc (Working Papers) | `/working-papers` | **Full** | View | Review L2 | Review L1 | Create/Edit | Create/Edit | ❌ Chặn | ❌ Chặn |
| 9 | Phát Hiện 5C & Báo Cáo KT | `/findings-hub` | **Full** | **Publish** | Review/Submit | Finalize | Create/Draft | Create/Draft | Giải trình | View |
| 10 | Khắc Phục Kiến Nghị & SLA | `/findings-hub?tab=recommendations`| **Full** | Monitor | Monitor | Verify/Close | Verify/Close | ❌ Chặn | Update/Proof | Monitor |
| 11 | Giám Sát Liên Tục & CAATs | `/continuous-monitoring` | **Full** | View | View | View | View | **Full/Script** | ❌ Chặn | View |
| 12 | Việc Ngoài Đoàn & Kanban | `/general-tasks` | **Full** | Monitor | Manage/Assign | Thực hiện | Thực hiện | Thực hiện | ❌ Chặn | ❌ Chặn |
| 13 | Đánh Giá BSC-KPI Nhân Sự | `/bsc-kpi` | **Full** | Evaluate | Evaluate | Evaluate | Self/View | Self/View | ❌ Chặn | View |
| 14 | Quản Lý Hồ Sơ & Mẫu Biểu | `/document-manager` | **Full** | Manage | Manage | View/Use | View/Use | View/Use | ❌ Chặn | View |
| 15 | Cơ Sở Pháp Quy & Tri Thức AI | `/regulatory-kb` | **Full** | **Full** | **Full** | **Full** | **Full** | **Full** | View | **Full** |
| 16 | Quản Trị Hệ Thống & KTV | `/system-admin` | **Full** | View/Monitor | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn | ❌ Chặn |

---

## PHẦN III. KỊCH BẢN KIỂM THỬ CHI TIẾT TỪNG PHÂN HỆ & NÚT BẤM (50 TEST CASES)

### Phân Hệ 0: Xác Thực, Đăng Nhập & Bảo Mật (Authentication & Security)

#### `TC-AUTH-01`: Đăng nhập lần đầu & Kích hoạt đổi mật khẩu bắt buộc
- **Màn hình:** `/login`
- **Nút bấm / Thao tác:** Nhập form đăng nhập -> Nút `Đăng nhập`
- **Dữ liệu vào:** Username `thiendh`, Mật khẩu `@Lpbank2026!`
- **Kết quả mong đợi:** Hệ thống kiểm tra thấy cờ `mustChangePassword = true`, tự động bật Modal *"Đổi mật khẩu bắt buộc"*, không cho phép đóng modal để tiếp tục sử dụng khi chưa đổi mật khẩu.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên | Tester 2: Cao Thị Mai

#### `TC-AUTH-02`: Đổi mật khẩu mới hợp lệ (PCI DSS 8.3)
- **Màn hình:** Modal Đổi mật khẩu bắt buộc
- **Nút bấm / Thao tác:** Nhập 3 ô mật khẩu -> Nút `Xác nhận Đổi mật khẩu`
- **Dữ liệu vào:** 
  + Mật khẩu hiện tại: `@Lpbank2026!`
  + Mật khẩu mới: `@Bcd12345678` (≥12 ký tự, hoa, thường, số, ký tự đặc biệt)
  + Xác nhận mật khẩu: `@Bcd12345678`
- **Kết quả mong đợi:** Thông báo *"Đổi mật khẩu thành công!"*, cờ `mustChangePassword` chuyển thành `false`, hệ thống tự động điều hướng vào trang chủ `/`.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên | Tester 2: Cao Thị Mai

#### `TC-AUTH-03`: Kiểm tra chặn mật khẩu yếu (Validation Complexity)
- **Màn hình:** Modal Đổi mật khẩu bắt buộc
- **Nút bấm / Thao tác:** Nhập mật khẩu không đủ 12 ký tự hoặc thiếu số/ký tự đặc biệt -> Nút `Xác nhận Đổi mật khẩu`
- **Dữ liệu vào:** Mật khẩu mới `123456` hoặc `Abcdef123`
- **Kết quả mong đợi:** Form hiển thị thông báo lỗi màu đỏ, chặn không cho gửi request, hướng dẫn người dùng nhập đúng quy chuẩn PCI DSS.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Ninh Xuân Điệp

#### `TC-AUTH-04`: Đăng xuất an toàn & Xóa Session (Logout)
- **Màn hình:** Thanh Header (Góc trên bên phải)
- **Nút bấm / Thao tác:** Bấm Avatar người dùng -> Chọn menu `Đăng xuất`
- **Kết quả mong đợi:** Chuyển về màn hình `/login`, toàn bộ token và thông tin người dùng bị xóa triệt để khỏi `localStorage`, nhấn nút Back trên trình duyệt không thể quay lại trang quản trị.
- **Người thực hiện:** Tester 1: Nguyễn Tuấn Hiệp | Tester 2: Phạm Đức Thành

#### `TC-AUTH-05`: Khóa tài khoản khi đăng nhập sai quá 5 lần (Brute-force Lockout)
- **Màn hình:** `/login`
- **Nút bấm / Thao tác:** Nhập sai mật khẩu liên tiếp 5 lần cho 1 tài khoản
- **Dữ liệu vào:** Username `maict`, Password sai `WrongPass123`
- **Kết quả mong đợi:** Lần 3 và 4 hệ thống hiển thị số lần thử còn lại. Lần thứ 5 thông báo tài khoản bị tạm khóa 30 phút theo chính sách bảo mật ngân hàng.
- **Người thực hiện:** Tester 1: Cao Thị Mai | Tester 2: Trần Quốc Tuấn

---

### Phân Hệ 1: Bàn Làm Việc & Điều Hành (Workbench - `/`)

#### `TC-WB-01`: Thống kê điều hành cuộc kiểm toán toàn hàng
- **Màn hình:** Trang chủ `/`
- **Nút bấm / Thao tác:** Xem các Cards KPI (Tổng cuộc KT, Đang thực hiện, Đã hoàn thành, Tiến độ kế hoạch)
- **Kết quả mong đợi:** Số liệu hiển thị khớp 100% với cơ sở dữ liệu thực tế, các thẻ KPI hiển thị tỷ lệ % hoàn thành kế hoạch năm.
- **Người thực hiện:** Tester 1: Nguyễn Tuấn Hiệp | Tester 2: Nguyễn Thị Lương

#### `TC-WB-02`: Tương tác bảng "Việc Cần Xử Lý" (Action Items)
- **Màn hình:** Trang chủ `/`
- **Nút bấm / Thao tác:** Bấm vào 1 dòng công việc trong danh sách "Việc cần xử lý"
- **Kết quả mong đợi:** Hệ thống điều hướng chính xác đến đúng màn hình Working Paper, Phát hiện 5C hoặc Kiến nghị tương ứng cần duyệt.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Đinh Hoàng Thiên

#### `TC-WB-03`: Biểu đồ Heatmap & Phân bổ rủi ro
- **Màn hình:** Trang chủ `/`
- **Nút bấm / Thao tác:** Di chuột (Hover) qua các vùng Heatmap rủi ro các đơn vị kinh doanh
- **Kết quả mong đợi:** Tooltip hiển thị đầy đủ thông tin Tên đơn vị, Điểm rủi ro, Số lượng phát hiện tồn đọng; phân cấp màu Đỏ (Cao), Cam (Trung bình), Xanh (Thấp).
- **Người thực hiện:** Tester 1: Ngô Kim Hoàng | Tester 2: Phạm Đức Thành

---

### Phân Hệ 2: Quản Trị Rủi Ro & Kế Hoạch Năm (`/risk-and-planning`)

#### `TC-RP-01`: Quản lý Đối tượng kiểm toán (Audit Universe)
- **Màn hình:** `/risk-and-planning?step=scope`
- **Nút bấm / Thao tác:** Nút `Thêm đối tượng kiểm toán` -> Nhập form -> Nút `Lưu`
- **Dữ liệu vào:** Mã: `CN_HANOI`, Tên: `Chi nhánh Hà Nội`, Loại: `Chi nhánh Loại 1`, Đơn vị: `Khối KDV`
- **Kết quả mong đợi:** Bản ghi mới xuất hiện ngay trên bảng danh mục, lưu trữ đầy đủ trong CSDL `audit_universe`.
- **Người thực hiện:** Tester 1: Nguyễn Thị Lương | Tester 2: Phùng Vân Anh

#### `TC-RP-02`: Import danh sách đối tượng kiểm toán từ Excel
- **Màn hình:** `/risk-and-planning?step=scope`
- **Nút bấm / Thao tác:** Nút `Nhập từ Excel` -> Kéo thả file `01_Mau_Import_Doi_Tuong_KT.xlsx` -> Nút `Tải lên & Xử lý`
- **Kết quả mong đợi:** Hệ thống báo tải lên thành công, số dòng được import chính xác, tự động làm mới bảng dữ liệu.
- **Người thực hiện:** Tester 1: Vũ Quản Trị | Tester 2: Nguyễn Thị Lương

#### `TC-RP-03`: Quản trị Thư viện Rủi ro & Kiểm soát (RCM Library)
- **Màn hình:** `/risk-and-planning?step=library`
- **Nút bấm / Thao tác:** Nút `Thêm rủi ro mới` -> Chọn Quy trình COSO -> Nhập Rủi ro & Kiểm soát gợi ý -> Nút `Lưu`
- **Dữ liệu vào:** Quy trình: `Cho vay KHDN`, Rủi ro: `Thẩm định sai giá trị TSBĐ`, Kiểm soát: `Định giá độc lập 2 cấp`
- **Kết quả mong đợi:** Rủi ro được lưu vào thư viện RCM, sẵn sàng để liên kết vào cuộc kiểm toán.
- **Người thực hiện:** Tester 1: Ngô Kim Hoàng | Tester 2: Phan Cảnh Danh

#### `TC-RP-04`: Đánh giá chấm điểm rủi ro đối tượng (Risk Prioritization)
- **Màn hình:** `/risk-and-planning?step=prioritization`
- **Nút bấm / Thao tác:** Chọn đơn vị -> Nhập Điểm Tác động (1-5), Khả năng (1-5), Kiểm soát (1-5) -> Nút `Lưu đánh giá`
- **Dữ liệu vào:** Impact: `4`, Likelihood: `4`, Control: `3`, Khẩu vị: `Giảm thiểu (Mitigate)`
- **Kết quả mong đợi:** Hệ thống tự động tính Rủi ro cố hữu = 16 (Cao), Rủi ro còn lại = 8 (Trung bình), xếp hạng đối tượng vào danh sách kiểm toán năm.
- **Người thực hiện:** Tester 1: Phùng Vân Anh | Tester 2: Ninh Xuân Điệp

#### `TC-RP-05`: Lập dự thảo Kế hoạch kiểm toán năm & Phân bổ Mandays
- **Màn hình:** `/risk-and-planning?step=plan`
- **Nút bấm / Thao tác:** Nút `Thêm cuộc kiểm toán vào kế hoạch` -> Nhập Tên, Quý thực hiện, Mandays -> Nút `Lưu`
- **Dữ liệu vào:** Cuộc KT: `Kiểm toán Toàn diện CN Hà Nội`, Thời gian: `Q2/2026`, Nguồn lực: `45 ngày công`
- **Kết quả mong đợi:** Cuộc kiểm toán hiển thị trên biểu đồ Gantt kế hoạch năm và bảng cân đối ngày công.
- **Người thực hiện:** Tester 1: Nguyễn Thị Lương | Tester 2: Phạm Đức Thành

#### `TC-RP-06`: Quy trình Trình & Phê duyệt Kế hoạch năm (2 Cấp)
- **Màn hình:** `/risk-and-planning?step=plan`
- **Nút bấm / Thao tác:** 
  1. Lãnh đạo Phòng (luongnt2) bấm `Gửi phê duyệt`
  2. Lãnh đạo Khối (hiepnt) kiểm tra và bấm `Phê duyệt kế hoạch`
- **Kết quả mong đợi:** Trạng thái chuyển từ `Draft` -> `PendingApproval` -> `Approved`. Hệ thống đóng băng kế hoạch năm.
- **Người thực hiện:** Tester 1: Lương -> Hiệp | Tester 2: Anh -> Thành

---

### Phân Hệ 3: Cuộc Kiểm Toán Thực Địa (`/audit-engagements`)

#### `TC-ENG-01`: Khởi tạo cuộc kiểm toán chi tiết
- **Màn hình:** `/audit-engagements`
- **Nút bấm / Thao tác:** Nút `Tạo cuộc kiểm toán mới` -> Nhập thông tin -> Nút `Lưu`
- **Dữ liệu vào:** Mã: `ENG-2026-HN01`, Tên: `Kiểm toán hoạt động cấp tín dụng CN Hà Nội`, Thời gian: `01/04/2026 - 25/04/2026`
- **Kết quả mong đợi:** Tạo cuộc kiểm toán thành công ở trạng thái `Khởi tạo (Planning)`.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Ninh Xuân Điệp

#### `TC-ENG-02`: Thành lập đoàn kiểm toán & Phân công nhiệm vụ
- **Màn hình:** `/audit-engagements/:id` (Tab Thành viên đoàn)
- **Nút bấm / Thao tác:** Nút `Thêm KTV vào đoàn` -> Chọn Trưởng đoàn, KTV, Gán phạm vi nghiệp vụ -> Nút `Lưu`
- **Dữ liệu vào:** Trưởng đoàn: `danhpc`, KTV 1: `thiendh` (Tín dụng), KTV 2: `maict` (Kế toán & Kho quỹ)
- **Kết quả mong đợi:** Gán đoàn thành công. Nếu KTV vi phạm thời hạn cách ly độc lập (từng làm việc tại CN Hà Nội), hệ thống hiển thị cảnh báo vàng.
- **Người thực hiện:** Tester 1: Nguyễn Thị Lương | Tester 2: Phùng Vân Anh

#### `TC-ENG-03`: Lập đề cương khảo sát sơ bộ cuộc kiểm toán
- **Màn hình:** `/audit-engagements/:id` (Tab Khảo sát sơ bộ)
- **Nút bấm / Thao tác:** Nhập dữ liệu đề cương khảo sát -> Nút `Lưu đề cương` -> Nút `Trình duyệt kế hoạch thực địa`
- **Kết quả mong đợi:** Đề cương lưu thành công, Trưởng phòng nhận thông báo duyệt kế hoạch thực địa.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Ninh Xuân Điệp

#### `TC-ENG-04`: Tạo & Phê duyệt yêu cầu thay đổi cuộc KT (Change Request)
- **Màn hình:** `/engagement-change-requests`
- **Nút bấm / Thao tác:** 
  1. Trưởng đoàn bấm `Tạo yêu cầu thay đổi` (Gia hạn thời gian thực địa thêm 3 ngày)
  2. Lãnh đạo phòng bấm `Phê duyệt thay đổi`
- **Kết quả mong đợi:** Ngày kết thúc cuộc kiểm toán tự động điều chỉnh, Audit Trail ghi nhận sự kiện thay đổi.
- **Người thực hiện:** Tester 1: Danh -> Lương | Tester 2: Điệp -> Anh

---

### Phân Hệ 4: Giấy Tờ Làm Việc & Mẫu Biểu (Working Papers - `/working-papers`)

#### `TC-WP-01`: Tạo mới Giấy tờ làm việc (Working Paper)
- **Màn hình:** `/working-papers`
- **Nút bấm / Thao tác:** Nút `Thêm Giấy tờ làm việc mới` -> Nhập Mã WP, Tên thủ tục -> Nút `Tạo`
- **Dữ liệu vào:** Mã: `WP-TD-01`, Tên: `Kiểm tra hồ sơ cấp tín dụng KHDN trên 50 tỷ VND`
- **Kết quả mong đợi:** WP được tạo ở trạng thái `Bản nháp (Draft)`, mở giao diện biên soạn.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên | Tester 2: Cao Thị Mai

#### `TC-WP-02`: Biên soạn nội dung với Tiptap Editor
- **Màn hình:** `/working-papers/:id`
- **Nút bấm / Thao tác:** Nhập mục tiêu, chèn bảng kết quả chọn mẫu, tích chọn checklist tuân thủ -> Nút `Lưu`
- **Kết quả mong đợi:** Văn bản lưu đúng định dạng bảng biểu, checklist, tự động lưu sau mỗi 30 giây.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên | Tester 2: Cao Thị Mai

#### `TC-WP-03`: Kiểm thử cộng tác trực tiếp thời gian thực (Realtime Collaborative Editing)
- **Màn hình:** `/working-papers/:id`
- **Nút bấm / Thao tác:** 2 Tester mở cùng 1 WP trên 2 trình duyệt khác nhau và gõ văn bản đồng thời
- **Kết quả mong đợi:** Con trỏ của Tester 2 xuất hiện trên màn hình Tester 1, chữ gõ đồng bộ tức thì qua WebSocket, không bị đè dữ liệu.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên & Tester 2: Cao Thị Mai

#### `TC-WP-04`: Tải lên bằng chứng kiểm toán & Đánh mã tham chiếu
- **Màn hình:** `/working-papers/:id` (Mục Bằng chứng kiểm toán)
- **Nút bấm / Thao tác:** Nút `Tải tệp đính kèm` -> Chọn file PDF -> Nhập Mã tham chiếu `WP-TD-01.A` -> Nút `Lưu`
- **Kết quả mong đợi:** File tải lên thành công, hiển thị trong danh mục bằng chứng của WP, bấm vào xem trước được.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên | Tester 2: Cao Thị Mai

#### `TC-WP-05`: Gửi Trưởng đoàn soát xét Working Paper
- **Màn hình:** `/working-papers/:id`
- **Nút bấm / Thao tác:** Nút `Gửi Trưởng đoàn soát xét` -> Nhập ghi chú bàn giao -> Nút `Xác nhận`
- **Kết quả mong đợi:** Trạng thái chuyển thành `Chờ soát xét (Submitted)`. KTV bị khóa quyền sửa văn bản.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên | Tester 2: Cao Thị Mai

#### `TC-WP-06`: Trưởng đoàn soát xét Cấp 1 & Tạo Review Note
- **Màn hình:** `/working-papers/:id`
- **Nút bấm / Thao tác:** Trưởng đoàn bôi đen đoạn văn bản nghi vấn -> Nút `Tạo Review Note` -> Nhập câu hỏi -> Nút `Gửi`
- **Dữ liệu vào:** Nội dung: *"Hồ sơ số 05 thiếu chứng thư bảo lãnh, đề nghị KTV giải trình."*
- **Kết quả mong đợi:** Review Note màu vàng ghim vào vị trí đoạn văn. KTV nhận thông báo cần xử lý.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Ninh Xuân Điệp

#### `TC-WP-07`: Phản hồi giải trình & Đóng Review Note
- **Màn hình:** `/working-papers/:id`
- **Nút bấm / Thao tác:** 
  1. KTV nhập phản hồi giải trình và đính kèm văn bản bổ sung
  2. Trưởng đoàn bấm `Đóng Review Note (Close Note)`
- **Kết quả mong đợi:** Note chuyển sang trạng thái `Đã đóng (Closed)`. WP đủ điều kiện để phê duyệt Cấp 1.
- **Người thực hiện:** Tester 1: Thiên & Danh | Tester 2: Mai & Điệp

#### `TC-WP-08`: Lãnh đạo Phòng soát xét Cấp 2 (Level 2 Review)
- **Màn hình:** `/working-papers/:id`
- **Nút bấm / Thao tác:** Lãnh đạo phòng mở WP đã duyệt Cấp 1 -> Bấm `Phê duyệt cấp phòng`
- **Kết quả mong đợi:** Trạng thái chuyển thành `Đã hoàn thành & Đóng băng (Approved)`. Văn bản khóa vĩnh viễn.
- **Người thực hiện:** Tester 1: Nguyễn Thị Lương | Tester 2: Phùng Vân Anh

---

### Phân Hệ 5: Phát Hiện Kiểm Toán 5C (`/findings-hub?tab=findings`)

#### `TC-FIND-01`: Tạo phát hiện kiểm toán theo chuẩn 5C quốc tế
- **Màn hình:** `/findings-hub?tab=findings`
- **Nút bấm / Thao tác:** Nút `Thêm phát hiện 5C mới` -> Nhập đầy đủ 5 trường -> Nút `Lưu`
- **Dữ liệu vào:**
  + Condition (Thực trạng): Giải ngân thiếu chứng từ thẩm định độc lập 5 hồ sơ
  + Criteria (Tiêu chuẩn): Điều 15 Thông tư 39/2016/TT-NHNN
  + Cause (Nguyên nhân): Cán bộ tín dụng bỏ sót bước kiểm tra chéo
  + Consequence (Hậu quả): Tiềm ẩn rủi ro nợ xấu và tranh chấp tài sản
  + Corrective Action (Kiến nghị): Yêu cầu định giá bổ sung trong 15 ngày
- **Kết quả mong đợi:** Phát hiện được cấp mã tự động `FIND-2026-001`, trạng thái `Dự thảo (Draft)`.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên | Tester 2: Cao Thị Mai

#### `TC-FIND-02`: Đánh giá mức độ rủi ro & Liên kết WP chứng minh
- **Màn hình:** `/findings-hub?tab=findings`
- **Nút bấm / Thao tác:** Chọn Mức độ rủi ro: `Cao (High)` -> Chọn liên kết WP: `WP-TD-01` -> Nút `Lưu`
- **Kết quả mong đợi:** Phát hiện hiển thị Tag màu Đỏ (High). Khi bấm vào mã WP liên kết sẽ mở đúng bằng chứng kiểm toán.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Ninh Xuân Điệp

#### `TC-FIND-03`: Gửi phát hiện sang Cổng Đơn vị được kiểm toán (Auditee)
- **Màn hình:** `/findings-hub?tab=findings`
- **Nút bấm / Thao tác:** Nút `Gửi đơn vị thống nhất` -> Chọn thời hạn phản hồi (5 ngày) -> Nút `Xác nhận gửi`
- **Kết quả mong đợi:** Trạng thái chuyển thành `Chờ đơn vị phản hồi (SentToAuditee)`. Cổng Auditee Portal của Chi nhánh Hà Nội nhận được phát hiện.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Ninh Xuân Điệp

---

### Phân Hệ 6: Cổng Đơn Vị Được Kiểm Toán (Auditee Portal - `/auditee-portal`)

#### `TC-AUD-01`: Auditee đăng nhập & Xem danh sách phát hiện
- **Màn hình:** `/auditee-portal`
- **Nút bấm / Thao tác:** Đăng nhập tài khoản Giám đốc CN Hà Nội (`hanoibm`) -> Mở Cổng Auditee
- **Kết quả mong đợi:** Auditee chỉ xem được các phát hiện của đúng đơn vị mình, không nhìn thấy phát hiện của đơn vị khác (bảo mật phân quyền).
- **Người thực hiện:** Tester 1: Trần Quốc Tuấn (CN Hà Nội) | Tester 2: Trịnh Minh Đức (CN Sài Gòn)

#### `TC-AUD-02`: Phản hồi giải trình: Đồng ý hoặc Giải trình thêm
- **Màn hình:** `/auditee-portal` (Chi tiết phát hiện)
- **Nút bấm / Thao tác:** Chọn Radio `Đồng ý` hoặc `Giải trình khác` -> Nhập nội dung và đính kèm văn bản -> Nút `Gửi phản hồi`
- **Dữ liệu vào:** *"Đơn vị đã bổ sung chứng thư định giá ngày 20/04 do lỗi bàn giao chậm"*
- **Kết quả mong đợi:** Hệ thống ghi nhận phản hồi, Trưởng đoàn KT nhận thông báo để thống nhất.
- **Người thực hiện:** Tester 1: Trần Quốc Tuấn (CN Hà Nội) | Tester 2: Trịnh Minh Đức (CN Sài Gòn)

#### `TC-AUD-03`: Lập Kế hoạch hành động khắc phục (Action Plan)
- **Màn hình:** `/auditee-portal` (Tab Khắc phục kiến nghị)
- **Nút bấm / Thao tác:** Nhập Kế hoạch hành động -> Chọn Ngày cam kết hoàn thành (Target Date) -> Chỉ định Cán bộ đầu mối -> Nút `Cam kết thực hiện`
- **Dữ liệu vào:** Hành động: `Bổ sung chứng thư định giá và rà soát 100% hồ sơ còn lại`, Cam kết: `30/05/2026`, Đầu mối: `Vũ Đức Thắng`
- **Kết quả mong đợi:** Kế hoạch hành động được lưu, chuyển vào hệ thống theo dõi SLA kiến nghị của Khối KTNB.
- **Người thực hiện:** Tester 1: Trần Quốc Tuấn (CN Hà Nội) | Tester 2: Trịnh Minh Đức (CN Sài Gòn)

#### `TC-AUD-04`: Báo cáo hoàn thành & Nộp minh chứng khắc phục
- **Màn hình:** `/auditee-portal`
- **Nút bấm / Thao tác:** Nút `Báo cáo hoàn thành kiến nghị` -> Tải file minh chứng `Bien_Ban_Khac_Phuc.pdf` -> Nút `Gửi nghiệm thu`
- **Kết quả mong đợi:** Trạng thái chuyển thành `Chờ KTV nghiệm thu (PendingVerification)`. KTV phụ trách nhận thông báo.
- **Người thực hiện:** Tester 1: Trần Quốc Tuấn (CN Hà Nội) | Tester 2: Trịnh Minh Đức (CN Sài Gòn)

---

### Phân Hệ 7: Báo Cáo Kiểm Toán & Xếp Hạng KSNB (`/findings-hub?tab=reports`)

#### `TC-REP-01`: Tổng hợp dự thảo Báo cáo kiểm toán
- **Màn hình:** `/findings-hub?tab=reports`
- **Nút bấm / Thao tác:** Nút `Tạo Báo cáo kiểm toán mới` -> Chọn Cuộc kiểm toán CN Hà Nội -> Nút `Tổng hợp dữ liệu`
- **Kết quả mong đợi:** Hệ thống tự động kéo toàn bộ danh mục phát hiện 5C đã thống nhất vào báo cáo, thống kê số lượng theo mức độ rủi ro.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Ninh Xuân Điệp

#### `TC-REP-02`: Đánh giá xếp hạng hệ thống KSNB của đơn vị
- **Màn hình:** `/findings-hub?tab=reports` (Mục Kết luận & Xếp hạng)
- **Nút bấm / Thao tác:** Chọn Dropdown `Xếp hạng KSNB`: Tốt / Khá / Trung bình / Yếu -> Nhập Ý kiến kết luận tổng thể -> Nút `Lưu`
- **Dữ liệu vào:** Xếp hạng: `Trung bình`, Kết luận: `Hệ thống KSNB cơ bản tuân thủ, cần chấn chỉnh quy trình quản lý TSBĐ.`
- **Kết quả mong đợi:** Huy hiệu (Badge) xếp hạng hiển thị màu tương ứng, lưu vào hồ sơ đối tượng kiểm toán.
- **Người thực hiện:** Tester 1: Phan Cảnh Danh | Tester 2: Nguyễn Thị Lương

#### `TC-REP-03`: Quy trình Trình & Phê duyệt Báo cáo kiểm toán (3 Cấp)
- **Màn hình:** `/findings-hub?tab=reports`
- **Nút bấm / Thao tác:**
  1. Trưởng đoàn (danhpc) bấm `Trình duyệt cấp Phòng`
  2. Lãnh đạo Phòng (luongnt2) kiểm tra và bấm `Trình Lãnh đạo Khối`
  3. Phó Giám đốc Khối (hiepnt) bấm `Phê duyệt & Phát hành Báo cáo`
- **Kết quả mong đợi:** Trạng thái chuyển thành `Đã phát hành (Published)`. Khóa chỉnh sửa báo cáo vĩnh viễn.
- **Người thực hiện:** Tester 1: Danh -> Lương -> Hiệp | Tester 2: Điệp -> Anh -> Thành

#### `TC-REP-04`: Xuất Báo cáo kiểm toán ra file PDF và Word
- **Màn hình:** `/findings-hub?tab=reports`
- **Nút bấm / Thao tác:** Nút `Xuất PDF` và Nút `Xuất Word`
- **Kết quả mong đợi:** File PDF và Word tải về máy đúng biểu mẫu chuẩn LPBank, đầy đủ Header, Logo, Bảng phát hiện và chữ ký số.
- **Người thực hiện:** Tester 1: Phạm Đức Thành | Tester 2: Nguyễn Tuấn Hiệp

---

### Phân Hệ 8: Theo Dõi Khắc Phục Kiến Nghị & SLA (`/findings-hub?tab=recommendations`)

#### `TC-REC-01`: Giám sát tình hình khắc phục kiến nghị toàn hàng
- **Màn hình:** `/findings-hub?tab=recommendations`
- **Nút bấm / Thao tác:** Sử dụng bộ lọc trạng thái: `Quá hạn` / `Đến hạn trong tháng` / `Chưa đến hạn`
- **Kết quả mong đợi:** Bảng lọc chính xác các kiến nghị quá hạn SLA, hiển thị số ngày trễ hạn và đơn vị chịu trách nhiệm màu đỏ.
- **Người thực hiện:** Tester 1: Nguyễn Thị Lương | Tester 2: Phùng Vân Anh

#### `TC-REC-02`: KTV nghiệm thu & Xác nhận đóng kiến nghị (Close)
- **Màn hình:** `/findings-hub?tab=recommendations`
- **Nút bấm / Thao tác:** Mở kiến nghị Auditee đã nộp minh chứng -> Kiểm tra file đính kèm -> Nút `Chấp thuận đóng kiến nghị`
- **Kết quả mong đợi:** Trạng thái chuyển thành `Đã đóng (Closed)`. Tỷ lệ hoàn thành kiến nghị của đơn vị tự động tăng lên trên Dashboard.
- **Người thực hiện:** Tester 1: Đinh Hoàng Thiên | Tester 2: Cao Thị Mai

---

### Phân Hệ 9: Cổng Ban Kiểm Soát & Giám Sát NHNN (`/audit-committee-portal` & `/regulatory-exams`)

#### `TC-BKS-01`: Xem Dashboard giám sát Mô hình 3 Tuyến độc lập
- **Màn hình:** `/audit-committee-portal`
- **Nút bấm / Thao tác:** Đăng nhập tài khoản Trưởng Ban Kiểm Soát (`bks.chair`) -> Xem tổng quan Dashboard 3 Tuyến
- **Kết quả mong đợi:** BKS xem được bức tranh rủi ro toàn hàng, tình hình kiểm toán nội bộ độc lập theo chuẩn mực IIA Standard 1000.
- **Người thực hiện:** Tester 1: Nguyễn Văn Kiểm (Trưởng BKS) | Tester 2: Lê Thị Soát (Thành viên BKS)

#### `TC-BKS-02`: Quản lý & Giám sát kiến nghị Đoàn Thanh tra NHNN
- **Màn hình:** `/regulatory-exams`
- **Nút bấm / Thao tác:** Nút `Thêm đợt thanh tra giám sát NHNN` -> Nhập Tên đợt, Cơ quan thanh tra, Danh mục kiến nghị -> Nút `Lưu`
- **Dữ liệu vào:** Đợt: `Thanh tra chuyên đề cấp tín dụng 2025`, Cơ quan: `Cơ quan TTGSNH - NHNN`
- **Kết quả mong đợi:** Đợt thanh tra và các kiến nghị của NHNN được lưu trữ, hệ thống theo dõi tiến độ báo cáo Thống đốc NHNN định kỳ.
- **Người thực hiện:** Tester 1: Nguyễn Văn Kiểm (Trưởng BKS) | Tester 2: Lê Thị Soát (Thành viên BKS)

---

### Phân Hệ 10: Giám Sát Liên Tục & CAATs (`/continuous-monitoring`)

#### `TC-CAAT-01`: Xem danh mục kịch bản giám sát rủi ro tự động
- **Màn hình:** `/continuous-monitoring`
- **Nút bấm / Thao tác:** Mở danh mục CAATs Scripts (Tín dụng, Giao dịch quầy, Phòng chống rửa tiền AML)
- **Kết quả mong đợi:** Hiển thị logic kịch bản, các ngưỡng cảnh báo (Thresholds) và tần suất chạy tự động.
- **Người thực hiện:** Tester 1: Ngô Kim Hoàng | Tester 2: Nguyễn Anh Dũng

#### `TC-CAAT-02`: Kích hoạt chạy quét dữ liệu ngoại lệ thủ công
- **Màn hình:** `/continuous-monitoring`
- **Nút bấm / Thao tác:** Chọn kịch bản `Giao dịch hủy sau giờ giao dịch` -> Nút `Chạy quét dữ liệu ngay`
- **Kết quả mong đợi:** Hệ thống trả về danh sách các giao dịch vi phạm dấu hiệu cảnh báo (Red Flags) kèm số tiền và mã teller vi phạm.
- **Người thực hiện:** Tester 1: Ngô Kim Hoàng | Tester 2: Nguyễn Anh Dũng

---

### Phân Hệ 11: BSC-KPI & Việc Ngoài Đoàn (`/bsc-kpi` & `/general-tasks`)

#### `TC-KPI-01`: Xem Thẻ điểm cân bằng BSC Khối KTNB
- **Màn hình:** `/bsc-kpi`
- **Nút bấm / Thao tác:** Xem 4 khía cạnh BSC (Tài chính, Khách hàng, Quy trình, Học hỏi & Phát triển)
- **Kết quả mong đợi:** Biểu đồ radar và thước đo KPI hiển thị đúng phương pháp luận BSC, phản ánh hiệu suất Khối.
- **Người thực hiện:** Tester 1: Nguyễn Tuấn Hiệp | Tester 2: Phạm Đức Thành

#### `TC-TASK-01`: Quản lý việc ngoài đoàn trên Bảng Kanban
- **Màn hình:** `/general-tasks`
- **Nút bấm / Thao tác:** Nút `Tạo nhiệm vụ mới` -> Kéo thả thẻ việc giữa các cột `Chưa làm` -> `Đang làm` -> `Hoàn thành`
- **Dữ liệu vào:** Nhiệm vụ: `Tập huấn Luật các TCTD 2024`, Gán cho: `Đinh Hoàng Thiên`
- **Kết quả mong đợi:** Thẻ công việc di chuyển mượt mà, trạng thái tự động cập nhật trong CSDL.
- **Người thực hiện:** Tester 1: Nguyễn Thị Lương | Tester 2: Đinh Hoàng Thiên

---

### Phân Hệ 12: Quản Trị Hệ Thống, Phân Quyền & Nhật Ký (`/system-admin`)

#### `TC-SYS-01`: Quản lý hồ sơ KTV & Lọc vòng đời nhân sự
- **Màn hình:** `/system-admin?tab=personnel`
- **Nút bấm / Thao tác:** Bấm chuyển đổi giữa các tab: `Đang công tác (Active)` -> `Đã điều chuyển` -> `Đã nghỉ việc`
- **Kết quả mong đợi:** Hiển thị đầy đủ 31 KTV Khối KTNB với mã nhân viên, chức danh, nhóm quyền, phân loại đúng tab trạng thái.
- **Người thực hiện:** Tester 1: Quản trị viên Hệ thống | Tester 2: Vũ Quản Trị

#### `TC-SYS-02`: Điều chuyển / Nghỉ việc nhân sự & Bảo toàn lịch sử
- **Màn hình:** `/system-admin?tab=personnel`
- **Nút bấm / Thao tác:** 
  1. Tại 1 KTV test, bấm nút `Điều chuyển` -> Nhập đơn vị mới -> Bấm `Xác nhận`
  2. Kiểm tra tài khoản tự động bị khóa (`isActive = false`) và chuyển sang tab `Đã điều chuyển`
  3. Bấm nút `Khôi phục` để đưa nhân sự về lại `Active`
- **Kết quả mong đợi:** Hệ thống không xóa cứng record, bảo toàn toàn bộ Working Papers và phát hiện của KTV trong quá khứ.
- **Người thực hiện:** Tester 1: Quản trị viên Hệ thống | Tester 2: Vũ Quản Trị

#### `TC-SYS-03`: Giám sát tính độc lập KTV (IIA 1100 / TT 13)
- **Màn hình:** `/system-admin?tab=personnel&subTab=sub5`
- **Nút bấm / Thao tác:** Mở tab Giám sát độc lập -> Kiểm tra danh sách KTV đang trong thời gian cách ly (Cooling-off)
- **Kết quả mong đợi:** Hiển thị đúng đơn vị cũ từng công tác và số ngày cách ly còn lại. Cảnh báo khi KTV được phân công vào đơn vị cũ.
- **Người thực hiện:** Tester 1: Vũ Quản Trị | Tester 2: Nguyễn Thị Lương

#### `TC-SYS-04`: Phân quyền chi tiết & Ma trận vai trò CASL
- **Màn hình:** `/system-admin?tab=roles`
- **Nút bấm / Thao tác:** Chọn vai trò `Auditor` -> Xem ma trận quyền (Xem, Thêm, Sửa, Xóa, Duyệt trên từng Module)
- **Kết quả mong đợi:** Ma trận quyền phân định rõ ràng giữa các vai trò, cập nhật tức thì vào bảng `roles`.
- **Người thực hiện:** Tester 1: Quản trị viên Hệ thống | Tester 2: Vũ Quản Trị

#### `TC-SYS-05`: Nhật ký hệ thống bất biến (Audit Trail SHA-256)
- **Màn hình:** `/system-admin?tab=audit-trail`
- **Nút bấm / Thao tác:** Tìm kiếm các hành động vừa thực hiện trong đợt test (đổi mật khẩu, tạo WP, duyệt báo cáo)
- **Kết quả mong đợi:** Ghi nhận đầy đủ IP, Thời gian, Dữ liệu cũ (oldValue), Dữ liệu mới (newValue) và chuỗi băm bảo mật SHA-256 chống làm giả.
- **Người thực hiện:** Tester 1: Quản trị viên Hệ thống | Tester 2: Vũ Quản Trị

---

## PHẦN IV. TIÊU CHÍ ĐÁNH GIÁ & NGHIỆM THU ĐỢT UAT

1. **Tiêu chí ĐẠT (PASS):**
   - 100% các Test Case Critical và High đạt kết quả `PASS`.
   - Toàn bộ luồng nghiệp vụ end-to-end (từ Rủi ro -> Kế hoạch -> Thực địa -> Working Paper -> Phát hiện 5C -> Báo cáo KT -> Khắc phục kiến nghị) vận hành thông suốt không lỗi chặn.
   - Cơ chế bảo mật, phân quyền CASL và quy định độc lập Thông tư 13 vận hành chuẩn xác.
2. **Quy trình báo lỗi khi gặp FAIL:**
   - Tester ghi lại Mã Test Case (ví dụ `TC-WP-03`), chụp ảnh màn hình hoặc quay video lỗi.
   - Ghi rõ URL, Tài khoản đang đăng nhập, Dữ liệu nhập vào và Mã lỗi (nếu có).
   - Đội ngũ kỹ thuật hỗ trợ trực tiếp 24/7 trong suốt quá trình UAT.
