import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  IsOptional,
} from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12, {
    message: 'Mật khẩu mới phải có ít nhất 12 ký tự (PCI DSS 8.3.6)',
  })
  newPassword: string;
}

export class AdminResetPasswordDto {
  @IsNumber()
  targetUserId: number;

  @IsString()
  @IsOptional()
  newPassword?: string; // If empty, auto-generate
}

export class ApprovePasswordChangeDto {
  @IsNumber()
  requestId: number;

  @IsString()
  @IsOptional()
  adminNote?: string;
}
