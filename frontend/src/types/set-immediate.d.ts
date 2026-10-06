/**
 * Khai báo bổ sung cho môi trường test.
 *
 * Vitest chạy trên Node (kể cả khi `environment: 'jsdom'`) nên `setImmediate`
 * LUÔN tồn tại lúc chạy, nhưng tsconfig của app chỉ nạp lib DOM (không nạp type
 * của Node) nên TypeScript báo TS2304. Các file test dùng `setImmediate` để
 * "nhường" một macrotask cho React Scheduler chạy hết việc còn treo TRƯỚC khi
 * jsdom bị teardown (nếu không sẽ có lỗi "ReferenceError: window is not defined").
 *
 * Khai báo đúng một hàm thay vì bật `"types": ["node"]` để tránh đưa toàn bộ
 * global của Node vào không gian type của code ứng dụng.
 */
declare function setImmediate(
  callback: (...args: any[]) => void,
  ...args: any[]
): unknown;
