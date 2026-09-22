import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReportsService } from './reports.service';
import { ReportDefinition } from './entities/report-definition.entity';

describe('ReportsService', () => {
  let service: ReportsService;
  let reportRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    reportRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const mockQb = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    dataSource = {
      createQueryBuilder: jest.fn(() => mockQb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(ReportDefinition), useValue: reportRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll and findAllowedForUser', () => {
    it('should return all reports for Admin', async () => {
      const mockReports = [
        { id: 1, name: 'Report 1' },
        { id: 2, name: 'Report 2' },
      ];
      reportRepo.find.mockResolvedValue(mockReports);

      const result = await service.findAllowedForUser('Admin', '');
      expect(result).toHaveLength(2);
    });

    it('should filter reports based on permissions for non-admin user', async () => {
      const mockReports = [
        { id: 1, name: 'Report 1' },
        { id: 2, name: 'Report 2' },
      ];
      reportRepo.find.mockResolvedValue(mockReports);

      const result = await service.findAllowedForUser(
        'Auditor',
        'view_report_1',
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('CRUD operations', () => {
    it('should create report definition', async () => {
      const dto = { name: 'New Report', entityType: 'AuditFinding' };
      const created = await service.create(dto);
      expect(reportRepo.create).toHaveBeenCalledWith(dto);
      expect(reportRepo.save).toHaveBeenCalled();
      expect(created.id).toBe(1);
    });

    it('should update report definition', async () => {
      reportRepo.findOne.mockResolvedValue({ id: 1, name: 'Updated' });
      const updated = await service.update(1, { name: 'Updated' });
      expect(reportRepo.update).toHaveBeenCalledWith(1, { name: 'Updated' });
      expect(updated.name).toBe('Updated');
    });

    it('should remove report definition', async () => {
      await service.remove(1);
      expect(reportRepo.delete).toHaveBeenCalledWith(1);
    });
  });

  describe('executeReport', () => {
    it('should throw BadRequestException if report not found', async () => {
      reportRepo.findOne.mockResolvedValue(null);
      await expect(service.executeReport(999)).rejects.toThrow(
        'Report not found',
      );
    });

    it('should throw BadRequestException for unsupported entityType', async () => {
      reportRepo.findOne.mockResolvedValue({
        id: 1,
        entityType: 'Unsupported',
      });
      await expect(service.executeReport(1)).rejects.toThrow(
        'Unsupported entityType',
      );
    });

    it('should execute aggregate query for AuditFinding with group by', async () => {
      reportRepo.findOne.mockResolvedValue({
        id: 1,
        entityType: 'AuditFinding',
        groupBy: 'riskLevel',
        aggregateFunc: 'COUNT',
      });

      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ label: 'High', value: '10' }]);

      const result = await service.executeReport(1);
      expect(qb.from).toHaveBeenCalledWith('audit_findings', 't');
      expect(qb.select).toHaveBeenCalledWith('t."riskLevel"', 'label');
      expect(qb.addSelect).toHaveBeenCalledWith('COUNT(*)', 'value');
      expect(result).toEqual([{ label: 'High', value: '10' }]);
    });

    it('should execute aggregate query with custom fields (cf_)', async () => {
      reportRepo.findOne.mockResolvedValue({
        id: 2,
        entityType: 'Recommendation',
        groupBy: 'cf_region',
        aggregateFunc: 'SUM',
        aggregateField: 'cf_lossAmount',
      });

      const qb = dataSource.createQueryBuilder();
      qb.getRawMany.mockResolvedValue([{ label: 'North', value: '5000000' }]);

      const result = await service.executeReport(2);
      expect(qb.from).toHaveBeenCalledWith('recommendations', 't');
      expect(result).toHaveLength(1);
    });
  });
});
