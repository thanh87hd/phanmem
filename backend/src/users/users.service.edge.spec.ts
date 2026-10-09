import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserCompetency } from './entities/user-competency.entity';

/**
 * WS2 — bù các khoảng trống của `users.service.spec.ts`.
 *
 * File gốc đã phủ create / findOneByUsername / findAll / updateStatus / restore /
 * remove / update. Chưa được phủ (và đều là bề mặt lộ dữ liệu):
 *   - `sanitizeUser()`: danh sách trường bị xoá và khác biệt giữa người xem có
 *     đặc quyền hay không — nếu xoá nhầm/thiếu trường thì hoặc lộ bí mật
 *     (passwordHash, twoFactorSecret) hoặc vỡ UI quản trị;
 *   - `findOneSafe()`: đường dẫn đọc một nhân sự, phải áp cùng quy tắc che;
 *   - `isPrivilegedUser()`: mặc định fail-safe khi không có user;
 *   - `getCompetencies()` / `updateCompetency()`: trước đây KHÔNG có test nào.
 */

describe('UsersService — edge cases (WS2)', () => {
  let service: UsersService;

  const userRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const competencyRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(UserCompetency),
          useValue: competencyRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ===========================================================================
  // sanitizeUser
  // ===========================================================================
  describe('sanitizeUser()', () => {
    const fullUser = () => ({
      id: 1,
      username: 'ktv01',
      fullName: 'Nguyễn Văn A',
      passwordHash: '$2b$12$hash',
      passwordHistory: '["old"]',
      twoFactorSecret: 'TOTPSECRET',
      twoFactorTempSecret: 'TEMPSECRET',
      passwordResetToken: 'reset-token',
      passwordResetExpires: new Date(),
      twoFactorEnabled: true,
      failedLoginAttempts: 3,
      lockedUntil: new Date(),
      lastLoginIp: '10.0.0.1',
      birthDate: '1990-01-01',
      employeeId: 'EMP001',
      role: { name: 'Kiểm toán viên' },
    });

    it('trả nguyên giá trị falsy (null/undefined) mà không ném lỗi', () => {
      expect(service.sanitizeUser(null)).toBeNull();
      expect(service.sanitizeUser(undefined)).toBeUndefined();
    });

    it('luôn xoá 5 trường bí mật, kể cả với người xem có đặc quyền', () => {
      const out = service.sanitizeUser(fullUser(), true);

      for (const secret of [
        'passwordHash',
        'passwordHistory',
        'twoFactorSecret',
        'twoFactorTempSecret',
        'passwordResetToken',
      ]) {
        expect(out).not.toHaveProperty(secret);
      }
    });

    it('không rò giá trị bí mật qua JSON.stringify', () => {
      const json = JSON.stringify(service.sanitizeUser(fullUser(), true));

      expect(json).not.toContain('$2b$12$hash');
      expect(json).not.toContain('TOTPSECRET');
      expect(json).not.toContain('TEMPSECRET');
      expect(json).not.toContain('reset-token');
    });

    it('người xem CÓ đặc quyền vẫn thấy trường quản trị', () => {
      const out = service.sanitizeUser(fullUser(), true);

      expect(out.failedLoginAttempts).toBe(3);
      expect(out.lockedUntil).toBeInstanceOf(Date);
      expect(out.lastLoginIp).toBe('10.0.0.1');
      expect(out.twoFactorEnabled).toBe(true);
      expect(out.employeeId).toBe('EMP001');
      expect(out.birthDate).toBe('1990-01-01');
    });

    it('người xem KHÔNG đặc quyền bị ẩn 7 trường quản trị/nhạy cảm', () => {
      const out = service.sanitizeUser(fullUser(), false);

      for (const hidden of [
        'failedLoginAttempts',
        'lockedUntil',
        'lastLoginIp',
        'passwordResetExpires',
        'twoFactorEnabled',
        'birthDate',
        'employeeId',
      ]) {
        expect(out).not.toHaveProperty(hidden);
      }
    });

    it('người xem KHÔNG đặc quyền vẫn thấy thông tin nhận diện cơ bản', () => {
      const out = service.sanitizeUser(fullUser(), false);

      expect(out.id).toBe(1);
      expect(out.username).toBe('ktv01');
      expect(out.fullName).toBe('Nguyễn Văn A');
      expect(out.role).toEqual({ name: 'Kiểm toán viên' });
    });

    it('mặc định là chế độ CÓ đặc quyền khi không truyền cờ', () => {
      const out = service.sanitizeUser(fullUser());

      expect(out.failedLoginAttempts).toBe(3);
    });

    it('che được cả mảng người dùng', () => {
      const out = service.sanitizeUser([fullUser(), fullUser()], false);

      expect(Array.isArray(out)).toBe(true);
      expect(out).toHaveLength(2);
      for (const u of out) {
        expect(u).not.toHaveProperty('passwordHash');
        expect(u).not.toHaveProperty('failedLoginAttempts');
      }
    });

    it('mảng rỗng trả về mảng rỗng', () => {
      expect(service.sanitizeUser([], false)).toEqual([]);
    });
  });

  // ===========================================================================
  // isPrivilegedUser
  // ===========================================================================
  describe('isPrivilegedUser()', () => {
    it('không có user → coi là đặc quyền (đường dẫn nội bộ/CLI)', () => {
      expect(service.isPrivilegedUser()).toBe(true);
      expect(service.isPrivilegedUser(null)).toBe(true);
      expect(service.isPrivilegedUser(undefined)).toBe(true);
    });

    it.each([
      [{ role: { name: 'Admin' } }, true],
      [{ role: { name: 'Quản trị hệ thống' } }, true],
      [{ role: 'Trưởng ban KTNB' }, true],
      [{ roleName: 'Lãnh đạo KTNB' }, true],
      [{ role: { name: 'Kiểm toán viên' } }, false],
      [{ role: { name: 'Trưởng phòng KTNB' } }, false],
    ])('user=%j → privileged=%s', (user, expected) => {
      expect(service.isPrivilegedUser(user)).toBe(expected);
    });

    it('nhận diện qua chức danh khối khi role không nói lên điều gì', () => {
      // isAdminRole() chỉ xét chức danh ở cấp khối, KHÔNG xét chuỗi "Admin" thô
      // trong jobTitle — khoá lại đúng ngữ nghĩa hiện hành.
      expect(
        service.isPrivilegedUser({
          role: { name: 'Nhân viên' },
          jobTitle: 'Giám đốc Khối Vận hành',
        }),
      ).toBe(true);
      expect(
        service.isPrivilegedUser({
          role: { name: 'Nhân viên' },
          jobTitle: 'Phó Giám đốc Khối',
        }),
      ).toBe(true);
      expect(
        service.isPrivilegedUser({ role: { name: 'Nhân viên' }, jobTitle: 'Admin' }),
      ).toBe(false);
    });
  });

  // ===========================================================================
  // findOneSafe
  // ===========================================================================
  describe('findOneSafe()', () => {
    const target = {
      id: 9,
      username: 'ktv09',
      fullName: 'Lê Văn C',
      passwordHash: 'hash',
      failedLoginAttempts: 2,
      employeeId: 'EMP009',
      role: { name: 'Kiểm toán viên' },
    };

    it('trả null khi không tìm thấy nhân sự', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneSafe(9, { userId: 1 })).resolves.toBeNull();
    });

    it('người xem là Admin → thấy đầy đủ trường quản trị', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(target) // findOne(9)
        .mockResolvedValueOnce({ id: 1, role: { name: 'Admin' } }); // người xem

      const out = await service.findOneSafe(9, { userId: 1 });

      expect(out.failedLoginAttempts).toBe(2);
      expect(out.employeeId).toBe('EMP009');
      expect(out).not.toHaveProperty('passwordHash');
    });

    it('người xem là KTV → bị ẩn trường quản trị', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce({ id: 2, role: { name: 'Kiểm toán viên' } });

      const out = await service.findOneSafe(9, { userId: 2 });

      expect(out).not.toHaveProperty('failedLoginAttempts');
      expect(out).not.toHaveProperty('employeeId');
      expect(out.username).toBe('ktv09');
    });

    it('tra hồ sơ người xem CÓ kèm quan hệ role (để xét đặc quyền chính xác)', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce({ id: 1, role: { name: 'Admin' } });

      await service.findOneSafe(9, { userId: 1 });

      expect(userRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { id: 1 },
        relations: ['role'],
      });
    });

    it('không tra được hồ sơ người xem → rơi về đánh giá trên token', async () => {
      userRepository.findOne
        .mockResolvedValueOnce(target)
        .mockResolvedValueOnce(null);

      const out = await service.findOneSafe(9, {
        userId: 3,
        role: { name: 'Kiểm toán viên' },
      });

      expect(out).not.toHaveProperty('failedLoginAttempts');
    });

    it('không truyền currentUser → chế độ đặc quyền', async () => {
      userRepository.findOne.mockResolvedValueOnce(target);

      const out = await service.findOneSafe(9);

      expect(out.failedLoginAttempts).toBe(2);
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('currentUser không có userId → dùng đánh giá trên token, không tra thêm', async () => {
      userRepository.findOne.mockResolvedValueOnce(target);

      const out = await service.findOneSafe(9, { role: { name: 'Admin' } });

      expect(out.employeeId).toBe('EMP009');
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // NĂNG LỰC NHÂN SỰ (trước đây không có test)
  // ===========================================================================
  describe('getCompetencies()', () => {
    it('lấy năng lực theo đúng userId', async () => {
      const rows = [{ userId: 7, skillName: 'ISO 27001', rating: 4 }];
      competencyRepository.find.mockResolvedValue(rows);

      await expect(service.getCompetencies(7)).resolves.toEqual(rows);
      expect(competencyRepository.find).toHaveBeenCalledWith({
        where: { userId: 7 },
      });
    });

    it('trả mảng rỗng khi nhân sự chưa có năng lực nào', async () => {
      competencyRepository.find.mockResolvedValue([]);

      await expect(service.getCompetencies(7)).resolves.toEqual([]);
    });
  });

  describe('updateCompetency()', () => {
    it('đã có bản ghi → cập nhật rating và ghi đè notes/category', async () => {
      const existing = {
        userId: 7,
        skillName: 'ISO 27001',
        rating: 2,
        notes: 'cũ',
        skillCategory: 'Core',
      };
      competencyRepository.findOne.mockResolvedValue(existing);
      competencyRepository.save.mockImplementation(async (c) => c);

      const out = await service.updateCompetency(7, 'ISO 27001', 5, 'mới', 'Advanced');

      expect(out).toMatchObject({
        rating: 5,
        notes: 'mới',
        skillCategory: 'Advanced',
      });
      expect(competencyRepository.create).not.toHaveBeenCalled();
    });

    it('đã có bản ghi, không truyền notes/category → giữ nguyên giá trị cũ', async () => {
      const existing = {
        userId: 7,
        skillName: 'ISO 27001',
        rating: 2,
        notes: 'giữ nguyên',
        skillCategory: 'Core',
      };
      competencyRepository.findOne.mockResolvedValue(existing);
      competencyRepository.save.mockImplementation(async (c) => c);

      const out = await service.updateCompetency(7, 'ISO 27001', 4);

      expect(out.rating).toBe(4);
      expect(out.notes).toBe('giữ nguyên');
      expect(out.skillCategory).toBe('Core');
    });

    it('notes = chuỗi rỗng vẫn được ghi (khác với undefined)', async () => {
      const existing = { userId: 7, skillName: 'X', rating: 2, notes: 'cũ' };
      competencyRepository.findOne.mockResolvedValue(existing);
      competencyRepository.save.mockImplementation(async (c) => c);

      const out = await service.updateCompetency(7, 'X', 3, '');

      expect(out.notes).toBe('');
    });

    it('chưa có bản ghi → tạo mới với nhóm mặc định "Core"', async () => {
      competencyRepository.findOne.mockResolvedValue(null);
      competencyRepository.create.mockImplementation((dto) => dto);
      competencyRepository.save.mockImplementation(async (c) => c);

      const out = await service.updateCompetency(7, 'Kỹ năng mới', 3);

      expect(competencyRepository.create).toHaveBeenCalledWith({
        userId: 7,
        skillName: 'Kỹ năng mới',
        rating: 3,
        notes: undefined,
        skillCategory: 'Core',
      });
      expect(out.skillCategory).toBe('Core');
    });

    it('chưa có bản ghi + có nhóm → dùng nhóm được truyền vào', async () => {
      competencyRepository.findOne.mockResolvedValue(null);
      competencyRepository.create.mockImplementation((dto) => dto);
      competencyRepository.save.mockImplementation(async (c) => c);

      const out = await service.updateCompetency(7, 'X', 4, 'ghi chú', 'Digital');

      expect(out.skillCategory).toBe('Digital');
      expect(out.notes).toBe('ghi chú');
    });

    it('tìm bản ghi theo đúng cặp (userId, skillName) — không ghi đè kỹ năng của người khác', async () => {
      competencyRepository.findOne.mockResolvedValue(null);
      competencyRepository.create.mockImplementation((dto) => dto);
      competencyRepository.save.mockImplementation(async (c) => c);

      await service.updateCompetency(7, 'ISO 27001', 3);

      expect(competencyRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 7, skillName: 'ISO 27001' },
      });
    });
  });
});
