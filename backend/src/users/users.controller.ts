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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';
import { User } from './entities/user.entity';
import { AuditTrailService } from '../audit-trail/audit-trail.service';

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
  findAll(@Request() req: any) {
    return this.usersService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOneSafe(+id);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, User))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    const oldUser = await this.usersService.findOne(+id);
    const result = await this.usersService.update(+id, updateUserDto);
    await this.auditTrailService.log({
      action: 'UPDATE',
      resource: 'users',
      resourceId: +id,
      userId: req.user?.userId,
      username: req.user?.username,
      oldValue: { username: oldUser?.username, isActive: oldUser?.isActive },
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
    @Body() body: { skillName: string; rating: number; notes?: string },
    @Request() req: any,
  ) {
    const result = await this.usersService.updateCompetency(
      +id,
      body.skillName,
      body.rating,
      body.notes,
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
