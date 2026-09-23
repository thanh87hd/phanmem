import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MasterDataChangeRequest,
  ChangeCategory,
  ChangeType,
  ChangeRequestStatus,
} from './entities/master-data-change-request.entity';
import { Department } from '../departments/entities/department.entity';
import { DepartmentHistory } from '../departments/entities/department-history.entity';
import { DefectCode, DefectDimension } from '../ai/entities/defect-code.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';

@Injectable()
export class MasterDataChangeService {
  private readonly logger = new Logger(MasterDataChangeService.name);

  constructor(
    @InjectRepository(MasterDataChangeRequest)
    private readonly changeRepo: Repository<MasterDataChangeRequest>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(DepartmentHistory)
    private readonly deptHistoryRepo: Repository<DepartmentHistory>,
    @InjectRepository(DefectCode)
    private readonly defectRepo: Repository<DefectCode>,
    @InjectRepository(AuditUniverse)
    private readonly universeRepo: Repository<AuditUniverse>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
  ) {}

  async findAll(filters?: {
    category?: ChangeCategory;
    status?: ChangeRequestStatus;
    isMidYearAddition?: boolean;
  }): Promise<MasterDataChangeRequest[]> {
    const query = this.changeRepo
      .createQueryBuilder('cr')
      .orderBy('cr.createdAt', 'DESC');

    if (filters?.category) {
      query.andWhere('cr.category = :category', { category: filters.category });
    }
    if (filters?.status) {
      query.andWhere('cr.status = :status', { status: filters.status });
    }
    if (filters?.isMidYearAddition !== undefined) {
      query.andWhere('cr.isMidYearAddition = :isMidYearAddition', {
        isMidYearAddition: filters.isMidYearAddition,
      });
    }

    return await query.getMany();
  }

