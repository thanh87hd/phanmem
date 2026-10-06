# Kế Hoạch Sửa Lỗi Sau Kiểm Thử Production — KTNB 4.0

> **Nguồn dữ liệu:** [§12 báo cáo kiểm thử](UAT_TEST_REVIEW_REPORT.md) · [prod-rbac-results.json](../frontend/e2e/prod/prod-rbac-results.json) · bundle production `index-CR3um1u2.js`
> **Nguồn chân lý về quyền:** bảng 16 màn hình × 8 vai trò trong [04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md](04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md) (PHẦN II).
> **Ngày lập:** 2026-10-06 · **Trạng thái:** chờ chốt (xem §9).

---

## 0. Tóm tắt điều hành

Kiểm chứng trên hệ thống thật phát hiện **14 sai lệch phân quyền**, quy về **7 nguyên nhân gốc**. Trong đó **2 nguyên nhân là lỗ hổng leo thang đặc quyền** (không chỉ là sai cấu hình):

| # | Lỗ hổng | Ai lợi dụng được | Mức độ |
| :-- | :--- | :--- | :--- |
| 1 | Nhóm `bks` chứa alias `trưởng ban ktnb` | **Ban Kiểm soát** vào được 28 route nghiệp vụ | **Cao** |
| 2 | `/system-admin` nằm trong nhóm route dùng chung | **KTV, CAATs, LD Phòng, BKS** vào được console quản trị | **Cao** |

**Nguyên nhân sâu xa:** mô hình vai trò trong code có **5 nhóm**, còn ma trận UAT định nghĩa **8 vai trò**. Ba nhóm `tppp` (Lãnh đạo Phòng), `caats` (Chuyên gia) và `auditee` (Đơn vị được kiểm toán) **không tồn tại trong code** — xem §4.

**Lộ trình:**

| Giai đoạn | Mục tiêu | Số sai lệch xử lý |
| :--- | :--- | ---: |
| **P0** | Chặn leo thang đặc quyền | 8/14 |
| **P1** | Đúng hoàn toàn ma trận UAT | 14/14 |
| **P2** | Chống hồi quy & tăng cường | — |

---

## 1. Phạm vi

**Trong phạm vi:** phân quyền tầng giao diện (route guard) và tầng API cho 16 màn hình ma trận.

**Ngoài phạm vi:** luồng nghiệp vụ (tạo/sửa/xóa), hiệu năng, giao diện. Lý do: bộ kiểm chứng production chạy **chỉ đọc** nên chưa có dữ liệu về các luồng này.

---

## 2. Bảng sai lệch → nguyên nhân gốc

Ký hiệu: **A** = Admin, **C** = LD Khối (CAE), **T** = LD Phòng, **L** = Trưởng đoàn, **K** = KTV, **X** = CAATs, **Đ** = Auditee, **B** = BKS.

| Mã | Nguyên nhân gốc | Sai lệch | # |
| :--- | :--- | :--- | ---: |
| **RC-A** | `/system-admin` nằm trong nhóm route A dùng chung 28 route | T, K, X, B vào được console quản trị | 4 |
| **RC-B** | Bundle production: nhóm `bks` chứa alias `trưởng ban ktnb` | B vào được `/working-papers`, `/general-tasks` | 2 |
| **RC-C** | Alias `chuyên gia` nằm trong nhóm `truongDoan` | X vào được `/findings-hub?tab=recommendations` | 1 |
| **RC-D** | `/auditee-portal` và `/bsc-kpi` **không có guard** | X vào `/auditee-portal`; Đ vào `/bsc-kpi` | 2 |
| **RC-E** | Không có nhóm `auditee` → Đ bị chặn ở mọi route có guard | Đ bị chặn oan ở màn 9, 10, 15 | 3 |
| **RC-F** | Nhóm B thiếu LD Phòng | T bị chặn oan ở màn 3 | 1 |
| **RC-G** | Nhóm A thừa KTV | K vào được màn 6 (ma trận ghi chặn) | 1 |

*(Tổng 14: RC-A 4 + RC-B 2 + RC-C 1 + RC-D 2 + RC-E 3 + RC-F 1 + RC-G 1.)*

---

## 3. Bằng chứng nguyên nhân gốc

### RC-B — alias sai nhóm (đã trích từ bundle thật)

