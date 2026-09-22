# ĐẶC TẢ CHI TIẾT MÀN HÌNH & TÍNH NĂNG: VŨ TRỤ KIỂM TOÁN & ĐÁNH GIÁ RỦI RO (PHẦN 2)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-SCREEN-02`  
**Căn cứ mã nguồn**: `frontend/src/pages/AuditUniverse.tsx`, `Departments.tsx`, `RiskCriteria.tsx`, `RiskAssessment.tsx`, `RiskRegister.tsx`, `RiskControlMatrix.tsx`, `ScenarioRiskMap.tsx`  
**Phiên bản**: 4.0.0  

---

## 1. MÀN HÌNH: QUẢN TRỊ VŨ TRỤ KIỂM TOÁN (`AuditUniverse.tsx`)

### 1.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/audit-universe`
* **File mã nguồn**: [frontend/src/pages/AuditUniverse.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/AuditUniverse.tsx)
* **Đối tượng sử dụng**: Trưởng ban KTNB, Trưởng phòng Kế hoạch & Rủi ro KTNB, Quản trị viên hệ thống.
* **Vai trò**: Quản lý toàn bộ danh mục các đối tượng kiểm toán có thể được kiểm toán trong toàn hàng theo yêu cầu của **Điều 62 Thông tư 13/2018/TT-NHNN**. Cung cấp cấu trúc cây phân cấp (Tree-view) kết hợp bảng dữ liệu lưới (Data-grid) đa chiều.

### 1.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Cấu Trúc Cây Phân Cấp Đối Tượng (Tree Directory Sidebar)**:
   * Cấp 1: Toàn bộ Ngân hàng (Enterprise Level).
   * Cấp 2: Khối nghiệp vụ Hội sở (Khối Bán lẻ, Khối KHDN, Khối Nguồn vốn, Khối Vận hành, Khối CNTT).
   * Cấp 3: Phòng ban Hội sở / Khu vực Vùng / Chi nhánh loại 1.
   * Cấp 4: Phòng giao dịch / Cụm giao dịch trực thuộc.
   * Cấp 5: Quy trình nghiệp vụ trọng yếu (Cho vay, Thẩm định, Huy động, Chuyển tiền, Quản trị hệ thống).
2. **Bảng Danh Mục Đối Tượng Kiểm Toán (Audit Universe Table)**:
   * **Mã đối tượng (Code)**: Mã định danh duy nhất (VD: `UNIV-CN-BD-01`).
   * **Tên đối tượng (Name)**: Tên Chi nhánh hoặc Quy trình.
   * **Phân loại (Type)**: `BRANCH` (Chi nhánh), `DEPARTMENT` (Phòng ban), `PROCESS` (Quy trình), `IT_SYSTEM` (Hệ thống CNTT).
   * **Đơn vị chủ quản (Department)**: Liên kết với bảng `departments`.
   * **Mức độ rủi ro gần nhất (Latest Risk Rating)**: Badge màu: `High` (Đỏ), `Medium` (Vàng), `Low` (Xanh).
   * **Ngày kiểm toán gần nhất (Last Audited Date)**: Hiển thị ngày ký phát hành báo cáo cuộc kiểm toán trước đó.
   * **Chu kỳ kiểm toán đề xuất (Recommended Cycle)**: Tự động tính toán (1 năm, 2 năm hoặc 3 năm) dựa trên điểm rủi ro.
3. **Các Nút Thao Tác & Modal Nghiệp Vụ**:
   * **Nút "Thêm Đối Tượng Kiểm Toán"**: Mở Modal nhập Form thông tin đối tượng: Mã, Tên, Cấp cha, Loại hình, Người đại diện, Địa bàn hoạt động, Dữ liệu khảo sát tùy biến (Custom Fields).
   * **Nút "Import Từ Excel" (`DataImportModal`)**: Hỗ trợ nạp hàng loạt danh mục đối tượng từ file mẫu `03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx` với tính năng tự động kiểm tra trùng lặp và xác thực khóa ngoại.
   * **Nút "Xuất Excel"**: Kết xuất toàn bộ danh mục Vũ trụ kiểm toán kèm lịch sử đánh giá rủi ro.

