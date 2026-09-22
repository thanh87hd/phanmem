# ADR-0002: Lựa Chọn PostgreSQL làm Hệ Quản Trị Cơ Sở Dữ Liệu Trung Tâm

## Status

Accepted

## Date

2026-01-12

## Deciders

Data Architect, Lead Backend Engineer, Security Officer

## Context

Hệ thống Kiểm toán Nội bộ Ngân hàng đòi hỏi tính toàn vẹn dữ liệu ở mức cao nhất:
- Dữ liệu kiểm toán, sai phạm tài chính, số liệu tín dụng và chấm điểm rủi ro liên quan trực tiếp đến tính tuân thủ pháp lý (Thông tư 13/2018/TT-NHNN).
- Cần tính năng giao dịch ACID tuyệt đối trong các thao tác phê duyệt kết luận kiểm toán, đóng hồ sơ cuộc kiểm toán và chuyển giao kiến nghị.
- Nhu cầu lưu trữ các trường dữ liệu tùy biến linh hoạt (Custom Fields), cây quy trình nghiệp vụ kiểm toán, và lịch sử phiên làm việc (Audit Trail / JSON logs) mà không phải thay đổi cấu trúc bảng liên tục.
- Cần hỗ trợ tìm kiếm full-text search và quan hệ dữ liệu phức tạp giữa hơn 110 bảng (Users, Roles, Departments, Engagements, Working Papers, Findings, Recommendations,...).

## Decision Drivers

* **Tính toàn vẹn và giao dịch ACID nghiêm ngặt**: Đảm bảo không thất thoát dữ liệu, chống xung đột ghi đồng thời.
* **Hỗ trợ kiểu dữ liệu JSONB mạnh mẽ**: Cho phép lưu trữ schema động (custom fields, dynamic workflows, audit logs).
* **Khả năng quan hệ bảng phong phú**: Quản lý ràng buộc khóa ngoại (Foreign Keys), tầng cascade, và index hiệu năng cao.
* **Tương thích ORM (TypeORM)**: Hệ sinh thái TypeORM hỗ trợ migration, relation mapping và connection pooling mạnh mẽ trên PostgreSQL.
* **Bảo mật và Phù hợp hạ tầng On-Premise ngân hàng**: Mã nguồn mở cấp doanh nghiệp, không phát sinh chi phí bản quyền tốn kém như Oracle / MS SQL Server Enterprise khi triển khai mở rộng.

## Considered Options

### Option 1: PostgreSQL (Được chọn)
- **Ưu điểm**:
  - Tuân thủ ACID hoàn hảo, hỗ trợ Foreign Keys và Transaction Isolation Levels cao.
  - JSONB có index GIN giúp truy vấn nhanh các thuộc tính động trong hồ sơ kiểm toán.
  - Hỗ trợ Connection Pool, tối ưu hóa bộ nhớ, hỗ trợ tốt trên cả Linux VPS, Docker và Windows Server.
- **Nhược điểm**: Cần thiết lập cấu hình pool và bảo trì chân không (`VACUUM`) định kỳ với bảng dữ liệu log lớn.

### Option 2: Microsoft SQL Server
- **Ưu điểm**: Phổ biến trong hạ tầng một số ngân hàng.
- **Nhược điểm**: Chi phí bản quyền doanh nghiệp rất cao, xử lý JSONB kém linh hoạt hơn PostgreSQL, tài liệu hỗ trợ TypeORM trên Node.js không tối ưu bằng PostgreSQL.

### Option 3: MongoDB (NoSQL)
- **Ưu điểm**: Linh hoạt tối đa về cấu trúc tài liệu.
- **Nhược điểm**: Không đáp ứng tốt các ràng buộc khóa ngoại phức tạp giữa 112 thực thể kiểm toán ngân hàng; rủi ro về tính toàn vẹn dữ liệu trong các luồng phê duyệt tài chính.

## Decision

Chúng tôi quyết định chọn **PostgreSQL (phiên bản 14 trở lên)** làm CSDL quan hệ chính thức cho LPBank Smart Audit 4.0, kết nối qua thư viện `pg` và `TypeORM`.

## Consequences

### Positive
- Hệ thống duy trì tính toàn vẹn dữ liệu tuyệt đối qua 112 bảng dữ liệu và hơn 50 ràng buộc khóa ngoại.
- Kiểu dữ liệu `jsonb` được khai thác triệt để trong các module: `custom_fields`, `metadata`, `dynamic_workflows`, và `priorDepartments`.
- Tối ưu hóa Connection Pool với cấu hình: `max: 100`, `connectionTimeoutMillis: 30000`, `idleTimeoutMillis: 10000`.

### Negative
- Cần có quy trình định kỳ sao lưu tự động (`pg_dump`) và giám sát dung lượng đĩa của các bảng nhật ký (`audit_logs`, `document_chunks`).

## Implementation Notes

- Cấu hình kết nối trong [backend/src/app.module.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/app.module.ts):
  ```typescript
  TypeOrmModule.forRootAsync({
    useFactory: (configService: ConfigService) => ({
      type: 'postgres',
      host: configService.get('DB_HOST', 'localhost'),
      port: configService.get<number>('DB_PORT', 5432),
      username: configService.get('DB_USERNAME'),
      password: configService.get('DB_PASSWORD'),
      database: configService.get('DB_NAME'),
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production' && process.env.TYPEORM_SYNC === 'true',
      extra: { max: 100, connectionTimeoutMillis: 30000, idleTimeoutMillis: 10000 },
    }),
  })
  ```

## Related Decisions

- [ADR-0001](0001-nestjs-fastify-backend-runtime.md): NestJS Backend Engine.
- [ADR-0007](0007-rbac-casl-security-and-audit-trail.md): RBAC & Audit Trail Schema.
