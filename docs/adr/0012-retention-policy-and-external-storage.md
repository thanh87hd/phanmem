# ADR 0012: Chính sách Lưu trữ Dữ liệu (Retention Policy) & Tách Runtime Data khỏi Codebase

## Bối cảnh (Context)
Hiện tại trong repository Git và cấu trúc thư mục backend có hơn 8.900 file upload và backup (bao gồm file sao lưu SQL, tệp bằng chứng Word/PDF/Excel đính kèm, logs, v.v.):
- Làm phình to dung lượng git repository.
- Rủi ro lộ dữ liệu nhạy cảm của ngân hàng khi commit các file upload/backup vào phiên bản mã nguồn.
- Không phù hợp với tiêu chuẩn bảo mật dữ liệu tài chính (PCI-DSS, Thông tư 13/2018/TT-NHNN, IIA GIAS).

## Quyết định (Decision)
1. **Tách Biệt Mã Nguồn và Runtime Data**:
   - Mã nguồn (Codebase) chỉ quản lý code, migrations, cấu hình và test fixture tối thiểu.
   - Tuyệt đối không commit file upload runtime, backup database hay bằng chứng kiểm toán thực tế vào Git.
2. **Cấu hình `.gitignore` và Đường dẫn chuẩn**:
   - Loại trừ vĩnh viễn:
     - `backend/uploads/**` (trừ `.gitkeep`)
     - `backend/backups/**` (trừ `.gitkeep`)
     - `*.sql`, `*.dump` phát sinh từ quá trình test/backup.
3. **Chiến lược Lưu trữ Đối tượng (Object Storage)**:
   - Các file bằng chứng (Evidence), báo cáo xuất bản, file đính kèm được lưu trữ tại S3 / MinIO / NAS chuyên dụng của Ngân hàng.
   - CSDL chỉ lưu trữ Metadata: `storageKey`, `originalName`, `checksum` (SHA-256), `mimeType`, `size`.
4. **Chính sách Lưu trữ & Tiêu hủy (Retention Policy)**:
   - Hồ sơ, bằng chứng kiểm toán và audit trail bắt buộc phải lưu trữ tối thiểu **10 năm** (theo quy định pháp lý ngành ngân hàng về hồ sơ kế toán - kiểm toán).
   - Chỉ được xóa/tiêu hủy các file backup/evidence sau khi có văn bản phê duyệt chính thức từ Chủ sở hữu dữ liệu (Data Owner - Trưởng Ban KTNB/BKS) và Bộ phận Tuân thủ (Compliance Officer).
