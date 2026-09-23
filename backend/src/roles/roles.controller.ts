import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@UseGuards(JwtAuthGuard, PoliciesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  // Chỉ Admin / Lãnh đạo KTNB mới được tạo Role mới
  @Post()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'SystemManagement'))
  create(
    @Body() dto: { name: string; description?: string; permissions?: string },
  ) {
    return this.rolesService.create(dto);
  }

  // Mọi user đã đăng nhập đều có thể xem danh sách Role (để assign khi tạo nhân sự)
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(+id);
  }

  // Chỉ Admin mới được sửa permissions của Role
  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'SystemManagement'))
  update(@Param('id') id: string, @Body() dto: any) {
    return this.rolesService.update(+id, dto);
  }

  // Chỉ Admin mới được xóa Role
  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'SystemManagement'))
  remove(@Param('id') id: string) {
    return this.rolesService.remove(+id);
  }
}
