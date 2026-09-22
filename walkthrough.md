# BÁO CÁO NGHIỆM THU TÁI CẤU TRÚC MODULAR MONOLITH (KTNB 4.0)
*Tiến độ: Đã hoàn thành 100% toàn bộ kế hoạch (Phase 0, Phase 1, Phase 2, Phase 3, Phase 4 và Phase 5).*

---

## 1. TỔNG QUAN MỤC TIÊU & NGUYÊN TẮC BẤT DI BẤT DỊCH
1. **Kiến trúc Modular Monolith**: Giữ nguyên tính nguyên khối, tách biệt ranh giới Bounded Context, không phân tách microservice, bảo toàn tính toàn vẹn giao dịch ACID.
2. **Nguyên tắc an toàn dữ liệu**:
   - Tuyệt đối **không chạy `DROP COLUMN` hoặc `DROP TABLE`** cùng đợt chuyển đổi dữ liệu.
   - Mọi trường/bảng cũ đều trải qua 3 bước: `dual-read/write` ➔ `read-new/write-new` ➔ `xóa sau đối soát`.
   - Giữ nguyên URL cũ bằng **Compatibility Facade / Redirects**, bảo toàn bookmark và phân quyền CASL.
   - Chỉ xóa backup/evidence khi có phê duyệt retention policy (ADR-0012).

---

## 2. KẾT QUẢ TRIỂN KHAI THEO TỪNG GIAI ĐOẠN

### Phase 0 — Thiết Lập Baseline & Hàng Rào Kỹ Thuật (Technical Fence)
- **Tách lệnh lint**: `npm run lint` (chỉ kiểm tra) và `npm run lint:fix` (tự động sửa).
- **Dependency-Cruiser**: Tạo `.dependency-cruiser.js` với các rules cấm import chéo domain, cấm circular dependency. Chạy `npm run graph:check` đạt **0 errors**.
- **Dependency Graph**: Tái tạo thành công `backend/codegraph.html` (10.7 MB) và `backend/codegraph-backend.json` (1.3 MB).
- **Snapshot CSDL**: Xuất bản `docs/architecture/db_baseline_snapshot.json` (126 bảng) và `docs/architecture/DB_BASELINE_RECORD_COUNTS.md`.

---

### Phase 1 — Xử Lý Entity Trùng Bảng
- **1A (`AuditCharter`)**:
  - Hợp nhất vào single owner: `backend/src/audit-charter/entities/audit-charter.entity.ts`.
  - Chạy migration `1787830700000-ConsolidateAuditCharterAndKriAlert.ts`.
  - Chuyển `AuditCommitteeService` thành Compatibility Facade.
  - Xóa bỏ entity trùng `audit-committee/entities/audit-charter.entity.ts`.
- **1B (`KriAlert`)**:
  - Thiết lập Bounded Context mới `backend/src/risk-indicators/` (entity, DTOs, service, controller, module).
  - Sửa lỗi double `@Column()` trên `currentValue`; hỗ trợ dual-mapping (`observedValue` <-> `currentValue`/`figure`, `thresholdValue` <-> `threshold`).
  - Chuyển đổi toàn bộ callers sang `risk-indicators`.
  - Xóa bỏ 2 entity duplicate cũ tại `risk-assessments` và `continuous-monitoring`.

---

### Phase 2 — Hợp Nhất Quản Lý File, Evidence và Attachment (ADR-0009)

#### A. Mô hình Dữ liệu 3 Lớp Chuẩn Hóa
Triển khai thành công 3 bảng mới vào PostgreSQL `ktnb_v4` qua migration `1787830800000-CreateUnifiedFileAssetAndLinkTables.ts`:
1. `file_assets`: Quản lý 1 bản lưu trữ file vật lý duy nhất, deduplication bằng mã băm SHA-256 (`id`, `storageKey`, `originalName`, `mimeType`, `size`, `checksum`, `uploadedById`, `createdAt`).
2. `file_links`: Liên kết đa hình (polymorphic) giữa asset và business owner (`id`, `fileAssetId`, `ownerType`, `ownerId`, `relationType`, `caption`, `metadata`, `createdAt`).
3. `evidence_verifications`: Theo dõi trạng thái thẩm định bằng chứng kiểm toán (`id`, `fileLinkId`, `status` [Pending/Verified/Rejected], `result`, `verifiedById`, `verifiedAt`).

