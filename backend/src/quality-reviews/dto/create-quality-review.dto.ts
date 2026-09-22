import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQualityReviewDto {
  @IsNumber()
  @IsNotEmpty({ message: 'workingPaperId không được để trống' })
  workingPaperId: number;

  @IsOptional()
  @IsString()
  workingPaperTitle?: string;

  @IsOptional()
  @IsString()
  selfReviewStatus?: string;

  @IsOptional()
  @IsString()
  supervisorReviewStatus?: string;

  @IsOptional()
  @IsString()
  independentReviewStatus?: string;

  @IsOptional()
  @IsString()
  overallStatus?: string;
}
