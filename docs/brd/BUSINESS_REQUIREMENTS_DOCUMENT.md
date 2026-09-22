# TÀI LIỆU YÊU CẦU NGHIỆP VỤ (BRD)
## HỆ THỐNG PHẦN MỀM KIỂM TOÁN NỘI BỘ THẾ HỆ MỚI (KTNB 4.0)

**Mã tài liệu**: `KTNB-DOC-BRD`  
**Chuẩn mực áp dụng**: PMBOK® Guide (Project Scope & Requirements Management), Thông tư 13/2018/TT-NHNN, IIA GIAS 2024  
**Phiên bản**: 4.0.0  
**Tình trạng**: Ban hành chính thức  
**Chủ quản nghiệp vụ**: Khối Kiểm toán Nội bộ - Ngân hàng Thương mại  

---

## 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU KINH DOANH

### 1.1. Bối Cảnh Nghiệp Vụ
Hoạt động kiểm toán nội bộ trong các Ngân hàng thương mại Việt Nam đang đối mặt với các thách thức lớn:
1. **Yêu cầu tuân thủ khắt khe**: **Thông tư 13/2018/TT-NHNN** và **Thông tư 40/2018/TT-NHNN** đặt ra các quy định mang tính pháp lý bắt buộc về cơ chế 3 tuyến phòng thủ, chuẩn mực độc lập của KTNB trực thuộc Ban Kiểm soát, và yêu cầu bắt buộc áp dụng **Kiểm toán định hướng rủi ro (Risk-Based Internal Audit - RBIA)**.
2. **Quy mô hoạt động mở rộng**: Khối lượng giao dịch tín dụng, ngoại hối, thanh toán số tăng trưởng theo cấp số nhân khiến việc kiểm tra chọn mẫu thủ công (manual sampling) không còn đủ khả năng phát hiện rủi ro và gian lận.
3. **Bất cập của các phần mềm ngoại nhập**: Các hệ sinh thái phần mềm nước ngoài (như TeamMate+, MetricStream) có chi phí bản quyền license cực kỳ đắt đỏ, triển khai phức tạp, thiếu linh hoạt và không tương thích hoàn toàn với các mẫu biểu, chế độ báo cáo theo luật định của Ngân hàng Nhà nước Việt Nam.

### 1.2. Mục Tiêu Dự Án (Project Business Goals)
* **Số hóa 100% quy trình kiểm toán**: Chuyển đổi toàn bộ hồ sơ làm việc giấy sang hồ sơ điện tử (Electronic Working Papers), hỗ trợ soát xét đa cấp và phê duyệt trực tuyến.
* **Tự động hóa lập kế hoạch định hướng rủi ro (RBIA)**: Chuẩn hóa thuật toán xếp hạng rủi ro trên toàn bộ Vũ trụ kiểm toán (Audit Universe), tự động đề xuất chu kỳ kiểm toán theo mức độ rủi ro (1 năm, 2 năm hoặc 3 năm).
* **Rút ngắn 40% thời gian phát hành báo cáo**: Tự động hóa trích xuất Biên bản kiểm toán và Báo cáo kiểm toán nội bộ từ các phát hiện chuẩn 5C, loại bỏ hoàn toàn việc sao chép thủ công.
* **Giám sát kiến nghị theo thời gian thực (Real-time Remediation Tracking)**: Cung cấp Cổng thông tin tương tác cho đơn vị được kiểm toán (Auditee Portal), theo dõi hạn xử lý (SLA) và giảm tỷ lệ kiến nghị quá hạn xuống dưới 5%.
* **Kiểm toán liên tục (Continuous Auditing - CAATs)**: Thiết lập các kịch bản quét tự động 100% dữ liệu Core Banking nhằm phát hiện sớm các dấu hiệu gian lận, cho vay đảo nợ và vi phạm quy trình.

---

## 2. CƠ SỞ PHÁP LÝ & KHUNG CHUẨN MỰC NGHỀ NGHIỆP

Tài liệu nghiệp vụ này được xây dựng trên cơ sở các văn bản quy phạm pháp luật và thông lệ quốc tế bắt buộc:

