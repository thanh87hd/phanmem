# ĐẶC TẢ CHI TIẾT MÀN HÌNH & TÍNH NĂNG: QUẢN TRỊ HỆ THỐNG & BẢO MẬT (PHẦN 7)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-SCREEN-07`  
**Căn cứ mã nguồn**: `frontend/src/pages/SystemManagement.tsx`, `RolesPage.tsx`, `AuditTrail.tsx`, `IntegrationSettings.tsx`, `InfrastructureMonitor.tsx`, `MasterDataGovernance.tsx`, `PasswordChangeRequests.tsx`, `DocumentManager.tsx`, `AppStudio.tsx`, `WorkflowStudio.tsx`  
**Phiên bản**: 4.0.0  

---

## 1. MÀN HÌNH: QUẢN TRỊ THAM SỐ HỆ THỐNG (`SystemManagement.tsx`)

### 1.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/system-management`
* **File mã nguồn**: [frontend/src/pages/SystemManagement.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/SystemManagement.tsx) (57.383 bytes)
* **Đối tượng sử dụng**: Quản trị viên hệ thống (System Admin), Kỹ sư an ninh thông tin.
* **Vai trò**: Cung cấp trung tâm điều hành toàn bộ các tham số cấu hình toàn cục của hệ thống KTNB 4.0: chính sách mật khẩu, tham số phiên làm việc, cấu hình lưu trữ tài liệu, bật/tắt chế độ bảo trì, và các công cụ dọn dẹp bộ nhớ đệm (Cache Flush).

### 1.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Cấu Hình Chính Sách An Toàn Mật Khẩu (Security & Password Policy Tab)**:
   * Độ dài mật khẩu tối thiểu: Mặc định $10$ ký tự.
   * Yêu cầu độ phức tạp: Bắt buộc có chữ hoa, chữ thường, chữ số và ký tự đặc biệt (`!@#$%^&*`).
   * Thời hạn hiệu lực của mật khẩu (Password Expiry): Mặc định $90$ ngày; hệ thống tự động nhắc đổi mật khẩu trước 7 ngày.
   * Số lần đăng nhập sai tối đa cho phép trước khi khóa tài khoản: Mặc định $5$ lần; thời gian khóa tài khoản tạm thời: $30$ phút.
   * Số lượng mật khẩu cũ ghi nhớ chống trùng lặp (Password History): Mặc định $5$ mật khẩu gần nhất.
2. **Cấu Hình Phiên Làm Việc & Token (Session & JWT Settings)**:
   * Thời gian sống của Access Token JWT: Mặc định $15$ phút.
   * Thời gian sống của Refresh Token: Mặc định $7$ ngày.
   * Tự động đăng xuất khi không hoạt động (Inactivity Timeout): Mặc định $15$ phút đối với máy trạm KTV.
3. **Cấu Hình Lưu Trữ Bằng Chứng & Tài Liệu (Storage Settings)**:
   * Dung lượng file tối đa cho phép tải lên: Mặc định $50\text{MB}$/file.
   * Danh mục định dạng file được phép: `.pdf`, `.docx`, `.xlsx`, `.png`, `.jpg`, `.zip`, `.eml`. Nghiêm cấm hoàn toàn các file thực thi `.exe, .bat, .sh, .js`.
4. **Công Cụ Quản Trị Hệ Thống Nhanh (Admin Quick Tools)**:
   * **Nút "Xóa Cache Quyền Hạn (Flush CASL Cache)"**: Xóa sạch bộ nhớ đệm quyền trên Redis khi vừa cập nhật phân quyền mới cho một vai trò.
   * **Nút "Kích Hoạt Chế Độ Bảo Trì (Maintenance Mode)"**: Chặn toàn bộ người dùng đăng nhập ngoại trừ tài khoản `ADMIN`, hiển thị thông báo bảo trì hệ thống.

---

## 2. MÀN HÌNH: QUẢN LÝ VAI TRÒ & PHÂN QUYỀN CASL (`RolesPage.tsx`)

