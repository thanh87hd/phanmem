import { Test, TestingModule } from '@nestjs/testing';
import { ContinuousMonitoringService } from './continuous-monitoring.service';

describe('ContinuousMonitoringService', () => {
  let service: ContinuousMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContinuousMonitoringService],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<ContinuousMonitoringService>(
      ContinuousMonitoringService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
