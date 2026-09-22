# ĐẶC TẢ CHI TIẾT MÀN HÌNH & TÍNH NĂNG: PHÁT HIỆN 5C, BÁO CÁO & KIẾN NGHỊ (PHẦN 5)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-SCREEN-05`  
**Căn cứ mã nguồn**: `frontend/src/pages/AuditFindings.tsx`, `FindingKnowledgeBase.tsx`, `DefectCodeList.tsx`, `AuditReports.tsx`, `Recommendations.tsx`, `AuditRatingView.tsx`  
**Phiên bản**: 4.0.0  

---

## 1. MÀN HÌNH: QUẢN LÝ PHÁT HIỆN KIỂM TOÁN CHUẨN 5C (`AuditFindings.tsx`)

### 1.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/audit-findings`
* **File mã nguồn**: [frontend/src/pages/AuditFindings.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/AuditFindings.tsx) (469 dòng mã)
* **Đối tượng sử dụng**: Kiểm toán viên phát hiện lỗi, Trưởng đoàn thẩm định, Lãnh đạo KTNB.
* **Vai trò**: Quản lý tập trung toàn bộ các phát hiện kiểm toán (Audit Findings) của hệ thống. Chuẩn hóa cấu trúc phát hiện theo **mô hình 5C quốc tế**, phân loại rủi ro, ước tính tổn thất tài chính và tích hợp AI gợi ý phân loại mã khiếm khuyết.

### 1.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Khối Thống Kê Phân Bổ Mức Độ Nghiêm Trọng (Severity Statistics Cards)**:
   * **Critical (Rất nghiêm trọng)**: Thẻ số lượng màu đỏ sẫm (`#cf1322`) kèm icon cảnh báo khẩn cấp (gian lận hình sự, nguy cơ mất thanh khoản).
   * **High (Cao)**: Thẻ màu đỏ tươi (`#f5222d`) (vi phạm tỷ lệ an toàn vốn, hở hạn mức tín dụng lớn).
   * **Medium (Trung bình)**: Thẻ màu cam (`#faad14`) (thiếu sót kiểm soát thứ cấp, chậm bổ sung chứng từ).
   * **Low (Thấp)**: Thẻ màu xanh lá (`#52c41a`) (lỗi thể thức văn bản, lưu trữ hồ sơ chưa khoa học).
2. **Bảng Danh Sách Phát Hiện (Findings Data Table)**:
   * Cột 1: Mã phát hiện & Tên phát hiện tóm tắt.
   * Cột 2: Cuộc kiểm toán & Đơn vị có phát hiện (Chi nhánh / Khối nghiệp vụ).
   * Cột 3: Mức độ rủi ro (Tag màu sắc theo `getRiskColor`).
   * Cột 4: Phân loại mã lỗi nghiệp vụ:
     - `INTERNAL`: Vi phạm quy chế nội bộ ngân hàng.
     - `ND340`: Vi phạm chế độ kế toán/báo cáo theo Nghị định 340.
     - `NHAN_SU`: Lỗi do năng lực hoặc bố trí nhân sự chưa đúng quy định.
   * Cột 5: Giá trị tổn thất tài chính ước tính (VND).
   * Cột 6: Trạng thái: `Draft` (Nháp), `Pending Review` (Chờ duyệt), `Agreed` (Đơn vị đồng ý), `Disagreed` (Đơn vị giải trình không đồng ý), `Confirmed` (Đã chốt đưa vào Báo cáo).
   * Cột 7: Thao tác: "Mở Drawer Chi Tiết", "Chỉnh sửa", "Xóa", "Xuất Excel".
