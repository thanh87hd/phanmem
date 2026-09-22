import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ContinuousMonitoringService } from './continuous-monitoring.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('continuous-monitoring')
@UseGuards(JwtAuthGuard)
export class ContinuousMonitoringController {
  constructor(
    private readonly monitoringService: ContinuousMonitoringService,
  ) {}

  @Get('alerts')
  findAll() {
    return [
      {
        id: 1,
        title: 'Rủi ro thanh khoản vượt ngưỡng LDR',
        category: 'Liquidity',
        unitName: 'Chi nhánh Hà Nội',
        severity: 'RED',
        status: 'Open',
        slaDeadline: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 2,
        title: 'Biến động tỷ lệ nợ xấu NPL > 3%',
        category: 'Asset Quality',
        unitName: 'Chi nhánh Hồ Chí Minh',
        severity: 'YELLOW',
        status: 'UnderInvestigation',
        slaDeadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
      {
        id: 3,
        title: 'Chênh lệch dòng tiền huy động - cho vay',
        category: 'Capital',
        unitName: 'Toàn hệ thống',
        severity: 'RED',
        status: 'Open',
        slaDeadline: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 4,
        title: 'Phát hiện chia nhỏ giao dịch',
        category: 'Fraud',
        unitName: 'Phòng Kế toán',
        severity: 'YELLOW',
        status: 'Resolved',
        slaDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      },
    ];
  }

  @Post('run-scan')
  runScan() {
    return this.monitoringService.runScan();
  }

  @Get('stats')
  getStats() {
    return { total: 15, open: 4, high: 2, red: 2, yellow: 2 };
  }

  @Patch('alerts/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes: string },
  ) {
    return this.monitoringService.updateStatus(+id, body.status, body.notes);
  }

  @Get('executive-summary')
  getExecutiveSummary() {
    return {
      pillarScores: [
        { pillar: 'Capital', score: 85, redCount: 0, yellowCount: 1 },
        { pillar: 'Asset Quality', score: 65, redCount: 2, yellowCount: 5 },
        { pillar: 'Management', score: 92, redCount: 0, yellowCount: 0 },
        { pillar: 'Earnings', score: 78, redCount: 1, yellowCount: 2 },
        { pillar: 'Liquidity', score: 95, redCount: 0, yellowCount: 0 },
        { pillar: 'Sensitivity', score: 88, redCount: 0, yellowCount: 1 },
      ],
      alertSummary: { total: 12, red: 3, yellow: 9 },
      activeScenarios: [
        {
          id: 1,
          title: 'Rủi ro thanh khoản cuối tháng',
          unitName: 'Toàn hệ thống',
          createdAt: new Date().toISOString(),
        },
      ],
      slaSummary: { total: 45, onTime: 38, pending: 5, overdue: 2 },
      recentCases: [],
    };
  }

  @Get('camels-metrics')
  getCamelsMetrics() {
    return [
      {
        id: 1,
        branchCode: 'HO',
        carRatio: 11.5,
        cet1Ratio: 8.2,
        tier1Ratio: 9.5,
        equityToAssetsRatio: 10.1,
        leverageRatio: 7.8,
        rwaGrowthRatio: 12.4,
      },
      {
        id: 2,
        branchCode: 'CN_HANOI',
        carRatio: 10.2,
        cet1Ratio: 7.5,
        tier1Ratio: 8.8,
        equityToAssetsRatio: 9.5,
        leverageRatio: 7.2,
        rwaGrowthRatio: 15.1,
      },
      {
        id: 3,
        branchCode: 'CN_HCM',
        carRatio: 7.8,
        cet1Ratio: 4.1,
        tier1Ratio: 5.5,
        equityToAssetsRatio: 6.2,
        leverageRatio: 4.5,
        rwaGrowthRatio: 25.4,
      },
    ];
  }

  @Get('kri-rules')
  getKriRules() {
    return [
      {
        id: 1,
        ruleCode: 'RULE_CAP_01',
        name: 'Hệ số CAR',
        category: 'Capital',
        operator: '<',
        redThreshold: 8.0,
        yellowThreshold: 9.0,
      },
      {
        id: 2,
        ruleCode: 'RULE_CAP_02',
        name: 'Hệ số CET1',
        category: 'Capital',
        operator: '<',
        redThreshold: 4.5,
        yellowThreshold: 5.5,
      },
      {
        id: 3,
        ruleCode: 'RULE_CAP_03',
        name: 'Tier 1 Ratio',
        category: 'Capital',
        operator: '<',
        redThreshold: 6.0,
        yellowThreshold: 7.0,
      },
      {
        id: 4,
        ruleCode: 'RULE_CAP_04',
        name: 'Equity/Assets',
        category: 'Capital',
        operator: '<',
        redThreshold: 5.0,
        yellowThreshold: 6.0,
      },
      {
        id: 5,
        ruleCode: 'RULE_CAP_05',
        name: 'Leverage',
        category: 'Capital',
        operator: '<',
        redThreshold: 3.0,
        yellowThreshold: 4.0,
      },
      {
        id: 6,
        ruleCode: 'RULE_CAP_06',
        name: 'RWA Growth',
        category: 'Capital',
        operator: '>',
        redThreshold: 20.0,
        yellowThreshold: 15.0,
      },
    ];
  }

  @Get('audit-rules')
  getAuditRules() {
    return [
      {
        id: 1,
        ruleId: 'RULE-001',
        domain: 'Tín dụng',
        ruleName: 'Nợ quá hạn vượt mức',
        alertLevel: 'Đỏ',
        slaHours: 24,
        risk: 'Rủi ro thanh khoản',
        logic: 'Ngày quá hạn > 30',
        isActive: true,
      },
      {
        id: 2,
        ruleId: 'RULE-002',
        domain: 'Tín dụng',
        ruleName: 'Chia nhỏ giải ngân',
        alertLevel: 'Vàng',
        slaHours: 48,
        risk: 'Lách hạn mức phê duyệt',
        logic: 'Cùng 1 KH, nhiều khế ước < hạn mức trong 24h',
        isActive: true,
      },
      {
        id: 3,
        ruleId: 'RULE-003',
        domain: 'Huy động',
        ruleName: 'Rút tiền gửi quy mô lớn',
        alertLevel: 'Đỏ',
        slaHours: 12,
        risk: 'Thiếu hụt thanh khoản',
        logic: 'Rút > 10% tổng huy động CN / ngày',
        isActive: false,
      },
    ];
  }

  @Get('debt-migration')
  getDebtMigration() {
    return {
      summary: {
        totalUpgrades: 45,
        totalDowngrades: 128,
        netMigration: -83,
        downgradeRatio: '2.5%',
        nplFormationRate: '1.2%',
      },
      matrix: [
        [950, 40, 5, 3, 2],
        [15, 800, 100, 50, 35],
        [5, 20, 700, 150, 125],
        [2, 5, 10, 600, 383],
        [0, 0, 0, 10, 990],
      ],
      rates: [
        [95, 4, 0.5, 0.3, 0.2],
        [1.5, 80, 10, 5, 3.5],
        [0.5, 2, 70, 15, 12.5],
        [0.2, 0.5, 1, 60, 38.3],
        [0, 0, 0, 1, 99],
      ],
      records: [
        {
          id: 1,
          customerName: 'Công ty Cổ phần Đầu tư ABC',
          fromGroup: 'N2',
          toGroup: 'N4',
          amount: 50000000000,
          date: new Date().toISOString(),
          reason: 'Chậm thanh toán lãi > 90 ngày',
          branch: 'CN_HANOI',
        },
        {
          id: 2,
          customerName: 'Tập đoàn XYZ',
          fromGroup: 'N1',
          toGroup: 'N3',
          amount: 120000000000,
          date: new Date().toISOString(),
          reason: 'Suy giảm tài chính',
          branch: 'CN_HCM',
        },
      ],
    };
  }

  @Get('earnings-analysis')
  getEarningsAnalysis() {
    return {
      summary: {
        totalPbt: 12500,
        pbtGrowth: 8.5,
        niiGrowth: 12.0,
        nonIiGrowth: 5.2,
        costToIncomeRatio: 35.5,
        costOfRisk: 1.8,
        roa: 1.5,
        roe: 15.2,
        phantomProfitRiskRatio: 12.4,
      },
      phantomProfitRisks: [
        {
          id: 1,
          branchCode: 'CN_HANOI',
          metricName: 'Lãi dự thu / Tổng TS Sinh lời',
          value: '4.5%',
          threshold: '3.0%',
          status: 'High',
          description: 'Tỷ lệ lãi dự thu cao bất thường',
        },
        {
          id: 2,
          branchCode: 'CN_HCM',
          metricName: 'Tỷ lệ cơ cấu lại nợ / Tổng dư nợ',
          value: '6.2%',
          threshold: '5.0%',
          status: 'Medium',
          description: 'Lạm dụng cơ cấu lại nợ để giữ nhóm',
        },
        {
          id: 3,
          branchCode: 'HO',
          metricName: 'Tăng trưởng Tín dụng / Tăng trưởng NII',
          value: '25% / 5%',
          threshold: '> 3x',
          status: 'High',
          description:
            'Tăng trưởng dư nợ nhanh nhưng thu nhập lãi không tương xứng',
        },
      ],
      branchBreakdown: [
        {
          branchCode: 'CN_HANOI',
          profitBeforeTax: 4500,
          pbtGrowthPct: 10.5,
          netInterestIncome: 3800,
          nonInterestIncome: 1200,
          operatingExpense: 1500,
          provisionExpense: 500,
          accruedInterestGrowth: 15.2,
        },
        {
          branchCode: 'CN_HCM',
          profitBeforeTax: 5200,
          pbtGrowthPct: 5.2,
          netInterestIncome: 4100,
          nonInterestIncome: 1500,
          operatingExpense: 1800,
          provisionExpense: 700,
          accruedInterestGrowth: 22.5,
        },
        {
          branchCode: 'CN_DANANG',
          profitBeforeTax: 2800,
          pbtGrowthPct: -2.5,
          netInterestIncome: 2500,
          nonInterestIncome: 800,
          operatingExpense: 1000,
          provisionExpense: 600,
          accruedInterestGrowth: 8.1,
        },
      ],
    };
  }

  @Get('audit-cases')
  getAuditCases() {
    return [
      {
        id: 1,
        caseId: 'CASE-2026-001',
        branchCode: 'CN_HANOI',
        alert: { title: 'Rủi ro thanh khoản vượt ngưỡng LDR' },
        explanationStatus: 'PENDING_EXPLANATION',
        slaDeadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      },
      {
        id: 2,
        caseId: 'CASE-2026-002',
        branchCode: 'CN_HCM',
        alert: { title: 'Biến động tỷ lệ nợ xấu NPL > 3%' },
        explanationStatus: 'EXPLAINED',
        slaDeadline: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
      },
      {
        id: 3,
        caseId: 'CASE-2026-003',
        branchCode: 'HO',
        alert: { title: 'Chênh lệch dòng tiền huy động - cho vay' },
        explanationStatus: 'REJECTED',
        slaDeadline: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      },
    ];
  }
}
