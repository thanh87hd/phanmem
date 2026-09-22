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
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('all') all?: string) {
    return this.departmentsService.findAll(user, all === 'true' || all === '1');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ) {
    return this.departmentsService.update(+id, updateDepartmentDto);
  }

  @Get('compare/periods')
  comparePeriods(
    @Query('year1') year1?: string,
    @Query('year2') year2?: string,
  ) {
    return this.departmentsService.comparePeriods(
      year1 ? parseInt(year1, 10) : 2025,
      year2 ? parseInt(year2, 10) : 2026,
    );
  }

  @Get(':id/history')
  getUnitHistory(@Param('id') id: string) {
    return this.departmentsService.getUnitHistory(+id);
  }

  @Post(':id/snapshot')
  recordSnapshot(
    @Param('id') id: string,
    @Body()
    body: {
      periodYear: number;
      changeType?: string;
      notes?: string;
      decisionNumber?: string;
    },
  ) {
    return this.departmentsService.recordPeriodSnapshot(
      body.periodYear,
      +id,
      body.changeType,
      body.notes,
      body.decisionNumber,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(+id);
  }
}
