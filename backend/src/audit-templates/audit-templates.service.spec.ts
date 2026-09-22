import { Test, TestingModule } from '@nestjs/testing';
import { AuditTemplatesService } from './audit-templates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditTemplate } from './entities/audit-template.entity';

describe('AuditTemplatesService', () => {
  let service: AuditTemplatesService;

  const mockRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    delete: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditTemplatesService,
        { provide: getRepositoryToken(AuditTemplate), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<AuditTemplatesService>(AuditTemplatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should seed default templates if not already present', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await service.onModuleInit();
      expect(mockRepo.findOne).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should skip seeding when templates already exist', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, title: 'Existing' });

      await service.onModuleInit();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return list of templates', async () => {
      mockRepo.find.mockResolvedValue([{ id: 1, title: 'Tín dụng' }]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(mockRepo.find).toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create and save a new template', async () => {
      const dto = { title: 'Mẫu kiểm toán thẻ', domain: 'Card' };
      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('use', () => {
    it('should increment usageCount and update lastUsedAt', async () => {
      const template = { id: 1, usageCount: 5, lastUsedAt: null };
      mockRepo.findOne.mockResolvedValue(template);

      const result = await service.use(1);
      expect(result?.usageCount).toBe(6);
      expect(result?.lastUsedAt).toBeInstanceOf(Date);
      expect(mockRepo.save).toHaveBeenCalledWith(template);
    });

    it('should return null if template not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.use(999);
      expect(result).toBeNull();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return updated template', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, title: 'Updated Title' });

      const result = await service.update(1, { title: 'Updated Title' });
      expect(mockRepo.update).toHaveBeenCalledWith(1, {
        title: 'Updated Title',
      });
      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('remove', () => {
    it('should delete template and return success true', async () => {
      const result = await service.remove(1);
      expect(result).toEqual({ success: true });
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
