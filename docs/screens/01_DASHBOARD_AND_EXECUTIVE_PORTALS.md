# ĐẶC TẢ CHI TIẾT MÀN HÌNH & TÍNH NĂNG: PHÂN HỆ ĐIỀU HÀNH & DASHBOARD (PHẦN 1)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-SCREEN-01`  
**Căn cứ mã nguồn**: `frontend/src/pages/Dashboard.tsx`, `ExecutionDashboard.tsx`, `AuditCommitteePortal.tsx`, `AuditeePortal.tsx`, `SummaryReports.tsx`, `FindingsAnalytics.tsx`  
**Phiên bản**: 4.0.0  

---

## 1. MÀN HÌNH: DASHBOARD ĐIỀU HÀNH TỔNG THỂ (`Dashboard.tsx`)

### 1.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/dashboard`
* **File mã nguồn**: [frontend/src/pages/Dashboard.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/Dashboard.tsx)
* **Đối tượng sử dụng**: Trưởng ban KTNB (CAE), Trưởng phòng KTNB, Thành viên Ban Kiểm soát, KTV cấp cao.
* **Vai trò**: Cung cấp bức tranh tổng thể thời gian thực về tiến độ thực hiện Kế hoạch kiểm toán năm (AAP), ma trận nhiệt rủi ro (Risk Heatmap), phân bổ phát hiện kiểm toán theo mức độ rủi ro và tình hình khắc phục kiến nghị toàn ngân hàng.

### 1.2. Thành Phần Giao Diện & Dữ Liệu Chi Tiết (UI Components & State)
1. **Thanh Lọc Dữ Liệu Toàn Cục (Global Filter Bar)**:
   * `Select` Năm tài chính (`selectedYear`): Mặc định năm hiện hành (`dayjs().year()`), hỗ trợ chọn các năm quá khứ để so sánh số liệu lịch sử.
   * `Select` Khối / Đơn vị nghiệp vụ (`selectedDepartment`): Danh mục lấy từ API `/departments`, hỗ trợ lọc số liệu theo Khối Tín dụng, Khối Nguồn vốn, Mạng lưới Chi nhánh.
   * `Select` Loại hình kiểm toán (`auditType`): Định kỳ (Periodic), Đột xuất (Ad-hoc), Chuyên đề (Thematic).
2. **Hàng Thẻ Chỉ Số KPI Trọng Yếu (Statistic Cards Row)**:
   * **Thẻ 1: Tiến Độ Kế Hoạch Năm (AAP Progress)**:
     - Dữ liệu: `stats.completedPlans / stats.totalPlans * 100%`.
     - Trực quan: Thanh tiến độ `Progress` màu xanh lá (hoàn thành) hoặc vàng (đang triển khai), hiển thị số lượng cuộc kiểm toán đã đóng / tổng số cuộc được duyệt.
   * **Thẻ 2: Tổng Số Phát Hiện Kiểm Toán (Total Findings)**:
     - Dữ liệu: `stats.totalFindings`, kèm badge chia nhỏ: `Critical` (Đỏ sẫm), `High` (Đỏ tươi), `Medium` (Cam), `Low` (Xanh lá).
   * **Thẻ 3: Tỷ Lệ Khắc Phục Kiến Nghị Đúng Hạn (On-Time Remediation Rate)**:
     - Dữ liệu: `stats.closedOnTime / (stats.closedOnTime + stats.overdue) * 100%`.
     - Cảnh báo: Đổi sang màu đỏ nếu tỷ lệ $< 85\%$.
   * **Thẻ 4: Tổng Số Ngày Công Kiểm Toán (Total Man-Days)**:
     - Dữ liệu: `stats.actualManDays / stats.budgetedManDays`, đối chiếu định biên ngân sách giờ công KTV.
3. **Ma Trận Nhiệt Rủi Ro Vũ Trụ Kiểm Toán (Risk Heatmap Matrix)**:
   * Lưới $5 \times 5$ thể hiện ma trận Khả năng xảy ra (Likelihood 1-5) $\times$ Mức độ tác động (Impact 1-5).
   * Mỗi ô hiển thị số lượng đối tượng kiểm toán rơi vào tọa độ đó. Khi nhấp chuột vào ô, hiển thị Drawer danh sách chi tiết các Chi nhánh/Quy trình tương ứng.
