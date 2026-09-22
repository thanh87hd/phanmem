import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomFieldsService } from './custom-fields.service';
import { CustomFieldDefinition } from './entities/custom-field.entity';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        { provide: getRepositoryToken(CustomFieldDefinition), useValue: repo },
      ],
    }).compile();

    service = module.get<CustomFieldsService>(CustomFieldsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find all custom fields', async () => {
    repo.find.mockResolvedValue([{ id: 1, fieldName: 'cf_1' }]);
    const res = await service.findAll();
    expect(res).toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith({
      order: { entityType: 'ASC', order: 'ASC' },
    });
  });

  it('should find custom fields by entityType', async () => {
    repo.find.mockResolvedValue([{ id: 1, entityType: 'AuditFinding' }]);
    const res = await service.findByEntity('AuditFinding');
    expect(res).toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith({
      where: { entityType: 'AuditFinding' },
      order: { order: 'ASC' },
    });
  });

  it('should create custom field', async () => {
    const dto = {
      fieldName: 'region',
      entityType: 'AuditFinding',
      label: 'Khu vực',
    };
    const res = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalled();
    expect(res.id).toBe(1);
  });

  it('should update custom field', async () => {
    repo.findOne.mockResolvedValue({ id: 1, label: 'Updated' });
    const res = await service.update(1, { label: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith(1, { label: 'Updated' });
    expect(res?.label).toBe('Updated');
  });

  it('should remove custom field', async () => {
    const res = await service.remove(1);
    expect(repo.delete).toHaveBeenCalledWith(1);
    expect(res).toEqual({ success: true });
  });
});