### 1.3. Các Endpoint API Tương Ứng
* `GET /api/audit-universe`: Lấy toàn bộ cây cấu trúc và danh sách đối tượng kiểm toán.
* `POST /api/audit-universe`: Tạo mới đối tượng kiểm toán.
* `PUT /api/audit-universe/:id`: Cập nhật thông tin đối tượng kiểm toán.
* `DELETE /api/audit-universe/:id`: Xóa đối tượng (chỉ cho phép khi chưa có cuộc kiểm toán liên kết).
* `POST /api/audit-universe/import`: Nạp danh mục đối tượng kiểm toán từ Excel.

---

## 2. MÀN HÌNH: CƠ CẤU TỔ CHỨC & CHI NHÁNH (`Departments.tsx`)

### 2.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/departments`
* **File mã nguồn**: [frontend/src/pages/Departments.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/Departments.tsx)
* **Đối tượng sử dụng**: Quản trị viên hệ thống, Nhân sự KTNB.
* **Vai trò**: Quản lý cây sơ đồ tổ chức phòng ban, khối chuyên môn Hội sở và mạng lưới các Chi nhánh / Phòng giao dịch trên toàn quốc theo dữ liệu thực tế của Ngân hàng (LPBank).

### 2.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Sơ Đồ Cây Tổ Chức (Organization Tree View)**:
   * Trực quan hóa cấu trúc: Hội đồng Quản trị -> Ban Kiểm soát -> Ban Tổng Giám đốc -> Các Khối -> Các Phòng ban -> Vùng -> Chi nhánh cấp tỉnh -> Phòng giao dịch cấp huyện.
2. **Thông Tin Thuộc Tính Đơn Vị (Unit Profile)**:
   * Mã đơn vị kế toán (GL Code).
   * Người đứng đầu đơn vị (Giám đốc Khối / Giám đốc Chi nhánh).
   * Email đầu mối tuân thủ (dùng cho thông báo SLA kiến nghị tự động).
   * Phân loại địa bàn kinh tế: Vùng 1 (Đô thị đặc biệt), Vùng 2, Vùng 3 (Nông thôn).

### 2.3. Các Endpoint API Tương Ứng
* `GET /api/departments`: Lấy danh mục cơ cấu tổ chức đa cấp.
* `POST /api/departments`: Khởi tạo phòng ban / chi nhánh mới.
* `PUT /api/departments/:id`: Cập nhật thông tin đơn vị.

---

## 3. MÀN HÌNH: CẤU HÌNH TIÊU CHÍ RỦI RO (`RiskCriteria.tsx`)

### 3.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/risk-criteria`
* **File mã nguồn**: [frontend/src/pages/RiskCriteria.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/RiskCriteria.tsx)
* **Đối tượng sử dụng**: Trưởng ban KTNB, Chuyên viên phương pháp luận KTNB.
* **Vai trò**: Thiết lập các thang đo định lượng và định tính phục vụ mô hình đánh giá rủi ro RBIA theo chuẩn mực quốc tế và khẩu vị rủi ro của Ngân hàng.

### 3.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Thang Đo Khả Năng Xảy Ra (Likelihood Scale: 1 - 5)**:
   * Điểm 1 - Rất Thấp: Xác suất $< 5\%$ trong 3 năm.
   * Điểm 2 - Thấp: Xác suất $5\% - 20\%$ trong năm.
   * Điểm 3 - Trung Bình: Xác suất $20\% - 50\%$ trong năm.
   * Điểm 4 - Cao: Xác suất $50\% - 80\%$ trong năm; đã phát sinh 1-2 lần trong năm trước.
   * Điểm 5 - Rất Cao: Xác suất $> 80\%$; phát sinh thường xuyên liên tục.
