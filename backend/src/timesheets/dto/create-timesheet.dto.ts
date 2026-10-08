import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateTimesheetDto {
  @IsNotEmpty({ message: 'userId không được để trống' })
  @IsNumber()
  userId: number;

  @IsNotEmpty({ message: 'username không được để trống' })
  @IsString()
  username: string;

  @IsNotEmpty({ message: 'date không được để trống' })
  @IsString()
  date: string;

  @IsNotEmpty({ message: 'hours không được để trống' })
  @IsNumber()
  hours: number;

  @IsOptional()
  @IsNumber()
  engagementId?: number;

  @IsOptional()
  @IsString()
  engagementName?: string;

  @IsOptional()
  @IsNumber()
  taskId?: number;

  @IsOptional()
  @IsString()
  taskName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  generalTaskId?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  approverNotes?: string;
}
