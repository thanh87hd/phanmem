import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { KpiService } from './kpi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('kpi')
@UseGuards(JwtAuthGuard)
export class KpiController {
  constructor(private readonly service: KpiService) {}

  @Get()
  getKpis() {
    return this.service.calculateKpis();
  }

  @Get('compliance-checklist')
  getComplianceChecklist() {
    return this.service.getComplianceChecklist();
  }

  @Get('compliance-status')
  getComplianceStatus() {
    return this.service.getComplianceStatus();
  }

  @Post('compliance-status')
  saveComplianceStatus(@Body() body: { id: string; checked: boolean }) {
    return this.service.saveComplianceStatus(body.id, body.checked);
  }
  @Get('personal')
  getPersonalKpi() {
    return {
      userId: 1,
      username: 'admin',
      fullName: 'Quản trị viên',
      roleType: 'Admin',
      department: 'Phòng Công nghệ',
      period: '2026-H1',
      periodType: 'H1',
      totalScore: 0.95,
      xepLoai: 'Vượt yêu cầu',
      bonusPoints: 5,
      finalScore: 1.0,
      pillarScores: {
        'TÀI CHÍNH': 0.1,
        'KHÁCH HÀNG': 0.1,
        'QUY TRÌNH': 0.55,
        'HỌC HỎI & PHÁT TRIỂN': 0.2,
      },
      details: [
        {
          kpiCode: 'FIN-01',
          kpiName: '% OPEX (100%)',
          bscPillar: 'TÀI CHÍNH',
          weight: 0.1,
          threshold: 0.95,
          target: 0.98,
          actualValue: 1.0,
          completionRate: 1.0,
          weightedScore: 0.1,
          status: 'Passed',
          notes: 'Đạt chỉ tiêu chi phí',
        },
        {
          kpiCode: 'CUS-01',
          kpiName: '% Hài lòng (100%)',
          bscPillar: 'KHÁCH HÀNG',
          weight: 0.1,
          threshold: 0.9,
          target: 0.95,
          actualValue: 1.0,
          completionRate: 1.0,
          weightedScore: 0.1,
          status: 'Passed',
        },
        {
          kpiCode: 'PRO-01',
          kpiName: '% Hoàn thành KT',
          bscPillar: 'QUY TRÌNH',
          weight: 0.6,
          threshold: 0.9,
          target: 1.0,
          actualValue: 0.95,
          completionRate: 0.95,
          weightedScore: 0.55,
          status: 'Warning',
        },
      ],
    };
  }

  @Post('personal')
  createPersonalKpi(@Body() body: any) {
    return {
      userId: body.id || 1,
      username: body.username || 'admin',
      fullName: body.fullName || 'User',
      roleType: body.roleType || 'KTV',
      department: body.department || '',
      period: '2026-H1',
      periodType: 'H1',
      totalScore: 0.9,
      xepLoai: 'Đạt yêu cầu',
      bonusPoints: 0,
      finalScore: 0.9,
      pillarScores: {
        'TÀI CHÍNH': 0.1,
        'KHÁCH HÀNG': 0.1,
        'QUY TRÌNH': 0.5,
        'HỌC HỎI & PHÁT TRIỂN': 0.2,
      },
      details: [],
    };
  }

  @Get('assessment/me')
  getMyAssessment() {
    return {
      id: 1,
      status: 'Draft',
      ktvFeedback: '',
      managerFeedback: '',
      rejectionReason: '',
      items: [], // Will default to DEFAULT_MB02_ITEMS in frontend if empty or not provided
    };
  }

  @Get('assessments')
  getAssessments() {
    return [];
  }

  @Post('personal/summary')
  getPersonalSummary(@Query('period') period?: string) {
    return [
      {
        userId: 1,
        username: 'admin',
        fullName: 'Quản trị viên Hệ thống',
        roleType: 'Admin',
        department: 'Khối KTNB',
        period: period || '2026-H1',
        totalScore: 0.95,
        xepLoai: 'Vượt yêu cầu',
        bonusPoints: 5,
        finalScore: 1.0,
        pillarScores: {
          'TÀI CHÍNH': 0.1,
          'KHÁCH HÀNG': 0.1,
          'QUY TRÌNH': 0.55,
          'HỌC HỎI & PHÁT TRIỂN': 0.2,
        },
      },
    ];
  }

  @Get('targets')
  getTargets(
    @Query('period') period?: string,
    @Query('roleType') roleType?: string,
  ) {
    return [];
  }
}
