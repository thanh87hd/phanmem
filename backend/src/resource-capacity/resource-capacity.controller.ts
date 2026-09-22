import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ResourceCapacityService } from './resource-capacity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('resource-capacity')
export class ResourceCapacityController {
  constructor(private readonly resourceService: ResourceCapacityService) {}

  @Get('staff')
  async getStaff(
    @Query('skill') skill?: string,
    @Query('department') department?: string,
  ) {
    return this.resourceService.getStaffRoster({ skill, department });
  }

  @Get('demands')
  async getDemands(@Query('quarter') quarter?: string) {
    return this.resourceService.getDemands(quarter);
  }

  @Get('allocations')
  async getAllocations() {
    return this.resourceService.getAllocations();
  }

  @Get('quarterly-summary')
  async getQuarterlySummary() {
    return this.resourceService.getQuarterlyCapacitySummary();
  }

  @Get('skill-gap-matrix')
  async getSkillGapMatrix() {
    return this.resourceService.getSkillGapMatrix();
  }

  @Post('allocate')
  async allocate(@Body() body: any) {
    return this.resourceService.allocate(body);
  }
}
