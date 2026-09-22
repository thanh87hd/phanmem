import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AlertService } from './alert.service';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';

describe('AlertService', () => {
  let service: AlertService;
  let recRepo: any;
  let reportRepo: any;
  let userRepo: any;
  let notificationsService: any;
  let mailService: any;
  let configService: any;

  beforeEach(async () => {
    recRepo = {
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      manager: {
        getRepository: jest.fn(() => ({
          find: jest.fn().mockResolvedValue([]),
        })),
      },
    };

    reportRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    userRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      })),
    };

    notificationsService = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      broadcast: jest.fn().mockResolvedValue(undefined),
      findByUser: jest.fn().mockResolvedValue([]),
    };

    mailService = {
      sendOverdueWarning: jest.fn().mockResolvedValue(true),
      sendMail: jest.fn().mockResolvedValue(true),
    };

    configService = {
      get: jest.fn().mockReturnValue('http://localhost:5173'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: getRepositoryToken(Recommendation), useValue: recRepo },
        { provide: getRepositoryToken(AuditReport), useValue: reportRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: MailService, useValue: mailService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleOverdueRecommendations', () => {
    it('should update overdue recommendations and send notifications', async () => {
      const mockOverdue = [
        {
          id: 1,
          recommendation: 'Khắc phục chứng từ thiếu',
          dueDate: '2026-01-01',
          assignedToId: 10,
          assignedToUser: { email: 'auditee@bank.vn' },
          status: 'InProgress',
          legacyDepartment: 'Chi nhánh Hà Nội',
        },
      ];

      recRepo.createQueryBuilder = jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockOverdue),
      }));

      await service.handleOverdueRecommendations();

      expect(mockOverdue[0].status).toBe('Overdue');
      expect(recRepo.save).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          recipientId: 10,
        }),
      );
      expect(mailService.sendOverdueWarning).toHaveBeenCalled();
    });
  });

  describe('handlePendingReports', () => {
    it('should broadcast alerts for pending review reports to approvers', async () => {
      reportRepo.find.mockResolvedValue([
        {
          id: 1,
          title: 'Báo cáo Kiểm toán Hội sở Q1',
          status: 'PendingReview',
        },
      ]);

      userRepo.createQueryBuilder = jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 100 }, { id: 101 }]),
      }));

      await service.handlePendingReports();

      expect(notificationsService.broadcast).toHaveBeenCalledWith(
        [100, 101],
        expect.objectContaining({
          type: 'info',
          title: 'Báo cáo chờ duyệt',
        }),
      );
    });
  });

  describe('handleBirthdayNotifications', () => {
    it('should send birthday card if today is user birthday', async () => {
      const now = new Date();
      const todayStr = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/1990`;

      userRepo.find.mockResolvedValue([
        {
          id: 5,
          fullName: 'Nguyễn Văn A',
          birthDate: todayStr,
          isActive: true,
        },
      ]);
      notificationsService.findByUser.mockResolvedValue([]);

      await service.handleBirthdayNotifications();

      expect(notificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'BIRTHDAY_CARD',
          recipientId: 5,
        }),
      );
    });
  });

  describe('handleLateRemediationPlans', () => {
    it('should escalate recommendations late in plan formulation past 7 days', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      reportRepo.find.mockResolvedValue([
        {
          id: 1,
          title: 'Báo cáo phát hành',
          status: 'Issued',
          date: pastDate.toISOString(),
          engagementId: 10,
        },
      ]);

      recRepo.manager.getRepository = jest.fn(() => ({
        find: jest.fn().mockResolvedValue([{ id: 101 }]),
      }));

      const mockPendingRec = {
        id: 201,
        recommendation: 'Cần bổ sung quy trình phê duyệt',
        status: 'NotStarted',
        assignedToId: 15,
        assignedToUser: { email: 'manager@bank.vn' },
        legacyDepartment: 'Phòng Tín dụng',
        escalationLevel: 0,
      };

      recRepo.createQueryBuilder = jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockPendingRec]),
      }));

      await service.handleLateRemediationPlans();

      expect(mockPendingRec.escalationLevel).toBe(1);
      expect(recRepo.save).toHaveBeenCalled();
      expect(notificationsService.create).toHaveBeenCalled();
      expect(mailService.sendMail).toHaveBeenCalled();
    });
  });
});
