import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DefectClassifierService } from './defect-classifier.service';
import { DefectCode, DefectDimension } from '../entities/defect-code.entity';
import { DefectCodeChangeLog } from '../entities/defect-code-changelog.entity';

describe('DefectClassifierService', () => {
  let service: DefectClassifierService;
  let defectCodeRepo: any;
  let defectCodeChangeLogRepo: any;

  beforeEach(async () => {
    defectCodeRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    defectCodeChangeLogRepo = {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DefectClassifierService,
        { provide: getRepositoryToken(DefectCode), useValue: defectCodeRepo },
        {
          provide: getRepositoryToken(DefectCodeChangeLog),
          useValue: defectCodeChangeLogRepo,
        },
      ],
    }).compile();

    service = module.get<DefectClassifierService>(DefectClassifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('exportDefectCodes', () => {
    it('should query defect codes and return an excel buffer', async () => {
      const mockCodes = [
        {
          dimension: 'CREDIT',
          version: '1.0',
          code: 'CR01K01',
          description: 'Hồ sơ thẩm định chưa đầy đủ',
          l1Code: 'CR',
          l1Desc: 'Tín dụng',
          l2Code: 'CR01',
          l2Desc: 'Thẩm định',
          riskLevel: 3,
          avgFine: 20000000,
          maxFine: 50000000,
          isActive: true,
        },
      ];
      defectCodeRepo.find.mockResolvedValue(mockCodes);

      const buffer = await service.exportDefectCodes();
      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(defectCodeRepo.find).toHaveBeenCalledWith({
        order: { dimension: 'ASC', code: 'ASC' },
      });
    });
  });

  describe('issueNewDefectCode', () => {
    it('should throw error if required fields are missing', async () => {
      await expect(
        service.issueNewDefectCode({ l1Code: 'CR' }, 'tester'),
      ).rejects.toThrow('Thiếu thông tin bắt buộc');
    });

    it('should generate new sequential L3 code when parentL3Code is not provided', async () => {
      defectCodeChangeLogRepo.count.mockResolvedValue(2);
      defectCodeRepo.find.mockResolvedValue([
        {
          code: 'CR01K01',
          l2Code: 'CR01',
          l1Desc: 'Tín dụng',
          l2Desc: 'Thẩm định',
        },
        {
          code: 'CR01K02',
          l2Code: 'CR01',
          l1Desc: 'Tín dụng',
          l2Desc: 'Thẩm định',
        },
      ]);

      const dto = {
        dimension: 'CREDIT',
        l1Code: 'CR',
        l2Code: 'CR01',
        description: 'Giải ngân vượt hạn mức phê duyệt',
        reason: 'Phát hiện rủi ro mới năm 2026',
        riskLevel: 4,
      };

      const result = await service.issueNewDefectCode(dto, 'lead_auditor');
      expect(result.success).toBe(true);
      expect(result.version).toBe('1.3');
      expect(result.newCode).toBe('CR01K03');
      expect(defectCodeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'CR01K03',
          l2Code: 'CR01',
          version: '1.3',
          isActive: true,
        }),
      );
      expect(defectCodeChangeLogRepo.save).toHaveBeenCalled();
    });

    it('should generate sub-variant code when parentL3Code is provided', async () => {
      defectCodeChangeLogRepo.count.mockResolvedValue(0);
      defectCodeRepo.find.mockResolvedValue([
        { code: 'CR01K01', l2Code: 'CR01' },
        { code: 'CR01K01a', l2Code: 'CR01' },
      ]);

      const dto = {
        dimension: 'CREDIT',
        l1Code: 'CR',
        l2Code: 'CR01',
        parentL3Code: 'CR01K01',
        description: 'Biến thể lỗi phụ: Hồ sơ bảo đảm thiếu công chứng',
        reason: 'Bổ sung nhánh chi tiết',
      };

      const result = await service.issueNewDefectCode(dto, 'auditor');
      expect(result.success).toBe(true);
      expect(result.newCode).toBe('CR01K01b');
    });
  });
});
