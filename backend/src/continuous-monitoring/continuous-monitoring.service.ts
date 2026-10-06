import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MonitoringAlert } from './entities/monitoring-alert.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';

export interface BenfordDeviationItem {
  digit: number;
  actualCount: number;
  actualPercentage: number;
  expectedPercentage: number;
  variance: number;
}

export interface DuplicatePaymentItem {
  vendor: string | null;
  amount: number;
  date: Date;
  occurrences: number;
  invoices: string;
}

@Injectable()
export class ContinuousMonitoringService {
  constructor(
    @InjectRepository(MonitoringAlert)
    private readonly alertRepo: Repository<MonitoringAlert>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async analyzeBenfordsLaw() {
    const transactions = await this.transactionRepo.find();
    const actualCounts = Array(10).fill(0);
    let totalValid = 0;

    for (const inv of transactions) {
      if (inv.amount > 0) {
        const firstDigit = parseInt(String(Math.floor(inv.amount))[0]);
        if (firstDigit >= 1 && firstDigit <= 9) {
          actualCounts[firstDigit]++;
          totalValid++;
        }
      }
    }

    const expectedPercentages = [
      0, 30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6,
    ];
    const deviations: BenfordDeviationItem[] = [];
    let isAnomalous = false;

    if (totalValid > 0) {
      for (let i = 1; i <= 9; i++) {
        const actualPct = (actualCounts[i] / totalValid) * 100;
        const expectedPct = expectedPercentages[i];
        const variance = actualPct - expectedPct;

        deviations.push({
          digit: i,
          actualCount: actualCounts[i],
          actualPercentage: parseFloat(actualPct.toFixed(2)),
          expectedPercentage: expectedPct,
          variance: parseFloat(variance.toFixed(2)),
        });

        // Threshold 10%
        if (Math.abs(variance) > 10) {
          isAnomalous = true;
        }
      }
    }

    return { isAnomalous, totalAnalyzed: totalValid, deviations };
  }

  private async detectDuplicatePayments() {
    const transactions = await this.transactionRepo.find();
    const map = new Map<string, Transaction[]>();
    for (const inv of transactions) {
      if (!inv.transactionDate) continue;
      const transactionDate = new Date(inv.transactionDate);
      // Quyết định: khoá "cùng ngày" phải theo LỊCH ĐỊA PHƯƠNG (giờ ngân hàng, Asia/Saigon),
      // KHÔNG dùng toISOString() (ngày UTC) như trước.
      //  - Nếu dùng ngày UTC: 23:30 ngày 15 và 00:30 ngày 16 giờ VN (UTC+7) cùng rơi vào ngày UTC 15
      //    → báo trùng lặp SAI; còn 00:30 và 23:30 trong CÙNG ngày địa phương lại rơi vào 2 ngày UTC
      //    khác nhau → BỎ SÓT trùng lặp thật.
      //  - detectOffHoursTransactions() trong cùng file đã dùng giờ địa phương (getHours()),
      //    nên hai bộ phát hiện phải nhất quán cùng một múi giờ địa phương.
      if (isNaN(transactionDate.getTime())) continue; // ngày không hợp lệ: bỏ qua thay vì gộp nhầm
      const localDay = `${transactionDate.getFullYear()}-${String(
        transactionDate.getMonth() + 1,
      ).padStart(2, '0')}-${String(transactionDate.getDate()).padStart(2, '0')}`;
      const key = `${inv.customerName || inv.vendorName}_${inv.amount}_${localDay}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(inv);
    }

    const duplicates: DuplicatePaymentItem[] = [];
    for (const [key, group] of map.entries()) {
      if (group.length > 1) {
        duplicates.push({
          vendor: group[0].customerName || group[0].vendorName,
          amount: group[0].amount,
          date: group[0].transactionDate,
          occurrences: group.length,
          invoices: group.map((g) => g.transactionCode).join(', '),
        });
      }
    }

    return duplicates;
  }

  private async detectOffHoursTransactions() {
    const transactions = await this.transactionRepo.find();
    const offHours = transactions.filter((t) => {
      if (!t.transactionDate) return false;
      const hour = new Date(t.transactionDate).getHours();
      return hour < 6 || hour > 20; // Off-hours: 21:00 to 05:59
    });
    return offHours;
  }

  /**
   * Quét dữ liệu giao dịch thật (Database-Driven)
   */
  async runScan() {
    const newAlerts: MonitoringAlert[] = [];

    // --- BENFORD'S LAW ---
    const benfordResult = await this.analyzeBenfordsLaw();
    if (benfordResult.isAnomalous) {
      const alert = this.alertRepo.create({
        title: 'Phát hiện bất thường theo Định luật Benford (Dữ liệu Thực tế)',
        description: `Hệ thống quét ${benfordResult.totalAnalyzed} giao dịch và phát hiện sự phân bố chữ số đầu tiên sai lệch nghiêm trọng so với kỳ vọng của Định luật Benford (Vượt ngưỡng 10%). Điều này thường chỉ ra dấu hiệu chia nhỏ hóa đơn hoặc tạo giao dịch ảo.`,
        category: 'CAATTs',
        riskLevel: 'High',
        unitName: 'Hệ thống Kế toán ERP',
        relatedData: {
          type: 'BENFORD',
          totalAnalyzed: benfordResult.totalAnalyzed,
          deviations: benfordResult.deviations,
        },
        status: 'Open',
      });
      newAlerts.push(await this.alertRepo.save(alert));
    }

    // --- DUPLICATE PAYMENTS ---
    const duplicateResult = await this.detectDuplicatePayments();
    if (duplicateResult.length > 0) {
      const alert = this.alertRepo.create({
        title: 'Cảnh báo Thanh toán Trùng lặp (Duplicate Payments - DB)',
        description: `Thuật toán phát hiện ${duplicateResult.length} nhóm giao dịch có rủi ro thanh toán trùng (Cùng nhà cung cấp, cùng ngày, cùng số tiền chính xác).`,
        category: 'CAATTs',
        riskLevel: 'High',
        unitName: 'Hệ thống Kế toán ERP',
        relatedData: {
          type: 'DUPLICATES',
          totalDuplicates: duplicateResult.length,
          records: duplicateResult,
        },
        status: 'Open',
      });
      newAlerts.push(await this.alertRepo.save(alert));
    }

    // --- OFF-HOURS ---
    const offHours = await this.detectOffHoursTransactions();
    if (offHours.length > 0) {
      const alert = this.alertRepo.create({
        title: 'Giao dịch ngoài giờ làm việc (Off-Hours Operations)',
        description: `Phát hiện ${offHours.length} giao dịch được thực hiện vào khung giờ nghỉ ngơi bất thường (Đêm khuya/Sáng sớm).`,
        category: 'Compliance',
        riskLevel: 'High',
        unitName: 'Core Banking',
        relatedData: {
          type: 'OFF_HOURS',
          totalOffHours: offHours.length,
          records: offHours.map((o) => ({
            txId: o.transactionCode,
            amount: o.amount,
            time: o.transactionDate,
          })),
        },
        status: 'Open',
      });
      newAlerts.push(await this.alertRepo.save(alert));
    }

    // Broadcast alerts
    for (const alert of newAlerts) {
      const users = await this.userRepo.find({ relations: ['role'] });
      const recipientIds = users
        .filter((u) => {
          return (
            ScopeFilterService.isAdminRole(u.role?.name, u.jobTitle) ||
            ScopeFilterService.isDeptLeadRole(u.role?.name, u.jobTitle)
          );
        })
        .map((u) => u.id);

      if (recipientIds.length > 0) {
        await this.notificationsService.broadcast(recipientIds, {
          title: '🚨 PHÁT HIỆN SỚM RỦI RO (REAL DATA)',
          message: `Phát hiện giao dịch bất thường: "${alert.title}" tại ${alert.unitName} (Rủi ro: ${alert.riskLevel}).`,
          type: 'Alert',
          link: '/continuous-monitoring',
        });
      }
    }

    return newAlerts;
  }

  findAll() {
    return this.alertRepo.find({ order: { createdAt: 'DESC' } });
  }

  findOne(id: number) {
    return this.alertRepo.findOne({ where: { id } });
  }

  async updateStatus(id: number, status: string, notes: string) {
    await this.alertRepo.update(id, { status, resolutionNotes: notes });
    return this.findOne(id);
  }

  async getStats() {
    const total = await this.alertRepo.count();
    const open = await this.alertRepo.count({ where: { status: 'Open' } });
    const high = await this.alertRepo.count({
      where: { riskLevel: 'High', status: 'Open' },
    });
    return { total, open, high };
  }
}
