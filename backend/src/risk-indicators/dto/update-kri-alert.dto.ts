import { PartialType } from '@nestjs/mapped-types';
import { CreateKriAlertDto } from './create-kri-alert.dto';

export class UpdateKriAlertDto extends PartialType(CreateKriAlertDto) {}
