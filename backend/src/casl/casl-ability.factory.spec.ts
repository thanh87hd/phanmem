import { Test, TestingModule } from '@nestjs/testing';
import { CaslAbilityFactory, Action } from './casl-ability.factory';
import { User } from '../users/entities/user.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';

describe('CaslAbilityFactory (TDD)', () => {
  let factory: CaslAbilityFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CaslAbilityFactory],
    }).compile();

    factory = module.get<CaslAbilityFactory>(CaslAbilityFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('Unauthenticated User', () => {
    it('should not allow anything if user is null', () => {
      const ability = factory.createForUser(null);
      expect(ability.can(Action.Read, 'all')).toBe(false);
      expect(ability.can(Action.Manage, 'all')).toBe(false);
    });
  });

  describe('Admin and Leader Roles', () => {
    it('should allow Admin to manage everything', () => {
      const user = { role: 'Admin' };
      const ability = factory.createForUser(user);
      expect(ability.can(Action.Manage, 'all')).toBe(true);
      expect(ability.can(Action.Delete, User)).toBe(true);
    });

    it('should allow Lãnh đạo KTNB to manage everything', () => {
      const user = { role: 'Lãnh đạo KTNB' };
      const ability = factory.createForUser(user);
      expect(ability.can(Action.Manage, 'all')).toBe(true);
    });
  });

  describe('BKS (Ban Kiểm Soát) - TC-BKS-02', () => {
    it('should allow BKS to read all and manage RegulatoryExam, AuditCharter, IaStrategicPlan', () => {
      const user = { role: 'BKS' };
      const ability = factory.createForUser(user);

      // TC-BKS-02 Fix Verification: BKS must have full manage and create rights on RegulatoryExam
      expect(ability.can(Action.Manage, 'RegulatoryExam')).toBe(true);
      expect(ability.can(Action.Create, 'RegulatoryExam')).toBe(true);
      expect(ability.can(Action.Read, 'RegulatoryExam')).toBe(true);
      expect(ability.can(Action.Update, 'RegulatoryExam')).toBe(true);

      // Other BKS specific rules
      expect(ability.can(Action.Read, 'all')).toBe(true);
      expect(ability.can(Action.Manage, 'AuditCharter')).toBe(true);
      expect(ability.can(Action.Manage, 'IaStrategicPlan')).toBe(true);
      expect(ability.can(Action.Update, 'AuditCommittee')).toBe(true);
      expect(ability.can(Action.Create, 'AuditCommittee')).toBe(false);
    });

    /**
     * TC-BKS-02b (regression production): tài khoản UAT thật đăng nhập bằng mã
     * vai trò `bks.chair` và `bks.member`, KHÔNG phải chuỗi 'BKS'.
     *
     * Lỗi đã xảy ra: `RoleKeywords.BKS` thiếu từ khoá 'bks' và nhánh BKS trong
     * casl-ability.factory có `cannot(Action.Create, 'RegulatoryExam')` → cả hai
     * tài khoản nhận HTTP 403 "Bạn không có quyền thực hiện thao tác này theo
     * luật ABAC mới." khi tạo Đợt Thanh tra, trái ma trận RBAC (BKS = Full).
     */
    it.each(['bks.chair', 'bks.member', 'BKS', 'Trưởng ban kiểm soát'])(
      'TC-BKS-02b: vai trò "%s" phải tạo được RegulatoryExam',
      (role) => {
        const ability = factory.createForUser({ role });
        expect(ability.can(Action.Create, 'RegulatoryExam')).toBe(true);
        expect(ability.can(Action.Update, 'RegulatoryExam')).toBe(true);
        expect(ability.can(Action.Delete, 'RegulatoryExam')).toBe(true);
        expect(ability.can(Action.Manage, 'RegulatoryExam')).toBe(true);
      },
    );

    it('TC-BKS-02b: BKS vẫn bị chặn tạo AuditCommittee (giữ nguyên ràng buộc cũ)', () => {
      const ability = factory.createForUser({ role: 'bks.chair' });
      expect(ability.can(Action.Create, 'AuditCommittee')).toBe(false);
      expect(ability.can(Action.Update, 'AuditCommittee')).toBe(true);
    });

    it('TC-BKS-02b: Kiểm toán viên thường KHÔNG được tạo RegulatoryExam', () => {
      const ability = factory.createForUser({
        role: 'Kiểm toán viên',
        permissions: [],
      });
      expect(ability.can(Action.Create, 'RegulatoryExam')).toBe(false);
    });

    it('should verify that non-privileged Auditee cannot create or manage RegulatoryExam', () => {
      const auditeeUser = { role: 'Đơn vị', permissions: ['auditee_portal'] };
      const ability = factory.createForUser(auditeeUser);

      expect(ability.can(Action.Manage, 'RegulatoryExam')).toBe(false);
      expect(ability.can(Action.Create, 'RegulatoryExam')).toBe(false);
    });
  });

  describe('Dynamic Permissions (ABAC)', () => {
    it('should allow managing User if personnel permission exists', () => {
      const user = { role: 'Thành viên', permissions: ['personnel'] };
      const ability = factory.createForUser(user);

      expect(ability.can(Action.Manage, User)).toBe(true);
      expect(ability.can(Action.Manage, 'SystemManagement')).toBe(false);
    });

    it('should only allow reading AuditEngagement if no audit_engagements permission', () => {
      const user = { role: 'Thành viên', permissions: [] };
      const ability = factory.createForUser(user);

      expect(ability.can(Action.Read, AuditEngagement)).toBe(true);
      expect(ability.can(Action.Manage, AuditEngagement)).toBe(false);
    });

    it('should allow managing AuditEngagement if audit_engagements permission exists', () => {
      const user = { role: 'Thành viên', permissions: ['audit_engagements'] };
      const ability = factory.createForUser(user);

      expect(ability.can(Action.Manage, AuditEngagement)).toBe(true);
    });
  });
});
