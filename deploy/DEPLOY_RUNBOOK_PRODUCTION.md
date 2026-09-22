# Sổ Tay Hướng Dẫn Triển Khai Vận Hành Production (LPBank Smart Audit 4.0)

Tài liệu này cung cấp hướng dẫn triển khai chuẩn hóa dành cho Kỹ sư Vận hành (Deployment Engineer / DevOps / SysAdmin) khi đưa hệ thống **LPBank Smart Audit 4.0** lên môi trường Production hoặc Staging.

---

## 1. Tổng Quan Kiến Trúc Triển Khai (Deployment Architecture)

```
                    Internet / Mạng Nội Bộ Ngân Hàng
                                  │
                          [Port 80 / 443]
                                  ▼
                   ┌──────────────────────────────┐
                   │  NGINX Reverse Proxy & SSL   │
                   │    (TLS 1.2/1.3, Hardening)  │
                   └──────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         │ (Static SPA)           │ (/api/*)               │ (/realms/*)
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐     ┌──────────────────┐
│  Frontend React  │    │  NestJS Backend  │     │   Keycloak IAM   │
│  (Nginx Hosting) │    │  (Port 3001)     │     │   (Port 8080)    │
│  Port 80 / dist  │    │  PM2 / Docker    │     │   OIDC SSO       │
└──────────────────┘    └─────────┬────────┘     └────────┬─────────┘
                                  │                       │
                       ┌──────────┴──────────┐            │
                       ▼                     ▼            │
              ┌─────────────────┐   ┌─────────────────┐   │
              │  PostgreSQL 16  │   │     Redis 7     │   │
              │  (Port 5432)    │   │   (BullMQ Jobs) │   │
              │  CSDL Kiểm toán │   │    Port 6379    │   │
              └─────────────────┘   └─────────────────┘   │
                       ▲                                  │
                       └──────────────────────────────────┘
```

---

## 2. Kịch Bản A: Triển Khai Bằng Docker Compose (Khuyên dùng)

### Bước 1: Chuẩn bị Thư mục & Biến Môi trường
```bash
git clone https://github.com/your-repo/phan-mem.git /opt/lpbank-audit
cd /opt/lpbank-audit/deploy/docker

# Sao chép file cấu hình môi trường mẫu
cp ../.env.production.example .env
nano .env
```

**Các thông số quan trọng cần cập nhật trong `.env`:**
```env
# Cơ sở dữ liệu
DB_USERNAME=ktnb_admin
DB_PASSWORD=SecureDbPassword@2026!
DB_DATABASE=ktnb_db

# Bảo mật JWT
JWT_SECRET=LPBANK_SUPER_SECURE_JWT_SECRET_2026_@#$%^&*()_+
JWT_EXPIRES_IN=8h
CORS_ORIGINS=https://audit.lpbank.com.vn

# Keycloak SSO OIDC
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=KeycloakAdmin@2026!
KEYCLOAK_BASE_URL=https://audit.lpbank.com.vn
KEYCLOAK_REALM=lpbank-audit
KEYCLOAK_CLIENT_ID=lpbank-audit-client
KEYCLOAK_CLIENT_SECRET=lpbank-audit-secret-2026
KEYCLOAK_REDIRECT_URI=https://audit.lpbank.com.vn/api/auth/sso/keycloak/callback
```

### Bước 2: Khởi chạy Toàn bộ Hệ thống bằng 1 Lệnh
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Bước 3: Kiểm tra Trạng thái Các Container
```bash
docker compose -f docker-compose.prod.yml ps
```
*Kết quả kỳ vọng:*
- `lpbank_audit_db`: `healthy` (Port 5432)
- `lpbank_audit_redis`: `healthy` (Port 6379)
- `lpbank_audit_keycloak`: `healthy` (Port 8080)
- `lpbank_audit_backend`: `running` (Port 3001)
- `lpbank_audit_frontend`: `running` (Port 80)

---

## 3. Kịch Bản B: Triển Khai Trực Tiếp trên Ubuntu VPS (Bare Metal / VM)

