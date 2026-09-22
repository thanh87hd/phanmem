import { Controller, Post, Delete, UseGuards } from '@nestjs/common';
import { SeederService } from './seeder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { Public } from '../auth/decorators/public.decorator';

@Controller('seeder')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@CheckPolicies((ability) => ability.can(Action.Manage, 'Seeder'))
export class SeederController {
  constructor(private readonly seederService: SeederService) {}

  @Post('run')
  run() {
    return this.seederService.seedLargeData();
  }

  @Post('security')
  seedSecurity() {
    return this.seederService.seedSecurityData();
  }

  /**
   * POST /seeder/org-structure
   * Upsert toàn bộ cơ cấu tổ chức LPBank (unitType)
   * Không xóa dữ liệu cũ — chỉ thêm mới hoặc cập nhật theo mã code
   */
  @Post('org-structure')
  seedOrgStructure() {
    return this.seederService.seedOrgStructure();
  }

  @Delete('clear')
  clear() {
    return this.seederService.clearAll();
  }
}
