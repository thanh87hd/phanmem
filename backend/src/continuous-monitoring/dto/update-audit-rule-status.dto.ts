import { IsBoolean } from 'class-validator';
export class UpdateAuditRuleStatusDto {
  @IsBoolean() isActive: boolean;
}
