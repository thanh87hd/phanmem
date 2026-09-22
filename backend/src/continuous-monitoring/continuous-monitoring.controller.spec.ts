import { Test, TestingModule } from '@nestjs/testing';
import { ContinuousMonitoringController } from './continuous-monitoring.controller';

describe('ContinuousMonitoringController', () => {
  let controller: ContinuousMonitoringController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContinuousMonitoringController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<ContinuousMonitoringController>(
      ContinuousMonitoringController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
