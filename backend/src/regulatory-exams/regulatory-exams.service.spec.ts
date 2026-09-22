import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RegulatoryExamsService } from './regulatory-exams.service';
import { RegulatoryExam } from './entities/regulatory-exam.entity';
import { RegulatoryFinding } from './entities/regulatory-finding.entity';

describe('RegulatoryExamsService', () => {
  let service: RegulatoryExamsService;
  let examRepo: any;
  let findingRepo: any;

  beforeEach(async () => {
    examRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    findingRepo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegulatoryExamsService,
        { provide: getRepositoryToken(RegulatoryExam), useValue: examRepo },
        {
          provide: getRepositoryToken(RegulatoryFinding),
          useValue: findingRepo,
        },
      ],
    }).compile();

    service = module.get<RegulatoryExamsService>(RegulatoryExamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exam operations', () => {
    it('should find all exams with findings', async () => {
      examRepo.find.mockResolvedValue([{ id: 1, title: 'NHNN Exam' }]);
      const res = await service.findAllExams();
      expect(res).toHaveLength(1);
      expect(examRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: ['findings'],
      });
    });

    it('should find one exam', async () => {
      examRepo.findOne.mockResolvedValue({ id: 1, title: 'NHNN Exam' });
      const res = await service.findOneExam(1);
      expect(res?.id).toBe(1);
    });

    it('should create exam', async () => {
      const dto = { title: 'Thanh tra NHNN 2026' };
      const res = await service.createExam(dto);
      expect(examRepo.create).toHaveBeenCalledWith(dto);
      expect(examRepo.save).toHaveBeenCalled();
      expect(res.id).toBe(1);
    });

    it('should update exam', async () => {
      examRepo.findOne.mockResolvedValue({ id: 1, title: 'Updated' });
      const res = await service.updateExam(1, { title: 'Updated' });
      expect(examRepo.update).toHaveBeenCalledWith(1, { title: 'Updated' });
      expect(res?.title).toBe('Updated');
    });

    it('should delete exam', async () => {
      await service.deleteExam(1);
      expect(examRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('finding operations', () => {
    it('should create finding', async () => {
      const dto = { findingTitle: 'Sai sót hồ sơ tín dụng' };
      const res = await service.createFinding(dto);
      expect(findingRepo.create).toHaveBeenCalledWith(dto);
      expect(findingRepo.save).toHaveBeenCalled();
      expect(res.id).toBe(1);
    });

    it('should update finding', async () => {
      findingRepo.findOne.mockResolvedValue({
        id: 1,
        findingTitle: 'Updated text',
      });
      const res = await service.updateFinding(1, {
        findingTitle: 'Updated text',
      });
      expect(findingRepo.update).toHaveBeenCalledWith(1, {
        findingTitle: 'Updated text',
      });
      expect(res?.findingTitle).toBe('Updated text');
    });

    it('should delete finding', async () => {
      await service.deleteFinding(1);
      expect(findingRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