### Bước 1: Chạy Script Cài đặt Hạ tầng Tự động
```bash
cd /opt/lpbank-audit/deploy/ubuntu
chmod +x *.sh
sudo ./setup-server.sh
```
*Script sẽ tự động cài đặt:* Node.js 20 LTS, PostgreSQL 16, Redis, Nginx, Certbot, PM2.

### Bước 2: Cấu hình Nginx & Chứng chỉ SSL
```bash
# Copy cấu hình Nginx
sudo cp nginx-lpbank.conf /etc/nginx/sites-available/lpbank-audit.conf
sudo ln -sf /etc/nginx/sites-available/lpbank-audit.conf /etc/nginx/sites-enabled/

# Kiểm tra cú pháp và tải lại Nginx
sudo nginx -t
sudo systemctl reload nginx

# Cấp phát SSL tự động qua Let's Encrypt (nếu có domain trỏ về IP máy chủ)
sudo certbot --nginx -d audit.lpbank.com.vn
```

### Bước 3: Khởi chạy Backend bằng PM2 Cluster
```bash
cd /opt/lpbank-audit/backend
npm ci --production --legacy-peer-deps
npm run build

# Khởi chạy qua ecosystem file đã tối ưu
pm2 start /opt/lpbank-audit/deploy/ubuntu/ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Bước 4: Biên dịch Frontend & Đặt vào Web Root
```bash
cd /opt/lpbank-audit/frontend
npm ci --legacy-peer-deps
npm run build
sudo mkdir -p /var/www/phanmem/frontend
sudo cp -r dist /var/www/phanmem/frontend/
sudo chown -R www-data:www-data /var/www/phanmem/frontend
```

---

## 4. Quy Trình Cập Nhật Phiên Bản Mới Không Gián Đoạn (Zero-Downtime Update)

### Với Docker Compose:
```bash
cd /opt/lpbank-audit/deploy/docker
git pull origin main
docker compose -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.prod.yml up -d --no-deps backend frontend
```

### Với Ubuntu PM2:
```bash
cd /opt/lpbank-audit/deploy/ubuntu
sudo ./update.sh
```
*Script `update.sh` sẽ tự động kéo code mới, build frontend, build backend và thực hiện `pm2 reload lpbank-backend` (zero-downtime cluster reload).*

---

## 5. Chính Sách Sao Lưu & Khôi Phục Thảm Họa (Disaster Recovery)

### Tự động Sao lưu CSDL hàng ngày (Backup Cron)
Script `deploy/ubuntu/backup-cron.sh` được kích hoạt lúc 02:00 sáng hàng ngày:
```bash
# Thiết lập crontab:
0 2 * * * /opt/lpbank-audit/deploy/ubuntu/backup-cron.sh >> /var/log/lpbank-backup.log 2>&1
```
- Bản sao lưu được nén `tar.gz` và lưu trữ tại `/var/backups/lpbank-audit`.
- Tự động xóa bản sao lưu cũ hơn 30 ngày để tiết kiệm dung lượng đĩa.

### Khôi phục CSDL khi xảy ra sự cố:
```bash
# Khôi phục bản backup gần nhất
gunzip -c /var/backups/lpbank-audit/ktnb_db_latest.sql.gz | psql -U ktnb_admin -d ktnb_db
```

---

## 6. Giám Sát Sức Khỏe & Cảnh Báo (Healthchecks & Observability)

| Endpoint | Giao thức | Ý nghĩa | Tiêu chuẩn Đạt |
| :--- | :--- | :--- | :--- |
| `/api/health` | HTTP GET | Kiểm tra tình trạng Backend & kết nối Database | HTTP `200 OK` |
| `/api/monitor/server` | HTTP GET | RAM, CPU, Uptime của máy chủ ứng dụng | HTTP `200 OK` |
| `/realms/lpbank-audit/.well-known/openid-configuration` | HTTP GET | Trạng thái sẵn sàng của Keycloak OIDC Realm | HTTP `200 OK` |
| `localhost:6379` | REDIS PING | Trạng thái hàng đợi BullMQ | `PONG` |