3. **Drawer Soạn Thảo Chi Tiết Phát Hiện 5C (`AuditFindingDetailDrawer.tsx`)**:
   Khi nhấp vào một phát hiện, Drawer mở ra cho phép KTV nhập hoặc chỉnh sửa các trường bắt buộc:
   * **Trường 1 - Thực trạng (Condition)**: Mô tả khách quan, chi tiết về hiện tượng sai lệch: *"Chi nhánh X đã giải ngân 5 hợp đồng tín dụng với tổng dư nợ 42 tỷ đồng khi chưa hoàn tất thủ tục đăng ký giao dịch bảo đảm"* (kèm số hợp đồng, ngày giải ngân cụ thể).
   * **Trường 2 - Tiêu chuẩn (Criteria)**: Trích dẫn chính xác điều khoản quy định bị vi phạm: *"Khoản 2 Điều 15 Thông tư 39/2016/TT-NHNN và Điều 8 Quy chế cho vay số 123/QĐ-LPBank"*.
   * **Trường 3 - Nguyên nhân (Cause - Kỹ thuật 5 Whys)**: Phân tích nguyên nhân gốc rễ: do áp lực chỉ tiêu tăng trưởng tín dụng cuối quý $\rightarrow$ Cán bộ tín dụng nới lỏng kiểm soát $\rightarrow$ Kiểm soát viên không đối chiếu hồ sơ bản gốc $\rightarrow$ Thiếu cơ chế kiểm tra chéo tự động trên Core Banking.
   * **Trường 4 - Hậu quả & Tác động rủi ro (Consequence)**: Đánh giá rủi ro tài chính, rủi ro pháp lý: *"Nguy cơ khoản vay mất khả năng thu hồi khi khách hàng phát sinh tranh chấp tài sản; ngân hàng có thể bị xử phạt hành chính từ 50-100 triệu VND theo quy định"* (kèm nhập số tiền rủi ro ước tính).
   * **Trường 5 - Kiến nghị khắc phục (Corrective Action)**: Đưa ra biện pháp xử lý triệt để: Yêu cầu Chi nhánh hoàn tất đăng ký GDBĐ trong vòng 10 ngày làm việc; rà soát trách nhiệm của cán bộ thẩm định và phê duyệt liên quan.
   * **Tính Năng AI Gợi Ý (`drawerAutoAI`)**: Nút "AI Phân Tích & Đề Xuất": Hệ thống gửi nội dung Thực trạng (Condition) lên mô hình AI để tự động gợi ý trích dẫn Tiêu chuẩn luật định và phân tích Nguyên nhân gốc rễ tương ứng.

### 1.3. Các Endpoint API Tương Ứng
* `GET /api/audit-findings`: Lấy danh sách toàn bộ phát hiện kiểm toán.
* `POST /api/audit-findings`: Tạo mới phát hiện kiểm toán 5C.
* `PUT /api/audit-findings/:id`: Cập nhật nội dung phát hiện kiểm toán.
* `GET /api/ai/defect-codes`: Lấy danh mục mã lỗi chuẩn hóa phục vụ gắn tag AI.

---

## 2. MÀN HÌNH: CƠ SỞ TRI THỨC PHÁT HIỆN MẪU (`FindingKnowledgeBase.tsx`, `DefectCodeList.tsx`)

### 2.1. Mục Đích & Vai Trò Người Dùng
* **File mã nguồn**: [frontend/src/pages/FindingKnowledgeBase.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/FindingKnowledgeBase.tsx), [DefectCodeList.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/DefectCodeList.tsx)
* **Đối tượng sử dụng**: Toàn thể KTV trong quá trình làm việc tại thực địa.
* **Vai trò**: Cung cấp thư viện tra cứu "kinh nghiệm kiểm toán" (Audit Knowledge Base) với hàng trăm mẫu phát hiện kiểm toán điển hình đã được chuẩn hóa câu từ và điều khoản luật, giúp KTV mới nhanh chóng lập phát hiện chính xác, thuyết phục.

### 2.2. Tính Năng Tra Cứu & Tái Sử Dụng Tri Thức
* **Thanh Tìm Kiếm Nhanh (Smart Search)**: Nhập từ khóa: *"cho vay đảo nợ"*, *"định giá tài sản"*, *"phí chuyển tiền"*, *"hạn mức ATM"*. Hệ thống hiển thị ngay phát hiện chuẩn tương ứng.
* **Nút "Áp Dụng Vào Hồ Sơ Đang Kiểm Toán"**: Cho phép KTV sao chép trực tiếp cấu trúc 5C vào hồ sơ làm việc hiện tại và chỉ cần thay đổi số liệu/hợp đồng cụ thể.

