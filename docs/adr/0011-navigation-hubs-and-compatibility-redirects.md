# ADR 0011: Kiến trúc Điều hướng Hub tập trung & Compatibility Redirects

## Bối cảnh (Context)
Frontend hiện tại có hiện tượng phân mảnh giao diện:
- Có hơn 30+ trang riêng biệt ở cấp root (`/audit-universe`, `/departments`, `/risk-control-matrix`, `/risk-register`, `/risk-assessment`, `/audit-plan`, `/audit-findings`, `/audit-reports`, `/recommendations`, v.v.).
- Đồng thời lại có 3 "Mega Hub":
  1. `RiskAndPlanningHub`: Gom các nội dung rủi ro & kế hoạch.
  2. `FindingsHub`: Gom các nội dung phát hiện, kiến nghị, báo cáo.
  3. `SystemAdminHub`: Gom các nội dung quản trị người dùng, danh mục, cấu hình.
- Sự phân mảnh này dẫn đến người dùng và KTV bị rối mắt, trùng lặp code và giao diện giữa các trang độc lập và các tab trong Hub.

## Quyết định (Decision)
1. **Mega Hubs là Entry Point duy nhất cho người dùng nội bộ**:
   - Mọi nghiệp vụ Kiểm toán Nội bộ được tổ chức vào 3 Hub tập trung.
   - Trạng thái màn hình (Active Tab và Sub-Tab) được đồng bộ hoàn toàn vào **Query String** trên URL:
     - `/risk-and-planning?tab=universe&subTab=departments`
     - `/findings-hub?tab=findings&subTab=all`
     - `/findings-hub?tab=reports&subTab=ratings`
     - `/system-admin?tab=users&subTab=roles`
2. **Compatibility Redirects (Không làm hỏng Bookmark & Phân quyền)**:
   - Toàn bộ các route cũ được giữ lại dưới dạng `<Navigate to="..." replace />` chuyển tiếp về URL chuẩn trong Hub có gắn kèm query string tương ứng.
   - Ví dụ:
     - `/audit-universe` -> `/risk-and-planning?tab=universe`
     - `/departments` -> `/risk-and-planning?tab=universe&subTab=departments`
     - `/audit-findings` -> `/findings-hub?tab=findings`
     - `/recommendations` -> `/findings-hub?tab=recommendations`
3. **Ngoại lệ bắt buộc**:
   - Trang `/auditee-portal` (Cổng thông tin Đơn vị được kiểm toán) phải được **giữ độc lập**, tuyệt đối không redirect vào Hub nội bộ vì đối tượng phân quyền (Auditee) không có quyền truy cập vào không gian nghiệp vụ của KTV nội bộ.
