'use strict';
// Thu thap ket qua + xuat bao cao JSON / Markdown / SARIF
const fs = require('fs');
const path = require('path');
const { SEVERITY_ORDER } = require('./config');

function createReport(meta) {
  const findings = [];
  const suites = [];
  const errors = [];
  let current = null;

  function startSuite(id, name) { current = { id, name, checks: 0, findings: 0, errors: 0, startedAt: new Date().toISOString() }; suites.push(current); }
  function endSuite() { if (current) { current.finishedAt = new Date().toISOString(); current = null; } }

  function add(severity, id, title, detail, extra) {
    const f = Object.assign({ suite: current ? current.id : 'n/a', severity, id, title, detail: detail || '' }, extra || {});
    findings.push(f);
    if (current) current.findings++;
    return f;
  }

  // Ghi nhan phep kiem BI BO QUA vi che do an toan (trung thuc ve do bao phu)
  function skip(id, title, detail) {
    if (current) current.checks++;
    return add('info', id + '-SKIP', title, detail,
      { remediation: 'Chay lai tren moi truong test voi --unsafe de kiem tra day du.' });
  }

  // Ghi nhan 1 phep kiem da PASS (khong tao finding)
  function pass() { if (current) current.checks++; }
  function fail(severity, id, title, detail, extra) { if (current) current.checks++; return add(severity, id, title, detail, extra); }
  function error(id, message) { errors.push({ suite: current ? current.id : 'n/a', id, message }); if (current) current.errors++; }

  function summary() {
    const bySeverity = {};
    for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    return { total: findings.length, bySeverity, suites: suites.length, checks: suites.reduce((a, s) => a + s.checks, 0), errors: errors.length };
  }

  return { meta, findings, suites, errors, startSuite, endSuite, add, pass, fail, error, skip, summary };
}

function sortFindings(findings) {
  return findings.slice().sort((a, b) => {
    const d = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    if (d !== 0) return d;
    return String(a.id).localeCompare(String(b.id));
  });
}

const SEV_ICON = { critical: '🔴', high: '🟠', medium: '🟡', low: '🔵', info: '⚪' };

function toMarkdown(report) {
  const s = report.summary();
  const L = [];
  L.push('# BÁO CÁO KIỂM THỬ BẢO MẬT — KTNB 4.0');
  L.push('');
  L.push('| Trường | Giá trị |');
  L.push('| :--- | :--- |');
  L.push('| Mục tiêu | `' + report.meta.baseUrl + '` |');
  L.push('| Thời điểm | ' + report.meta.startedAt + ' |');
  L.push('| Thời lượng | ' + ((report.meta.durationMs || 0) / 1000).toFixed(1) + ' giây |');
  L.push('| Phiên bản suite | ' + report.meta.suiteVersion + ' |');
  L.push('| Tổng phát hiện | **' + s.total + '** |');
  L.push('');
  L.push('## 1. Tổng hợp theo mức độ');
  L.push('');
  L.push('| Mức độ | Số lượng |');
  L.push('| :--- | ---: |');
  for (const k of ['critical', 'high', 'medium', 'low', 'info']) L.push('| ' + (SEV_ICON[k] || '') + ' ' + k + ' | ' + (s.bySeverity[k] || 0) + ' |');
  L.push('');
  L.push('## 2. Kết quả theo nhóm OWASP');
  L.push('');
  L.push('| Nhóm | Tên | Số phép kiểm | Phát hiện | Lỗi |');
  L.push('| :--- | :--- | ---: | ---: | ---: |');
  for (const su of report.suites) L.push('| ' + su.id + ' | ' + su.name + ' | ' + su.checks + ' | ' + su.findings + ' | ' + su.errors + ' |');
  L.push('');
  const sorted = sortFindings(report.findings);
  L.push('## 3. Chi tiết phát hiện');
  L.push('');
  if (!sorted.length) { L.push('Không phát hiện vấn đề nào.'); L.push(''); }
  let i = 0;
  for (const f of sorted) {
    i++;
    L.push('### ' + i + '. ' + (SEV_ICON[f.severity] || '') + ' [' + f.severity.toUpperCase() + '] ' + f.title);
    L.push('');
    L.push('- **Mã:** `' + f.id + '`');
    L.push('- **Nhóm:** ' + f.suite);
    if (f.url) L.push('- **URL:** `' + f.url + '`');
    if (f.evidence) L.push('- **Bằng chứng:** ' + String(f.evidence).replace(/\n/g, ' ').slice(0, 500));
    if (f.remediation) L.push('- **Khắc phục:** ' + f.remediation);
    L.push('- **Mô tả:** ' + f.detail);
    L.push('');
  }
  if (report.errors.length) {
    L.push('## 4. Lỗi khi chạy');
    L.push('');
    for (const e of report.errors) L.push('- `' + e.id + '`: ' + e.message);
    L.push('');
  }
  return L.join('\n');
}

// SARIF 2.1.0 de tich hop GitHub/GitLab Security tab
function toSarif(report) {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: { driver: { name: 'KTNB-Security-Suite', version: report.meta.suiteVersion,
        informationUri: report.meta.baseUrl,
        rules: [...new Set(report.findings.map((f) => f.id))].map((id) => ({ id })) } },
      results: sortFindings(report.findings).map((f) => ({
        ruleId: f.id,
        level: f.severity === 'critical' || f.severity === 'high' ? 'error' : (f.severity === 'medium' ? 'warning' : 'note'),
        message: { text: f.title + ' — ' + f.detail },
        locations: f.url ? [{ physicalLocation: { artifactLocation: { uri: f.url } } }] : [],
      })),
    }],
  };
}

function writeReports(report, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const out = {};
  out.json = path.join(outDir, 'security-report.json');
  fs.writeFileSync(out.json, JSON.stringify(report, null, 2), 'utf8');
  out.markdown = path.join(outDir, 'SECURITY_REPORT.md');
  fs.writeFileSync(out.markdown, toMarkdown(report), 'utf8');
  out.sarif = path.join(outDir, 'security-report.sarif');
  fs.writeFileSync(out.sarif, JSON.stringify(toSarif(report), null, 2), 'utf8');
  return out;
}

module.exports = { createReport, sortFindings, toMarkdown, toSarif, writeReports, SEV_ICON };
