/**
 * Bộ lọc "KTV có thuộc Đoàn kiểm toán" trên cột jsonb `teamMembers`
 * (AuditEngagement.teamMembers: { userId, fullName, role }[]).
 *
 * ⚠️ BỐI CẢNH LỖI ĐÃ SỬA (TC-WP-03 / phân quyền dữ liệu theo đoàn):
 * Các service trước đây lọc bằng chuỗi con:
 *     CAST(teamMembers AS text) ILIKE '%"userId":%<id>%'
 * Cách này SAI (false positive). Ví dụ KTV có id = 2 sẽ khớp với đoàn chỉ chứa
 * `"userId":24`, vì ký tự `%` đầu tiên khớp rỗng rồi ký tự `2` được so với chữ
 * số đầu của `24`. Hệ quả: KTV nhìn thấy cuộc kiểm toán / giấy tờ làm việc /
 * kiến nghị mà mình KHÔNG được phân công → rò rỉ dữ liệu ngoài phạm vi.
 *
 * Dùng toán tử containment `@>` để so khớp CHÍNH XÁC theo giá trị số.
 * Mọi nơi lọc theo teamMembers PHẢI dùng 2 helper dưới đây để tránh tái phát lỗi.
 *
 * ⚠️ BỐI CẢNH LỖI PRODUCTION ĐÃ SỬA (TC-FIND-01/02 — HTTP 500):
 * Cột `audit_engagements.teamMembers` trên production vẫn là kiểu `text`
 * (migration `migrate-team-members-jsonb.sql` nằm NGOÀI pipeline TypeORM nên
 * chưa từng chạy), trong khi entity khai báo `jsonb`. Mệnh đề cũ
 *     `teamMembers @> :jsonUser::jsonb`
 * khiến PostgreSQL báo `operator does not exist: text @> jsonb` → NestJS nuốt
 * thành lỗi 500 cho MỌI kiểm toán viên (chỉ tài khoản đặc quyền đi nhánh khác
 * mới không sập). Vì vậy mệnh đề BẮT BUỘC phải ép kiểu `::jsonb` tường minh —
 * xem `teamMembersContainsClause`.
 */

/**
 * Sinh mệnh đề SQL lọc thành viên đoàn theo `userId`.
 *
 * Ép kiểu `::jsonb` ở BÊN TRÁI là chủ ý, không phải dư thừa:
 *  - Nếu cột đã là `jsonb` → cast đồng nhất, không đổi hành vi.
 *  - Nếu cột còn là `text`   → PostgreSQL parse JSON tại chỗ thay vì báo lỗi
 *    `operator does not exist: text @> jsonb`.
 * Nhờ vậy code đúng trên CẢ HAI kiểu cột, nên KHÔNG phụ thuộc thứ tự deploy:
 * pipeline giải nén `backend/dist` TRƯỚC khi chạy migration, và migration có
 * thể thất bại mà deploy vẫn tiếp tục.
 *
 * ⚠️ BẮT BUỘC có dấu ngoặc kép quanh tên cột (\`"teamMembers"\`):
 * Đây là SQL THÔ (raw), không qua TypeORM alias-mapping. PostgreSQL hạ chữ thường
 * mọi định danh KHÔNG được trích dẫn, nên \`engagement.teamMembers\` trở thành
 * \`engagement.teammembers\` → lỗi \`column engagement.teammembers does not exist\`
 * → HTTP 500 cho mọi kiểm toán viên. Lỗi này CHỈ lộ ra khi chạy trên PostgreSQL
 * thật; toàn bộ unit test đều mock repository nên không phát hiện được.
 *
 * @param alias alias của bảng audit_engagements trong query builder.
 */
export function teamMembersContainsClause(alias: string): string {
  return `${alias}."teamMembers"::jsonb @> :jsonUser::jsonb`;
}

/**
 * Sinh giá trị tham số jsonb tương ứng cho mệnh đề trên.
 * `[{ userId }]` là dạng containment hợp lệ: mảng phải chứa một object có
 * đúng cặp khoá/giá trị này (các khoá khác như fullName/role được bỏ qua).
 */
export function teamMembersJsonParam(userId?: number | null): string {
  const id = Number(userId);
  // FAIL-CLOSED: nếu userId không hợp lệ (undefined/NaN/<=0) thì KHÔNG được trả về
  // '{}' — vì `teamMembers @> '[{}]'::jsonb` khớp với MỌI đoàn có ít nhất một
  // thành viên (mọi object đều chứa object rỗng), tức là mở toàn bộ dữ liệu.
  // Dùng sentinel -1 (id nhân sự luôn là số nguyên dương trong hệ thống).
  if (!Number.isInteger(id) || id <= 0) {
    return '[{"userId":-1}]';
  }
  return JSON.stringify([{ userId: id }]);
}
