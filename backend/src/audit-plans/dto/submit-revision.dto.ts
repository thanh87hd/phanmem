import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class SubmitRevisionDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên kỳ review không được để trống' })
  reviewPeriod: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @IsNotEmpty({ message: 'Danh sách thay đổi không được để trống' })
  changedUnits: {
    universeId: number;
    name: string;
    action: 'ADD' | 'REMOVE' | 'UPDATE';
    reason: string;
    nextPeriodPriority: boolean;
    oldValues?: { estDays: number; ktvCount: number };
    newValues?: { estDays: number; ktvCount: number };
  }[];
}
