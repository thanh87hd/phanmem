import { IsNumber, Min } from 'class-validator';

export class UpdateKriRuleDto {
  @IsNumber()
  @Min(0)
  redThreshold: number;

  @IsNumber()
  @Min(0)
  yellowThreshold: number;
}
