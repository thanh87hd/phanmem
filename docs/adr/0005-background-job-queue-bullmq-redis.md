# ADR-0005: Quản Lý Hàng Đợi Tác Vụ Nền Bằng BullMQ và Redis

## Status

Accepted

## Date

2026-01-25

## Deciders

Backend Architect, Systems Performance Engineer

## Context

Hệ thống Kiểm toán Nội bộ có nhiều nghiệp vụ xử lý tốn nhiều CPU và thời gian (Heavy Asynchronous Tasks):
1. **Sinh báo cáo tổng hợp & tệp tài liệu lớn**: Xuất file Word (`.docx`), Excel (`.xlsx`) hàng chục ngàn dòng chứa ma trận rủi ro và toàn bộ mẫu kiểm toán.
2. **Giám sát liên tục (Continuous Audit & KRI Alerting)**: Định kỳ quét các giao dịch ngân hàng bất thường và đánh giá chỉ số KRI vượt ngưỡng.
3. **Nạp dữ liệu quy mô lớn (Data Ingestion & Extraction)**: Phân tích file scan PDF chứng từ qua OCR.
4. **Gửi thông báo & email tự động**: Nhắc hạn xử lý kiến nghị kiểm toán cho các khối nghiệp vụ và chi nhánh.

Nếu xử lý các tác vụ này trực tiếp trong luồng chính của HTTP Request (Synchronous I/O), máy chủ API sẽ bị nghẽn (Request Timeout, tiêu tốn event loop, ảnh hưởng đến các request xem dữ liệu của người dùng khác).

## Decision Drivers

* **Phân tách xử lý đồng bộ và bất đồng bộ**: Giữ cho HTTP API luôn phản hồi trong vòng < 200ms.
* **Độ tin cậy và Khả năng tự thử lại (Retry & Backoff)**: Tác vụ thất bại (do mạng hoặc tài nguyên) phải được tự động thử lại theo cấp số nhân (exponential backoff).
* **Khả năng giám sát trực quan (Monitoring Dashboard)**: Cần có giao diện theo dõi tiến độ hàng đợi, số lượng job thành công/thất bại để quản trị viên dễ kiểm soát.
* **Tương thích cao với NestJS**: Có thư viện bọc sẵn (Wrapper) chuẩn để dễ dàng tích hợp Dependency Injection.

## Considered Options

### Option 1: BullMQ kết hợp Redis (`@nestjs/bullmq` + `ioredis`) (Được chọn)
- **Ưu điểm**:
  - Tối ưu hóa trên nền Redis Streams / Hashes, tốc độ đẩy và nhận job cực nhanh (hàng chục ngàn jobs/giây).
  - Hỗ trợ đầy đủ Delayed jobs, Recurring cron jobs, Job events, Concurrency control, Rate-limiting.
  - Hỗ trợ `@bull-board/fastify` cung cấp giao diện Web trực quan quản trị hàng đợi tại `/admin/queues`.
  - Phân tách worker xử lý sang tiến trình riêng hoặc thread pool riêng dễ dàng.
- **Nhược điểm**: Phụ thuộc vào dịch vụ Redis (cần cấu hình Redis bền vững RDB/AOF).

### Option 2: RabbitMQ hoặc Apache Kafka
- **Ưu điểm**: Rất mạnh cho kiến trúc Event-driven phân tán quy mô lớn.
- **Nhược điểm**:
  - Quá tải về mặt hạ tầng (overkill) cho nhu cầu xử lý hàng đợi background nội bộ của hệ thống KTNB.
  - Cần cài đặt cụm server chuyên biệt và nhân sự vận hành phức tạp hơn nhiều so với Redis.

### Option 3: Node.js In-Memory Queue (ví dụ: `async.queue` hoặc setInterval)
- **Ưu điểm**: Không cần Redis.
- **Nhược điểm**: Mất toàn bộ hàng đợi nếu tiến trình Backend bị restart; không hỗ trợ chia tải (load balance) khi chạy nhiều phiên bản backend (multi-instance).

## Decision

Chúng tôi quyết định chọn **BullMQ chạy trên nền Redis** làm hệ thống quản lý hàng đợi và tác vụ nền cho LPBank Smart Audit 4.0.

## Consequences

### Positive
- Các tác vụ xuất báo cáo nặng được giao cho hàng đợi (`reports`, `working-papers`), người dùng nhận phản hồi ngay lập tức (`202 Accepted`) và tải file khi hoàn tất.
- Cấu hình thử lại thông minh với:
  ```typescript
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  timeout: 60000,
  ```
- Dễ dàng theo dõi và xử lý lỗi thủ công thông qua dashboard Bull-Board.

### Negative
- Cần đảm bảo Redis luôn chạy ổn định trên môi trường sản xuất (sử dụng Docker Compose hoặc dịch vụ Linux Redis có giám sát).

## Implementation Notes

- Cấu hình trong [backend/src/app.module.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/app.module.ts):
  ```typescript
  BullModule.forRootAsync({
    useFactory: async (configService: ConfigService) => ({
      connection: {
        host: configService.get('REDIS_HOST', 'localhost'),
        port: configService.get<number>('REDIS_PORT', 6379),
        password: configService.get('REDIS_PASSWORD', ''),
        skipVersionCheck: true,
      },
    }),
  })
  ```
- Module quản lý job: [backend/src/jobs/jobs.module.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/jobs/jobs.module.ts).

## Related Decisions

- [ADR-0001](0001-nestjs-fastify-backend-runtime.md): NestJS Backend Engine.
