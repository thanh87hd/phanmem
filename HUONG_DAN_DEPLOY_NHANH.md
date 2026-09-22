# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG LPBANK SMART AUDIT 4.0
Thư mục: F:\Phan mem KTNB 4.0

## 1. Cấu trúc Gói Triển Khai
- **backend/**: Chứa mã nguồn và bản build production (`backend/dist`) của NestJS 11 (Fastify Adapter).
- **frontend/**: Chứa bản build production (`frontend/dist`) đã tối ưu hóa Ant Design 6.6.5 và mã nguồn React 19.
- **deploy/**: Bộ cấu hình Nginx, Docker, Keycloak, Ubuntu VPS và tệp mẫu `.env.production.example`.
- **docs/**: Tài liệu kiến trúc C4, báo cáo kiểm thử và quy trình nghiệp vụ.
- **docker-compose.yml**: Khởi chạy toàn bộ hệ thống (PostgreSQL, Redis, Keycloak, Backend, Frontend).
- **deploy.ps1**: Kịch bản tự động triển khai trên môi trường Windows Server (PM2 + Serve).
- **deploy-vps-pm2.ps1**: Kịch bản triển khai trên Linux/Ubuntu qua PM2.

---

## 2. Phương Án 1: Chạy trực tiếp từ Pre-built Artifacts (Nhanh nhất)
Bản build đã được biên dịch sẵn đầy đủ trong `backend/dist` và `frontend/dist`.

### Bước 2.1: Khởi động Backend
```bash
cd backend
npm install --production
# Tạo file .env từ mẫu .env.example
node dist/main.js
# Hoặc chạy qua PM2:
# pm2 start dist/main.js --name "ktnb-backend"
```
API sẽ lắng nghe tại: `http://localhost:3001`

### Bước 2.2: Phục vụ Frontend
Thư mục `frontend/dist` là bundle tĩnh độc lập, có thể phục vụ bằng Nginx hoặc serve:
```bash
cd frontend
npx serve -s dist -l 8080
# Hoặc chạy qua PM2:
# pm2 start "npx serve -s dist -l 8080" --name "ktnb-frontend"
```
Frontend sẽ hiển thị tại: `http://localhost:8080`

---

## 3. Phương Án 2: Triển khai bằng Docker Compose (Khuyến nghị)
```bash
docker compose up -d
```
Hệ thống sẽ tự động khởi động cơ sở dữ liệu PostgreSQL, hàng đợi Redis và cấu hình dịch vụ.

---

## 4. Kiểm tra Sau Triển Khai
1. Mở trình duyệt truy cập: `http://localhost:8080`
2. Đăng nhập tài khoản kiểm toán viên / quản trị viên.
3. Kiểm tra kết nối API Backend tại: `http://localhost:3001/api/health` hoặc giao diện hệ thống.
