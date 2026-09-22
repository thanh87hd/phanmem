import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskControlMatrixService } from './risk-control-matrix.service';
import { RiskControlMatrixController } from './risk-control-matrix.controller';
import { RiskControlMatrix } from './entities/risk-control-matrix.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RiskControlMatrix])],
  controllers: [RiskControlMatrixController],
  providers: [RiskControlMatrixService],
  exports: [RiskControlMatrixService],
})
export class RiskControlMatrixModule {}
