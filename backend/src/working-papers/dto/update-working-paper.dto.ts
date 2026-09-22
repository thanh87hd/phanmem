import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkingPaperDto } from './create-working-paper.dto';

export class UpdateWorkingPaperDto extends PartialType(CreateWorkingPaperDto) {}
