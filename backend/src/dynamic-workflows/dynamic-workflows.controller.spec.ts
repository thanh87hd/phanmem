import { Test, TestingModule } from '@nestjs/testing';
import { DynamicWorkflowsController } from './dynamic-workflows.controller';

describe('DynamicWorkflowsController', () => {
  let controller: DynamicWorkflowsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DynamicWorkflowsController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<DynamicWorkflowsController>(
      DynamicWorkflowsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
