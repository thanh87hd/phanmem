-- Script bổ sung cột version phục vụ Optimistic Locking chống xung đột ghi đè
ALTER TABLE working_papers ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
UPDATE working_papers SET version = 1 WHERE version IS NULL;

ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
UPDATE audit_findings SET version = 1 WHERE version IS NULL;
