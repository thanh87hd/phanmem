import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPercent: number;

  @IsOptional()
  @IsString()
  response?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