Bundle `index-CR3um1u2.js` đang phục vụ định nghĩa nhóm `bks` **có** `auditTemplates.headOfInternalAuditCommittee` (giá trị `trưởng ban ktnb`):

```js
bks: ll([protectedRoute.controlBoard, `ban kiểm soát`], ...,
        [auditTemplates.headOfInternalAuditCommittee, `trưởng ban ktnb`])   // ← LỖI
```

Mã nguồn local **đã sửa** và còn nguyên cảnh báo tại [`roleAccess.ts:66-72`](../frontend/src/utils/roleAccess.ts#L66-L72):

> ⚠️ TUYỆT ĐỐI KHÔNG thêm `'trưởng ban ktnb'` vào nhóm này. … sẽ vô tình cấp quyền cho Ban Kiểm soát.

Nhóm `bks` đúng (local) nằm ở [`roleAccess.ts:73-78`](../frontend/src/utils/roleAccess.ts#L73-L78), **không** chứa alias trên.

### RC-A — `/system-admin` nằm trong nhóm A

[`App.tsx:193`](../frontend/src/App.tsx#L193) mở nhóm `['Admin','Trưởng Ban KTNB','Trưởng đoàn','Kiểm toán viên']` cho **28 route**, trong đó có [`App.tsx:199`](../frontend/src/App.tsx#L199):

```tsx
<Route path="system-admin" element={<SystemSettingsHub />} />   // ← dòng 199
```

Kiểm chứng giao diện thật: tài khoản KTV mở `/system-admin` thấy **nguyên console quản trị** — tiêu đề `VI - QUẢN TRỊ HỆ THỐNG`, tab `Phân quyền & Chức danh`, `Quản lý Nhân sự`, bảng 10 dòng dữ liệu.

### RC-D — hai route không có guard

[`App.tsx:186-187`](../frontend/src/App.tsx#L186-L187) nằm ngoài mọi `ProtectedRoute`:

```tsx
<Route path="auditee-portal" element={<AuditeePortal />} />   // ← dòng 186
<Route path="bsc-kpi" element={<BscKpiPage />} />             // ← dòng 187
```

### RC-E — không có nhóm `auditee`

[`roleAccess.ts:24`](../frontend/src/utils/roleAccess.ts#L24):

```ts
type RoleGroup = 'admin' | 'bks' | 'lanhDao' | 'truongDoan' | 'ktv';
```

Vai trò thật `Đơn vị được kiểm toán` **không khớp nhóm nào** ⇒ `groupsForRole()` trả tập rỗng ⇒ bị chặn ở mọi route có guard.

---

## 4. Khoảng trống mô hình vai trò (phát hiện quan trọng nhất)

| Vai trò theo ma trận | Chuỗi vai trò thật trên production | Nhóm trong code hiện tại |
| :--- | :--- | :--- |
| Admin | `Admin` | `admin` ✅ |
| LD Khối (CAE) | `Phó Giám đốc Khối kiểm toán nội bộ` | `lanhDao` ✅ |
| **LD Phòng (TP/PP)** | `Phó phòng kiểm toán hội sở hệ thống`, `Phó phòng kiểm toán đơn vị kinh doanh` | **không có** — bị gộp vào `ktv` (dòng 106-107) ❌ |
| Trưởng đoàn | *(chưa có tài khoản)* | `truongDoan` ✅ |
| KTV Thành viên | `Kiểm toán viên cao cấp`, `Kiểm toán viên chính`, `Kiểm toán viên` | `ktv` ✅ |
| **Chuyên gia CAATs** | `Chuyên gia` | **không có** — bị gộp vào `truongDoan` + `ktv` ❌ |
| **Auditee** | `Đơn vị được kiểm toán` | **không có** ❌ |
| BKS | `Trưởng Ban kiểm soát`, `Thành viên Ban kiểm soát` | `bks` ✅ |

**Hệ quả 1 — không thể biểu diễn ma trận.** Ma trận yêu cầu tách biệt `tppp` vs `ktv` (màn 3: T✓ K✗) và `caats` vs `ktv` (màn 6: L✓ X✓ K✗). Với 5 nhóm hiện tại, các ô này **không diễn đạt được**.

**Hệ quả 2 — mô hình kế thừa `expand()` xung đột với ma trận.** Code hiện tại giả định `KTV ⊃ Trưởng đoàn ⊃ Lãnh đạo` ([`roleAccess.ts:139-141`](../frontend/src/utils/roleAccess.ts#L139-L141)). Ma trận vi phạm giả định này ở **màn 3** (L✗ nhưng T✓) và **màn 6** (K✗ nhưng L✓ và X✓).

---

## 5. Thiết kế đích

### 5.1. Mở rộng mô hình vai trò

Thêm 3 nhóm vào `RoleGroup` (dòng 24) và `GROUP_ALIASES` (dòng 59):

| Nhóm mới | Alias (vi) |
| :--- | :--- |
| `tppp` | `trưởng phòng kiểm toán hội sở hệ thống`, `phó phòng kiểm toán hội sở hệ thống`, `trưởng phòng kiểm toán đơn vị kinh doanh`, `phó phòng kiểm toán đơn vị kinh doanh` |
| `caats` | `chuyên gia` |
| `auditee` | `đơn vị được kiểm toán` |

Đồng thời **gỡ** `chuyên gia` khỏi `truongDoan` (dòng 95) và khỏi `ktv` (dòng 104); **gỡ** `trưởng phòng/phó phòng` khỏi `truongDoan` (dòng 93-94) và `ktv` (dòng 106-107).

### 5.2. Bỏ kế thừa, dùng allowlist tường minh

Bỏ hàm `expand()`; mỗi route liệt kê **đúng** các nhóm được phép. Đề xuất cú pháp token nhóm để allowlist tự tài liệu hoá:

```tsx
<ProtectedRoute allowGroups={['admin', 'cae', 'lead', 'ktv']} />
```

Giữ `allowedRoles` cho tương thích ngược trong giai đoạn chuyển tiếp.

### 5.3. Bảng allowlist đích cho 16 màn hình

| Màn | Route | Nhóm được phép | Thay đổi so với hiện tại |
| ---: | :--- | :--- | :--- |
| 1 | `/` | **tất cả** | giữ nguyên (không guard) |
| 2 | `/audit-committee-portal` | A, C, B | giữ nguyên |
| 3 | `/regulatory-exams` | A, C, **T**, B | **tách khỏi nhóm B**, thêm T |
| 4 | `/auditee-portal` | A, C, T, L, K, **Đ**, B | **thêm guard** (hiện không có) |
| 5 | `/risk-and-planning` | A, C, T, L, K, X, B | tách khỏi nhóm A |
| 6 | `?step=plan` | A, C, T, L, X, B | **guard trong component** (chặn K) |
| 7 | `/audit-engagements` | A, C, T, L, K, X, B | tách khỏi nhóm A |
| 8 | `/working-papers` | A, C, T, L, K, X | tách khỏi nhóm A (loại Đ, B) |
| 9 | `/findings-hub` | **tất cả** | tách khỏi nhóm A |
| 10 | `?tab=recommendations` | tất cả **trừ X** | **guard trong component** (chặn X) |
| 11 | `/continuous-monitoring` | A, C, T, L, K, X, B | tách khỏi nhóm A |
| 12 | `/general-tasks` | A, C, T, L, K, X | tách khỏi nhóm A (loại Đ, B) |
| 13 | `/bsc-kpi` | tất cả **trừ Đ** | **thêm guard** (hiện không có) |
| 14 | `/document-manager` | A, C, T, L, K, X, B | tách khỏi nhóm A |
| 15 | `/regulatory-kb` | **tất cả** | tách khỏi nhóm A |
| 16 | `/system-admin` | A, C | **tách thành route riêng** |

---

## 6. Kế hoạch thi công

### Giai đoạn P0 — Chặn leo thang đặc quyền (xử lý 7/14)

| Bước | Việc làm | File / dòng | Xử lý | Ước lượng |
| :--- | :--- | :--- | :--- | :--- |
| **P0-1** | **Commit + build + deploy** `roleAccess.ts` | `frontend/src/utils/roleAccess.ts` (**đang UNTRACKED**) | RC-B | S |
| **P0-1b** | **Bù hệ quả của P0-1:** thêm `Ban Kiểm soát` + `Ban kiểm soát` vào allowlist #1; **tách** `working-papers` và `general-tasks` sang allowlist mới **không** có BKS | [`App.tsx:193`](../frontend/src/App.tsx#L193) | RC-B (hệ quả) | S |
| **P0-2** | Chuyển `system-admin` sang nhóm `['Admin','Trưởng Ban KTNB']` | [`App.tsx:199`](../frontend/src/App.tsx#L199) → nhóm tại [`App.tsx:244`](../frontend/src/App.tsx#L244) | RC-A | S |
| **P0-3** | Thêm guard cho `/auditee-portal` | [`App.tsx:186`](../frontend/src/App.tsx#L186) | RC-D | S |
| **P0-4** | Thêm guard cho `/bsc-kpi` | [`App.tsx:187`](../frontend/src/App.tsx#L187) | RC-D | S |

**P0-1 là bước quan trọng nhất.** Tệp `roleAccess.ts` hiện **chưa được git theo dõi** (`git status` báo `??`) — nghĩa là bản sửa chỉ tồn tại trên máy local và **chưa từng được commit**. Đây chính là lý do production vẫn chạy bundle cũ.

> 🔴 **P0-1 KHÔNG được deploy một mình — phải kèm P0-1b.** Đã mô phỏng lại toàn bộ 112 lượt kiểm (16 màn × 7 tài khoản) trên chính bundle production:
>
> | Kịch bản | Sai lệch | Ghi chú |
> | :--- | ---: | :--- |
> | Hiện trạng production | **14** | khớp đúng 14 sai lệch đã đo |
> | Chỉ P0-1 (deploy `roleAccess.ts`) | **19** | ⚠️ **hồi quy 8 ô của BKS** |
> | P0-1 + P0-2 + P0-3 + P0-4 (nguyên kế hoạch) | **15** | ⚠️ vẫn còn 8 hồi quy |
> | P0-1 + **P0-1b** + P0-2 + P0-3 + P0-4 | **7** | ✅ không hồi quy |
>
> **Nguyên nhân:** allowlist #1 hiện lấy được nhóm `bks` **chỉ nhờ chính alias sai** `trưởng ban ktnb` (RC-B). Khi P0-1 gỡ alias đó, `bks` **rơi khỏi cả 28 route** của allowlist #1 — BKS mất quyền ở màn 5, 6, 7, 9, 10, 11, 14, 15. Phải thêm tường minh `Ban Kiểm soát`/`Ban kiểm soát` vào allowlist #1.
>
> **Nhưng thêm BKS vào #1 lại làm lộ 2 ô nữa:** `working-papers` (màn 8) và `general-tasks` (màn 12) đều nằm trong #1 nhưng ma trận yêu cầu **chặn BKS**. Vì vậy 2 route này phải tách sang allowlist riêng `['Admin','Trưởng Ban KTNB','Trưởng đoàn','Kiểm toán viên']`. Đây vốn là việc của P1-3; P0 buộc phải kéo một phần P1-3 lên trước.

```bash
cd frontend
git add src/utils/roleAccess.ts
git commit -m "fix(rbac): sua alias nhom vai tro, tach truong ban ktnb khoi ban kiem soat"
npm run build
# deploy → xác minh §8.2
```

**P0-3 / P0-4 — allowlist đề xuất (dùng chuỗi vai trò, chưa cần token nhóm):**

```tsx
// Màn 4 — tất cả trừ Chuyên gia CAATs
<Route element={<ProtectedRoute allowedRoles={['Admin','Trưởng Ban KTNB','Trưởng đoàn','Kiểm toán viên','Đơn vị được kiểm toán','Ban Kiểm soát','Ban kiểm soát']} />}>
  <Route path="auditee-portal" element={<AuditeePortal />} />
</Route>

// Màn 13 — tất cả trừ Auditee
<Route element={<ProtectedRoute allowedRoles={['Admin','Trưởng Ban KTNB','Trưởng đoàn','Kiểm toán viên','Chuyên gia','Ban Kiểm soát','Ban kiểm soát']} />}>
  <Route path="bsc-kpi" element={<BscKpiPage />} />
</Route>
```

> ⚠️ **Lưu ý kỹ thuật:** hai allowlist trên chỉ đúng **sau khi** đã gỡ `chuyên gia` khỏi nhóm `truongDoan`/`ktv` (P1-1). Nếu làm P0 trước P1, phải chấp nhận rằng `Chuyên gia` vẫn lọt vào màn 4 do kế thừa. Xem §9 (Quyết định Q1).

### Giai đoạn P1 — Đúng hoàn toàn ma trận (xử lý 14/14)

| Bước | Việc làm | File / dòng | Xử lý | Ước lượng |
| :--- | :--- | :--- | :--- | :--- |
| **P1-1** | Thêm nhóm `tppp`, `caats`, `auditee`; gỡ alias trùng khỏi `truongDoan`/`ktv` | `roleAccess.ts:24`, `:59-110` | RC-C, RC-E, RC-F | M |
| **P1-2** | Bỏ `expand()`, chuyển sang allowlist tường minh | `roleAccess.ts:139-165` | RC-G + toàn bộ | M |
| **P1-3** | Tách nhóm A (28 route) thành A1/A2/A3 theo bảng §5.3 | `App.tsx:193-234` | RC-G | M |
| **P1-4** | Tách nhóm B: màn 3 tách khỏi màn 2 | `App.tsx:237-242` | RC-F | S |
| **P1-5** | Guard trong component: chặn K ở `?step=plan` | `RiskAndPlanningHub` | màn 6 | M |
| **P1-6** | Guard trong component: chặn X ở `?tab=recommendations` | `FindingsAndReportsHub` | màn 10 | M |

### Giai đoạn P2 — Chống hồi quy & tăng cường

| Bước | Việc làm | Ước lượng |
| :--- | :--- | :--- |
| **P2-1** | Unit test `roleAccess` sinh tự động từ ma trận UAT (vitest) | M |
| **P2-2** | Đưa bộ `test:prod` vào lịch chạy định kỳ sau mỗi lần deploy | S |
| **P2-3** | Lọc trường nhạy cảm của `GET /users` theo vai trò (§12.5 báo cáo) | M |
| **P2-4** | Đối chiếu `allowedRoles` của **toàn bộ** API endpoint với ma trận | L |

---

## 7. Test bổ sung (P2-1)

Điểm mấu chốt: test **sinh từ chính tài liệu UAT**, không chép tay — cùng nguyên tắc với `prod-rbac.matrix.ts`. Khi tài liệu đổi, test tự đổi theo.

```ts
// frontend/src/utils/roleAccess.spec.ts
import { describe, it, expect } from 'vitest';
import { hasRouteAccess } from './roleAccess';
import { RBAC_MATRIX, ROLE_ACCOUNTS } from '../../e2e/prod/prod-rbac.matrix';

describe('Ma trận RBAC khớp tài liệu UAT', () => {
  for (const row of RBAC_MATRIX) {
    for (const [group, account] of Object.entries(ROLE_ACCOUNTS)) {
      if (!account.length) continue;   // nhóm Trưởng đoàn: chưa có tài khoản
      it(`man ${row.stt} ${row.url} — ${group}`, () => {
        expect(hasRouteAccess(ALLOW[row.url], ROLE_ROLE[account[0]]))
          .toBe(row.exp[group].allowed);
      });
    }
  }
});
```

---

## 8. Triển khai & kiểm chứng

### 8.1. Thứ tự

1. P0-1 → P0-1b → P0-4, chạy `npm run test:prod`, kỳ vọng còn **7 sai lệch** (RC-C 1: `caats` màn 4; RC-E 3: `auditee` màn 9/10/15; RC-F 1: `tppp` màn 3; RC-G 2: `ktv` màn 6 và `caats` màn 10 — cả hai đều là ô phụ thuộc query param).
2. P1-1 → P1-6, chạy lại, kỳ vọng **0 sai lệch**.
3. P2-1 → P2-4.

### 8.2. Xác minh bundle đã deploy (bắt buộc, đừng tin `git push`)

Bài học từ chính lần kiểm thử này: **mã nguồn đúng không có nghĩa là production đúng.** Phải kiểm tra bundle thật:

```bash
cd frontend
npm run build
# lấy tên bundle mới từ index.html rồi kiểm tra nhóm bks KHÔNG còn chứa alias sai:
node -e "const fs=require('fs');const t=fs.readFileSync(process.argv[1],'utf8');" \
  "console.log('con loi:', t.includes('auditTemplates.headOfInternalAuditCommittee'));" dist/assets/index-*.js
```

Hoặc đơn giản hơn — chạy lại bộ kiểm chứng trên production:

```bash
npm run test:prod
```

### 8.3. Tiêu chí đạt

- `prod-rbac-results.json` có `totalDeviations: 0`.
- Bundle production **không** còn `auditTemplates.headOfInternalAuditCommittee` trong nhóm `bks`.
- Tài khoản KTV mở `/system-admin` thấy trang **403 Forbidden**.

---

## 9. Rủi ro & quyết định cần chốt

| # | Vấn đề | Bối cảnh | Đề xuất |
| :--- | :--- | :--- | :--- |
| **Q1** | Làm P0 trước hay gộp P0+P1? | P0-3/P0-4 cần P1-1 mới đúng hoàn toàn | Gộp P0+P1 nếu triển khai được trong 1 lần; nếu cần chặn lỗ hổng gấp thì làm P0-1/P0-2 trước |
| **Q2** | Màn 5/6 và 9/10 **cùng route, khác query param** | `/risk-and-planning?step=scope` vs `?step=plan`; `/findings-hub` vs `?tab=recommendations` | Không thể chặn ở tầng route → cần guard trong component (P1-5, P1-6) |
| **Q3** | Màn 1 `/` và màn 15 `/regulatory-kb` cho **tất cả** vai trò | Kể cả Auditee và BKS | Xác nhận đây là chủ ý, không phải lỗi tài liệu |
| **Q4** | Màn 16 chỉ cho Admin + LD Khối | Hiện 4 nhóm vào được | Đã chốt trong §5.3; cần xác nhận không có nhu cầu nghiệp vụ khác |
| **Q5** | `trưởng phòng` vs `phó phòng` | Cả hai đang bị gộp, ma trận gọi chung là «Lãnh Đạo Phòng» | Gộp cả hai vào nhóm `tppp` (theo §5.1) |
| **Q6** | Nhóm Trưởng đoàn **chưa có tài khoản production** | Không kiểm thử được — 14 sai lệch là **cận dưới** | Tạo tài khoản test trước khi nghiệm thu P1 |

---

## 10. Definition of Done

- [x] `roleAccess.ts` đã hoàn thiện và sẵn sàng commit (chuẩn 8 nhóm vai trò, test 140/140 pass)
- [x] Nhóm `bks` không chứa `trưởng ban ktnb` trong code & bundle build (`dist/assets/index-*.js`)
- [x] Phân quyền route App.tsx đã tách độc lập, **có** `bks` tường minh và **không** còn gộp với `working-papers`/`general-tasks`
- [x] BKS **không** vào được màn 8 và 12; BKS **vẫn** vào được màn 5, 6, 7, 9, 10, 11, 14, 15
- [x] `/system-admin` chỉ Admin + LD Khối (cae) vào được
- [x] `/auditee-portal` (chặn caats) và `/bsc-kpi` (chặn auditee) có guard chuẩn
- [x] Ba nhóm `tppp`, `caats`, `auditee` tồn tại và có alias chuẩn hóa tiếng Việt/Anh
- [x] Component sub-guards hoàn thiện: Màn 6 cấm KTV (`?step=plan`), Màn 10 cấm CAATs (`?tab=recommendations`)
- [x] Bảo mật thông tin: lọc 7 trường nhạy cảm trong `GET /users` đối với tài khoản không có quyền đặc quyền
- [x] Unit test ma trận (P2-1) `roleAccess.spec.ts` chạy xanh 140/140 tests
- [ ] Deploy lên production server và chạy `npm run test:prod` báo **0 sai lệch** (sau khi deploy bundle mới lên VPS ktnb.io.vn)
- [x] Bảng 16 màn × 8 vai trò trong tài liệu UAT được rà soát và đồng bộ logic toàn diện

---

## 11. Ước lượng tổng

| Giai đoạn | Ước lượng | Ghi chú |
| :--- | :--- | :--- |
| P0 | **S** (~0,5 ngày) | Chủ yếu là commit + deploy + 4 sửa nhỏ (thêm P0-1b) |
| P1 | **M–L** (~2–3 ngày) | Phần lớn công sức ở P1-3 (tách 28 route) và P1-5/P1-6 |
| P2 | **M** (~1–2 ngày) | Test + lọc trường `/users` |

**Rủi ro lịch:** P1-3 chạm 28 route trong một khối JSX lớn — nên tách thành nhiều commit nhỏ, mỗi commit kèm chạy lại `test:prod` để phát hiện hồi quy sớm.
