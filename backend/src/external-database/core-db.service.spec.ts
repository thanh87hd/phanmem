import { Test, TestingModule } from '@nestjs/testing';
import { CoreDbService } from './core-db.service';
import { ConfigService } from '@nestjs/config';

describe('CoreDbService', () => {
  let service: CoreDbService;

  const mockConfigService = {
    get: jest.fn().mockImplementation((key) => {
      if (key === 'CORE_DB_HOST') return 'localhost';
      if (key === 'CORE_DB_PORT') return 5432;
      return 'test';
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoreDbService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CoreDbService>(CoreDbService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit and query', () => {
    it('should initialize onModuleInit', async () => {
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });

    it('should return query results', async () => {
      const results = await service.query('SELECT 1;');
      expect(results).toEqual([]);
    });
  });
});
