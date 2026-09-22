import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DynamicWorkflowsService } from './dynamic-workflows.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller(['automation-flows', 'dynamic-workflows'])
@UseGuards(JwtAuthGuard)
export class DynamicWorkflowsController {
  constructor(private readonly workflowsService: DynamicWorkflowsService) {}

  @Get()
  findAll() {
    return this.workflowsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workflowsService.findOne(id);
  }

  @Post()
  create(@Body() createData: any) {
    return this.workflowsService.create(createData);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.workflowsService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.workflowsService.remove(id);
  }
}
