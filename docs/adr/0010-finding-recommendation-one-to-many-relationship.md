# ADR 0010: Quan hệ 1-Nhiều giữa Phát hiện (Finding) và Kiến nghị (Recommendation)

## Bối cảnh (Context)
Trong hệ thống, bảng `audit_findings` có trường văn bản `recommendation` (kiểu text), đồng thời hệ thống lại có một bảng riêng biệt `recommendations` liên kết tới phát hiện kiểm toán qua khóa ngoại `findingId`.

Cần quyết định mô hình chuẩn:
- Lựa chọn 1: Gộp `recommendation` vào `audit_findings`, xóa bảng `recommendations` (nếu quan hệ là 1-1).
- Lựa chọn 2: Duy trì bảng `recommendations` là nguồn sự thật duy nhất (Single Source of Truth), thiết lập quan hệ 1-Nhiều (1 Finding -> N Recommendations). Cột `audit_findings.recommendation` chỉ là trường nhập liệu ban đầu / ghi chú tóm tắt và sẽ được chuyển dần thành deprecated.

## Quyết định (Decision)
1. **Lựa chọn Mô hình 1-Nhiều**:
   - Trong thực tiễn nghiệp vụ Kiểm toán Nội bộ Ngân hàng (theo chuẩn IIA GIAS và Thông tư 13/2018/TT-NHNN), một phát hiện kiểm toán (Finding) thường phát sinh **nhiều kiến nghị xử lý** cho các đơn vị/đối tượng khác nhau (ví dụ: Kiến nghị Ban Điều hành sửa đổi quy trình, kiến nghị Chi nhánh thu hồi nợ, kiến nghị Khối CNTT vá lỗ hổng kỹ thuật).
   - Do đó, quan hệ chuẩn là **1 Phát hiện - Nhiều Kiến nghị** (1 Finding to Many Recommendations).
2. **Bảng `recommendations` là nguồn sự thật chuẩn**:
   - Khóa ngoại `findingId` liên kết chặt chẽ tới `audit_findings`.
   - Bổ sung/chuẩn hóa các khóa ngoại: `departmentId` (đơn vị chịu trách nhiệm thực thi), `assignedToId` (cán bộ đầu mối theo dõi), `status`, `targetDate`, `actionPlan`.
3. **Chiến lược loại bỏ trường lặp `audit_findings.recommendation`**:
   - Áp dụng nguyên tắc 3 bước: Dual-read/write -> Read-new/write-new -> Xóa sau đối soát.
   - Khi tạo Finding có kèm text recommendation, hệ thống tự động khởi tạo 1 bản ghi trong bảng `recommendations` tương ứng.
