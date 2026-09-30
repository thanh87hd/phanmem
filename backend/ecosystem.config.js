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
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
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

