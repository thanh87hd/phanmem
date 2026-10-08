import { PartialType } from '@nestjs/mapped-types';
import { CreateTestOfControlDto } from './create-test-of-control.dto';

export class UpdateTestOfControlDto extends PartialType(
  CreateTestOfControlDto,
) {}
