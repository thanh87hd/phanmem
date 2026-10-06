import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContinuousMonitoringService } from './continuous-monitoring.service';
import { MonitoringAlert } from './entities/monitoring-alert.entity';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * UAT case TC-CAAT-02 — "Kích Hoạt Chạy Quét Dữ Liệu CAATs Thủ Công".
 *
 * Rule constants read out of continuous-monitoring.service.ts:
 *  - Benford: expected first-digit shares [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6] (%),
 *    anomaly when |actual% - expected%| > 10 (strictly greater than 10 percentage points).
 *  - Only amounts > 0 whose integer part starts with 1..9 are counted (totalAnalyzed).
 *  - Duplicates: key = `${customerName || vendorName}_${amount}_${LOCAL calendar day}`,
 *    a group is a duplicate when it holds > 1 row.
 *  - Off-hours: local `getHours() < 6 || > 20` (i.e. 21:00-23:59 and 00:00-05:59).
 *  - runScan creates at most 3 alerts (Benford, duplicates, off-hours) and broadcasts
 *    one notification per alert to users that are admin OR dept-lead per ScopeFilterService.
 *
 * NOTE on dates (BUG 1 đã sửa): CẢ HAI bộ phát hiện dùng LỊCH/GIỜ ĐỊA PHƯƠNG
 * (getFullYear/getMonth/getDate và getHours) — không còn dùng ngày UTC (toISOString) cho
 * duplicates. Vì vậy mọi fixture về ngày/giờ đều được dựng bằng constructor giờ địa phương
 * (new Date(y, m, d, h, min)); ngày địa phương của fixture là ngày đã khai báo trong mọi
 * múi giờ của runner. Riêng cụm regression "qua nửa đêm" chỉ có ý nghĩa phân biệt ở múi giờ
 * lệch UTC (đúng với môi trường ngân hàng Asia/Saigon = UTC+7).
 */
