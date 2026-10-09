import { UnauthorizedException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../users/users.service';

/**
 * TC-AUTH-04 (phiên đăng nhập / đăng xuất) và hồi quy phạm vi dữ liệu theo
 * `teamCode` (TC-WB-01, TC-TASK-01, TC-RP-03).
 *
 * Lỗi đã sửa: `validate()` không trả về `teamCode`/`fullName` trong khi
 * TasksService, AuditEngagementsService và RiskControlMatrixService lọc dữ liệu
 * bằng `user.teamCode`, còn AuditTrail ghi `user.fullName`. Hệ quả: điều kiện
 * `eng.ownerTeam = :team` / `task.teamCode = :teamCode` được so với NULL nên
 * KHÔNG BAO GIỜ khớp → người dùng mất quyền xem dữ liệu của nhóm mình.
 */
describe('JwtStrategy.validate - User Context Contract', () => {
  const JWT_SECRET = 'test-secret-key-with-at-least-32-chars!!';

  const buildStrategy = (
    user: any,
    cacheGet: jest.Mock = jest.fn().mockResolvedValue(null),
  ) => {
    const usersService = {
      findOneByUsername: jest.fn().mockResolvedValue(user),
    } as unknown as UsersService;
    const configService = {
      get: jest.fn().mockReturnValue(JWT_SECRET),
    } as any;
    const cacheManager = { get: cacheGet };

    const strategy = new JwtStrategy(usersService, configService, cacheManager);
    return { strategy, usersService, cacheManager };
  };

  const baseUser = {
    id: 2,
    username: 'datnc3',
    fullName: 'Nguyễn Cảnh Đạt',
    department: 'Phòng Kiểm toán Đơn vị kinh doanh',
    teamCode: 'PKT_DVKD',
    isActive: true,
    lockedUntil: null,
    role: { name: 'Auditor', permissions: 'audit_read,audit_write' },
  };

  const payload = {
    sub: 2,
    username: 'datnc3',
    role: 'Auditor',
    iat: 1700000000,
  };

  const reqWithCookie = (token?: string) => ({
    cookies: token ? { jwt: token } : {},
    headers: {},
  });

  it('trả về đầy đủ userId/username/role/permissions khi token hợp lệ', async () => {
    const { strategy } = buildStrategy(baseUser);

    const result = await strategy.validate(reqWithCookie('valid-token'), payload);

    expect(result).toMatchObject({
      userId: 2,
      username: 'datnc3',
      role: 'Auditor',
      permissions: ['audit_read', 'audit_write'],
      department: 'Phòng Kiểm toán Đơn vị kinh doanh',
      legacyDepartment: 'Phòng Kiểm toán Đơn vị kinh doanh',
    });
  });

  it('trả về teamCode để các bộ lọc phạm vi dữ liệu hoạt động (hồi quy)', async () => {
    const { strategy } = buildStrategy(baseUser);

    const result = await strategy.validate(reqWithCookie('valid-token'), payload);

    expect(result.teamCode).toBe('PKT_DVKD');
    // Nếu thiếu teamCode thì `eng.ownerTeam = :team` bị so với NULL và
    // người dùng cùng nhóm sẽ không thấy cuộc kiểm toán nào.
    expect(result.teamCode).not.toBeUndefined();
  });

  it('trả về fullName để Audit Trail ghi đúng tên người thao tác', async () => {
    const { strategy } = buildStrategy(baseUser);

    const result = await strategy.validate(reqWithCookie('valid-token'), payload);

    expect(result.fullName).toBe('Nguyễn Cảnh Đạt');
  });

  it('trả về mảng permissions rỗng khi role không có permissions', async () => {
    const { strategy } = buildStrategy({
      ...baseUser,
      role: { name: 'Auditee', permissions: null },
    });

    const result = await strategy.validate(reqWithCookie('valid-token'), payload);

    expect(result.permissions).toEqual([]);
  });

  it('từ chối khi tài khoản không tồn tại', async () => {
    const { strategy } = buildStrategy(null);

    await expect(
      strategy.validate(reqWithCookie('valid-token'), payload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('từ chối khi tài khoản đã bị vô hiệu hóa (isActive = false)', async () => {
    const { strategy } = buildStrategy({ ...baseUser, isActive: false });

    await expect(
      strategy.validate(reqWithCookie('valid-token'), payload),
    ).rejects.toThrow('Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.');
  });

  it('từ chối khi tài khoản đang bị khóa (lockedUntil ở tương lai)', async () => {
    const future = new Date(Date.now() + 30 * 60 * 1000);
    const { strategy } = buildStrategy({ ...baseUser, lockedUntil: future });

    await expect(
      strategy.validate(reqWithCookie('valid-token'), payload),
    ).rejects.toThrow('Tài khoản hiện đang bị khóa.');
  });

  it('cho phép đăng nhập khi khóa đã hết hạn (lockedUntil ở quá khứ)', async () => {
    const past = new Date(Date.now() - 60 * 1000);
    const { strategy } = buildStrategy({ ...baseUser, lockedUntil: past });

    await expect(
      strategy.validate(reqWithCookie('valid-token'), payload),
    ).resolves.toMatchObject({ userId: 2 });
  });

  it('TC-AUTH-04: token đã đăng xuất (blacklist) bị từ chối', async () => {
    const cacheGet = jest.fn().mockResolvedValue(true);
    const { strategy } = buildStrategy(baseUser, cacheGet);

    await expect(
      strategy.validate(reqWithCookie('revoked-token'), payload),
    ).rejects.toThrow(
      'Phiên đăng nhập đã kết thúc do tài khoản đã đăng xuất. Vui lòng đăng nhập lại.',
    );
    expect(cacheGet).toHaveBeenCalledWith('blacklist:token:revoked-token');
  });

  it('không tra blacklist khi request không có token (chỉ dùng Bearer header)', async () => {
    const cacheGet = jest.fn().mockResolvedValue(null);
    const { strategy } = buildStrategy(baseUser, cacheGet);

    await strategy.validate(reqWithCookie(undefined), payload);

    expect(cacheGet).not.toHaveBeenCalled();
  });

  it('từ chối khi tài khoản có status không phải Active (Suspended/Resigned)', async () => {
    const { strategy } = buildStrategy({ ...baseUser, status: 'Suspended' });

    await expect(
      strategy.validate(reqWithCookie('valid-token'), payload),
    ).rejects.toThrow('Tài khoản không ở trạng thái hoạt động (Suspended).');
  });

  it('từ chối token được cấp trước thời điểm đổi mật khẩu (passwordChangedAt)', async () => {
    // payload.iat là 1700000000 (giây), mật khẩu đổi lúc 1700000500 * 1000 (sau khi cấp token)
    const { strategy } = buildStrategy({
      ...baseUser,
      passwordChangedAt: new Date(1700000500 * 1000),
    });

    await expect(
      strategy.validate(reqWithCookie('valid-token'), payload),
    ).rejects.toThrow('Mật khẩu tài khoản đã thay đổi. Vui lòng đăng nhập lại.');
  });

  it('chấp nhận token được cấp sau thời điểm đổi mật khẩu (passwordChangedAt)', async () => {
    // payload.iat là 1700000000 (giây), mật khẩu đổi lúc 1699999000 * 1000 (trước khi cấp token)
    const { strategy } = buildStrategy({
      ...baseUser,
      passwordChangedAt: new Date(1699999000 * 1000),
    });

    await expect(
      strategy.validate(reqWithCookie('valid-token'), payload),
    ).resolves.toMatchObject({ userId: 2 });
  });

  it('luôn lấy vai trò (role) cập nhật mới nhất từ DB thay vì payload tĩnh', async () => {
    // Trong token role là 'Admin', nhưng trong DB user đã bị hạ xuống 'Auditor'
    const { strategy } = buildStrategy({
      ...baseUser,
      role: { name: 'Auditor', permissions: 'read' },
    });

    const result = await strategy.validate(reqWithCookie('valid-token'), {
      ...payload,
      role: 'Admin',
    });

    expect(result.role).toBe('Auditor');
  });
});
