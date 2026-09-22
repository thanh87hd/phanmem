import { Test, TestingModule } from '@nestjs/testing';
import { KriService } from './kri.service';
import { KriAlertsService } from '../risk-indicators/kri-alerts.service';
import { KriAlert } from '../risk-indicators/entities/kri-alert.entity';

describe('KriService', () => {
  let service: KriService;

  const mockKriAlert: Partial<KriAlert> = {
    id: 1,
    kriCode: 'KRI_NPL_01',
    kriName: 'Tỷ lệ nợ xấu trên tổng dư nợ',
    metrics: 'NPL Ratio',
    category: 'Tín dụng',
    severity: 'Critical',
    status: 'Active',
    currentValue: '3.5%',
    thresholdValue: '2.0%',
    reportMonth: 8,
    reportYear: 2026,
    departmentCode: 'CN_HN',
    departmentName: 'Chi nhánh Hà Nội',
    auditUniverseId: 10,
  };

  const mockKriAlertsService = {
    createKriAlert: jest.fn().mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
    createKriBulk: jest.fn().mockImplementation((list) => Promise.resolve(list.map((d: any, i: number) => ({ id: i + 1, ...d })))),
    findAllKriAlerts: jest.fn().mockResolvedValue([mockKriAlert]),
    findActiveKriAlerts: jest.fn().mockResolvedValue([mockKriAlert]),
    uploadKriBulkFiles: jest.fn().mockResolvedValue({ totalAlertsCreated: 1, files: [] }),
    uploadKriPerFile: jest.fn().mockResolvedValue({ totalAlertsCreated: 1, files: [] }),
    parseKriFile: jest.fn().mockResolvedValue([]),
    getKriPeriodReport: jest.fn().mockResolvedValue({ totalAlerts: 1, months: ['2026-08'], byKriCode: [{ kriCode: 'KRI_NPL_01' }] }),
    compareKriPeriods: jest.fn().mockResolvedValue({ summary: { total: 1 } }),
    getKriBatches: jest.fn().mockResolvedValue([]),
    getKriOptions: jest.fn().mockResolvedValue({ years: [2026] }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KriService,
        {
          provide: KriAlertsService,
          useValue: mockKriAlertsService,
        },
      ],
    }).compile();

    service = module.get<KriService>(KriService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createKriAlert', () => {
    it('should delegate createKriAlert to KriAlertsService', async () => {
      const dto = {
        kriCode: 'KRI_NPL_01',
        metrics: 'Tỷ lệ nợ xấu',
        severity: 'High',
      };

      const result = await service.createKriAlert(dto as any);
      expect(result).toBeDefined();
      expect(mockKriAlertsService.createKriAlert).toHaveBeenCalledWith(dto);
    });
  });

  describe('createKriBulk', () => {
    it('should delegate createKriBulk to KriAlertsService', async () => {
      const dtoList = [
        { kriCode: 'KRI_01', metrics: 'Metric 1' },
        { kriCode: 'KRI_02', metrics: 'Metric 2' },
      ];

      const result = await service.createKriBulk(dtoList as any);
      expect(result).toBeDefined();
      expect(mockKriAlertsService.createKriBulk).toHaveBeenCalledWith(dtoList);
    });
  });

  describe('findAllKriAlerts and findActiveKriAlerts', () => {
    it('should delegate findAllKriAlerts to KriAlertsService', async () => {
      const result = await service.findAllKriAlerts();
      expect(result).toEqual([mockKriAlert]);
      expect(mockKriAlertsService.findAllKriAlerts).toHaveBeenCalled();
    });

    it('should delegate findActiveKriAlerts to KriAlertsService', async () => {
      const result = await service.findActiveKriAlerts();
      expect(result).toEqual([mockKriAlert]);
      expect(mockKriAlertsService.findActiveKriAlerts).toHaveBeenCalled();
    });
  });

  describe('getKriPeriodReport', () => {
    it('should delegate getKriPeriodReport to KriAlertsService', async () => {
      const filters = {
        year: 2026,
        fromMonth: 1,
        toMonth: 8,
        auditUniverseId: 10,
        departmentCode: 'CN_HN',
      };
      const report = await service.getKriPeriodReport(filters);

      expect(report).toBeDefined();
      expect(mockKriAlertsService.getKriPeriodReport).toHaveBeenCalledWith(filters);
      expect(report.totalAlerts).toBe(1);
    });
  });
});
