import { Test, TestingModule } from '@nestjs/testing';
import { WorkingPaperTemplatesService } from './working-paper-templates.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkingPaperTemplate } from './entities/working-paper-template.entity';

describe('WorkingPaperTemplatesService', () => {
  let service: WorkingPaperTemplatesService;

  const mockRepo = {
    count: jest.fn(),
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
        WorkingPaperTemplatesService,
        {
          provide: getRepositoryToken(WorkingPaperTemplate),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<WorkingPaperTemplatesService>(
      WorkingPaperTemplatesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('seedTemplates', () => {
    it('should seed default templates when repo is empty', async () => {
      mockRepo.count.mockResolvedValue(0);

      await service.seedTemplates();
      expect(mockRepo.count).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should not seed when repo already has items', async () => {
      mockRepo.count.mockResolvedValue(5);

      await service.seedTemplates();
      expect(mockRepo.count).toHaveBeenCalled();
      expect(mockRepo.create).not.toHaveBeenCalled();
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('onModuleInit', () => {
    it('should call seedTemplates on module init', async () => {
      const spy = jest
        .spyOn(service, 'seedTemplates')
        .mockResolvedValue(undefined);
      await service.onModuleInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return list of templates ordered by name ASC', async () => {
      mockRepo.find.mockResolvedValue([{ id: 1, name: 'Template A' }]);

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(mockRepo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });
  });

  describe('findOne', () => {
    it('should return template by id', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, name: 'Template 1' });

      const result = await service.findOne(1);
      expect(result).toEqual({ id: 1, name: 'Template 1' });
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('create', () => {
    it('should create and save a new template', async () => {
      const dto = { name: 'Template New', category: 'General' } as any;
      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalledWith(dto);
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update and return updated template', async () => {
      mockRepo.findOne.mockResolvedValue({ id: 1, name: 'Updated Name' });

      const result = await service.update(1, { name: 'Updated Name' });
      expect(mockRepo.update).toHaveBeenCalledWith(1, { name: 'Updated Name' });
      expect(result?.name).toBe('Updated Name');
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