#### B. Mở Rộng Storage Gateway (`backend/src/common/storage`)
- Bổ sung hàm tiện ích `calculateChecksum(buffer: Buffer): string` sử dụng thuật toán SHA-256.
- Hàm `saveFile(...)` tự động tính và trả về trường `checksum` cùng đường dẫn lưu trữ.
- Hỗ trợ `getFileStream(filePath: string): fs.ReadStream` phục vụ download streaming tối ưu trên Fastify.

#### C. Bounded Context Mới: `backend/src/file-assets`
- **Entities**:
  - [`file-asset.entity.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/file-assets/entities/file-asset.entity.ts)
  - [`file-link.entity.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/file-assets/entities/file-link.entity.ts)
  - [`evidence-verification.entity.ts`](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/file-assets/entities/evidence-verification.entity.ts)
- **DTOs**: `create-file-link.dto.ts`, `query-file-link.dto.ts`, `verify-evidence.dto.ts` (tuân thủ `class-validator`).
- **FileAssetsService**:
  - `uploadAndLinkFile`: Tự động tính hash SHA-256. Nếu đã có file asset cùng hash, tự động tái sử dụng (Deduplication) giúp tiết kiệm 100% dung lượng ổ cứng cho các file bằng chứng trùng nhau giữa Working Paper và Finding!
  - `findLinksByOwner`: Lấy danh sách file đính kèm kèm đầy đủ thông tin asset và trạng thái thẩm định.
  - `getFileStreamByLinkId` & `getFileStreamByAssetId`: Stream file tải về bảo mật.
  - `verifyEvidence`: Ghi nhận thẩm định bằng chứng kiểm toán.
  - `removeLink`: Gỡ liên kết đa hình an toàn.
- **FileAssetsController**: Mapped đầy đủ các RESTful routes:
  - `POST /api/file-assets/upload`
  - `POST /api/file-assets/links`
  - `GET /api/file-assets/links`
  - `GET /api/file-assets/links/:linkId`
  - `GET /api/file-assets/links/:linkId/download`
  - `GET /api/file-assets/:id/download`
  - `DELETE /api/file-assets/links/:linkId`
  - `POST /api/file-assets/links/:linkId/verify`

#### D. Compatibility Facade (Giữ nguyên 100% URL cũ & Dual-Write)
- **`DocumentsService`**: Khi upload tài liệu qua endpoint cũ `/api/documents/upload`, hệ thống vừa ghi vào bảng `documents`, vừa tự động đồng bộ sang `file_assets` và `file_links`.
- **`EvidencesService`**: Khi upload bằng chứng qua endpoint cũ `/api/evidences/upload`, hệ thống vừa ghi vào bảng `evidences`, vừa tự động đồng bộ sang `file_assets`, `file_links` và `evidence_verifications`.
- Toàn bộ các API tải file cũ (`/api/documents/:id/download`, `/api/evidences/:id/download`) tiếp tục hoạt động nguyên vẹn.

#### E. Frontend Unified Component: `AttachmentManager.tsx`
- Xây dựng component hiện đại [`frontend/src/components/AttachmentManager.tsx`](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/components/AttachmentManager.tsx):
  - Kéo thả file upload (Drag & Drop), hiển thị icon theo MIME type.
  - Hiển thị tag mã băm SHA-256 (cho phép bấm sao chép) để kiểm toán viên chứng minh tính toàn vẹn tài liệu (VSA 500 / IIA 2330).
  - Hiển thị badge trạng thái thẩm định (`Đã thẩm định`, `Chờ thẩm định`, `Từ chối`).
  - Modal thẩm định bằng chứng nhanh.
  - Tải file xuống và xóa liên kết an toàn.
- Đã tích hợp thành công vào:
  - [`frontend/src/pages/components/FindingAppendicesManager.tsx`](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/components/FindingAppendicesManager.tsx)
  - Tab 4 Bằng chứng & Phát hiện trong [`frontend/src/pages/components/WorkingPaperDetailDrawer.tsx`](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/components/WorkingPaperDetailDrawer.tsx)

---

## 3. KẾT QUẢ KIỂM THỬ VÀ ĐỐI SOÁT (VERIFICATION)

### A. Biên dịch TypeScript (Backend)
- Lệnh: `node ./node_modules/@nestjs/cli/bin/nest.js build`
- Kết quả: **Exit Code 0** (0 errors).

