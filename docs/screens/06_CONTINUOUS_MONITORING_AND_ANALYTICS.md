# ĐẶC TẢ CHI TIẾT MÀN HÌNH & TÍNH NĂNG: KIỂM TOÁN LIÊN TỤC & PHÂN TÍCH DỮ LIỆU (PHẦN 6)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-SCREEN-06`  
**Căn cứ mã nguồn**: `frontend/src/pages/ContinuousMonitoring.tsx`, `DataAnalytics.tsx`, `ExternalDatabaseConnections.tsx`, `KnowledgeExtraction.tsx`, `ThematicAnalysis.tsx`, `ProcessAnalysis.tsx`  
**Phiên bản**: 4.0.0  

---

## 1. MÀN HÌNH: GIÁM SÁT KIỂM TOÁN LIÊN TỤC (`ContinuousMonitoring.tsx`)

### 1.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/continuous-monitoring`
* **File mã nguồn**: [frontend/src/pages/ContinuousMonitoring.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/ContinuousMonitoring.tsx) (798 dòng mã)
* **Đối tượng sử dụng**: Kiểm toán viên chuyên trách phân tích dữ liệu (CAATs Auditor), Trưởng phòng Kỹ thuật kiểm toán, Trưởng ban KTNB.
* **Vai trò**: Trái tim công nghệ phân tích dữ liệu lớn của hệ thống KTNB 4.0. Thay vì kiểm tra chọn mẫu định kỳ mỗi năm một lần, hệ thống giám sát liên tục (Continuous Auditing / Continuous Monitoring - CA/CM) 100% dữ liệu giao dịch Core Banking, áp dụng mô hình đánh giá ngân hàng **CAMELS**, phát hiện nợ nhảy nhóm ngầm, phân tích rủi ro ghi nhận lãi ảo và tự động tạo hồ sơ vụ việc kiểm toán.

### 1.2. Khung Tiêu Chuẩn Giám Sát CAMELS Tích Hợp Luật Định
Màn hình tích hợp bộ quy chiếu pháp lý đầy đủ nhất của Ngân hàng Nhà nước và Luật Các TCTD:
* **C - Capital Adequacy (Mức Đủ Vốn)**: Giám sát theo **Thông tư 14/2025/TT-NHNN** và **Thông tư 41/2016/TT-NHNN**: Tỷ lệ Vốn cấp 1 cơ bản $\text{CET1} \ge 4.5\%$, Vốn cấp 1 $\text{Tier 1} \ge 6.0\%$, Tỷ lệ an toàn vốn $\text{CAR} \ge 8.0\%$.
* **A - Asset Quality (Chất Lượng Tài Sản)**: Giám sát theo **Thông tư 11/2021/TT-NHNN** và Luật Các TCTD 2024: Tỷ lệ nợ xấu nội bảng $\le 3\%$, tỷ lệ nợ nhóm 2, trích lập dự phòng rủi ro cụ thể và chung.
* **M - Management (Năng Lực Quản Trị)**: Xếp hạng TCTD theo **Thông tư 52/2018/TT-NHNN**.
* **E - Earnings (Khả Năng Sinh Lời & Rủi Ro Lãi Ảo)**: Giám sát thuật toán:
  $$\text{NIM tăng} + \frac{\text{Lãi dự thu}}{\text{Tổng thu nhập lãi}} > 20\% + \text{Nợ nhóm 2 tăng} \longrightarrow \textbf{CẢNH BÁO NGUY CƠ LÃI ẢO}$$
* **L - Liquidity (Thanh Khoản)**: Giám sát theo **Thông tư 22/2019/TT-NHNN** và **Thông tư 26/2022/TT-NHNN**: Tỷ lệ dư nợ cho vay trên tổng tiền gửi $\text{LDR} \le 85\%$, Tỷ lệ dự trữ thanh khoản $\ge 2.0\%$, Tỷ lệ nguồn vốn ngắn hạn cho vay trung dài hạn $\le 30\%$.
* **S - Sensitivity to Market Risk (Độ Nhạy Rủi Ro Thị Trường)**: Giám sát giới hạn cấp tín dụng: 01 khách hàng $\le 15\%$ vốn tự có, Nhóm khách hàng liên quan $\le 25\%$ vốn tự có.

