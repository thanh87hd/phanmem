# HƯỚNG DẪN THIẾT LẬP VÀ VẬN HÀNH LUỒNG CI/CD (GIT ➔ VPS CHINHTA.IO.VN)

Tài liệu này hướng dẫn chi tiết quy trình Tự động hóa Tích hợp Liên tục (CI) và Triển khai Liên tục (CD) cho hệ thống **LPBank Smart Audit 4.0**, kết nối giữa kho mã nguồn **Git (GitHub / GitLab)** và máy chủ ứng dụng **VPS Ubuntu `chinhta.io.vn`**.

---

## 1. SƠ ĐỒ KIẾN TRÚC LUỒNG CI/CD (ARCHITECTURE WORKFLOW)

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Lập trình viên (Developer)
    participant Git as GitHub / GitLab Repo
    participant Runner as CI/CD Runner (GitHub Actions)
    participant VPS as VPS chinhta.io.vn (/var/www/phanmem)
    participant Nginx as Nginx & PM2 Cluster

    Dev->>Git: git push origin main (hoặc Merge PR)
    Git->>Runner: Kích hoạt Trigger Workflow (deploy-vps.yml)
    
    rect rgb(235, 248, 255)
    Note over Runner: PHASE 1: TÍCH HỢP LIÊN TỤC (CI)
    Runner->>Runner: 1. Checkout mã nguồn & Cài Node.js 20 LTS
    Runner->>Runner: 2. npm ci (Backend & Frontend)
    Runner->>Runner: 3. TypeScript Typecheck (tsc --noEmit)
    Runner->>Runner: 4. Chạy Master Verification Tests (Routes, Hubs, Menus, KPI)
    Runner->>Runner: 5. Build NestJS Backend & Vite React 19 Frontend
    Runner->>Runner: 6. Đóng gói Artifacts (.tar.gz)
    end

    rect rgb(240, 255, 240)
    Note over Runner,VPS: PHASE 2: TRIỂN KHAI LIÊN TỤC (CD - ZERO DOWNTIME)
    Runner->>VPS: 7. Kết nối an toàn qua SSH Private Key (Port 22)
    Runner->>VPS: 8. SCP Upload bundle (.tar.gz) vào /tmp
    VPS->>VPS: 9. Sao lưu phiên bản hiện tại vào /var/www/phanmem_backups
    VPS->>VPS: 10. Giải nén Backend & Frontend dist vào /var/www/phanmem
    VPS->>VPS: 11. Chạy TypeORM Database Migrations (nếu có)
    VPS->>Nginx: 12. PM2 Reload cluster (nestjs-backend, ktnb-collab)
    VPS->>Nginx: 13. Nginx reload (systemctl reload nginx)
    end

    rect rgb(255, 250, 235)
    Note over Runner,VPS: PHASE 3: KIỂM TRA SỨC KHỎE (SMOKE TEST)
    Runner->>VPS: 14. Curl Health Check https://chinhta.io.vn/
    VPS-->>Runner: Trả về HTTP 200 OK
    Runner-->>Dev: Thông báo Deploy Thành công 🎉
    end
