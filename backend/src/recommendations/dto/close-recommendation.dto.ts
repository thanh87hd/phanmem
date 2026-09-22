import { IsNotEmpty, IsString } from 'class-validator';

export class CloseRecommendationDto {
  @IsString()
  @IsNotEmpty({ message: 'Lý do đóng kiến nghị không được để trống' })
  closedReason: string;
}