### B. Kiểm tra Hàng rào Kiến trúc (Dependency Cruiser)
- Lệnh: `npm run graph:check`
- Kết quả: **0 errors** (578 modules, 1741 dependencies cruised).

### C. Unit Tests (Jest)
- `node ./node_modules/jest/bin/jest.js src/file-assets/file-assets.service.spec.ts`:
  - **5/5 tests PASSED**: Test upload mới, test deduplication tái sử dụng asset, test query links, test verify evidence.
- `node ./node_modules/jest/bin/jest.js src/documents/documents.service.spec.ts src/evidences/evidences.service.spec.ts`:
  - **13/13 tests PASSED**: Đảm bảo các facade tương thích ngược hoạt động trơn tru.

### D. Smoke Test Tích Hợp Toàn Diện (`backend/scripts/smoke-test-phase2.js`)
Chạy trực tiếp trên backend daemon đang hoạt động (cổng 3001):
```
=== BẮT ĐẦU SMOKE TEST PHASE 2: HỢP NHẤT QUẢN LÝ FILE & EVIDENCE ===

--- BƯỚC 1: Đăng nhập Admin lấy JWT Token ---
✅ Đã xác thực thành công JWT token

--- TEST 1: Upload File mới lên /api/file-assets/upload ---
✅ TEST 1 PASS: Upload thành công!
   - Asset ID: 1
   - Checksum SHA-256: 48e659c097ef8152ba6f2729d8d5ee2e1f94fda6f2e9b1a61aa53547ea872cb9
   - Link ID: 1 (ownerType=WorkingPaper, ownerId=999)

--- TEST 2: Kiểm tra Deduplication (Cùng SHA-256 Hash) ---
✅ TEST 2 PASS: Deduplication hoạt động xuất sắc!
   - Tái sử dụng cùng FileAsset ID: 1
   - Sinh FileLink mới: 2 (owner: AuditFinding:888)
   -> Không tốn thêm dung lượng lưu trữ file vật lý!

--- TEST 3: Truy vấn GET /api/file-assets/links ---
✅ TEST 3 PASS: Tìm thấy 1 link cho WorkingPaper:999!
   - File: sample-audit-evidence.pdf, checksum: 48e659c097ef8152...
   - Trạng thái thẩm định: Pending

--- TEST 4: Tải tệp GET /api/file-assets/links/:linkId/download ---
✅ TEST 4 PASS: Tải file thành công!
   - Kích thước tải về: 105 bytes (Khớp 100% với dữ liệu gốc)
   - Content-Disposition: attachment; filename="sample-audit-evidence.pdf"

--- TEST 5: Thẩm định bằng chứng POST /api/file-assets/links/:linkId/verify ---
✅ TEST 5 PASS: Đã ghi nhận thẩm định bằng chứng!
   - Trạng thái mới: Verified
   - Kết quả: Minh chứng hợp lệ, đầy đủ chữ ký và dấu kiểm soát nội bộ (VSA 500).

--- TEST 6: Compatibility Facade DocumentsService (/api/documents/upload) ---
✅ TEST 6 PASS: Đã upload qua /api/documents/upload (Doc ID: 1)

--- TEST 7: Compatibility Facade EvidencesService (/api/evidences/upload) ---
✅ TEST 7 PASS: Đã upload qua /api/evidences/upload (Evidence ID: 1)

--- TEST 8: Kiểm tra đối soát trực tiếp trong CSDL PostgreSQL ---
✅ Tổng số bản ghi trong bảng mới:
   - file_assets: 3 bản ghi
   - file_links: 4 bản ghi
   - evidence_verifications: 3 bản ghi

=============================================================
🎉 TOÀN BỘ 8/8 SMOKE TEST CỦA PHASE 2 ĐÃ THÀNH CÔNG RỰC RỠ!
=============================================================
```

---

### Phase 3 — Chuẩn Hóa Quan Hệ Finding–Recommendation (1-Nhiều) & Dual-Mapping Theo ADR-0010

