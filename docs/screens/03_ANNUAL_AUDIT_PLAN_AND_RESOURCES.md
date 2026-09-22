# ĐẶC TẢ CHI TIẾT MÀN HÌNH & TÍNH NĂNG: KẾ HOẠCH NĂM & NGUỒN LỰC KIỂM TOÁN (PHẦN 3)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-SCREEN-03`  
**Căn cứ mã nguồn**: `frontend/src/pages/AuditPlan.tsx`, `ResourceCapacityView.tsx`, `ResourceCalendar.tsx`, `Personnel.tsx`, `Timesheet.tsx`, `TrainingCPE.tsx`, `AuditExpenses.tsx`  
**Phiên bản**: 4.0.0  

---

## 1. MÀN HÌNH: LẬP KẾ HOẠCH KIỂM TOÁN NĂM (`AuditPlan.tsx`)

### 1.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/audit-plan`
* **File mã nguồn**: [frontend/src/pages/AuditPlan.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/AuditPlan.tsx)
* **Đối tượng sử dụng**: Trưởng ban KTNB (CAE), Trưởng phòng Kế hoạch KTNB, Thành viên Ban Kiểm soát.
* **Vai trò**: Lập, điều chỉnh và quản trị Kế hoạch kiểm toán hàng năm (Annual Audit Plan - AAP) theo quy định tại **Điều 64 Thông tư 13/2018/TT-NHNN**. Kế hoạch phải phản ánh đầy đủ kết quả đánh giá rủi ro, ưu tiên đối tượng rủi ro cao, phân bổ nguồn lực khả thi và hoàn tất trình Ban Kiểm soát phê duyệt trước ngày 15/12 hàng năm.

### 1.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Bộ Điều Khiển Phiên Bản Kế Hoạch (Plan Version Header)**:
   * `Select` Năm tài chính (`planYear`): Năm kế hoạch (VD: 2026).
   * `Tag` Trạng thái phê duyệt:
     - `Draft` (Bản nháp - Ban KTNB đang soạn thảo).
     - `SubmittedToCAE` (Đã trình Trưởng ban KTNB xem xét).
     - `SubmittedToBoard` (Đã gửi Ban Kiểm soát thẩm tra).
     - `Approved` (Ban Kiểm soát đã phê duyệt chính thức bằng văn bản).
     - `Adjusted` (Kế hoạch đã điều chỉnh trong năm).
2. **Khối Thống Kê Tổng Hợp Kế Hoạch Năm (Plan Summary Statistics)**:
   * **Tổng số cuộc kiểm toán**: Phân kỳ theo Quý 1, Quý 2, Quý 3, Quý 4.
   * **Tổng số ngày công dự kiến (Budgeted Man-days)**: Tổng số ngày công cần thiết để hoàn thành toàn bộ kế hoạch.
   * **Số ngày công khả dụng (Available Capacity)**: So sánh với năng lực định biên thực tế của Khối KTNB.
   * **Tỷ lệ bao phủ rủi ro (Risk Coverage Rate)**: `%` các đối tượng Rủi ro Cao trong Vũ trụ kiểm toán được đưa vào kế hoạch năm (mục tiêu: $100\%$).
3. **Bảng Danh Mục Các Cuộc Kiểm Toán Dự Kiến (Planned Audits Grid)**:
   * Cột 1: Mã cuộc kiểm toán dự kiến (VD: `AAP-2026-01`).
   * Cột 2: Đối tượng được kiểm toán (Tên Chi nhánh / Khối nghiệp vụ).
   * Cột 3: Phân loại cuộc kiểm toán: Định kỳ (Periodic), Chuyên đề (Thematic), Kiểm toán CNTT (IT Audit), Kiểm toán tuân thủ (Compliance).
   * Cột 4: Mức độ rủi ro đối tượng: `High` (Đỏ), `Medium` (Vàng), `Low` (Xanh).
   * Cột 5: Dự kiến thời gian thực hiện: Tháng/Quý bắt đầu và kết thúc.
   * Cột 6: Dự toán ngày công (Man-days): Số KTV $\times$ Số ngày thực địa.
   * Cột 7: Dự kiến Trưởng đoàn & Thành viên nòng cốt.
   * Cột 8: Thao tác: "Sửa", "Xóa", "Xem hồ sơ rủi ro đối tượng", "Chuyển thành Cuộc kiểm toán thực địa (`Convert to Engagement`)".