### 2.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/roles`
* **File mã nguồn**: [frontend/src/pages/RolesPage.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/RolesPage.tsx) (33.148 bytes)
* **Đối tượng sử dụng**: Quản trị viên hệ thống.
* **Vai trò**: Quản lý ma trận phân quyền chi tiết cho 15 vai trò định sẵn trong hệ thống theo mô hình **RBAC kết hợp ABAC (CASL Framework)**, đảm bảo nguyên tắc đặc quyền tối thiểu (Least Privilege).

### 2.2. Ma Trận Phân Quyền 15 Vai Trò Cốt Lõi
Hệ thống quản lý 15 vai trò chuẩn mực ngành Ngân hàng:
1. `ADMIN`: Toàn quyền quản trị kỹ thuật hệ thống.
2. `CAE` (Trưởng ban KTNB): Toàn quyền nghiệp vụ kiểm toán, phê duyệt kế hoạch năm, ký duyệt báo cáo chính thức.
3. `AUDIT_DIRECTOR` (Phó ban KTNB): Xem và kiểm soát toàn bộ hoạt động của khối.
4. `AUDIT_MANAGER` (Trưởng phòng KTNB): Quản trị kế hoạch cuộc kiểm toán, phân công KTV, thẩm định phát hiện.
5. `AUDIT_LEAD` (Trưởng đoàn kiểm toán): Điều phối thực địa, duyệt hồ sơ làm việc (Workpapers), tạo Review Notes, chốt phát hiện 5C.
6. `SENIOR_AUDITOR`: Soạn thảo hồ sơ làm việc phức tạp, thực hiện chọn mẫu MUS, soát xét chéo.
7. `AUDITOR`: Kiểm toán viên thực hiện kiểm tra các bước theo RCM, lập Workpaper, ghi nhận 5C.
8. `JUNIOR_AUDITOR`: Hỗ trợ kiểm tra mẫu, thu thập bằng chứng.
9. `AUDITEE_LEAD` (Giám đốc Chi nhánh / Trưởng phòng đơn vị được KT): Giải trình biên bản, phân công khắc phục kiến nghị.
10. `AUDITEE_USER` (Cán bộ phụ trách xử lý tại đơn vị): Cập nhật tiến độ %, nộp bằng chứng hoàn thành kiến nghị.
11. `AUDIT_COMMITTEE` (Thành viên Ban Kiểm soát / HĐQT): Xem Dashboard, thẩm tra Kế hoạch năm, ký phê duyệt Báo cáo gửi NHNN.
12. `RISK_OFFICER` (Cán bộ Khối QTRR - Tuyến 2): Xem thông tin rủi ro, phối hợp đối chiếu KRI.
13. `COMPLIANCE_OFFICER` (Cán bộ Khối Tuân thủ - Tuyến 2): Đối chiếu các văn bản pháp luật và quy chế nội bộ.
14. `QAIP_REVIEWER`: Chuyên viên đánh giá độc lập chất lượng hoạt động kiểm toán (Standard 8.4).
15. `GUEST`: Quyền chỉ xem tài liệu công khai được chia sẻ.

### 2.3. Ma Trận Quyền Hạn Chi Tiết Theo Hành Động CASL
Mỗi vai trò được phân quyền trên từng thực thể theo 6 hành động chuẩn:
* `manage`: Toàn quyền quản trị thực thể.
* `create`: Khởi tạo mới bản ghi.
* `read`: Đọc và xem dữ liệu.
* `update`: Chỉnh sửa thông tin.
* `delete`: Xóa bản ghi.
* `approve`: Ký duyệt hồ sơ / phát hiện / kế hoạch.
* `officialize`: Ký ban hành chính thức văn bản.

---

## 3. MÀN HÌNH: NHẬT KÝ VẾT KIỂM TOÁN BẤT BIẾN (`AuditTrail.tsx`)

### 3.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/audit-trail`
* **File mã nguồn**: [frontend/src/pages/AuditTrail.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/AuditTrail.tsx) (14.249 bytes)
* **Đối tượng sử dụng**: Cán bộ Kiểm tra An ninh Thông tin, Ban Kiểm soát, Thanh tra NHNN.
* **Vai trò**: Cung cấp công cụ tra cứu lịch sử thay đổi dữ liệu bất biến (Immutable Audit Trail) ghi nhận toàn bộ các thao tác tạo mới, chỉnh sửa, phê duyệt và xóa dữ liệu trên hệ thống theo yêu cầu của **Thông tư 09/2020/TT-NHNN**.

