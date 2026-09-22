import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MasterDataChangeService } from './master-data-change.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ChangeCategory,
  ChangeRequestStatus,
} from './entities/master-data-change-request.entity';

@Controller('master-data-changes')
@UseGuards(JwtAuthGuard)
export class MasterDataChangeController {
  constructor(private readonly service: MasterDataChangeService) {}

  @Get()
  findAll(
    @Query('category') category?: ChangeCategory,
    @Query('status') status?: ChangeRequestStatus,
    @Query('isMidYearAddition') isMidYearAddition?: string,
  ) {
    return this.service.findAll({
      category,
      status,
      isMidYearAddition:
        isMidYearAddition === 'true'
          ? true
          : isMidYearAddition === 'false'
            ? false
            : undefined,
    });
  }

  @Get('emerging-risks-summary')
  getEmergingRisksSummary() {
    return this.service.getEmergingRisksSummary();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() payload: any, @Request() req: any) {
    return this.service.create(payload, req.user);
  }

  @Post(':id/approve-l1')
  approveL1(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.service.approveL1(+id, notes || '', req.user);
  }

  @Post(':id/approve-l2')
  approveL2(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @Request() req: any,
  ) {
    return this.service.approveL2(+id, notes || '', req.user);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.service.reject(+id, reason || '', req.user);
  }
}
