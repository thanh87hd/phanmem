#!/usr/bin/env bash
# ==============================================================================
# LPBank Smart Audit 4.0 - Docker Production Deployment Script
# Dành cho triển khai dạng Docker Container trên Ubuntu Server
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
echo -e "${BLUE}   LPBank Smart Audit 4.0 - Docker Deployment Pipeline          ${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Kiểm tra Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}[LỖI] Docker chưa được cài đặt. Vui lòng chạy apt install docker.io docker-compose-plugin${NC}"
    exit 1
fi

# 2. Kiểm tra tệp .env
if [ ! -f "$APP_DIR/deploy/.env.production" ] && [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}[CẢNH BÁO] Chưa tìm thấy tệp .env. Đang tạo từ .env.production.example...${NC}"
    cp "$APP_DIR/deploy/.env.production.example" "$APP_DIR/deploy/.env.production"
    echo -e "${YELLOW}Vui lòng chỉnh sửa JWT_SECRET và DB_PASSWORD trong deploy/.env.production trước khi tiếp tục!${NC}"
fi

ENV_FILE="$APP_DIR/deploy/.env.production"
if [ ! -f "$ENV_FILE" ]; then
    ENV_FILE="$APP_DIR/.env"
fi

cd "$SCRIPT_DIR"

echo -e "\n${YELLOW}[1/3] Đang build Docker Images...${NC}"
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml build

echo -e "\n${YELLOW}[2/3] Khởi động các container...${NC}"
docker compose --env-file "$ENV_FILE" -f docker-compose.prod.yml up -d

echo -e "\n${YELLOW}[3/3] Trạng thái các container đang chạy:${NC}"
docker compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}================================================================${NC}"
echo -e "${GREEN}   TRIỂN KHAI DOCKER THÀNH CÔNG!                                ${NC}"
echo -e "${GREEN}   Web App: http://<IP-SERVER>                                  ${NC}"
echo -e "${GREEN}================================================================${NC}"
