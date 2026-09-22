import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SubmitRemediationPlanDto {
  @IsString()
  @IsNotEmpty({ message: 'Kế hoạch hành động không được để trống' })
  plan: string;

  @IsOptional()
  @IsString()
  targetDate?: string;
}
