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
import { AuditSchedulesService } from './audit-schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-schedules')
export class AuditSchedulesController {
  constructor(private readonly service: AuditSchedulesService) {}

  @Post()
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('teamCode') teamCode?: string,
    @Query('userId') userId?: string,
    @Query('month') month?: string,
  ) {
    return this.service.findAll(req.user, {
      teamCode,
      userId: userId ? +userId : undefined,
      month,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(+id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
