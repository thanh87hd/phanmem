const fs = require('fs');
const path = require('path');
const { standardRcmData } = require('./seed_standard_rcm');

let sql = `
CREATE TABLE IF NOT EXISTS risk_control_matrix (
  id SERIAL PRIMARY KEY,
  "processId" INT,
  "processName" VARCHAR(200),
  "subProcess" VARCHAR(200),
  "businessObjective" TEXT,
  "riskName" VARCHAR(255) NOT NULL,
  "riskDescription" TEXT,
  "inherentRiskScore" VARCHAR(50),
  "controlName" VARCHAR(255) NOT NULL,
  "controlDescription" TEXT,
  "controlType" VARCHAR(50),
  "controlFrequency" VARCHAR(50),
  "controlAutomation" VARCHAR(50),
  "testProcedure" TEXT,
  "expectedEvidence" TEXT,
  "ownerDepartmentId" INT,
  "ownerTeam" VARCHAR(100),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

TRUNCATE TABLE risk_control_matrix RESTART IDENTITY CASCADE;
`;

const esc = (s) => (s ? "'" + String(s).replace(/'/g, "''") + "'" : "NULL");

for (const r of standardRcmData) {
  sql += `INSERT INTO risk_control_matrix ("processName", "subProcess", "businessObjective", "riskName", "riskDescription", "inherentRiskScore", "controlName", "controlDescription", "controlType", "controlFrequency", "controlAutomation", "testProcedure", "expectedEvidence", "ownerTeam", "createdAt", "updatedAt") VALUES (${esc(r.processName)}, ${esc(r.subProcess)}, ${esc(r.businessObjective)}, ${esc(r.riskName)}, ${esc(r.riskDescription)}, ${esc(r.inherentRiskScore)}, ${esc(r.controlName)}, ${esc(r.controlDescription)}, ${esc(r.controlType)}, ${esc(r.controlFrequency)}, ${esc(r.controlAutomation)}, ${esc(r.testProcedure)}, ${esc(r.expectedEvidence)}, 'KTNB_HoiSo', NOW(), NOW());\n`;
}

const outPath = path.join(__dirname, 'rcm_seed.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log('✅ Generated rcm_seed.sql successfully! Total rows:', standardRcmData.length);
