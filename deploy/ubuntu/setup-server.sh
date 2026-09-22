#!/usr/bin/env bash
# ==============================================================================
# LPBANK SMART AUDIT 4.0 - UBUNTU SERVER AUTOMATED SETUP SCRIPT
# Hệ điều hành hỗ trợ: Ubuntu Server 20.04 / 22.04 / 24.04 LTS
# Chạy với quyền root hoặc sudo: sudo bash setup-server.sh
# ==============================================================================

set -eo pipefail

# Màu sắc giao diện console
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "======================================================================"
echo "    LPBANK SMART AUDIT 4.0 - ONE-CLICK UBUNTU SERVER SETUP            "
echo "======================================================================"
echo -e "${NC}"

# 1. Kiểm tra quyền root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[LỖI] Script này phải được chạy với quyền root hoặc sudo!${NC}"
   echo "Vui lòng chạy lại: sudo bash setup-server.sh"
   exit 1
fi

APP_DIR="/var/www/phanmem"
DB_NAME="ktnb_db"
DB_USER="ktnb_user"
# Sinh mật khẩu ngẫu nhiên an toàn nếu chưa được thiết lập trước
DEFAULT_DB_PASS=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9!@#%')
DB_PASS="${1:-$DEFAULT_DB_PASS}"

echo -e "${YELLOW}[1/8] Cập nhật danh mục gói hệ thống Ubuntu (apt update & upgrade)...${NC}"
apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y

echo -e "${YELLOW}[2/8] Cài đặt các gói công cụ cơ bản...${NC}"
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    curl wget git build-essential ufw software-properties-common \
    ca-certificates lsb-release apt-transport-https gnupg tar unzip \
    python3 python3-pip python3-venv

echo -e "${YELLOW}[3/8] Cài đặt Node.js v20.x LTS & PM2...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
npm install -g pm2
pm2 install pm2-logrotate || true
pm2 set pm2-logrotate:max_size 50M
pm2 set pm2-logrotate:retain 14

echo -e "${GREEN}>>> Đã cài đặt Node.js: $(node -v), npm: $(npm -v), PM2: $(pm2 -v)${NC}"

echo -e "${YELLOW}[4/8] Cài đặt và cấu hình PostgreSQL 16...${NC}"
if ! command -v psql &> /dev/null; then
    # Thêm PostgreSQL official repository
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt-get update -y
    apt-get install -y postgresql-16 postgresql-contrib-16
fi

systemctl enable postgresql
systemctl start postgresql

# Tạo CSDL và tài khoản chuyên dụng
sudo -u postgres psql << EOF
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASS}';
   ELSE
      ALTER ROLE ${DB_USER} WITH PASSWORD '${DB_PASS}';
   END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

echo -e "${GREEN}>>> Đã tạo PostgreSQL: User='${DB_USER}', Database='${DB_NAME}'${NC}"

echo -e "${YELLOW}[5/8] Cài đặt và kích hoạt Redis Server...${NC}"
DEBIAN_FRONTEND=noninteractive apt-get install -y redis-server
systemctl enable redis-server
systemctl start redis-server
echo -e "${GREEN}>>> Redis server đang hoạt động trên port 6379.${NC}"

echo -e "${YELLOW}[6/8] Cài đặt Nginx & Certbot SSL...${NC}"
DEBIAN_FRONTEND=noninteractive apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx

echo -e "${YELLOW}[7/8] Thiết lập cấu trúc thư mục ứng dụng & Phân quyền...${NC}"
mkdir -p "${APP_DIR}"
mkdir -p "${APP_DIR}/backend"
mkdir -p "${APP_DIR}/frontend/dist"
mkdir -p "${APP_DIR}/storage/uploads"
mkdir -p /var/log/pm2
mkdir -p /var/backups/ktnb

# Nếu có user không phải root (ví dụ ubuntu, deploy), gán quyền cho user đó
DEPLOY_USER="${SUDO_USER:-$USER}"
if [[ "$DEPLOY_USER" != "root" ]]; then
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" /var/log/pm2
    chown -R "${DEPLOY_USER}:${DEPLOY_USER}" /var/backups/ktnb
fi

echo -e "${YELLOW}[8/8] Cấu hình tường lửa UFW (Bảo vệ an ninh)...${NC}"
ufw status | grep -qw "active" || {
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp comment 'SSH Remote Management'
    ufw allow 80/tcp comment 'HTTP Web'
    ufw allow 443/tcp comment 'HTTPS Web'
    echo "y" | ufw enable
}

echo -e "\n${GREEN}${BOLD}======================================================================"
echo "    CÀI ĐẶT MÔI TRƯỜNG UBUNTU SERVER HOÀN TẤT THÀNH CÔNG!             "
echo "======================================================================${NC}"
echo -e "Thông tin cơ sở dữ liệu đã tạo:"
echo -e "  - Host:      ${CYAN}127.0.0.1${NC}"
echo -e "  - Port:      ${CYAN}5432${NC}"
echo -e "  - Database:  ${CYAN}${DB_NAME}${NC}"
echo -e "  - User:      ${CYAN}${DB_USER}${NC}"
echo -e "  - Password:  ${CYAN}${DB_PASS}${NC}"
echo ""
echo -e "Bước tiếp theo:"
echo -e "  1. Chuyển thư mục mã nguồn vào: ${CYAN}${APP_DIR}${NC}"
echo -e "  2. Điền mật khẩu CSDL ở trên vào file: ${CYAN}${APP_DIR}/backend/.env${NC}"
echo -e "  3. Chạy script triển khai: ${CYAN}cd ${APP_DIR} && bash deploy/ubuntu/deploy.sh${NC}"
echo "======================================================================"
