import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskRegister } from './entities/risk-register.entity';
import { RiskRegisterService } from './risk-register.service';
import { RiskRegisterController } from './risk-register.controller';

@Module({
  imports: [TypeOrmModule.forFeature([RiskRegister])],
  controllers: [RiskRegisterController],
  providers: [RiskRegisterService],
  exports: [RiskRegisterService],
})
export class RiskRegisterModule {}
