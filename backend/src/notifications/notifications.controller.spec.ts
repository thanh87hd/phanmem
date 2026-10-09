import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * WS2 — lấp khoảng trống spec cho `notifications.controller.ts`.
 * Controller này trước đây KHÔNG có spec. Kiểm tra:
 *  - module Nest biên dịch được với service được mock;
 *  - metadata route (path + HTTP verb) không bị đổi ngoài ý muốn;
 *  - mọi handler uỷ quyền ĐÚNG service method với ĐÚNG userId lấy từ JWT (req.user.userId),
 *    không lấy userId từ param/body (tránh IDOR).
 */
const routeOf = (handler: (...args: any[]) => any) => ({
  path: Reflect.getMetadata(PATH_METADATA, handler),
  method: Reflect.getMetadata(METHOD_METADATA, handler),
});

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const service = {
    findByUser: jest.fn(),
    countUnread: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: service }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn tiền tố route @Controller("notifications")', () => {
    expect(Reflect.getMetadata(PATH_METADATA, NotificationsController)).toBe(
      'notifications',
    );
  });

  describe('metadata route', () => {
    it.each([
      ['findMy', 'findMy', '/', RequestMethod.GET],
      ['unreadCount', 'unreadCount', 'unread-count', RequestMethod.GET],
      ['markAsRead', 'markAsRead', ':id/read', RequestMethod.PATCH],
      ['markAllAsRead', 'markAllAsRead', 'mark-all-read', RequestMethod.POST],
    ] as const)(
      '%s → %s %s',
      (_label, methodName, expectedPath, expectedMethod) => {
        const handler = (controller as any)[methodName];
        expect(typeof handler).toBe('function');
        expect(routeOf(handler)).toEqual({
          path: expectedPath,
          method: expectedMethod,
        });
      },
    );
  });

  describe('uỷ quyền cho NotificationsService', () => {
    const req = { user: { userId: 42 } };

    it('findMy() chỉ lấy thông báo của chính user trong token', async () => {
      service.findByUser.mockResolvedValue([{ id: 1 }]);

      await expect(controller.findMy(req as any)).resolves.toEqual([{ id: 1 }]);
      expect(service.findByUser).toHaveBeenCalledTimes(1);
      expect(service.findByUser).toHaveBeenCalledWith(42);
    });

    it('unreadCount() bọc số lượng vào object { count }', async () => {
      service.countUnread.mockResolvedValue(7);

      await expect(controller.unreadCount(req as any)).resolves.toEqual({
        count: 7,
      });
      expect(service.countUnread).toHaveBeenCalledWith(42);
    });

    it('markAsRead() ép id từ param sang number và dùng userId từ token', async () => {
      service.markAsRead.mockResolvedValue({ id: 5, isRead: true });

      await controller.markAsRead('5', req as any);

      expect(service.markAsRead).toHaveBeenCalledWith(5, 42);
    });

    it('markAllAsRead() chỉ đánh dấu cho user trong token', async () => {
      service.markAllAsRead.mockResolvedValue({ updated: 3 });

      await controller.markAllAsRead(req as any);

      expect(service.markAllAsRead).toHaveBeenCalledWith(42);
    });

    it('KHÔNG nhận userId do client cung cấp (chống IDOR)', async () => {
      service.findByUser.mockResolvedValue([]);
      const forged = {
        user: { userId: 42 },
        query: { userId: 999 },
        body: { userId: 999 },
      };

      await controller.findMy(forged as any);

      expect(service.findByUser).toHaveBeenCalledWith(42);
      expect(service.findByUser).not.toHaveBeenCalledWith(999);
    });

    it('lỗi từ service được ném nguyên vẹn (không nuốt lỗi)', async () => {
      const boom = new Error('DB down');
      service.countUnread.mockRejectedValue(boom);

      await expect(controller.unreadCount(req as any)).rejects.toThrow(
        'DB down',
      );
    });
  });
});