### 1.3. Bảy Phân Hệ Chuyên Sâu Của Màn Hình (Sub-tabs & Components)
1. **Tab 1: Bảng Điều Khiển Điều Hành CM/CA (`CmcaExecutiveDashboard.tsx`)**:
   * Thống kê số lượng cảnh báo theo mức độ ưu tiên: `RED` (Cực kỳ nghiêm trọng), `YELLOW` (Cần theo dõi sát), `GREEN` (Bình thường).
   * Tỷ lệ các cảnh báo đã được KTV mở hồ sơ kiểm toán xử lý (`Investigated`).
2. **Tab 2: Quy Tắc Kiểm Toán Tín Dụng Tự Động (`CreditAuditRulesTab.tsx`)**:
   * Cung cấp các rule SQL/Logic chạy nền hàng đêm trên Core Banking:
     - **Rule 1: Cho vay đảo nợ (Evergreening)**: Giải ngân hợp đồng mới và trích tiền trả nợ cũ trong vòng 48h.
     - **Rule 2: Chia nhỏ khoản vay (Structuring)**: Nhiều khoản vay dưới hạn mức phê duyệt của Chi nhánh phát sinh cùng ngày cho người thân của chủ doanh nghiệp.
     - **Rule 3: Trùng số Giấy chứng nhận quyền sử dụng đất**: Một bất động sản bị thế chấp ở hai hợp đồng tín dụng khác nhau.
     - **Rule 4: Hạch toán ngoài giờ giao dịch**: Bút toán đảo nợ hoặc xuất nhập kho quỹ phát sinh từ sau 18:00 đến 06:00 sáng.
3. **Tab 3: Ma Trận Chuyển Nhóm Nợ (`DebtMigrationTab.tsx`)**:
   * Trực quan hóa ma trận xác suất chuyển nhóm nợ của khách hàng từ Nhóm 1 sang Nhóm 2, 3, 4, 5 trong chu kỳ 3 tháng, 6 tháng và 12 tháng.
   * Phát hiện các Chi nhánh có hiện tượng "giữ nhóm nợ nhân tạo" (khách hàng chậm trả lãi nhiều kỳ nhưng không nhảy sang Nhóm 2).
4. **Tab 4: Phân Tích Thu Nhập & Lãi Dự Thu (`EarningsAnalysisTab.tsx`)**:
   * Đánh giá chất lượng lợi nhuận: So sánh doanh thu lãi thực thu bằng tiền mặt vs Lãi dự thu dồn tích (Accrued Interest). Cảnh báo các khoản lãi dự thu quá hạn thoái thu.
5. **Tab 5: Bảng Chỉ Số Rủi Ro Trọng Yếu (`KriDashboard.tsx`)**:
   * Giám sát danh mục các chỉ số KRI (Key Risk Indicators) của từng Chi nhánh và Khối nghiệp vụ Hội sở.
6. **Tab 6: Kiểm Thử Ngược Ngưỡng Rủi Ro (`KriBacktestingTab.tsx`)**:
   * Chạy mô phỏng dữ liệu lịch sử trong 2 năm quá khứ để kiểm chứng xem các ngưỡng cảnh báo KRI có dự báo chính xác các vụ việc nợ xấu hoặc sai phạm thực tế hay không, từ đó tối ưu hóa tham số ngưỡng kích hoạt.
7. **Drawer Xử Lý Hồ Sơ Vụ Việc Kiểm Toán (`CmcaAuditCaseDrawer.tsx`)**:
   * Khi phát hiện một cảnh báo nghiêm trọng, KTV nhấp vào cảnh báo để mở Drawer:
     - Xem toàn bộ giao dịch Core Banking cấu thành cảnh báo.
     - Nút "Khởi Tạo Hồ Sơ Vụ Việc (Open Audit Case)": Tự động chuyển cảnh báo thành một cuộc kiểm toán đột xuất hoặc gắn vào phát hiện của cuộc kiểm toán đang chạy.

