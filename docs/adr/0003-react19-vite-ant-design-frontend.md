# ADR-0003: Kiến Trúc Giao Diện Người Dùng với React 19, Vite 6 và Ant Design

## Status

Accepted

## Date

2026-01-15

## Deciders

Frontend Architect, UI/UX Lead, Product Manager

## Context

Giao diện của hệ thống Kiểm toán Nội bộ là công cụ làm việc hàng ngày của hàng trăm kiểm toán viên, chuyên gia và cấp lãnh đạo:
- Chứa các bảng dữ liệu khổng lồ (bảng ma trận mẫu kiểm toán 40 cột tín dụng, bảng danh mục rủi ro, bảng theo dõi kiến nghị).
- Yêu cầu hệ thống form biểu mẫu phức tạp (phê duyệt đa cấp, lọc nâng cao, validate nhiều bước).
- Cần tốc độ tải trang nhanh, đóng gói nhẹ, phản hồi tức thì và giao diện chuẩn mực chuyên nghiệp phù hợp với tiêu chuẩn thương hiệu LPBank.

## Decision Drivers

* **Bộ Component Doanh Nghiệp Hoàn Thiện (Enterprise Component Suite)**: Cần thư viện UI cung cấp đầy đủ Table (hỗ trợ phân trang, lọc, sắp xếp, gộp cột), Modal, Drawer, Form, TreeSelect, DatePicker chuẩn ngân hàng.
* **Thời Gian Khởi Động & Build Tối Ưu**: Tận dụng ES Modules của Vite 6 thay vì Webpack cồng kềnh.
* **Đồng Bộ Dữ Liệu Tinh Gọn (State & Cache Management)**: Cần cơ chế tự động cache dữ liệu API, refetch thông minh khi kiểm toán viên thao tác.
* **Code-splitting & Tối Ưu Bundle**: Chia nhỏ bundle để tải trang nhanh dưới 1.5 giây.

## Considered Options

### Option 1: React 19 + Vite 6 + Ant Design + TanStack Query (Được chọn)
- **Ưu điểm**:
  - Ant Design là tiêu chuẩn vàng cho các hệ thống quản trị tài chính - ngân hàng phức tạp với đầy đủ component nghiệp vụ.
  - React 19 mang lại hiệu năng render tối ưu và các cải tiến hook mới.
  - Vite 6 cho tốc độ HMR (Hot Module Replacement) dưới 50ms và thời gian build production dưới 10 giây.
  - TanStack React Query quản lý server state xuất sắc, tự động invalidate cache khi dữ liệu thay đổi.
- **Nhược điểm**: Ant Design có dung lượng bundle tương đối lớn nếu không cấu hình code-splitting hợp lý.

### Option 2: Next.js 15 (App Router) + Tailwind CSS + Shadcn UI
- **Ưu điểm**: Hỗ trợ Server Components, SEO tốt.
- **Nhược điểm**:
  - Không cần thiết cho ứng dụng nội bộ doanh nghiệp (Internal Enterprise Dashboard không cần SEO công khai).
  - Phức tạp hơn trong việc deploy dạng SPA tĩnh (Static Bundle) lên hạ tầng On-Premise hoặc serve qua Nginx thông thường.
  - Shadcn UI đòi hỏi tự viết nhiều logic table phức tạp (Ant Design Table đã có sẵn mọi tính năng ngân hàng cần).

## Decision

Chúng tôi quyết định xây dựng Frontend dưới dạng **Single Page Application (SPA)** với **React 19, TypeScript, Vite 6, Ant Design và TanStack React Query**.

## Consequences

### Positive
- Tốc độ phát triển tính năng cực nhanh nhờ tận dụng hệ sinh thái component hoàn thiện của Ant Design.
- Quản lý trạng thái bất đồng bộ ổn định qua `useQuery` và `useMutation`, loại bỏ boilerplate code phức tạp của Redux.
- Triển khai siêu nhẹ: Build thành thư mục tĩnh `dist/` độc lập, có thể phục vụ linh hoạt qua bất kỳ Web Server nào (Nginx, Apache, Node serve, Docker).

### Negative
- Phải cấu hình Rollup `manualChunks` trong `vite.config.ts` để phân bổ bundle thành các chunk riêng: `vendor-antd`, `vendor-tiptap`, `vendor-charts`, `vendor-react`, `vendor-query`.

## Implementation Notes

- Cấu hình chia nhỏ bundle trong [frontend/vite.config.ts](file:///f:/Phan%20mem%20KTNB%204.0/frontend/vite.config.ts):
  ```typescript
  manualChunks(id) {
    if (id.includes('antd') || id.includes('@ant-design')) return 'vendor-antd';
    if (id.includes('@tiptap') || id.includes('yjs')) return 'vendor-tiptap';
    if (id.includes('recharts')) return 'vendor-charts';
    if (id.includes('react')) return 'vendor-react';
    if (id.includes('@tanstack/react-query')) return 'vendor-query';
  }
  ```

## Related Decisions

- [ADR-0004](0004-realtime-collaboration-tiptap-yjs.md): Real-time collaboration với Tiptap.
