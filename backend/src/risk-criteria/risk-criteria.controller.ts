import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RiskCriteriaService } from './risk-criteria.service';
import { CreateRiskCriterionDto } from './dto/create-risk-criterion.dto';
import { UpdateRiskCriterionDto } from './dto/update-risk-criterion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('risk-criteria')
export class RiskCriteriaController {
  constructor(private readonly riskCriteriaService: RiskCriteriaService) {}

  @Post()
  create(@Body() createRiskCriterionDto: CreateRiskCriterionDto) {
    return this.riskCriteriaService.create(createRiskCriterionDto);
  }

  @Get()
  findAll(@Query('auditCategory') auditCategory?: string) {
    return this.riskCriteriaService.findAll(auditCategory);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.riskCriteriaService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRiskCriterionDto: UpdateRiskCriterionDto,
  ) {
    return this.riskCriteriaService.update(+id, updateRiskCriterionDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.riskCriteriaService.remove(+id);
  }
}