  async findOne(id: number): Promise<MasterDataChangeRequest> {
    const request = await this.changeRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Yêu cầu thay đổi #${id} không tồn tại`);
    }
    return request;
  }

  async create(
    payload: {
      category: ChangeCategory;
      changeType: ChangeType;
      targetId?: number;
      targetCode?: string;
      title: string;
      reason?: string;
      proposedData: Record<string, any>;
      currentData?: Record<string, any>;
      isMidYearAddition?: boolean;
      riskImpactLevel?: number;
    },
    user?: any,
  ): Promise<MasterDataChangeRequest> {
    const request = this.changeRepo.create({
      ...payload,
      status: ChangeRequestStatus.PENDING_L1,
      requestedBy: user?.fullName || user?.username || 'KTV',
      requestedByUserId: user?.userId || user?.id,
      isMidYearAddition: payload.isMidYearAddition ?? true,
      riskImpactLevel: payload.riskImpactLevel ?? 2,
    });

    return await this.changeRepo.save(request);
  }

  /**
   * Cấp 1: Lãnh đạo Phòng soát xét và chuyển lên Lãnh đạo Khối
   */
  async approveL1(
    id: number,
    notes: string,
    user?: any,
  ): Promise<MasterDataChangeRequest> {
    const request = await this.findOne(id);
    if (request.status !== ChangeRequestStatus.PENDING_L1) {
      throw new BadRequestException(
        'Yêu cầu này không ở trạng thái chờ Phòng soát xét',
      );
    }

    request.status = ChangeRequestStatus.PENDING_L2;
    request.reviewerL1Name = user?.fullName || user?.username || 'Trưởng Phòng';
    request.reviewerL1Notes = notes;
    request.reviewedL1At = new Date();

    return await this.changeRepo.save(request);
  }

  /**
   * Cấp 2: Lãnh đạo Khối / Trưởng Ban KTNB phê duyệt chính thức & tự động thực thi thay đổi vào hệ thống
   */
  async approveL2(
    id: number,
    notes: string,
    user?: any,
  ): Promise<MasterDataChangeRequest> {
    const request = await this.findOne(id);
    if (request.status !== ChangeRequestStatus.PENDING_L2) {
      throw new BadRequestException(
        'Yêu cầu này chưa được Lãnh đạo Phòng soát xét duyệt cấp 1',
      );
    }

    // 1. Thực thi thay đổi vào bảng dữ liệu tương ứng
    await this.applyChangeToMasterData(request);

    // 2. Tính điểm thưởng BSC-KPI nếu nhận diện rủi ro/lỗi mới phát sinh trong năm
    if (request.isMidYearAddition) {
      request.kpiBonusPoints =
        request.riskImpactLevel === 3
          ? 5.0
          : request.riskImpactLevel === 2
            ? 3.0
            : 1.0;
    }

    request.status = ChangeRequestStatus.APPROVED;
    request.approverL2Name =
      user?.fullName || user?.username || 'Lãnh đạo Khối';
    request.approverL2Notes = notes;
    request.approvedL2At = new Date();

    return await this.changeRepo.save(request);
  }

  async reject(
    id: number,
    reason: string,
    user?: any,
  ): Promise<MasterDataChangeRequest> {
    const request = await this.findOne(id);
    request.status = ChangeRequestStatus.REJECTED;
    request.approverL2Notes = reason;
    return await this.changeRepo.save(request);
  }

  /**
   * Tự động áp dụng dữ liệu thay đổi vào bảng đích tương ứng sau khi Lãnh đạo Khối duyệt,
   * đồng thời lưu Snapshot lịch sử và kế thừa rủi ro / finding sang đơn vị mới.
   */
  private async applyChangeToMasterData(request: MasterDataChangeRequest) {
    const { category, changeType, proposedData, currentData, targetId } =
      request;

    if (category === ChangeCategory.ORGANIZATION) {
      const currentYear = new Date().getFullYear();

      if (changeType === ChangeType.ADD) {
        const dept = this.deptRepo.create(proposedData);
        const savedDept = await this.deptRepo.save(dept);

        // 1. Tạo Snapshot lịch sử thành lập mới
        await this.deptHistoryRepo.save(
          this.deptHistoryRepo.create({
            departmentId: savedDept.id,
            departmentCode: savedDept.code,
            departmentName: savedDept.name,
            periodYear: currentYear,
            unitType: savedDept.unitType || 'ChiNhanh',
            changeType: 'ThanhLapMoi',
            notes:
              request.reason || `Thành lập mới theo Yêu cầu #${request.id}`,
            decisionNumber:
              proposedData.decisionNumber ||
              `QĐ-${currentYear}/${savedDept.code}`,
            effectiveDate: new Date().toISOString().split('T')[0],
          }),
        );

        // 2. Tạo Audit Universe mặc định cho đơn vị mới
        const universe = this.universeRepo.create({
          name: `Kiểm toán ${savedDept.name}`,
          department: savedDept.name,
          departmentCode: savedDept.code,
          auditCategory: savedDept.unitType || 'ChiNhanh',
          nextAuditYear: currentYear,
          status: 'Active',
        });
        await this.universeRepo.save(universe);
      } else if (
        changeType === ChangeType.UPDATE ||
        changeType === ChangeType.RESTRUCTURE
      ) {
        if (targetId) {
          const oldDept = await this.deptRepo.findOne({
            where: { id: targetId },
          });

          // 1. Lưu Snapshot lịch sử trước khi thay đổi
          if (oldDept) {
            await this.deptHistoryRepo.save(
              this.deptHistoryRepo.create({
                departmentId: oldDept.id,
                departmentCode: oldDept.code,
                departmentName: oldDept.name,
                periodYear: currentYear,
                unitType: oldDept.unitType,
                previousUnitType: oldDept.unitType,
                changeType:
                  changeType === ChangeType.RESTRUCTURE
                    ? 'NangCap'
                    : 'ChuyenDoiMoHinh',
                notes: `Trước thay đổi: [${oldDept.code}] ${oldDept.name}. Lý do: ${request.reason || ''}`,
                decisionNumber:
                  proposedData.decisionNumber ||
                  `QĐ-${currentYear}/${oldDept.code}`,
                effectiveDate: new Date().toISOString().split('T')[0],
              }),
            );
          }

          // 2. Cập nhật dữ liệu mới vào Department
          await this.deptRepo.update(targetId, proposedData);

          // 3. Tự động chuyển giao điểm rủi ro & chuyển giao các Finding chưa đóng sang Universe mới
          if (oldDept) {
            const oldUniverse = await this.universeRepo.findOne({
              where: [
                { departmentCode: oldDept.code },
                { department: oldDept.name },
              ],
            });

            if (oldUniverse) {
              const newDeptCode = proposedData.code || oldDept.code;
              const newDeptName = proposedData.name || oldDept.name;

              oldUniverse.name = `Kiểm toán ${newDeptName}`;
              oldUniverse.departmentCode = newDeptCode;
              oldUniverse.department = newDeptName;
              oldUniverse.auditCategory =
                proposedData.unitType || oldDept.unitType;
              oldUniverse.transferredFromDeptCode = oldDept.code;
              oldUniverse.transferNotes = `Kế thừa rủi ro và lịch sử sai phạm từ đơn vị cũ: [${oldDept.code}] ${oldDept.name}`;

              await this.universeRepo.save(oldUniverse);

              // Cập nhật legacyBusinessProcess cho các phát hiện chưa đóng
              await this.findingRepo
                .createQueryBuilder()
                .update(AuditFinding)
                .set({
                  legacyBusinessProcess: `${newDeptName} (Kế thừa từ ${oldDept.name})`,
                })
                .where('businessProcessId = :bpId', { bpId: oldUniverse.id })
                .execute();
            }
          }
        }
      } else if (changeType === ChangeType.DEACTIVATE) {
        if (targetId) {
          const oldDept = await this.deptRepo.findOne({
            where: { id: targetId },
          });
          if (oldDept) {
            // Lưu Snapshot đóng đơn vị
            await this.deptHistoryRepo.save(
              this.deptHistoryRepo.create({
                departmentId: oldDept.id,
                departmentCode: oldDept.code,
                departmentName: oldDept.name,
                periodYear: currentYear,
                unitType: oldDept.unitType,
                changeType: 'DongCua',
                notes: request.reason || `Đóng đơn vị theo Quyết định`,
                decisionNumber:
                  proposedData?.decisionNumber || `QĐ-DONG-${oldDept.code}`,
                effectiveDate: new Date().toISOString().split('T')[0],
              }),
            );
          }
          await this.deptRepo.update(targetId, { status: 'Inactive' });
        }
      }
    } else if (category === ChangeCategory.DEFECT) {
      if (changeType === ChangeType.ADD) {
        const defect = this.defectRepo.create({
          ...proposedData,
          dimension: proposedData.dimension || DefectDimension.INTERNAL,
          version: '2.0-MIDYEAR',
        });
        await this.defectRepo.save(defect);
      } else if (changeType === ChangeType.UPDATE && targetId) {
        await this.defectRepo.update(targetId, proposedData);
      }
    } else if (category === ChangeCategory.RISK) {
      if (changeType === ChangeType.ADD) {
        const universe = this.universeRepo.create(proposedData);
        await this.universeRepo.save(universe);
      } else if (changeType === ChangeType.UPDATE && targetId) {
        await this.universeRepo.update(targetId, proposedData);
      }
    }
  }

  /**
   * Thống kê các Rủi ro mới phát sinh trong năm để báo cáo BSC-KPI
   */
  async getEmergingRisksSummary() {
    const emergingList = await this.changeRepo.find({
      where: { isMidYearAddition: true },
      order: { createdAt: 'DESC' },
    });

    const approvedCount = emergingList.filter(
      (e) => e.status === ChangeRequestStatus.APPROVED,
    ).length;
    const totalBonus = emergingList
      .filter((e) => e.status === ChangeRequestStatus.APPROVED)
      .reduce((sum, e) => sum + (e.kpiBonusPoints || 0), 0);

    return {
      totalEmergingRequests: emergingList.length,
      approvedEmergingCount: approvedCount,
      totalKpiBonusEarned: totalBonus,
      items: emergingList,
    };
  }
}
