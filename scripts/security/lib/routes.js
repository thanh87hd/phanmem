'use strict';
// Doc nguon controller de lay danh sach route THAT (khong hard-code)
const fs = require('fs');
const path = require('path');

const STRIP = new RegExp("['\"" + String.fromCharCode(96) + "]", 'g');

function walk(dir, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

// Chuyen ':id' -> gia tri mau de goi duoc
const SAMPLE = {
  id: '1', userId: '1', roleId: '1', batchId: '1', queueName: 'default',
  code: 'ADMIN', key: '1', slug: 'test', type: '1', name: 'test',
};

function fillParams(routePath) {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, (m, name) => SAMPLE[name] || '1');
}

function parseRoutes(srcDir) {
  const files = walk(srcDir, []);
  const routes = [];
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const cm = /@Controller\(([^)]*)\)/.exec(t);
    const base = cm ? cm[1].replace(STRIP, '').trim() : '';
    const cls = (/export class (\w+)/.exec(t) || [])[1] || path.basename(f, '.controller.ts');
    // Bo qua controller khong co route
    for (const m of t.matchAll(/@(Get|Post|Put|Patch|Delete)\(([^)]*)\)/g)) {
      const idx = m.index;
      const pre = t.slice(Math.max(0, idx - 500), idx);
      const decorators = [];
      if (/@Public\(/.test(pre)) decorators.push('Public');
      if (/@Roles\(/.test(pre)) decorators.push('Roles');
      if (/@UseGuards\(/.test(pre)) decorators.push('UseGuards');
      if (/Throttle/.test(pre)) decorators.push('Throttle');
      const raw = m[2].replace(STRIP, '').trim();
      const full = ('/' + base + '/' + raw).replace(/\/+/g, '/').replace(/\/$/, '') || '/' + base;
      routes.push({
        method: m[1].toUpperCase(),
        path: full,
        url: '/api' + full,
        controller: cls,
        file: path.relative(process.cwd(), f).replace(/\\/g, '/'),
        decorators,
        isPublic: decorators.includes('Public'),
        hasRoles: decorators.includes('Roles'),
        sampleUrl: '/api' + fillParams(full),
      });
    }
  }
  return routes;
}

function groupByController(routes) {
  const g = {};
  for (const r of routes) (g[r.controller] = g[r.controller] || []).push(r);
  return g;
}

module.exports = { parseRoutes, fillParams, groupByController };