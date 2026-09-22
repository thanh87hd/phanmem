# ADR 0009: Mô hình File Asset & File Link thống nhất (Unified File Asset and Link Model)

## Bối cảnh (Context)
Hệ thống kiểm toán nội bộ hiện tại có ít nhất 5 cơ chế lưu trữ và quản lý file/evidence rời rạc:
1. Bảng `documents`
2. Bảng `evidences`
3. Cột JSON `WorkingPaper.attachments`
4. Cột JSON `AuditFinding.appendices`
5. Đường dẫn URL phân tán trong `Recommendation` (`evidenceFileUrl`, `evidenceLink`, `remediationEvidenceLink`)

Hậu quả:
- Trùng lặp file vật lý khi một tài liệu bằng chứng được gắn vào nhiều đối tượng (VD: 1 bằng chứng gắn vào cả Working Paper và Finding).
- Khó kiểm soát toàn vẹn bằng chứng (hash SHA-256) và chuỗi hành trình bằng chứng (Chain of Custody).
- Không có một cơ chế thẩm định/xác minh file bằng chứng (Evidence Verification) chuẩn hóa.

## Quyết định (Decision)
1. **Mô hình Dữ liệu 3 Lớp**:
   - `file_assets`: Đại diện cho file vật lý duy nhất được lưu trữ (id, storageKey, originalName, mimeType, size, checksum SHA-256, uploadedById, createdAt).
   - `file_links`: Đại diện cho mối liên kết giữa một `file_asset` với một thực thể nghiệp vụ (id, fileAssetId, ownerType ['WorkingPaper', 'AuditFinding', 'Recommendation', 'Document', ...], ownerId, relationType, caption, metadata, createdAt).
   - `evidence_verifications`: Trạng thái thẩm định bằng chứng của KTV/Trưởng đoàn (fileLinkId, status ['Pending', 'Verified', 'Rejected'], result, verifiedById, verifiedAt).
2. **Nguyên tắc chuyển đổi**:
   - Mở rộng `src/common/storage` thành Gateway truy cập file duy nhất.
   - `Document` và `Evidence` hiện tại đóng vai trò compatibility facade bên trên `file_assets`.
   - Lưu trữ `uploaderSnapshot` trong metadata thay vì drop ngay trường cũ để bảo lưu lịch sử audit trail.
3. **Frontend**:
   - Thống nhất một component `AttachmentManager` dùng chung cho toàn bộ ứng dụng, thay thế các modal upload riêng lẻ.
