import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApproveWorkingPaperDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReworkWorkingPaperDto {
  @IsString()
  @IsNotEmpty({ message: 'Ghi chú yêu cầu chỉnh sửa không được để trống' })
  notes: string;
}
