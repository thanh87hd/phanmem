import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { LpbankPackageService } from './lpbank-package.service';

/**
 * WS2 — `lpbank-package.service.ts` trước đây KHÔNG có spec.
 *
 * Đây là service nạp dữ liệu gốc từ 15 tệp Excel vào nhiều bảng nghiệp vụ. Rủi ro
 * chính không nằm ở "đọc được file" mà ở:
 *  - ghi SQL hàng loạt: tham số phải được truyền qua placeholder ($1..$n), KHÔNG nối
 *    chuỗi — nếu không sẽ là lỗ hổng SQL injection;
 *  - dữ liệu Excel bẩn (thiếu cột khoá, ô rỗng, ô công thức, rich text) phải bị bỏ qua
 *    chứ không được ghi ra bản ghi rác;
 *  - queryRunner phải được `release()` trong MỌI nhánh, kể cả khi lỗi — nếu rò kết nối
 *    thì pool cạn dần sau vài lần nạp.
 *
 * Spec này khoá cả ba điểm trên.
 */

jest.mock('fs');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('LpbankPackageService', () => {
  let service: LpbankPackageService;

  const queryRunner = {
    connect: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };

  const dataSource = {
    createQueryRunner: jest.fn(() => queryRunner),
  };

  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    queryRunner.connect.mockResolvedValue(undefined);
    queryRunner.query.mockResolvedValue(undefined);
    queryRunner.release.mockResolvedValue(undefined);
    dataSource.createQueryRunner.mockReturnValue(queryRunner as any);
    mockedFs.existsSync.mockReturnValue(false);

    // Không để log của service làm nhiễu output test
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    service = new LpbankPackageService(dataSource as unknown as DataSource);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('trỏ thư mục gói dữ liệu vào docs/THUCTE/UPLOAD (không phải thư mục tuỳ ý)', () => {
    // uploadDir là private; đọc qua any để khoá lại đường dẫn cấu hình.
    const dir = (service as any).uploadDir as string;
    expect(dir.replace(/\\/g, '/')).toMatch(/docs\/THUCTE\/UPLOAD$/);
  });

  // ---------------------------------------------------------------------------
  // cellToValue — chuẩn hoá ô Excel
  // ---------------------------------------------------------------------------
  describe('cellToValue() — chuẩn hoá giá trị ô Excel', () => {
    const cellToValue = (v: any) => (service as any).cellToValue(v);

    it('trả undefined cho null/undefined (ô trống)', () => {
      expect(cellToValue(null)).toBeUndefined();
      expect(cellToValue(undefined)).toBeUndefined();
    });

    it('giữ nguyên giá trị nguyên thuỷ (string/number/boolean)', () => {
      expect(cellToValue('KTV')).toBe('KTV');
      expect(cellToValue(0)).toBe(0);
      expect(cellToValue(12.5)).toBe(12.5);
      expect(cellToValue(false)).toBe(false);
    });

    it('giữ nguyên đối tượng Date (không coi Date là "object lạ")', () => {
      const d = new Date('2026-01-31T00:00:00.000Z');
      expect(cellToValue(d)).toBe(d);
    });

    it('nối các đoạn richText thành một chuỗi', () => {
      expect(
        cellToValue({
          richText: [{ text: 'Phòng ' }, { text: 'KTNB' }, { text: ' - HSC' }],
        }),
      ).toBe('Phòng KTNB - HSC');
    });

    it('lấy giá trị đã tính của ô công thức (thuộc tính result)', () => {
      expect(cellToValue({ formula: 'A1+B1', result: 42 })).toBe(42);
    });

    it('đệ quy khi result của công thức lại là richText', () => {
      expect(
        cellToValue({
          formula: 'CONCAT(A1,B1)',
          result: { richText: [{ text: 'A' }, { text: 'B' }] },
        }),
      ).toBe('AB');
    });

    it('lấy text của ô hyperlink', () => {
      expect(
        cellToValue({
          text: 'Quy chế 123',
          hyperlink: 'http://intranet/123',
        }),
      ).toBe('Quy chế 123');
    });

    it('trả undefined cho object lạ không nhận dạng được', () => {
      expect(cellToValue({ somethingElse: 1 })).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getPackageFiles
  // ---------------------------------------------------------------------------
  describe('getPackageFiles()', () => {
    it('trả mảng rỗng khi thư mục UPLOAD chưa tồn tại (không ném lỗi)', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(service.getPackageFiles()).toEqual([]);
      expect(mockedFs.readdirSync).not.toHaveBeenCalled();
    });

    it('chỉ liệt kê tệp .xlsx, bỏ qua tệp khác', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        '01_Co_Cau.xlsx',
        'ghi_chu.txt',
        '~$01_Co_Cau.xlsx.tmp',
        '02_Nhan_Su.xlsx',
      ] as any);
      mockedFs.statSync.mockReturnValue({
        size: 2048,
        mtime: new Date('2026-02-01T10:00:00.000Z'),
      } as any);

      const files = service.getPackageFiles();

      expect(files.map((f) => f.fileName)).toEqual([
        '01_Co_Cau.xlsx',
        '02_Nhan_Su.xlsx',
      ]);
    });

    it('trả kèm kích thước thô, kích thước đã định dạng và thời điểm sửa', () => {
      const mtime = new Date('2026-02-01T10:00:00.000Z');
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['a.xlsx'] as any);
      mockedFs.statSync.mockReturnValue({ size: 1536, mtime } as any);

      expect(service.getPackageFiles()).toEqual([
        {
          fileName: 'a.xlsx',
          sizeBytes: 1536,
          sizeFormatted: '1.5 KB',
          modifiedAt: mtime,
        },
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // seedAllLpBankData
  // ---------------------------------------------------------------------------
  describe('seedAllLpBankData()', () => {
    /** Cho phép đúng những tệp trong danh sách tồn tại; còn lại coi như thiếu. */
    const onlyTheseFilesExist = (names: string[]) => {
      mockedFs.existsSync.mockImplementation((p: any) =>
        names.some((n) => String(p).endsWith(n)),
      );
    };

    const readRowsSpy = (rowsByName: Record<string, any[]>) =>
      jest
        .spyOn(service as any, 'readRows')
        .mockImplementation(async (filePath: string) => {
          const hit = Object.keys(rowsByName).find((n) =>
            String(filePath).endsWith(n),
          );
          return hit ? rowsByName[hit] : [];
        });

    it('luôn release() queryRunner khi thành công', async () => {
      onlyTheseFilesExist([]);

      await service.seedAllLpBankData();

      expect(queryRunner.connect).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('release() queryRunner NGAY CẢ KHI lỗi, và vẫn ném lỗi ra ngoài', async () => {
      onlyTheseFilesExist(['01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx']);
      readRowsSpy({
        '01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx': [
          { 'Mã đơn vị': 'CN001', 'Tên đơn vị': 'CN Hà Nội' },
        ],
      });
      queryRunner.query.mockRejectedValue(new Error('connection terminated'));

      await expect(service.seedAllLpBankData()).rejects.toThrow(
        'connection terminated',
      );
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalled();
    });

    it('bỏ qua tệp không tồn tại và trả về details rỗng', async () => {
      onlyTheseFilesExist([]);

      const res = await service.seedAllLpBankData();

      expect(res.details).toEqual({});
      expect(queryRunner.query).not.toHaveBeenCalled();
      expect(res.message).toContain('LPBank');
      expect(typeof res.timestamp).toBe('string');
    });

    it('nạp departments: truyền tham số qua placeholder và trim dữ liệu', async () => {
      onlyTheseFilesExist(['01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx']);
      readRowsSpy({
        '01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx': [
          {
            'Mã đơn vị': '  CN001  ',
            'Tên đơn vị': '  Chi nhánh Hà Nội ',
            'Loại đơn vị': ' Branch ',
            'Vùng quản lý': ' Miền Bắc ',
          },
        ],
      });

      const res = await service.seedAllLpBankData();

      expect(res.details['01_Co_Cau_To_Chuc']).toEqual({
        totalRows: 1,
        inserted: 1,
        status: 'Success',
      });
      const [sql, params] = queryRunner.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO departments');
      // Tham số hoá: giá trị người dùng KHÔNG được nội suy vào câu SQL
      expect(sql).not.toContain('CN001');
      expect(sql).not.toContain('Chi nhánh Hà Nội');
      expect(params).toEqual(['CN001', 'Chi nhánh Hà Nội', 'Branch', 'Miền Bắc']);
    });

    it('bỏ qua dòng departments thiếu mã hoặc thiếu tên', async () => {
      onlyTheseFilesExist(['01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx']);
      readRowsSpy({
        '01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx': [
          { 'Mã đơn vị': 'CN001', 'Tên đơn vị': 'Chi nhánh 1' },
          { 'Mã đơn vị': '', 'Tên đơn vị': 'Thiếu mã' },
          { 'Mã đơn vị': 'CN003', 'Tên đơn vị': '' },
        ],
      });

      const res = await service.seedAllLpBankData();

      expect(res.details['01_Co_Cau_To_Chuc']).toEqual({
        totalRows: 3,
        inserted: 1,
        status: 'Success',
      });
      expect(queryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('departments: mặc định unitType=Branch và region rỗng khi Excel trống ô', async () => {
      onlyTheseFilesExist(['01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx']);
      readRowsSpy({
        '01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx': [
          { 'Mã đơn vị': 'CN009', 'Tên đơn vị': 'Chi nhánh 9' },
        ],
      });

      await service.seedAllLpBankData();

      expect(queryRunner.query.mock.calls[0][1]).toEqual([
        'CN009',
        'Chi nhánh 9',
        'Branch',
        '',
      ]);
    });

    it('risk_criteria: mặc định trọng số 0.2, category Operational, mô tả = tên tiêu chí', async () => {
      onlyTheseFilesExist(['04_Tieu_Chi_Danh_Gia_Rui_Ro_Criteria.xlsx']);
      readRowsSpy({
        '04_Tieu_Chi_Danh_Gia_Rui_Ro_Criteria.xlsx': [
          { 'Tên tiêu chí': 'Tính tuân thủ' },
        ],
      });

      const res = await service.seedAllLpBankData();

      expect(res.details['04_Tieu_Chi_Rui_Ro'].inserted).toBe(1);
      expect(queryRunner.query.mock.calls[0][1]).toEqual([
        'Tính tuân thủ',
        0.2,
        'Operational',
        'Tính tuân thủ',
      ]);
    });

    it('risk_criteria: bỏ qua dòng không có tên tiêu chí', async () => {
      onlyTheseFilesExist(['04_Tieu_Chi_Danh_Gia_Rui_Ro_Criteria.xlsx']);
      readRowsSpy({
        '04_Tieu_Chi_Danh_Gia_Rui_Ro_Criteria.xlsx': [
          { 'Trọng số': 0.5, 'Phân loại rủi ro': 'Credit' },
        ],
      });

      const res = await service.seedAllLpBankData();

      expect(res.details['04_Tieu_Chi_Rui_Ro'].inserted).toBe(0);
      expect(queryRunner.query).not.toHaveBeenCalled();
    });

    it('continuous_audit_rules: domain thành null khi Excel không có mảng nghiệp vụ', async () => {
      onlyTheseFilesExist([
        '09_Luat_Kiem_Toan_Giam_Sat_Lien_Tuc_Rules.xlsx',
      ]);
      readRowsSpy({
        '09_Luat_Kiem_Toan_Giam_Sat_Lien_Tuc_Rules.xlsx': [
          { 'Rule ID': 'R001', 'Tên luật giám sát': 'Giao dịch lớn bất thường' },
        ],
      });

      await service.seedAllLpBankData();

      const [sql, params] = queryRunner.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO continuous_audit_rules');
      expect(params).toEqual([
        'R001',
        'Giao dịch lớn bất thường',
        null,
        'HIGH',
      ]);
    });

    it('continuous_audit_rules: bỏ qua dòng thiếu Rule ID hoặc thiếu tên luật', async () => {
      onlyTheseFilesExist([
        '09_Luat_Kiem_Toan_Giam_Sat_Lien_Tuc_Rules.xlsx',
      ]);
      readRowsSpy({
        '09_Luat_Kiem_Toan_Giam_Sat_Lien_Tuc_Rules.xlsx': [
          { 'Rule ID': 'R001', 'Tên luật giám sát': 'Luật 1' },
          { 'Rule ID': '', 'Tên luật giám sát': 'Thiếu ID' },
          { 'Rule ID': 'R003', 'Tên luật giám sát': '' },
        ],
      });

      const res = await service.seedAllLpBankData();

      expect(res.details['09_Luat_Giam_Sat'].inserted).toBe(1);
      expect(queryRunner.query).toHaveBeenCalledTimes(1);
    });

    it('RCM: bỏ qua dòng thiếu tên rủi ro và để chuỗi rỗng cho cột phụ', async () => {
      onlyTheseFilesExist(['06_Thu_Vien_Rui_Ro_Kiem_Soat_RCM_LPBank.xlsx']);
      readRowsSpy({
        '06_Thu_Vien_Rui_Ro_Kiem_Soat_RCM_LPBank.xlsx': [
          { 'Tên rủi ro': 'Rủi ro tín dụng' },
          { 'Tên quy trình': 'Quy trình A' },
        ],
      });

      const res = await service.seedAllLpBankData();

      expect(res.details['06_RCM_LPBank']).toEqual({
        totalRows: 2,
        inserted: 1,
        status: 'Success',
      });
      expect(queryRunner.query.mock.calls[0][1]).toEqual([
        '',
        '',
        'Rủi ro tín dụng',
        '',
      ]);
    });

    it('audit_universe: mặc định auditCategory=CORE', async () => {
      onlyTheseFilesExist([
        '03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx',
      ]);
      readRowsSpy({
        '03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx': [
          { 'Tên quy trình / hoạt động': 'Cấp tín dụng' },
        ],
      });

      await service.seedAllLpBankData();

      expect(queryRunner.query.mock.calls[0][1]).toEqual([
        'Cấp tín dụng',
        '',
        'CORE',
      ]);
    });

    it('tệp mẫu Audit Findings chỉ được kiểm chứng, KHÔNG ghi vào DB', async () => {
      onlyTheseFilesExist([
        '08_Danh_Muc_Phat_Hien_Mau_Audit_Findings.xlsx',
      ]);
      readRowsSpy({
        '08_Danh_Muc_Phat_Hien_Mau_Audit_Findings.xlsx': [
          { 'Tên phát hiện': 'A' },
          { 'Tên phát hiện': 'B' },
        ],
      });

      const res = await service.seedAllLpBankData();

      expect(res.details['08_Audit_Findings_Mẫu']).toEqual({
        totalRows: 2,
        inserted: 2,
        status: 'Verified Template',
      });
      expect(queryRunner.query).not.toHaveBeenCalled();
    });

    it('các tệp còn lại được đánh dấu Synchronized với số dòng đọc được', async () => {
      onlyTheseFilesExist([
        '02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx',
        '14_Du_Lieu_Chi_So_Rui_Ro_KRI_Hang_Thang.xlsx',
      ]);
      readRowsSpy({
        '02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank.xlsx': [{ a: 1 }, { a: 2 }],
        '14_Du_Lieu_Chi_So_Rui_Ro_KRI_Hang_Thang.xlsx': [{ a: 1 }],
      });

      const res = await service.seedAllLpBankData();

      expect(res.details['02_Danh_Sach_Nhan_Su_KTV_Va_Auditee_LPBank']).toEqual({
        totalRows: 2,
        inserted: 2,
        status: 'Synchronized',
      });
      expect(res.details['14_Du_Lieu_Chi_So_Rui_Ro_KRI_Hang_Thang']).toEqual({
        totalRows: 1,
        inserted: 1,
        status: 'Synchronized',
      });
      expect(queryRunner.query).not.toHaveBeenCalled();
    });

    it('nạp đủ 6 bảng nghiệp vụ khi mọi tệp đều có mặt', async () => {
      const names = [
        '01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx',
        '04_Tieu_Chi_Danh_Gia_Rui_Ro_Criteria.xlsx',
        '09_Luat_Kiem_Toan_Giam_Sat_Lien_Tuc_Rules.xlsx',
        '06_Thu_Vien_Rui_Ro_Kiem_Soat_RCM_LPBank.xlsx',
        '03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx',
        '08_Danh_Muc_Phat_Hien_Mau_Audit_Findings.xlsx',
      ];
      onlyTheseFilesExist(names);
      readRowsSpy(
        Object.fromEntries(
          names.map((n, i) => [
            n,
            [
              {
                'Mã đơn vị': `CN${i}`,
                'Tên đơn vị': `ĐV ${i}`,
                'Tên tiêu chí': `TC ${i}`,
                'Rule ID': `R${i}`,
                'Tên luật giám sát': `Luật ${i}`,
                'Tên rủi ro': `RR ${i}`,
                'Tên quy trình / hoạt động': `QT ${i}`,
              },
            ],
          ]),
        ),
      );

      const res = await service.seedAllLpBankData();

      expect(Object.keys(res.details).sort()).toEqual(
        [
          '01_Co_Cau_To_Chuc',
          '03_Audit_Universe',
          '04_Tieu_Chi_Rui_Ro',
          '06_RCM_LPBank',
          '08_Audit_Findings_Mẫu',
          '09_Luat_Giam_Sat',
        ].sort(),
      );
      // 5 bảng ghi thật (findings chỉ kiểm chứng) => 5 câu INSERT
      expect(queryRunner.query).toHaveBeenCalledTimes(5);
      const sqlAll = queryRunner.query.mock.calls.map((c) => c[0]).join('\n');
      expect(sqlAll).toContain('INSERT INTO departments');
      expect(sqlAll).toContain('INSERT INTO risk_criteria');
      expect(sqlAll).toContain('INSERT INTO continuous_audit_rules');
      expect(sqlAll).toContain('INSERT INTO risk_control_matrix');
      expect(sqlAll).toContain('INSERT INTO audit_universe');
    });

    it('mọi câu INSERT đều dùng ON CONFLICT để nạp lại không tạo bản ghi trùng', async () => {
      const names = [
        '01_Co_Cau_To_Chuc_Phong_Ban_Chi_Nhanh_LPBank.xlsx',
        '04_Tieu_Chi_Danh_Gia_Rui_Ro_Criteria.xlsx',
        '09_Luat_Kiem_Toan_Giam_Sat_Lien_Tuc_Rules.xlsx',
        '06_Thu_Vien_Rui_Ro_Kiem_Soat_RCM_LPBank.xlsx',
        '03_Vu_Tru_Doi_Tuong_Kiem_Toan_Universe.xlsx',
      ];
      onlyTheseFilesExist(names);
      readRowsSpy(
        Object.fromEntries(
          names.map((n, i) => [
            n,
            [
              {
                'Mã đơn vị': `CN${i}`,
                'Tên đơn vị': `ĐV ${i}`,
                'Tên tiêu chí': `TC ${i}`,
                'Rule ID': `R${i}`,
                'Tên luật giám sát': `Luật ${i}`,
                'Tên rủi ro': `RR ${i}`,
                'Tên quy trình / hoạt động': `QT ${i}`,
              },
            ],
          ]),
        ),
      );

      await service.seedAllLpBankData();

      for (const [sql] of queryRunner.query.mock.calls) {
        expect(sql).toContain('ON CONFLICT');
      }
    });
  });
});
