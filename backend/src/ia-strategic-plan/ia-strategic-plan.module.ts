import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IaStrategicPlan } from './entities/ia-strategic-plan.entity';
import { IaStrategicPlanService } from './ia-strategic-plan.service';
import { IaStrategicPlanController } from './ia-strategic-plan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([IaStrategicPlan])],
  controllers: [IaStrategicPlanController],
  providers: [IaStrategicPlanService],
  exports: [IaStrategicPlanService],
})
export class IaStrategicPlanModule {}