4. **Biểu Đồ Xu Hướng Rủi Ro & Phân Bổ Kiến Nghị (Trend Charts)**:
   * Biểu đồ cột chồng (Stacked Bar Chart): Số lượng phát hiện theo từng Khối nghiệp vụ (Khối Bán lẻ, KHDN, Vận hành, CNTT).
   * Biểu đồ tròn (Donut Chart): Trạng thái khắc phục kiến nghị (`Open`, `In Progress`, `Pending Validation`, `Closed`, `Overdue`).

### 1.3. Các Endpoint API Tương Ứng
* `GET /api/dashboard/stats?year={year}&departmentId={deptId}`: Trả về các chỉ số KPI tổng hợp.
* `GET /api/dashboard/risk-heatmap`: Trả về dữ liệu phân bổ ma trận nhiệt 5x5.
* `GET /api/dashboard/findings-distribution`: Trả về cơ cấu phát hiện theo mức độ rủi ro.
* `GET /api/dashboard/remediation-sla`: Thống kê tiến độ khắc phục kiến nghị theo SLA.

---

## 2. MÀN HÌNH: DASHBOARD ĐIỀU HÀNH THỰC ĐỊA (`ExecutionDashboard.tsx`)

### 2.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/execution-dashboard`
* **File mã nguồn**: [frontend/src/pages/ExecutionDashboard.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/ExecutionDashboard.tsx)
* **Đối tượng sử dụng**: Trưởng đoàn kiểm toán, Trưởng phòng KTNB, KTV phụ trách giám sát tiến độ.
* **Vai trò**: Giám sát chi tiết các đoàn kiểm toán đang triển khai tại thực địa: tiến độ hoàn thành các bước trong Chương trình kiểm toán, tình trạng giải quyết Review Notes, tỷ lệ hoàn thành hồ sơ làm việc (Workpapers) và ngân sách ngày công tiêu hao.

### 2.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Bộ Lọc Cuộc Kiểm Toán Đang Chạy (Active Engagements Filter)**:
   * Cho phép chọn nhanh cuộc kiểm toán đang ở giai đoạn `FIELDWORK` hoặc `REPORTING`.
2. **Bảng Theo Dõi Tiến Độ Theo Đoàn Kiểm Toán (Team Execution Grid)**:
   * Cột 1: Mã & Tên cuộc kiểm toán (kèm Tag trạng thái: `Fieldwork`, `Reviewing`, `Closing`).
   * Cột 2: Trưởng đoàn & Danh sách thành viên (Avatar nhóm).
   * Cột 3: Tiến độ Hồ sơ làm việc (`Working Papers Progress`): `%` hoàn thành (Số hồ sơ `Approved` / Tổng số hồ sơ).
   * Cột 4: Tình trạng Điểm soát xét (`Review Notes Status`): Hiển thị Badge số lượng Review Notes còn `Open` (cần KTV giải trình) và `Cleared` (đã duyệt).
   * Cột 5: Số ngày công thực tế vs Kế hoạch (Burn-down chart thể hiện số giờ công KTV đã log qua Timesheet).
   * Cột 6: Thao tác nhanh: "Vào cuộc kiểm toán", "Xem hồ sơ chưa duyệt", "Nhắc nhở KTV qua email".
3. **Cảnh Báo Chậm Tiến Độ (Delay & Bottleneck Alerts)**:
   * Khối cảnh báo tự động liệt kê các hồ sơ làm việc bị tắc nghẽn (tồn tại Review Note quá 3 ngày chưa được KTV phản hồi, hoặc bước kiểm tra quá hạn cam kết).

### 2.3. Các Endpoint API Tương Ứng
* `GET /api/audit-engagements/execution-stats`: Thống kê tiến độ thực địa toàn bộ các đoàn đang kiểm toán.
* `GET /api/quality-reviews/pending-notes`: Danh sách các điểm soát xét chưa giải quyết theo đoàn kiểm toán.
* `POST /api/notifications/remind-auditor`: Gửi thông báo nhắc việc KTV chậm tiến độ.

---

## 3. MÀN HÌNH: CỔNG THÔNG TIN BAN KIỂM SOÁT (`AuditCommitteePortal.tsx`)

