import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification } from './entities/notification.entity';

export interface CreateNotificationDto {
  type: string;
  title: string;
  message: string;
  recipientId: number;
  senderId?: number;
  link?: string;
  relatedEntity?: string;
  relatedEntityId?: number;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notif = this.repo.create(dto);
    return this.repo.save(notif);
  }

  /** Gửi thông báo hàng loạt cho nhiều người */
  async broadcast(
    recipientIds: number[],
    dto: Omit<CreateNotificationDto, 'recipientId'>,
  ): Promise<void> {
    const notifications = recipientIds.map((recipientId) =>
      this.repo.create({ ...dto, recipientId }),
    );
    await this.repo.save(notifications);
  }

  /** Lấy thông báo của user, mới nhất trước */
  findByUser(userId: number, limit = 50) {
    return this.repo.find({
      where: { recipientId: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /** Đếm thông báo chưa đọc */
  countUnread(userId: number) {
    return this.repo.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  /** Đánh dấu đã đọc */
  async markAsRead(id: number, userId: number) {
    await this.repo.update({ id, recipientId: userId }, { isRead: true });
    return { success: true };
  }

  /** Đánh dấu tất cả đã đọc */
  async markAllAsRead(userId: number) {
    await this.repo.update(
      { recipientId: userId, isRead: false },
      { isRead: true },
    );
    return { success: true };
  }

  /** Xóa thông báo cũ hơn 90 ngày */
  async cleanupOld() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    await this.repo.delete({ createdAt: LessThan(cutoff) });
  }
}