```

---

## 2. QUY TRÌNH PHÂN NHÁNH GIT (GIT FLOW & BRANCHING)

1. **Nhánh `feature/*` / `bugfix/*`**: Lập trình viên phát triển tính năng mới từ nhánh `develop`.
2. **Nhánh `develop`**: Môi trường tích hợp kiểm thử nội bộ (Dev Staging).
3. **Nhánh `main`**: Nhánh Production chuẩn. 
   - **Mọi commit được push hoặc Pull Request được merge vào `main` sẽ TỰ ĐỘNG trigger pipeline build, test và deploy thẳng lên VPS `chinhta.io.vn`**.
4. **Trigger khẩn cấp (Manual Dispatch)**: Cho phép kích hoạt deploy bằng tay trực tiếp trên giao diện GitHub Actions (tab *Actions* ➔ chọn *LPBank Smart Audit 4.0 - CI/CD Pipeline* ➔ ấn *Run workflow*).

---

## 3. CÁC BƯỚC THIẾT LẬP KẾT NỐI AN TOÀN (SETUP SSH ACCESS)

Để GitHub Actions có thể deploy an toàn lên VPS `chinhta.io.vn` mà không cần nhập mật khẩu root, ta sử dụng cơ chế **SSH Key Authentication**.

### Bước 1: Tạo cặp SSH Key riêng cho CI/CD trên máy trạm hoặc VPS

Mở Terminal (hoặc PowerShell) và chạy lệnh:
```bash
ssh-keygen -t ed25519 -C "github-actions-deploy@chinhta.io.vn" -f ./id_ed25519_deploy -N ""
```
Lệnh trên tạo ra 2 file:
- `id_ed25519_deploy`: **Khóa bí mật (Private Key)** ➔ Dùng để đưa vào GitHub Secrets.
- `id_ed25519_deploy.pub`: **Khóa công khai (Public Key)** ➔ Cần đưa lên VPS.

### Bước 2: Thêm Khóa công khai vào VPS `chinhta.io.vn`

Đăng nhập vào VPS:
```bash
ssh root@chinhta.io.vn
```
Thêm nội dung của file `id_ed25519_deploy.pub` vào file `authorized_keys`:
```bash
mkdir -p ~/.ssh
echo "PASTE_NOI_DUNG_FILE_id_ed25519_deploy.pub_VAO_DAY" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### Bước 3: Cấu hình GitHub Secrets trên Repository

Truy cập vào GitHub Repo:
➔ **Settings** ➔ **Secrets and variables** ➔ **Actions** ➔ **New repository secret**:

| Tên Secret | Giá trị (Value) | Mô tả |
| :--- | :--- | :--- |
| `VPS_HOST` | `chinhta.io.vn` | Tên miền hoặc IP của VPS |
| `VPS_USER` | `root` | Tài khoản SSH trên VPS |
| `VPS_SSH_KEY` | *(Nội dung toàn bộ file `id_ed25519_deploy` bí mật)* | Bắt đầu bằng `-----BEGIN OPENSSH PRIVATE KEY-----` |
| `VPS_PORT` | `22` | Cổng SSH của VPS (mặc định 22) |

---

## 4. CHI TIẾT FILE WORKFLOW CI/CD GITHUB ACTIONS

File cấu hình đã được tạo tự động tại đường dẫn:
👉 [`.github/workflows/deploy-vps.yml`](file:///f:/Phan%20mem%20KTNB%204.0/.github/workflows/deploy-vps.yml)

### Các cơ chế an toàn tích hợp trong Workflow:
1. **Concurrency Control (`concurrency: group: production-deploy`)**: Ngăn chặn 2 commit deploy đè lên nhau cùng một thời điểm.
2. **Quality Gate Tests**: Chạy toàn bộ test suites (`verify-all-routed-and-menu.cjs`, `verify-tasks-kpi-bks.cjs`) trước khi build. Nếu test lỗi, pipeline **ngắt ngay lập tức**, không bao giờ đẩy mã lỗi lên VPS.
3. **Atomic Deployment & Auto Backup**:
   - Trước khi ghi đè bản mới, hệ thống tự động backup thư mục `backend/dist` và `frontend/dist` vào `/var/www/phanmem_backups/YYYYMMDD_HHMMSS`.
4. **Zero-Downtime Reload**:
   - Dùng `pm2 reload` thay vì `pm2 restart` giúp các kết nối HTTP/WebSocket hiện tại không bị gián đoạn.
   - Nginx reload nhẹ nhàng (`systemctl reload nginx`) không ngắt traffic người dùng.
5. **Post-Deployment Health Check**:
   - Sau khi reload, runner tự động curl kiểm tra mã HTTP status (200 OK) của trang web.
6. **Migration nghiêm ngặt + Smoke Test chống hồi quy** (bổ sung 04/10/2026):
   - Trước đây bước chạy migration là `npm run migration:run || echo "Migration warning"`.
     Cách này **nuốt lỗi**: migration thất bại vẫn được coi là thành công nên
     production âm thầm chạy code mới trên schema cũ. Hệ quả thực tế: cột
     `audit_engagements."teamMembers"` mãi không được chuyển sang `jsonb`, khiến
     `GET /api/audit-findings` trả **HTTP 500** cho mọi kiểm toán viên.
     Nay migration lỗi ⇒ deploy **dừng ngay**, kèm in `migration:show` trước/sau.
   - Thêm **smoke test** sau khi reload PM2: gọi thật `GET /api/audit-findings`
     và **fail cứng** nếu trả về lỗi 5xx. Lý do cần bước này: toàn bộ 1241 unit
     test đều mock repository nên **không test nào chạm PostgreSQL thật** — đúng
     loại lỗi `operator does not exist: text @> jsonb` đã lọt ra production.

### Quy trình BẮT BUỘC trước khi deploy bản có migration

Chạy script kiểm tra **chỉ đọc** (không sửa dữ liệu) ngay trên VPS:

```bash
cd /var/www/phanmem/backend
node scripts/pre-deploy-check.cjs
```

Script thực hiện 3 việc và **thoát mã 1** nếu phát hiện vấn đề chặn deploy:

1. **Pre-flight cột `audit_engagements."teamMembers"`** — liệt kê các giá trị
   KHÔNG phải JSON hợp lệ. Nếu có, `ALTER ... USING ::jsonb` sẽ thất bại và làm
   hỏng cả deploy (do CI nay fail cứng).
2. **Dry-run chuẩn hoá trạng thái kiến nghị** — in bảng
   `(id, trạng thái cũ, closureStatus, tiến độ, hạn, → trạng thái mới)` để rà soát
   thủ công TRƯỚC khi migration `NormalizeRecommendationStatus` ghi đè dữ liệu thật.
3. **Tổng quan dữ liệu** (số đoàn/phát hiện/kiến nghị/WP/đợt thanh tra) để đối
   chiếu trước–sau, kèm cảnh báo nếu còn giá trị `authority` không thuộc danh mục mã.

Quy trình đề xuất: **backup DB → chạy pre-deploy-check → deploy → xác minh lại**.

```bash
# 1. Backup DB trước khi deploy
pg_dump -U ktnb_user -h 127.0.0.1 -d ktnb_db -F c -b -v \
  -f "/var/backups/ktnb/db_$(date +%Y%m%d_%H%M%S).dump"

# 2. Kiểm tra trước deploy (read-only)
cd /var/www/phanmem/backend && node scripts/pre-deploy-check.cjs

# 3. Sau khi deploy: xác minh endpoint từng lỗi 500 đã trả 200
curl -s -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:3000/api/audit-findings?limit=1'
```

---

## 5. KỊCH BẢN CHO GITLAB CI/CD (DÀNH CHO NGÂN HÀNG DÙNG GITLAB NỘI BỘ)

Nếu Khối CNTT Ngân hàng sử dụng máy chủ GitLab on-premise, file cấu hình hoàn chỉnh đã được đặt tại [`.gitlab-ci.yml`](file:///f:/Phan%20mem%20KTNB%204.0/.gitlab-ci.yml) ở thư mục gốc của repository với đầy đủ 5 stage đạt chuẩn ngân hàng:
1. `lint-and-check`: Kiểm tra TypeScript typecheck & ESLint backend/frontend.
2. `build`: Build backend dist & Vite frontend static bundle, xuất release artifacts.
3. `test`: Chạy toàn bộ 6 bộ Architectural Integrity verifiers (Phases A-F, ADR-0012, 70/70 routing, RBIA hub, Fieldwork refactor, Tasks-KPI) cùng Jest & Vitest.
4. `deploy`: SSH atomic zero-downtime deployment lên VPS `chinhta.io.vn`, tự động rolling backup vào `/var/www/phanmem_backups/`, chạy TypeORM DB migration, reload PM2 cluster & Nginx.
5. `post-verify`: Tự động kích hoạt bộ kiểm thử API hồi quy 16 phân hệ nghiệp vụ (`node scripts/test-api-comprehensive.cjs --target=vps`) ngay trên môi trường live để đảm bảo 0 lỗi 500.

---

## 6. HƯỚNG DẪN ROLLBACK NHANH KHI GẶP SỰ CỐ (EMERGENCY ROLLBACK)

Trong trường hợp bản phát hành mới gặp lỗi logic nghiệp vụ nghiêm trọng trên môi trường Production:

### Cách 1: Revert Commit qua Git (Khuyên dùng)
```bash
# Revert commit vừa deploy trên máy trạm
git revert HEAD --no-edit
git push origin main
```
Pipeline CI/CD sẽ tự động chạy lại với mã nguồn ổn định trước đó.

### Cách 2: Khôi phục tức thì trực tiếp trên VPS (Dưới 10 giây)
Đăng nhập SSH vào VPS:
```bash
ssh root@chinhta.io.vn

# Xem danh sách các bản backup gần nhất
ls -lt /var/www/phanmem_backups/

# Khôi phục từ bản backup mới nhất (Ví dụ: 20260923_150000)
cp -r /var/www/phanmem_backups/20260923_150000/backend_dist/* /var/www/phanmem/backend/dist/
cp -r /var/www/phanmem_backups/20260923_150000/frontend_dist/* /var/www/phanmem/frontend/dist/
chown -R www-data:www-data /var/www/phanmem

# Reload lại dịch vụ
pm2 reload all
systemctl reload nginx
```
Hệ thống sẽ trở về trạng thái ổn định ngay lập tức mà không cần chờ build lại.
