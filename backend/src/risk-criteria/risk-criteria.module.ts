import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskCriteriaService } from './risk-criteria.service';
import { RiskCriteriaController } from './risk-criteria.controller';
import { RiskCriterion } from './entities/risk-criterion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RiskCriterion])],
  controllers: [RiskCriteriaController],
  providers: [RiskCriteriaService],
  exports: [RiskCriteriaService],
})
export class RiskCriteriaModule {}
