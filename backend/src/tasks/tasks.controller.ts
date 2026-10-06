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
  findAll(@Request() req: any, @Query() query: any) {
    // Phải truyền req.user: TasksService chỉ áp dụng chính sách phân tách dữ liệu
    // (theo đoàn KT / phòng ban / teamCode) khi có user; thiếu user thì mọi vai
    // trò đều đọc được toàn bộ công việc.
    return this.tasksService.findAll(query, req.user);
  }

  @Get('my-tasks')
  findMyTasks(@Request() req: any, @Query() query: any) {
    // req.user has user info injected by JwtAuthGuard.
    // LƯU Ý: JWT trả về `userId` (không phải `id`) — dùng req.user.id sẽ khiến
    // bộ lọc assignedToId = undefined và endpoint trả về TOÀN BỘ công việc.
    return this.tasksService.findAll(
      { ...query, assignedToId: req.user.userId },
      req.user,
    );
  }

  @Get('delegated')
  findDelegatedTasks(@Request() req: any, @Query() query: any) {
    return this.tasksService.findAll(
      { ...query, assignedById: req.user.userId },
      req.user,
    );
  }

  @Get('department/:deptId')
  findDepartmentTasks(
    @Request() req: any,
    @Param('deptId') deptId: string,
    @Query() query: any,
  ) {
    return this.tasksService.findAll(
      {
        ...query,
        assignedDepartmentId: +deptId,
      },
      req.user,
    );
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