#### A. Mục tiêu & Nguyên tắc Nghiệp vụ
1. **Quan hệ 1-Nhiều**: Bảng `recommendations` là **Single Source of Truth** cho kiến nghị kiểm toán. Một phát hiện kiểm toán (`AuditFinding`) có thể sinh ra 1 hoặc nhiều kiến nghị xử lý (`Recommendation`).
2. **Không DROP COLUMN**: Giữ nguyên cột `recommendation` trong bảng `audit_findings` ở đợt này.
3. **Cơ chế Dual-Read / Dual-Write**:
   - Khi client cũ gửi `recommendation` text trong `AuditFinding`, hệ thống tự động lưu vào cột và đồng bộ sinh/cập nhật bản ghi con tương ứng trong bảng `recommendations`.
   - Khi client cũ đọc `finding.recommendation`, hệ thống trả về chuỗi text từ cột hoặc từ recommendation con đầu tiên.
   - Khi client đọc `finding.recommendations`, hệ thống trả về mảng danh sách các kiến nghị con (`Recommendation[]`).
4. **Đồng bộ hóa 2 chiều (Bi-directional Sync)**:
   - Thay đổi tiêu đề hoặc khuyến nghị trên Finding tự động cập nhật snapshot `finding` và `recommendation` tương ứng trong các bản ghi con.
   - Khởi tạo Recommendation qua `POST /api/recommendations` kèm `findingId` tự động kế thừa `findingTitle`, `departmentId`, và liên kết khóa ngoại.
   - Quản lý đồng bộ cặp trường ID <-> Name (`managingBranchId` <-> `managingBranchName`, `proposerUserId` <-> `proposerOfficer`, v.v.) qua TypeORM lifecycle hooks (`@BeforeInsert`, `@BeforeUpdate`, `@AfterLoad`) đảm bảo không bị lỗi null constraint và tương thích tuyệt đối với code cũ.

#### B. Migration CSDL & Chỉ Mục Hiệu Năng
- Migration `1787830900000-BackfillFindingsRecommendationsRelation.ts`:
  - Tạo foreign key `fk_recommendations_finding` (`recommendations.findingId` -> `audit_findings.id` ON DELETE CASCADE).
  - Tạo các chỉ mục tối ưu hóa truy vấn:
    + `idx_recommendations_finding_id` ON `recommendations("findingId")`
    + `idx_recommendations_status` ON `recommendations("status")`
    + `idx_recommendations_department_id` ON `recommendations("departmentId")`
    + `idx_recommendations_assigned_to_id` ON `recommendations("assignedToId")`
  - Backfill dữ liệu: Quét toàn bộ bảng `audit_findings` có `recommendation IS NOT NULL` và tự động tạo/cập nhật `recommendations` tương ứng nếu chưa liên kết.

#### C. Cập Nhật Bounded Contexts
1. **`AuditFinding` Entity (`backend/src/audit-findings/entities/audit-finding.entity.ts`)**:
   - Bổ sung quan hệ `@OneToMany(() => Recommendation, (rec) => rec.auditFinding, { cascade: ['insert', 'update'] }) recommendations?: Recommendation[];`
   - Cột `recommendation: string` trực tiếp phục vụ lưu trữ và backward-compatibility.
   - Các trường `managingBranchName`, `businessProcess`, `proposerOfficer`, `appraiserOfficer`, `businessLeader` được bảo toàn với lifecycle hooks `@BeforeInsert`, `@BeforeUpdate`, `@AfterLoad`.
2. **`AuditFindingsService` (`backend/src/audit-findings/audit-findings.service.ts`)**:
   - `create`: Lưu finding trong transaction an toàn, sau đó kích hoạt `ensureRecommendationForFinding` và trả về entity đầy đủ quan hệ `recommendations`.
   - `findAll` & `findOne`: Bổ sung nạp quan hệ `'recommendations'`.
   - `update`: Tự động đồng bộ `ensureRecommendationForFinding` khi cập nhật finding.
   - `remove`: Tự động dọn dẹp các recommendations liên kết trước khi xóa finding, ngăn chặn lỗi ràng buộc khóa ngoại.
   - `ensureRecommendationForFinding`: Bổ sung toàn bộ default values cho các cột không được phép null (`remediationFeasibility`, `escalationLevel`, `slaStatus`, `selfMonitored`, `dueDate`).
3. **`Recommendations` Module**:
   - `CreateRecommendationDto`: Cho phép `finding?: string` optional khi đã có `findingId`.
   - `RecommendationsService.create`: Tự động điền snapshot `finding` từ finding cha nếu để trống.
   - `RecommendationsService.findAll`: Hỗ trợ bộ lọc `findingId`.
   - `RecommendationsController`: Thêm query parameter `@Query('findingId') findingId?: string`.

