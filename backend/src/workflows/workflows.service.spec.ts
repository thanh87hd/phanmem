import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowStep } from './entities/workflow-step.entity';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let defRepo: any;
  let stepRepo: any;

  beforeEach(async () => {
    defRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) =>
        Promise.resolve({ ...entity, id: entity.id || 1 }),
      ),
    };

    stepRepo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entities) => Promise.resolve(entities)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: getRepositoryToken(WorkflowDefinition), useValue: defRepo },
        { provide: getRepositoryToken(WorkflowStep), useValue: stepRepo },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll and findByEntity', () => {
    it('should find all workflow definitions with steps', async () => {
      defRepo.find.mockResolvedValue([
        { id: 1, name: 'Audit Workflow', steps: [] },
      ]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(defRepo.find).toHaveBeenCalledWith({
        relations: ['steps'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should find active workflow by entityType', async () => {
      defRepo.findOne.mockResolvedValue({
        id: 1,
        entityType: 'AuditPlan',
        steps: [],
      });
      const result = await service.findByEntity('AuditPlan');
      expect(result?.entityType).toBe('AuditPlan');
      expect(defRepo.findOne).toHaveBeenCalledWith({
        where: { entityType: 'AuditPlan', isActive: true },
        relations: ['steps'],
        order: { steps: { order: 'ASC' } },
      });
    });
  });

  describe('createDefinition and updateDefinition', () => {
    it('should create workflow definition with steps', async () => {
      const data = {
        entityType: 'AuditReport',
        name: 'Report Approval Flow',
        isActive: true,
        steps: [{ stepName: 'Draft' }, { stepName: 'Review' }],
      };

      defRepo.findOne.mockResolvedValue({ id: 1, ...data });

      const result = await service.createDefinition(data);
      expect(defRepo.create).toHaveBeenCalled();
      expect(defRepo.save).toHaveBeenCalled();
      expect(stepRepo.create).toHaveBeenCalledTimes(2);
      expect(stepRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException if workflow to update does not exist', async () => {
      defRepo.findOne.mockResolvedValue(null);
      await expect(service.updateDefinition(999, {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update definition and replace steps', async () => {
      defRepo.findOne
        .mockResolvedValueOnce({ id: 1, name: 'Old Flow' })
        .mockResolvedValueOnce({ id: 1, name: 'New Flow', steps: [] });

      const result = await service.updateDefinition(1, {
        name: 'New Flow',
        isActive: true,
        steps: [{ stepName: 'Step 1' }],
      });

      expect(stepRepo.delete).toHaveBeenCalledWith({ workflowId: 1 });
      expect(stepRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getNextStep', () => {
    it('should return null if workflow or steps not found', async () => {
      defRepo.findOne.mockResolvedValue(null);
      expect(await service.getNextStep('NonExistent', '')).toBeNull();
    });

    it('should return first step if currentStatus is empty', async () => {
      defRepo.findOne.mockResolvedValue({
        id: 1,
        steps: [
          { order: 1, statusValue: 'Draft', stepName: 'Bản thảo' },
          { order: 2, statusValue: 'Submitted', stepName: 'Chờ duyệt' },
        ],
      });

      const next = await service.getNextStep('AuditReport', '');
      expect(next?.statusValue).toBe('Draft');
    });

    it('should return next sequential step', async () => {
      defRepo.findOne.mockResolvedValue({
        id: 1,
        steps: [
          { order: 1, statusValue: 'Draft', stepName: 'Bản thảo' },
          { order: 2, statusValue: 'Submitted', stepName: 'Chờ duyệt' },
          { order: 3, statusValue: 'Approved', stepName: 'Đã duyệt' },
        ],
      });

      const next = await service.getNextStep('AuditReport', 'Draft');
      expect(next?.statusValue).toBe('Submitted');
    });

    it('should return null if currently at last step', async () => {
      defRepo.findOne.mockResolvedValue({
        id: 1,
        steps: [
          { order: 1, statusValue: 'Draft' },
          { order: 2, statusValue: 'Approved' },
        ],
      });

      const next = await service.getNextStep('AuditReport', 'Approved');
      expect(next).toBeNull();
    });
  });

  describe('validatePermission', () => {
    it('should allow Any or empty requiredRole', async () => {
      expect(
        await service.validatePermission({ requiredRole: 'Any' } as any, []),
      ).toBe(true);
      expect(
        await service.validatePermission({ requiredRole: '' } as any, []),
      ).toBe(true);
    });

    it('should allow if user has requiredRole or Admin', async () => {
      expect(
        await service.validatePermission(
          { requiredRole: 'LeadAuditor' } as any,
          ['LeadAuditor'],
        ),
      ).toBe(true);
      expect(
        await service.validatePermission(
          { requiredRole: 'LeadAuditor' } as any,
          ['Admin'],
        ),
      ).toBe(true);
      expect(
        await service.validatePermission(
          { requiredRole: 'LeadAuditor' } as any,
          ['Guest'],
        ),
      ).toBe(false);
    });
  });
});
