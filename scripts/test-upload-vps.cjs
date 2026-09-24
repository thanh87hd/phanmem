const fs = require('fs');
const path = require('path');
const jwt = require('f:/Phan mem KTNB 4.0/backend/node_modules/jsonwebtoken');
const FormData = require('f:/Phan mem KTNB 4.0/frontend/node_modules/form-data');
const https = require('https');
const { spawnSync } = require('child_process');

async function uploadVps() {
  const vpsSecret = 'YOUR_SUPER_SECRET_KEY_PROD_2026_VERY_SECURE_KEY_@';

  // Create JWT token for admin on VPS (admin id: 40)
  const token = jwt.sign(
    { username: 'admin', sub: 40, userId: 40, role: 'Admin' },
    vpsSecret,
    { expiresIn: '1h' }
  );

  const filePath = path.resolve(__dirname, '../docs/02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx');
  console.log('Target file:', filePath, 'Size:', fs.statSync(filePath).size, 'bytes');

  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), {
    filename: '02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  console.log('Sending upload request to VPS Backend https://chinhta.io.vn/api/import/users...');

  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://chinhta.io.vn/api/import/users',
      {
        method: 'POST',
        rejectUnauthorized: false,
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log(`VPS HTTP Status: ${res.statusCode}`);
          try {
            const parsed = JSON.parse(body);
            console.log('VPS Response body:', JSON.stringify(parsed, null, 2));
            resolve(parsed);
          } catch {
            console.log('VPS Raw body:', body);
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

uploadVps().catch(console.error);
