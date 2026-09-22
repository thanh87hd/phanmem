# ADR-0001: Sử Dụng NestJS 11 với Fastify Adapter làm Nền Tảng Backend API

## Status

Accepted

## Date

2026-01-10

## Deciders

Ban Kiến Trúc Công Nghệ, Lead Backend Engineer, Lead DevOps

## Context

Hệ thống Quản lý Kiểm toán Nội bộ Ngân hàng (LPBank Smart Audit 4.0) là phần mềm lõi phục vụ toàn bộ mạng lưới chi nhánh, phòng giao dịch và hội sở:
- Xử lý các tác vụ tải lên hàng loạt hồ sơ mẫu biểu kiểm toán (tải lên đến 50MB/file, hàng ngàn bản ghi).
- Cần kiến trúc module hóa chặt chẽ, dễ kiểm thử (Unit test, Integration test), có khả năng mở rộng hàng chục module nghiệp vụ độc lập (Audit Universe, Risk Assessment, Engagements, Working Papers, Findings, Recommendations,...).
- Đảm bảo hiệu năng xử lý I/O cao, độ trễ thấp khi phục vụ hàng trăm kiểm toán viên cùng tra cứu và đồng bộ dữ liệu.

## Decision Drivers

* **Hiệu năng thông lượng cao (Throughput)**: Cần adapter HTTP có thông lượng cao hơn Express truyền thống để xử lý các luồng dữ liệu lớn.
* **Cấu trúc kiến trúc chuẩn hóa (Modular & Enterprise-ready)**: Hỗ trợ Dependency Injection, Decorator, Guards, Interceptors, Pipes sẵn có.
* **Hỗ trợ Typescript nguyên bản**: Toàn bộ codebase được type-safe để hạn chế lỗi runtime trong môi trường tài chính.
* **Hỗ trợ Fastify Plugin Ecosystem**: Tích hợp mượt mà với `@fastify/helmet`, `@fastify/cookie`, `@fastify/multipart`.

## Considered Options

### Option 1: NestJS với Fastify Adapter (`@nestjs/platform-fastify`)
- **Ưu điểm**:
  - Tốc độ xử lý thông lượng (requests/sec) nhanh hơn 2-3 lần so với Express tiêu chuẩn.
  - Tối ưu hóa việc parsing JSON và stream dữ liệu multipart lớn (tệp Excel, Word, PDF chứng từ kiểm toán).
  - Giữ nguyên được toàn bộ hệ sinh thái kiến trúc Module / Controller / Service / Provider của NestJS.
- **Nhược điểm**:
  - Một số middleware Express bên thứ ba cần plugin Fastify tương đương hoặc adapter wrapper.
  - Cấu hình file upload (multipart) khác với Multer thông thường của Express.

### Option 2: NestJS với Express truyền thống (`@nestjs/platform-express`)
- **Ưu điểm**:
  - Thư viện cộng đồng phong phú nhất, tương thích 100% tài liệu mẫu của NestJS.
- **Nhược điểm**:
  - Hiệu năng thấp hơn trong các kịch bản tải đồng thời và xử lý payload lớn.

### Option 3: Go (Gin / Fiber) hoặc Java Spring Boot
- **Ưu điểm**: Hiệu năng rất cao, typing mạnh.
- **Nhược điểm**:
  - Không tận dụng được lợi thế chia sẻ TypeScript types và mô hình DTO/schema chung với Frontend React.
  - Tốc độ phát triển tính năng mới chậm hơn đáng kể trong giai đoạn hoàn thiện nghiệp vụ phức tạp của ngân hàng.

## Decision

Chúng tôi quyết định sử dụng **NestJS 11 với Fastify Adapter (`FastifyAdapter`)** làm nền tảng Backend API chính cho hệ thống LPBank Smart Audit 4.0.

## Rationale

1. **Hiệu năng vượt trội**: Fastify tối ưu hóa JSON serializer (sử dụng `fast-json-stringify`) và kiến trúc non-blocking, đáp ứng xuất sắc yêu cầu xử lý các gói dữ liệu kiểm toán và tệp chứng từ đính kèm dung lượng lớn.
2. **Kiến trúc phân tầng vững chắc**: NestJS cung cấp cơ chế Dependency Injection và Module boundaries rõ ràng, cho phép tách biệt rành mạch hơn 40 modules nghiệp vụ ngân hàng mà không bị coupling code.
3. **Bảo mật chuẩn ngân hàng**: Dễ dàng áp dụng Fastify Helmet, cookie bảo mật với `httpOnly`, rate limiting (`ThrottlerModule`), và CORS policy nghiêm ngặt.

## Consequences

### Positive
- Thông lượng API phản hồi nhanh chóng; thời gian xử lý các request tải danh sách vũ trụ kiểm toán và bảng mẫu giảm 40-50%.
- Cấu hình tải tệp lớn lên đến 50MB và 10 tệp đồng thời (`bodyLimit: 52428800`) được tích hợp mượt mà qua `@fastify/multipart`.
- Codebase backend có tính quy chuẩn cao, đồng nhất giữa các module.

### Negative
- Đội ngũ phát triển cần nắm rõ vòng đời của Fastify request/reply và sử dụng interceptor tùy chỉnh (`fastify-file-interceptor.ts`) thay vì sử dụng Multer mặc định của Express.

## Implementation Notes

- Cấu hình Fastify trong [backend/src/main.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/main.ts):
  ```typescript
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ bodyLimit: 52428800, trustProxy: true }),
  );
  ```
- File upload sử dụng `@fastify/multipart` kèm buffer converter tùy chỉnh.

## Related Decisions

- [ADR-0002](0002-postgresql-as-primary-data-store.md): PostgreSQL Core Database.
- [ADR-0005](0005-background-job-queue-bullmq-redis.md): Sử dụng BullMQ để xử lý background jobs nặng.