```
                  ┌──────────────────────────────────────────────┐
                  │          CHUẨN MỰC PHÁP LÝ & QUỐC TẾ          │
                  └──────────────────────┬───────────────────────┘
                                         │
       ┌─────────────────────────────────┼────────────────────────────────┐
       ▼                                 ▼                                ▼
┌──────────────────────┐      ┌──────────────────────┐       ┌──────────────────────┐
│  VĂN BẢN QUY PHẠM    │      │  CHUẨN MỰC QUỐC TẾ   │       │   QUẢN TRỊ AN TOÀN   │
│  NGÂN HÀNG NHÀ NƯỚC  │      │     IIA & COSO       │       │    VỐN & AN NINH     │
├──────────────────────┤      ├──────────────────────┤       ├──────────────────────┤
│• TT 13/2018/TT-NHNN  │      │• IIA GIAS 2024       │       │• Basel II / III / IV │
│  (Hệ thống KSNB/KTNB)│      │  (Global Standards)  │       │  (BCBS Standards)    │
│• TT 40/2018/TT-NHNN  │      │• IIA Three Lines     │       │• TT 41/2016/TT-NHNN  │
│• TT 11/2021/TT-NHNN  │      │  Model 2020          │       │  (Tỷ lệ an toàn CAR) │
│  (Phân loại nợ/DPRR) │      │• COSO 2013 (Internal │       │• TT 09/2020/TT-NHNN  │
│• TT 39/2016 & TT 06/ │      │  Control Framework)  │       │  (An toàn thông tin) │
│  2023 (Cho vay TCTD) │      │• COSO ERM 2017       │       │• TT 18/2018/TT-NHNN  │
└──────────────────────┘      └──────────────────────┘       └──────────────────────┘
```

---

## 3. PHÂN TÍCH CÁC BÊN LIÊN QUAN (STAKEHOLDER ANALYSIS)

| Bên liên quan | Vai trò trong hệ thống | Kỳ vọng & Mục tiêu chính | Trách nhiệm chính |
|---|---|---|---|
| **Ban Kiểm soát / HĐQT** | Cơ quan lãnh đạo giám sát cao nhất | Nhận báo cáo độc lập, trung thực; giám sát Heatmap rủi ro toàn ngân hàng | Phê duyệt Kế hoạch năm (AAP), Báo cáo KTNB và Quy chế KTNB |
| **Trưởng ban KTNB (CAE)** | Quản lý điều hành khối KTNB | Tối ưu hóa phân bổ nguồn lực KTV; kiểm soát chất lượng kiểm toán (QAIP) | Trình phê duyệt kế hoạch, ký phát hành Báo cáo chính thức |
| **Trưởng phòng / Quản lý KT** | Giám sát danh mục cuộc kiểm toán | Theo dõi tiến độ các đoàn kiểm toán; cân đối ngân sách và giờ công | Thẩm định Kế hoạch cuộc kiểm toán, phân công KTV |
| **Trưởng đoàn kiểm toán** | Điều phối thực địa cuộc kiểm toán | Quản lý phân công bước kiểm tra; soát xét hồ sơ (Review Notes); chốt phát hiện 5C | Tổ chức họp mở/họp đóng; hoàn thiện dự thảo báo cáo |
| **Kiểm toán viên (KTV)** | Thực hiện kiểm tra chuyên sâu | Công cụ làm việc điện tử tiện lợi; tự động trích mẫu dữ liệu; đính kèm bằng chứng | Lập hồ sơ làm việc (Workpaper); phát hiện lỗi; kiến nghị xử lý |
| **Đơn vị được KT (Auditee)** | Đối tượng được kiểm tra (Chi nhánh, Khối) | Tiếp cận biên bản minh bạch; giải trình thuận tiện; theo dõi tiến độ khắc phục | Giải trình phát hiện; xây dựng kế hoạch khắc phục; nộp bằng chứng |
| **Khối QTRR & Tuân thủ (Tuyến 2)**| Đơn vị phối hợp giám sát rủi ro | Trao đổi thông tin rủi ro trọng yếu; tránh chồng chéo phạm vi kiểm tra | Cung cấp chỉ số rủi ro (KRI); phối hợp đánh giá hồ sơ rủi ro |
| **Cơ quan Thanh tra NHNN** | Cơ quan quản lý nhà nước | Dữ liệu kiểm toán lưu trữ đầy đủ, minh bạch, có thể trích xuất khi thanh tra | Kiểm tra việc tuân thủ Thông tư 13/2018/TT-NHNN |

