import { Test, TestingModule } from '@nestjs/testing';
import { DeepSeekHarnessService } from './deepseek-harness.service';

describe('DeepSeekHarnessService', () => {
  let service: DeepSeekHarnessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeepSeekHarnessService],
    }).compile();

    service = module.get<DeepSeekHarnessService>(DeepSeekHarnessService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should run example stub method', async () => {
    const res = await service.runExample('test prompt');
    expect(res).toEqual({
      result: 'DeepSeek harness stub received: test prompt',
    });
  });
});
