import { Test, TestingModule } from '@nestjs/testing';
import { RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { LpbankPackageController } from './lpbank-package.controller';
import { LpbankPackageService } from './lpbank-package.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/**
 * WS2 — controller này trước đây KHÔNG có spec.
 *
 * Đây là endpoint nạp dữ liệu gốc (master data) từ Excel: ghi hàng loạt vào nhiều
 * bảng nghiệp vụ (departments, risk_criteria, continuous_audit_rules,
 * risk_control_matrix, audit_universe...). Comment trong source ghi rõ: trước kia
 * chỉ có JwtAuthGuard nên MỌI người dùng đã đăng nhập đều kích hoạt được việc ghi
 * dữ liệu; sau đó mới siết về quản trị.
 *
 * Vì vậy spec này khoá lại CẢ HAI mặt:
 *  1. Hành vi (định tuyến + uỷ quyền cho service).
 *  2. Bất biến an ninh: phải có RolesGuard và @Roles('Admin'). Nếu ai đó gỡ mất
 *     RolesGuard hoặc nới @Roles ra, test sẽ đỏ ngay — đây chính là hồi quy nguy
 *     hiểm nhất của module này.
 */
const routeOf = (handler: (...args: any[]) => any) => ({
  path: Reflect.getMetadata(PATH_METADATA, handler),
  method: Reflect.getMetadata(METHOD_METADATA, handler),
});

const guardNames = (target: any): string[] =>
  ((Reflect.getMetadata(GUARDS_METADATA, target) as any[]) || []).map((g) =>
    typeof g === 'function' ? g.name : String(g),
  );

describe('LpbankPackageController', () => {
  let controller: LpbankPackageController;

  const packageService = {
    getPackageFiles: jest.fn(),
    seedAllLpBankData: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [LpbankPackageController],
      providers: [{ provide: LpbankPackageService, useValue: packageService }],
    }).compile();

    controller = moduleRef.get<LpbankPackageController>(LpbankPackageController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('gắn tiền tố route @Controller("lpbank-package")', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, LpbankPackageController),
    ).toBe('lpbank-package');
  });

  describe('metadata route', () => {
    it.each([
      ['getFiles', 'getFiles', 'files', RequestMethod.GET],
      ['seedAll', 'seedAll', 'seed-all', RequestMethod.POST],
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

  describe('bất biến an ninh (siết quyền ghi hàng loạt)', () => {
    it('được bảo vệ bởi JwtAuthGuard và RolesGuard', () => {
      expect(guardNames(LpbankPackageController)).toEqual([
        JwtAuthGuard.name,
        RolesGuard.name,
      ]);
    });

    it("chỉ role 'Admin' được phép gọi (không nới rộng thêm role)", () => {
      expect(Reflect.getMetadata(ROLES_KEY, LpbankPackageController)).toEqual([
        'Admin',
      ]);
    });

    it('RolesGuard phải đứng SAU JwtAuthGuard (guard đọc user do JwtAuthGuard gắn)', () => {
      const guards = guardNames(LpbankPackageController);
      expect(guards.indexOf(RolesGuard.name)).toBeGreaterThan(
        guards.indexOf(JwtAuthGuard.name),
      );
    });
  });

  describe('uỷ quyền cho LpbankPackageService', () => {
    it('getFiles() trả về danh sách tệp của gói dữ liệu (đồng bộ)', () => {
      const files = [
        { fileName: 'a.xlsx', sizeBytes: 2048, sizeFormatted: '2.0 KB' },
      ];
      packageService.getPackageFiles.mockReturnValue(files);

      expect(controller.getFiles()).toEqual(files);
      expect(packageService.getPackageFiles).toHaveBeenCalledTimes(1);
      expect(packageService.getPackageFiles).toHaveBeenCalledWith();
    });

    it('getFiles() trả mảng rỗng khi thư mục gói dữ liệu chưa tồn tại', () => {
      packageService.getPackageFiles.mockReturnValue([]);

      expect(controller.getFiles()).toEqual([]);
    });

    it('seedAll() uỷ quyền cho seedAllLpBankData() và trả nguyên kết quả', async () => {
      const result = {
        message: 'Gói dữ liệu ngân hàng LPBank đã được nạp thành công!',
        timestamp: '2026-01-01T00:00:00.000Z',
        details: { '01_Co_Cau_To_Chuc': { totalRows: 2, inserted: 2 } },
      };
      packageService.seedAllLpBankData.mockResolvedValue(result);

      await expect(controller.seedAll()).resolves.toBe(result);
      expect(packageService.seedAllLpBankData).toHaveBeenCalledTimes(1);
    });

    it('lỗi khi nạp dữ liệu được ném nguyên vẹn ra HTTP layer', async () => {
      packageService.seedAllLpBankData.mockRejectedValue(
        new Error('duplicate key value violates unique constraint'),
      );

      await expect(controller.seedAll()).rejects.toThrow(
        'duplicate key value violates unique constraint',
      );
    });
  });
});