---

## 4. DANH MỤC YÊU CẦU NGHIỆP VỤ CỐT LÕI (CORE BUSINESS REQUIREMENTS)

```
[BR-01: Vũ Trụ KT & RCM] ──► [BR-02: Đánh Giá Rủi Ro Định Lượng] ──► [BR-03: Kế Hoạch Năm (AAP)]
                                                                               │
                                                                               ▼
[BR-06: Phát Hiện 5C] ◄──── [BR-05: Hồ Sơ Làm Việc & Soát Xét] ◄──── [BR-04: Quản Lý Cuộc KT]
        │
        ▼
[BR-07: Báo Cáo Tự Động] ──► [BR-08: Portal & Khắc Phục Kiến Nghị] ──► [BR-09: Giám Sát Liên Tục (CAATs)]
```

### BR-01: Quản Trị Vũ Trụ Kiểm Toán (Audit Universe Management)
* **Mô tả**: Hệ thống phải cho phép thiết lập và quản lý cấu trúc cây phân cấp toàn diện của Vũ trụ kiểm toán ngân hàng, bao gồm: Khối nghiệp vụ -> Phòng ban Hội sở -> Vùng/Khu vực -> Chi nhánh -> Phòng giao dịch -> Quy trình nghiệp vụ -> Hệ thống CNTT.
* **Quy tắc nghiệp vụ**: Mọi đối tượng trong Vũ trụ kiểm toán phải gắn liền với một đơn vị chịu trách nhiệm (Owner) và danh mục các rủi ro trọng yếu tương ứng.

### BR-02: Đánh Giá Rủi Ro Đa Chiều & Xếp Hạng Đối Tượng Kiểm Toán
* **Mô tả**: Hệ thống tự động tính toán điểm rủi ro theo phương pháp luận định hướng rủi ro:
  $$\text{Rủi ro Cố hữu (Inherent Risk)} = \text{Likelihood (1-5)} \times \text{Impact (1-5)}$$
  $$\text{Rủi ro Còn lại (Residual Risk)} = \text{Inherent Risk} \times (1 - \text{Hiệu lực Kiểm soát})$$
* **Quy tắc nghiệp vụ**:
  * Đối tượng xếp hạng **Rủi ro Cao**: Chu kỳ kiểm toán bắt buộc là **1 năm/lần**.
  * Đối tượng xếp hạng **Rủi ro Trung bình**: Chu kỳ kiểm toán là **2 năm/lần**.
  * Đối tượng xếp hạng **Rủi ro Thấp**: Chu kỳ kiểm toán tối đa không quá **3 năm/lần** (tuân thủ Khoản 2 Điều 63 Thông tư 13/2018/TT-NHNN).

### BR-03: Lập Kế Hoạch Kiểm Toán Năm (Annual Audit Plan - AAP) & Quản Trị Nguồn Lực
* **Mô tả**: Hỗ trợ lập kế hoạch kiểm toán hàng năm trên cơ sở kết quả đánh giá rủi ro, cân đối định biên nhân sự (Man-days), chi phí kiểm toán và lịch trình kiểm toán dự kiến.
* **Quy tắc nghiệp vụ**: Kế hoạch kiểm toán năm phải hỗ trợ quy trình trình duyệt đa cấp: `Dự thảo` -> `Trưởng ban KTNB xem xét` -> `Trình Ban Kiểm soát phê duyệt trước ngày 15/12 hàng năm`.

### BR-04: Khởi Tạo & Quản Lý Cuộc Kiểm Toán (Audit Engagement Lifecycle)
* **Mô tả**: Quản trị toàn bộ vòng đời cuộc kiểm toán từ Khảo sát ban đầu -> Họp mở -> Thực hiện kiểm toán -> Họp đóng -> Phát hành báo cáo -> Đóng hồ sơ.
* **Quy tắc nghiệp vụ**: Cho phép phân công Trưởng đoàn, Phó đoàn và các KTV thành viên kèm phân quyền truy cập giới hạn theo đúng phạm vi cuộc kiểm toán.

