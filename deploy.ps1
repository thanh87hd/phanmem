Write-Host "Bắt đầu tiến trình Deploy Hệ thống Quản lý KTNB..." -ForegroundColor Green

# 1. Cài đặt các thư viện toàn cục cần thiết
Write-Host "Cài đặt PM2 và Serve..." -ForegroundColor Cyan
npm install -g pm2 serve

# 2. Build Backend
Write-Host "Biên dịch Backend (NestJS)..." -ForegroundColor Cyan
cd backend
npm install
npm run build
cd ..

# 3. Build Frontend
Write-Host "Biên dịch Frontend (React)..." -ForegroundColor Cyan
cd frontend
npm install
npm run build
cd ..

# 4. Khởi chạy Backend bằng PM2
Write-Host "Khởi động Backend API trên cổng 3001..." -ForegroundColor Cyan
cd backend
pm2 start dist/main.js --name "ktnb-backend"
cd ..

# 5. Khởi chạy Frontend bằng Serve & PM2
Write-Host "Khởi động Frontend Client trên cổng 8080..." -ForegroundColor Cyan
cd frontend
pm2 start "npx serve -s dist -l 8080" --name "ktnb-frontend"
cd ..

Write-Host "=========================================" -ForegroundColor Green
Write-Host "DEPLOY THÀNH CÔNG!" -ForegroundColor Green
Write-Host "Backend API: http://localhost:3000" -ForegroundColor White
Write-Host "Frontend:    http://localhost:8080" -ForegroundColor White
Write-Host "Sử dụng 'pm2 list' để xem trạng thái dịch vụ." -ForegroundColor White
Write-Host "=========================================" -ForegroundColor Green
