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
import { AuditTasksService } from './audit-tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-tasks')
export class AuditTasksController {
  constructor(private readonly service: AuditTasksService) {}

  @Post()
  create(@Body() createDto: any) {
    return this.service.create(createDto);
  }

  @Get()
  findAll(
    @Request() req: any,
    @Query('engagementId') engagementId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('year') year?: string,
  ) {
    return this.service.findAll(
      req.user,
      engagementId ? +engagementId : undefined,
      departmentId,
      year,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.service.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
