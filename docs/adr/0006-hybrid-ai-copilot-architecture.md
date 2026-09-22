# ADR-0006: Kiến Trúc Trợ Lý Trí Tuệ Nhân Tạo Lai (Hybrid AI Copilot & OCR Microservice)

## Status

Accepted

## Date

2026-02-05

## Deciders

Chief Information Security Officer (CISO), AI Lead Engineer, Lead Domain Architect

## Context

Hệ thống LPBank Smart Audit 4.0 tích hợp Trợ lý AI (KITA Copilot) nhằm:
1. Gợi ý đánh giá rủi ro sơ bộ và đề xuất trọng tâm kiểm toán dựa trên cơ sở tri thức nghiệp vụ.
2. Tự động đối soát dữ liệu, phát hiện lỗ hổng quy trình kiểm soát (Process Loopholes).
3. Đọc hiểu và trích xuất thông tin từ tài liệu PDF scan / hóa đơn chứng từ kiểm toán (OCR).

Ràng buộc pháp lý tối thượng của Ngân hàng:
- **Tuyệt đối không gửi dữ liệu khách hàng, số tài khoản, số dư hoặc báo cáo tài chính nội bộ lên các dịch vụ AI Cloud công cộng** (OpenAI, Anthropic Cloud, Google Gemini Cloud) nếu chưa được mã hóa ẩn danh hoặc phê duyệt bảo mật cấp cao.
- Hệ thống phải có khả năng vận hành hoàn toàn Offline / On-Premise khi cần thiết.

## Decision Drivers

* **Tuân thủ quy định An toàn Thông tin Ngân hàng**: Giữ toàn bộ dữ liệu suy luận trong vùng mạng an toàn (DMZ / Private Cloud của Ngân hàng).
* **Kiến trúc RAG (Retrieval-Augmented Generation) dựa trên tri thức nội bộ**: Suy luận dựa trên kho văn bản quy chế ngân hàng (`regulatory_knowledge_base`) và tiền lệ sai phạm (`finding_knowledge_base`).
* **Khả năng tách rời Microservice**: Tiến trình bóc tách OCR tốn nhiều tài nguyên GPU/CPU (Python / PyTorch) cần được tách khỏi tiến trình Backend API chính (Node.js).

## Considered Options

### Option 1: Kiến trúc Lai On-Premise (Ollama / Local LLM + Python OCR Microservice) (Được chọn)
- **Ưu điểm**:
  - Tích hợp Ollama chạy các mô hình nguồn mở tối ưu (Gemma 2, DeepSeek-R1/V3, Llama 3) trực tiếp trên máy chủ của ngân hàng.
  - Tách riêng service OCR viết bằng Python (FastAPI + Marker/PyMuPDF) để xử lý bóc tách chứng từ PDF.
  - Backend NestJS đóng vai trò Gateway điều phối, kiểm soát quyền truy cập và cache kết quả (`ai_response_cache`) để tiết kiệm tài nguyên GPU.
- **Nhược điểm**: Cần máy chủ trang bị GPU (NVIDIA RTX/A100) để đảm bảo tốc độ suy luận nhanh khi có nhiều yêu cầu đồng thời.

### Option 2: Kết nối trực tiếp OpenAI API / Claude API
- **Ưu điểm**: Không cần đầu tư phần cứng GPU tại chỗ; mô hình lớn có độ thông minh cao.
- **Nhược điểm**: Vi phạm chính sách bảo mật dữ liệu nhạy cảm ngân hàng; rủi ro gián đoạn khi kết nối Internet quốc tế gặp sự cố.

## Decision

Chúng tôi quyết định áp dụng **Kiến trúc AI Lai Cục Bộ (Local Hybrid AI Architecture)**:
1. **Mô hình suy luận LLM**: Vận hành qua **Ollama** tại chỗ (`http://localhost:11434`), hỗ trợ các mô hình cục bộ như `gemma2:2b`, `deepseek-coder`.
2. **Dịch vụ Bóc Tách Chứng Từ**: Xây dựng dưới dạng **Python FastAPI Microservice** riêng biệt tại cổng `8000`.
3. **Cơ sở Tri thức Cục bộ (RAG)**: Lưu trữ các đoạn văn bản chuẩn mực quy chế (`document_chunks`) ngay trong PostgreSQL.

## Consequences

### Positive
- Dữ liệu tài chính ngân hàng được bảo mật 100% bên trong mạng nội bộ, đáp ứng tiêu chuẩn kiểm định của NHNN.
- Giảm thiểu độ trễ mạng ra bên ngoài, không phát sinh chi phí tính theo token hàng tháng của các nhà cung cấp đám mây.
- Dễ dàng nâng cấp hoặc thay thế mô hình nền tảng trong tương lai chỉ bằng cách đổi tên model trong Ollama.

### Negative
- Cần cấu hình tài nguyên phần cứng máy chủ (tối thiểu 16GB-32GB RAM, khuyến nghị có GPU chuyên dụng) để đạt tốc độ phản hồi dưới 3 giây.

## Implementation Notes

- Service kết nối Ollama: [backend/src/ai/ollama.service.ts](file:///f:/Phan%20mem%20KTNB%204.0/backend/src/ai/ollama.service.ts).
- Cấu hình trong `.env`:
  ```ini
  OLLAMA_URL=http://localhost:11434
  OCR_SERVICE_URL=http://127.0.0.1:8000/extract
  ```

## Related Decisions

- [ADR-0001](0001-nestjs-fastify-backend-runtime.md): NestJS Backend Engine.
- [ADR-0002](0002-postgresql-as-primary-data-store.md): PostgreSQL RAG Storage.
