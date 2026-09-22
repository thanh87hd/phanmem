import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditProcess } from './entities/audit-process.entity';
import { ProcessActivity } from './entities/process-activity.entity';
import { RaciAssignment } from './entities/raci-assignment.entity';

export interface RaciQaViolation {
  activityId: string;
  activityName: string;
  ruleCode: string;
  severity: 'Critical' | 'Warning';
  message: string;
}

@Injectable()
export class RaciGovernanceService {
  constructor(
    @InjectRepository(AuditProcess)
    private readonly processRepo: Repository<AuditProcess>,
    @InjectRepository(ProcessActivity)
    private readonly activityRepo: Repository<ProcessActivity>,
    @InjectRepository(RaciAssignment)
    private readonly raciRepo: Repository<RaciAssignment>,
  ) {}

  async getProcesses(): Promise<AuditProcess[]> {
    return await this.processRepo.find({ order: { processId: 'ASC' } });
  }

  async getActivities(processId: string): Promise<ProcessActivity[]> {
    return await this.activityRepo.find({
      where: { processId },
      order: { stepNo: 'ASC' },
    });
  }

  async getRaciMatrix(processId: string) {
    const process = await this.processRepo.findOne({ where: { processId } });
    if (!process) throw new NotFoundException(`Process ${processId} not found`);

    const activities = await this.activityRepo.find({
      where: { processId },
      order: { stepNo: 'ASC' },
    });

    const assignments = await this.raciRepo.find({ where: { processId } });

    // Distinct roles
    const roleMap = new Map<string, string>();
    assignments.forEach((a) => roleMap.set(a.roleId, a.roleName));
    const roles = Array.from(roleMap.entries()).map(([roleId, roleName]) => ({
      roleId,
      roleName,
    }));

    // Grid
    const matrix = activities.map((act) => {
      const rowAssignments = assignments.filter(
        (a) => a.activityId === act.activityId,
      );
      const assignmentByRole: Record<string, string> = {};
      rowAssignments.forEach((ra) => {
        assignmentByRole[ra.roleId] = ra.raciCode;
      });

      return {
        activityId: act.activityId,
        stepNo: act.stepNo,
        activityName: act.activityName,
        activityType: act.activityType,
        decisionAuthority: act.decisionAuthority,
        sla: act.sla,
        assignments: assignmentByRole,
      };
    });

    return {
      process,
      roles,
      matrix,
    };
  }

  async runQaRaciChecks(processId: string) {
    const activities = await this.activityRepo.find({ where: { processId } });
    const assignments = await this.raciRepo.find({ where: { processId } });

    const violations: RaciQaViolation[] = [];

    for (const act of activities) {
      const actAssignments = assignments.filter(
        (a) => a.activityId === act.activityId,
      );
      const aRoles = actAssignments.filter((a) => a.raciCode === 'A');
      const rRoles = actAssignments.filter((a) => a.raciCode === 'R');

      // Rule 1: Single Accountability (Duy nhất 1 'A')
      if (aRoles.length === 0) {
        violations.push({
          activityId: act.activityId,
          activityName: act.activityName,
          ruleCode: 'QA-RACI-01',
          severity: 'Critical',
          message:
            'Hoạt động không có người chịu trách nhiệm chính (A - Accountable).',
        });
      } else if (aRoles.length > 1) {
        violations.push({
          activityId: act.activityId,
          activityName: act.activityName,
          ruleCode: 'QA-RACI-01',
          severity: 'Warning',
          message: `Hoạt động có nhiều hơn 1 người chịu trách nhiệm chính (${aRoles.map((r) => r.roleName).join(', ')}). Cần duy nhất 1 'A'.`,
        });
      }

      // Rule 2: Active Responsibility (Ít nhất 1 'R')
      if (rRoles.length === 0) {
        violations.push({
          activityId: act.activityId,
          activityName: act.activityName,
          ruleCode: 'QA-RACI-02',
          severity: 'Critical',
          message: 'Hoạt động không có người thực thi (R - Responsible).',
        });
      }

      // Rule 3: Segregation of Duties (SoD Check)
      // If a single role is both 'R' and 'A' on approval activities
      if (act.activityType === 'Approval') {
        const sameRole = actAssignments.find(
          (a1) =>
            a1.raciCode === 'R' &&
            actAssignments.some(
              (a2) => a2.roleId === a1.roleId && a2.raciCode === 'A',
            ),
        );
        if (sameRole) {
          violations.push({
            activityId: act.activityId,
            activityName: act.activityName,
            ruleCode: 'QA-RACI-03',
            severity: 'Critical',
            message: `Xung đột phân tách trách nhiệm (SoD): Vai trò [${sameRole.roleName}] vừa thực hiện (R) vừa phê duyệt (A) trên bước phê duyệt.`,
          });
        }
      }
    }

    const totalActivities = activities.length;
    const compliantCount =
      totalActivities - new Set(violations.map((v) => v.activityId)).size;
    const complianceRate =
      totalActivities > 0
        ? Math.round((compliantCount / totalActivities) * 100)
        : 100;

    return {
      processId,
      totalActivities,
      compliantCount,
      complianceRate,
      violationsCount: violations.length,
      violations,
      status:
        violations.length === 0
          ? 'Compliant'
          : violations.some((v) => v.severity === 'Critical')
            ? 'Non-Compliant'
            : 'Warning',
    };
  }
}
