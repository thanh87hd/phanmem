# ADR 0008: Một chủ sở hữu duy nhất cho mỗi bảng TypeORM (Single Entity Table Ownership)

## Bối cảnh (Context)
Trong kiến trúc backend hiện tại, hệ thống gặp hiện tượng **Split Ownership** (nhiều entity class cùng ánh xạ vào một bảng PostgreSQL vật lý):
1. Bảng `audit_charters` bị ánh xạ bởi 2 entity:
   - `src/audit-charter/entities/audit-charter.entity.ts`
   - `src/audit-committee/entities/audit-charter.entity.ts`
2. Bảng `kri_alerts` bị ánh xạ bởi 2 entity giống hệt nhau:
   - `src/risk-assessments/entities/kri-alert.entity.ts`
   - `src/continuous-monitoring/entities/kri-alert.entity.ts`

Hậu quả:
- TypeORM metadata conflict dẫn đến hành vi không xác định khi truy vấn hoặc đồng bộ schema.
- Sai lệch schema vật lý (các cột cấu trúc ở domain này không thể truy cập từ domain khác).
- Trùng lặp code, khó khăn cho audit trail và bảo trì.

## Quyết định (Decision)
1. **Quy tắc Single Table Ownership**:
   - Mỗi bảng vật lý trong CSDL PostgreSQL chỉ được sở hữu duy nhất bởi **MỘT** TypeORM Entity nằm trong bounded context tương ứng.
   - Các module/domain khác muốn truy xuất dữ liệu bắt buộc phải gọi thông qua **Service** do module chủ quản export, tuyệt đối không được tự ý tạo Entity riêng mapping trùng bảng hoặc inject Repository chéo domain mà không qua module.
2. **Quy tắc cho Audit Charter**:
   - Module `audit-charter` (`src/audit-charter`) là chủ sở hữu duy nhất của bảng `audit_charters`.
   - Entity chuẩn `AuditCharter` được bổ sung trường `content` (text) để bảo toàn dữ liệu từ API cũ.
   - Module `audit-committee` loại bỏ entity trùng, inject `AuditCharterService` để thực thi các tác vụ liên quan đến Điều lệ kiểm toán.
   - Giữ endpoint `/api/audit-committee/charters` làm Compatibility Facade gọi sang `AuditCharterService`.
3. **Quy tắc cho KRI Alert**:
   - Tách hẳn ra một Bounded Context riêng biệt: `src/risk-indicators` (Risk Indicators Module) sở hữu duy nhất bảng `kri_alerts`.
   - Các module `risk-assessments`, `continuous-monitoring`, `audit-plans`, `data-ingestion` import `RiskIndicatorsModule` và sử dụng service/entity chuẩn từ bounded context này.
   - Xóa bỏ cả 2 entity trùng lặp cũ sau khi chuyển đổi import.
   - Sửa lỗi cú pháp double `@Column()` trên thuộc tính `currentValue`.

## Hệ quả & Đánh giá (Consequences)
- **Tích cực**:
  - Loại bỏ hoàn toàn xung đột TypeORM metadata.
  - Rõ ràng ranh giới nghiệp vụ (bounded contexts) theo chuẩn Domain-Driven Design trong Modular Monolith.
  - Hàng rào kỹ thuật `dependency-cruiser` kiểm soát việc import entity xuyên domain.
- **Tiêu cực / Rủi ro**:
  - Cần di chuyển các import trong toàn bộ backend và đảm bảo API cũ hoạt động 100% không bị ngắt quãng.