describe('ContinuousMonitoringService', () => {
  let service: ContinuousMonitoringService;

  const alertRepo = {
    create: jest.fn((dto: any) => ({ ...dto })),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  };
  const userRepo = { find: jest.fn() };
  const transactionRepo = { find: jest.fn() };
  const notificationsService = { broadcast: jest.fn(), create: jest.fn() };

  /** local-time date, deterministic for getHours() in any timezone */
  const at = (hour: number, minute = 0, day = 15) =>
    new Date(2024, 2, day, hour, minute, 0, 0);
  /** local noon: giữ nguyên NGÀY ĐỊA PHƯƠNG = `day` trong mọi múi giờ (dùng cho khoá trùng lặp) */
  const atNoon = (day: number) => new Date(2024, 2, day, 12, 0, 0, 0);

  /** amount whose integer part starts with `digit` (used to steer Benford buckets) */
  const amountWithFirstDigit = (digit: number, i: number) =>
    Number(`${digit}${String(i).padStart(5, '0')}`);

  const tx = (over: Partial<Transaction>) =>
    ({
      transactionCode: 'TX-1',
      amount: 100,
      transactionDate: at(14, 0),
      customerName: 'NCC A',
      ...over,
    }) as any;

  /** 100 transactions whose first-digit mix is inside the ±10pt Benford tolerance */
  const benfordCompliantRows = () => {
    const counts = [30, 17, 12, 10, 8, 7, 6, 5, 5]; // digits 1..9
    const rows: any[] = [];
    counts.forEach((count, idx) => {
      const digit = idx + 1;
      for (let i = 0; i < count; i++) {
        rows.push(
          tx({
            transactionCode: `CLEAN-${digit}-${i}`,
            customerName: `CLEAN-${digit}-${i}`,
            amount: amountWithFirstDigit(digit, i),
            transactionDate: atNoon(15),
          }),
        );
      }
    });
    return rows;
  };

  /** 1000 transactions whose first-digit counts are given (digits 1..9) */
  const rowsFromCounts = (counts: number[]) => {
    const rows: any[] = [];
    counts.forEach((count, idx) => {
      const digit = idx + 1;
      for (let i = 0; i < count; i++) {
        rows.push(
          tx({
            transactionCode: `B-${digit}-${i}`,
            customerName: `B-${digit}-${i}`,
            amount: amountWithFirstDigit(digit, i),
            transactionDate: atNoon(15),
          }),
        );
      }
    });
    return rows;
  };

  // ---- runScan "anomalies" fixture: 15 rows triggering all three detectors ----
  const benfordRows = Array.from({ length: 10 }, (_, i) =>
    tx({
      transactionCode: `BEN-${i}`,
      customerName: `NCC BEN ${i}`,
      amount: 500000 + i, // first digit 5 -> 10/15 rows
      transactionDate: at(14, 0),
    }),
  );
  const duplicateRows = [1, 2, 3].map((i) =>
    tx({
      transactionCode: `DP-${i}`,
      customerName: 'NCC ABC',
      amount: 750000, // first digit 7 -> 3/15 rows
      transactionDate: atNoon(15),
    }),
  );
  const offHoursRows = [
    tx({
      transactionCode: 'OFF-1',
      customerName: 'NCC OFF 1',
      amount: 12345, // first digit 1
      transactionDate: at(21, 30),
    }),
    tx({
      transactionCode: 'OFF-2',
      customerName: 'NCC OFF 2',
      amount: 23456, // first digit 2
      transactionDate: at(5, 0),
    }),
  ];
  const anomalyRows = [...benfordRows, ...duplicateRows, ...offHoursRows];

  /** 9 deviation entries produced by runScan's Benford pass over `anomalyRows` */
  const anomalyDeviations = [
    {
      digit: 1,
      actualCount: 1,
      actualPercentage: 6.67,
      expectedPercentage: 30.1,
      variance: -23.43,
    },
    {
      digit: 2,
      actualCount: 1,
      actualPercentage: 6.67,
      expectedPercentage: 17.6,
      variance: -10.93,
    },
    {
      digit: 3,
      actualCount: 0,
      actualPercentage: 0,
      expectedPercentage: 12.5,
      variance: -12.5,
    },
    {
      digit: 4,
      actualCount: 0,
      actualPercentage: 0,
      expectedPercentage: 9.7,
      variance: -9.7,
    },
    {
      digit: 5,
      actualCount: 10,
      actualPercentage: 66.67,
      expectedPercentage: 7.9,
      variance: 58.77,
    },
    {
      digit: 6,
      actualCount: 0,
      actualPercentage: 0,
      expectedPercentage: 6.7,
      variance: -6.7,
    },
    {
      digit: 7,
      actualCount: 3,
      actualPercentage: 20,
      expectedPercentage: 5.8,
      variance: 14.2,
    },
    {
      digit: 8,
      actualCount: 0,
      actualPercentage: 0,
      expectedPercentage: 5.1,
      variance: -5.1,
    },
    {
      digit: 9,
      actualCount: 0,
      actualPercentage: 0,
      expectedPercentage: 4.6,
      variance: -4.6,
    },
  ];

  // ---- broadcast recipients, per ScopeFilterService.isAdminRole / isDeptLeadRole ----
  // id 1 -> role contains "admin"                        => included
  // id 2 -> role contains "trưởng phòng"                 => included
  // id 3 -> plain Auditor                                => EXCLUDED
  // id 4 -> jobTitle contains "giám đốc khối" (admin)     => included
  // id 5 -> role name contains "lead"                    => included
  // id 6 -> jobTitle "Team Lead" but role "Auditor"      => EXCLUDED, because the
  //         'lead' marker is only tested against the ROLE name, never the job title
  const broadcastUsers = [
    {
      id: 1,
      fullName: 'Quản trị hệ thống',
      role: { name: 'Admin' },
      jobTitle: 'Chuyên viên CNTT',
    },
    {
      id: 2,
      fullName: 'Trưởng phòng KTNB',
      role: { name: 'Trưởng phòng KTNB' },
      jobTitle: '',
    },
    {
      id: 3,
      fullName: 'Kiểm toán viên',
      role: { name: 'Auditor' },
      jobTitle: 'Kiểm toán viên',
    },
    {
      id: 4,
      fullName: 'Giám đốc khối',
      role: { name: 'Kiểm toán viên' },
      jobTitle: 'Giám đốc khối',
    },
    { id: 5, fullName: 'Tổ trưởng', role: { name: 'Team Lead' }, jobTitle: '' },
    {
      id: 6,
      fullName: 'Tổ trưởng (chỉ có chức danh)',
      role: { name: 'Auditor' },
      jobTitle: 'Team Lead',
    },
  ];
  const expectedRecipientIds = [1, 2, 4, 5];

  let alertSaveSeq: number;

  beforeEach(async () => {
    jest.clearAllMocks();
    alertSaveSeq = 0;

    alertRepo.save.mockImplementation(async (entity: any) => ({
      ...entity,
      id: ++alertSaveSeq,
    }));
    alertRepo.find.mockResolvedValue([]);
    alertRepo.count.mockResolvedValue(0);
    userRepo.find.mockResolvedValue(broadcastUsers);
    transactionRepo.find.mockResolvedValue([]);
    notificationsService.broadcast.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContinuousMonitoringService,
        {
          provide: getRepositoryToken(MonitoringAlert),
          useValue: alertRepo,
        },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get<ContinuousMonitoringService>(
      ContinuousMonitoringService,
    );
  });

  describe('detectOffHoursTransactions', () => {
    it('flags a 21:30 and a 05:00 transaction and returns the full entity rows (txId/amount/time mapping happens in runScan)', async () => {
      const txLate = tx({
        transactionCode: 'TX-2130',
        amount: 9000000,
        transactionDate: at(21, 30),
      });
      const txEarly = tx({
        transactionCode: 'TX-0500',
        amount: 1500000,
        transactionDate: at(5, 0),
      });
      const txAfternoon = tx({
        transactionCode: 'TX-1400',
        amount: 500000,
        transactionDate: at(14, 0),
      });
      transactionRepo.find.mockResolvedValue([
        txLate,
        txAfternoon,
        txEarly,
      ]);

      const result = await (service as any).detectOffHoursTransactions();

      expect(transactionRepo.find).toHaveBeenCalledTimes(1);
      expect(transactionRepo.find).toHaveBeenCalledWith();
      // the detector returns the raw rows in repository order
      expect(result).toEqual([txLate, txEarly]);
      expect(result[0]).toBe(txLate);
      expect(result[1]).toBe(txEarly);
      expect(result).not.toContain(txAfternoon);
    });

    it('applies the boundary hour < 6 || hour > 20 (20:00 and 06:00 stay in hours, 05:59 and 21:00 do not)', async () => {
      const cases = [
        { hour: 20, minute: 0, offHours: false },
        { hour: 6, minute: 0, offHours: false },
        { hour: 14, minute: 0, offHours: false },
        { hour: 5, minute: 59, offHours: true },
        { hour: 0, minute: 0, offHours: true },
        { hour: 21, minute: 0, offHours: true },
        { hour: 23, minute: 59, offHours: true },
      ].map((c, i) => ({
        ...c,
        row: tx({
          transactionCode: `TX-${i}`,
          transactionDate: at(c.hour, c.minute),
        }),
      }));
      transactionRepo.find.mockResolvedValue(cases.map((c) => c.row));

      const result = await (service as any).detectOffHoursTransactions();

      expect(result.map((r: any) => r.transactionCode)).toEqual(
        cases.filter((c) => c.offHours).map((c) => `TX-${cases.indexOf(c)}`),
      );
      expect(result).toHaveLength(4);
    });

    it('skips rows without a transactionDate', async () => {
      const noDate = tx({
        transactionCode: 'TX-NODATE',
        transactionDate: null as any,
      });
      transactionRepo.find.mockResolvedValue([
        noDate,
        tx({ transactionCode: 'TX-OK', transactionDate: at(22, 0) }),
      ]);

      const result = await (service as any).detectOffHoursTransactions();

      expect(result.map((r: any) => r.transactionCode)).toEqual(['TX-OK']);
    });
  });

  describe('detectDuplicatePayments', () => {
    it('collapses same vendor + same amount + same day rows into ONE duplicate with the exact occurrence count and invoice list', async () => {
      const rows = [1, 2, 3].map((i) =>
        tx({
          transactionCode: `DP-${i}`,
          customerName: 'NCC ABC',
          amount: 750000,
          transactionDate: atNoon(15),
        }),
      );
      transactionRepo.find.mockResolvedValue(rows);

      const result = await (service as any).detectDuplicatePayments();

      expect(transactionRepo.find).toHaveBeenCalledWith();
      expect(result).toEqual([
        {
          vendor: 'NCC ABC',
          amount: 750000,
          date: rows[0].transactionDate,
          occurrences: 3,
          invoices: 'DP-1, DP-2, DP-3',
        },
      ]);
      // `date` is the raw transactionDate of the first row of the group
      expect(result[0].date).toBe(rows[0].transactionDate);
    });

    it('does not group rows that differ by day, by amount or by counterparty', async () => {
      const rows = [
        tx({
          transactionCode: 'D1',
          customerName: 'NCC ABC',
          amount: 750000,
          transactionDate: atNoon(15),
        }),
        // different LOCAL calendar day (day 20 ≠ day 15 in every timezone)
        tx({
          transactionCode: 'D2',
          customerName: 'NCC ABC',
          amount: 750000,
          transactionDate: atNoon(20),
        }),
        // different amount
        tx({
          transactionCode: 'D3',
          customerName: 'NCC ABC',
          amount: 750001,
          transactionDate: atNoon(15),
        }),
        // different counterparty
        tx({
          transactionCode: 'D4',
          customerName: 'NCC XYZ',
          amount: 750000,
          transactionDate: atNoon(15),
        }),
      ];
      transactionRepo.find.mockResolvedValue(rows);

      const result = await (service as any).detectDuplicatePayments();

      expect(result).toEqual([]);
    });

    it('prefers customerName over vendorName for both the grouping key and the reported vendor', async () => {
      transactionRepo.find.mockResolvedValue([
        tx({
          transactionCode: 'D1',
          customerName: 'KH X',
          vendorName: 'NCC CHUNG',
          amount: 750000,
          transactionDate: atNoon(15),
        }),
        tx({
          transactionCode: 'D2',
          customerName: 'KH Y',
          vendorName: 'NCC CHUNG',
          amount: 750000,
          transactionDate: atNoon(15),
        }),
        tx({
          transactionCode: 'D3',
          customerName: undefined,
          vendorName: 'NCC FALLBACK',
          amount: 100,
          transactionDate: atNoon(15),
        }),
        tx({
          transactionCode: 'D4',
          customerName: undefined,
          vendorName: 'NCC FALLBACK',
          amount: 100,
          transactionDate: atNoon(15),
        }),
      ]);

      const result = await (service as any).detectDuplicatePayments();

      // same vendorName but different customerName -> two distinct keys, no group;
      // rows without customerName fall back to vendorName -> one group
      expect(result).toEqual([
        {
          vendor: 'NCC FALLBACK',
          amount: 100,
          date: expect.any(Date),
          occurrences: 2,
          invoices: 'D3, D4',
        },
      ]);
    });

    it('skips rows without a transactionDate', async () => {
      transactionRepo.find.mockResolvedValue([
        tx({
          transactionCode: 'D1',
          customerName: 'NCC ABC',
          amount: 750000,
          transactionDate: null as any,
        }),
        tx({
          transactionCode: 'D2',
          customerName: 'NCC ABC',
          amount: 750000,
          transactionDate: null as any,
        }),
      ]);

      const result = await (service as any).detectDuplicatePayments();

      expect(result).toEqual([]);
    });

    // ─── REGRESSION BUG 1: khoá trùng lặp theo NGÀY ĐỊA PHƯƠNG, không theo ngày UTC ───

    it('regression (BUG 1): 23:30 ngày 15 và 00:30 ngày 16 (giờ địa phương) là 2 NGÀY khác nhau → KHÔNG trùng lặp', async () => {
      const beforeMidnight = tx({
        transactionCode: 'MID-1',
        customerName: 'NCC QUA NUA DEM',
        amount: 500000,
        transactionDate: at(23, 30, 15),
      });
      const afterMidnight = tx({
        transactionCode: 'MID-2',
        customerName: 'NCC QUA NUA DEM',
        amount: 500000,
        transactionDate: at(0, 30, 16),
      });
      transactionRepo.find.mockResolvedValue([beforeMidnight, afterMidnight]);

      const result = await (service as any).detectDuplicatePayments();

      // Trước khi sửa (khoá = toISOString().split('T')[0]): ở UTC+7 cả hai mốc rơi vào cùng
      // ngày UTC 15/03 nên bị báo trùng lặp SAI. Sau khi sửa (getFullYear/getMonth/getDate)
      // 15/03 và 16/03 là hai ngày địa phương khác nhau → không gộp.
      expect(result).toEqual([]);
    });

    it('regression (BUG 1): 00:30 và 23:30 trong CÙNG một ngày địa phương → LÀ một nhóm trùng lặp', async () => {
      const early = tx({
        transactionCode: 'LD-1',
        customerName: 'NCC TRONG NGAY',
        amount: 500000,
        transactionDate: at(0, 30, 15),
      });
      const late = tx({
        transactionCode: 'LD-2',
        customerName: 'NCC TRONG NGAY',
        amount: 500000,
        transactionDate: at(23, 30, 15),
      });
      transactionRepo.find.mockResolvedValue([early, late]);

      const result = await (service as any).detectDuplicatePayments();

      // Trước khi sửa: ở UTC+7 hai mốc này thuộc 2 ngày UTC khác nhau (14/03 và 15/03)
      // nên trùng lặp thật bị BỎ SÓT. Sau khi sửa: cùng ngày địa phương 15/03 → 1 nhóm.
      expect(result).toEqual([
        {
          vendor: 'NCC TRONG NGAY',
          amount: 500000,
          date: early.transactionDate,
          occurrences: 2,
          invoices: 'LD-1, LD-2',
        },
      ]);
      // `date` vẫn là transactionDate thô của dòng đầu nhóm (giữ nguyên shape trả về)
      expect(result[0].date).toBe(early.transactionDate);
    });
  });

  describe('analyzeBenfordsLaw', () => {
    it('returns { isAnomalous: false, totalAnalyzed: 0, deviations: [] } for an empty transaction table', async () => {
      transactionRepo.find.mockResolvedValue([]);

      const result = await (service as any).analyzeBenfordsLaw();

      expect(result).toEqual({
        isAnomalous: false,
        totalAnalyzed: 0,
        deviations: [],
      });
    });

    it('counts only amounts whose integer part starts with 1-9 and returns the exact deviation payload', async () => {
      transactionRepo.find.mockResolvedValue([
        tx({ transactionCode: 'B1', amount: 100 }), // digit 1
        tx({ transactionCode: 'B2', amount: 100.99 }), // digit 1 (floor 100)
        tx({ transactionCode: 'B3', amount: 250 }), // digit 2
        tx({ transactionCode: 'B4', amount: 0 }), // excluded: not > 0
        tx({ transactionCode: 'B5', amount: 0.75 }), // excluded: floor 0 -> no first digit 1-9
      ]);

      const result = await (service as any).analyzeBenfordsLaw();

      expect(result.totalAnalyzed).toBe(3);
      expect(result.isAnomalous).toBe(true);
      expect(result.deviations).toEqual([
        {
          digit: 1,
          actualCount: 2,
          actualPercentage: 66.67,
          expectedPercentage: 30.1,
          variance: 36.57,
        },
        {
          digit: 2,
          actualCount: 1,
          actualPercentage: 33.33,
          expectedPercentage: 17.6,
          variance: 15.73,
        },
        {
          digit: 3,
          actualCount: 0,
          actualPercentage: 0,
          expectedPercentage: 12.5,
          variance: -12.5,
        },
        {
          digit: 4,
          actualCount: 0,
          actualPercentage: 0,
          expectedPercentage: 9.7,
          variance: -9.7,
        },
        {
          digit: 5,
          actualCount: 0,
          actualPercentage: 0,
          expectedPercentage: 7.9,
          variance: -7.9,
        },
        {
          digit: 6,
          actualCount: 0,
          actualPercentage: 0,
          expectedPercentage: 6.7,
          variance: -6.7,
        },
        {
          digit: 7,
          actualCount: 0,
          actualPercentage: 0,
          expectedPercentage: 5.8,
          variance: -5.8,
        },
        {
          digit: 8,
          actualCount: 0,
          actualPercentage: 0,
          expectedPercentage: 5.1,
          variance: -5.1,
        },
        {
          digit: 9,
          actualCount: 0,
          actualPercentage: 0,
          expectedPercentage: 4.6,
          variance: -4.6,
        },
      ]);
    });

    it('does not flag a first-digit distribution that matches the Benford expectation within +-10 points', async () => {
      transactionRepo.find.mockResolvedValue(benfordCompliantRows());

      const result = await (service as any).analyzeBenfordsLaw();

      expect(result.totalAnalyzed).toBe(100);
      expect(result.isAnomalous).toBe(false);
      expect(result.deviations).toEqual([
        {
          digit: 1,
          actualCount: 30,
          actualPercentage: 30,
          expectedPercentage: 30.1,
          variance: -0.1,
        },
        {
          digit: 2,
          actualCount: 17,
          actualPercentage: 17,
          expectedPercentage: 17.6,
          variance: -0.6,
        },
        {
          digit: 3,
          actualCount: 12,
          actualPercentage: 12,
          expectedPercentage: 12.5,
          variance: -0.5,
        },
        {
          digit: 4,
          actualCount: 10,
          actualPercentage: 10,
          expectedPercentage: 9.7,
          variance: 0.3,
        },
        {
          digit: 5,
          actualCount: 8,
          actualPercentage: 8,
          expectedPercentage: 7.9,
          variance: 0.1,
        },
        {
          digit: 6,
          actualCount: 7,
          actualPercentage: 7,
          expectedPercentage: 6.7,
          variance: 0.3,
        },
        {
          digit: 7,
          actualCount: 6,
          actualPercentage: 6,
          expectedPercentage: 5.8,
          variance: 0.2,
        },
        {
          digit: 8,
          actualCount: 5,
          actualPercentage: 5,
          expectedPercentage: 5.1,
          variance: -0.1,
        },
        {
          digit: 9,
          actualCount: 5,
          actualPercentage: 5,
          expectedPercentage: 4.6,
          variance: 0.4,
        },
      ]);
    });

    it('uses a strict > 10 threshold: a +10.00pt deviation is not anomalous, +10.10pt is', async () => {
      // digit 1 = 401/1000 -> 40.1% vs 30.1% expected = exactly +10.00pt
      transactionRepo.find.mockResolvedValue(
        rowsFromCounts([401, 164, 113, 84, 67, 54, 46, 38, 33]),
      );
      const atBoundary = await (service as any).analyzeBenfordsLaw();

      expect(atBoundary.totalAnalyzed).toBe(1000);
      expect(atBoundary.isAnomalous).toBe(false);
      expect(atBoundary.deviations[0]).toEqual({
        digit: 1,
        actualCount: 401,
        actualPercentage: 40.1,
        expectedPercentage: 30.1,
        variance: 10,
      });

      // digit 1 = 402/1000 -> 40.2% = +10.10pt -> the ONLY deviating digit
      transactionRepo.find.mockResolvedValue(
        rowsFromCounts([402, 164, 113, 84, 67, 54, 46, 38, 32]),
      );
      const aboveBoundary = await (service as any).analyzeBenfordsLaw();

      expect(aboveBoundary.totalAnalyzed).toBe(1000);
      expect(aboveBoundary.isAnomalous).toBe(true);
      expect(
        aboveBoundary.deviations
          .filter((d: any) => Math.abs(d.variance) > 10)
          .map((d: any) => d.digit),
      ).toEqual([1]);
      expect(aboveBoundary.deviations[0]).toEqual({
        digit: 1,
        actualCount: 402,
        actualPercentage: 40.2,
        expectedPercentage: 30.1,
        variance: 10.1,
      });
    });
  });

  describe('runScan (TC-CAAT-02)', () => {
    it('with a clean book: returns [] and persists nothing, never resolving recipients or broadcasting', async () => {
      transactionRepo.find.mockResolvedValue(benfordCompliantRows());

      const result = await service.runScan();

      expect(result).toEqual([]);
      // all three detectors still executed (3 full-table reads, no early exit)
      expect(transactionRepo.find).toHaveBeenCalledTimes(3);
      expect(alertRepo.create).not.toHaveBeenCalled();
      expect(alertRepo.save).not.toHaveBeenCalled();
      expect(userRepo.find).not.toHaveBeenCalled();
      expect(notificationsService.broadcast).not.toHaveBeenCalled();
    });

    it('with anomalies: creates + saves exactly the 3 alerts (Benford, duplicates, off-hours) and returns the persisted rows', async () => {
      transactionRepo.find.mockResolvedValue(anomalyRows);

      const result = await service.runScan();

      expect(alertRepo.create).toHaveBeenCalledTimes(3);
      expect(alertRepo.save).toHaveBeenCalledTimes(3);

      expect(alertRepo.create).toHaveBeenNthCalledWith(1, {
        title: 'Phát hiện bất thường theo Định luật Benford (Dữ liệu Thực tế)',
        description:
          'Hệ thống quét 15 giao dịch và phát hiện sự phân bố chữ số đầu tiên sai lệch nghiêm trọng so với kỳ vọng của Định luật Benford (Vượt ngưỡng 10%). Điều này thường chỉ ra dấu hiệu chia nhỏ hóa đơn hoặc tạo giao dịch ảo.',
        category: 'CAATTs',
        riskLevel: 'High',
        unitName: 'Hệ thống Kế toán ERP',
        relatedData: {
          type: 'BENFORD',
          totalAnalyzed: 15,
          deviations: anomalyDeviations,
        },
        status: 'Open',
      });

      expect(alertRepo.create).toHaveBeenNthCalledWith(2, {
        title: 'Cảnh báo Thanh toán Trùng lặp (Duplicate Payments - DB)',
        description:
          'Thuật toán phát hiện 1 nhóm giao dịch có rủi ro thanh toán trùng (Cùng nhà cung cấp, cùng ngày, cùng số tiền chính xác).',
        category: 'CAATTs',
        riskLevel: 'High',
        unitName: 'Hệ thống Kế toán ERP',
        relatedData: {
          type: 'DUPLICATES',
          totalDuplicates: 1,
          records: [
            {
              vendor: 'NCC ABC',
              amount: 750000,
              date: duplicateRows[0].transactionDate,
              occurrences: 3,
              invoices: 'DP-1, DP-2, DP-3',
            },
          ],
        },
        status: 'Open',
      });

      expect(alertRepo.create).toHaveBeenNthCalledWith(3, {
        title: 'Giao dịch ngoài giờ làm việc (Off-Hours Operations)',
        description:
          'Phát hiện 2 giao dịch được thực hiện vào khung giờ nghỉ ngơi bất thường (Đêm khuya/Sáng sớm).',
        category: 'Compliance',
        riskLevel: 'High',
        unitName: 'Core Banking',
        relatedData: {
          type: 'OFF_HOURS',
          totalOffHours: 2,
          records: [
            {
              txId: 'OFF-1',
              amount: 12345,
              time: offHoursRows[0].transactionDate,
            },
            {
              txId: 'OFF-2',
              amount: 23456,
              time: offHoursRows[1].transactionDate,
            },
          ],
        },
        status: 'Open',
      });

      // runScan returns what alertRepo.save resolved (the persisted rows, PK included)
      expect(result).toHaveLength(3);
      expect(result.map((a: any) => a.id)).toEqual([1, 2, 3]);
      expect(result.map((a: any) => a.relatedData.type)).toEqual([
        'BENFORD',
        'DUPLICATES',
        'OFF_HOURS',
      ]);
      expect(result[0].relatedData.deviations).toEqual(anomalyDeviations);
      expect(result[1].relatedData.records[0].date).toBe(
        duplicateRows[0].transactionDate,
      );
      expect(result[2].relatedData.records).toEqual([
        { txId: 'OFF-1', amount: 12345, time: offHoursRows[0].transactionDate },
        { txId: 'OFF-2', amount: 23456, time: offHoursRows[1].transactionDate },
      ]);
      // every created alert went through save() unchanged
      expect(alertRepo.save).toHaveBeenNthCalledWith(
        1,
        alertRepo.create.mock.results[0].value,
      );
    });

    it('broadcasts one notification per alert to exactly the admin + dept-lead users', async () => {
      transactionRepo.find.mockResolvedValue(anomalyRows);

      await service.runScan();

      // recipients are re-resolved from the DB for each alert
      expect(userRepo.find).toHaveBeenCalledTimes(3);
      expect(userRepo.find).toHaveBeenNthCalledWith(1, {
        relations: ['role'],
      });
      expect(userRepo.find).toHaveBeenNthCalledWith(3, {
        relations: ['role'],
      });

      expect(notificationsService.broadcast).toHaveBeenCalledTimes(3);
      const expectedBroadcasts = [
        {
          title: '🚨 PHÁT HIỆN SỚM RỦI RO (REAL DATA)',
          message:
            'Phát hiện giao dịch bất thường: "Phát hiện bất thường theo Định luật Benford (Dữ liệu Thực tế)" tại Hệ thống Kế toán ERP (Rủi ro: High).',
          type: 'Alert',
          link: '/continuous-monitoring',
        },
        {
          title: '🚨 PHÁT HIỆN SỚM RỦI RO (REAL DATA)',
          message:
            'Phát hiện giao dịch bất thường: "Cảnh báo Thanh toán Trùng lặp (Duplicate Payments - DB)" tại Hệ thống Kế toán ERP (Rủi ro: High).',
          type: 'Alert',
          link: '/continuous-monitoring',
        },
        {
          title: '🚨 PHÁT HIỆN SỚM RỦI RO (REAL DATA)',
          message:
            'Phát hiện giao dịch bất thường: "Giao dịch ngoài giờ làm việc (Off-Hours Operations)" tại Core Banking (Rủi ro: High).',
          type: 'Alert',
          link: '/continuous-monitoring',
        },
      ];
      expectedBroadcasts.forEach((dto, idx) => {
        expect(notificationsService.broadcast).toHaveBeenNthCalledWith(
          idx + 1,
          expectedRecipientIds,
          dto,
        );
      });
      // the plain Auditor (id 3) and the jobTitle-only "Team Lead" (id 6) must not be recipients
      expect(notificationsService.broadcast.mock.calls[0][0]).toEqual(
        expectedRecipientIds,
      );
      expect(notificationsService.broadcast.mock.calls[0][0]).not.toContain(3);
      expect(notificationsService.broadcast.mock.calls[0][0]).not.toContain(6);
    });

    it('still persists the alerts but skips broadcasting when no user is admin or dept-lead', async () => {
      transactionRepo.find.mockResolvedValue(anomalyRows);
      userRepo.find.mockResolvedValue([
        {
          id: 3,
          fullName: 'Kiểm toán viên',
          role: { name: 'Auditor' },
          jobTitle: 'Kiểm toán viên',
        },
      ]);

      const result = await service.runScan();

      expect(result).toHaveLength(3);
      expect(alertRepo.save).toHaveBeenCalledTimes(3);
      expect(userRepo.find).toHaveBeenCalledTimes(3);
      expect(notificationsService.broadcast).not.toHaveBeenCalled();
    });
  });

  describe('query helpers', () => {
    it('findAll returns alerts ordered by createdAt DESC', async () => {
      const alert = { id: 7, title: 'A' };
      alertRepo.find.mockResolvedValue([alert]);

      await expect(service.findAll()).resolves.toEqual([alert]);
      expect(alertRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
    });

    it('getStats counts total, open and high-risk open alerts', async () => {
      alertRepo.count
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(2);

      await expect(service.getStats()).resolves.toEqual({
        total: 15,
        open: 4,
        high: 2,
      });
      expect(alertRepo.count).toHaveBeenNthCalledWith(1);
      expect(alertRepo.count).toHaveBeenNthCalledWith(2, {
        where: { status: 'Open' },
      });
      expect(alertRepo.count).toHaveBeenNthCalledWith(3, {
        where: { riskLevel: 'High', status: 'Open' },
      });
    });

    it('updateStatus persists status + resolution notes and returns the reloaded alert', async () => {
      const reloaded = {
        id: 7,
        status: 'Resolved',
        resolutionNotes: 'Đã xử lý',
      };
      alertRepo.update.mockResolvedValue({ affected: 1 });
      alertRepo.findOne.mockResolvedValue(reloaded);

      await expect(
        service.updateStatus(7, 'Resolved', 'Đã xử lý'),
      ).resolves.toEqual(reloaded);
      expect(alertRepo.update).toHaveBeenCalledWith(7, {
        status: 'Resolved',
        resolutionNotes: 'Đã xử lý',
      });
      expect(alertRepo.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
    });
  });
});
