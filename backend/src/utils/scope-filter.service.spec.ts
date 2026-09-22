import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ScopeFilterService } from './scope-filter.service';
import { User } from '../users/entities/user.entity';

describe('ScopeFilterService', () => {
  let service: ScopeFilterService;
  let userRepo: any;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScopeFilterService,
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<ScopeFilterService>(ScopeFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('static helper methods', () => {
    it('should correctly identify admin/cae roles', () => {
      expect(ScopeFilterService.isAdminRole('Admin')).toBe(true);
      expect(ScopeFilterService.isAdminRole('Quản trị hệ thống')).toBe(true);
      expect(ScopeFilterService.isAdminRole('Trưởng ban KTNB')).toBe(true);
      expect(
        ScopeFilterService.isAdminRole(undefined, 'Giám đốc Khối KTNB'),
      ).toBe(true);
      expect(ScopeFilterService.isAdminRole('Auditor', 'Kiểm toán viên')).toBe(
        false,
      );
    });

    it('should correctly identify department lead roles', () => {
      expect(ScopeFilterService.isDeptLeadRole('Trưởng phòng KT')).toBe(true);
      expect(ScopeFilterService.isDeptLeadRole('Phó phòng KT')).toBe(true);
      expect(ScopeFilterService.isDeptLeadRole('Trưởng nhóm')).toBe(true);
      expect(
        ScopeFilterService.isDeptLeadRole(undefined, 'Trưởng phòng Kiểm toán'),
      ).toBe(true);
      expect(ScopeFilterService.isDeptLeadRole('Admin')).toBe(false); // Admin is excluded from dept lead
      expect(ScopeFilterService.isDeptLeadRole('Auditor')).toBe(false);
    });
  });

  describe('getUserFilters', () => {
    it('should return GLOBAL fallback if user payload is missing or invalid', async () => {
      const res = await service.getUserFilters(null);
      expect(res.scope.level).toBe('GLOBAL');
      expect(res.user).toBeNull();
    });

    it('should return GLOBAL fallback if user not found in repository', async () => {
      userRepo.findOne.mockResolvedValue(null);
      const res = await service.getUserFilters({ userId: 999 });
      expect(res.scope.level).toBe('GLOBAL');
      expect(res.user).toBeNull();
    });

    it('should determine GLOBAL level for Admin user', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 1,
        role: { name: 'Admin', permissions: 'all' },
        department: 'KTNB',
      });

      const res = await service.getUserFilters({ userId: 1 });
      expect(res.scope.level).toBe('GLOBAL');
      expect(res.scope.isGlobalCaeOrAdmin).toBe(true);
      expect(res.scope.isDivisionLead).toBe(true);
    });

    it('should determine DEPARTMENT level for Team Lead', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 5,
        role: { name: 'LeadAuditor' },
        jobTitle: 'Trưởng phòng Kiểm toán Nghiệp vụ',
        teamCode: 'TEAM_A',
      });

      const res = await service.getUserFilters({ userId: 5 });
      expect(res.scope.level).toBe('DEPARTMENT');
      expect(res.scope.isDeptLead).toBe(true);
      expect(res.scope.teamCode).toBe('TEAM_A');
    });

    it('should determine INDIVIDUAL level for regular auditor', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 12,
        role: { name: 'Auditor' },
        jobTitle: 'Kiểm toán viên',
        teamCode: 'TEAM_B',
      });

      const res = await service.getUserFilters({ userId: 12 });
      expect(res.scope.level).toBe('INDIVIDUAL');
      expect(res.scope.isAuditor).toBe(true);
    });
  });

  describe('filterByScope', () => {
    it('should return data unchanged', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      expect(await service.filterByScope({}, data)).toBe(data);
    });
  });
});
