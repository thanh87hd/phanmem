import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditFinding } from './entities/audit-finding.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';

@Injectable()
export class AuditFindingsStatisticsService {
  constructor(
    @InjectRepository(AuditFinding)
    private readonly auditFindingRepository: Repository<AuditFinding>,
  ) {}

  async getMultiDimensionalStats(
    user?: any,
    departmentId?: string,
    year?: string,
    auditUniverse?: string,
  ) {
    const query = this.auditFindingRepository
      .createQueryBuilder('finding')
      .leftJoinAndSelect('finding.engagement', 'engagement')
      .leftJoinAndSelect('engagement.plan', 'plan')
      .leftJoinAndSelect('engagement.auditedDepartment', 'auditedDepartment')
      .leftJoinAndSelect('finding.workstream', 'workstream')
      .leftJoinAndSelect('finding.managingBranch', 'managingBranch')
      .leftJoinAndSelect(
        'finding.businessProcessEntity',
        'businessProcessEntity',
      )
      .leftJoinAndSelect('finding.proposerUser', 'proposerUser')
      .leftJoinAndSelect('finding.appraiserUser', 'appraiserUser')
      .leftJoinAndSelect('finding.businessLeaderUser', 'businessLeaderUser')
      .leftJoinAndSelect(
        'finding.internalDefectCodeEntity',
        'internalDefectCodeEntity',
      )
      .leftJoinAndSelect(
        'finding.nd340DefectCodeEntity',
        'nd340DefectCodeEntity',
      )
      .leftJoinAndSelect(
        'finding.nhanSuDefectCodeEntity',
        'nhanSuDefectCodeEntity',
      )
      .orderBy('finding.createdAt', 'DESC');

    if (departmentId) {
      query.andWhere('engagement.legacyAuditedDepartment = :departmentId', {
        departmentId,
      });
    }
    if (year) {
      query.andWhere('plan.year = :year', { year: parseInt(year) });
    }
    if (auditUniverse) {
      query.andWhere('engagement.auditUniverse = :auditUniverse', {
        auditUniverse,
      });
    }

    const isAdmin = ScopeFilterService.isAdminRole(user?.role);

    if (user && !isAdmin) {
      query.andWhere(
        '(engagement.leadAuditorId = :userId OR engagement.teamMembers LIKE :likeUserId)',
        { userId: user.userId, likeUserId: `%"userId":${user.userId}%` },
      );
    }

    const findings = await query.getMany();
    let defectCodes: any[] = [];
    try {
      defectCodes = await this.auditFindingRepository.manager.query(
        `SELECT * FROM "defect_codes"`,
      );
    } catch {
      defectCodes = [];
    }

    const unitStats: Record<
      string,
      {
        unit: string;
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
        total: number;
      }
    > = {};
    const processStats: Record<
      string,
      {
        process: string;
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
        total: number;
      }
    > = {};
    const historyStats: Record<
      string,
      Record<
        number,
        {
          year: number;
          engagementName: string;
          findingsCount: number;
          status: string;
        }[]
      >
    > = {};

    const proposerStats: Record<
      string,
      {
        name: string;
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
        total: number;
      }
    > = {};
    const appraiserStats: Record<
      string,
      {
        name: string;
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
        total: number;
      }
    > = {};
    const leaderStats: Record<
      string,
      {
        name: string;
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
        total: number;
      }
    > = {};

    const nd340Stats: Record<
      string,
      { code: string; description: string; count: number; totalFine: number }
    > = {};
    const nhanSuStats: Record<
      string,
      { code: string; description: string; count: number; riskLevel: number }
    > = {};

    const operationStats: Record<
      string,
      {
        operationType: string;
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
        total: number;
      }
    > = {
      TD: {
        operationType: 'Tín dụng (TD)',
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        total: 0,
      },
      PTD: {
        operationType: 'Phi tín dụng (PTD)',
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        total: 0,
      },
      TKBĐ: {
        operationType: 'Tiết kiệm Bưu điện (TKBĐ)',
        Critical: 0,
        High: 0,
        Medium: 0,
        Low: 0,
        total: 0,
      },
    };

    const regionStats: Record<
      string,
      {
        region: string;
        Critical: number;
        High: number;
        Medium: number;
        Low: number;
        total: number;
      }
    > = {};

    findings.forEach((f) => {
      const unitName =
        f.managingBranch?.name ||
        f.engagement?.auditedDepartment?.name ||
        f.legacyManagingBranchName ||
        f.engagement?.branchName ||
        f.engagement?.legacyAuditedDepartment ||
        'Đội ngũ khác';
      const processName =
        f.businessProcessEntity?.name ||
        f.legacyBusinessProcess ||
        f.workstream?.title ||
        f.wpTitle ||
        'Quy trình khác';
      const risk = f.riskLevel || 'Medium';
      const year =
        f.engagement?.plan?.year ||
        (f.engagement?.startDate
          ? new Date(f.engagement.startDate).getFullYear()
          : new Date().getFullYear());

      if (!unitStats[unitName]) {
        unitStats[unitName] = {
          unit: unitName,
          Critical: 0,
          High: 0,
          Medium: 0,
          Low: 0,
          total: 0,
        };
      }
      if (['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
        unitStats[unitName][risk as 'Critical' | 'High' | 'Medium' | 'Low']++;
      }
      unitStats[unitName].total++;

      if (!processStats[processName]) {
        processStats[processName] = {
          process: processName,
          Critical: 0,
          High: 0,
          Medium: 0,
          Low: 0,
          total: 0,
        };
      }
      if (['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
        processStats[processName][
          risk as 'Critical' | 'High' | 'Medium' | 'Low'
        ]++;
      }
      processStats[processName].total++;

      // Operation Type stats
      const op = f.operationType || 'Khác';
      const opKey = ['TD', 'PTD', 'TKBĐ'].includes(op) ? op : 'Khác';
      if (!operationStats[opKey]) {
        operationStats[opKey] = {
          operationType: opKey === 'Khác' ? 'Nghiệp vụ khác' : opKey,
          Critical: 0,
          High: 0,
          Medium: 0,
          Low: 0,
          total: 0,
        };
      }
      if (['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
        operationStats[opKey][risk as 'Critical' | 'High' | 'Medium' | 'Low']++;
      }
      operationStats[opKey].total++;

      // Region stats
      const reg =
        (f as any).region || (f.engagement as any)?.region || 'Khác';
      if (!regionStats[reg]) {
        regionStats[reg] = {
          region: reg,
          Critical: 0,
          High: 0,
          Medium: 0,
          Low: 0,
          total: 0,
        };
      }
      if (['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
        regionStats[reg][risk as 'Critical' | 'High' | 'Medium' | 'Low']++;
      }
      regionStats[reg].total++;

      // Responsible Officers stats
      const prop = f.proposerUser?.fullName || f.legacyProposerOfficer;
      if (prop) {
        if (!proposerStats[prop]) {
          proposerStats[prop] = {
            name: prop,
            Critical: 0,
            High: 0,
            Medium: 0,
            Low: 0,
            total: 0,
          };
        }
        if (['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
          proposerStats[prop][risk as 'Critical' | 'High' | 'Medium' | 'Low']++;
        }
        proposerStats[prop].total++;
      }

      const appr = f.appraiserUser?.fullName || f.legacyAppraiserOfficer;
      if (appr) {
        if (!appraiserStats[appr]) {
          appraiserStats[appr] = {
            name: appr,
            Critical: 0,
            High: 0,
            Medium: 0,
            Low: 0,
            total: 0,
          };
        }
        if (['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
          appraiserStats[appr][
            risk as 'Critical' | 'High' | 'Medium' | 'Low'
          ]++;
        }
        appraiserStats[appr].total++;
      }

      const lead = f.businessLeaderUser?.fullName || f.legacyBusinessLeader;
      if (lead) {
        if (!leaderStats[lead]) {
          leaderStats[lead] = {
            name: lead,
            Critical: 0,
            High: 0,
            Medium: 0,
            Low: 0,
            total: 0,
          };
        }
        if (['Critical', 'High', 'Medium', 'Low'].includes(risk)) {
          leaderStats[lead][risk as 'Critical' | 'High' | 'Medium' | 'Low']++;
        }
        leaderStats[lead].total++;
      }

      const nd340Code =
        f.nd340DefectCodeEntity?.code || f.legacyNd340DefectCode;
      if (nd340Code) {
        if (!nd340Stats[nd340Code]) {
          const dc = defectCodes.find(
            (c: any) => c.code === nd340Code && c.dimension === 'ND340',
          );
          nd340Stats[nd340Code] = {
            code: nd340Code,
            description:
              f.nd340DefectCodeEntity?.description ||
              (dc ? dc.description : 'Unknown'),
            count: 0,
            totalFine: 0,
          };
        }
        nd340Stats[nd340Code].count++;

        let fine = f.actualFineAmount;
        if (fine === null || fine === undefined) {
          const dc = defectCodes.find(
            (c: any) => c.code === nd340Code && c.dimension === 'ND340',
          );
          fine = f.nd340DefectCodeEntity?.maxFine ?? (dc ? dc.maxFine : 0);
        }
        nd340Stats[nd340Code].totalFine += fine || 0;
      }

      const nhanSuCode =
        f.nhanSuDefectCodeEntity?.code || f.legacyNhanSuDefectCode;
      if (nhanSuCode) {
        if (!nhanSuStats[nhanSuCode]) {
          const dc = defectCodes.find(
            (c: any) => c.code === nhanSuCode && c.dimension === 'NHANSU',
          );
          nhanSuStats[nhanSuCode] = {
            code: nhanSuCode,
            description:
              f.nhanSuDefectCodeEntity?.description ||
              (dc ? dc.description : 'Unknown'),
            count: 0,
            riskLevel:
              f.nhanSuDefectCodeEntity?.riskLevel ?? (dc ? dc.riskLevel : 0),
          };
        }
        nhanSuStats[nhanSuCode].count++;
      }

      if (!historyStats[unitName]) {
        historyStats[unitName] = {};
      }
      if (!historyStats[unitName][year]) {
        historyStats[unitName][year] = [];
      }
      const existingEng = historyStats[unitName][year].find(
        (e) => e.engagementName === (f.engagement?.name || 'Kỳ kiểm toán'),
      );
      if (existingEng) {
        existingEng.findingsCount++;
      } else {
        historyStats[unitName][year].push({
          year,
          engagementName: f.engagement?.name || 'Kỳ kiểm toán',
          findingsCount: 1,
          status: f.engagement?.status || 'Completed',
        });
      }
    });

    const recQuery = this.auditFindingRepository.manager
      .getRepository('Recommendation')
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.departmentEntity', 'departmentEntity')
      .leftJoinAndSelect('rec.auditFinding', 'finding')
      .leftJoinAndSelect('finding.engagement', 'engagement')
      .leftJoinAndSelect('engagement.plan', 'plan')
      .leftJoinAndSelect('engagement.auditedDepartment', 'auditedDepartment');

    if (departmentId) {
      recQuery.andWhere('engagement.legacyAuditedDepartment = :departmentId', {
        departmentId,
      });
    }
    if (year) {
      recQuery.andWhere('plan.year = :year', { year: parseInt(year) });
    }
    if (auditUniverse) {
      recQuery.andWhere('engagement.auditUniverse = :auditUniverse', {
        auditUniverse,
      });
    }

    if (user && !isAdmin) {
      recQuery.andWhere(
        '(engagement.leadAuditorId = :userId OR engagement.teamMembers LIKE :likeUserId OR rec.assignedToId = :userId)',
        { userId: user.userId, likeUserId: `%"userId":${user.userId}%` },
      );
    }
    const recommendations = (await recQuery.getMany()) as any[];

    const correctiveStats: Record<
      string,
      {
        legacyDepartment: string;
        NotStarted: number;
        InProgress: number;
        Completed: number;
        Overdue: number;
        Verified: number;
        total: number;
      }
    > = {};

    recommendations.forEach((r) => {
      const dept =
        r.departmentEntity?.name || r.legacyDepartment || 'Đơn vị khác';
      const status = r.status || 'NotStarted';

      if (!correctiveStats[dept]) {
        correctiveStats[dept] = {
          legacyDepartment: dept,
          NotStarted: 0,
          InProgress: 0,
          Completed: 0,
          Overdue: 0,
          Verified: 0,
          total: 0,
        };
      }
      if (
        [
          'NotStarted',
          'InProgress',
          'Completed',
          'Overdue',
          'Verified',
        ].includes(status)
      ) {
        correctiveStats[dept][
          status as
            | 'NotStarted'
            | 'InProgress'
            | 'Completed'
            | 'Overdue'
            | 'Verified'
        ]++;
      }
      correctiveStats[dept].total++;
    });

    return {
      byUnit: Object.values(unitStats).sort((a, b) => b.total - a.total),
      byProcess: Object.values(processStats).sort((a, b) => b.total - a.total),
      byCorrectiveUnit: Object.values(correctiveStats).sort(
        (a, b) => b.total - a.total,
      ),
      historyByUnit: Object.entries(historyStats).map(([unit, years]) => ({
        unit,
        history: Object.entries(years)
          .map(([year, engs]) => ({
            year: parseInt(year),
            engagements: engs,
          }))
          .sort((a, b) => b.year - a.year),
      })),
      byOperationType: Object.values(operationStats),
      byRegion: Object.values(regionStats).sort((a, b) => b.total - a.total),
      byOfficer: {
        proposers: Object.values(proposerStats)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10),
        appraisers: Object.values(appraiserStats)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10),
        leaders: Object.values(leaderStats)
          .sort((a, b) => b.total - a.total)
          .slice(0, 10),
      },
      byNd340: Object.values(nd340Stats).sort((a, b) => b.count - a.count),
      byNhanSu: Object.values(nhanSuStats).sort((a, b) => b.count - a.count),
    };
  }
}
