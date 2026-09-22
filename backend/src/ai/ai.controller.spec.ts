import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller';

describe('AiController', () => {
  let controller: AiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
    })
      .useMocker(() => ({}))
      .compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call updateRegulatory on PATCH, POST, and PUT for regulatory/:id', async () => {
    const regService = controller['regKnowledgeService'];
    regService.updateRegulatory = jest
      .fn()
      .mockResolvedValue({ id: 1, fullContent: '# Test' });

    const patchResult = await controller.updateRegulatory(1, {
      fullContent: '# Test',
    });
    expect(patchResult).toEqual({ id: 1, fullContent: '# Test' });

    const postResult = await controller.updateRegulatoryPost(1, {
      fullContent: '# Test',
    });
    expect(postResult).toEqual({ id: 1, fullContent: '# Test' });

    const putResult = await controller.updateRegulatoryPut(1, {
      fullContent: '# Test',
    });
    expect(putResult).toEqual({ id: 1, fullContent: '# Test' });

    expect(regService.updateRegulatory).toHaveBeenCalledTimes(3);
  });

  it('should call createRegulatory on POST regulatory', async () => {
    const regService = controller['regKnowledgeService'];
    regService.createRegulatory = jest
      .fn()
      .mockResolvedValue({ id: 2, code: 'NEW', fullContent: '# New' });

    const result = await controller.createRegulatory({
      code: 'NEW',
      fullContent: '# New',
    });
    expect(result).toEqual({ id: 2, code: 'NEW', fullContent: '# New' });
    expect(regService.createRegulatory).toHaveBeenCalledWith({
      code: 'NEW',
      fullContent: '# New',
    });
  });
});
