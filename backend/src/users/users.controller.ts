import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { User } from './entities/user.entity';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { isAdminRole, isLanhDaoRole } from '../utils/role-checker.util';

@Controller('users')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditTrailService: AuditTrailService,
  ) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, User))
  async create(@Body() createUserDto: CreateUserDto, @Request() req: any) {
    const result = await this.usersService.create(createUserDto);
    const saved = Array.isArray(result) ? result[0] : result;
    await this.auditTrailService.log({
      action: 'CREATE',
      resource: 'users',
      resourceId: saved?.id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: { username: saved?.username, fullName: saved?.fullName },
    });
    return result;
  }

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, User))
  findAll(@Query() query: any, @Request() req: any) {
    return this.usersService.findAll(req.user, query);
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, User))
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.usersService.findOneSafe(+id, req.user);
  }

  @Patch(':id/status')
  @CheckPolicies((ability) => ability.can(Action.Update, User))
  async updateStatus(
    @Param('id') id: string,
    @Body() updateUserStatusDto: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    const oldUser = await this.usersService.findOne(+id);
    const result = await this.usersService.updateStatus(+id, updateUserStatusDto);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'users',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      oldValue: { status: oldUser?.status, isActive: oldUser?.isActive },
      newValue: updateUserStatusDto,
    });
    return result;
  }

  @Post(':id/restore')
  @CheckPolicies((ability) => ability.can(Action.Update, User))
  async restore(@Param('id') id: string, @Request() req: any) {
    const oldUser = await this.usersService.findOne(+id);
    const result = await this.usersService.restore(+id);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'users',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      oldValue: { status: oldUser?.status, isActive: oldUser?.isActive },
      newValue: { status: 'Active', isActive: true },
    });
    return result;
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, User))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    const oldUser = await this.usersService.findOne(+id);

    // Chống leo thang đặc quyền: Chỉ Admin / Lãnh đạo mới được thay đổi roleId
    if (
      updateUserDto.roleId !== undefined &&
      oldUser &&
      updateUserDto.roleId !== oldUser.roleId
    ) {
      const userRole = req.user?.role;
      if (!isAdminRole(userRole) && !isLanhDaoRole(userRole)) {
        throw new ForbiddenException(
          'Chỉ Quản trị viên hệ thống hoặc Lãnh đạo KTNB mới có quyền thay đổi vai trò (role) của người dùng.',
        );
      }
      if (req.user?.userId === +id && !isAdminRole(userRole)) {
        throw new ForbiddenException(
          'Người dùng không được phép tự thay đổi vai trò của chính mình.',
        );
      }
    }

    const result = await this.usersService.update(+id, updateUserDto);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'users',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      oldValue: { username: oldUser?.username, isActive: oldUser?.isActive, roleId: oldUser?.roleId },
      newValue: updateUserDto,
    });
    return result;
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, User))
  async remove(@Param('id') id: string, @Request() req: any) {
    const oldUser = await this.usersService.findOne(+id);
    const result = await this.usersService.remove(+id);
    await this.auditTrailService.log({
      action: 'DELETE',
      resource: 'users',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      oldValue: { username: oldUser?.username },
    });
    return result;
  }

  @Get(':id/competencies')
  getCompetencies(@Param('id') id: string) {
    return this.usersService.getCompetencies(+id);
  }

  @Post(':id/competencies')
  async updateCompetency(
    @Param('id') id: string,
    @Body()
    body: {
      skillName: string;
      rating: number;
      notes?: string;
      skillCategory?: string;
    },
    @Request() req: any,
  ) {
    const result = await this.usersService.updateCompetency(
      +id,
      body.skillName,
      body.rating,
      body.notes,
      body.skillCategory,
    );
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'users',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      newValue: body,
    });
    return result;
  }
}
