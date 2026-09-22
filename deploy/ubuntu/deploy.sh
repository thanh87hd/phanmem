#!/usr/bin/env bash
# ==============================================================================
# LPBANK SMART AUDIT 4.0 - AUTOMATED BUILD & DEPLOY SCRIPT
# Sử dụng: cd /var/www/phanmem && bash deploy/ubuntu/deploy.sh
# ==============================================================================

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "    BẮT ĐẦU TRIỂN KHAI LPBANK SMART AUDIT 4.0 LÊN UBUNTU SERVER       "
echo "======================================================================"
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo -e "Thư mục triển khai: ${CYAN}${APP_DIR}${NC}"
cd "${APP_DIR}"

# 1. Kiểm tra file cấu hình môi trường .env
echo -e "\n${YELLOW}[1/7] Kiểm tra file cấu hình môi trường backend/.env...${NC}"
if [ ! -f "backend/.env" ]; then
    if [ -f "deploy/.env.production.example" ]; then
        echo -e "${YELLOW}Chưa có backend/.env. Đang sao chép từ deploy/.env.production.example...${NC}"
        cp "deploy/.env.production.example" "backend/.env"
        echo -e "${RED}[LƯU Ý QUAN TRỌNG] Vui lòng mở file backend/.env và cấu hình DB_PASSWORD & JWT_SECRET trước khi tiếp tục!${NC}"
        echo "Lệnh chỉnh sửa: nano backend/.env"
        exit 1
    else
        echo -e "${RED}[LỖI] Không tìm thấy backend/.env hoặc deploy/.env.production.example!${NC}"
        exit 1
    fi
fi

# 2. Cài đặt thư viện và build Backend
echo -e "\n${YELLOW}[2/7] Cài đặt dependencies và biên dịch Backend NestJS...${NC}"
cd "${APP_DIR}/backend"
npm install --legacy-peer-deps
npm run build
echo -e "${GREEN}>>> Biên dịch Backend thành công (thư mục backend/dist).${NC}"

# 3. Đồng bộ cơ sở dữ liệu (Database Migrations)
echo -e "\n${YELLOW}[3/7] Đồng bộ Schema và Migrations vào PostgreSQL...${NC}"
cd "${APP_DIR}"
if [ -f "scripts/sync-all-migrations.js" ]; then
    node scripts/sync-all-migrations.js
    echo -e "${GREEN}>>> Đồng bộ cấu trúc Database PostgreSQL thành công.${NC}"
else
    echo -e "${YELLOW}Bỏ qua migration (không tìm thấy scripts/sync-all-migrations.js).${NC}"
fi

# 4. Cài đặt thư viện và build Frontend React
echo -e "\n${YELLOW}[4/7] Cài đặt dependencies và biên dịch Frontend React (Vite)...${NC}"
cd "${APP_DIR}/frontend"
npm install --legacy-peer-deps
npm run build
echo -e "${GREEN}>>> Biên dịch Frontend thành công (thư mục frontend/dist).${NC}"

# 5. Cấu hình & Khởi chạy Backend với PM2
echo -e "\n${YELLOW}[5/7] Khởi chạy / Tái khởi động Backend qua PM2...${NC}"
cd "${APP_DIR}"
mkdir -p /var/log/pm2

if pm2 describe ktnb-backend > /dev/null 2>&1; then
    echo "Ứng dụng đang chạy trong PM2. Tiến hành reload zero-downtime..."
    pm2 reload deploy/ubuntu/ecosystem.config.js --update-env
else
    echo "Khởi chạy ứng dụng mới trong PM2..."
    pm2 start deploy/ubuntu/ecosystem.config.js
fi
pm2 save

# 6. Cấu hình Nginx Virtual Host
echo -e "\n${YELLOW}[6/7] Cấu hình Nginx Web Server...${NC}"
if [ -f "deploy/ubuntu/nginx-lpbank.conf" ]; then
    NGINX_TARGET="/etc/nginx/sites-available/lpbank-audit.conf"
    NGINX_LINK="/etc/nginx/sites-enabled/lpbank-audit.conf"

    if [ -w "/etc/nginx/sites-available" ]; then
        cp deploy/ubuntu/nginx-lpbank.conf "${NGINX_TARGET}"
        ln -sf "${NGINX_TARGET}" "${NGINX_LINK}"
        # Xóa default site nếu cần
        rm -f /etc/nginx/sites-enabled/default
        nginx -t && systemctl reload nginx
        echo -e "${GREEN}>>> Nginx đã được nạp cấu hình mới thành công.${NC}"
    else
        echo -e "${YELLOW}[LƯU Ý] Cần quyền sudo để cập nhật Nginx. Vui lòng chạy:${NC}"
        echo -e "  sudo cp ${APP_DIR}/deploy/ubuntu/nginx-lpbank.conf ${NGINX_TARGET}"
        echo -e "  sudo ln -sf ${NGINX_TARGET} ${NGINX_LINK}"
        echo -e "  sudo nginx -t && sudo systemctl reload nginx"
    fi
fi

# 7. Kiểm tra trạng thái dịch vụ (Health Check)
echo -e "\n${YELLOW}[7/7] Thực hiện Health Check dịch vụ...${NC}"
sleep 3
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health || echo "000")

if [ "$HEALTH_STATUS" -eq 200 ]; then
    echo -e "${GREEN}>>> API Backend Health Check: HTTP 200 OK (HOẠT ĐỘNG HOÀN HẢO)${NC}"
else
    echo -e "${YELLOW}>>> API Backend trả về mã: HTTP ${HEALTH_STATUS} (Vui lòng kiểm tra log: pm2 logs ktnb-backend)${NC}"
fi

echo -e "\n${GREEN}${BOLD}======================================================================"
echo "    TRIỂN KHAI HỆ THỐNG LPBANK SMART AUDIT 4.0 HOÀN TẤT!              "
echo "======================================================================${NC}"
echo -e "Quản lý dịch vụ:"
echo -e "  - Kiểm tra trạng thái PM2:  ${CYAN}pm2 status${NC}"
echo -e "  - Xem log thời gian thực:   ${CYAN}pm2 logs ktnb-backend${NC}"
echo -e "  - Xem trạng thái Nginx:     ${CYAN}systemctl status nginx${NC}"
echo -e "  - Cài đặt chứng chỉ SSL:    ${CYAN}sudo certbot --nginx -d chinhta.io.vn${NC}"
echo "======================================================================"
