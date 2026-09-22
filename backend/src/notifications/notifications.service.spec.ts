import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotificationsService,
  CreateNotificationDto,
} from './notifications.service';
import { Notification } from './entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: any;

  beforeEach(async () => {
    repo = {
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entities) => Promise.resolve(entities)),
      find: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: repo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create notification', async () => {
    const dto: CreateNotificationDto = {
      type: 'info',
      title: 'Chào mừng',
      message: 'Chào mừng bạn đến hệ thống',
      recipientId: 1,
    };
    const result = await service.create(dto);
    expect(repo.create).toHaveBeenCalledWith(dto);
    expect(repo.save).toHaveBeenCalled();
    expect(result.recipientId).toBe(1);
  });

  it('should broadcast notification to multiple recipients', async () => {
    await service.broadcast([1, 2, 3], {
      type: 'alert',
      title: 'Cảnh báo',
      message: 'Nội dung cảnh báo',
    });
    expect(repo.create).toHaveBeenCalledTimes(3);
    expect(repo.save).toHaveBeenCalled();
  });

  it('should find notifications by user', async () => {
    repo.find.mockResolvedValue([{ id: 1, recipientId: 5 }]);
    const result = await service.findByUser(5, 20);
    expect(result).toHaveLength(1);
    expect(repo.find).toHaveBeenCalledWith({
      where: { recipientId: 5 },
      order: { createdAt: 'DESC' },
      take: 20,
    });
  });

  it('should count unread notifications', async () => {
    repo.count.mockResolvedValue(4);
    const count = await service.countUnread(5);
    expect(count).toBe(4);
    expect(repo.count).toHaveBeenCalledWith({
      where: { recipientId: 5, isRead: false },
    });
  });

  it('should mark single notification as read', async () => {
    const res = await service.markAsRead(10, 5);
    expect(res).toEqual({ success: true });
    expect(repo.update).toHaveBeenCalledWith(
      { id: 10, recipientId: 5 },
      { isRead: true },
    );
  });

  it('should mark all notifications as read for user', async () => {
    const res = await service.markAllAsRead(5);
    expect(res).toEqual({ success: true });
    expect(repo.update).toHaveBeenCalledWith(
      { recipientId: 5, isRead: false },
      { isRead: true },
    );
  });

  it('should cleanup notifications older than 90 days', async () => {
    await service.cleanupOld();
    expect(repo.delete).toHaveBeenCalled();
  });
});
