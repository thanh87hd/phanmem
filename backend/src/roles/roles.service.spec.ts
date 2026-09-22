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

  it('should remove role', async () => {
    const res = await service.remove(1);
    expect(repo.delete).toHaveBeenCalledWith(1);
    expect(res).toEqual({ success: true });
  });
});
