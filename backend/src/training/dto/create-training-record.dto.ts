import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';

export class CreateTrainingRecordDto {
  @IsNotEmpty({ message: 'userId không được để trống' })
  @IsNumber()
  userId: number;

  @IsOptional()
  @IsString()
  userName?: string;

  @IsNotEmpty({ message: 'Tên khóa đào tạo không được để trống' })
  @IsString()
  courseName: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  cpeHours?: number;

  @IsOptional()
  @IsString()
  certificationType?: string;

  @IsOptional()
  @IsNumber()
  ethicsHours?: number;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @IsOptional()
  @IsNumber()
  verifiedById?: number;

  @IsOptional()
  @IsString()
  verifiedByName?: string;
}
