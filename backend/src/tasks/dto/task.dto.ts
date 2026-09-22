import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsOptional()
  sourceType?: string; // Audit, General

  @IsNumber()
  @IsOptional()
  engagementId?: number;

  @IsString()
  @IsOptional()
  engagementName?: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  parentId?: number;

  @IsNumber()
  @IsOptional()
  assignedToId?: number;

  @IsString()
  @IsOptional()
  assignedToName?: string;

  @IsNumber()
  @IsOptional()
  assignedById?: number;

  @IsString()
  @IsOptional()
  assignedByName?: string;

  @IsNumber()
  @IsOptional()
  assignedDepartmentId?: number;

  @IsString()
  @IsOptional()
  teamCode?: string;

  @IsString()
  @IsOptional()
  priority?: string;

  @IsString()
  @IsOptional()
  durationCategory?: string;

  @IsString()
  @IsOptional()
  startDate?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsBoolean()
  @IsOptional()
  isPeriodic?: boolean;

  @IsString()
  @IsOptional()
  frequency?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  estimatedHours?: number;
}

export class UpdateTaskDto extends CreateTaskDto {
  @IsNumber()
  @IsOptional()
  progress?: number;
}
