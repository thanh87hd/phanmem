import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GeneralTask } from './entities/general-task.entity';
import { GeneralTasksService } from './general-tasks.service';
import { GeneralTasksController } from './general-tasks.controller';
import { User } from '../users/entities/user.entity';

import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TypeOrmModule.forFeature([GeneralTask, User]), TasksModule],
  controllers: [GeneralTasksController],
  providers: [GeneralTasksService],
  exports: [GeneralTasksService],
})
export class GeneralTasksModule {}
