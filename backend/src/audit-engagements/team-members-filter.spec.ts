import {
  teamMembersContainsClause,
  teamMembersJsonParam,
} from '../common/utils/team-members-filter.util';

/**
 * TC-WP-03 / Phân quyền dữ liệu theo Đoàn kiểm toán.
 *
 * Bộ lọc "KTV có trong đoàn" trước đây dùng chuỗi con
 *   CAST(teamMembers AS text) ILIKE '%"userId":%<id>%'
 * và bị FALSE POSITIVE. Spec này khoá lại hành vi ĐÚNG (jsonb containment `@>`)
 * và ghi lại bằng chứng lỗi cũ để không tái phát khi refactor.
 */
describe('TeamMembers Filter Logic (TC-WP-03)', () => {
  /**
   * Mô phỏng đúng ngữ nghĩa của toán tử Postgres `jsonb @> '[{"userId": N}]'`:
   * mảng phải chứa một object có khoá `userId` bằng N (so khớp theo giá trị).
   */
  const jsonbContainsUser = (
    teamMembers: unknown,
    searchUserId: number,
  ): boolean => {
    if (!Array.isArray(teamMembers)) return false;
    return teamMembers.some(
      (m: any) => m && typeof m === 'object' && m.userId === searchUserId,
    );
  };

  /**
   * Mô phỏng mẫu ILIKE CŨ đã gây lỗi, dùng để chứng minh false positive là thật.
   * `%` trong LIKE khớp với 0..n ký tự bất kỳ.
   */
  const legacyIlikeMatchesUser = (
    teamMembers: unknown,
    searchUserId: number,
  ): boolean => {
    const textRepr =
      typeof teamMembers === 'string'
        ? teamMembers
        : JSON.stringify(teamMembers ?? null);
    const regex = new RegExp(`"userId":.*${searchUserId}.*`, 'i');
    return regex.test(textRepr.replace(/\s+/g, ''));
  };

  describe('Helper sinh mệnh đề SQL', () => {
    it('sinh mệnh đề jsonb containment với đúng alias', () => {
      expect(teamMembersContainsClause('eng')).toBe(
        'eng."teamMembers"::jsonb @> :jsonUser::jsonb',
      );
      expect(teamMembersContainsClause('engagement')).toBe(
        'engagement."teamMembers"::jsonb @> :jsonUser::jsonb',
      );
    });

    it('TC-FIND-01/02: BẮT BUỘC ép kiểu ::jsonb ở bên trái toán tử @>', () => {
      // Regression: production từng chạy `teamMembers @> :jsonUser::jsonb` trên
      // cột kiểu `text` (migration migrate-team-members-jsonb.sql nằm ngoài
      // pipeline TypeORM) → PostgreSQL báo `operator does not exist: text @> jsonb`
      // → NestJS nuốt thành HTTP 500 cho mọi kiểm toán viên ở GET /audit-findings.
      // Cast tường minh khiến mệnh đề đúng trên CẢ cột `text` lẫn `jsonb`,
      // nên không phụ thuộc thứ tự deploy (dist được giải nén trước migration).
      const clause = teamMembersContainsClause('engagement');
      expect(clause).toContain('engagement."teamMembers"::jsonb @>');
      // Không được tồn tại mệnh đề thiếu cast.
      expect(clause.includes('teamMembers @>')).toBe(false);
    });

    it('TC-FIND-01/02: BẮT BUỘC trích dẫn tên cột "teamMembers" (PostgreSQL hạ chữ thường)', () => {
      // Regression THẬT đã gặp khi chạy trên PostgreSQL: mệnh đề SQL thô
      //   engagement.teamMembers::jsonb @> ...
      // bị PostgreSQL hạ thành engagement.teammembers -> loi
      //   column engagement.teammembers does not exist
      // -> HTTP 500 cho mọi kiểm toán viên. Unit test cũ (mock repository) KHÔNG
      // phát hiện được vì không hề chạy SQL thật.
      for (const alias of ['eng', 'engagement', 'wp', 'rec']) {
        const clause = teamMembersContainsClause(alias);
        expect(clause).toContain(alias + '."teamMembers"');
        // Tuyệt đối không được có dạng không trích dẫn.
        const unquoted = new RegExp(alias.replace('.', '\\.') + '\\.teamMembers(?![\"\'])');
        expect(unquoted.test(clause)).toBe(false);
      }
    });

    it('sinh tham số jsonb là mảng chứa userId dạng số (không phải chuỗi)', () => {
      const param = teamMembersJsonParam(24);
      expect(param).toBe('[{"userId":24}]');
      expect(JSON.parse(param)).toEqual([{ userId: 24 }]);
    });

    it('FAIL-CLOSED: userId không hợp lệ không được khớp với mọi đoàn', () => {
      // `foo @> '[{}]'::jsonb` luôn TRUE với mọi mảng object → nếu helper trả về
      // '{}' khi thiếu userId thì toàn bộ dữ liệu sẽ bị lộ. Sentinel -1 an toàn
      // vì id nhân sự luôn là số nguyên dương.
      for (const invalid of [undefined, null, NaN, 0, -5, 'abc'] as any[]) {
        const param = teamMembersJsonParam(invalid);
        expect(param).toBe('[{"userId":-1}]');
        expect(JSON.parse(param)).not.toEqual([{}]);
      }
      // Chứng minh sentinel -1 thực sự không khớp dữ liệu thật:
      expect(jsonbContainsUser([{ userId: 24 }], -1)).toBe(false);
    });
  });

  describe('Ngữ nghĩa so khớp', () => {
    it('khớp khi KTV thực sự có trong đoàn', () => {
      const teamMembers = [
        { userId: 1, fullName: 'KTV Nguyen Van A', role: 'Auditor' },
        { userId: 5, fullName: 'KTV Tran Thi B', role: 'Member' },
      ];

      expect(jsonbContainsUser(teamMembers, 1)).toBe(true);
      expect(jsonbContainsUser(teamMembers, 5)).toBe(true);
      expect(jsonbContainsUser(teamMembers, 99)).toBe(false);
    });

    it('KHÔNG khớp nhầm KTV id=1 khi đoàn chỉ có id=10 hoặc 15', () => {
      const teamMembers = [
        { userId: 10, fullName: 'KTV Nguyen Van M' },
        { userId: 15, fullName: 'KTV Le Thi N' },
      ];

      // Đây là lỗi rò rỉ dữ liệu mà bộ lọc ILIKE cũ mắc phải:
      expect(legacyIlikeMatchesUser(teamMembers, 1)).toBe(true);
      // Bộ lọc jsonb containment thì chính xác:
      expect(jsonbContainsUser(teamMembers, 1)).toBe(false);
      expect(jsonbContainsUser(teamMembers, 10)).toBe(true);
      expect(jsonbContainsUser(teamMembers, 15)).toBe(true);
    });

    it('KHÔNG khớp nhầm KTV id=2 khi đoàn chỉ có id=24', () => {
      const teamMembers = [{ userId: 24, fullName: 'KTV Datnc' }];

      expect(legacyIlikeMatchesUser(teamMembers, 2)).toBe(true);
      expect(jsonbContainsUser(teamMembers, 2)).toBe(false);
      expect(jsonbContainsUser(teamMembers, 24)).toBe(true);
    });

    it('không phụ thuộc khoảng trắng/định dạng JSON của dữ liệu lưu', () => {
      const stringified = '[{"userId": 42, "fullName": "KTV Datnc"}]';
      expect(jsonbContainsUser(JSON.parse(stringified), 42)).toBe(true);
      expect(jsonbContainsUser(JSON.parse(stringified), 4)).toBe(false);
    });

    it('xử lý an toàn mảng rỗng, null, undefined', () => {
      expect(jsonbContainsUser([], 1)).toBe(false);
      expect(jsonbContainsUser(null, 1)).toBe(false);
      expect(jsonbContainsUser(undefined, 1)).toBe(false);
    });
  });
});
