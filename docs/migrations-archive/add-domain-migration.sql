BEGIN;
ALTER TABLE audit_sample_batches ADD COLUMN IF NOT EXISTS "auditDomain" character varying(50) DEFAULT 'CREDIT';
INSERT INTO migrations ("timestamp", "name") VALUES (1724789000000, 'AddBatchAuditDomain1724789000000') ON CONFLICT DO NOTHING;
COMMIT;
