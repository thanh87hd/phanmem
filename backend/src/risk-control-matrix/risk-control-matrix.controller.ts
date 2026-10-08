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
import { RiskControlMatrixService } from './risk-control-matrix.service';
import { CreateRiskControlMatrixDto } from './dto/create-risk-control-matrix.dto';
import { UpdateRiskControlMatrixDto } from './dto/update-risk-control-matrix.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('risk-control-matrix')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RiskControlMatrixController {
  constructor(private readonly rcmService: RiskControlMatrixService) {}

  @Post()
  create(@Body() createDto: CreateRiskControlMatrixDto, @Request() req: any) {
    return this.rcmService.create(createDto, req.user);
  }

  @Get()
  findAll(@Request() req: any) {
    return this.rcmService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rcmService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateRiskControlMatrixDto,
  ) {
    return this.rcmService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.rcmService.remove(+id);
  }
}