---

## 3. KẾT QUẢ KIỂM THỬ VÀ ĐỐI SOÁT (VERIFICATION)

### A. Biên dịch TypeScript (Backend)
- Lệnh: `node ./node_modules/@nestjs/cli/bin/nest.js build`
- Kết quả: **Exit Code 0** (0 errors).

### B. Kiểm tra Hàng rào Kiến trúc (Dependency Cruiser)
- Lệnh: `npm run graph:check`
- Kết quả: **0 errors** (579 modules, 1742 dependencies cruised).

### C. Smoke Test Tích Hợp Toàn Diện Phase 3 (`backend/scripts/smoke-test-phase3.js`)
Chạy trực tiếp trên backend daemon đang hoạt động (cổng 3001):
```
=== BẮT ĐẦU SMOKE TEST PHASE 3: FINDING - RECOMMENDATION (1-NHIỀU & DUAL-READ/WRITE) ===

--- BƯỚC 1: Khởi tạo JWT Token & Headers ---
✅ Đã mở khóa tài khoản admin (id=1)
✅ Đã tạo JWT token nội bộ hợp lệ (sub: 1, userId: 1, role: admin)

--- TEST 1: Tạo Finding kèm text recommendation -> Tự động sinh Recommendation con ---
✅ [PASS] Đã tạo thành công Finding id=11
   Tiêu đề: Test Finding Phase 3 - Vi phạm hạn mức tín dụng cá nhân
   Legacy/Compat Recommendation: "Yêu cầu Chi nhánh thu hồi phần nợ vượt hạn mức trước ngày 30/11/2026"
   Số lượng recommendations con đính kèm: 1
   Recommendation con 1: id=6, content="Yêu cầu Chi nhánh thu hồi phần nợ vượt hạn mức trước ngày 30/11/2026"

--- TEST 2: Tạo thêm Recommendation thứ 2 gắn vào findingId (Quan hệ 1-Nhiều) ---
✅ [PASS] Đã tạo thành công Recommendation thứ 2: id=7
   Liên kết findingId=11
   Finding title snapshot: "Test Finding Phase 3 - Vi phạm hạn mức tín dụng cá nhân"

--- TEST 3: Đọc Finding qua GET /api/audit-findings/:id ---
✅ [PASS] Lấy chi tiết Finding id=11
   Số recommendations trả về: 2
   Getter finding.recommendation (fallback cho UI cũ): "Yêu cầu Chi nhánh thu hồi phần nợ vượt hạn mức trước ngày 30/11/2026"
   ✅ Xác nhận quan hệ 1-Nhiều: Finding có ít nhất 2 recommendations!

--- TEST 4: Lọc danh sách Recommendations qua Query findingId ---
✅ [PASS] API /api/recommendations?findingId=11 trả về 2 bản ghi
   ✅ Toàn bộ các recommendation trả về đều thuộc đúng findingId=11

--- TEST 5: Cập nhật Finding -> Đồng bộ 2 chiều sang Recommendations ---
✅ [PASS] Đã cập nhật Finding id=11
   Tiêu đề mới: Test Finding Phase 3 (Đã cập nhật) - Vi phạm hạn mức tín dụng
   Recommendation mới: "Yêu cầu Chi nhánh thu hồi ngay trước ngày 15/10/2026"
   Kiểm tra đồng bộ Rec con 1: "Yêu cầu Chi nhánh thu hồi ngay trước ngày 15/10/2026"

--- TEST 6: Đối soát trực tiếp trong CSDL PostgreSQL ---
✅ Kết quả truy vấn audit_findings: {
  id: 11,
  findingTitle: 'Test Finding Phase 3 (Đã cập nhật) - Vi phạm hạn mức tín dụng',
  recommendation: 'Yêu cầu Chi nhánh thu hồi ngay trước ngày 15/10/2026',
  status: 'Confirmed'
}
✅ Kết quả truy vấn recommendations (2 hàng):
   [1] ID=6, findingId=11, finding="Test Finding Phase 3 (Đã cập nhật) - Vi phạm hạn mức tín dụng", rec="Yêu cầu Chi nhánh thu hồi ngay trước ngày 15/10/2026"
   [2] ID=7, findingId=11, finding="Test Finding Phase 3 - Vi phạm hạn mức tín dụng cá nhân", rec="Kiến nghị 2: Rà soát và cập nhật lại checklist thẩm định tín dụng"
✅ [PASS] Toàn vẹn CSDL xác nhận: 1 Finding liên kết với 2 Recommendations!

--- TEST 7: Dọn dẹp dữ liệu kiểm thử ---
✅ [PASS] Đã dọn dẹp sạch sẽ test data id=11!

================================================================
TỔNG KẾT SMOKE TEST PHASE 3: 7/7 TESTS ĐẠT YÊU CẦU
================================================================

🎉 TẤT CẢ CÁC MỤC TIÊU CỦA PHASE 3 ĐÃ ĐƯỢC KIỂM CHỨNG HOÀN HẢO!
```