4. **Quy Trình Trình Duyệt & Điều Chỉnh Kế Hoạch Năm (Workflow Modal)**:
   * **Nút "Gửi Trình Duyệt BKS"**: Tự động kiểm tra điều kiện tiên quyết (Validation: toàn bộ đối tượng High Risk đã được đưa vào kế hoạch chưa? Tổng ngày công có vượt quá năng lực khả dụng không?).
   * **Nút "Lập Đề Xuất Điều Chỉnh Kế Hoạch (Adjustment Proposal)"**: Áp dụng khi có sự kiện phát sinh trong năm (chi nhánh sáp nhập, phát hiện gian lận đột xuất cần kiểm tra ngay) theo yêu cầu giải trình của Thông tư 13.

### 1.3. Các Endpoint API Tương Ứng
* `GET /api/audit-plans?year={year}`: Lấy toàn bộ danh mục kế hoạch năm theo năm tài chính.
* `POST /api/audit-plans`: Khởi tạo kế hoạch năm mới.
* `POST /api/audit-plans/:id/submit-board`: Gửi trình duyệt Ban Kiểm soát.
* `POST /api/audit-plans/:id/convert-to-engagement`: Tự động tạo cuộc kiểm toán chính thức từ một mục trong kế hoạch năm.

---

## 2. MÀN HÌNH: ĐỊNH BIÊN NĂNG LỰC NGUỒN LỰC (`ResourceCapacityView.tsx`)

### 2.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/resource-capacity`
* **File mã nguồn**: [frontend/src/pages/ResourceCapacityView.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/ResourceCapacityView.tsx)
* **Đối tượng sử dụng**: Trưởng ban KTNB, Trưởng phòng Quản lý Nguồn lực & Chất lượng KTNB.
* **Vai trò**: Tính toán khoa học năng lực nhân sự (Man-days Capacity) của Khối KTNB để đảm bảo Kế hoạch năm có tính khả thi, không bị quá tải hoặc lãng phí nguồn lực.

### 2.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Mô Hình Tính Toán Ngày Công Khả Dụng (Capacity Formula Engine)**:
   * Tổng số ngày lịch trong năm: $365$ ngày.
   * Trừ đi: Số ngày nghỉ cuối tuần ($104$ ngày), Số ngày nghỉ lễ theo Luật Lao động ($11$ ngày).
   * Trừ đi: Số ngày nghỉ phép bình quân ($12$ ngày/KTV).
   * Trừ đi: Số ngày tham gia đào tạo nâng cao nghiệp vụ bắt buộc (CPE: $10$ ngày/KTV).
   * Trừ đi: Số ngày dự phòng kiểm toán đột xuất và quản trị nội bộ ($20$ ngày/KTV).
   * **Số ngày công kiểm toán trực tiếp khả dụng bình quân**: $\approx 208$ ngày công/KTV/năm.
2. **Biểu Đồ Cân Bằng Cung - Cầu Nguồn Lực (Resource Supply vs Demand Chart)**:
   * Biểu đồ so sánh trực quan giữa Tổng ngày công yêu cầu của các cuộc kiểm toán (Demand) và Tổng năng lực thực tế của toàn bộ đội ngũ KTV (Supply).
   * Tự động phát hiện điểm nghẽn nguồn lực theo Quý: cảnh báo Quý 3 thường bị thiếu hụt nhân sự do dồn nhiều đợt kiểm toán thực địa các Chi nhánh lớn.
3. **Phân Tích Cơ Cấu Chuyên Môn Nhân Sự (Skill Gap Analysis)**:
   * Thống kê số lượng KTV có chuyên môn sâu về: Tín dụng KHDN, Kinh doanh Nguồn vốn (Treasury), An toàn thông tin / IT Audit, Phòng chống rửa tiền (AML), Kế toán tài chính.

### 2.3. Các Endpoint API Tương Ứng
* `GET /api/resource-capacity/calculate?year={year}`: Trả về bảng phân tích định biên năng lực nhân sự.
* `POST /api/resource-capacity/update-parameters`: Điều chỉnh các tham số ngày nghỉ lễ, ngày đào tạo, tỷ lệ dự phòng đột xuất.

