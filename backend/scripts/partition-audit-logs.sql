-- ==============================================================================
-- KỊCH BẢN PHÂN VÙNG BẢNG AUDIT_LOGS THEO THÁNG (MONTHLY RANGE PARTITIONING)
-- Chuẩn mực lưu trữ 05 năm theo Thông tư 09/2020/TT-NHNN & Thông tư 13/2018/TT-NHNN
-- ==============================================================================

BEGIN;

-- 1. Tạo bảng phân vùng mới với cùng cấu trúc
CREATE TABLE IF NOT EXISTS audit_logs_partitioned (
    id BIGSERIAL,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    "resourceId" VARCHAR(100),
    "userId" INTEGER,
    username VARCHAR(100),
    "oldValue" TEXT,
    "newValue" TEXT,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY (id, "createdAt")
) PARTITION BY RANGE ("createdAt");

-- 2. Tạo các partition con theo từng tháng cho Năm 2026
CREATE TABLE IF NOT EXISTS audit_logs_y2026m01 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m02 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m03 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m04 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m05 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m06 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m07 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m08 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m09 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m10 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m11 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_y2026m12 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- 3. Tạo partition mặc định cho các bản ghi ngoại lai (Default Partition)
CREATE TABLE IF NOT EXISTS audit_logs_default PARTITION OF audit_logs_partitioned DEFAULT;

-- 4. Tạo các chỉ mục tối ưu hóa truy vấn
CREATE INDEX IF NOT EXISTS idx_audit_part_res ON audit_logs_partitioned (resource, "resourceId");
CREATE INDEX IF NOT EXISTS idx_audit_part_user ON audit_logs_partitioned ("userId");
CREATE INDEX IF NOT EXISTS idx_audit_part_created ON audit_logs_partitioned ("createdAt");

-- 5. Chép dữ liệu hiện hữu từ bảng cũ sang bảng phân vùng (nếu có)
INSERT INTO audit_logs_partitioned (action, resource, "resourceId", "userId", username, "oldValue", "newValue", "ipAddress", "userAgent", "createdAt")
SELECT action, resource, "resourceId", "userId", username, "oldValue", "newValue", "ipAddress", "userAgent", "createdAt"
FROM audit_logs
ON CONFLICT DO NOTHING;

COMMIT;
