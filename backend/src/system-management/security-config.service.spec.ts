import { Test, TestingModule } from '@nestjs/testing';
import { SecurityConfigService } from './security-config.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SecurityConfig } from './entities/security-config.entity';

describe('SecurityConfigService', () => {
  let service: SecurityConfigService;

  const mockRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((dto) => Promise.resolve({ id: 1, ...dto })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityConfigService,
        { provide: getRepositoryToken(SecurityConfig), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<SecurityConfigService>(SecurityConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit and cache', () => {
    it('should seed missing defaults and load cache', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      mockRepo.find.mockResolvedValue([
        { key: 'PASSWORD_MIN_LENGTH', value: '12' },
        { key: 'PASSWORD_COMPLEXITY', value: 'true' },
      ]);

      await service.onModuleInit();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(service.get('PASSWORD_MIN_LENGTH')).toBe('12');
      expect(service.getNumber('PASSWORD_MIN_LENGTH')).toBe(12);
      expect(service.getBoolean('PASSWORD_COMPLEXITY')).toBe(true);
      expect(service.getBoolean('NON_EXISTENT', false)).toBe(false);
    });
  });

  describe('CRUD and setConfig', () => {
    it('should findAll configs', async () => {
      mockRepo.find.mockResolvedValue([{ key: 'KEY1', value: 'VAL1' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });

    it('should getConfig by key', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'KEY1', value: 'VAL1' });
      const result = await service.getConfig('KEY1');
      expect(result?.value).toBe('VAL1');
    });

    it('should setConfig and update cache', async () => {
      const existing = { key: 'LOCKOUT_MINUTES', value: '15' };
      mockRepo.findOne.mockResolvedValue(existing);

      const result = await service.setConfig('LOCKOUT_MINUTES', '30');
      expect(result.value).toBe('30');
      expect(service.getNumber('LOCKOUT_MINUTES')).toBe(30);
    });

    it('should throw error when setting non-existent config', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.setConfig('INVALID', '123')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('presets', () => {
    it('should apply PCI DSS preset', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'TEST', value: 'old' });
      await service.applyPciDssPreset();
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it('should apply ISO 27001 preset', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'TEST', value: 'old' });
      await service.applyIso27001Preset();
      expect(mockRepo.save).toHaveBeenCalled();
    });
  });

  describe('checkCompliance', () => {
    it('should evaluate compliance for PCI DSS and ISO 27001', async () => {
      mockRepo.find.mockResolvedValue([
        { key: 'PASSWORD_MIN_LENGTH', value: '14' },
        { key: 'PASSWORD_COMPLEXITY', value: 'true' },
        { key: 'PASSWORD_EXPIRY_DAYS', value: '90' },
        { key: 'PASSWORD_HISTORY_COUNT', value: '4' },
        { key: 'MAX_FAILED_ATTEMPTS', value: '5' },
        { key: 'LOCKOUT_MINUTES', value: '30' },
        { key: 'SESSION_TIMEOUT_MINUTES', value: '15' },
        { key: 'FORCE_HTTPS', value: 'true' },
        { key: 'AUDIT_LOG_RETENTION_MONTHS', value: '12' },
      ]);

      const compliance = await service.checkCompliance();
      expect(compliance.pciDss.score).toBe(8);
      expect(compliance.pciDss.total).toBe(8);
      expect(compliance.iso27001.score).toBe(7);
      expect(compliance.iso27001.total).toBe(7);
    });
  });
});
