import { IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateQualityAssessmentDto {
  @IsNumber()
  @IsNotEmpty({ message: 'engagementId không được để trống' })
  engagementId: number;

  @IsOptional()
  @IsString()
  assessmentName?: string;

  @IsOptional()
  @IsObject()
  criteriaScores?: {
    planning?: number;
    execution?: number;
    reporting?: number;
    documentation?: number;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}
