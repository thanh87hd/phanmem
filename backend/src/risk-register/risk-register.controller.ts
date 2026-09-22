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
  Request,
} from '@nestjs/common';
import { RiskRegisterService } from './risk-register.service';
import { CreateRiskRegisterDto } from './dto/create-risk-register.dto';
import { UpdateRiskRegisterDto } from './dto/update-risk-register.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('risk-register')
@UseGuards(JwtAuthGuard)
export class RiskRegisterController {
  constructor(private readonly riskRegisterService: RiskRegisterService) {}

  @Post()
  create(@Body() createDto: CreateRiskRegisterDto, @Request() req: any) {
    return this.riskRegisterService.create(createDto, req.user);
  }

  @Get()
  findAll(
    @Query('auditObjectId') auditObjectId?: string,
    @Query('domain') domain?: string,
    @Query('riskCategory') riskCategory?: string,
    @Query('finalRiskBand') finalRiskBand?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.riskRegisterService.findAll({
      auditObjectId: auditObjectId ? +auditObjectId : undefined,
      domain,
      riskCategory,
      finalRiskBand,
      search,
      page: page ? +page : undefined,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('summary')
  getSummary(@Query('assessmentYear') assessmentYear?: string) {
    return this.riskRegisterService.getSummary(
      assessmentYear ? +assessmentYear : undefined,
    );
  }

  @Post('bulk-import')
  bulkImport(@Body() items: any[], @Request() req: any) {
    return this.riskRegisterService.bulkImport(items, req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.riskRegisterService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateRiskRegisterDto) {
    return this.riskRegisterService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.riskRegisterService.remove(+id);
  }
}
