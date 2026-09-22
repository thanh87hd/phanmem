import { PartialType } from '@nestjs/mapped-types';
import { CreateThematicThemeDto } from './create-thematic-theme.dto';

export class UpdateThematicThemeDto extends PartialType(
  CreateThematicThemeDto,
) {}
