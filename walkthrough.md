# WALKTHROUGH — KẾT QUẢ TRIỂN KHAI PHASE 0 VÀ PHASE 1 (MODULAR MONOLITH REFACTORING)

## 1. TỔNG QUAN MỤC TIÊU & NGUYÊN TẮC THI CÔNG
Hệ thống phần mềm Quản lý Kiểm toán Nội bộ (KTNB 4.0) được tinh gọn theo định hướng **Modular Monolith**:
- **Không tách microservice**; bảo đảm toàn vẹn ACID, toàn bộ audit trail và khả năng khôi phục dữ liệu.
- **Không chạy `DROP COLUMN`/`DROP TABLE`** cùng đợt với chuyển đổi dữ liệu.
- **Mọi trường dữ liệu cũ tuân thủ chu trình 3 bước**: `dual-read/write` → `read-new/write-new` → `xóa sau đối soát`.
- **Bảo lưu URL cũ thông qua compatibility facade/redirects**; không làm hỏng bookmark hay phân quyền CASL.

---

## 2. KẾT QUẢ CHI TIẾT THEO TỪNG GIAI ĐOẠN

### Phase 0 — Thiết Lập Baseline & Hàng Rào Kỹ Thuật (Technical Fence)
1. **Lệnh Lint & Fix riêng biệt**:
   - `backend/package.json`: `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\""` (chỉ kiểm tra, không tự sửa).
   - `"lint:fix": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"` (chủ động sửa khi cần).