---

## 3. MÀN HÌNH: PHÁT HÀNH BÁO CÁO KIỂM TOÁN NỘI BỘ (`AuditReports.tsx`)

### 3.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/audit-reports`
* **File mã nguồn**: [frontend/src/pages/AuditReports.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/AuditReports.tsx)
* **Đối tượng sử dụng**: Trưởng đoàn kiểm toán, Trưởng ban KTNB, Ban Kiểm soát.
* **Vai trò**: Quản lý quy trình soạn thảo, soát xét, phê duyệt và ký số ban hành Báo cáo Kiểm toán Nội bộ chính thức theo quy định tại **Điều 66 Thông tư 13/2018/TT-NHNN**. Cung cấp động cơ tự động kết xuất văn bản Word (`.docx`) và PDF theo đúng thể thức văn bản hành chính ngân hàng.

### 3.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Bảng Danh Mục Báo Cáo Kiểm Toán (Reports Management Grid)**:
   * Số hiệu báo cáo (VD: `BCKT-2026-08/LPB-KTNB`).
   * Tên cuộc kiểm toán & Đơn vị được kiểm toán.
   * Ngày ký phát hành & Người ký duyệt (Trưởng ban KTNB / Đại diện Ban Kiểm soát).
   * Điểm xếp hạng hệ thống KSNB của đơn vị: Xếp loại `Tốt (A)`, `Khá (B)`, `Đạt yêu cầu (C)`, `Yếu kém (D)`.
   * Trạng thái văn bản: `Bản nháp`, `Đã duyệt nội bộ`, `Đã ký phát hành chính thức (Officialized)`.
2. **Nút Xuất Báo Cáo Tự Động (`ReportExportButton.tsx`)**:
   * Hệ thống tự động thu thập toàn bộ dữ liệu cuộc kiểm toán để điền vào template Word chuẩn:
     - Phần I: Tóm tắt điều hành (Mục tiêu, phạm vi, giới hạn kiểm toán, ý kiến tổng thể).
     - Phần II: Bảng xếp hạng và ma trận rủi ro đơn vị.
     - Phần III: Chi tiết từng phát hiện kiểm toán theo mô hình 5C kèm ý kiến giải trình của đơn vị.
     - Phần IV: Bảng tổng hợp các kiến nghị, người chịu trách nhiệm và hạn chót hoàn thành.
3. **Quy Trình Ban Hành Chính Thức (`OfficializeModal.tsx`)**:
   * Khi người dùng có thẩm quyền bấm "Ban Hành Báo Cáo":
     - Hệ thống yêu cầu nhập số văn bản chính thức, ngày phát hành.
     - Tải lên file scan báo cáo có chữ ký và đóng dấu.
     - Tự động kích hoạt cơ chế **Khóa Sổ Kiểm Toán (`Audit Freeze`)**: toàn bộ hồ sơ làm việc thuộc cuộc kiểm toán chuyển sang trạng thái Read-only.
     - Tự động chuyển toàn bộ danh sách kiến nghị sang phân hệ **Recommendations** để giám sát khắc phục.

---

## 4. MÀN HÌNH: QUẢN LÝ VÒNG ĐỜI KIẾN NGHỊ KIỂM TOÁN (`Recommendations.tsx`)

### 4.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/recommendations`
* **File mã nguồn**: [frontend/src/pages/Recommendations.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/Recommendations.tsx) (60.211 bytes)
* **Đối tượng sử dụng**: KTV theo dõi kiến nghị, Trưởng ban KTNB, Đầu mối Auditee, Ban Kiểm soát.
* **Vai trò**: Quản trị toàn bộ vòng đời của các kiến nghị kiểm toán từ khi phát hành đến khi hoàn thành triệt để theo **Điều 67 Thông tư 13/2018/TT-NHNN**. Giám sát chặt chẽ thời hạn cam kết (SLA), loại bỏ tình trạng "đóng kiến nghị hình thức".

