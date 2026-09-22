import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityConfig } from './entities/security-config.entity';

export interface SecurityConfigItem {
  key: string;
  value: string;
  description: string;
  standard: string;
  standardRef: string;
  valueType: string;
}

// Default security configuration aligned with PCI DSS v4.0 and ISO 27001:2022
const DEFAULT_CONFIGS: SecurityConfigItem[] = [
  {
    key: 'PASSWORD_MIN_LENGTH',
    value: '12',
    description: 'Độ dài tối thiểu của mật khẩu',
    standard: 'PCI_DSS',
    standardRef: 'PCI DSS 8.3.6',
    valueType: 'number',
  },
  {
    key: 'PASSWORD_COMPLEXITY',
    value: 'true',
    description:
      'Yêu cầu mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt',
    standard: 'PCI_DSS',
    standardRef: 'PCI DSS 8.3.6',
    valueType: 'boolean',
  },
  {
    key: 'PASSWORD_EXPIRY_DAYS',
    value: '90',
    description: 'Số ngày trước khi mật khẩu hết hạn và buộc đổi',
    standard: 'PCI_DSS',
    standardRef: 'PCI DSS 8.3.9',
    valueType: 'number',
  },
  {
    key: 'PASSWORD_HISTORY_COUNT',
    value: '4',
    description: 'Số mật khẩu gần nhất không được phép sử dụng lại',
    standard: 'PCI_DSS',
    standardRef: 'PCI DSS 8.3.7',
    valueType: 'number',
  },
  {
    key: 'MAX_FAILED_ATTEMPTS',
    value: '5',
    description: 'Số lần đăng nhập sai tối đa trước khi khóa tài khoản',
    standard: 'PCI_DSS',
    standardRef: 'PCI DSS 8.3.4',
    valueType: 'number',
  },
  {
    key: 'LOCKOUT_MINUTES',
    value: '30',
    description:
      'Thời gian khóa tài khoản sau khi vượt quá số lần đăng nhập sai (phút)',
    standard: 'PCI_DSS',
    standardRef: 'PCI DSS 8.3.4',
    valueType: 'number',
  },
  {
    key: 'SESSION_TIMEOUT_MINUTES',
    value: '15',
    description: 'Thời gian tự động hết phiên khi không hoạt động (phút)',
    standard: 'PCI_DSS',
    standardRef: 'PCI DSS 8.2.8',
    valueType: 'number',
  },
  {
    key: 'REQUIRE_MFA',
    value: 'false',
    description: 'Yêu cầu xác thực đa yếu tố (Multi-Factor Authentication)',
    standard: 'PCI_DSS',
    standardRef: 'PCI DSS 8.4.2',
    valueType: 'boolean',
  },
  {
    key: 'AUDIT_LOG_RETENTION_MONTHS',
    value: '12',
    description: 'Thời gian lưu trữ nhật ký audit trail tối thiểu (tháng)',
    standard: 'ISO_27001',
    standardRef: 'ISO 27001 A.8.15',
    valueType: 'number',
  },
  {
    key: 'MIN_ROLE_FOR_BACKUP',
    value: 'Admin',
    description: 'Vai trò tối thiểu để thực hiện backup/restore database',
    standard: 'ISO_27001',
    standardRef: 'ISO 27001 A.8.13',
    valueType: 'string',
  },
  {
    key: 'FORCE_HTTPS',
    value: 'true',
    description: 'Bắt buộc sử dụng HTTPS cho tất cả kết nối',
    standard: 'BOTH',
    standardRef: 'PCI DSS 4.2.1 / ISO 27001 A.8.24',
    valueType: 'boolean',
  },
  {
    key: 'JWT_EXPIRY_HOURS',
    value: '8',
    description: 'Thời gian hết hạn của JWT token (giờ)',
    standard: 'BOTH',
    standardRef: 'PCI DSS 8.2.8 / ISO 27001 A.8.3',
    valueType: 'number',
  },
  {
    key: 'AUTH_MODE_LOCAL_ENABLED',
    value: 'true',
    description: 'Bật phương thức đăng nhập bằng tài khoản cục bộ (Local User)',
    standard: 'BOTH',
    standardRef: 'Auth Security',
    valueType: 'boolean',
  },
  {
    key: 'AUTH_MODE_LDAP_ENABLED',
    value: 'true',
    description:
      'Bật phương thức đăng nhập bằng Active Directory / LDAP LPBank',
    standard: 'BOTH',
    standardRef: 'Directory Federation',
    valueType: 'boolean',
  },
  {
    key: 'AUTH_MODE_KEYCLOAK_ENABLED',
    value: 'true',
    description: 'Bật phương thức đăng nhập bằng Keycloak SSO (OpenID Connect)',
    standard: 'BOTH',
    standardRef: 'Enterprise IAM',
    valueType: 'boolean',
  },
  {
    key: 'AUTH_DEFAULT_MODE',
    value: 'ALL',
    description:
      'Chế độ xác thực hiển thị (ALL: Tất cả, LOCAL: Chỉ cục bộ, LDAP: Chỉ LDAP, KEYCLOAK: Chỉ Keycloak)',
    standard: 'BOTH',
    standardRef: 'Access Control',
    valueType: 'string',
  },
  {
    key: 'ALLOW_SELF_REGISTRATION',
    value: 'true',
    description:
      'Cho phép người dùng tự đăng ký tài khoản nội bộ (Self Registration)',
    standard: 'BOTH',
    standardRef: 'User Lifecycle',
    valueType: 'boolean',
  },
];

