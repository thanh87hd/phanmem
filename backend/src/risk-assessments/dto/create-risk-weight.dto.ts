import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateRiskWeightDto {
  @IsInt()
  assessmentId: number;

  @IsString()
  @IsNotEmpty({ message: 'criteriaId không được để trống' })
  criteriaId: string;

  @IsNumber()
  @Min(0, { message: 'Trọng số phải >= 0' })
  @Max(1, { message: 'Trọng số phải <= 1 (tỷ lệ phần trăm chia 100)' })
  weight: number;

  @IsOptional()
  @IsString()
  description?: string;
}
