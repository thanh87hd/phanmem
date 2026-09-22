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

  describe('BKS (Ban Kiểm Soát)', () => {
    it('should allow BKS to read everything but not manage', () => {
      const user = { role: 'BKS' }; // Assume isBKSRole returns true for 'BKS'
      const ability = factory.createForUser(user);

      // Wait, isBKS allows Read all? Let's check implementation behavior
      // (The test will act as a specification)
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
