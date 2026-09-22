# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG LPBANK SMART AUDIT 4.0 LÊN MÁY CHỦ UBUNTU SERVER

Tài liệu này cung cấp hướng dẫn toàn diện từ A-Z để đóng gói, chuyển giao và triển khai phần mềm **LPBank Smart Audit 4.0** lên máy chủ Linux Ubuntu (phiên bản 20.04 / 22.04 / 24.04 LTS).

---

## MỤC LỤC
1. [Tổng Quan Kiến Trúc Hệ Thống](#1-tổng-quan-kiến-trúc-hệ-thống)
2. [Yêu Cầu Phần Cứng & Môi Trường](#2-yêu-cầu-phần-cứng--môi-trường)
3. [Phương Án 1 (Khuyên Dùng): Cài Đặt Trực Tiếp (PM2 + Nginx + PostgreSQL)](#3-phương-án-1-khuyên-dùng-triển-khai-native-pm2--nginx--postgresql)
4. [Phương Án 2: Triển Khai Dạng Docker Container](#4-phương-án-2-triển-khai-dạng-docker-container)
5. [Cấu Hình Tên Miền & Chứng Chỉ SSL HTTPS](#5-cấu-hình-tên-miền--chứng-chỉ-ssl-https)
6. [Quy Trình Vận Hành, Giám Sát & Cập Nhật Hệ Thống](#6-quy-trình-vận-hành-giám-sát--cập-nhật-hệ-thống)
7. [Sao Lưu Dữ Liệu Tự Động & Khôi Phục (Backup & Restore)](#7-sao-lưu-dữ-liệu-tự-động--khôi-phục-backup--restore)
8. [Xử Lý Sự Cố Thường Gặp (Troubleshooting)](#8-xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. TỔNG QUAN KIẾN TRÚC HỆ THỐNG

```
[ Người Dùng Cuối / Kiểm Toán Viên ]
               │
               ▼ (Port 80 / 443 HTTPS)
   ┌────────────────────────────────────────────────┐
   │             Nginx Reverse Proxy                │
   │  - Phục vụ Single Page Application (React/Vite)│
   │  - Gzip / Security Headers / SSL Termination   │
   │  - Định tuyến /api/ vào Backend Cluster        │
   └───────────────────────┬────────────────────────┘
                           │ (Port 3001)
                           ▼
   ┌────────────────────────────────────────────────┐
   │       NestJS Backend API (PM2 Cluster)         │
   │  - 2+ instances tải song song                  │
   │  - Fastify Engine hiệu năng cao                │
   └───────────────┬────────────────┬───────────────┘
                   │                │
                   ▼                ▼
     ┌───────────────────┐    ┌───────────────────┐
     │ PostgreSQL 16 DB  │    │  Redis 7 Cache    │
     │   (Port 5432)     │    │   (Port 6379)     │
     └───────────────────┘    └───────────────────┘
```

---

## 2. YÊU CẦU PHẦN CỨNG & MÔI TRƯỜNG

### Cấu hình máy chủ tối thiểu:
- **CPU:** 4 Cores (khuyến nghị 8 Cores cho tải cao)
- **RAM:** 8 GB (khuyến nghị 16 GB)
- **Ổ cứng:** 80 GB SSD/NVMe (khuyến nghị 160 GB NVMe để lưu trữ tệp kiểm toán & log)
- **Hệ điều hành:** Ubuntu Server 22.04 LTS hoặc 24.04 LTS (x86_64)

### Cổng mạng (Network Ports):
- `80/tcp` (HTTP) - Nginx
- `443/tcp` (HTTPS) - Nginx SSL
- `22/tcp` (SSH) - Quản trị máy chủ

*Lưu ý: Các cổng 3001 (Backend API), 5432 (Postgres), 6379 (Redis) chỉ mở cục bộ (`127.0.0.1`), không mở ra ngoài Internet.*

---

## 3. PHƯƠNG ÁN 1 (KHUYÊN DÙNG): TRIỂN KHAI NATIVE (PM2 + NGINX + POSTGRESQL)

Phương án này tối ưu hóa 100% tài nguyên CPU và RAM của máy chủ, cho tốc độ xử lý nhanh nhất và dễ dàng quản lý log.

### Bước 3.1: Tải gói triển khai lên máy chủ
Tại máy tính phát triển (hoặc máy đóng gói):
```bash
# Chạy lệnh đóng gói (sinh file lpbank-smart-audit-ubuntu.tar.gz)
npm run package:ubuntu

# Tải file nén lên máy chủ Ubuntu (thay user và IP máy chủ thực tế)
scp lpbank-smart-audit-ubuntu.tar.gz root@<IP_MÁY_CHỦ>:/var/www/
```

### Bước 3.2: Đăng nhập máy chủ và giải nén
```bash
ssh root@<IP_MÁY_CHỦ>

# Chuyển vào thư mục cài đặt
mkdir -p /var/www/lpbank-audit
mv /var/www/lpbank-smart-audit-ubuntu.tar.gz /var/www/lpbank-audit/
cd /var/www/lpbank-audit

# Giải nén
tar -xzf lpbank-smart-audit-ubuntu.tar.gz
rm lpbank-smart-audit-ubuntu.tar.gz

# Cấp quyền thực thi cho toàn bộ shell scripts
chmod +x deploy/ubuntu/*.sh
```

### Bước 3.3: Chạy script cài đặt máy chủ tự động
Script này sẽ tự động cài đặt Node.js 20 LTS, PostgreSQL 16, Redis, Nginx, PM2, cấu hình tường lửa UFW và khởi tạo Database `ktnb_db`:
```bash
sudo ./deploy/ubuntu/setup-server.sh
```
> Khi script chạy xong, bạn sẽ thấy thông báo mật khẩu ngẫu nhiên của Database được tạo trong file `backend/.env`.

### Bước 3.4: Kiểm tra và chỉnh sửa cấu hình môi trường
Mở tệp `backend/.env` để kiểm tra các thông số sản xuất:
```bash
nano backend/.env
```
Các thông số quan trọng cần xác nhận:
```env
PORT=3001
BIND_HOST=127.0.0.1
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USERNAME=ktnb_user
DB_PASSWORD=<MẬT_KHẨU_TỰ_ĐỘNG_TẠO>
DB_DATABASE=ktnb_db
DB_SCHEMA=public

# Bắt buộc: JWT_SECRET phải có độ dài tối thiểu 32 ký tự
JWT_SECRET=LPBank_SmartAudit_SuperSecretKey_Production_2026_Secured
JWT_EXPIRES_IN=8h

# Tên miền hoặc IP truy cập
CORS_ORIGINS=http://localhost,http://<IP_MÁY_CHỦ>,https://audit.lpbank.com.vn
```
Lưu tệp bằng phím `Ctrl + O`, `Enter` rồi thoát `Ctrl + X`.

### Bước 3.5: Chạy script triển khai tự động (1-Click Deploy)
Chạy script `deploy.sh` để tự động cài package, chạy migration database, build frontend & backend, cấu hình Nginx và khởi chạy PM2:
```bash
sudo ./deploy/ubuntu/deploy.sh
```
Script sẽ tự kiểm tra Health Check backend và in ra kết quả:
```
✓ Health check PASSED: Backend đang phản hồi OK!
================================================================
   HỆ THỐNG LPBANK SMART AUDIT 4.0 ĐÃ SẴN SÀNG!
   Truy cập Web: http://<IP-SERVER>
================================================================
```

---

## 4. PHƯƠNG ÁN 2: TRIỂN KHAI DẠNG DOCKER CONTAINER

Nếu đơn vị vận hành yêu cầu chuẩn hóa bằng Docker:

### Bước 4.1: Cài đặt Docker & Docker Compose trên Ubuntu
```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

### Bước 4.2: Chuẩn bị tệp cấu hình môi trường
```bash
cd /var/www/lpbank-audit
cp deploy/.env.production.example deploy/.env.production
nano deploy/.env.production
```
Điền mật khẩu DB, JWT_SECRET (>= 32 ký tự).

### Bước 4.3: Khởi động hệ thống
```bash
chmod +x deploy/docker/*.sh
./deploy/docker/docker-deploy.sh
```

---

## 5. CẤU HÌNH TÊN MIỀN & CHỨNG CHỈ SSL HTTPS

Để bảo mật đường truyền ngân hàng, cài đặt chứng chỉ SSL miễn phí tự động gia hạn từ Let's Encrypt:

### Bước 5.1: Cài Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
```

### Bước 5.2: Khởi tạo SSL cho tên miền
Giả sử tên miền là `audit.lpbank.com.vn`:
```bash
# Cập nhật tên miền trong file Nginx
sudo nano /etc/nginx/sites-available/lpbank-audit
# Thay dòng: server_name _; thành: server_name audit.lpbank.com.vn;

# Kiểm tra cú pháp Nginx và reload
sudo nginx -t
sudo systemctl reload nginx

# Đăng ký SSL
sudo certbot --nginx -d audit.lpbank.com.vn
```
Certbot sẽ tự động cấu hình HTTPS, tự chuyển hướng HTTP -> HTTPS và cài cron gia hạn 90 ngày.

---

## 6. QUY TRÌNH VẬN HÀNH, GIÁM SÁT & CẬP NHẬT HỆ THỐNG

### Cập nhật hệ thống không gián đoạn (Zero-Downtime Update):
Khi có phiên bản mới, chỉ cần chạy 1 lệnh:
```bash
cd /var/www/lpbank-audit
sudo ./deploy/ubuntu/update.sh
```
Script sẽ tự động kéo code, build frontend, chạy migration DB nếu có, và reload lại PM2 cluster không rớt kết nối.

### Giám sát trạng thái dịch vụ (Monitoring):
```bash
# Xem trạng thái PM2 và mức chiếm dụng RAM/CPU
pm2 status

# Xem dashboard đồ họa trực tiếp
pm2 monit

# Xem log Backend thời gian thực
pm2 logs ktnb-backend

# Xem log Nginx truy cập & lỗi
tail -f /var/log/nginx/lpbank_audit_access.log
tail -f /var/log/nginx/lpbank_audit_error.log

# Kiểm tra trạng thái cơ sở dữ liệu & redis
systemctl status postgresql
systemctl status redis-server
```

---

## 7. SAO LƯU DỮ LIỆU TỰ ĐỘNG & KHÔI PHỤC (BACKUP & RESTORE)

### Cài đặt sao lưu định kỳ vào 02:00 sáng mỗi ngày:
```bash
sudo crontab -e
```
Thêm dòng sau vào cuối tệp:
```cron
0 2 * * * /var/www/lpbank-audit/deploy/ubuntu/backup-cron.sh >> /var/log/lpbank-backup.log 2>&1
```

Script sẽ tự động:
1. `pg_dump` cơ sở dữ liệu PostgreSQL và nén gzip vào `/var/backups/lpbank-audit/db/`.
2. Nén toàn bộ tệp đính kèm trong thư mục `uploads/`.
3. Tự động dọn dẹp các bản sao lưu cũ hơn 30 ngày để tiết kiệm dung lượng ổ đĩa.

### Quy trình khôi phục cơ sở dữ liệu (Restore):
Khi cần khôi phục lại dữ liệu từ một bản sao lưu cụ thể:
```bash
# Giải nén và phục hồi database
gunzip -c /var/backups/lpbank-audit/db/lpbank_db_20260916_020000.sql.gz | psql -U ktnb_user -d ktnb_db -h 127.0.0.1
```

---

## 8. XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### 1. Nginx báo lỗi `502 Bad Gateway`
- **Nguyên nhân:** Backend API chưa khởi động hoặc gặp sự cố crash do thiếu cấu hình.
- **Cách xử lý:**
  ```bash
  pm2 status
  pm2 logs ktnb-backend --lines 50
  ```
  Kiểm tra xem file `backend/.env` có hợp lệ không và port 3001 có đang listen không (`ss -tulpn | grep 3001`).

### 2. Lỗi `JWT_SECRET is required and must be at least 32 characters long`
- **Nguyên nhân:** Khóa bí mật trong `backend/.env` bị trống hoặc ngắn hơn 32 ký tự.
- **Cách xử lý:** Mở `backend/.env`, chỉnh sửa dòng `JWT_SECRET` với chuỗi dài >= 32 ký tự rồi chạy `pm2 restart ktnb-backend`.

### 3. Lỗi không upload được tệp kiểm toán lớn
- **Nguyên nhân:** Vượt quá giới hạn `client_max_body_size` của Nginx hoặc quyền ghi thư mục.
- **Cách xử lý:**
  - File cấu hình `/etc/nginx/sites-available/lpbank-audit` đã cài sẵn `client_max_body_size 100M;`.
  - Kiểm tra quyền ghi: `sudo chown -R www-data:www-data /var/www/lpbank-audit/backend/uploads`.

### 4. Thay đổi quyền chạy script shell nếu gặp lỗi `\r: command not found`
Nếu bạn tải file qua FTP hoặc zip trên Windows:
```bash
sudo apt install -y dos2unix
dos2unix deploy/ubuntu/*.sh
```
