#!/usr/bin/env bash
# ==============================================================================
# LPBank Smart Audit 4.0 - Automated Daily Backup Script
# Sao lưu cơ sở dữ liệu PostgreSQL & tệp đính kèm, lưu trữ và xoay vòng 30 ngày
# Thêm vào crontab: 0 2 * * * /path/to/backup-cron.sh >> /var/log/lpbank-backup.log 2>&1
# ==============================================================================

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/lpbank-audit}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR/db"
mkdir -p "$BACKUP_DIR/uploads"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Bắt đầu quy trình sao lưu LPBank Smart Audit..."

# Đọc cấu hình từ backend/.env nếu có
ENV_FILE="$APP_DIR/backend/.env"
DB_HOST="127.0.0.1"
DB_PORT="5432"
DB_USER="ktnb_user"
DB_NAME="ktnb_db"
DB_PASS=""

if [ -f "$ENV_FILE" ]; then
    DB_HOST_VAL=$(grep -E '^DB_HOST=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"\r')
    [ -n "$DB_HOST_VAL" ] && DB_HOST="$DB_HOST_VAL"
    
    DB_PORT_VAL=$(grep -E '^DB_PORT=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"\r')
    [ -n "$DB_PORT_VAL" ] && DB_PORT="$DB_PORT_VAL"

    DB_USER_VAL=$(grep -E '^DB_USERNAME=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"\r')
    [ -n "$DB_USER_VAL" ] && DB_USER="$DB_USER_VAL"

    DB_NAME_VAL=$(grep -E '^DB_DATABASE=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"\r')
    [ -n "$DB_NAME_VAL" ] && DB_NAME="$DB_NAME_VAL"

    DB_PASS_VAL=$(grep -E '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2- | tr -d '"\r')
    [ -n "$DB_PASS_VAL" ] && DB_PASS="$DB_PASS_VAL"
fi

# 1. Sao lưu PostgreSQL Database
DB_BACKUP_FILE="$BACKUP_DIR/db/lpbank_db_${TIMESTAMP}.sql.gz"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Đang sao lưu Database ${DB_NAME}..."

if [ -n "$DB_PASS" ]; then
    export PGPASSWORD="$DB_PASS"
fi

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" | gzip > "$DB_BACKUP_FILE"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sao lưu Database hoàn tất: $DB_BACKUP_FILE ($(du -h "$DB_BACKUP_FILE" | cut -f1))"

# 2. Sao lưu thư mục uploads (nếu có tài liệu đính kèm)
UPLOADS_SRC="$APP_DIR/backend/uploads"
if [ -d "$UPLOADS_SRC" ]; then
    UPLOADS_BACKUP_FILE="$BACKUP_DIR/uploads/lpbank_uploads_${TIMESTAMP}.tar.gz"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Đang sao lưu thư mục uploads..."
    tar -czf "$UPLOADS_BACKUP_FILE" -C "$APP_DIR/backend" uploads
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sao lưu uploads hoàn tất: $UPLOADS_BACKUP_FILE ($(du -h "$UPLOADS_BACKUP_FILE" | cut -f1))"
fi

# 3. Dọn dẹp bản sao lưu cũ hơn RETENTION_DAYS ngày
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dọn dẹp bản sao lưu cũ hơn ${RETENTION_DAYS} ngày..."
find "$BACKUP_DIR/db" -type f -name "*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
find "$BACKUP_DIR/uploads" -type f -name "*.tar.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sao lưu hoàn thành xuất sắc."
