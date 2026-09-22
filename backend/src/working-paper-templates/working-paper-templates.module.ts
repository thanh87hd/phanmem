import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkingPaperTemplate } from './entities/working-paper-template.entity';
import { WorkingPaperTemplatesService } from './working-paper-templates.service';
import { WorkingPaperTemplatesController } from './working-paper-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WorkingPaperTemplate])],
  controllers: [WorkingPaperTemplatesController],
  providers: [WorkingPaperTemplatesService],
  exports: [WorkingPaperTemplatesService, TypeOrmModule],
})
export class WorkingPaperTemplatesModule {}
