const fs = require('fs');
const path = require('path');
const jwt = require('f:/Phan mem KTNB 4.0/backend/node_modules/jsonwebtoken');
const FormData = require('f:/Phan mem KTNB 4.0/frontend/node_modules/form-data');
const http = require('http');

function parseEnv(envPath) {
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  });
  return env;
}

async function uploadLocal() {
  const env = parseEnv(path.resolve(__dirname, '../backend/.env'));
  const secret = env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not found in backend/.env');
  }

  // Create JWT token for admin
  const token = jwt.sign(
    { username: 'admin', sub: 1, userId: 1, role: 'Admin' },
    secret,
    { expiresIn: '1h' }
  );

  const filePath = path.resolve(__dirname, '../docs/02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx');
  console.log('Target file:', filePath, 'Size:', fs.statSync(filePath).size, 'bytes');

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: '02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  console.log('Sending upload request to Local Backend http://127.0.0.1:3001/api/import/users...');

  return new Promise((resolve, reject) => {
    const req = http.request(
      'http://127.0.0.1:3001/api/import/users',
      {
        method: 'POST',
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`Local HTTP Status: ${res.statusCode}`);
          try {
            const parsed = JSON.parse(body);
            console.log('Response body:', JSON.stringify(parsed, null, 2));
            resolve(parsed);
          } catch {
            console.log('Raw body:', body);
            resolve({ statusCode: res.statusCode, body });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('Request error:', err);
      reject(err);
    });

    form.pipe(req);
  });
}

uploadLocal().catch(console.error);
