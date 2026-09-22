import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class TransitionQualityReviewDto {
  @IsIn(['self', 'supervisor', 'independent'], {
    message: 'Cấp độ soát xét không hợp lệ. Phải là self, supervisor, hoặc independent.',
  })
  level: 'self' | 'supervisor' | 'independent';

  @IsString()
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  userName?: string;
}