---

## 3. MÀN HÌNH: LỊCH BIỂU PHÂN BỔ NHÂN SỰ (`ResourceCalendar.tsx`)

### 3.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/resource-calendar`
* **File mã nguồn**: [frontend/src/pages/ResourceCalendar.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/ResourceCalendar.tsx)
* **Đối tượng sử dụng**: Trưởng phòng KTNB, Trưởng đoàn kiểm toán.
* **Vai trò**: Lập lịch và điều phối nhân sự trực quan dạng biểu đồ Gantt/Calendar, ngăn chặn hoàn toàn tình trạng trùng lịch (Overlapping / Double-booking) của KTV giữa các cuộc kiểm toán khác nhau.

### 3.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Lịch Trình Gantt Nhân Sự Trực Quan (Gantt Resource Scheduler)**:
   * Trục ngang: Các tháng và tuần trong năm tài chính.
   * Trục dọc: Danh sách từng Kiểm toán viên (kèm ảnh đại diện, chức danh, kỹ năng chuyên môn).
   * Các khối thanh màu (Time blocks): Thể hiện cuộc kiểm toán KTV đang tham gia (Màu xanh: Đã xác nhận; Màu vàng: Dự kiến; Màu đỏ: Bị xung đột lịch).
2. **Cơ Chế Phát Hiện Xung Đột Lịch Thông Minh (Conflict Detection)**:
   * Khi người dùng kéo thả (Drag & Drop) một cuộc kiểm toán mới vào khoảng thời gian mà KTV đã được phân công ở một đoàn kiểm toán khác, hệ thống lập tức hiển thị cảnh báo đỏ và chặn thao tác: *"KTV Nguyễn Văn A đã được phân công vào đoàn KT-Chi nhánh Đà Nẵng từ ngày 10/04 đến ngày 25/04"*.
3. **Bộ Lọc Lịch Phân Phối Nhanh**:
   * Lọc theo Đoàn kiểm toán, theo Phòng chuyên môn, theo Trạng thái công tác (Đang đi công tác thực địa / Làm việc tại Hội sở / Đang nghỉ phép).

### 3.3. Các Endpoint API Tương Ứng
* `GET /api/audit-schedules/calendar`: Lấy dữ liệu lịch làm việc toàn bộ KTV.
* `POST /api/audit-schedules/assign`: Phân công KTV vào lịch trình cuộc kiểm toán.

---

## 4. MÀN HÌNH: CHẤM CÔNG KIỂM TOÁN (`Timesheet.tsx`)

### 4.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/timesheet`
* **File mã nguồn**: [frontend/src/pages/Timesheet.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/Timesheet.tsx)
* **Đối tượng sử dụng**: Toàn bộ Kiểm toán viên trong Khối KTNB, Trưởng đoàn duyệt giờ công.
* **Vai trò**: Ghi nhận chi tiết thời gian làm việc hàng ngày của KTV theo từng cuộc kiểm toán và bước công việc, phục vụ công tác quản trị chi phí ngày công, tính toán giá thành cuộc kiểm toán và đánh giá hiệu suất (KPI/BSC).

### 4.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Lưới Chấm Công Tuần (Weekly Timesheet Grid)**:
   * Chọn tuần làm việc (`Week Picker`).
   * Mỗi dòng tương ứng với một Cuộc kiểm toán (`Engagement`) hoặc Công việc quản trị (`Admin Task`), Đào tạo (`Training`), Nghỉ phép (`Leave`).
   * Các cột từ Thứ 2 đến Chủ nhật: Nhập số giờ làm việc (VD: 8h, 4h).
   * Cột Tổng số giờ trong tuần: Tự động cộng dồn, kiểm tra điều kiện tiêu chuẩn (40h/tuần).
2. **Nhập Thuyết Minh Chi Tiết Từng Giờ Công (Work Log Drawer)**:
   * Khi nhấp vào ô giờ công của một ngày, KTV nhập mô tả chi tiết: *"Kiểm tra 30 bộ hồ sơ tín dụng KHDN vượt hạn mức; Phỏng vấn Giám đốc phòng giao dịch về quy trình kiểm soát kho quỹ"*.
