# KỊCH BẢN KIỂM THỬ CHẤP NHẬN NGƯỜI DÙNG (UAT TEST PLAN & SCENARIOS)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ 4.0 - LPBANK

- **Cơ quan ban hành:** Ban Quản lý Dự án & Khối Kiểm toán Nội bộ - Ngân hàng TMCP Lộc Phát Việt Nam (LPBank)
- **File Excel kiểm thử đi kèm:** [`docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.xlsx`](file:///f:/Phan%20mem%20KTNB%204.0/docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.xlsx)
- **Môi trường Local:** `http://localhost:5173` (Backend API: `http://localhost:3001/api`)
- **Môi trường Cloud VPS:** `https://chinhta.io.vn` (Backend API: `https://chinhta.io.vn/api`)
- **Mật khẩu mặc định toàn bộ tài khoản:** `@Lpbank2026!`

---

## PHẦN I. 02 TESTER CHÍNH ĐIỀU PHỐI & PHÂN BỔ TÀI KHOẢN THEO VAI TRÒ TEST

Toàn bộ quá trình kiểm thử UAT hệ thống Phần mềm KTNB 4.0 do **02 Tester chính** chịu trách nhiệm thực hiện, kiểm tra chéo và đối chiếu kết quả:
- **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`) - KTV chính, Phòng Kiểm toán Đơn vị kinh doanh.
- **Tester 2 (Đối chiếu & Kiểm tra chéo):** **Ninh Xuân Điệp** (`diepnx`) - KTV cao cấp, Phòng Kiểm toán Đơn vị kinh doanh.

> **Quy tắc thực hiện:** Tại mỗi ca kiểm thử (Test Case), hai Tester sẽ sử dụng tài khoản được quy định tương ứng với vai trò đó (theo bảng dưới đây) để đăng nhập và thao tác nhằm kiểm thử chính xác ma trận phân quyền CASL RBAC và quy trình phê duyệt đa cấp.

| STT | Nhóm Vai Trò Cần Test | Mã Quyền CASL | Tester 1 (Đạt) Đăng Nhập | Mật Khẩu (U1) | Tester 2 (Điệp) Đăng Nhập | Mật Khẩu (U2) | Trọng Tâm & Phạm Vi Kiểm Thử UAT |
| :---: | :--- | :---: | :--- | :---: | :--- | :---: | :--- |
| **1** | **1. Ban Lãnh Đạo Khối KTNB** | `CAE / Deputy CAE` | **hiepnt (Nguyễn Tuấn Hiệp)** | `@Lpbank2026!` | **thanhpd (Phạm Đức Thành)** | `@Lpbank2026!` | Duyệt Kế hoạch kiểm toán năm, Phê duyệt phát hành Báo cáo KT, Điều hành Dashboard tổng quan, Duyệt thay đổi cuộc KT, Giám sát BSC-KPI Khối |
| **2** | **2. Lãnh Đạo Phòng Kiểm Toán** | `Audit Manager` | **luongnt2 (Nguyễn Thị Lương)** | `@Lpbank2026!` | **anhpv7 (Phùng Vân Anh)** | `@Lpbank2026!` | Lập dự thảo Kế hoạch năm, Phân bổ nguồn lực & Mandays, Soát xét Cấp 2 Giấy tờ làm việc & Dự thảo Báo cáo, Giám sát tiến độ phòng & Timesheet |
| **3** | **3. Trưởng Đoàn Kiểm Toán** | `TeamLeader / Lead` | **danhpc (Phan Cảnh Danh)** | `@Lpbank2026!` | **diepnx (Ninh Xuân Điệp)** | `@Lpbank2026!` | Thành lập đoàn KT, Khảo sát sơ bộ, Phân công việc thành viên, Soát xét Cấp 1 Working Paper, Tạo Review Note, Chốt phát hiện 5C, Lập Báo cáo KT |
| **4** | **4. Thành Viên Đoàn KT (Auditor)** | `Auditor` | **datnc3 (Nguyễn Cảnh Đạt)** | `@Lpbank2026!` | **maict (Cao Thị Mai)** | `@Lpbank2026!` | Thực hiện thủ tục kiểm toán, Biên soạn Giấy tờ làm việc (Working Paper Tiptap), Tải bằng chứng kiểm toán, Nhập phát hiện 5C, Đóng Review Note |
| **5** | **5. Chuyên Gia CNTT & Dữ Liệu** | `IT / CAATs Specialist` | **hoangnk1 (Ngô Kim Hoàng)** | `@Lpbank2026!` | **dungna (Nguyễn Anh Dũng)** | `@Lpbank2026!` | Giám sát liên tục & CAATs, Chạy kịch bản phân tích dữ liệu bất thường (Red Flags), Kiểm toán An ninh mạng & CNTT, Kho tri thức phát hiện AI |
| **6** | **6. Đơn Vị Được Kiểm Toán (Auditee)** | `Auditee` | **hanoibm (Trần Quốc Tuấn)** | `@Lpbank2026!` | **saigonbm (Trịnh Minh Đức)** | `@Lpbank2026!` | Cổng Auditee Portal, Tiếp nhận dự thảo phát hiện 5C, Phản hồi giải trình (Agree/Disagree), Lập Action Plan khắc phục, Đính kèm minh chứng khắc phục |
| **7** | **7. Ban Kiểm Soát (Audit Committee)** | `Audit Committee` | **bks.chair (Trưởng BKS)** | `@Lpbank2026!` | **bks.member (Thành viên BKS)** | `@Lpbank2026!` | Cổng Ban Kiểm Soát (IIA 1000), Giám sát Điều lệ 3 Tuyến, Xem báo cáo tổng hợp rủi ro toàn hệ thống, Giám sát tiến độ Đoàn Thanh tra Giám sát NHNN |
| **8** | **8. Quản Trị Hệ Thống & An Ninh** | `Admin` | **admin (Quản trị viên HT)** | `@Lpbank2026!` | **auditor.ad (Vũ Quản Trị)** | `@Lpbank2026!` | Phân quyền CASL RBAC, Quản lý tài khoản KTV & Lifecycle, Giám sát tính độc lập KTV (IIA 1100 / TT 13), Cấu hình tham số, Nhật ký Audit Trail SHA-256 |

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

## PHẦN III. HƯỚNG DẪN DÀNH CHO DATNC3 & DIEPNX

1. **Cơ chế phân công:**
   - **Tester 1 - Nguyễn Cảnh Đạt (`datnc3`):** Thực hiện luồng khởi tạo, nhập liệu chính, gửi duyệt (Tester 1).
   - **Tester 2 - Ninh Xuân Điệp (`diepnx`):** Thực hiện kiểm tra phê duyệt, kiểm tra chéo, thử nghiệm các trường hợp ngoại lệ / sai sót (Negative cases, validation).
2. **Quy tắc phối hợp đồng thời (Realtime Collaboration):**
   - Đối với tính năng soạn thảo Giấy tờ làm việc (Working Paper Tiptap) và Review Note, hai bạn mở đồng thời trên 2 tab hoặc 2 trình duyệt riêng biệt để kiểm tra tính năng khóa dòng / đồng bộ thời gian thực qua WebSocket.
3. **Quy ước đánh giá:**
   - **PASS (Đạt):** Tính năng chạy trơn tru, đúng logic nghiệp vụ ngân hàng, dữ liệu lưu CSDL chuẩn xác.
   - **FAIL (Lỗi):** Xuất hiện lỗi thông báo 400/403/500, nút bấm không phản hồi, lưu sai dữ liệu.
   - **BLOCKED (Bị chặn):** Bị chặn do tính năng phụ thuộc phía trước chưa hoạt động.

---

## PHẦN IV. KỊCH BẢN KIỂM THỬ CHI TIẾT TỪNG PHÂN HỆ & NÚT BẤM (50 TEST CASES)

### Phân Hệ: 0. Xác thực & Bảo mật

#### `TC-AUTH-01`: Đăng nhập & Bắt buộc đổi mật khẩu
- **Màn hình / URL:** Trang Login (/login)
- **Nút bấm / Thành phần tương tác:** `Form Đăng nhập, Modal Đổi mật khẩu bắt buộc`
- **Điều kiện tiên quyết:** Tài khoản KTV mới import có cờ mustChangePassword = true
- **Các bước thao tác chi tiết (Action Steps):**
  1. Truy cập /login
  2. Nhập username và password mặc định
  3. Bấm nút "Đăng nhập"
  4. Quan sát hiển thị Modal đổi mật khẩu
- **Dữ liệu đầu vào mẫu (Test Input):** User: datnc3 (hoặc thiendh) | Pass: @Lpbank2026!
- **Kết quả mong đợi (Expected Result):** Hệ thống hiển thị Modal "Đổi mật khẩu bắt buộc", giải thích lý do bảo mật, không cho đóng modal.
- **Vai trò nghiệp vụ:** `Tất cả KTV`
- **Tài khoản đăng nhập test:** `datnc3 / diepnx / thiendh` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-AUTH-02`: Xác nhận Đổi mật khẩu hợp lệ (PCI DSS)
- **Màn hình / URL:** Trang Login (/login)
- **Nút bấm / Thành phần tương tác:** `Nút "Xác nhận Đổi mật khẩu"`
- **Điều kiện tiên quyết:** Đang mở modal đổi mật khẩu bắt buộc
- **Các bước thao tác chi tiết (Action Steps):**
  1. Nhập Mật khẩu hiện tại
  2. Nhập Mật khẩu mới đạt chuẩn
  3. Nhập Xác nhận mật khẩu mới
  4. Bấm "Xác nhận Đổi mật khẩu"
- **Dữ liệu đầu vào mẫu (Test Input):** Hiện tại: @Lpbank2026! | Mới: @Bcd12345678 | Xác nhận: @Bcd12345678
- **Kết quả mong đợi (Expected Result):** Thông báo "Đổi mật khẩu thành công!", tự động đăng nhập và chuyển hướng vào Bàn làm việc.
- **Vai trò nghiệp vụ:** `Tất cả KTV`
- **Tài khoản đăng nhập test:** `datnc3 / diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-AUTH-03`: Kiểm tra chặn mật khẩu yếu (Validation)
- **Màn hình / URL:** Trang Login (/login)
- **Nút bấm / Thành phần tương tác:** `Nút "Xác nhận Đổi mật khẩu"`
- **Điều kiện tiên quyết:** Đang mở modal đổi mật khẩu bắt buộc
- **Các bước thao tác chi tiết (Action Steps):**
  1. Nhập mật khẩu mới <12 ký tự hoặc thiếu số/ký tự đặc biệt
  2. Bấm "Xác nhận Đổi mật khẩu"
- **Dữ liệu đầu vào mẫu (Test Input):** Mật khẩu mới: 123456 (hoặc Abcdef123)
- **Kết quả mong đợi (Expected Result):** Hệ thống chặn ngay tại form, báo lỗi đỏ rõ ràng về độ dài tối thiểu 12 ký tự và tính phức tạp.
- **Vai trò nghiệp vụ:** `Tất cả KTV`
- **Tài khoản đăng nhập test:** `datnc3 / diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-AUTH-04`: Đăng xuất an toàn & Xóa Session
- **Màn hình / URL:** Thanh Header
- **Nút bấm / Thành phần tương tác:** `Menu User Avatar -> Nút "Đăng xuất"`
- **Điều kiện tiên quyết:** Đang đăng nhập vào hệ thống
- **Các bước thao tác chi tiết (Action Steps):**
  1. Bấm avatar góc trên bên phải
  2. Chọn "Đăng xuất"
  3. Thử bấm nút Back trên trình duyệt
- **Dữ liệu đầu vào mẫu (Test Input):** Thao tác click Đăng xuất
- **Kết quả mong đợi (Expected Result):** Chuyển về /login, xóa sạch token & user khỏi localStorage, bấm Back không quay lại được trang trước.
- **Vai trò nghiệp vụ:** `Tất cả vai trò`
- **Tài khoản đăng nhập test:** `datnc3 / diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-AUTH-05`: Khóa tài khoản khi nhập sai 5 lần
- **Màn hình / URL:** Trang Login (/login)
- **Nút bấm / Thành phần tương tác:** `Nút "Đăng nhập"`
- **Điều kiện tiên quyết:** Tài khoản đang hoạt động bình thường
- **Các bước thao tác chi tiết (Action Steps):**
  1. Nhập sai mật khẩu liên tiếp 5 lần cho 1 tài khoản test
  2. Quan sát thông báo ở lần 3, 4, 5
- **Dữ liệu đầu vào mẫu (Test Input):** User: maict | Pass sai: 111111111
- **Kết quả mong đợi (Expected Result):** Lần 3-4 cảnh báo số lần còn lại. Lần thứ 5 báo tài khoản bị khóa 30 phút theo PCI DSS.
- **Vai trò nghiệp vụ:** `KTV / Auditee`
- **Tài khoản đăng nhập test:** `maict / thiendh` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 1. Bàn Làm Việc

#### `TC-WB-01`: Xem Thống Kê Điều Hành Cuộc KT
- **Màn hình / URL:** Trang chủ (/)
- **Nút bấm / Thành phần tương tác:** `Cards KPI: Tổng số cuộc KT, Đang thực hiện, Đã xong`
- **Điều kiện tiên quyết:** Đăng nhập tài khoản Lãnh đạo Khối (hiepnt) hoặc Trưởng phòng (luongnt2)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập user Lãnh đạo Khối
  2. Truy cập trang chủ /
  3. Xem các chỉ số thẻ KPI
  4. Bấm vào từng card để drill-down
- **Dữ liệu đầu vào mẫu (Test Input):** User: hiepnt / luongnt2 | Pass: @Lpbank2026!
- **Kết quả mong đợi (Expected Result):** Số liệu khớp với danh sách cuộc kiểm toán thực tế trong CSDL, biểu đồ hiển thị trực quan.
- **Vai trò nghiệp vụ:** `Lãnh đạo Khối / Phòng`
- **Tài khoản đăng nhập test:** `hiepnt / luongnt2` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WB-02`: Danh sách "Việc Cần Xử Lý"
- **Màn hình / URL:** Trang chủ (/)
- **Nút bấm / Thành phần tương tác:** `Bảng "Việc cần xử lý" (Action Required)`
- **Điều kiện tiên quyết:** KTV có Working Paper chờ duyệt hoặc Review Note mở
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập tài khoản Trưởng đoàn danhpc hoặc diepnx
  2. Kiểm tra tab "Việc cần xử lý"
  3. Bấm vào 1 việc để mở chi tiết
- **Dữ liệu đầu vào mẫu (Test Input):** User: danhpc / diepnx | Pass: @Lpbank2026!
- **Kết quả mong đợi (Expected Result):** Điều hướng chính xác đến đúng Working Paper hoặc Phát hiện tương ứng để xử lý.
- **Vai trò nghiệp vụ:** `Trưởng đoàn / KTV`
- **Tài khoản đăng nhập test:** `danhpc / diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WB-03`: Biểu đồ Heatmap & Phân Bổ Rủi Ro
- **Màn hình / URL:** Trang chủ (/)
- **Nút bấm / Thành phần tương tác:** `Recharts Heatmap rủi ro đơn vị`
- **Điều kiện tiên quyết:** Đã có dữ liệu đánh giá rủi ro đối tượng
- **Các bước thao tác chi tiết (Action Steps):**
  1. Di chuột vào các ô Heatmap rủi ro
  2. Xem tooltip hiển thị tên đơn vị và điểm rủi ro
- **Dữ liệu đầu vào mẫu (Test Input):** Hover mouse trên biểu đồ
- **Kết quả mong đợi (Expected Result):** Tooltip hiển thị mượt mà, phân cấp màu đỏ (Cao), cam (TB), xanh (Thấp) chính xác.
- **Vai trò nghiệp vụ:** `Lãnh đạo / Chuyên gia`
- **Tài khoản đăng nhập test:** `hiepnt / hoangnk1` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 2. Rủi Ro & Kế Hoạch

#### `TC-RP-01`: Quản lý Đối Tượng Kiểm Toán (Universe)
- **Màn hình / URL:** Phạm vi KT (/risk-and-planning?step=scope)
- **Nút bấm / Thành phần tương tác:** `Nút "Thêm đối tượng kiểm toán", Bảng Universe`
- **Điều kiện tiên quyết:** Quyền Trưởng phòng / Lãnh đạo Khối / Admin
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập user Lãnh đạo phòng
  2. Mở tab 1. Phạm vi kiểm toán
  3. Bấm "Thêm đối tượng"
  4. Nhập Mã, Tên, Phân loại, Đơn vị quản lý
  5. Bấm "Lưu"
- **Dữ liệu đầu vào mẫu (Test Input):** Mã: CN_HANOI | Tên: Chi nhánh Hà Nội | Loại: Chi nhánh loại 1
- **Kết quả mong đợi (Expected Result):** Đối tượng hiển thị trên danh sách ngay lập tức, lưu vào bảng audit_universe trong CSDL.
- **Vai trò nghiệp vụ:** `Lãnh đạo Phòng / KTV`
- **Tài khoản đăng nhập test:** `luongnt2 / anhpv7` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-RP-02`: Import Danh Sách Đối Tượng Từ Excel
- **Màn hình / URL:** Phạm vi KT (/risk-and-planning?step=scope)
- **Nút bấm / Thành phần tương tác:** `Nút "Nhập từ Excel" (Bulk Import)`
- **Điều kiện tiên quyết:** Có file Excel mẫu đối tượng kiểm toán
- **Các bước thao tác chi tiết (Action Steps):**
  1. Bấm nút "Nhập từ Excel"
  2. Kéo thả file Excel vào khung upload
  3. Bấm "Tải lên & Xử lý"
- **Dữ liệu đầu vào mẫu (Test Input):** File: 01_Mau_Import_Doi_Tuong_KT.xlsx
- **Kết quả mong đợi (Expected Result):** Hệ thống báo import thành công X dòng, không lỗi format, bảng dữ liệu tự động refresh.
- **Vai trò nghiệp vụ:** `Admin / Lãnh đạo Phòng`
- **Tài khoản đăng nhập test:** `admin / luongnt2` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-RP-03`: Quản trị Thư Viện Rủi Ro & Kiểm Soát (RCM)
- **Màn hình / URL:** Thư viện RCM (/risk-and-planning?step=library)
- **Nút bấm / Thành phần tương tác:** `Nút "Thêm rủi ro", Modal RCM`
- **Điều kiện tiên quyết:** Đăng nhập KTV / Lãnh đạo phòng
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở tab 2. Thư viện rủi ro & kiểm soát
  2. Bấm "Thêm rủi ro mới"
  3. Chọn Quy trình COSO, Nhập Tên rủi ro, Biện pháp kiểm soát gợi ý
  4. Bấm "Lưu"
- **Dữ liệu đầu vào mẫu (Test Input):** Quy trình: Cho vay KHDN | Rủi ro: Thẩm định sai giá trị TSBĐ | Kiểm soát: Định giá độc lập 2 cấp
- **Kết quả mong đợi (Expected Result):** Rủi ro được gắn vào thư viện RCM, sẵn sàng để tái sử dụng khi lập kế hoạch cuộc kiểm toán.
- **Vai trò nghiệp vụ:** `KTV Cao cấp / Chuyên gia`
- **Tài khoản đăng nhập test:** `diepnx / hoangnk1` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-RP-04`: Chấm Điểm Rủi Ro Đối Tượng (Risk Scoring)
- **Màn hình / URL:** Đánh giá rủi ro (/risk-and-planning?step=prioritization)
- **Nút bấm / Thành phần tương tác:** `Form Chấm điểm: Tác động (1-5), Khả năng (1-5)`
- **Điều kiện tiên quyết:** Đã chọn đối tượng cần đánh giá
- **Các bước thao tác chi tiết (Action Steps):**
  1. Chọn đơn vị Chi nhánh Hà Nội
  2. Chấm Điểm tác động: 4, Điểm xác suất: 4
  3. Chọn Khẩu vị rủi ro: Giảm thiểu (Mitigate)
  4. Bấm "Lưu đánh giá"
- **Dữ liệu đầu vào mẫu (Test Input):** Impact: 4, Likelihood: 4, Control: 3
- **Kết quả mong đợi (Expected Result):** Hệ thống tự động tính Rủi ro cố hữu = 16 (Cao), Rủi ro còn lại = 8 (Trung bình), xếp hạng ưu tiên kiểm toán.
- **Vai trò nghiệp vụ:** `Lãnh đạo Phòng / Trưởng đoàn`
- **Tài khoản đăng nhập test:** `diepnx / anhpv7` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-RP-05`: Lập Kế Hoạch Kiểm Toán Năm & Phân Bổ Mandays
- **Màn hình / URL:** Kế hoạch năm (/risk-and-planning?step=plan)
- **Nút bấm / Thành phần tương tác:** `Nút "Thêm cuộc KT vào kế hoạch", Bảng Kế hoạch`
- **Điều kiện tiên quyết:** Đã có danh sách đối tượng ưu tiên kiểm toán
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở tab 4. Kế hoạch & nguồn lực
  2. Bấm "Thêm cuộc kiểm toán"
  3. Chọn đối tượng, Quý thực hiện (Q1/Q2/Q3/Q4), Số ngày công (Mandays)
  4. Bấm "Lưu"
- **Dữ liệu đầu vào mẫu (Test Input):** Cuộc KT: KT Toàn diện CN Hà Nội | Thời gian: Q2/2026 | Mandays: 45 ngày công
- **Kết quả mong đợi (Expected Result):** Cuộc kiểm toán hiển thị trên biểu đồ Gantt kế hoạch năm và bảng phân bổ ngày công.
- **Vai trò nghiệp vụ:** `Lãnh đạo Phòng`
- **Tài khoản đăng nhập test:** `luongnt2 / anhpv7` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-RP-06`: Quy Trình Trình & Phê Duyệt Kế Hoạch Năm
- **Màn hình / URL:** Kế hoạch năm (/risk-and-planning?step=plan)
- **Nút bấm / Thành phần tương tác:** `Nút "Gửi phê duyệt", Nút "Phê duyệt kế hoạch"`
- **Điều kiện tiên quyết:** Kế hoạch năm đang ở trạng thái Dự thảo (Draft)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập user luongnt2 bấm "Gửi phê duyệt"
  2. Đăng nhập user hiepnt (Phó Giám đốc Khối)
  3. Kiểm tra thông báo và bấm "Phê duyệt kế hoạch"
- **Dữ liệu đầu vào mẫu (Test Input):** Thao tác phê duyệt kèm nhận xét: "Thống nhất triển khai theo kế hoạch"
- **Kết quả mong đợi (Expected Result):** Trạng thái chuyển từ Draft -> PendingApproval -> Approved. Nhật ký ghi nhận thời gian và người duyệt.
- **Vai trò nghiệp vụ:** `Lãnh đạo Phòng -> Lãnh đạo Khối`
- **Tài khoản đăng nhập test:** `luongnt2 -> hiepnt` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 3. Cuộc KT Thực Địa

#### `TC-ENG-01`: Khởi Tạo Cuộc Kiểm Toán Chi Tiết
- **Màn hình / URL:** Danh sách Cuộc KT (/audit-engagements)
- **Nút bấm / Thành phần tương tác:** `Nút "Tạo cuộc kiểm toán mới"`
- **Điều kiện tiên quyết:** Đã duyệt kế hoạch năm hoặc cuộc kiểm toán đột xuất
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở /audit-engagements
  2. Bấm "Tạo cuộc kiểm toán mới"
  3. Nhập Mã cuộc KT, Tên, Ngày bắt đầu, Ngày kết thúc thực địa
  4. Bấm "Lưu"
- **Dữ liệu đầu vào mẫu (Test Input):** Mã: ENG-2026-HN01 | Tên: Kiểm toán hoạt động tín dụng CN Hà Nội | 01/04/2026 - 25/04/2026
- **Kết quả mong đợi (Expected Result):** Cuộc kiểm toán tạo thành công với trạng thái "Khởi tạo (Planning)".
- **Vai trò nghiệp vụ:** `Lãnh đạo Phòng / Trưởng đoàn`
- **Tài khoản đăng nhập test:** `diepnx / danhpc` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-ENG-02`: Thành Lập Đoàn KT & Phân Công Công Việc
- **Màn hình / URL:** Chi tiết Cuộc KT (/audit-engagements/:id)
- **Nút bấm / Thành phần tương tác:** `Tab "Thành viên đoàn", Nút "Thêm KTV vào đoàn"`
- **Điều kiện tiên quyết:** Cuộc kiểm toán đang ở bước chuẩn bị
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở chi tiết cuộc KT
  2. Chọn Trưởng đoàn: diepnx
  3. Thêm Thành viên: datnc3, maict
  4. Gán phạm vi nghiệp vụ cho từng KTV
  5. Bấm "Lưu danh sách"
- **Dữ liệu đầu vào mẫu (Test Input):** Trưởng đoàn: diepnx | KTV 1: datnc3 (Nghiệp vụ Tín dụng) | KTV 2: maict (Kế toán & Kho quỹ)
- **Kết quả mong đợi (Expected Result):** Hệ thống kiểm tra cảnh báo tính độc lập KTV (nếu KTV từng làm tại CN Hà Nội thì báo cảnh báo). Gán đoàn thành công.
- **Vai trò nghiệp vụ:** `Lãnh đạo Phòng`
- **Tài khoản đăng nhập test:** `luongnt2 / anhpv7` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-ENG-03`: Khảo Sát Sơ Bộ & Đề Cương Kiểm Toán
- **Màn hình / URL:** Chi tiết Cuộc KT (/audit-engagements/:id)
- **Nút bấm / Thành phần tương tác:** `Tab "Khảo sát sơ bộ", Form Đề cương`
- **Điều kiện tiên quyết:** Đoàn kiểm toán đã thành lập
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập Trưởng đoàn diepnx
  2. Mở tab Khảo sát sơ bộ
  3. Nhập thông tin rủi ro ban đầu thu thập từ đơn vị
  4. Soạn thảo mục tiêu và phạm vi chi tiết cuộc KT
  5. Bấm "Lưu đề cương"
- **Dữ liệu đầu vào mẫu (Test Input):** Mục tiêu: Đánh giá tuân thủ quy trình cấp tín dụng và xử lý nợ có vấn đề
- **Kết quả mong đợi (Expected Result):** Dữ liệu đề cương được lưu trữ, Trưởng đoàn bấm "Trình duyệt kế hoạch thực địa".
- **Vai trò nghiệp vụ:** `Trưởng đoàn kiểm toán`
- **Tài khoản đăng nhập test:** `diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-ENG-04`: Tạo & Duyệt Yêu Cầu Thay Đổi Cuộc KT (Change Request)
- **Màn hình / URL:** Phê duyệt thay đổi (/engagement-change-requests)
- **Nút bấm / Thành phần tương tác:** `Nút "Tạo yêu cầu thay đổi", Nút "Phê duyệt"`
- **Điều kiện tiên quyết:** Cuộc kiểm toán phát sinh gia hạn hoặc bổ sung KTV
- **Các bước thao tác chi tiết (Action Steps):**
  1. Trưởng đoàn diepnx tạo yêu cầu: "Gia hạn thêm 3 ngày do dữ liệu phức tạp"
  2. Lãnh đạo Phòng luongnt2 nhận thông báo, kiểm tra lý do và bấm "Phê duyệt"
- **Dữ liệu đầu vào mẫu (Test Input):** Lý do: Phát sinh mẫu kiểm toán lớn tại PGD trực thuộc, gia hạn đến 28/04/2026
- **Kết quả mong đợi (Expected Result):** Yêu cầu được duyệt, ngày kết thúc cuộc kiểm toán tự động cập nhật, Audit Trail ghi nhận sự kiện.
- **Vai trò nghiệp vụ:** `Trưởng đoàn -> Lãnh đạo Phòng`
- **Tài khoản đăng nhập test:** `diepnx -> luongnt2` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 4. Giấy Tờ Làm Việc

#### `TC-WP-01`: Tạo Giấy Tờ Làm Việc Mới (Working Paper)
- **Màn hình / URL:** Working Papers (/working-papers)
- **Nút bấm / Thành phần tương tác:** `Nút "Thêm Giấy tờ làm việc mới"`
- **Điều kiện tiên quyết:** Đăng nhập user datnc3 (KTV thành viên)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập user datnc3
  2. Mở /working-papers
  3. Bấm "Thêm Giấy tờ làm việc mới"
  4. Chọn Cuộc KT, Nhập Mã WP (WP-TD-01), Tên thủ tục
  5. Bấm "Tạo"
- **Dữ liệu đầu vào mẫu (Test Input):** Mã WP: WP-TD-01 | Tên: Kiểm tra hồ sơ tín dụng khách hàng doanh nghiệp lớn
- **Kết quả mong đợi (Expected Result):** Working Paper được tạo ở trạng thái "Bản nháp (Draft)", mở giao diện soạn thảo Tiptap.
- **Vai trò nghiệp vụ:** `Thành viên đoàn (Auditor)`
- **Tài khoản đăng nhập test:** `datnc3` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WP-02`: Biên Soạn Nội Dung Với Trình Soạn Thảo Tiptap
- **Màn hình / URL:** Soạn thảo WP (/working-papers/:id)
- **Nút bấm / Thành phần tương tác:** `Tiptap Rich-Text Editor (Bảng, Checklist, Định dạng)`
- **Điều kiện tiên quyết:** Đang mở Working Paper WP-TD-01
- **Các bước thao tác chi tiết (Action Steps):**
  1. Nhập Mục đích kiểm toán, Phạm vi chọn mẫu
  2. Chèn bảng kết quả kiểm tra mẫu (10 hồ sơ)
  3. Đánh dấu checklist kiểm tra tuân thủ điều kiện giải ngân
- **Dữ liệu đầu vào mẫu (Test Input):** Soạn thảo văn bản có bảng biểu và gạch đầu dòng checklist
- **Kết quả mong đợi (Expected Result):** Nội dung định dạng chuẩn đẹp, tự động lưu (Auto-save) sau mỗi 30 giây hoặc khi bấm "Lưu".
- **Vai trò nghiệp vụ:** `Thành viên đoàn (Auditor)`
- **Tài khoản đăng nhập test:** `datnc3` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WP-03`: Kiểm Thử Cộng Tác Trực Tiếp Thời Gian Thực (Yjs Collab)
- **Màn hình / URL:** Soạn thảo WP (/working-papers/:id)
- **Nút bấm / Thành phần tương tác:** `Yjs WebSocket Collaborative Editor`
- **Điều kiện tiên quyết:** Bạn Đạt (datnc3) và Bạn Điệp (diepnx) cùng mở 1 WP trên 2 trình duyệt
- **Các bước thao tác chi tiết (Action Steps):**
  1. Bạn Đạt mở WP-TD-01 và gõ văn bản
  2. Bạn Điệp cùng mở WP-TD-01 trên trình duyệt khác
  3. Quan sát con trỏ chuột và chữ xuất hiện tức thì
- **Dữ liệu đầu vào mẫu (Test Input):** Gõ chữ đồng thời tại 2 vị trí khác nhau trong văn bản
- **Kết quả mong đợi (Expected Result):** Nhìn thấy con trỏ màu đại diện cho bạn Điệp, văn bản đồng bộ realtime không bị ghi đè dữ liệu.
- **Vai trò nghiệp vụ:** `2 KTV phối hợp`
- **Tài khoản đăng nhập test:** `datnc3 & diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WP-04`: Tải Lên Bằng Chứng Kiểm Toán & Đánh Chỉ Mục (Index)
- **Màn hình / URL:** Soạn thảo WP (/working-papers/:id)
- **Nút bấm / Thành phần tương tác:** `Khung Upload "Bằng chứng kiểm toán" (Evidence)`
- **Điều kiện tiên quyết:** Có file PDF/Excel biên bản kiểm tra thực địa
- **Các bước thao tác chi tiết (Action Steps):**
  1. Bấm nút "Tải tệp đính kèm"
  2. Chọn file BB_Kiem_Ke_TSBD.pdf
  3. Đặt mã tham chiếu (Cross-reference): WP-TD-01.A
  4. Bấm "Lưu bằng chứng"
- **Dữ liệu đầu vào mẫu (Test Input):** File đính kèm: PDF hoặc XLSX (dung lượng < 25MB)
- **Kết quả mong đợi (Expected Result):** File tải lên thành công, hiển thị trong danh mục bằng chứng của WP, bấm vào xem trước (preview) được.
- **Vai trò nghiệp vụ:** `Thành viên đoàn (Auditor)`
- **Tài khoản đăng nhập test:** `datnc3` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WP-05`: Gửi Soát Xét Working Paper (Submit for Review)
- **Màn hình / URL:** Soạn thảo WP (/working-papers/:id)
- **Nút bấm / Thành phần tương tác:** `Nút "Gửi Trưởng đoàn soát xét"`
- **Điều kiện tiên quyết:** Working Paper đã hoàn thiện nội dung và đính kèm bằng chứng
- **Các bước thao tác chi tiết (Action Steps):**
  1. KTV datnc3 bấm nút "Gửi Trưởng đoàn soát xét"
  2. Nhập ghi chú bàn giao
  3. Bấm xác nhận
- **Dữ liệu đầu vào mẫu (Test Input):** Ghi chú: "Em Đạt đã hoàn thành kiểm tra 10 hồ sơ mẫu, kính gửi anh Điệp soát xét."
- **Kết quả mong đợi (Expected Result):** Trạng thái chuyển sang "Chờ soát xét (Submitted)". Khóa chỉnh sửa đối với KTV lập.
- **Vai trò nghiệp vụ:** `Thành viên đoàn (Auditor)`
- **Tài khoản đăng nhập test:** `datnc3` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WP-06`: Trưởng Đoàn Soát Xét Cấp 1 & Tạo Review Note
- **Màn hình / URL:** Chi tiết WP (/working-papers/:id)
- **Nút bấm / Thành phần tương tác:** `Nút "Tạo Review Note", Nút "Phê duyệt cấp 1"`
- **Điều kiện tiên quyết:** Đăng nhập tài khoản Trưởng đoàn (diepnx)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Trưởng đoàn diepnx mở WP-TD-01 ở trạng thái Submitted
  2. Bôi đen đoạn văn bản nghi vấn và bấm "Tạo Review Note"
  3. Nhập câu hỏi yêu cầu giải trình
  4. Bấm "Gửi Note"
- **Dữ liệu đầu vào mẫu (Test Input):** Nội dung Note: "Thiếu chứng thư thẩm định giá số 12/2025, đề nghị KTV Đạt bổ sung."
- **Kết quả mong đợi (Expected Result):** Review Note màu vàng ghim vào đúng vị trí văn bản. KTV datnc3 nhận thông báo cần xử lý.
- **Vai trò nghiệp vụ:** `Trưởng đoàn kiểm toán`
- **Tài khoản đăng nhập test:** `diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WP-07`: Phản Hồi & Đóng Review Note
- **Màn hình / URL:** Chi tiết WP (/working-papers/:id)
- **Nút bấm / Thành phần tương tác:** `Nút "Trả lời", Nút "Đóng Review Note"`
- **Điều kiện tiên quyết:** Working Paper có Review Note đang mở (Open)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Bạn Đạt mở Note, nhập phản hồi giải trình và đính kèm bổ sung tài liệu
  2. Bạn Điệp kiểm tra và bấm "Đóng Note (Close Note)"
- **Dữ liệu đầu vào mẫu (Test Input):** Phản hồi: "Đã bổ sung chứng thư thẩm định giá đính kèm tại mục WP-TD-01.B"
- **Kết quả mong đợi (Expected Result):** Review Note chuyển trạng thái sang "Đã đóng (Closed)". Trưởng đoàn có thể bấm "Phê duyệt cấp 1".
- **Vai trò nghiệp vụ:** `KTV & Trưởng đoàn`
- **Tài khoản đăng nhập test:** `datnc3 & diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-WP-08`: Lãnh Đạo Phòng Soát Xét Cấp 2 (Level 2 Review)
- **Màn hình / URL:** Chi tiết WP (/working-papers/:id)
- **Nút bấm / Thành phần tương tác:** `Nút "Phê duyệt cấp phòng"`
- **Điều kiện tiên quyết:** WP đã được Trưởng đoàn phê duyệt Cấp 1
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập tài khoản Lãnh đạo Phòng (luongnt2)
  2. Mở WP và bấm "Phê duyệt cấp phòng"
- **Dữ liệu đầu vào mẫu (Test Input):** Nhận xét: "Thống nhất chất lượng giấy tờ làm việc."
- **Kết quả mong đợi (Expected Result):** Trạng thái chuyển thành "Đã hoàn thành & Đóng băng (Approved)". Không ai có thể chỉnh sửa nội dung nữa.
- **Vai trò nghiệp vụ:** `Lãnh đạo Phòng`
- **Tài khoản đăng nhập test:** `luongnt2` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 5. Phát Hiện Kiểm Toán

#### `TC-FIND-01`: Tạo Mới Phát Hiện Theo Chuẩn 5C Quốc Tế
- **Màn hình / URL:** Phát hiện 5C (/findings-hub?tab=findings)
- **Nút bấm / Thành phần tương tác:** `Nút "Thêm phát hiện 5C mới", Form 5C`
- **Điều kiện tiên quyết:** Từ kết quả kiểm tra Working Paper phát hiện sai sót
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập datnc3
  2. Bấm "Thêm phát hiện 5C mới"
  3. Nhập đầy đủ 5 thành tố:
     - Condition (Thực trạng)
     - Criteria (Quy định viện dẫn)
     - Cause (Nguyên nhân gốc rễ)
     - Consequence (Hậu quả/Rủi ro)
     - Corrective Action (Kiến nghị)
  4. Bấm "Lưu phát hiện"
- **Dữ liệu đầu vào mẫu (Test Input):** Thực trạng: Giải ngân thiếu chứng từ thẩm định độc lập 5 hồ sơ | Viện dẫn: TT 39/2016/TT-NHNN Điều 15 | Rủi ro: Thất thoát vốn vay | Kiến nghị: Thu hồi nợ trước hạn
- **Kết quả mong đợi (Expected Result):** Phát hiện được tạo thành công, gắn mã tự động (FIND-2026-001) với trạng thái "Dự thảo (Draft)".
- **Vai trò nghiệp vụ:** `Thành viên đoàn / Trưởng đoàn`
- **Tài khoản đăng nhập test:** `datnc3` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-FIND-02`: Phân Loại Mức Độ Rủi Ro Của Phát Hiện
- **Màn hình / URL:** Phát hiện 5C (/findings-hub?tab=findings)
- **Nút bấm / Thành phần tương tác:** `Dropdown "Mức độ rủi ro": Cao / Trung bình / Thấp`
- **Điều kiện tiên quyết:** Đang tạo hoặc sửa phát hiện 5C
- **Các bước thao tác chi tiết (Action Steps):**
  1. Chọn Mức độ rủi ro: Cao (High)
  2. Chọn Nhóm nghiệp vụ: Tín dụng
  3. Chọn Đơn vị chịu trách nhiệm: Chi nhánh Hà Nội
  4. Bấm "Lưu"
- **Dữ liệu đầu vào mẫu (Test Input):** Mức độ: High (Rủi ro trọng yếu)
- **Kết quả mong đợi (Expected Result):** Phát hiện hiển thị Tag màu Đỏ (High). Thống kê số lượng phát hiện rủi ro cao tự động nhảy số trên Dashboard.
- **Vai trò nghiệp vụ:** `Trưởng đoàn kiểm toán`
- **Tài khoản đăng nhập test:** `diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-FIND-03`: Gửi Phát Hiện Sang Cổng Đơn Vị Được KT (Auditee)
- **Màn hình / URL:** Phát hiện 5C (/findings-hub?tab=findings)
- **Nút bấm / Thành phần tương tác:** `Nút "Gửi đơn vị thống nhất (Send to Auditee)"`
- **Điều kiện tiên quyết:** Trưởng đoàn diepnx đã soát xét xong danh mục phát hiện
- **Các bước thao tác chi tiết (Action Steps):**
  1. Chọn các phát hiện cần gửi
  2. Bấm "Gửi đơn vị thống nhất"
  3. Xác nhận thời hạn phản hồi giải trình (ví dụ 5 ngày)
- **Dữ liệu đầu vào mẫu (Test Input):** Hạn phản hồi: 5 ngày làm việc
- **Kết quả mong đợi (Expected Result):** Trạng thái chuyển sang "Chờ đơn vị phản hồi (SentToAuditee)". Cổng Auditee Portal của Chi nhánh Hà Nội hiển thị phát hiện này.
- **Vai trò nghiệp vụ:** `Trưởng đoàn kiểm toán`
- **Tài khoản đăng nhập test:** `diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 6. Cổng Auditee

#### `TC-AUD-01`: Auditee Đăng Nhập & Xem Danh Sách Phát Hiện
- **Màn hình / URL:** Cổng Auditee (/auditee-portal)
- **Nút bấm / Thành phần tương tác:** `Bảng "Phát hiện chờ phản hồi giải trình"`
- **Điều kiện tiên quyết:** Bạn Đạt/Điệp đăng nhập tài khoản Giám đốc CN Hà Nội (hanoibm)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập user hanoibm
  2. Truy cập /auditee-portal
  3. Xem danh sách các phát hiện đoàn KT vừa gửi
  4. Bấm vào chi tiết phát hiện để đọc nội dung 5C
- **Dữ liệu đầu vào mẫu (Test Input):** User: hanoibm | Pass: @Lpbank2026!
- **Kết quả mong đợi (Expected Result):** Chỉ xem được các phát hiện thuộc đúng Chi nhánh Hà Nội, không xem được phát hiện của Chi nhánh khác (bảo mật phân quyền).
- **Vai trò nghiệp vụ:** `Đơn vị được KT (Auditee)`
- **Tài khoản đăng nhập test:** `hanoibm / saigonbm` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-AUD-02`: Phản Hồi Giải Trình: Đồng Ý Hoặc Không Đồng Ý
- **Màn hình / URL:** Cổng Auditee (/auditee-portal)
- **Nút bấm / Thành phần tương tác:** `Radio "Đồng ý (Agree)" / "Giải trình khác (Disagree)", Form`
- **Điều kiện tiên quyết:** Đang mở chi tiết phát hiện ở trạng thái chờ phản hồi
- **Các bước thao tác chi tiết (Action Steps):**
  1. Trường hợp 1: Chọn "Đồng ý với phát hiện của đoàn KT"
  2. Trường hợp 2: Chọn "Không đồng ý / Giải trình thêm", nhập lý do và đính kèm văn bản chứng minh
  3. Bấm "Gửi phản hồi"
- **Dữ liệu đầu vào mẫu (Test Input):** Ý kiến giải trình: "Đơn vị đã bổ sung chứng từ thẩm định ngày 20/04 do lỗi lưu trữ"
- **Kết quả mong đợi (Expected Result):** Hệ thống ghi nhận ý kiến phản hồi của Auditee. Trưởng đoàn KT nhận thông báo để xem xét thống nhất.
- **Vai trò nghiệp vụ:** `Đơn vị được KT (Auditee)`
- **Tài khoản đăng nhập test:** `hanoibm` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-AUD-03`: Lập Kế Hoạch Hành Động Khắc Phục (Action Plan)
- **Màn hình / URL:** Cổng Auditee (/auditee-portal)
- **Nút bấm / Thành phần tương tác:** `Form Kế hoạch hành động, Chọn Ngày cam kết (Target Date)`
- **Điều kiện tiên quyết:** Phát hiện đã được 2 bên thống nhất (Agreed)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Nhập Kế hoạch hành động khắc phục chi tiết
  2. Chọn Ngày cam kết hoàn thành (Target Completion Date)
  3. Chỉ định Cán bộ đầu mối phụ trách thực hiện
  4. Bấm "Cam kết thực hiện"
- **Dữ liệu đầu vào mẫu (Test Input):** Hành động: Thu hồi toàn bộ nợ trước hạn trong 30 ngày | Cam kết: 30/05/2026 | Đầu mối: Vũ Đức Thắng (TP Tín dụng)
- **Kết quả mong đợi (Expected Result):** Kế hoạch hành động được lưu, chuyển vào hệ thống theo dõi SLA kiến nghị của Khối KTNB.
- **Vai trò nghiệp vụ:** `Đơn vị được KT (Auditee)`
- **Tài khoản đăng nhập test:** `hanoibm` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-AUD-04`: Cập Nhật Tiến Độ & Nộp Minh Chứng Hoàn Thành
- **Màn hình / URL:** Cổng Auditee (/auditee-portal)
- **Nút bấm / Thành phần tương tác:** `Nút "Báo cáo hoàn thành kiến nghị", Upload minh chứng`
- **Điều kiện tiên quyết:** Kiến nghị đang trong quá trình thực hiện
- **Các bước thao tác chi tiết (Action Steps):**
  1. Auditee mở kiến nghị đang theo dõi
  2. Nhập nội dung kết quả khắc phục
  3. Tải lên tệp scan Giấy nộp tiền / Biên bản khắc phục
  4. Bấm "Gửi KTV nghiệm thu đóng kiến nghị"
- **Dữ liệu đầu vào mẫu (Test Input):** Tệp đính kèm: UNC_Thu_Hoi_No.pdf | Nội dung: Đã thu hồi toàn bộ 5 tỷ nợ gốc
- **Kết quả mong đợi (Expected Result):** Trạng thái chuyển sang "Chờ KTV xác nhận đóng (PendingVerification)".
- **Vai trò nghiệp vụ:** `Đơn vị được KT (Auditee)`
- **Tài khoản đăng nhập test:** `hanoibm` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 7. Báo Cáo Kiểm Toán

#### `TC-REP-01`: Tổng Hợp Dự Thảo Báo Cáo Kiểm Toán
- **Màn hình / URL:** Báo cáo KT (/findings-hub?tab=reports)
- **Nút bấm / Thành phần tương tác:** `Nút "Tạo Báo cáo kiểm toán mới"`
- **Điều kiện tiên quyết:** Cuộc kiểm toán đã hoàn thành thực địa và chốt danh mục phát hiện
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập Trưởng đoàn diepnx
  2. Mở tab Báo cáo KT
  3. Bấm "Tạo Báo cáo kiểm toán mới"
  4. Chọn Cuộc KT: Kiểm toán CN Hà Nội
  5. Hệ thống tự động kéo toàn bộ phát hiện 5C đã thống nhất vào báo cáo
- **Dữ liệu đầu vào mẫu (Test Input):** Chọn cuộc kiểm toán đã thực hiện xong
- **Kết quả mong đợi (Expected Result):** Dự thảo báo cáo được tổng hợp đầy đủ số lượng phát hiện, phân bổ mức độ rủi ro và các kiến nghị.
- **Vai trò nghiệp vụ:** `Trưởng đoàn kiểm toán`
- **Tài khoản đăng nhập test:** `diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-REP-02`: Đánh Giá Xếp Hạng Hệ Thống KSNB Của Đơn Vị
- **Màn hình / URL:** Báo cáo KT (/findings-hub?tab=reports)
- **Nút bấm / Thành phần tương tác:** `Dropdown "Xếp hạng KSNB": Tốt / Khá / Trung bình / Yếu`
- **Điều kiện tiên quyết:** Đang soạn thảo phần kết luận báo cáo kiểm toán
- **Các bước thao tác chi tiết (Action Steps):**
  1. Căn cứ vào ma trận số lượng lỗi phát hiện
  2. Chọn Xếp hạng hệ thống KSNB: "Trung bình"
  3. Nhập Ý kiến kết luận tổng thể của Đoàn kiểm toán
  4. Bấm "Lưu kết luận"
- **Dữ liệu đầu vào mẫu (Test Input):** Xếp hạng: Trung bình | Kết luận: Hoạt động tuân thủ cơ bản, còn tồn tại rủi ro trong quản lý TSBĐ
- **Kết quả mong đợi (Expected Result):** Xếp hạng được ghi nhận, hiển thị huy hiệu (Badge) màu tương ứng trên báo cáo.
- **Vai trò nghiệp vụ:** `Trưởng đoàn / Lãnh đạo Phòng`
- **Tài khoản đăng nhập test:** `diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-REP-03`: Trình & Phê Duyệt Phát Hành Báo Cáo KT (3 Cấp)
- **Màn hình / URL:** Báo cáo KT (/findings-hub?tab=reports)
- **Nút bấm / Thành phần tương tác:** `Nút "Trình duyệt", Nút "Phê duyệt & Ký số phát hành"`
- **Điều kiện tiên quyết:** Dự thảo báo cáo đã hoàn thiện
- **Các bước thao tác chi tiết (Action Steps):**
  1. Trưởng đoàn diepnx bấm "Trình Lãnh đạo Phòng"
  2. Lãnh đạo Phòng luongnt2 duyệt và "Trình Lãnh đạo Khối"
  3. Phó Giám đốc Khối (hiepnt) kiểm tra và bấm "Phê duyệt & Phát hành"
- **Dữ liệu đầu vào mẫu (Test Input):** Thao tác phê duyệt tuần tự qua 3 tài khoản
- **Kết quả mong đợi (Expected Result):** Báo cáo chuyển trạng thái thành "Đã phát hành (Published)". Khóa chỉnh sửa vĩnh viễn.
- **Vai trò nghiệp vụ:** `Trưởng đoàn -> TP -> Lãnh đạo Khối`
- **Tài khoản đăng nhập test:** `diepnx -> luongnt2 -> hiepnt` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-REP-04`: Xuất Báo Cáo Kiểm Toán Ra File PDF / Word
- **Màn hình / URL:** Báo cáo KT (/findings-hub?tab=reports)
- **Nút bấm / Thành phần tương tác:** `Nút "Xuất PDF", Nút "Xuất Word"`
- **Điều kiện tiên quyết:** Báo cáo kiểm toán ở trạng thái Published
- **Các bước thao tác chi tiết (Action Steps):**
  1. Bấm nút "Xuất PDF"
  2. Mở file PDF vừa tải về để kiểm tra
  3. Bấm nút "Xuất Word" và kiểm tra file docx
- **Dữ liệu đầu vào mẫu (Test Input):** Click xuất báo cáo
- **Kết quả mong đợi (Expected Result):** File PDF/Word tải về đúng mẫu biểu LPBank, có đầy đủ logo, bảng biểu, danh mục phát hiện 5C và kết luận.
- **Vai trò nghiệp vụ:** `Tất cả KTV / Lãnh đạo`
- **Tài khoản đăng nhập test:** `datnc3 / diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 8. Theo Dõi Kiến Nghị

#### `TC-REC-01`: Giám Sát Tình Hình Khắc Phục Kiến Nghị Toàn Hàng
- **Màn hình / URL:** Theo dõi SLA (/findings-hub?tab=recommendations)
- **Nút bấm / Thành phần tương tác:** `Bộ lọc: Đã hoàn thành / Trong hạn / Sắp đến hạn / Quá hạn`
- **Điều kiện tiên quyết:** Đã có danh sách kiến nghị từ các cuộc kiểm toán đã phát hành
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở tab Khắc phục kiến nghị & SLA
  2. Lọc theo trạng thái "Quá hạn"
  3. Xem danh sách các chi nhánh chậm khắc phục
- **Dữ liệu đầu vào mẫu (Test Input):** Lọc trạng thái: Quá hạn
- **Kết quả mong đợi (Expected Result):** Bảng hiển thị các kiến nghị quá hạn kèm số ngày trễ SLA, tô màu đỏ cảnh báo.
- **Vai trò nghiệp vụ:** `Lãnh đạo Khối / Trưởng phòng`
- **Tài khoản đăng nhập test:** `luongnt2 / hiepnt` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-REC-02`: KTV Nghiệm Thu & Xác Nhận Đóng Kiến Nghị (Close)
- **Màn hình / URL:** Theo dõi SLA (/findings-hub?tab=recommendations)
- **Nút bấm / Thành phần tương tác:** `Nút "Chấp thuận đóng (Close)", Nút "Từ chối đóng"`
- **Điều kiện tiên quyết:** Auditee đã gửi bằng chứng hoàn thành
- **Các bước thao tác chi tiết (Action Steps):**
  1. KTV phụ trách datnc3 mở kiến nghị đang chờ nghiệm thu
  2. Tải và kiểm tra minh chứng của đơn vị
  3. Bấm "Chấp thuận đóng kiến nghị"
- **Dữ liệu đầu vào mẫu (Test Input):** Đánh giá: Bằng chứng hợp lệ, thu hồi nợ đầy đủ
- **Kết quả mong đợi (Expected Result):** Trạng thái chuyển thành "Đã đóng (Closed)". Tỷ lệ hoàn thành kiến nghị của đơn vị tự động tăng lên.
- **Vai trò nghiệp vụ:** `Thành viên đoàn / Trưởng đoàn`
- **Tài khoản đăng nhập test:** `datnc3 / diepnx` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 9. Cổng Ban Kiểm Soát

#### `TC-BKS-01`: Xem Dashboard Giám Sát Mô Hình 3 Tuyến Độc Lập
- **Màn hình / URL:** Cổng BKS (/audit-committee-portal)
- **Nút bấm / Thành phần tương tác:** `Dashboard Mô hình 3 Tuyến (IIA Standard 1000)`
- **Điều kiện tiên quyết:** Đăng nhập tài khoản Trưởng Ban Kiểm Soát (bks.chair)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập user bks.chair
  2. Truy cập /audit-committee-portal
  3. Xem các chỉ số phối hợp giữa Tuyến 1 (Kinh doanh), Tuyến 2 (Quản trị rủi ro & Tuân thủ) và Tuyến 3 (KTNB)
- **Dữ liệu đầu vào mẫu (Test Input):** User: bks.chair | Pass: @Lpbank2026!
- **Kết quả mong đợi (Expected Result):** Hiển thị tổng quan tình hình rủi ro toàn hàng, các cảnh báo trọng yếu cấp HĐQT/BKS.
- **Vai trò nghiệp vụ:** `Ban Kiểm Soát`
- **Tài khoản đăng nhập test:** `bks.chair` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-BKS-02`: Quản Lý & Giám Sát Kiến Nghị Đoàn Thanh Tra NHNN
- **Màn hình / URL:** Giám sát NHNN (/regulatory-exams)
- **Nút bấm / Thành phần tương tác:** `Nút "Thêm đợt thanh tra giám sát NHNN", Bảng kiến nghị`
- **Điều kiện tiên quyết:** Đăng nhập tài khoản BKS hoặc Admin
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở /regulatory-exams
  2. Bấm "Thêm đợt thanh tra mới"
  3. Nhập Tên đợt thanh tra, Năm, Cơ quan thanh tra (Cơ quan TTGSNH)
  4. Nhập các kiến nghị kết luận thanh tra và gán đơn vị khắc phục
  5. Bấm "Lưu"
- **Dữ liệu đầu vào mẫu (Test Input):** Đợt: Thanh tra chuyên đề hoạt động cấp tín dụng 2025 | Cơ quan: Cơ quan TTGSNH - NHNN
- **Kết quả mong đợi (Expected Result):** Đợt thanh tra và danh mục kiến nghị NHNN được lưu, hệ thống theo dõi tiến độ báo cáo Thống đốc NHNN định kỳ.
- **Vai trò nghiệp vụ:** `Ban Kiểm Soát / Admin`
- **Tài khoản đăng nhập test:** `bks.chair / admin` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 10. CAATs & Giám Sát

#### `TC-CAAT-01`: Xem Danh Mục Kịch Bản Giám Sát Rủi Ro Tự Động
- **Màn hình / URL:** Giám sát liên tục (/continuous-monitoring)
- **Nút bấm / Thành phần tương tác:** `Danh sách CAATs Scripts (Tín dụng, Giao dịch quầy, AML)`
- **Điều kiện tiên quyết:** Đăng nhập Chuyên gia KT (hoangnk1) / KTV CNTT (dungna)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập user hoangnk1
  2. Mở /continuous-monitoring
  3. Xem danh sách kịch bản tự động:
     - Giao dịch hủy sau giờ giao dịch
     - Tài khoản cán bộ có biến động số dư bất thường
     - Cấp tín dụng vượt hạn mức phê duyệt
- **Dữ liệu đầu vào mẫu (Test Input):** Xem danh mục kịch bản
- **Kết quả mong đợi (Expected Result):** Hiển thị đầy đủ thông tin logic kịch bản, tần suất quét (Hàng ngày / Hàng tuần / Hàng tháng).
- **Vai trò nghiệp vụ:** `Chuyên gia CNTT / KTV`
- **Tài khoản đăng nhập test:** `hoangnk1 / dungna` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-CAAT-02`: Kích Hoạt Chạy Quét Dữ Liệu CAATs Thủ Công
- **Màn hình / URL:** Giám sát liên tục (/continuous-monitoring)
- **Nút bấm / Thành phần tương tác:** `Nút "Chạy quét dữ liệu ngay (Execute Script)"`
- **Điều kiện tiên quyết:** Có dữ liệu giao dịch mẫu trong hệ thống
- **Các bước thao tác chi tiết (Action Steps):**
  1. Chọn kịch bản "Giao dịch hủy sau giờ giao dịch"
  2. Bấm nút "Chạy quét dữ liệu ngay"
  3. Quan sát kết quả danh sách ngoại lệ (Exception List)
- **Dữ liệu đầu vào mẫu (Test Input):** Thực thi kịch bản quét
- **Kết quả mong đợi (Expected Result):** Hệ thống quét và trả về danh sách các giao dịch vi phạm dấu hiệu cảnh báo (Red Flags) kèm số tiền và mã teller.
- **Vai trò nghiệp vụ:** `Chuyên gia CNTT / KTV`
- **Tài khoản đăng nhập test:** `hoangnk1 / dungna` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 11. BSC-KPI & Việc Ngoài Đoàn

#### `TC-KPI-01`: Xem Thẻ Điểm Cân Bằng BSC Khối KTNB
- **Màn hình / URL:** Đánh giá BSC-KPI (/bsc-kpi)
- **Nút bấm / Thành phần tương tác:** `4 Khía cạnh BSC (Tài chính, Auditee, Quy trình, Con người)`
- **Điều kiện tiên quyết:** Đăng nhập Lãnh đạo Khối / Trưởng phòng
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở /bsc-kpi
  2. Xem các chỉ số đo lường hiệu suất Khối:
     - Tỷ lệ hoàn thành kế hoạch năm
     - Tỷ lệ kiến nghị được khắc phục đúng hạn
     - Số giờ đào tạo CPE bình quân
- **Dữ liệu đầu vào mẫu (Test Input):** Xem dữ liệu BSC năm 2026
- **Kết quả mong đợi (Expected Result):** Biểu đồ radar và thước đo tiến độ KPI hiển thị trực quan theo đúng chuẩn phương pháp luận BSC.
- **Vai trò nghiệp vụ:** `Lãnh đạo Khối / Phòng`
- **Tài khoản đăng nhập test:** `hiepnt / luongnt2` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-TASK-01`: Tạo & Quản Lý Công Việc Ngoài Đoàn (Kanban)
- **Màn hình / URL:** Việc ngoài đoàn (/general-tasks)
- **Nút bấm / Thành phần tương tác:** `Nút "Tạo nhiệm vụ mới", Bảng kéo thả Kanban`
- **Điều kiện tiên quyết:** Đăng nhập KTV hoặc Lãnh đạo phòng
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở /general-tasks
  2. Bấm "Tạo nhiệm vụ mới"
  3. Nhập Tên: Tập huấn Thông tư mới NHNN, Gán cho: datnc3
  4. Kéo thả thẻ công việc từ "Chưa thực hiện" sang "Đang làm" và "Hoàn thành"
- **Dữ liệu đầu vào mẫu (Test Input):** Nhiệm vụ: Nghiên cứu Luật các TCTD 2024 | Hạn: 30/04/2026
- **Kết quả mong đợi (Expected Result):** Thẻ công việc di chuyển mượt mà giữa các cột Kanban, trạng thái tự động cập nhật trong CSDL.
- **Vai trò nghiệp vụ:** `Lãnh đạo Phòng / KTV`
- **Tài khoản đăng nhập test:** `luongnt2 / datnc3` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---

### Phân Hệ: 12. Quản Trị Hệ Thống

#### `TC-SYS-01`: Quản Lý Hồ Sơ KTV & Lọc Vòng Đời Nhân Sự
- **Màn hình / URL:** Hồ sơ KTV (/system-admin?tab=personnel)
- **Nút bấm / Thành phần tương tác:** `Tabs: Đang công tác (Active) / Đã điều chuyển / Đã nghỉ việc`
- **Điều kiện tiên quyết:** Đăng nhập tài khoản Admin
- **Các bước thao tác chi tiết (Action Steps):**
  1. Đăng nhập user admin
  2. Mở /system-admin?tab=personnel
  3. Bấm chuyển đổi giữa các tab: Active -> Transferred -> Resigned
  4. Kiểm tra số lượng nhân sự hiển thị ở từng tab
- **Dữ liệu đầu vào mẫu (Test Input):** User: admin | Pass: @Lpbank2026!
- **Kết quả mong đợi (Expected Result):** Danh sách nhân sự hiển thị đầy đủ 31 KTV, chức danh, nhóm quyền, phân loại đúng tab trạng thái.
- **Vai trò nghiệp vụ:** `Quản trị viên (Admin)`
- **Tài khoản đăng nhập test:** `admin / auditor.ad` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-SYS-02`: Thực Hiện Điều Chuyển / Nghỉ Việc Nhân Sự
- **Màn hình / URL:** Hồ sơ KTV (/system-admin?tab=personnel)
- **Nút bấm / Thành phần tương tác:** `Nút thao tác "Điều chuyển", "Nghỉ việc", "Khôi phục"`
- **Điều kiện tiên quyết:** Chọn 1 tài khoản KTV thử nghiệm
- **Các bước thao tác chi tiết (Action Steps):**
  1. Tại hàng nhân sự test, bấm nút "Điều chuyển"
  2. Nhập Đơn vị mới: Khối QTRR, Ngày điều chuyển: 01/05/2026
  3. Bấm xác nhận
  4. Kiểm tra tài khoản tự động bị khóa (isActive=false) và chuyển sang tab "Đã điều chuyển"
  5. Bấm "Khôi phục" để đưa về Active
- **Dữ liệu đầu vào mẫu (Test Input):** Lý do: Điều chuyển công tác sang Khối Quản trị rủi ro
- **Kết quả mong đợi (Expected Result):** Hệ thống bảo toàn toàn bộ lịch sử kiểm toán của KTV, không xóa cứng record, khôi phục thành công khi cần.
- **Vai trò nghiệp vụ:** `Quản trị viên (Admin)`
- **Tài khoản đăng nhập test:** `admin` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-SYS-03`: Kiểm Tra Thời Gian Cách Ly Độc Lập KTV (IIA 1100 / TT 13)
- **Màn hình / URL:** Giám sát độc lập (/system-admin?tab=personnel&subTab=sub5)
- **Nút bấm / Thành phần tương tác:** `Tag "Cách ly độc lập", Bảng Independence Tracker`
- **Điều kiện tiên quyết:** KTV có khai báo đơn vị cũ từng công tác (priorDepartments)
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở tab Giám sát độc lập KTV
  2. Xem danh sách các KTV đang trong thời gian cách ly (Cooling-off)
  3. Thử tạo cuộc kiểm toán tại đơn vị cũ và gán KTV đó vào đoàn
- **Dữ liệu đầu vào mẫu (Test Input):** KTV từng công tác tại CN Hà Nội đến 12/2025 (còn trong hạn cách ly 1 năm)
- **Kết quả mong đợi (Expected Result):** Hệ thống hiển thị cảnh báo vi phạm tính độc lập KTV theo Điều 39 Thông tư 13/2018/TT-NHNN.
- **Vai trò nghiệp vụ:** `Admin / Lãnh đạo Phòng`
- **Tài khoản đăng nhập test:** `admin / luongnt2` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-SYS-04`: Ma Trận Quyền & Vai Trò Hệ Thống (RBAC Matrix)
- **Màn hình / URL:** Phân quyền CASL (/system-admin?tab=roles)
- **Nút bấm / Thành phần tương tác:** `Bảng Roles, Ma trận quyền Subject/Action`
- **Điều kiện tiên quyết:** Đăng nhập tài khoản Admin
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở tab Phân quyền & Vai trò
  2. Chọn vai trò "Auditor"
  3. Xem ma trận quyền (Xem, Thêm, Sửa, Xóa, Duyệt trên từng Module)
  4. Thử cập nhật quyền và bấm "Lưu"
- **Dữ liệu đầu vào mẫu (Test Input):** Xem và kiểm tra quyền của các nhóm vai trò
- **Kết quả mong đợi (Expected Result):** Ma trận quyền rõ ràng, lưu trữ chính xác vào bảng roles trong PostgreSQL.
- **Vai trò nghiệp vụ:** `Quản trị viên (Admin)`
- **Tài khoản đăng nhập test:** `admin` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
#### `TC-SYS-05`: Tra Cứu Nhật Ký Hệ Thống Bất Biến (SHA-256)
- **Màn hình / URL:** Nhật ký Audit Trail (/system-admin?tab=audit-trail)
- **Nút bấm / Thành phần tương tác:** `Bảng Audit Trail, Tìm kiếm theo User, Resource, Thời gian`
- **Điều kiện tiên quyết:** Đã thực hiện các thao tác tạo/sửa/xóa ở các bước trước
- **Các bước thao tác chi tiết (Action Steps):**
  1. Mở tab Nhật ký hệ thống
  2. Tìm kiếm các hành động vừa thực hiện (bulk-import, change-password, update-finding)
  3. Kiểm tra chuỗi băm bảo mật SHA-256
- **Dữ liệu đầu vào mẫu (Test Input):** Filter: User = datnc3 hoặc Action = CREATE
- **Kết quả mong đợi (Expected Result):** Mọi thao tác đều được ghi vết đầy đủ IP, Thời gian, Dữ liệu cũ (oldValue), Dữ liệu mới (newValue) và mã băm SHA-256.
- **Vai trò nghiệp vụ:** `Quản trị viên (Admin)`
- **Tài khoản đăng nhập test:** `admin` (Mật khẩu: `@Lpbank2026!`)
- **Nhân sự thực hiện test:**
  + **Tester 1 (Chính):** **Nguyễn Cảnh Đạt** (`datnc3`)
  + **Tester 2 (Đối chiếu):** **Ninh Xuân Điệp** (`diepnx`)

---
