import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { WorkflowDefinition } from './entities/workflow-definition.entity';
import { WorkflowStep } from './entities/workflow-step.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WorkflowDefinition, WorkflowStep])],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
