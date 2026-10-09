import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuditTrailService } from '../audit-trail/audit-trail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { ForbiddenException } from '@nestjs/common';

describe('UsersController (Security & Privilege Escalation Prevention)', () => {
  let controller: UsersController;
  let mockUsersService: any;
  let mockAuditTrailService: any;

  beforeEach(async () => {
    mockUsersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findOneSafe: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      restore: jest.fn(),
      remove: jest.fn(),
    };

    mockAuditTrailService = {
      log: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuditTrailService, useValue: mockAuditTrailService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PoliciesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('update - Anti-Privilege Escalation', () => {
    it('chặn người dùng KTV thông thường khi cố gắng nâng roleId của người khác', async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: 5,
        username: 'target_user',
        roleId: 2, // Auditor
      });

      const req = {
        user: {
          userId: 3,
          username: 'auditor1',
          role: 'Kiểm toán viên',
        },
      };

      await expect(
        controller.update('5', { roleId: 1 }, req),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('chặn người dùng cố gắng tự nâng quyền của chính mình (Self-Privilege Escalation)', async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: 3,
        username: 'auditor1',
        roleId: 2, // Auditor
      });

      const req = {
        user: {
          userId: 3,
          username: 'auditor1',
          role: 'Trưởng nhóm',
        },
      };

      await expect(
        controller.update('3', { roleId: 1 }, req),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('cho phép Quản trị viên (Admin) thay đổi roleId của người dùng', async () => {
      mockUsersService.findOne.mockResolvedValue({
        id: 5,
        username: 'target_user',
        roleId: 2,
      });
      mockUsersService.update.mockResolvedValue({
        id: 5,
        username: 'target_user',
        roleId: 1,
      });

      const req = {
        user: {
          userId: 1,
          username: 'admin',
          role: 'Quản trị hệ thống (Admin)',
        },
      };

      const result = await controller.update('5', { roleId: 1 }, req);

      expect(result).toMatchObject({ id: 5, roleId: 1 });
      expect(mockUsersService.update).toHaveBeenCalledWith(5, { roleId: 1 });
      expect(mockAuditTrailService.log).toHaveBeenCalled();
    });
  });
});