2. **Thang Đo Mức Độ Tác Động Đa Chiều (Impact Scale: 1 - 5)**:
   * **Chiều 1: Tổn Thất Tài Chính (Financial Loss)**:
     - Mức 1: $< 100$ triệu VND.
     - Mức 2: $100$ triệu - $1$ tỷ VND.
     - Mức 3: $1$ tỷ - $10$ tỷ VND.
     - Mức 4: $10$ tỷ - $50$ tỷ VND.
     - Mức 5: $> 50$ tỷ VND (đe dọa an toàn vốn).
   * **Chiều 2: Pháp Lý & Tuân Thủ (Regulatory & Legal Impact)**:
     - Từ vi phạm quy trình nội bộ nhẹ (Mức 1) đến bị NHNN phạt hành chính (Mức 3), đình chỉ nghiệp vụ (Mức 4), khởi tố hình sự (Mức 5).
   * **Chiều 3: Tổn Hại Uy Tín & Truyền Thông (Reputation Impact)**:
     - Từ phản ánh khách hàng cục bộ đến khủng hoảng truyền thông quốc gia.
   * **Chiều 4: Gián Đoạn Vận Hành (Operational Interruption)**:
     - Thời gian tê liệt hệ thống Core Banking / Internet Banking từ $< 30$ phút (Mức 1) đến $> 8$ giờ (Mức 5).
3. **Cấu Hình Trọng Số Hiệu Lực Kiểm Soát (Control Effectiveness Weights)**:
   * Thiết lập hệ số giảm trừ rủi ro: Kém (0.2), Trung bình (0.5), Tốt (0.7), Rất tốt (0.9).

### 3.3. Các Endpoint API Tương Ứng
* `GET /api/risk-criteria`: Lấy danh mục toàn bộ tiêu chí rủi ro hiện hành.
* `POST /api/risk-criteria`: Thêm mới hoặc hiệu chỉnh ngưỡng điểm tiêu chí.

---

## 4. MÀN HÌNH: ĐÁNH GIÁ RỦI RO ĐỊNH LƯỢNG (`RiskAssessment.tsx`)

### 4.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/risk-assessment`
* **File mã nguồn**: [frontend/src/pages/RiskAssessment.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/RiskAssessment.tsx)
* **Đối tượng sử dụng**: Trưởng đoàn, KTV chuyên trách đánh giá rủi ro định kỳ.
* **Vai trò**: Chấm điểm rủi ro cho từng đối tượng trong Vũ trụ kiểm toán, tự động tính toán điểm rủi ro và xác lập chu kỳ kiểm toán bắt buộc.

### 4.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Lưới Đánh Giá Rủi Ro Tương Tác (Risk Assessment Matrix Grid)**:
   * Chọn đối tượng kiểm toán từ danh mục Vũ trụ kiểm toán.
   * Chọn điểm Khả năng xảy ra ($L \in [1, 5]$) dựa trên lịch sử sai phạm và kết quả kiểm tra trước đó.
   * Chọn điểm Mức độ tác động ($I \in [1, 5]$) dựa trên quy mô tài sản, dư nợ tín dụng và độ phức tạp vận hành.
   * Đánh giá Hiệu lực hệ thống kiểm soát nội bộ (Control Rating: 1 đến 5 sao).
2. **Công Thức Tự Động Tính Điểm Của Hệ Thống**:
   $$\text{Inherent Risk (Rủi ro Cố hữu)} = L \times I \quad (\text{Thang 1 - 25})$$
   $$\text{Residual Risk (Rủi ro Còn lại)} = \text{Inherent Risk} \times (1 - \text{Hệ số Kiểm soát})$$
3. **Tự Động Đề Xuất Chu Kỳ Kiểm Toán (Auto-Cycle Recommendation)**:
   * **Rủi ro Còn lại $\ge 8.0$ (High Risk - Đỏ)**: Hệ thống khóa chu kỳ bắt buộc là **1 năm/lần** (tuân thủ Thông tư 13).
   * **Rủi ro Còn lại từ $4.0$ đến $7.9$ (Medium Risk - Vàng)**: Chu kỳ **2 năm/lần**.
   * **Rủi ro Còn lại $< 4.0$ (Low Risk - Xanh)**: Chu kỳ **3 năm/lần**.