### 3.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/audit-committee-portal`
* **File mã nguồn**: [frontend/src/pages/AuditCommitteePortal.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/AuditCommitteePortal.tsx)
* **Đối tượng sử dụng**: Trưởng Ban Kiểm soát, Thành viên Ban Kiểm soát chuyên trách, Chủ tịch Hội đồng Quản trị.
* **Vai trò**: Cung cấp góc nhìn giám sát cấp cao, bảo đảm tính độc lập khách quan của Khối KTNB trực thuộc Ban Kiểm soát theo **Thông tư 13/2018/TT-NHNN**. Cho phép BKS phê duyệt Kế hoạch năm, ký duyệt Báo cáo định kỳ và theo dõi việc khắc phục các sai phạm nghiêm trọng.

### 3.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Khu Vực Phê Duyệt Văn Bản Trực Tuyến (Executive Sign-off Area)**:
   * Tab 1: **Kế hoạch Kiểm toán Năm (AAP) Chờ Duyệt**:
     - Xem toàn văn Dự thảo AAP trước ngày 15/12.
     - Nút "Phê duyệt Kế hoạch năm" (kèm popup nhập ý kiến chỉ đạo và ký số).
     - Nút "Yêu cầu Ban KTNB hiệu chỉnh kế hoạch".
   * Tab 2: **Báo cáo Kiểm toán Trọng yếu Chờ Ký Duyệt**:
     - Xem trước báo cáo định dạng PDF/Word.
     - Ký số ban hành Báo cáo Kiểm toán Nội bộ gửi Thống đốc NHNN và HĐQT.
2. **Bảng Theo Dõi Các Phát Hiện Nghiêm Trọng (Critical & High Findings Tracker)**:
   * Lọc riêng 100% các phát hiện có mức độ rủi ro `CRITICAL` (Sai phạm hình sự, gian lận có tổ chức, vi phạm tỷ lệ an toàn vốn, nguy cơ mất thanh khoản).
   * Hiển thị cam kết xử lý của Tổng Giám đốc và người đại diện đơn vị vi phạm.
3. **Widget Đánh Giá Tính Hiệu Quả Của KTNB (QAIP & Performance Metrics)**:
   * Tỷ lệ hoàn thành kế hoạch kiểm toán năm.
   * Tỷ lệ kiến nghị được Ban Điều hành chấp thuận và đưa vào kế hoạch hành động.
   * Báo cáo đánh giá độc lập định kỳ về chất lượng hoạt động kiểm toán nội bộ.

### 3.3. Các Endpoint API Tương Ứng
* `GET /api/audit-committee/dashboard`: Thống kê dành riêng cho cấp Ban Kiểm soát.
* `POST /api/audit-plans/:id/approve-board`: BKS phê duyệt Kế hoạch kiểm toán năm chính thức.
* `GET /api/audit-findings/critical-high`: Danh sách các phát hiện nghiêm trọng nhất toàn hàng.
* `POST /api/audit-reports/:id/board-sign`: BKS ký số phê duyệt phát hành Báo cáo KTNB.

---

## 4. MÀN HÌNH: CỔNG ĐƠN VỊ ĐƯỢC KIỂM TOÁN (`AuditeePortal.tsx`)

### 4.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/auditee-portal`
* **File mã nguồn**: [frontend/src/pages/AuditeePortal.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/AuditeePortal.tsx)
* **Đối tượng sử dụng**: Giám đốc Chi nhánh, Trưởng phòng nghiệp vụ Hội sở, Cán bộ đầu mối tuân thủ của đơn vị được kiểm toán (Auditee).
* **Vai trò**: Cầu nối số hóa minh bạch giữa đơn vị được kiểm toán và đoàn kiểm toán; tiếp nhận biên bản làm việc, thực hiện quyền giải trình trực tuyến, nhận kiến nghị và nộp bằng chứng khắc phục.

### 4.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Thẻ Thống Kê Trách Nhiệm Khắc Phục (Auditee Accountability Cards)**:
   * Tổng số kiến nghị đơn vị phải thực hiện.
   * Kiến nghị đang trong hạn cam kết.
   * Kiến nghị **Quá hạn (Overdue)** (đổi màu đỏ nhấp nháy, hiển thị số ngày trễ hạn).
   * Kiến nghị đang chờ KTV thẩm định đóng (`Pending Validation`).
