import { Test, TestingModule } from '@nestjs/testing';
import { HrSyncService } from './hr-sync.service';
import { ConfigService } from '@nestjs/config';

describe('HrSyncService', () => {
  let service: HrSyncService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HrSyncService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<HrSyncService>(HrSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleDailyHrSync', () => {
    it('should skip sync when HR_API_URL is not configured', async () => {
      mockConfigService.get.mockReturnValue(undefined);

      await expect(service.handleDailyHrSync()).resolves.not.toThrow();
      expect(mockConfigService.get).toHaveBeenCalledWith('HR_API_URL');
    });

    it('should perform sync when HR_API_URL is configured', async () => {
      mockConfigService.get.mockReturnValue('https://hr.lpbank.com.vn/api');

      await expect(service.handleDailyHrSync()).resolves.not.toThrow();
      expect(mockConfigService.get).toHaveBeenCalledWith('HR_API_URL');
    });
  });
});