// PCI DSS v4.0 preset values
const PCI_DSS_PRESET: Record<string, string> = {
  PASSWORD_MIN_LENGTH: '12',
  PASSWORD_COMPLEXITY: 'true',
  PASSWORD_EXPIRY_DAYS: '90',
  PASSWORD_HISTORY_COUNT: '4',
  MAX_FAILED_ATTEMPTS: '5',
  LOCKOUT_MINUTES: '30',
  SESSION_TIMEOUT_MINUTES: '15',
  REQUIRE_MFA: 'false',
  AUDIT_LOG_RETENTION_MONTHS: '12',
  FORCE_HTTPS: 'true',
  JWT_EXPIRY_HOURS: '8',
};

// ISO 27001:2022 preset values (slightly more relaxed on some items)
const ISO_27001_PRESET: Record<string, string> = {
  PASSWORD_MIN_LENGTH: '10',
  PASSWORD_COMPLEXITY: 'true',
  PASSWORD_EXPIRY_DAYS: '180',
  PASSWORD_HISTORY_COUNT: '6',
  MAX_FAILED_ATTEMPTS: '5',
  LOCKOUT_MINUTES: '15',
  SESSION_TIMEOUT_MINUTES: '30',
  REQUIRE_MFA: 'false',
  AUDIT_LOG_RETENTION_MONTHS: '24',
  FORCE_HTTPS: 'true',
  JWT_EXPIRY_HOURS: '8',
};

@Injectable()
export class SecurityConfigService implements OnModuleInit {
  private readonly logger = new Logger(SecurityConfigService.name);
  private cache: Map<string, string> = new Map();

  constructor(
    @InjectRepository(SecurityConfig)
    private readonly configRepo: Repository<SecurityConfig>,
  ) {}

  async onModuleInit() {
    await this.seedDefaults();
    await this.loadCache();
  }

  // ==================== SEED DEFAULTS ====================

  private async seedDefaults(): Promise<void> {
    for (const config of DEFAULT_CONFIGS) {
      const existing = await this.configRepo.findOne({
        where: { key: config.key },
      });
      if (!existing) {
        await this.configRepo.save(this.configRepo.create(config));
        this.logger.log(
          `Seeded security config: ${config.key} = ${config.value}`,
        );
      }
    }
  }

  // ==================== CACHE ====================

  private async loadCache(): Promise<void> {
    const all = await this.configRepo.find();
    this.cache.clear();
    for (const config of all) {
      this.cache.set(config.key, config.value);
    }
    this.logger.log(
      `Loaded ${this.cache.size} security config items into cache`,
    );
  }

  // ==================== GETTERS ====================

  get(key: string, defaultValue?: string): string {
    return this.cache.get(key) || defaultValue || '';
  }

  getNumber(key: string, defaultValue: number = 0): number {
    const val = this.cache.get(key);
    return val ? parseInt(val, 10) : defaultValue;
  }

  getBoolean(key: string, defaultValue: boolean = false): boolean {
    const val = this.cache.get(key);
    return val ? val === 'true' : defaultValue;
  }

  // ==================== CRUD ====================

  async findAll(): Promise<SecurityConfig[]> {
    return this.configRepo.find({ order: { key: 'ASC' } });
  }

  async getConfig(key: string): Promise<SecurityConfig | null> {
    return this.configRepo.findOne({ where: { key } });
  }

  async setConfig(key: string, value: string): Promise<SecurityConfig> {
    const config = await this.configRepo.findOne({ where: { key } });
    if (config) {
      config.value = value;
      const result = await this.configRepo.save(config);
      this.cache.set(key, value); // Update cache
      return result;
    }
    throw new Error(`Config key "${key}" not found`);
  }

  async updateMultiple(
    updates: { key: string; value: string }[],
  ): Promise<void> {
    for (const update of updates) {
      await this.setConfig(update.key, update.value);
    }
  }

  // ==================== PRESETS ====================

