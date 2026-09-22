# Sổ Tay Quyết Định Kiến Trúc (Architecture Decision Records - ADR)
## Dự án: LPBank Smart Audit 4.0 (Hệ Thống Quản Lý Kiểm Toán Nội Bộ Toàn Diện)

Thư mục này lưu trữ toàn bộ các Quyết định Kiến trúc Công nghệ quan trọng (ADR) đã được thảo luận, thống nhất và áp dụng vào mã nguồn của hệ thống **LPBank Smart Audit 4.0**.

---

## 📑 Danh Mục Quyết Định (ADR Index)

| Mã ADR | Tiêu Đề Quyết Định | Trạng Thái | Ngày Quyết Định | Phạm Vi Ảnh Hưởng |
| :--- | :--- | :---: | :---: | :--- |
| [ADR-0001](0001-nestjs-fastify-backend-runtime.md) | **Sử Dụng NestJS 11 với Fastify Adapter làm Nền Tảng Backend API** | `Accepted` | 2026-01-10 | Backend Runtime, Throughput, File Upload |
| [ADR-0002](0002-postgresql-as-primary-data-store.md) | **Lựa Chọn PostgreSQL làm Hệ Quản Trị CSDL Trung Tâm** | `Accepted` | 2026-01-12 | Database, ACID, JSONB, TypeORM |
| [ADR-0003](0003-react19-vite-ant-design-frontend.md) | **Kiến Trúc Giao Diện Người Dùng với React 19, Vite 6 và Ant Design** | `Accepted` | 2026-01-15 | Frontend, SPA, Ant Design, TanStack Query |
| [ADR-0004](0004-realtime-collaboration-tiptap-yjs.md) | **Biên Tập Hồ Sơ Kiểm Toán Cộng Tác Thời Gian Thực (Tiptap + Yjs)** | `Accepted` | 2026-01-20 | Working Papers, CRDT, WebSockets |
| [ADR-0005](0005-background-job-queue-bullmq-redis.md) | **Quản Lý Hàng Đợi Tác Vụ Nền Bằng BullMQ và Redis** | `Accepted` | 2026-01-25 | Async Jobs, Report Export, KRI Monitoring |
| [ADR-0006](0006-hybrid-ai-copilot-architecture.md) | **Kiến Trúc Trợ Lý AI Lai Bảo Mật Cục Bộ (Ollama + Python OCR)** | `Accepted` | 2026-02-05 | AI Engine, On-Premise LLM, Python OCR |
| [ADR-0007](0007-rbac-casl-security-and-audit-trail.md) | **Kiến Trúc Phân Quyền RBAC, CASL và Nhật Ký Giám Sát Bất Biến** | `Accepted` | 2026-02-10 | Security, RBAC, IIA Compliance, Audit Log |
| [ADR-0008](0008-single-entity-table-ownership.md) | **Một chủ sở hữu duy nhất cho mỗi bảng TypeORM (Single Entity Table Ownership)** | `Accepted` | 2026-03-22 | Modular Monolith, Bounded Context, TypeORM |
| [ADR-0009](0009-unified-file-asset-and-link-model.md) | **Mô hình File Asset & File Link thống nhất (Unified File Asset and Link Model)** | `Accepted` | 2026-03-22 | Storage, Evidence, Attachment, Working Paper |
| [ADR-0010](0010-finding-recommendation-one-to-many-relationship.md) | **Quan hệ 1-Nhiều giữa Phát hiện (Finding) và Kiến nghị (Recommendation)** | `Accepted` | 2026-03-22 | Finding, Recommendation, Data Integrity |
| [ADR-0011](0011-navigation-hubs-and-compatibility-redirects.md) | **Kiến trúc Điều hướng Hub tập trung & Compatibility Redirects** | `Accepted` | 2026-03-22 | UI/UX, Navigation Hubs, URL Compatibility |
| [ADR-0012](0012-retention-policy-and-external-storage.md) | **Chính sách Lưu trữ Dữ liệu (Retention Policy) & Tách Runtime Data khỏi Codebase** | `Accepted` | 2026-03-22 | Security, Retention, MinIO, Git Hygiene |

---

## 🔄 Vòng Đời Quyết Định Kiến Trúc (ADR Lifecycle)

```
        ┌─────────────┐
        │  Proposed   │
        └──────┬──────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
┌───────────┐     ┌───────────┐
│ Accepted  │     │ Rejected  │
└─────┬─────┘     └───────────┘
      │
 ┌────┴────────────┐
 ▼                 ▼
┌────────────┐   ┌────────────┐
│ Deprecated │   │ Superseded │
└────────────┘   └────────────┘
```

* **Proposed**: Đang được đưa ra thảo luận trong đội ngũ kỹ thuật.
* **Accepted**: Đã được phê duyệt và áp dụng chính thức vào mã nguồn.
* **Rejected**: Đã xem xét nhưng không được chấp thuận áp dụng.
* **Deprecated**: Không còn hiệu lực sử dụng do thay đổi yêu cầu hoặc công nghệ.
* **Superseded**: Đã bị thay thế bởi một quyết định kiến trúc mới hơn.

---

## ✍️ Hướng Dẫn Đề Xuất ADR Mới

Khi có nhu cầu thay đổi kiến trúc, tích hợp công nghệ mới hoặc thay đổi mô hình dữ liệu lõi:
1. Sao chép mẫu [template.md](template.md) thành file mới theo định dạng: `NNNN-ten-quyet-dinh-ngan-gon.md` (với `NNNN` là số thứ tự tăng dần).
2. Điền đầy đủ các phần: **Context**, **Decision Drivers**, **Considered Options**, **Decision**, **Consequences**, và **Implementation Notes**.
3. Tạo Pull Request / đề xuất họp thẩm định kỹ thuật (Architecture Review).
4. Sau khi được duyệt, cập nhật trạng thái thành `Accepted` và bổ sung liên kết vào bảng Index của tệp này.
