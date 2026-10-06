import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    pool: 'threads',
    // Nhiều trang dùng antd Table/Modal rất nặng trong jsdom (một lần render bảng
    // đầu tiên có thể > 2s, có file > 25s cho 1 test). Để 15s như trước khiến test
    // flaky khi máy bận / CI runner yếu (đã quan sát thấy timeout giả). 30s là mức
    // an toàn mà vẫn đủ chặt để phát hiện test treo thật.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Trên CI, các test render antd Table/Modal rất nặng có thể chạm timeout khi
    // runner chỉ có 2 vCPU (đã quan sát 2/3 lần chạy full bị timeout giả). Giữ
    // retry = 0 ở máy dev để flaky vẫn lộ ra, chỉ bật retry trên CI — cùng quy ước
    // với `retries: process.env.CI ? 2 : 0` trong playwright.config.ts.
    retry: process.env.CI ? 2 : 0,
    setupFiles: ['./src/setupTests.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
