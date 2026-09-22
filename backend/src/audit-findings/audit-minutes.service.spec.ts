import { Test, TestingModule } from '@nestjs/testing';
import { AuditMinutesService } from './audit-minutes.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditMinute } from './entities/audit-minute.entity';
import { AuditFinding } from './entities/audit-finding.entity';
import { AuditSample } from './entities/audit-sample.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { AuditMinutesExportService } from './audit-minutes-export.service';
import { NotFoundException } from '@nestjs/common';

describe('AuditMinutesService', () => {
  let service: AuditMinutesService;

  const mockMinuteRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const mockFindingRepo = {
    find: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockSampleRepo = {};

  const mockEngagementRepo = {
    findOne: jest.fn(),
  };

  const mockWpRepo = {
    find: jest.fn().mockResolvedValue([]),
  };

  const mockExportService = {
    generateWord: jest.fn().mockResolvedValue(Buffer.from('word-doc')),
    generateExcel: jest.fn().mockResolvedValue(Buffer.from('excel-sheet')),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditMinutesService,
        { provide: getRepositoryToken(AuditMinute), useValue: mockMinuteRepo },
        {
          provide: getRepositoryToken(AuditFinding),
          useValue: mockFindingRepo,
        },
        { provide: getRepositoryToken(AuditSample), useValue: mockSampleRepo },
        {
          provide: getRepositoryToken(AuditEngagement),
          useValue: mockEngagementRepo,
        },
        { provide: getRepositoryToken(WorkingPaper), useValue: mockWpRepo },
        { provide: AuditMinutesExportService, useValue: mockExportService },
      ],
    }).compile();

    service = module.get<AuditMinutesService>(AuditMinutesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save an audit minute', async () => {
      const dto = { title: 'Biên bản kiểm toán Chi nhánh A', engagementId: 10 };
      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(mockMinuteRepo.create).toHaveBeenCalledWith(dto);
      expect(mockMinuteRepo.save).toHaveBeenCalled();
    });
  });

  describe('findAllByEngagement', () => {
    it('should return minutes for an engagement', async () => {
      mockMinuteRepo.find.mockResolvedValue([{ id: 1, engagementId: 10 }]);

      const result = await service.findAllByEngagement(10);
      expect(result).toHaveLength(1);
      expect(mockMinuteRepo.find).toHaveBeenCalledWith({
        where: { engagementId: 10 },
        relations: ['findings'],
        order: { id: 'DESC' },
      });
    });
  });

  describe('findOne', () => {
    it('should return minute if found', async () => {
      mockMinuteRepo.findOne.mockResolvedValue({ id: 1, title: 'Biên bản 1' });

      const result = await service.findOne(1);
      expect(result).toEqual({ id: 1, title: 'Biên bản 1' });
    });

    it('should throw NotFoundException if not found', async () => {
      mockMinuteRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update minute and record lead review history if isLeadReview=true', async () => {
      const existing = {
        id: 1,
        title: 'Old Title',
        leadReviewCount: 0,
        reviewHistory: [],
      };
      mockMinuteRepo.findOne.mockResolvedValue(existing);

      const updateDto = {
        title: 'New Title',
        isLeadReview: true,
        reviewAction: 'Duyệt biên bản',
        reviewComments: 'Đã hoàn thiện',
      };
      const user = { userId: 5, fullName: 'Trưởng đoàn Tuấn' };

      const result = await service.update(1, updateDto, user);
      expect(result.leadReviewCount).toBe(1);
      expect(result.reviewHistory).toHaveLength(1);
      expect(result.reviewHistory[0].reviewerName).toBe('Trưởng đoàn Tuấn');
      expect(mockMinuteRepo.save).toHaveBeenCalled();
    });

    it('should update minute normally without lead review', async () => {
      const existing = { id: 1, title: 'Old Title' };
      mockMinuteRepo.findOne.mockResolvedValue(existing);

      const result = await service.update(1, { title: 'Updated' });
      expect(result.title).toBe('Updated');
      expect(mockMinuteRepo.save).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove minute', async () => {
      const existing = { id: 1 };
      mockMinuteRepo.findOne.mockResolvedValue(existing);

      await service.remove(1);
      expect(mockMinuteRepo.remove).toHaveBeenCalledWith(existing);
    });
  });

  describe('collateFromWorkingPapers', () => {
    it('should throw NotFoundException if engagement not found', async () => {
      mockEngagementRepo.findOne.mockResolvedValue(null);

      await expect(service.collateFromWorkingPapers(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should collate working papers, create new minute, and link findings', async () => {
      mockEngagementRepo.findOne.mockResolvedValue({
        id: 10,
        branchName: 'Chi nhánh Sài Gòn',
        decisionNo: 'QĐ-100',
        leadAuditorUser: { fullName: 'Trưởng đoàn Nam' },
        teamMembers: [{ fullName: 'KTV Hoa', role: 'KTV Tín dụng' }],
        fieldworkStartDate: '2025-03-01',
        fieldworkEndDate: '2025-03-15',
      });

      mockWpRepo.find.mockResolvedValue([{ id: 101 }, { id: 102 }]);
      mockMinuteRepo.findOne
        .mockResolvedValueOnce(null) // first find
        .mockResolvedValueOnce({
          id: 1,
          title: 'Biên bản kiểm toán tại Chi nhánh Sài Gòn',
        }); // findOne in return

      mockFindingRepo.find.mockResolvedValue([
        { id: 201, operationType: 'TD', riskLevel: 'High', minuteId: null },
        { id: 202, operationType: 'PTD', riskLevel: 'Medium', minuteId: 1 },
      ]);

      const result = await service.collateFromWorkingPapers(10);
      expect(result).toBeDefined();
      expect(mockMinuteRepo.create).toHaveBeenCalled();
      expect(mockFindingRepo.update).toHaveBeenCalledWith(201, { minuteId: 1 });
      expect(mockMinuteRepo.save).toHaveBeenCalled();
    });
  });

  describe('generateWord and generateExcel', () => {
    it('should delegate generateWord to exportService', async () => {
      const buffer = await service.generateWord(1, 'MB04');
      expect(buffer).toEqual(Buffer.from('word-doc'));
      expect(mockExportService.generateWord).toHaveBeenCalledWith(1, 'MB04');
    });

    it('should delegate generateExcel to exportService', async () => {
      const buffer = await service.generateExcel(1);
      expect(buffer).toEqual(Buffer.from('excel-sheet'));
      expect(mockExportService.generateExcel).toHaveBeenCalledWith(
        1,
        undefined,
      );
    });
  });
});
