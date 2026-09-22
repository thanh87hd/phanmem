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
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Get()
  findAll(@Query() query: any) {
    return this.tasksService.findAll(query);
  }

  @Get('my-tasks')
  findMyTasks(@Request() req: any, @Query() query: any) {
    // req.user has user info injected by JwtAuthGuard
    return this.tasksService.findAll({ ...query, assignedToId: req.user.id });
  }

  @Get('delegated')
  findDelegatedTasks(@Request() req: any, @Query() query: any) {
    return this.tasksService.findAll({ ...query, assignedById: req.user.id });
  }

  @Get('department/:deptId')
  findDepartmentTasks(@Param('deptId') deptId: string, @Query() query: any) {
    return this.tasksService.findAll({
      ...query,
      assignedDepartmentId: +deptId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(+id, updateTaskDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.tasksService.remove(+id);
  }
}
