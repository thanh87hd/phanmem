import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThematicTheme } from './entities/thematic-theme.entity';
import { ThematicService } from './thematic.service';
import { ThematicController } from './thematic.controller';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { RiskRegister } from '../risk-register/entities/risk-register.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ThematicTheme, AuditFinding, RiskRegister]),
  ],
  controllers: [ThematicController],
  providers: [ThematicService],
  exports: [ThematicService],
})
export class ThematicModule {}
