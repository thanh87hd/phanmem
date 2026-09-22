import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegulatoryExamsController } from './regulatory-exams.controller';
import { RegulatoryExamsService } from './regulatory-exams.service';
import { RegulatoryExam } from './entities/regulatory-exam.entity';
import { RegulatoryFinding } from './entities/regulatory-finding.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RegulatoryExam, RegulatoryFinding])],
  controllers: [RegulatoryExamsController],
  providers: [RegulatoryExamsService],
})
export class RegulatoryExamsModule {}
