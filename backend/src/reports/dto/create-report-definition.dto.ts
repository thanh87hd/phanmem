import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
} from 'class-validator';

export class CreateReportDefinitionDto {
  @IsNotEmpty({ message: 'Tên báo cáo không được để trống' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Loại thực thể entityType không được để trống' })
  @IsString()
  entityType: string;

  @IsNotEmpty({ message: 'Loại biểu đồ chartType không được để trống' })
  @IsString()
  chartType: string;

  @IsOptional()
  @IsString()
  groupBy?: string;

  @IsOptional()
  @IsString()
  aggregateFunc?: string;

  @IsOptional()
  @IsString()
  aggregateField?: string;

  @IsOptional()
  filters?: any;

  @IsOptional()
  @IsArray()
  allowedRoles?: string[];
}
