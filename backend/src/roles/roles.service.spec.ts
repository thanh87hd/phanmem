import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolesService } from './roles.service';
import { Role } from './entities/role.entity';

describe('RolesService', () => {
  let service: RolesService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      find: jest.fn().mockResolvedValue([]),
      findOneBy: jest.fn().mockResolvedValue(null),
      // remove() loads the role with its users relation (FEAT-3 guard)
      findOne: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(Role), useValue: repo },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create role', async () => {
    const dto = { name: 'AuditLead', description: 'Trưởng đoàn kiểm toán' };
    const res = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalled();
    expect(res.id).toBe(1);
  });

  it('should find all roles', async () => {
    repo.find.mockResolvedValue([{ id: 1, name: 'Admin' }]);
    const res = await service.findAll();
    expect(res).toHaveLength(1);
    expect(repo.find).toHaveBeenCalled();
  });

  it('should find one role by id', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, name: 'Admin' });
    const res = await service.findOne(1);
    expect(res?.name).toBe('Admin');
    expect(repo.findOneBy).toHaveBeenCalledWith({ id: 1 });
  });

  it('should find role by name', async () => {
    repo.findOneBy.mockResolvedValue({ id: 2, name: 'Auditor' });
    const res = await service.findByName('Auditor');
    expect(res?.name).toBe('Auditor');
    expect(repo.findOneBy).toHaveBeenCalledWith({ name: 'Auditor' });
  });

  it('should update role', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, description: 'Updated' });
    const res = await service.update(1, { description: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith(1, { description: 'Updated' });
    expect(res?.description).toBe('Updated');
  });

  it('should remove role when it exists and has no assigned users', async () => {
    repo.findOne.mockResolvedValue({ id: 1, name: 'Auditor', users: [] });

    const res = await service.remove(1);

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      relations: ['users'],
    });
    expect(repo.delete).toHaveBeenCalledWith(1);
    expect(res).toEqual({
      success: true,
      message: 'Đã xóa nhóm quyền "Auditor" thành công.',
    });
  });

  it('should throw when removing a role that does not exist', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(
      'Không tìm thấy nhóm quyền với ID 999',
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('should throw and not delete when the role is still assigned to users', async () => {
    repo.findOne.mockResolvedValue({
      id: 1,
      name: 'AuditLead',
      users: [{ id: 10 }, { id: 11 }],
    });

    await expect(service.remove(1)).rejects.toThrow(
      'Không thể xóa nhóm quyền "AuditLead" vì hiện đang có 2 nhân sự được gán vào nhóm quyền này. Vui lòng gán lại nhóm quyền cho các nhân sự trước khi xóa.',
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