---

## 2. MÀN HÌNH: KHAI PHÁ DỮ LIỆU & ĐỊNH LUẬT BENFORD (`DataAnalytics.tsx`)

### 2.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/data-analytics`
* **File mã nguồn**: [frontend/src/pages/DataAnalytics.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/DataAnalytics.tsx)
* **Đối tượng sử dụng**: Chuyên viên phân tích dữ liệu kiểm toán.
* **Vai trò**: Cung cấp công cụ toán học thống kê phân tích bất thường trên tập dữ liệu hàng triệu bản ghi giao dịch kế toán, chi phí hoạt động và hạn mức thẻ tín dụng.

### 2.2. Tính Năng Phân Tích Định Luật Benford (Benford's Law Analysis)
1. **Thuật Toán Phân Tích Phân Phối Chữ Số Đầu**:
   * Theo quy luật tự nhiên, xác suất xuất hiện của chữ số đầu tiên $d \in \{1, \dots, 9\}$ trong các tập dữ liệu tài chính không đồng đều mà tuân theo công thức:
     $$P(d) = \log_{10}\left(1 + \frac{1}{d}\right)$$
     - Số 1: $30.1\%$, Số 2: $17.6\%$, Số 3: $12.5\%$, ... Số 9: $4.6\%$.
2. **Trực Quan Hóa Đồ Thị So Sánh Thực Tế vs Lý Thuyết**:
   * Đường cong lý thuyết Benford (Màu xanh dương).
   * Cột phân phối thực tế của dữ liệu chi phí ngân hàng (Màu cam).
   * **Phát hiện gian lận**: Khi cột thực tế của số 7 hoặc số 8 tăng vọt bất thường (ví dụ: nhân viên cố tình chia nhỏ các khoản thanh toán ngay dưới ngưỡng 80 triệu hoặc 90 triệu đồng để tránh thẩm quyền duyệt), hệ thống tự động bôi đỏ và cảnh báo nghi vấn số liệu ngụy tạo nhân tạo.

---

## 3. MÀN HÌNH: CẤU HÌNH KẾT NỐI CƠ SỞ DỮ LIỆU BÊN NGOÀI (`ExternalDatabaseConnections.tsx`)

### 3.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/external-database`
* **File mã nguồn**: [frontend/src/pages/ExternalDatabaseConnections.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/ExternalDatabaseConnections.tsx)
* **Đối tượng sử dụng**: Quản trị viên hệ thống, Kỹ sư tích hợp dữ liệu KTNB.
* **Vai trò**: Quản trị an toàn các kết nối đọc dữ liệu (Read-only Database Links / JDBC) giữa hệ thống KTNB 4.0 với các cơ sở dữ liệu nguồn của Ngân hàng: Core Banking T24 (Oracle), Enterprise DWH (PostgreSQL/Greenplum), Hệ thống Thẻ SmartVista, và Hệ thống Nhân sự HRMS.

### 3.2. Tiêu Chuẩn Kỹ Thuật & Bảo Mật Kết Nối
* **Chế độ Chỉ đọc Tuyệt đối (Read-Only Enforcement)**: Kết nối sử dụng tài khoản DB được phân quyền chỉ đọc (`SELECT`), cấm hoàn toàn các lệnh DDL, DML (`INSERT, UPDATE, DELETE`).
* **Mã Hóa Thông Số Kết Nối**: Mật khẩu kết nối và Connection String được mã hóa bằng thuật toán AES-256 trong bảng `external_databases`.
* **Kiểm Tra Kết Nối Tức Thì (Test Connection)**: Nút "Kiểm tra kết nối" giúp xác thực ngay thông số IP, Port, TNS Name và độ trễ phản hồi trước khi lưu cấu hình.
