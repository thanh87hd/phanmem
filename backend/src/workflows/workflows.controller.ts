import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('workflows')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'Workflow'))
  findAll() {
    return this.workflowsService.findAll();
  }

  @Get('by-entity')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Workflow'))
  findByEntity(@Query('entityType') entityType: string) {
    return this.workflowsService.findByEntity(entityType);
  }

  @Get('next-step')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Workflow'))
  getNextStep(
    @Query('entityType') entityType: string,
    @Query('currentStatus') currentStatus: string,
  ) {
    return this.workflowsService.getNextStep(entityType, currentStatus);
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Workflow'))
  create(@Body() data: any) {
    return this.workflowsService.createDefinition(data);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'Workflow'))
  update(@Param('id') id: string, @Body() data: any) {
    return this.workflowsService.updateDefinition(+id, data);
  }
}
