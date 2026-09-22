#!/usr/bin/env bash
# ==============================================================================
# LPBank Smart Audit 4.0 - Quick Update Script for Ubuntu Server
# Tự động cập nhật code mới, migrate database, build frontend & reload PM2
# ==============================================================================

set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}   LPBank Smart Audit 4.0 - Zero-Downtime Update Pipeline       ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo -e "Thư mục ứng dụng: ${APP_DIR}"

cd "$APP_DIR"

# 1. Cập nhật mã nguồn (nếu dùng Git)
if [ -d ".git" ]; then
    echo -e "\n${YELLOW}[1/5] Kéo mã nguồn mới nhất từ Git...${NC}"
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    git fetch --all
    git pull origin "$CURRENT_BRANCH"
else
    echo -e "\n${YELLOW}[1/5] Thư mục không quản lý bằng Git trực tiếp, tiếp tục với file hiện có...${NC}"
fi

# 2. Cài đặt dependency mới (nếu có thay đổi package.json)
echo -e "\n${YELLOW}[2/5] Kiểm tra và cài đặt Dependencies...${NC}"
npm install --prefix backend --omit=dev
npm install --prefix frontend

# 3. Đồng bộ Database Migrations
echo -e "\n${YELLOW}[3/5] Thực thi Database Migrations an toàn...${NC}"
if [ -f "scripts/sync-all-migrations.js" ]; then
    node scripts/sync-all-migrations.js
fi

# 4. Build Frontend & Backend
echo -e "\n${YELLOW}[4/5] Biên dịch Frontend & Backend...${NC}"
npm run build --prefix backend
npm run build --prefix frontend

# 5. Reload PM2 (Zero-downtime cluster reload)
echo -e "\n${YELLOW}[5/5] Reload PM2 Cluster (Zero-Downtime)...${NC}"
if pm2 describe ktnb-backend > /dev/null 2>&1; then
    pm2 reload ktnb-backend
else
    pm2 start "$SCRIPT_DIR/ecosystem.config.js"
fi
pm2 save

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}   CẬP NHẬT HỆ THỐNG THÀNH CÔNG!                                ${NC}"
echo -e "${GREEN}   Hệ thống đang hoạt động với phiên bản mới nhất.              ${NC}"
echo -e "${GREEN}================================================================${NC}"