### 3.2. Cấu Trúc Bảng Dữ Liệu Tra Cứu Vết Kiểm Toán
* **Thời điểm thao tác (Timestamp)**: Định dạng chuẩn `YYYY-MM-DD HH:mm:ss.SSS` theo múi giờ GMT+7.
* **Người thực hiện (User)**: Mã nhân viên, Họ tên, Vai trò lúc thực hiện.
* **Địa chỉ IP máy trạm (Client IP)**: Ghi nhận chính xác IP thực tế của máy tính KTV (được trích xuất qua `trustProxy`).
* **Hành động (Action)**: `CREATE`, `UPDATE`, `DELETE`, `SIGN_OFF`, `FREEZE`.
* **Thực thể bị tác động (Target Entity)**: Tên bảng và ID bản ghi (VD: `WorkingPaper #142`, `Finding #89`).
* **Chi Tiết Khác Biệt Dữ Liệu (Data Diff Modal)**:
  - Khi nhấp "Xem chi tiết", popup hiển thị dạng so sánh 2 cột: **Trạng thái cũ (Old Values)** vs **Trạng thái mới (New Values)** với các trường thay đổi được bôi vàng nổi bật.
* **Mã Băm Xác Thực Toàn Vẹn (Diff Hash)**: Chuỗi băm **SHA-256** của nội dung thay đổi, đảm bảo log không bị bất kỳ ai (kể cả DBA) can thiệp sửa chữa trong cơ sở dữ liệu.

---

## 4. MÀN HÌNH: CẤU HÌNH TÍCH HỢP HỆ THỐNG NGOÀI (`IntegrationSettings.tsx`)

### 4.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/integration-settings`
* **File mã nguồn**: [frontend/src/pages/IntegrationSettings.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/IntegrationSettings.tsx) (59.097 bytes)
* **Đối tượng sử dụng**: Quản trị viên hệ thống, Kỹ sư tích hợp hạ tầng ngân hàng.
* **Vai trò**: Cấu hình các kênh giao tiếp an toàn giữa hệ thống KTNB 4.0 với các dịch vụ hạ tầng nền tảng của Ngân hàng:
  1. **Tích Hợp Xác Thực Tập Trung (SSO / IAM)**: Cấu hình kết nối Keycloak OIDC, Active Directory / LDAP ngân hàng.
  2. **Cổng Gửi Thư Điện Tử (SMTP Gateway)**: Cấu hình máy chủ Mail nội bộ của Ngân hàng phục vụ gửi email thông báo, nhắc nợ kiến nghị quá hạn và mã OTP 2FA.
  3. **Lưu Trữ Bằng Chứng Đám Mây Nội Bộ (Object Storage)**: Cấu hình kết nối MinIO / Ceph S3 lưu trữ các tệp tin bằng chứng kiểm toán mã hóa.

---

## 5. MÀN HÌNH: GIÁM SÁT HẠ TẦNG KỸ THUẬT (`InfrastructureMonitor.tsx`)

### 5.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/infrastructure-monitor`
* **File mã nguồn**: [frontend/src/pages/InfrastructureMonitor.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/InfrastructureMonitor.tsx) (6.019 bytes)
* **Đối tượng sử dụng**: Kỹ sư DevOps, Quản trị viên hệ thống.
* **Vai trò**: Giám sát thời gian thực tình trạng hoạt động phần cứng và tiến trình backend:
  * Tỷ lệ tải CPU và tiêu thụ bộ nhớ RAM của tiến trình Node.js Fastify.
  * Tình trạng hồ chứa kết nối PostgreSQL (Active / Idle Connections vs Max Pool 100).
  * Tình trạng kết nối và số lượng jobs đang đợi xử lý trong hàng đợi Redis BullMQ.
  * Dung lượng ổ đĩa lưu trữ còn trống tại phân vùng chứa file bằng chứng kiểm toán.
