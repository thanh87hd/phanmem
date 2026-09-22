-- Migration: Convert teamMembers column in audit_engagements to JSONB and add GIN index

-- 1. Ensure teamMembers is converted to valid JSONB
ALTER TABLE audit_engagements 
  ALTER COLUMN "teamMembers" TYPE jsonb 
  USING CASE 
    WHEN "teamMembers" IS NULL OR "teamMembers"::text = '' OR "teamMembers"::text = 'null' THEN '[]'::jsonb 
    ELSE "teamMembers"::jsonb 
  END;

-- 2. Create GIN index for high-speed containment queries (@>)
CREATE INDEX IF NOT EXISTS idx_engagements_team_members_gin 
  ON audit_engagements USING gin ("teamMembers");