2. **Bảng Quản Lý Danh Sách Kiến Nghị Của Đơn Vị (My Recommendations Table)**:
   * Cột 1: Mã kiến nghị & Cuộc kiểm toán liên quan.
   * Cột 2: Nội dung sai lệch (Condition) & Kiến nghị khắc phục cụ thể.
   * Cột 3: Người chịu trách nhiệm thực hiện tại đơn vị (Action Owner).
   * Cột 4: Hạn chót cam kết hoàn thành (Target Date).
   * Cột 5: Tiến độ thực tế (`% Slider` từ 0% đến 100%).
   * Cột 6: Thao tác:
     - Nút "Cập nhật Tiến độ": Mở modal nhập báo cáo tiến độ định kỳ.
     - Nút "Nộp Bằng chứng Đóng kiến nghị": Tải lên văn bản ban hành mới, chứng từ đã hạch toán bổ sung, hợp đồng đã sửa đổi; hệ thống tự động băm SHA-256 xác thực.
3. **Tab Giải Trình Phát Hiện Kiểm Toán Mới (Draft Findings Feedback Tab)**:
   * Cho phép đơn vị xem các phát hiện KTV vừa ghi nhận trong giai đoạn thực địa.
   * Nhập ý kiến giải trình trực tuyến: "Đồng ý với phát hiện" hoặc "Không đồng ý" (bắt buộc đính kèm văn bản giải trình và bằng chứng đối chiếu).

### 4.3. Các Endpoint API Tương Ứng
* `GET /api/recommendations/my-unit`: Lấy toàn bộ kiến nghị thuộc phạm vi đơn vị của người dùng đang đăng nhập.
* `POST /api/recommendations/:id/progress`: Cập nhật tỷ lệ % tiến độ và thuyết minh tình hình thực hiện.
* `POST /api/recommendations/:id/submit-evidence`: Tải tài liệu chứng minh và gửi yêu cầu KTV đóng kiến nghị.
* `POST /api/audit-findings/:id/auditee-response`: Gửi phản hồi giải trình chính thức của đơn vị đối với phát hiện kiểm toán.

---

## 5. MÀN HÌNH: PHÂN TÍCH CHUYÊN SÂU PHÁT HIỆN KIỂM TOÁN (`FindingsAnalytics.tsx`)

### 5.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/findings-analytics`
* **File mã nguồn**: [frontend/src/pages/FindingsAnalytics.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/FindingsAnalytics.tsx)
* **Đối tượng sử dụng**: Chuyên viên phân tích nghiệp vụ KTNB, Lãnh đạo Khối KTNB.
* **Vai trò**: Phân tích đa chiều về nguyên nhân gốc rễ (Root cause analysis), xu hướng phát sinh lỗi vi phạm theo thời gian, theo đơn vị và theo mã khiếm khuyết nghiệp vụ ngân hàng.

### 5.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Phân Tích Theo Kỹ Thuật 5 Whys & Nhóm Nguyên Nhân (Root Cause Breakdown)**:
   * Biểu đồ Pareto: Xác định 20% nguyên nhân cốt lõi gây ra 80% sai phạm trong ngân hàng (Con người / Quy trình / Hệ thống CNTT / Gian lận cố ý).
2. **Phân Tích Theo Mã Lỗi Nghiệp Vụ (Defect Code Mapping)**:
   * Thống kê theo phân nhóm mã lỗi: Lỗi quy định nội bộ (`INTERNAL`), Lỗi vi phạm chế độ báo cáo NHNN (`ND340`), Lỗi thiếu hụt năng lực/bố trí nhân sự (`NHAN_SU`).
3. **Phân Tích Tương Quan Tổn Thất Tài Chính (Financial Impact Correlation)**:
   * Tính tổng giá trị tổn thất tài chính thực tế và rủi ro tiềm ẩn (VND) theo từng Khối kinh doanh.

### 5.3. Các Endpoint API Tương Ứng
* `GET /api/analytics/findings-root-cause`: Dữ liệu phân tích nguyên nhân gốc rễ 5 Whys.
* `GET /api/analytics/defect-codes-distribution`: Cơ cấu mã lỗi toàn hệ thống.
* `GET /api/analytics/financial-exposure`: Thống kê giá trị rủi ro tài chính phát hiện qua kiểm toán.