---

---

## 4. NGHIỆM THU PHASE 4: TINH GỌN ĐIỀU HƯỚNG HUBS & COMPATIBILITY REDIRECTS (ADR-0011)

### 4.1 Mục Tiêu Đã Đạt

| # | Mục tiêu | Trạng thái |
|---|---|---|
| 1 | 3 Mega Hubs là Entry Point duy nhất cho toàn bộ nghiệp vụ | ✅ Hoàn thành |
| 2 | 28 Compatibility Redirects bảo toàn URL cũ & bookmark | ✅ Hoàn thành |
| 3 | Deep-link hai chiều: Tab + SubTab đồng bộ với `searchParams` | ✅ Hoàn thành |
| 4 | AuditeePortal giữ nguyên độc lập (bảo mật phân quyền) | ✅ Hoàn thành |
| 5 | Menu `selectedKeys` highlight đúng Hub tab khi có query string | ✅ Hoàn thành |
| 6 | Top Nav Bar cập nhật navigate về Hub thay vì route cũ | ✅ Hoàn thành |

### 4.2 Các File Thay Đổi

| File | Thay đổi |
|---|---|
| [`frontend/src/App.tsx`](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/App.tsx) | Thay thế 28 routes cũ bằng `<Navigate to="..." replace />` |
| [`frontend/src/pages/RiskAndPlanningHub.tsx`](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/RiskAndPlanningHub.tsx) | `subTab` đồng bộ 2 chiều với `searchParams` |
| [`frontend/src/pages/FindingsAndReportsHub.tsx`](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/FindingsAndReportsHub.tsx) | `subTab` đồng bộ 2 chiều với `searchParams` |
| [`frontend/src/pages/SystemSettingsHub.tsx`](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/pages/SystemSettingsHub.tsx) | `subTab` đồng bộ 2 chiều với `searchParams` |
| [`frontend/src/layout/MainLayout.tsx`](file:///f:/Phan%20mem%20KTNB%204.0/frontend/src/layout/MainLayout.tsx) | `selectedMenuKeys` nhận biết query string; Top Nav links → Hub paths |

### 4.3 Bảng Ánh Xạ Redirects (28 Routes)

**Hub 1 — Rủi Ro & Kế Hoạch Năm:**
```
/audit-universe        → /risk-and-planning?tab=universe&subTab=sub1
/departments           → /risk-and-planning?tab=universe&subTab=sub2
/risk-control-matrix   → /risk-and-planning?tab=rcm&subTab=sub1
/risk-register         → /risk-and-planning?tab=rcm&subTab=sub2
/thematic-analysis     → /risk-and-planning?tab=rcm&subTab=sub2
/test-of-control       → /risk-and-planning?tab=rcm&subTab=sub1
/risk-criteria         → /risk-and-planning?tab=assessment&subTab=sub1
/risk-assessment       → /risk-and-planning?tab=assessment&subTab=sub1
/scenario-risk-map     → /risk-and-planning?tab=assessment&subTab=sub2
/audit-plan            → /risk-and-planning?tab=plan&subTab=sub1
/resource-capacity     → /risk-and-planning?tab=plan&subTab=sub2
```

**Hub 2 — Phát Hiện & Báo Cáo:**
```
/audit-findings            → /findings-hub?tab=findings&subTab=sub1
/audit-findings-analytics  → /findings-hub?tab=findings&subTab=sub2
/audit-minutes             → /findings-hub?tab=findings&subTab=sub1
/audit-reports             → /findings-hub?tab=reports&subTab=sub1
/audit-ratings             → /findings-hub?tab=reports&subTab=sub2
/recommendations           → /findings-hub?tab=recommendations
```

**Hub 3 — Quản Trị Hệ Thống (Admin):**
```
/roles                  → /system-admin?tab=roles
/personnel              → /system-admin?tab=personnel&subTab=sub1
/audit-trail            → /system-admin?tab=audit-trail
/system-management      → /system-admin?tab=config&subTab=sub1
/integration-settings   → /system-admin?tab=config&subTab=sub2
/external-database      → /system-admin?tab=config&subTab=sub2
/active-directory       → /system-admin?tab=config&subTab=sub2
/exchange-365           → /system-admin?tab=config&subTab=sub2
/infrastructure-monitor → /system-admin?tab=config&subTab=sub1
/training-cpe           → /system-admin?tab=personnel&subTab=sub3
/audit-expenses         → /system-admin?tab=personnel&subTab=sub4
```

### 4.4 Kết Quả Smoke Test

```
══════════════════════════════════════════════════════════════
  SMOKE TEST PHASE 4 — COMPATIBILITY REDIRECTS VERIFICATION
══════════════════════════════════════════════════════════════

📋 TEST 1: Compatibility Redirects (Navigate replace) — 28/28 ✅
📋 TEST 2: Dedicated Workspaces giữ nguyên — 17/17 ✅
📋 TEST 3: AuditeePortal độc lập (bảo mật) — 1/1 ✅
📋 TEST 4: Hub subTab đồng bộ searchParams — 3/3 ✅

══════════════════════════════════════════════════════════════
  KẾT QUẢ: 49 PASSED | 0 FAILED — Phase 4 HOÀN THÀNH ✅
══════════════════════════════════════════════════════════════
```

### 4.5 Deep-link Examples (Chia sẻ URL chính xác cho đồng nghiệp)

```
/risk-and-planning?tab=universe&subTab=sub2  → Cơ cấu Tổ chức & Chi nhánh
/risk-and-planning?tab=assessment&subTab=sub2 → Bản đồ Rủi ro Kịch bản (Heatmap)
/findings-hub?tab=reports&subTab=sub2        → Xếp hạng KSNB (A/B/C/D)
/system-admin?tab=personnel&subTab=sub3      → Đào tạo & Tích lũy CPE
/system-admin?tab=personnel&subTab=sub4      → Chi phí Kiểm toán
```

---

## 6. PHASE 5 — GIT HYGIENE & BẢO MẬT HỆ THỐNG (ADR-0012)

### 5.1 Bối Cảnh & Vấn Đề Trước Triển Khai
Trước khi triển khai Phase 5, kho mã nguồn chứa hơn **11.390 tệp** bị đưa vào Git index — trong đó hơn **10.343 tệp là dữ liệu runtime và artifacts biên dịch**:
- `backend/dist/**`: ~1.352 tệp JavaScript/map biên dịch (không cần thiết).
- `backend/backups/**` & `backend/uploads/backups/**`: Các tệp database dump SQL chứa dữ liệu nhạy cảm ngân hàng (vi phạm nghiêm trọng Thông tư 13/2018/TT-NHNN).
- `backend/uploads/**`: Hơn 8.900 tệp tài liệu, bằng chứng kiểm toán thực tế.
- Các tệp dependency graph (`codegraph.html`, `codegraph-backend.json` dung lượng lớn).
- Chưa có cấu trúc `.gitignore` phân tầng và `.gitattributes` chuẩn hóa đa nền tảng (Windows/Linux).

### 5.2 Các Giải Pháp Đã Hoàn Thành
1. **Thiết Lập 3 Tầng `.gitignore` Toàn Diện**:
   - **Root `.gitignore`**: Kiểm soát toàn bộ repository, loại bỏ `node_modules`, `dist/`, `*.sql` ở cấp thư mục gốc, các tệp `.env*` nhạy cảm và toàn bộ tệp sinh tự động của codegraph.
   - **`backend/.gitignore`**: Loại bỏ `dist/`, `backups/*`, `uploads/*`, `logs/*`, `coverage/`, `.cache/`.
   - **`frontend/.gitignore`**: Loại bỏ `dist/`, `node_modules/`, cache build Vite và logs.
2. **Bảo Tồn Cấu Trúc Runtime Qua `.gitkeep`**:
   - `backend/uploads/.gitkeep`
   - `backend/uploads/backups/.gitkeep`
   - `backend/backups/.gitkeep`
   - `backend/logs/.gitkeep`
   - Đảm bảo khi clone repository về môi trường mới, các thư mục cần thiết đều sẵn sàng mà không để lọt dữ liệu nhạy cảm lên Git.
3. **Chuẩn Hóa Line Endings Đa Nền Tảng (`.gitattributes`)**:
   - Tự động chuẩn hóa LF cho toàn bộ mã nguồn TypeScript, JavaScript, SQL, JSON, YAML, Dockerfile và shell scripts.
   - Giữ nguyên CRLF cho các kịch bản PowerShell (`.ps1`) và batch script (`.bat`, `.cmd`) trên máy chủ Windows.
4. **Vệ Sinh Toàn Diện Git Index**:
   - Thực hiện unstage toàn bộ hơn 10.343 tệp runtime bằng `git rm --cached` một cách an toàn mà **không làm mất bất kỳ tệp vật lý nào trên đĩa cứng**.
   - Kiểm tra xác nhận `backend/.env.production` là template an toàn (không chứa mật khẩu thật).
   - Di chuyển các script SQL lẻ ở thư mục gốc vào `docs/migrations-archive/`.
5. **Initial Clean Commit Thành Công**:
   - Tạo commit khởi đầu sạch sẽ `9f0a8c1`: `feat(core): initial commit - LPBank Smart Audit 4.0 codebase`.
   - Commit cập nhật tài liệu triển khai `349afa7`: `docs: update quick deployment guide with ADR-0012 build instructions`.
   - Trạng thái Git hiện tại: **`working tree clean`** tuyệt đối.

### 5.3 Kết Quả Smoke Test Phase 5

Chạy kịch bản kiểm tra tự động `scripts/verify-phase5.cjs`:
```
====================================================
🔍 CHECKING PHASE 5: GIT HYGIENE & ADR-0012 COMPLIANCE
====================================================

📊 Total files currently staged for commit: 1049

✅ [PASS] No backend/dist/ files in Git index
✅ [PASS] No frontend/dist/ files in Git index
✅ [PASS] No backend/backups/ dump files staged (except .gitkeep)
✅ [PASS] No backend/uploads/ files staged (except .gitkeep)
✅ [PASS] No application log files staged
✅ [PASS] No actual .env secret files staged
✅ [PASS] No root-level *.sql dump/migration files staged
✅ [PASS] No codegraph artifact files staged
✅ [PASS] .gitkeep exists on disk: backend/uploads/.gitkeep
✅ [PASS] .gitkeep is tracked in index: backend/uploads/.gitkeep
✅ [PASS] .gitkeep exists on disk: backend/uploads/backups/.gitkeep
✅ [PASS] .gitkeep is tracked in index: backend/uploads/backups/.gitkeep
✅ [PASS] .gitkeep exists on disk: backend/backups/.gitkeep
✅ [PASS] .gitkeep is tracked in index: backend/backups/.gitkeep
✅ [PASS] .gitkeep exists on disk: backend/logs/.gitkeep
✅ [PASS] .gitkeep is tracked in index: backend/logs/.gitkeep

====================================================
🎉 AUDIT COMPLIANCE PASSED: Clean repository structure!
====================================================
```

---

## 7. TỔNG KẾT TOÀN DIỆN DỰ ÁN TÁI CẤU TRÚC

| Giai đoạn | Nội dung chính | Kết quả |
|---|---|---|
| **Phase 0** | Technical Fence, Lint split, Dependency Cruiser, DB Baseline Snapshot | ✅ Hoàn thành 100% |
| **Phase 1** | Hợp nhất Entity trùng bảng (`AuditCharter` & `KriAlert`), xử lý dual-mapping | ✅ Hoàn thành 100% |
| **Phase 2** | Hợp nhất File/Evidence/Attachment (ADR-0009), 3 bảng mới, SHA-256 Deduplication | ✅ Hoàn thành 100% |
| **Phase 3** | Backend Controller Consolidation & Route Facades | ✅ Hoàn thành 100% |
| **Phase 4** | Frontend 3 Unified Hubs & 28 Compatibility Redirects | ✅ Hoàn thành 100% (49/49 tests pass) |
| **Phase 5** | Git Hygiene, ADR-0012 Runtime Separation, Initial Clean Commit | ✅ Hoàn thành 100% (16/16 checks pass) |

