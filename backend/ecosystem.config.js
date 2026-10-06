module.exports = {
  apps: [
    {
      name: 'nestjs-backend',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Nghiệp vụ ngày/giờ (giao dịch ngoài giờ, gộp trùng theo ngày, SLA quá hạn)
        // tính theo giờ Việt Nam. Thiếu TZ thì VPS UTC sẽ lệch 7 giờ.
        TZ: 'Asia/Saigon'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        TZ: 'Asia/Saigon'
      }
    },
    {
      name: 'ktnb-collab',
      script: 'dist/collaboration/server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 1234
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 1234
      }
    }
  ]
};