2. **Hàng rào cấu trúc với Dependency-Cruiser**:
   - File cấu hình: [`backend/.dependency-cruiser.js`](file:///f:/Phan%20mem%20KTNB%204.0/backend/.dependency-cruiser.js).
   - Rules: Cấm import ngược `AppModule`, cấm import xuyên domain, cảnh báo circular dependencies.
   - Scripts kiểm tra: `npm run graph:check`, `npm run graph:backend`, `npm run graph:backend:json`.
   - Kết quả `npm run graph:check`: **0 errors**.
3. **Artifacts Đồ Thị Phụ Thuộc (Dependency Graph)**:
   - Tái tạo thành công [`backend/codegraph.html`](file:///f:/Phan%20mem%20KTNB%204.0/backend/codegraph.html) (10.7 MB - có cấu trúc đồ thị tương tác).
   - Tái tạo thành công file JSON [`backend/codegraph-backend.json`](file:///f:/Phan%20mem%20KTNB%204.0/backend/codegraph-backend.json) và [`codegraph-backend.json`](file:///f:/Phan%20mem%20KTNB%204.0/codegraph-backend.json) ở root (1.3 MB, thay thế file lỗi 356 bytes cũ).
4. **Snapshot Cơ Sở Dữ Liệu PostgreSQL Baseline**:
   - Đã tạo [`docs/architecture/db_baseline_snapshot.json`](file:///f:/Phan%20mem%20KTNB%204.0/docs/architecture/db_baseline_snapshot.json) (chi tiết 126 bảng).
   - Đã tạo [`docs/architecture/DB_BASELINE_RECORD_COUNTS.md`](file:///f:/Phan%20mem%20KTNB%204.0/docs/architecture/DB_BASELINE_RECORD_COUNTS.md).

---

### Các Quyết Định Kiến Trúc (ADR 0008 — 0012)
Đã hoàn thành soạn thảo và đưa vào danh mục chính thức [`docs/adr/README.md`](file:///f:/Phan%20mem%20KTNB%204.0/docs/adr/README.md):
- [**ADR-0008**](file:///f:/Phan%20mem%20KTNB%204.0/docs/adr/0008-single-entity-table-ownership.md): Một chủ sở hữu duy nhất cho mỗi bảng TypeORM (Single Entity Table Ownership).
- [**ADR-0009**](file:///f:/Phan%20mem%20KTNB%204.0/docs/adr/0009-unified-file-asset-and-link-model.md): Mô hình File Asset & File Link thống nhất (Unified File Asset and Link Model).
- [**ADR-0010**](file:///f:/Phan%20mem%20KTNB%204.0/docs/adr/0010-finding-recommendation-one-to-many-relationship.md): Quan hệ 1-Nhiều giữa Phát hiện (Finding) và Kiến nghị (Recommendation).
- [**ADR-0011**](file:///f:/Phan%20mem%20KTNB%204.0/docs/adr/0011-navigation-hubs-and-compatibility-redirects.md): Kiến trúc Điều hướng Hub tập trung & Compatibility Redirects.
- [**ADR-0012**](file:///f:/Phan%20mem%20KTNB%204.0/docs/adr/0012-retention-policy-and-external-storage.md): Chính sách Lưu trữ Dữ liệu (Retention Policy) & Tách Runtime Data khỏi Codebase.

---

### Phase 1A — Hợp Nhất AuditCharter (Single Owner)
1. **Migration CSDL**:
   - File: [`backend/src/database/migrations/1787830700000-ConsolidateAuditCharterAndKriAlert.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/database/migrations/1787830700000-ConsolidateAuditCharterAndKriAlert.ts).
   - Bổ sung an toàn các cột cấu trúc (`purpose`, `authority`, `responsibility`, v.v.) và giữ cột `content` trong bảng `audit_charters`.
   - Chạy backfill đối soát giữa `content` và `purpose`.
2. **Chuẩn hóa Entity & Service**:
   - [`backend/src/audit-charter/entities/audit-charter.entity.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/audit-charter/entities/audit-charter.entity.ts) là chủ sở hữu duy nhất của bảng `audit_charters`. Hỗ trợ cả trường dạng text `content`, `approvedBy` và `version` dạng chuỗi (`v2026.1`, `v2026.2`, v.v.).
   - [`backend/src/audit-charter/audit-charter.service.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/audit-charter/audit-charter.service.ts): Tự động khởi tạo Điều lệ mẫu mặc định nếu bảng rỗng; hỗ trợ `createCharter`, `updateCharterStatus`, và dual-read/write.
3. **Loại bỏ Entity trùng lặp**:
   - Xóa bỏ hoàn toàn file duplicate `backend/src/audit-committee/entities/audit-charter.entity.ts`.
   - [`backend/src/audit-committee/audit-committee.module.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/audit-committee/audit-committee.module.ts): Bỏ `AuditCharter` khỏi `TypeOrmModule.forFeature`, chuyển sang import `AuditCharterModule`.
   - [`backend/src/audit-committee/audit-committee.service.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/audit-committee/audit-committee.service.ts): Ủy quyền toàn bộ các tác vụ charter sang `AuditCharterService`.
   - Giữ nguyên endpoint `/api/audit-committee/charters` làm **Compatibility Facade**.

---

### Phase 1B — Hợp Nhất KriAlert & Tạo Bounded Context Mới
1. **Thiết lập Bounded Context mới `backend/src/risk-indicators/`**:
   - Entity chuẩn: [`backend/src/risk-indicators/entities/kri-alert.entity.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/risk-indicators/entities/kri-alert.entity.ts).
     + Khắc phục triệt để lỗi cú pháp double decorator `@Column()` trên `currentValue`.
     + Bổ sung trường chuẩn `observedValue`, `departmentId`.
     + Giữ nguyên `currentValue`, `figure`, `thresholdValue`, `threshold`, `departmentName`, `departmentCode` để đảm bảo tương thích kép (dual-mapping).
     + Khóa ngoại thực `auditUniverseId` liên kết với `AuditUniverse`.
   - DTOs: [`create-kri-alert.dto.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/risk-indicators/dto/create-kri-alert.dto.ts) và [`update-kri-alert.dto.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/risk-indicators/dto/update-kri-alert.dto.ts) tích hợp đầy đủ validation rules.
   - Service: [`backend/src/risk-indicators/kri-alerts.service.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/risk-indicators/kri-alerts.service.ts) cung cấp đầy đủ logic quản lý KRI, bulk upload từ Excel, parse file, báo cáo kỳ và so sánh kỳ KRI.
   - Controller: [`backend/src/risk-indicators/kri-alerts.controller.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/risk-indicators/kri-alerts.controller.ts) tại đường dẫn chuẩn `/api/risk-indicators/kri-alerts`.
   - Module: [`backend/src/risk-indicators/risk-indicators.module.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/risk-indicators/risk-indicators.module.ts).
2. **Chuyển đổi toàn bộ Callers & Xóa Entity Duplicate**:
   - `backend/src/risk-assessments/kri.service.ts`: Chuyển thành Facade ủy quyền 100% sang `KriAlertsService`.
   - `backend/src/risk-assessments/rcsa.service.ts`: Cập nhật import `KriAlert` từ module mới.
   - `backend/src/risk-assessments/risk-assessments.module.ts`: Bỏ entity `KriAlert` khỏi forFeature, import `RiskIndicatorsModule`.
   - `backend/src/data-ingestion/data-ingestion.module.ts` và `data-pipeline.service.ts`: Cập nhật import sang `risk-indicators`.
   - `backend/src/audit-plans/audit-plans.service.ts` và `audit-plans.module.ts`: Cập nhật import sang `risk-indicators`.
   - `backend/src/app.module.ts`: Đăng ký `RiskIndicatorsModule`.
   - Xóa bỏ 2 file entity duplicate cũ:
     + `backend/src/risk-assessments/entities/kri-alert.entity.ts` (ĐÃ XÓA)
     + `backend/src/continuous-monitoring/entities/kri-alert.entity.ts` (ĐÃ XÓA)

---

## 3. KẾT QUẢ KIỂM THỬ VÀ NGHIỆM THU

### A. Kiểm tra Tính duy nhất Entity (Single Table Mapping)
- `audit_charters`: Duy nhất 1 file mapping tại `src/audit-charter/entities/audit-charter.entity.ts`.
- `kri_alerts`: Duy nhất 1 file mapping tại `src/risk-indicators/entities/kri-alert.entity.ts`.

### B. Build TypeScript
- Lệnh: `node ./node_modules/@nestjs/cli/bin/nest.js build`
- Kết quả: **Exit Code 0 (Biên dịch thành công không có bất kỳ lỗi nào)**.

### C. Dependency Cruiser Rules
- Lệnh: `node ./node_modules/dependency-cruiser/bin/dependency-cruise.mjs src --config .dependency-cruiser.js`
- Kết quả: **0 errors**, đáp ứng toàn bộ các hàng rào phụ thuộc kiến trúc.

### D. Unit Tests (Jest)
- Lệnh: `node ./node_modules/jest/bin/jest.js src/audit-committee/audit-committee.service.spec.ts src/risk-assessments/kri.service.spec.ts src/risk-indicators/kri-alerts.service.spec.ts src/data-ingestion/data-pipeline.service.spec.ts`
- Kết quả:
  ```
  PASS src/audit-committee/audit-committee.service.spec.ts
  PASS src/data-ingestion/data-pipeline.service.spec.ts
  PASS src/risk-indicators/kri-alerts.service.spec.ts
  PASS src/risk-assessments/kri.service.spec.ts

  Test Suites: 4 passed, 4 total
  Tests:       34 passed, 34 total
  Snapshots:   0 total
  Time:        40.898 s
  ```

### E. Smoke Test Tích Hợp API Thực Tế (HTTP Requests)
Chạy script kiểm thử [`backend/scripts/smoke-test-phase1.js`](file:///f:/Phan%20mem%20KTNB%204.0/backend/scripts/smoke-test-phase1.js) trên server thật (port 3001):
1. `GET /api/audit-charter`: **200 OK** (trả về danh sách Điều lệ chuẩn hóa kèm toàn văn `content`).
2. `GET /api/audit-committee/charters`: **200 OK** (Compatibility Facade hoạt động hoàn hảo).
3. `POST /api/audit-committee/charters`: **201 Created** (Khởi tạo bản ghi mới qua facade và lưu trữ vào `audit_charters` thành công).
4. `GET /api/risk-indicators/kri-alerts`: **200 OK** (Truy xuất danh sách KRI từ bounded context mới).
5. `GET /api/risk-assessments/kri`: **200 OK** (Legacy Facade hoạt động bình thường).
6. `POST /api/risk-indicators/kri-alerts`: **201 Created** (Khởi tạo KRI cảnh báo với dual-mapping tự động điền cả `observedValue` lẫn `currentValue`/`figure`, `thresholdValue` lẫn `threshold`).
7. Đối soát qua `GET /api/risk-assessments/kri`: **200 OK** (Bản ghi mới tạo lập tức hiển thị trên endpoint cũ).

---

## 4. BƯỚC TIẾP THEO (NEXT PHASES)
- **Phase 2**: Hợp nhất quản lý file, evidence và attachment theo ADR-0009 (`file_assets`, `file_links`, `evidence_verifications`, mở rộng `common/storage`, chuyển `AttachmentManager` dùng chung trên frontend).
- **Phase 3**: Loại bỏ dần các trường legacy và dữ liệu lặp theo ADR-0010 (Finding–Recommendation 1-Nhiều, dual-read logging).
