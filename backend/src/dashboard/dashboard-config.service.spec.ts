import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardConfigService } from './dashboard-config.service';
import { DashboardConfig } from './entities/dashboard-config.entity';
import { User } from '../users/entities/user.entity';

describe('DashboardConfigService', () => {
  let service: DashboardConfigService;
  let configRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    configRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => ({ ...dto, id: 1 })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardConfigService,
        { provide: getRepositoryToken(DashboardConfig), useValue: configRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<DashboardConfigService>(DashboardConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    it('should return default widgets when no custom config is saved', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'auditor',
        role: { name: 'Auditor' },
      });
      configRepo.findOne.mockResolvedValue(null);

      const result = await service.getConfig(1, 'home');
      expect(result.isDefault).toBe(true);
      expect(result.canCustomize).toBe(false);
      expect(result.widgets.length).toBeGreaterThan(0);
    });

    it('should return saved widgets when custom config exists', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        role: { name: 'Admin' },
      });
      configRepo.findOne.mockResolvedValue({
        id: 10,
        config: {
          widgets: [
            { widgetId: 'kpi-cards', visible: true, order: 1, size: 'full' },
          ],
        },
      });

      const result = await service.getConfig(1, 'home');
      expect(result.isDefault).toBe(false);
      expect(result.canCustomize).toBe(true);
      expect(result.widgets).toHaveLength(1);
    });
  });

  describe('saveConfig', () => {
    it('should throw error if user cannot customize', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 2,
        username: 'auditor',
        role: { name: 'Auditor' },
      });

      await expect(
        service.saveConfig(2, 'home', 'default', []),
      ).rejects.toThrow('Bạn không có quyền tùy chỉnh Dashboard.');
    });

    it('should save new config if authorized', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        role: { name: 'Admin' },
      });
      configRepo.findOne.mockResolvedValue(null);

      const widgets = [
        {
          widgetId: 'kpi-cards',
          visible: true,
          order: 1,
          size: 'full' as const,
        },
      ];
      const result = await service.saveConfig(1, 'home', 'default', widgets);

      expect(configRepo.create).toHaveBeenCalled();
      expect(configRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update existing config if authorized', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        role: { name: 'Admin' },
      });
      const existing = { id: 10, config: { widgets: [] } };
      configRepo.findOne.mockResolvedValue(existing);

      const widgets = [
        {
          widgetId: 'kpi-cards',
          visible: true,
          order: 1,
          size: 'full' as const,
        },
      ];
      await service.saveConfig(1, 'home', 'default', widgets);

      expect(configRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          config: { widgets },
        }),
      );
    });
  });

  describe('resetConfig', () => {
    it('should throw error if user cannot customize', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 2,
        username: 'auditor',
        role: { name: 'Auditor' },
      });

      await expect(service.resetConfig(2, 'home')).rejects.toThrow(
        'Bạn không có quyền tùy chỉnh Dashboard.',
      );
    });

    it('should delete custom config and return defaults', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        username: 'admin',
        role: { name: 'Admin' },
      });

      const result = await service.resetConfig(1, 'home');
      expect(configRepo.delete).toHaveBeenCalledWith({
        userId: 1,
        dashboardKey: 'home',
        tabKey: 'default',
      });
      expect(result.widgets.length).toBeGreaterThan(0);
    });
  });

  describe('getDefaultWidgets', () => {
    it('should return defaults for known dashboard key', () => {
      const widgets = service.getDefaultWidgets('execution');
      expect(widgets.length).toBeGreaterThan(0);
    });

    it('should return empty array for unknown dashboard key', () => {
      const widgets = service.getDefaultWidgets('unknown');
      expect(widgets).toEqual([]);
    });
  });
});
