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
import { WorkingPaperTemplatesService } from './working-paper-templates.service';
import { CreateWorkingPaperTemplateDto } from './dto/create-working-paper-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('working-paper-templates')
@UseGuards(JwtAuthGuard)
export class WorkingPaperTemplatesController {
  constructor(private readonly service: WorkingPaperTemplatesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Post()
  create(@Body() dto: CreateWorkingPaperTemplateDto) {
    return this.service.create(dto);
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