### BR-05: Hồ Sơ Làm Việc Điện Tử & Quy Trình Soát Xét (Workpapers & Review Notes)
* **Mô tả**: KTV thực hiện kiểm tra các bước theo Thư viện Ma trận Rủi ro & Kiểm soát (RCM), ghi chép kết quả kiểm tra thiết kế (ToD) và kiểm tra vận hành (ToE), tải lên bằng chứng kiểm toán (file, ảnh, log).
* **Quy tắc nghiệp vụ**:
  * Hỗ trợ tạo **Review Notes (Điểm soát xét)** trực tiếp trên từng hồ sơ làm việc.
  * KTV phải giải trình và cập nhật hồ sơ trước khi Người soát xét (Reviewer) hoặc Trưởng đoàn ký duyệt (`Sign-off`).

### BR-06: Chuẩn Hóa Phát Hiện Kiểm Toán Theo Mô Hình 5C
* **Mô tả**: Toàn bộ phát hiện kiểm toán phải được cấu trúc hóa bắt buộc theo chuẩn **5C**:
  1. **Condition (Thực trạng)**: Hiện tượng sai lệch thực tế phát hiện được.
  2. **Criteria (Tiêu chuẩn)**: Điều khoản luật, Thông tư NHNN hoặc quy định nội bộ bị vi phạm.
  3. **Cause (Nguyên nhân)**: Phân tích nguyên nhân gốc rễ (Root cause) bằng kỹ thuật 5 Whys.
  4. **Consequence (Hậu quả/Tác động rủi ro)**: Đánh giá thiệt hại tài chính, tổn hại uy tín hoặc nguy cơ pháp lý.
  5. **Corrective Action (Kiến nghị khắc phục)**: Biện pháp khắc phục mang tính khả thi, phân định rõ đơn vị chịu trách nhiệm và hạn chót hoàn thành.
* **Quy tắc nghiệp vụ**: Phát hiện kiểm toán phải được gắn nhãn mức độ rủi ro: `Critical`, `High`, `Medium`, `Low`.

### BR-07: Tự Động Hóa Xuất Báo Cáo Kiểm Toán Nội Bộ
* **Mô tả**: Hệ thống tự động tổng hợp toàn bộ phát hiện kiểm toán, ý kiến giải trình của đơn vị và kết quả đánh giá hệ thống KSNB để kết xuất Báo cáo Kiểm toán Nội bộ chuẩn định dạng Word (`.docx`) và PDF theo mẫu biểu quy định của Ban Kiểm soát.

### BR-08: Cổng Đơn Vị Được Kiểm Toán (Auditee Portal) & Theo Dõi Kiến Nghị
* **Mô tả**: Đơn vị được kiểm toán (Chi nhánh, Khối nghiệp vụ) đăng nhập portal để tiếp nhận kiến nghị, phân công đầu mối xử lý, cập nhật tiến độ khắc phục và tải lên tài liệu chứng minh hoàn thành.
* **Quy tắc nghiệp vụ**: KTV thẩm định bằng chứng, xác nhận đóng kiến nghị (`Closed`) hoặc từ chối và yêu cầu khắc phục tiếp (`Reopened`). Hệ thống tự động gửi email cảnh báo khi kiến nghị đến hạn hoặc quá hạn.

### BR-09: Kiểm Toán Liên Tục & Kỹ Thuật Phân Tích Dữ Liệu (CAATs)
* **Mô tả**: Tích hợp các thuật toán rà quét tự động giao dịch ngân hàng để phát hiện các dấu hiệu rủi ro cao: Cho vay đảo nợ (Evergreening), Chia nhỏ khoản vay (Structuring), Giao dịch bất thường của nhân viên ngoài giờ làm việc, và Bất thường phân phối số theo Định luật Benford.

### BR-10: Quản Trị Năng Lực, Chấm Công Kiểm Toán (Timesheets) & Đánh Giá KPI
* **Mô tả**: KTV ghi nhận giờ làm việc chi tiết theo từng cuộc kiểm toán và tác vụ chung. Hệ thống đánh giá hiệu suất (KPI/BSC) của đoàn kiểm toán dựa trên tiến độ, chất lượng hồ sơ và tỷ lệ kiến nghị được chấp thuận.

