import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TransitionFindingStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Trạng thái phát hiện không được để trống' })
  status: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  withdrawalReason?: string;

  @IsOptional()
  @IsString()
  returnReason?: string;
}
