import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuditUniverseService } from './audit-universe.service';
import { CreateAuditUniverseDto } from './dto/create-audit-universe.dto';
import { UpdateAuditUniverseDto } from './dto/update-audit-universe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-universe')
export class AuditUniverseController {
  constructor(private readonly auditUniverseService: AuditUniverseService) {}

  @Post()
  create(@Body() createAuditUniverseDto: CreateAuditUniverseDto) {
    return this.auditUniverseService.create(createAuditUniverseDto);
  }

  @Post('recalculate')
  recalculateAll() {
    return this.auditUniverseService.recalculateAll();
  }

  @Get()
  findAll() {
    return this.auditUniverseService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.auditUniverseService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAuditUniverseDto: UpdateAuditUniverseDto,
  ) {
    return this.auditUniverseService.update(+id, updateAuditUniverseDto);
  }

  @Post('transfer-risk')
  transferRisk(
    @Body()
    body: {
      sourceUniverseId: number;
      targetUniverseId: number;
      notes?: string;
    },
  ) {
    return this.auditUniverseService.transferRisk(
      body.sourceUniverseId,
      body.targetUniverseId,
      body.notes,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.auditUniverseService.remove(+id);
  }
}
