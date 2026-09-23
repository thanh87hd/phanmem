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

---

## 5. KỊCH BẢN CHO GITLAB CI/CD (DÀNH CHO NGÂN HÀNG DÙNG GITLAB NỘI BỘ)

Nếu Khối CNTT Ngân hàng sử dụng máy chủ GitLab on-premise, tạo file `.gitlab-ci.yml` tại thư mục gốc của repository với nội dung sau:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"
  APP_DIR: "/var/www/phanmem"

# 1. CI: Test & TypeCheck
lint_and_test:
  stage: test
  image: node:20-alpine
  script:
    - cd backend && npm ci && npx tsc --noEmit
    - cd ../frontend && npm ci && npx tsc -b --noEmit
    - cd .. && node scripts/verify-all-routed-and-menu.cjs

# 2. CI: Build Bundle
build_artifacts:
  stage: build
  image: node:20-alpine
  script:
    - cd backend && npm run build
    - cd ../frontend && npm run build
  artifacts:
    paths:
      - backend/dist/
      - frontend/dist/
    expire_in: 1 day

# 3. CD: Deploy lên VPS chinhta.io.vn
deploy_production:
  stage: deploy
  image: alpine:latest
  only:
    - main
  before_script:
    - apk add --no-cache openssh-client rsync tar curl
    - eval $(ssh-agent -s)
    - echo "$VPS_SSH_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - ssh-keyscan -H $VPS_HOST >> ~/.ssh/known_hosts
  script:
    - ssh $VPS_USER@$VPS_HOST "mkdir -p /var/www/phanmem_backups/$(date +%Y%m%d_%H%M%S)"
    - rsync -avz --delete backend/dist/ $VPS_USER@$VPS_HOST:$APP_DIR/backend/dist/
    - rsync -avz --delete frontend/dist/ $VPS_USER@$VPS_HOST:$APP_DIR/frontend/dist/
    - ssh $VPS_USER@$VPS_HOST "chown -R www-data:www-data $APP_DIR && pm2 reload all && nginx -t && systemctl reload nginx"
    - sleep 5
    - curl -fI https://$VPS_HOST/ || exit 1
```

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
