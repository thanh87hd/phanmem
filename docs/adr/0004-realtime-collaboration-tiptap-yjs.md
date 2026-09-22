# ADR-0004: Kiến Trúc Biên Tập Hồ Sơ Kiểm Toán Cộng Tác Thời Gian Thực (Tiptap + Yjs + WebSockets)

## Status

Accepted

## Date

2026-01-20

## Deciders

Product Architect, Senior Full-stack Engineer, Lead Business Analyst

## Context

Trong các cuộc kiểm toán thực địa tại chi nhánh LPBank, các thành viên trong đoàn kiểm toán thường xuyên phải cùng soạn thảo, soát xét và hoàn thiện:
- Biên bản làm việc kiểm toán (Mẫu MB04).
- Dự thảo Báo cáo kiểm toán (Mẫu MB01B).
- Các nhận xét, bằng chứng và giải trình của đơn vị được kiểm toán (Auditee).

Trước đây, khi dùng file Word truyền thống đính kèm qua email, thường xuyên xảy ra tình trạng:
1. Ghi đè phiên bản của nhau (File lock / version conflict).
2. Mất dấu vết chỉnh sửa của từng kiểm toán viên.
3. Chậm trễ trong việc tổng hợp ý kiến của Trưởng đoàn và KTV thành viên.

## Decision Drivers

* **Cộng tác đồng thời (Concurrent Multi-user Editing)**: Cho phép nhiều kiểm toán viên cùng mở và gõ nội dung trên một văn bản mà không bị ghi đè dữ liệu.
* **Thuật toán giải quyết xung đột chuẩn xác (Conflict-free Replicated Data Types - CRDT)**: Bảo đảm tính nhất quán cuối cùng (Eventual Consistency) ngay cả khi mạng chập chờn.
* **Trải nghiệm Rich-text quen thuộc**: Hỗ trợ định dạng bảng, gạch đầu dòng, tô màu, đánh số, heading tương tự Microsoft Word.
* **Độc lập máy chủ On-Premise**: Không phụ thuộc vào các dịch vụ SaaS đám mây công cộng bên ngoài (Google Docs, Office 365) nhằm đáp ứng yêu cầu bảo mật thông tin ngân hàng.

## Considered Options

### Option 1: Tiptap Editor + Yjs (CRDT) + y-websocket (Được chọn)
- **Ưu điểm**:
  - Tiptap dựa trên ProseMirror – framework soạn thảo văn bản mạnh mẽ, mở rộng plugin dễ dàng.
  - Yjs là thư viện CRDT có hiệu năng cao nhất hiện nay, tiêu tốn ít RAM và đồng bộ delta rất nhẹ.
  - `y-websocket` chạy độc lập trên máy chủ Node.js cục bộ của ngân hàng, không gửi dữ liệu ra Internet.
  - Hỗ trợ hiển thị con trỏ chuột thời gian thực (Awareness/Presence) của từng thành viên trong đoàn.
- **Nhược điểm**: Cần duy trì một tiến trình WebSocket server nhỏ (`backend/src/collaboration/server.ts`) hoặc cổng WSS riêng.

### Option 2: Quản lý khóa văn bản theo kiểu truyền thống (Pessimistic Lock)
- **Ưu điểm**: Dễ cài đặt (chỉ cần cờ `isLockedBy`).
- **Nhược điểm**: Tại một thời điểm chỉ có 1 người được sửa, gây nghẽn tiến độ làm việc của đoàn kiểm toán khi gấp rút hoàn thành báo cáo.

### Option 3: Operational Transformation (OT) như ShareDB
- **Ưu điểm**: Thuật toán truyền thống như Google Docs.
- **Nhược điểm**: Cài đặt phức tạp hơn CRDT, khó quản lý state offline khi mạng chập chờn so với Yjs.

## Decision

Chúng tôi quyết định chọn giải pháp **Tiptap Rich-Text Editor kết hợp thư viện Yjs CRDT và máy chủ WebSocket nội bộ (`y-websocket`)** để cung cấp tính năng đồng biên tập thời gian thực cho hồ sơ kiểm toán.

## Consequences

### Positive
- Nhiều kiểm toán viên có thể đồng thời soạn thảo các phần khác nhau trong Biên bản MB04 mà không xảy ra xung đột.
- Trưởng đoàn kiểm toán có thể quan sát trực tiếp tiến độ soạn thảo và con trỏ của từng kiểm toán viên.
- Toàn bộ dữ liệu được mã hóa và truyền tải trong mạng nội bộ ngân hàng qua kênh WSS bảo mật.

### Negative
- Cần cấu hình reverse proxy trên Nginx để chuyển tiếp các kết nối WebSocket (`Upgrade $http_upgrade`, `Connection "upgrade"`).

## Implementation Notes

- Backend Collaboration Server: [backend/src/collaboration/server.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/collaboration/server.ts).
- Khởi chạy qua lệnh: `npm run collab` hoặc tích hợp trong Docker stack (`Dockerfile.collab`).
- Frontend sử dụng:
  ```typescript
  import { useEditor } from '@tiptap/react';
  import Collaboration from '@tiptap/extension-collaboration';
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
  import * as Y from 'yjs';
  import { WebsocketProvider } from 'y-websocket';
  ```

## Related Decisions

- [ADR-0003](0003-react19-vite-ant-design-frontend.md): Frontend Architecture.
