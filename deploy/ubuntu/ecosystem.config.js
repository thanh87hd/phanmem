module.exports = {
  apps: [
    {
      name: 'ktnb-backend',
      script: 'dist/main.js',
      cwd: '/var/www/phanmem/backend',
      instances: 2, // Chạy 2 instances cân bằng tải hoặc 'max' theo số CPU core
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G', // Tự khởi động lại nếu rò rỉ bộ nhớ vượt 1GB
      restart_delay: 4000,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        BIND_HOST: '127.0.0.1'
      },
      error_file: '/var/log/pm2/ktnb-backend-err.log',
      out_file: '/var/log/pm2/ktnb-backend-out.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    // Microservice OCR (tùy chọn - nếu cài đặt Python service trực tiếp)
    // {
    //   name: 'ktnb-ocr',
    //   script: 'venv/bin/uvicorn',
    //   args: 'main:app --host 127.0.0.1 --port 8000',
    //   cwd: '/var/www/phanmem/ocr-service',
    //   interpreter: 'none',
    //   autorestart: true,
    //   watch: false,
    //   max_memory_restart: '800M',
    // }
  ],
};