  async applyPciDssPreset(): Promise<void> {
    const updates = Object.entries(PCI_DSS_PRESET).map(([key, value]) => ({
      key,
      value,
    }));
    await this.updateMultiple(updates);
    this.logger.log('Applied PCI DSS v4.0 preset');
  }

  async applyIso27001Preset(): Promise<void> {
    const updates = Object.entries(ISO_27001_PRESET).map(([key, value]) => ({
      key,
      value,
    }));
    await this.updateMultiple(updates);
    this.logger.log('Applied ISO 27001:2022 preset');
  }

  // ==================== COMPLIANCE CHECK ====================

  async checkCompliance(): Promise<{
    pciDss: {
      score: number;
      total: number;
      passed: string[];
      failed: string[];
    };
    iso27001: {
      score: number;
      total: number;
      passed: string[];
      failed: string[];
    };
  }> {
    const configs = await this.findAll();
    const configMap = new Map<string, string>();
    for (const c of configs) {
      configMap.set(c.key, c.value);
    }

    // PCI DSS compliance checks
    const pciChecks = [
      {
        key: 'PASSWORD_MIN_LENGTH',
        check: (v: string) => parseInt(v) >= 12,
        label: 'Mật khẩu tối thiểu 12 ký tự',
      },
      {
        key: 'PASSWORD_COMPLEXITY',
        check: (v: string) => v === 'true',
        label: 'Yêu cầu complexity mật khẩu',
      },
      {
        key: 'PASSWORD_EXPIRY_DAYS',
        check: (v: string) => parseInt(v) <= 90,
        label: 'Hết hạn mật khẩu ≤ 90 ngày',
      },
      {
        key: 'PASSWORD_HISTORY_COUNT',
        check: (v: string) => parseInt(v) >= 4,
        label: 'Lịch sử mật khẩu ≥ 4',
      },
      {
        key: 'MAX_FAILED_ATTEMPTS',
        check: (v: string) => parseInt(v) <= 6,
        label: 'Khóa TK sau ≤ 6 lần sai',
      },
      {
        key: 'LOCKOUT_MINUTES',
        check: (v: string) => parseInt(v) >= 30,
        label: 'Khóa TK ≥ 30 phút',
      },
      {
        key: 'SESSION_TIMEOUT_MINUTES',
        check: (v: string) => parseInt(v) <= 15,
        label: 'Session timeout ≤ 15 phút',
      },
      {
        key: 'FORCE_HTTPS',
        check: (v: string) => v === 'true',
        label: 'Bắt buộc HTTPS',
      },
    ];

    const pciPassed: string[] = [];
    const pciFailed: string[] = [];
    for (const check of pciChecks) {
      const value = configMap.get(check.key) || '';
      if (check.check(value)) {
        pciPassed.push(check.label);
      } else {
        pciFailed.push(check.label);
      }
    }

    // ISO 27001 compliance checks
    const isoChecks = [
      {
        key: 'PASSWORD_MIN_LENGTH',
        check: (v: string) => parseInt(v) >= 8,
        label: 'Mật khẩu tối thiểu 8 ký tự',
      },
      {
        key: 'PASSWORD_COMPLEXITY',
        check: (v: string) => v === 'true',
        label: 'Yêu cầu complexity mật khẩu',
      },
      {
        key: 'AUDIT_LOG_RETENTION_MONTHS',
        check: (v: string) => parseInt(v) >= 12,
        label: 'Lưu audit log ≥ 12 tháng',
      },
      {
        key: 'PASSWORD_HISTORY_COUNT',
        check: (v: string) => parseInt(v) >= 3,
        label: 'Lịch sử mật khẩu ≥ 3',
      },
      {
        key: 'MAX_FAILED_ATTEMPTS',
        check: (v: string) => parseInt(v) <= 10,
        label: 'Khóa TK sau ≤ 10 lần sai',
      },
      {
        key: 'SESSION_TIMEOUT_MINUTES',
        check: (v: string) => parseInt(v) <= 30,
        label: 'Session timeout ≤ 30 phút',
      },
      {
        key: 'FORCE_HTTPS',
        check: (v: string) => v === 'true',
        label: 'Bắt buộc HTTPS',
      },
    ];

    const isoPassed: string[] = [];
    const isoFailed: string[] = [];
    for (const check of isoChecks) {
      const value = configMap.get(check.key) || '';
      if (check.check(value)) {
        isoPassed.push(check.label);
      } else {
        isoFailed.push(check.label);
      }
    }

    return {
      pciDss: {
        score: pciPassed.length,
        total: pciChecks.length,
        passed: pciPassed,
        failed: pciFailed,
      },
      iso27001: {
        score: isoPassed.length,
        total: isoChecks.length,
        passed: isoPassed,
        failed: isoFailed,
      },
    };
  }
}
