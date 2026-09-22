import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyRecommendationDto {
  @IsString()
  @IsNotEmpty({ message: 'Ghi chú xác nhận không được để trống' })
  notes: string;
}
