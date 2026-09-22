import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskRegisterService } from './risk-register.service';
import { RiskRegister } from './entities/risk-register.entity';

describe('RiskRegisterService', () => {
  let service: RiskRegisterService;

  const mockRisks: Partial<RiskRegister>[] = [
    {
      id: 1,
      hsrrCode: 'HS01_CNTT_001',
      domain: 'CNTT',
      sequenceNo: '1',
      riskCategory: 'Rủi ro Hạ tầng',
      riskTitle: 'Rủi ro sập nguồn DC',
      impactScore: 4.0,
      likelihoodScore: 3.0,
      designEffectiveness: 0.5,
      operatingEffectiveness: 0.5,
      inherentRiskScore: 3.5,
      residualRiskScore: 1.75,
      finalRiskBand: 'Cam',
      controlRating: 'Trung bình',
    },
    {
      id: 2,
      hsrrCode: 'HS10_TD_001',
      domain: 'TD_DVKD',
      sequenceNo: '1',
      riskCategory: 'Rủi ro Thẩm định',
      riskTitle: 'Thẩm định sai giá trị TSBĐ',
      impactScore: 3.0,
      likelihoodScore: 2.0,
      designEffectiveness: 1.0,
      operatingEffectiveness: 1.0,
      inherentRiskScore: 2.5,
      residualRiskScore: 1.0,
      finalRiskBand: 'Xanh',
      controlRating: 'Tốt',
    },
  ];

  const mockRepo = {
    find: jest.fn().mockResolvedValue(mockRisks),
    findOne: jest
      .fn()
      .mockImplementation(({ where: { id } }) =>
        Promise.resolve(mockRisks.find((r) => r.id === id) || null),
      ),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    remove: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(mockRisks),
      where: jest.fn().mockReturnThis(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskRegisterService,
        {
          provide: getRepositoryToken(RiskRegister),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<RiskRegisterService>(RiskRegisterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly compute Inherent, CE, Residual and Band in computeScores', () => {
    const computed = (service as any).computeScores({
      impactScore: 4.0,
      likelihoodScore: 3.0,
      designEffectiveness: 0.5,
      operatingEffectiveness: 1.0,
    });

    // Inherent = sqrt(4.0 * 3.0) = sqrt(12) = 3.46
    expect(computed.inherentRiskScore).toBe(3.46);
    // CE = 0.4*0.5 + 0.6*1.0 = 0.2 + 0.6 = 0.8
    // Residual = 3.46 * (1 - 0.8) = 0.69
    expect(computed.residualRiskScore).toBe(0.69);
    expect(computed.finalRiskBand).toBe('Xanh');
    expect(computed.controlRating).toBe('Tốt');
  });

  it('should classify high residual risk as Đỏ or Cam', () => {
    const highRisk = (service as any).computeScores({
      impactScore: 5.0,
      likelihoodScore: 5.0,
      designEffectiveness: 0.0,
      operatingEffectiveness: 0.0,
    });

    // Inherent = 5.0, CE = 0, Residual = 5.0
    expect(highRisk.residualRiskScore).toBe(5.0);
    expect(highRisk.finalRiskBand).toBe('Đỏ');
    expect(highRisk.controlRating).toBe('Yếu');
  });

  it('should return summary metrics across domains', async () => {
    const summary = await service.getSummary();
    expect(summary.total).toBe(2);
    expect(summary.byDomain['CNTT']).toBe(1);
    expect(summary.byDomain['TD_DVKD']).toBe(1);
    expect(summary.byRiskBand['Cam']).toBe(1);
    expect(summary.byRiskBand['Xanh']).toBe(1);
  });
});
