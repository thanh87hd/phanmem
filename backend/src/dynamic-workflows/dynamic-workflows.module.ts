import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DynamicWorkflowsService } from './dynamic-workflows.service';
import { DynamicWorkflowsController } from './dynamic-workflows.controller';
import { DynamicWorkflow } from './entities/dynamic-workflow.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DynamicWorkflow])],
  providers: [DynamicWorkflowsService],
  controllers: [DynamicWorkflowsController],
  exports: [DynamicWorkflowsService],
})
export class DynamicWorkflowsModule {}
