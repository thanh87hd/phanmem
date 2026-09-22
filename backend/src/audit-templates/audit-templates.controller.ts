import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuditTemplatesService } from './audit-templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('audit-templates')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class AuditTemplatesController {
  constructor(private readonly service: AuditTemplatesService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditTemplate'))
  findAll() {
    return this.service.findAll();
  }

  @Post(':id/use')
  @CheckPolicies((ability) => ability.can(Action.Read, 'AuditTemplate'))
  use(@Param('id') id: string) {
    return this.service.use(+id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTemplate'))
  create(@Body() data: any) {
    return this.service.create(data);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTemplate'))
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(+id, data);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'AuditTemplate'))
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
