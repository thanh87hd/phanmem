import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;

  // ------------------------------------------------------------------
  // Fake query builder cho findAll(): ghi lại các predicate (where-clause)
  // mà service gửi xuống repository, và áp dụng chính các predicate đó
  // lên một dataset in-memory để kiểm tra dữ liệu trả về thực tế.
  // ------------------------------------------------------------------
  let qbRows: any[] = [];
  let qbPredicates: Array<{ sql: string; params?: any }> = [];

  const applyPredicate = (row: any, sql: string, params: any): boolean => {
    if (sql.includes("user.status = 'Active'")) {
      // (user.status = 'Active' OR (user.status IS NULL AND user.isActive = true))
      return (
        row.status === 'Active' ||
        ((row.status === null || row.status === undefined) &&
          row.isActive === true)
      );
    }
    if (sql === 'user.status = :st') {
      return row.status === params.st;
    }
    if (sql === 'user.department = :dept') {
      return row.department === params.dept;
    }
    throw new Error(`Fake query builder chưa hỗ trợ predicate: ${sql}`);
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn((sql: string, params?: any) => {
      qbPredicates.push({ sql, params });
      return mockQueryBuilder;
    }),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(async () =>
      qbRows.filter((row) =>
        qbPredicates.every((p) => applyPredicate(row, p.sql, p.params)),
      ),
    ),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should create a user and hash password', async () => {
    const userData = { username: 'newuser', password: 'plainpassword' };
    mockUserRepo.create.mockReturnValue(userData);
    mockUserRepo.save.mockResolvedValue({ ...userData, id: 1 });

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

    const result = await service.create(userData as any);
    expect(result).toBeDefined();
    expect(mockUserRepo.save).toHaveBeenCalled();
  });

  it('should find user by username', async () => {
    mockUserRepo.findOne.mockResolvedValue({ username: 'test' });
    const result = await service.findOneByUsername('test');
    expect(result?.username).toBe('test');
  });

  // ==================================================================
  // UAT TC-SYS-01 — "Quản Lý Hồ Sơ KTV & Lọc Vòng Đời Nhân Sự"
  // (docs/04_Kich_Ban_Kiem_Thu_UAT_KTNB_4.0.md)
  // Tab Đang công tác (Active) / Đã điều chuyển (Transferred) / Đã nghỉ việc (Resigned)
  // ==================================================================
  describe('TC-SYS-01 — findAll(): lọc vòng đời nhân sự', () => {
    const ACTIVE_PREDICATE =
      "(user.status = 'Active' OR (user.status IS NULL AND user.isActive = true))";

    beforeEach(() => {
      qbRows = [
        {
          id: 1,
          username: 'active',
          fullName: 'KTV Đang Công Tác',
          status: 'Active',
          isActive: true,
          department: 'Ban KTNB',
          passwordHash: 'secret-hash',
        },
        {
          id: 2,
          username: 'legacy-active',
          fullName: 'KTV Cũ Chưa Có Cột Status',
          status: null,
          isActive: true,
          department: 'Ban KTNB',
          passwordHash: 'secret-hash',
        },
        {
          id: 3,
          username: 'transferred',
          fullName: 'KTV Đã Điều Chuyển',
          status: 'Transferred',
          isActive: false,
          department: 'Khối QTRR',
        },
        {
          id: 4,
          username: 'resigned',
          fullName: 'KTV Đã Nghỉ Việc',
          status: 'Resigned',
          isActive: false,
          department: 'Ban KTNB',
        },
      ];
      qbPredicates = [];
      mockUserRepo.findOne.mockReset();
      mockUserRepo.update.mockReset();
      mockUserRepo.save.mockReset();
      mockUserRepo.delete.mockReset();
      mockUserRepo.remove.mockReset();
      mockUserRepo.createQueryBuilder.mockClear();
      mockQueryBuilder.leftJoinAndSelect.mockClear();
      mockQueryBuilder.andWhere.mockClear();
      mockQueryBuilder.orderBy.mockClear();
      mockQueryBuilder.getMany.mockClear();
    });

    it('tab "Active" chỉ gửi predicate nhân sự đang hoạt động và trả về đúng nhóm Active', async () => {
      const result = await service.findAll(undefined, { status: 'Active' });

      expect(qbPredicates.map((p) => p.sql)).toContain(ACTIVE_PREDICATE);
      // Không có predicate ép status = 'Transferred'/'Resigned'
      expect(qbPredicates.some((p) => p.params && p.params.st)).toBe(false);
      expect(result.map((u: any) => u.username)).toEqual([
        'active',
        'legacy-active',
      ]);
    });

    it('tab "Transferred" gửi tham số status = Transferred xuống repository', async () => {
      const result = await service.findAll(undefined, {
        status: 'Transferred',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :st',
        { st: 'Transferred' },
      );
      expect(qbPredicates.map((p) => p.sql)).not.toContain(ACTIVE_PREDICATE);
      expect(result.map((u: any) => u.username)).toEqual(['transferred']);
    });

    it('tab "Resigned" gửi tham số status = Resigned xuống repository', async () => {
      const result = await service.findAll(undefined, { status: 'Resigned' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.status = :st',
        { st: 'Resigned' },
      );
      expect(result.map((u: any) => u.username)).toEqual(['resigned']);
    });

    it('includeInactive = false ẩn cả nhân sự Transferred lẫn Resigned', async () => {
      const result = await service.findAll(undefined, {
        includeInactive: false,
      });

      expect(qbPredicates.map((p) => p.sql)).toContain(ACTIVE_PREDICATE);
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'user.status = :st',
        expect.anything(),
      );
      expect(result.map((u: any) => u.username)).toEqual([
        'active',
        'legacy-active',
      ]);
      // Bảo mật: hash mật khẩu không được trả ra ngoài
      expect((result[0] as any).passwordHash).toBeUndefined();
    });

    it('includeInactive = "false" (query param dạng chuỗi) cũng ẩn nhân sự inactive', async () => {
      const result = await service.findAll(undefined, {
        includeInactive: 'false',
      });

      expect(qbPredicates.map((p) => p.sql)).toContain(ACTIVE_PREDICATE);
      expect(result.map((u: any) => u.username)).toEqual([
        'active',
        'legacy-active',
      ]);
    });

    it('includeInactive = true trả về cả nhân sự đã điều chuyển / nghỉ việc', async () => {
      const result = await service.findAll(undefined, {
        includeInactive: true,
      });

      expect(qbPredicates.map((p) => p.sql)).not.toContain(ACTIVE_PREDICATE);
      expect(result.map((u: any) => u.username)).toEqual([
        'active',
        'legacy-active',
        'transferred',
        'resigned',
      ]);
    });

    it('user không phải admin (theo role name) bị giới hạn theo department', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 42,
        department: 'Ban KTNB',
        jobTitle: 'Kiểm toán viên',
        role: { name: 'Kiểm toán viên' },
      });

      const result = await service.findAll(
        { userId: 42 },
        { includeInactive: true },
      );

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: 42 },
        relations: ['role'],
      });
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.department = :dept',
        { dept: 'Ban KTNB' },
      );
      expect(result.map((u: any) => u.username)).toEqual([
        'active',
        'legacy-active',
        'resigned',
      ]);
    });

    it('user admin (role name chứa "admin") không bị giới hạn department', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        department: 'Ban KTNB',
        jobTitle: 'Chuyên viên',
        role: { name: 'Admin' },
      });

      const result = await service.findAll(
        { userId: 1 },
        { includeInactive: true },
      );

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalledWith(
        'user.department = :dept',
        expect.anything(),
      );
      expect(result).toHaveLength(qbRows.length);
    });

    it('dựng query với join role và sắp xếp theo user.id ASC', async () => {
      await service.findAll(undefined, { includeInactive: true });

      expect(mockUserRepo.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'user.role',
        'role',
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.id', 'ASC');
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
    });

    it('bảo mật: người dùng KTV thông thường không đọc được các trường nhạy cảm', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 42,
        department: 'Ban KTNB',
        jobTitle: 'Kiểm toán viên',
        role: { name: 'Kiểm toán viên' },
      });

      const sampleUserWithSensitiveData = {
        id: 1,
        username: 'target.user',
        department: 'Ban KTNB',
        failedLoginAttempts: 3,
        lockedUntil: new Date(),
        lastLoginIp: '192.168.1.100',
        passwordResetExpires: new Date(),
        twoFactorEnabled: true,
        birthDate: '1990-01-01',
        employeeId: 'EMP001',
      };
      qbRows = [sampleUserWithSensitiveData];

      const result = await service.findAll(
        { userId: 42 },
        { status: 'ALL' },
      );

      const target = result[0];
      expect(target.failedLoginAttempts).toBeUndefined();
      expect(target.lockedUntil).toBeUndefined();
      expect(target.lastLoginIp).toBeUndefined();
      expect(target.passwordResetExpires).toBeUndefined();
      expect(target.twoFactorEnabled).toBeUndefined();
      expect(target.birthDate).toBeUndefined();
      expect(target.employeeId).toBeUndefined();
      expect(target.username).toBe('target.user');
    });

    it('bảo mật: người dùng Admin đọc được đầy đủ các trường quản trị', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        id: 1,
        department: 'Ban KTNB',
        jobTitle: 'Admin',
        role: { name: 'System Administrator' },
      });

      const sampleUserWithSensitiveData = {
        id: 1,
        username: 'target.user',
        failedLoginAttempts: 3,
        lockedUntil: new Date(),
        lastLoginIp: '192.168.1.100',
        passwordResetExpires: new Date(),
        twoFactorEnabled: true,
        birthDate: '1990-01-01',
        employeeId: 'EMP001',
      };
      qbRows = [sampleUserWithSensitiveData];

      const result = await service.findAll(
        { userId: 1 },
        { status: 'ALL' },
      );

      const target = result[0];
      expect(target.failedLoginAttempts).toBe(3);
      expect(target.lastLoginIp).toBe('192.168.1.100');
      expect(target.twoFactorEnabled).toBe(true);
      expect(target.birthDate).toBe('1990-01-01');
      expect(target.employeeId).toBe('EMP001');
    });
  });

  // ==================================================================
  // UAT TC-SYS-02 — "Thực Hiện Điều Chuyển / Nghỉ Việc Nhân Sự"
  // Bảo toàn lịch sử kiểm toán: KHÔNG xóa cứng record, khôi phục được sau này
  // ==================================================================
  describe('TC-SYS-02 — updateStatus() / restore() / remove() bảo toàn hồ sơ KTV', () => {
    const existingUser = {
      id: 7,
      username: 'ktv07',
      fullName: 'Nguyễn Văn A',
      status: 'Active',
      isActive: true,
      department: 'Ban KTNB',
      passwordHash: 'secret-hash',
    };

    beforeEach(() => {
      mockUserRepo.findOne.mockReset();
      mockUserRepo.update.mockReset();
      mockUserRepo.save.mockReset();
      mockUserRepo.create.mockReset();
      mockUserRepo.delete.mockReset();
      mockUserRepo.remove.mockReset();
      mockUserRepo.findOne.mockResolvedValue({ ...existingUser });
      mockUserRepo.update.mockResolvedValue({ affected: 1 });
    });

    it('điều chuyển nhân sự: ghi status Transferred + isActive false + transferDestination/transferDate/statusReason', async () => {
      await service.updateStatus(7, {
        status: 'Transferred',
        transferDestination: 'Khối QTRR',
        transferDate: '2026-05-01',
        statusReason: 'Điều chuyển công tác sang Khối Quản trị rủi ro',
      });

      expect(mockUserRepo.update).toHaveBeenCalledTimes(1);
      const [id, payload] = mockUserRepo.update.mock.calls[0];
      expect(id).toBe(7);
      expect(payload).toMatchObject({
        status: 'Transferred',
        isActive: false,
        transferDestination: 'Khối QTRR',
        transferDate: '2026-05-01',
        statusReason: 'Điều chuyển công tác sang Khối Quản trị rủi ro',
      });
      // Không set nhầm dữ liệu nghỉ việc khi điều chuyển
      expect(payload.resignationDate).toBeNull();
      expect(payload.statusUpdatedAt).toBeInstanceOf(Date);
      // Không có thao tác xóa cứng nào
      expect(mockUserRepo.delete).not.toHaveBeenCalled();
      expect(mockUserRepo.remove).not.toHaveBeenCalled();
    });

    it('nghỉ việc nhân sự: ghi status Resigned + isActive false + resignationDate', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...existingUser,
        status: 'Transferred',
      });

      await service.updateStatus(7, {
        status: 'Resigned',
        resignationDate: '2026-06-30',
        statusReason: 'Nghỉ việc theo nguyện vọng',
      });

      const [id, payload] = mockUserRepo.update.mock.calls[0];
      expect(id).toBe(7);
      expect(payload).toMatchObject({
        status: 'Resigned',
        isActive: false,
        resignationDate: '2026-06-30',
        statusReason: 'Nghỉ việc theo nguyện vọng',
      });
      expect(payload.transferDate).toBeNull();
      expect(payload.transferDestination).toBeNull();
      expect(payload.statusUpdatedAt).toBeInstanceOf(Date);
      expect(mockUserRepo.delete).not.toHaveBeenCalled();
      expect(mockUserRepo.remove).not.toHaveBeenCalled();
    });

    it('updateStatus trả về hồ sơ đã sanitize (không lộ passwordHash)', async () => {
      const result = await service.updateStatus(7, { status: 'Transferred' });

      expect((result as any).passwordHash).toBeUndefined();
      expect((result as any).id).toBe(7);
    });

    it('updateStatus báo lỗi rõ ràng khi không tìm thấy nhân sự', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateStatus(999, { status: 'Resigned' }),
      ).rejects.toThrow('Không tìm thấy nhân sự với ID 999');
      expect(mockUserRepo.update).not.toHaveBeenCalled();
      expect(mockUserRepo.delete).not.toHaveBeenCalled();
      expect(mockUserRepo.remove).not.toHaveBeenCalled();
    });

    it('remove() soft-delete: chỉ update status Resigned + isActive false, KHÔNG gọi delete/remove của repository', async () => {
      const result: any = await service.remove(7);

      expect(mockUserRepo.delete).not.toHaveBeenCalled();
      expect(mockUserRepo.remove).not.toHaveBeenCalled();
      expect(mockUserRepo.update).toHaveBeenCalledTimes(1);
      const [id, payload] = mockUserRepo.update.mock.calls[0];
      expect(id).toBe(7);
      expect(payload).toMatchObject({
        isActive: false,
        status: 'Resigned',
      });
      expect(payload.statusReason).toEqual(expect.any(String));
      expect(payload.statusUpdatedAt).toBeInstanceOf(Date);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Nguyễn Văn A');
      expect(result.message).toContain('ktv07');
      // Thông điệp khẳng định bảo toàn dữ liệu kiểm toán lịch sử
      expect(result.message).toMatch(/bảo toàn dữ liệu kiểm toán lịch sử/i);
    });

    it('remove() báo lỗi khi không tìm thấy nhân sự', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Không tìm thấy nhân sự với ID 999',
      );
      expect(mockUserRepo.update).not.toHaveBeenCalled();
      expect(mockUserRepo.delete).not.toHaveBeenCalled();
      expect(mockUserRepo.remove).not.toHaveBeenCalled();
    });

    it('restore() đưa nhân sự về Active + isActive true (không tạo/xóa record)', async () => {
      mockUserRepo.findOne.mockResolvedValue({
        ...existingUser,
        status: 'Resigned',
        isActive: false,
      });

      const result = await service.restore(7);

      const [id, payload] = mockUserRepo.update.mock.calls[0];
      expect(id).toBe(7);
      expect(payload).toMatchObject({
        status: 'Active',
        isActive: true,
      });
      expect(payload.statusUpdatedAt).toBeInstanceOf(Date);
      expect(mockUserRepo.delete).not.toHaveBeenCalled();
      expect(mockUserRepo.remove).not.toHaveBeenCalled();
      expect(mockUserRepo.save).not.toHaveBeenCalled();
      expect(mockUserRepo.create).not.toHaveBeenCalled();
      expect((result as any).id).toBe(7);
    });

    it('hồ sơ bị vô hiệu hóa vẫn khôi phục được sau đó (remove -> restore trên cùng bản ghi)', async () => {
      await service.remove(7);
      await service.restore(7);

      expect(mockUserRepo.update).toHaveBeenCalledTimes(2);
      expect(mockUserRepo.update).toHaveBeenNthCalledWith(
        1,
        7,
        expect.objectContaining({ status: 'Resigned', isActive: false }),
      );
      expect(mockUserRepo.update).toHaveBeenNthCalledWith(
        2,
        7,
        expect.objectContaining({ status: 'Active', isActive: true }),
      );
      // Cùng một ID nhân sự, không hề bị xóa cứng nên lịch sử kiểm toán còn nguyên
      expect(mockUserRepo.delete).not.toHaveBeenCalled();
      expect(mockUserRepo.remove).not.toHaveBeenCalled();
    });

    it('restore() báo lỗi khi không tìm thấy nhân sự', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(service.restore(999)).rejects.toThrow(
        'Không tìm thấy nhân sự với ID 999',
      );
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });
  });
});
