import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QaipController } from './qaip.controller';
import { QaipService } from './qaip.service';
import { EqaAssessment } from './entities/eqa.entity';
import { QaipSurvey } from './entities/qaip-survey.entity';
import { IqaAssessment } from './entities/iqa-assessment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EqaAssessment, QaipSurvey, IqaAssessment])],
  controllers: [QaipController],
  providers: [QaipService],
})
export class QaipModule {}
