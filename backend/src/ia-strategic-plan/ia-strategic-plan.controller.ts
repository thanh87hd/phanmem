import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IaStrategicPlanService } from './ia-strategic-plan.service';
import { IaStrategicPlan } from './entities/ia-strategic-plan.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/casl-ability.factory';

@Controller('ia-strategic-plan')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class IaStrategicPlanController {
  constructor(private readonly service: IaStrategicPlanService) {}

  @Get()
  @CheckPolicies((ability) => ability.can(Action.Read, 'IaStrategicPlan'))
  findAll(): Promise<IaStrategicPlan[]> {
    return this.service.findAll();
  }

  @Get('current')
  @CheckPolicies((ability) => ability.can(Action.Read, 'IaStrategicPlan'))
  findCurrent(): Promise<IaStrategicPlan | null> {
    return this.service.findCurrentApproved();
  }

  @Get(':id')
  @CheckPolicies((ability) => ability.can(Action.Read, 'IaStrategicPlan'))
  findOne(@Param('id', ParseIntPipe) id: number): Promise<IaStrategicPlan> {
    return this.service.findOne(id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'IaStrategicPlan'))
  create(@Body() dto: Partial<IaStrategicPlan>, @Req() req: any): Promise<IaStrategicPlan> {
    return this.service.create(dto, req.user);
  }

  @Put(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'IaStrategicPlan'))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<IaStrategicPlan>,
  ): Promise<IaStrategicPlan> {
    return this.service.update(id, dto);
  }

  @Post(':id/submit')
  @CheckPolicies((ability) => ability.can(Action.Update, 'IaStrategicPlan'))
  submit(@Param('id', ParseIntPipe) id: number, @Req() req: any): Promise<IaStrategicPlan> {
    return this.service.submitForApproval(id, req.user);
  }

  @Post(':id/approve')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'IaStrategicPlan'))
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @Req() req: any,
  ): Promise<IaStrategicPlan> {
    return this.service.approve(id, req.user, notes);
  }

  @Post(':id/reject')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'IaStrategicPlan'))
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Body('notes') notes: string,
    @Req() req: any,
  ): Promise<IaStrategicPlan> {
    return this.service.reject(id, req.user, notes);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Manage, 'IaStrategicPlan'))
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }
}
