# ADR-0007: Kiến Trúc Phân Quyền RBAC, CASL và Nhật Ký Giám Sát Bất Biến (Audit Trail)

## Status

Accepted

## Date

2026-02-10

## Deciders

Chief Audit Executive (CAE), CISO, Security Architect, Lead Backend Engineer

## Context

Là phần mềm phục vụ Khối Kiểm toán Nội bộ của Ngân hàng TMCP Bưu điện Liên Việt (LPBank), hệ thống phải tuân thủ nghiêm ngặt:
1. **Chuẩn mực Kiểm toán Nội bộ Quốc tế IIA (Global Internal Audit Standards 2024)**: Yêu cầu tính độc lập khách quan của kiểm toán viên (Standard 1.2), việc phê duyệt chấp nhận rủi ro của cấp quản lý (Standard 7.3), và công bố tính tuân thủ (Standard 15.1).
2. **Thông tư 13/2018/TT-NHNN của Ngân hàng Nhà nước**: Phân định rõ ràng vai trò giữa Ban Kiểm soát, Giám đốc Khối KTNB, Trưởng phòng, Trưởng đoàn kiểm toán, Kiểm toán viên và Đơn vị được kiểm toán (Auditee).
3. **Tính toàn vẹn của bằng chứng (Evidential Integrity & Non-repudiation)**: Mọi hành động xem, tạo, sửa, xóa, phê duyệt, xuất dữ liệu phải được ghi lại vĩnh viễn trong Audit Trail và không thể bị sửa đổi hoặc xóa bớt bởi bất kỳ ai (kể cả quản trị viên hệ thống).

## Decision Drivers

* **Ma trận phân quyền chi tiết (Granular Permission Matrix)**: 15 vai trò định sẵn với hàng chục quyền hạn chức năng cụ thể (dashboard, working_papers, sign_report, recommendations,...).
* **Kiểm soát truy cập theo ngữ cảnh dữ liệu (Attribute/Context-Based Access Control)**: Kiểm toán viên chỉ được xem hồ sơ của cuộc kiểm toán mà mình được phân công tham gia; Trưởng đoàn chỉ phê duyệt trong phạm vi cuộc kiểm toán của mình.
* **Nhật ký kiểm toán không thể chối bỏ (Tamper-evident Audit Trail)**: Ghi lại IP, User ID, Action, Method, Target Entity, Thời gian chính xác đến mili-giây.
* **Bảo vệ tài khoản đa tầng**: Hạn chế đăng nhập sai (khóa tài khoản tạm thời sau 5 lần sai), hỗ trợ xác thực 2 yếu tố (2FA TOTP), và tích hợp SSO nội bộ (LDAP/Keycloak).

## Considered Options

### Option 1: RBAC kết hợp CASL Ability (`@casl/ability`) + Audit Interceptor (Được chọn)
- **Ưu điểm**:
  - CASL cho phép định nghĩa các quy tắc quyền phức tạp dưới dạng declarative code (`can('read', 'WorkingPaper', { assignedAuditorId: user.id })`).
  - Guards phân quyền thực thi ở tầng Controller (`@UseGuards(JwtAuthGuard, RolesGuard)`).
  - ScopeFilterService tự động gắn điều kiện lọc dữ liệu vào câu truy vấn database dựa trên chức vụ và vai trò người dùng (Lãnh đạo xem toàn bộ, KTV chỉ xem phạm vi được giao).
  - NestJS Interceptor ghi nhật ký tự động (`audit.interceptor.ts`) cho mọi request làm thay đổi dữ liệu mà không cần viết lặp lại trong service.
- **Nhược điểm**: Đòi hỏi lập trình viên phải hiểu rõ cách định nghĩa Ability và ScopeFilter.

### Option 2: Phân quyền theo cờ Boolean đơn giản (isAdmin / isAuditor)
- **Ưu điểm**: Dễ triển khai ban đầu.
- **Nhược điểm**: Không thể đáp ứng các yêu cầu kiểm soát phân quyền chặt chẽ của ngành ngân hàng; dễ dẫn đến lộ lọt thông tin nhạy cảm giữa các đoàn kiểm toán khác nhau.

## Decision

Chúng tôi quyết định áp dụng mô hình bảo mật và phân quyền đa tầng:
1. **Xác thực**: JWT Access Token (hết hạn sau 8 giờ), xác thực 2 yếu tố TOTP (`otplib`), kiểm tra chống brute-force (`failedLoginAttempts`, `lockedUntil`).
2. **Ủy quyền**: Hệ thống 15 nhóm quyền cơ bản (`roles`) kết hợp thư viện **CASL** và **ScopeFilterService**.
3. **Giám sát**: Ghi nhận toàn bộ vết tương tác vào bảng `audit_logs` thông qua **AuditInterceptor** toàn cục.

## Consequences

### Positive
- Đáp ứng 100% các tiêu chí đánh giá bảo mật của Ngân hàng Nhà nước và kiểm toán độc lập bên ngoài.
- Dữ liệu giữa các đoàn kiểm toán và giữa kiểm toán viên với đối tượng kiểm toán được cách ly an toàn.
- Lịch sử truy vết (Audit Trail) minh bạch, phục vụ hữu hiệu cho công tác hậu kiểm và điều tra sự cố nếu có.

### Negative
- Cần bảo đảm hiệu năng ghi của bảng `audit_logs` khi tần suất thao tác cao (đã được đánh index theo `userId`, `createdAt`, `entityName`).

## Implementation Notes

- Interceptor toàn cục: [backend/src/audit-trail/audit.interceptor.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/audit-trail/audit.interceptor.ts).
- Service lọc phạm vi: [backend/src/utils/scope-filter.service.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/utils/scope-filter.service.ts).
- Factory phân quyền CASL: [backend/src/casl/casl-ability.factory.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/casl/casl-ability.factory.ts).
- Entity nhật ký: [backend/src/audit-trail/entities/audit-log.entity.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/audit-trail/entities/audit-log.entity.ts).

## Related Decisions

- [ADR-0001](0001-nestjs-fastify-backend-runtime.md): NestJS Guards & Pipes.
- [ADR-0002](0002-postgresql-as-primary-data-store.md): PostgreSQL Storage.
