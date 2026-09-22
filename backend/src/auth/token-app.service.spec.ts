import { Test, TestingModule } from '@nestjs/testing';
import { TokenAppService } from './token-app.service';

describe('TokenAppService', () => {
  let service: TokenAppService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenAppService],
    }).compile();

    service = module.get<TokenAppService>(TokenAppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyOtp', () => {
    it('should return true for valid mock OTP', async () => {
      const result = await service.verifyOtp('admin', '123456');
      expect(result).toBe(true);
    });

    it('should return false for invalid OTP', async () => {
      const result = await service.verifyOtp('admin', '000000');
      expect(result).toBe(false);
    });
  });
});