### BR-11: Chương Trình Đảm Bảo & Nâng Cao Chất Lượng Kiểm Toán (QAIP)
* **Mô tả**: Thực hiện tự đánh giá định kỳ chất lượng hoạt động kiểm toán nội bộ theo chuẩn mực quốc tế IIA GIAS Domain IV & Standard 8.4, bao gồm đánh giá nội bộ sau từng cuộc kiểm toán và đánh giá tổng thể hàng năm.

### BR-12: Vết Kiểm Toán Bất Biến (Audit Trail) & Khóa Sổ Kiểm Toán
* **Mô tả**: Lưu trữ lịch sử toàn vẹn không thể sửa đổi đối với mọi thao tác thêm, sửa, xóa dữ liệu kiểm toán. Sau khi Báo cáo kiểm toán chính thức phát hành, toàn bộ hồ sơ cuộc kiểm toán được khóa sổ (`Freeze`), ngăn chặn mọi hành vi can thiệp trái phép.

---

## 5. MA TRẬN TRUY XUẤT NGUỒN GỐC YÊU CẦU (RTM)

| Mã Yêu Cầu | Tên Yêu Cầu Nghiệp Vụ | Căn Cứ Pháp Lý / Chuẩn Mực | Phân Hệ Module Tương Ứng | Phương Pháp Kiểm Tra Nghiệm Thu |
|---|---|---|---|---|
| **BR-01** | Quản trị Vũ trụ kiểm toán | TT 13/2018 Điều 62, IIA GIAS | `AuditUniverseModule`, `DepartmentsModule` | Kiểm tra cấu trúc cây và danh mục đối tượng |
| **BR-02** | Đánh giá rủi ro định lượng | TT 13/2018 Điều 63, COSO ERM | `RiskAssessmentsModule`, `RiskCriteriaModule` | Kiểm tra công thức L x I và ma trận Heatmap |
| **BR-03** | Lập Kế hoạch năm (AAP) | TT 13/2018 Điều 64 | `AuditPlansModule`, `ResourceCapacityModule` | Kiểm tra luồng duyệt BKS trước ngày 15/12 |
| **BR-04** | Quản lý Cuộc kiểm toán | TT 13/2018 Điều 65 | `AuditEngagementsModule`, `AuditProgramsModule` | Kiểm tra phân quyền đoàn và vòng đời cuộc KT |
| **BR-05** | Hồ sơ làm việc & Soát xét | IIA GIAS Domain V, Standard 11.2 | `WorkingPapersModule`, `QualityReviewsModule` | Kiểm tra ToD/ToE, đính kèm bằng chứng, Review Notes |
| **BR-06** | Phát hiện kiểm toán 5C | IIA GIAS Standard 11.3 | `AuditFindingsModule` | Kiểm tra bắt buộc đủ 5 trường 5C và Severity |
| **BR-07** | Báo cáo KTNB tự động | TT 13/2018 Điều 66 | `AuditReportsModule` | Xuất file .docx, đối chiếu mẫu biểu Ban Kiểm soát |
| **BR-08** | Portal theo dõi kiến nghị | TT 13/2018 Điều 67 | `RecommendationsModule`, `AuditeePortalModule` | Kiểm tra quy trình đóng kiến nghị và cảnh báo SLA |
| **BR-09** | Giám sát liên tục (CAATs) | IIA Practice Advisory CAATs | `ContinuousMonitoringModule`, `AnalyticsModule` | Chạy kịch bản SQL quét cho vay đảo nợ và smurfing |
| **BR-10** | Chấm công Timesheet & KPI | PMBOK Resource Management | `TimesheetsModule`, `BscKpiModule` | Nhập giờ công và đối chiếu báo cáo năng suất |
| **BR-11** | Đảm bảo chất lượng (QAIP) | IIA GIAS Standard 8.4 | `QaipModule`, `AuditRatingModule` | Thực hiện checklist tự đánh giá QAIP |
| **BR-12** | Vết kiểm toán bất biến | TT 09/2020 Điều 15 | `AuditTrailModule`, `CaslModule` | Kiểm tra log chi tiết kèm SHA-256 và khóa sổ |