3. **Quy Trình Duyệt Bảng Chấm Công (Timesheet Approval Workflow)**:
   * KTV bấm "Nộp Bảng Chấm Công Tuần (Submit Timesheet)".
   * Trưởng đoàn hoặc Quản trị viên trực tiếp nhận thông báo để "Phê duyệt (Approve)" hoặc "Từ chối kèm lý do (Reject)".

### 4.3. Các Endpoint API Tương Ứng
* `GET /api/timesheets/my-entries?week={weekNumber}`: Lấy bảng chấm công tuần của người dùng.
* `POST /api/timesheets/save`: Lưu nháp giờ công làm việc.
* `POST /api/timesheets/submit`: Nộp bảng chấm công tuần phê duyệt.
* `POST /api/timesheets/:id/approve`: Trưởng đoàn phê duyệt giờ công.

---

## 5. MÀN HÌNH: QUẢN LÝ HỒ SƠ NHÂN SỰ & CHỨNG CHỈ (`Personnel.tsx`, `TrainingCPE.tsx`)

### 5.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/personnel`, `/training-cpe`
* **File mã nguồn**: [frontend/src/pages/Personnel.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/Personnel.tsx), [TrainingCPE.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/TrainingCPE.tsx)
* **Đối tượng sử dụng**: Cán bộ nhân sự KTNB, Toàn thể KTV.
* **Vai trò**: Quản lý lý lịch chuyên môn KTV, lịch sử công tác ngân hàng, các chứng chỉ nghề nghiệp quốc tế và số giờ đào tạo chuyên môn liên tục (CPE) hàng năm theo yêu cầu nghiêm ngặt của **IIA GIAS Standard 3.1 & 3.2**.

### 5.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Hồ Sơ Năng Lực Kiểm Toán Viên (Auditor Professional Profile)**:
   * Thông tin định danh: Mã nhân viên, Họ tên, Chức vụ (Junior Auditor, Auditor, Senior Auditor, Team Lead, Manager).
   * Chứng chỉ nghề nghiệp quốc tế (kèm số hiệu và ngày hết hạn):
     - **CIA (Certified Internal Auditor)** - Chứng chỉ Kiểm toán viên Nội bộ Quốc tế.
     - **CISA (Certified Information Systems Auditor)** - Chứng chỉ Kiểm toán Hệ thống Thông tin.
     - **CRMA (Certification in Risk Management Assurance)** - Chứng chỉ Quản trị Rủi ro.
     - **ACCA / CPA** - Chứng chỉ Kế toán / Kiểm toán viên Công chứng.
2. **Theo Dõi Giờ Đào Tạo Tích Lũy Bắt Buộc (CPE Tracker)**:
   * Đồng hồ đo tiến độ: Mục tiêu bắt buộc tối thiểu **40 giờ CPE/năm** đối với KTV sở hữu chứng chỉ CIA/CISA.
   * Danh sách các khóa đào tạo đã hoàn thành: Tên khóa học, Đơn vị tổ chức (IIA Việt Nam, Ngân hàng Nhà nước, Hiệp hội Ngân hàng), Số giờ được công nhận, Bản scan chứng chỉ đính kèm.
3. **Theo Dõi Tính Độc Lập Khách Quan (Independence & Conflict of Interest)**:
   * Ghi nhận lịch sử làm việc của KTV tại các đơn vị Tuyến 1 (Phòng Tín dụng, Phòng Kế toán, Chi nhánh).
   * Hệ thống tự động gắn cảnh báo xung đột lợi ích nếu KTV được phân công kiểm toán đơn vị mà mình từng công tác trong vòng **3 năm gần nhất** theo quy định tại Thông tư 13.

### 5.3. Các Endpoint API Tương Ứng
* `GET /api/users/auditors`: Lấy danh sách hồ sơ KTV và chứng chỉ.
* `POST /api/training/cpe-records`: Khai báo giờ đào tạo CPE mới kèm chứng chỉ đính kèm.
* `GET /api/independence/check-conflict`: Kiểm tra tự động xung đột lợi ích giữa KTV và đối tượng kiểm toán.
