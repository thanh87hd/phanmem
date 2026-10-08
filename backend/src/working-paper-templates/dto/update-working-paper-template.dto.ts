import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkingPaperTemplateDto } from './create-working-paper-template.dto';

export class UpdateWorkingPaperTemplateDto extends PartialType(
  CreateWorkingPaperTemplateDto,
) {}
