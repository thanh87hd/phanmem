import { Test, TestingModule } from '@nestjs/testing';
import { DynamicWorkflowsService } from './dynamic-workflows.service';

describe('DynamicWorkflowsService', () => {
  let service: DynamicWorkflowsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DynamicWorkflowsService],
    })
      .useMocker(() => ({}))
      .compile();

    service = module.get<DynamicWorkflowsService>(DynamicWorkflowsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