### 4.3. Các Endpoint API Tương Ứng
* `POST /api/risk-assessments/calculate`: Tính toán tự động điểm rủi ro và trả về xếp loại.
* `POST /api/risk-assessments/save`: Lưu bảng đánh giá rủi ro chính thức của năm tài chính.

---

## 5. MÀN HÌNH: THƯ VIỆN MA TRẬN RỦI RO & KIỂM SOÁT (`RiskControlMatrix.tsx`)

### 5.1. Mục Đích & Vai Trò Người Dùng
* **Đường dẫn Route**: `/risk-control-matrix`
* **File mã nguồn**: [frontend/src/pages/RiskControlMatrix.tsx](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/RiskControlMatrix.tsx)
* **Đối tượng sử dụng**: KTV, Trưởng đoàn kiểm toán, Người thiết kế chương trình kiểm toán.
* **Vai trò**: Quản lý Thư viện Ma trận Rủi ro & Kiểm soát (RCM Library) mẫu chuẩn hóa của ngân hàng, giúp tái sử dụng các mục tiêu kiểm soát và thủ tục kiểm tra mẫu cho các cuộc kiểm toán thực địa.

### 5.2. Thành Phần Giao Diện & Tính Năng Chi Tiết
1. **Phân Loại Thư Viện RCM Theo Mảng Nghiệp Vụ Ngân Hàng**:
   * **RCM Tín Dụng**: Thẩm định cho vay, Giải ngân, Định giá TSBĐ, Quản lý sau vay, Phân loại nợ theo TT 11.
   * **RCM Nguồn Vốn (Treasury)**: Giao dịch FX, Thị trường liên ngân hàng, Đầu tư trái phiếu, Quản lý thanh khoản ALM.
   * **RCM Kho Quỹ & Vận Hành**: Quản lý tiền mặt, Tiếp quỹ ATM/CDM, Chuyển tiền quốc tế qua SWIFT, Thanh toán liên ngân hàng CITAD.
   * **RCM Ngân Hàng Số & CNTT**: Quản lý quyền truy cập Core Banking, An toàn mạng, Khắc phục thảm họa (DR), Quản lý thay đổi phần mềm.
2. **Cấu Trúc Chi Tiết Của Một Mục RCM (RCM Item Structure)**:
   * **Mục tiêu kiểm soát (Control Objective)**: Đảm bảo khoản vay được giải ngân đúng mục đích và đủ điều kiện pháp lý.
   * **Rủi ro tiềm ẩn (Inherent Risk)**: Khách hàng sử dụng vốn sai mục đích, hồ sơ giải ngân giả mạo.
   * **Hoạt động kiểm soát chính (Key Control Activity)**: Kiểm soát viên kiểm tra chứng từ giải ngân gốc trước khi hạch toán vào hệ thống Core Banking.
   * **Thủ tục kiểm tra thiết kế (Test of Design - ToD)**: Phỏng vấn cán bộ, rà soát quy chế cho vay xem có quy định bước kiểm tra chứng từ gốc hay không.
   * **Thủ tục kiểm tra vận hành (Test of Operating Effectiveness - ToE)**: Chọn mẫu 25 bộ hồ sơ giải ngân lớn trong kỳ, kiểm tra chữ ký kiểm soát và chứng từ chuyển tiền bên thụ hưởng.

### 5.3. Các Endpoint API Tương Ứng
* `GET /api/risk-control-matrix`: Lấy toàn bộ thư viện RCM mẫu.
* `POST /api/risk-control-matrix`: Thêm mục RCM chuẩn mới vào thư viện.
* `POST /api/risk-control-matrix/clone-to-engagement`: Sao chép các mục RCM được chọn vào Chương trình kiểm toán của một cuộc kiểm toán cụ thể.
