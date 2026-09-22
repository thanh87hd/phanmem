import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RiskProfileService } from './risk-profile.service';
import { RiskProfile } from './entities/risk-profile.entity';
import {
  RiskProfileChangeRequest,
  ChangeRequestStatus,
} from './entities/risk-profile-change-request.entity';
import { RiskProfileHistory } from './entities/risk-profile-history.entity';

describe('RiskProfileService', () => {
  let service: RiskProfileService;
  let riskProfileRepo: any;
  let changeRequestRepo: any;
  let profileHistoryRepo: any;

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    riskProfileRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ id: 1, ...d })),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    changeRequestRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ id: 1, ...d })),
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };
    profileHistoryRepo = {
      find: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve({ id: 1, ...d })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskProfileService,
        { provide: getRepositoryToken(RiskProfile), useValue: riskProfileRepo },
        {
          provide: getRepositoryToken(RiskProfileChangeRequest),
          useValue: changeRequestRepo,
        },
        {
          provide: getRepositoryToken(RiskProfileHistory),
          useValue: profileHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<RiskProfileService>(RiskProfileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRiskProfilesSummary', () => {
    it('should aggregate risk profile statistics by domain and risk levels', async () => {
      riskProfileRepo.find.mockResolvedValue([
        {
          id: 1,
          profileCode: 'TD',
          domainName: 'Tín dụng',
          inherentRiskLevel: 'Cao',
          residualRiskLevel: 'Vừa',
        },
        {
          id: 2,
          profileCode: 'TD',
          domainName: 'Tín dụng',
          inherentRiskLevel: 'Cao',
          residualRiskLevel: 'Cao',
        },
        {
          id: 3,
          profileCode: 'VH',
          domainName: 'Vận hành',
          inherentRiskLevel: 'Vừa',
          residualRiskLevel: 'Thấp',
        },
      ]);

      const summary = await service.getRiskProfilesSummary();

      expect(summary).toBeDefined();
      expect(summary.totalProfiles).toBe(3);
      expect(summary.highInherentRisks).toBe(2);
      expect(summary.highResidualRisks).toBe(1);
      expect(summary.domains['TD']).toBeDefined();
      expect(summary.domains['TD'].count).toBe(2);
      expect(summary.domains['TD'].highRiskCount).toBe(2);
    });
  });

  describe('createRiskProfileChangeRequest', () => {
    it('should create change request with PENDING_L1 status', async () => {
      const dto = {
        title: 'Cập nhật rủi ro tín dụng 2026',
        domainCode: 'TD',
        reason: 'Thay đổi quy định bảo đảm tiền vay',
        changes: [
          {
            type: 'CREATE' as const,
            newData: { riskName: 'Rủi ro thẩm định giá sai lệch' },
          },
        ],
      };

      const result = await service.createRiskProfileChangeRequest(dto, {
        id: 10,
        username: 'ktv1',
        fullName: 'Kiểm toán viên 1',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(ChangeRequestStatus.PENDING_L1);
      expect(result.title).toBe(dto.title);
      expect(changeRequestRepo.save).toHaveBeenCalled();
    });
  });

  describe('reviewChangeRequestL1', () => {
    it('should throw NotFoundException if change request does not exist', async () => {
      changeRequestRepo.findOne.mockResolvedValue(null);
      await expect(
        service.reviewChangeRequestL1(99, 'APPROVE', 'Duyệt', { id: 1 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if change request is not PENDING_L1', async () => {
      changeRequestRepo.findOne.mockResolvedValue({
        id: 1,
        status: ChangeRequestStatus.APPROVED,
      });
      await expect(
        service.reviewChangeRequestL1(1, 'APPROVE', 'Duyệt', { id: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should advance status to PENDING_L2 on APPROVE', async () => {
      const cr = {
        id: 1,
        status: ChangeRequestStatus.PENDING_L1,
      };
      changeRequestRepo.findOne.mockResolvedValue(cr);

      const result = await service.reviewChangeRequestL1(
        1,
        'APPROVE',
        'Đồng ý cấp phòng',
        { id: 5, fullName: 'Trưởng phòng A' },
      );

      expect(result.status).toBe(ChangeRequestStatus.PENDING_L2);
      expect(result.reviewerL1Name).toBe('Trưởng phòng A');
    });

    it('should set status to REJECTED on REJECT', async () => {
      const cr = {
        id: 1,
        status: ChangeRequestStatus.PENDING_L1,
      };
      changeRequestRepo.findOne.mockResolvedValue(cr);

      const result = await service.reviewChangeRequestL1(
        1,
        'REJECT',
        'Cần bổ sung tài liệu',
        { id: 5, fullName: 'Trưởng phòng A' },
      );

      expect(result.status).toBe(ChangeRequestStatus.REJECTED);
      expect(result.reviewerL1Notes).toBe('Cần bổ sung tài liệu');
    });
  });

  describe('approveChangeRequestL2', () => {
    it('should throw BadRequestException if change request is not PENDING_L2', async () => {
      changeRequestRepo.findOne.mockResolvedValue({
        id: 1,
        status: ChangeRequestStatus.PENDING_L1,
      });
      await expect(
        service.approveChangeRequestL2(1, 'APPROVE', 'Duyệt', { id: 2 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject change request on REJECT', async () => {
      const cr = {
        id: 1,
        status: ChangeRequestStatus.PENDING_L2,
      };
      changeRequestRepo.findOne.mockResolvedValue(cr);

      const result = await service.approveChangeRequestL2(
        1,
        'REJECT',
        'Không thông qua',
        { id: 2, fullName: 'Lãnh đạo Khối' },
      );

      expect(result.status).toBe(ChangeRequestStatus.REJECTED);
    });

    it('should approve, apply changes and create history on APPROVE', async () => {
      const cr = {
        id: 1,
        status: ChangeRequestStatus.PENDING_L2,
        reason: 'Cập nhật định kỳ',
        createdByUserId: 10,
        createdByName: 'KTV 1',
        reviewerL1Name: 'Trưởng phòng A',
        changes: [
          {
            type: 'UPDATE',
            profileId: 100,
            newData: { riskScore: 85 },
          },
        ],
      };
      changeRequestRepo.findOne.mockResolvedValue(cr);
      riskProfileRepo.findOne.mockResolvedValue({
        id: 100,
        riskScore: 70,
        riskName: 'Rủi ro hồ sơ vay',
      });

      const result = await service.approveChangeRequestL2(
        1,
        'APPROVE',
        'Đã duyệt cấp Khối',
        { id: 2, fullName: 'Lãnh đạo Khối' },
      );

      expect(result.status).toBe(ChangeRequestStatus.APPROVED);
      expect(profileHistoryRepo.save).toHaveBeenCalled();
      expect(riskProfileRepo.save).toHaveBeenCalled();
    });
  });
});
