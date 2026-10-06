/**
 * Khai báo bổ sung cho global `process` mà mã nguồn app đang dùng.
 *
 * Vite thay thế `process.env.NODE_ENV` ngay lúc build, nhưng tsconfig của app
 * (`tsconfig.app.json`) chỉ nạp `"types": ["vite/client"]` — không nạp type của
 * Node — nên TypeScript báo TS2591: Cannot find name 'process'.
 *
 * Khai báo đúng thành phần đang được dùng (xem `src/utils/excelExport.ts`) thay
 * vì bật `"types": ["node"]`, để mã runtime giữ nguyên và không kéo toàn bộ
 * global của Node vào không gian type của code ứng dụng
 * (cùng cách làm với `set-immediate.d.ts`).
 */
declare const process: {
  env: Record<string, string | undefined>;
};
