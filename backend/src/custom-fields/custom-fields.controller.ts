import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CustomFieldsService } from './custom-fields.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('custom-fields')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class CustomFieldsController {
  constructor(private readonly customFieldsService: CustomFieldsService) {}

  @Get()
  findAll(@Query('entityType') entityType?: string) {
    if (entityType) {
      return this.customFieldsService.findByEntity(entityType);
    }
    return this.customFieldsService.findAll();
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'CustomField'))
  create(@Body() data: any) {
    return this.customFieldsService.create(data);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'CustomField'))
  update(@Param('id') id: string, @Body() data: any) {
    return this.customFieldsService.update(+id, data);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'CustomField'))
  remove(@Param('id') id: string) {
    return this.customFieldsService.remove(+id);
  }
}
