import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class CreateWorkflowDefinitionDto {
  @IsNotEmpty({ message: 'Loại thực thể entityType không được để trống' })
  @IsString()
  entityType: string;

  @IsNotEmpty({ message: 'Tên quy trình không được để trống' })
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  steps?: any[];
}
