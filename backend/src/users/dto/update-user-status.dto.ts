import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class UpdateUserStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsIn(['Active', 'Resigned', 'Transferred', 'Suspended'], {
    message: 'Trạng thái không hợp lệ. Chỉ chấp nhận: Active, Resigned, Transferred, Suspended',
  })
  status: 'Active' | 'Resigned' | 'Transferred' | 'Suspended';

  @IsString()
  @IsOptional()
  resignationDate?: string;

  @IsString()
  @IsOptional()
  transferDate?: string;

  @IsString()
  @IsOptional()
  transferDestination?: string;

  @IsString()
  @IsOptional()
  statusReason?: string;
}
