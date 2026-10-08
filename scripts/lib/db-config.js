'use strict';

/**
 * Cau hinh ket noi CSDL dung chung cho cac script trong thu muc scripts/.
 *
 * KHONG ghi cung mat khau trong ma nguon. Gia tri duoc lay theo thu tu uu tien:
 *   1. Bien moi truong (DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_NAME)
 *   2. Tep backend/.env
 *   3. Gia tri mac dinh an toan cho moi truong phat trien cuc bo
 *
 * Vi du:
 *   $env:DB_PASSWORD='...'; node scripts/list-roles-users.cjs
 */

const fs = require('fs');
const path = require('path');

/** Doc tep .env don gian (chi KEY=VALUE, bo qua dong trong va dong chu thich). */
function readEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/** Lay cau hinh ket noi. Nem loi neu thieu mat khau de tranh ket noi sai am tham. */
function loadDbConfig(overrides = {}) {
  const fileEnv = readEnvFile(path.resolve(__dirname, '..', '..', 'backend', '.env'));
  const get = (name, fallback) =>
    process.env[name] || fileEnv[name] || fallback;

  const password = get('DB_PASSWORD');
  if (!password) {
    throw new Error(
      'Thieu DB_PASSWORD. Dat bien moi truong DB_PASSWORD hoac them vao backend/.env truoc khi chay.',
    );
  }

  return {
    host: get('DB_HOST', 'localhost'),
    port: Number(get('DB_PORT', '5432')),
    user: get('DB_USERNAME', 'ktnb'),
    password,
    database: get('DB_NAME', 'ktnb_v4'),
    ...overrides,
  };
}

module.exports = { loadDbConfig, readEnvFile };