### 4.2. Vòng Đời Trạng Thái Của Kiến Nghị (State Machine & SLA)
1. **Các Trạng Thái Vận Hành**:
   * `Open` (Mới phát sinh - Đã gửi sang đơn vị thực hiện).
   * `InProgress` (Đơn vị đang triển khai thực hiện).
   * `Overdue` (Đã quá ngày cam kết hoàn thành nhưng chưa đóng - Màu đỏ cảnh báo).
   * `PendingValidation` (Đơn vị đã nộp bằng chứng chứng minh hoàn thành, đang chờ KTV thẩm định).
   * `Closed` (KTV đã kiểm tra bằng chứng đạt yêu cầu và ký xác nhận đóng).
   * `Reopened` (KTV từ chối bằng chứng do chưa triệt để, yêu cầu đơn vị tiếp tục xử lý).
2. **Bộ Lọc & Thống Kê Theo Dõi SLA Thông Minh**:
   * Lọc theo Đơn vị chịu trách nhiệm (Khối / Chi nhánh).
   * Lọc theo Mức độ rủi ro của phát hiện gốc (`Critical`, `High`, `Medium`, `Low`).
   * Lọc nhanh: "Chỉ xem kiến nghị Quá hạn (`Overdue`)", "Kiến nghị sắp đến hạn trong vòng 15 ngày".
3. **Quy Trình Thẩm Định Đóng Kiến Nghị (Validation Modal)**:
   * KTV mở modal xem tài liệu bằng chứng do Auditee tải lên (Quyết định sửa quy trình, biên bản thu hồi nợ, ảnh chụp kho quỹ mới).
   * KTV kiểm tra đối chiếu thực tế. Nếu đạt, KTV chọn "Chấp thuận đóng" kèm nhập biên bản thẩm định; nếu không đạt, chọn "Yêu cầu bổ sung" kèm nêu rõ lý do từ chối.

---

## 5. MÀN HÌNH: XẾP HẠNG CHẤT LƯỢNG HỆ THỐNG KSNB (`AuditRatingView.tsx`)

### 5.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/audit-rating`
* **File mã nguồn**: [frontend/src/pages/AuditRatingView.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/AuditRatingView.tsx)
* **Đối tượng sử dụng**: Trưởng ban KTNB, Ban Kiểm soát, Ban Tổng Giám đốc.
* **Vai trò**: Tính toán và công bố bảng xếp loại chất lượng hệ thống kiểm soát nội bộ của từng Chi nhánh và Khối nghiệp vụ theo thang điểm 4 mức (A, B, C, D) phục vụ công tác thi đua khen thưởng và đánh giá mức độ rủi ro ngân hàng.

### 5.2. Thuật Toán Xếp Hạng Tự Động
* Điểm cơ sở ban đầu: **100 điểm**.
* Trừ điểm theo số lượng và mức độ phát hiện kiểm toán:
  - Mỗi phát hiện `Critical`: Trừ **25 điểm**.
  - Mỗi phát hiện `High`: Trừ **10 điểm**.
  - Mỗi phát hiện `Medium`: Trừ **3 điểm**.
  - Mỗi phát hiện `Low`: Trừ **1 điểm**.
* Xếp loại kết quả:
  - **Hạng A (Tốt)**: $\ge 85$ điểm (Không có phát hiện Critical/High).
  - **Hạng B (Khá)**: $70 - 84$ điểm.
  - **Hạng C (Đạt yêu cầu có lưu ý)**: $50 - 69$ điểm.
  - **Hạng D (Yếu kém / Rủi ro cao)**: $< 50$ điểm hoặc có từ 02 phát hiện Critical trở lên. Chi nhánh xếp hạng D bắt buộc phải được tái kiểm toán trong vòng 06 tháng.
