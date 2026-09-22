import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  Post,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findMy(@Request() req: any) {
    return this.service.findByUser(req.user.userId);
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    const count = await this.service.countUnread(req.user.userId);
    return { count };
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: any) {
    return this.service.markAsRead(+id, req.user.userId);
  }

  @Post('mark-all-read')
  markAllAsRead(@Request() req: any) {
    return this.service.markAllAsRead(req.user.userId);
  }
}
