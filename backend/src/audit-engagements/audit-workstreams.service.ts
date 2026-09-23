import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditWorkstream } from './entities/audit-workstream.entity';
import { AuditEngagement } from './entities/audit-engagement.entity';
import { ScopeFilterService } from '../utils/scope-filter.service';
import { AuditReviewNotesService } from '../working-papers/audit-review-notes.service';

@Injectable()
export class AuditWorkstreamsService {
  constructor(
    @InjectRepository(AuditWorkstream)
    private readonly workstreamRepo: Repository<AuditWorkstream>,
    @InjectRepository(AuditEngagement)
    private readonly engagementRepo: Repository<AuditEngagement>,
    @Inject(forwardRef(() => AuditReviewNotesService))
    private readonly reviewNotesService: AuditReviewNotesService,
  ) {}

  private isPrivileged(user?: any): boolean {
    return ScopeFilterService.isAdminRole(user?.role);
  }

  private async assertCanManageEngagement(engagementId: number, user?: any): Promise<void> {
    if (this.isPrivileged(user)) return;
    const engagement = await this.engagementRepo.findOne({ where: { id: engagementId } });
    if (!engagement) throw new NotFoundException('Không tìm thấy cuộc kiểm toán');
    if (engagement.leadAuditorId !== user?.userId) {
      throw new ForbiddenException('Chỉ Trưởng đoàn hoặc Quản trị viên mới có quyền thao tác trên phân hành');
    }
  }

  async findWorkstreams(engagementId: number, user?: any): Promise<AuditWorkstream[]> {
    const query = this.workstreamRepo
      .createQueryBuilder('ws')
      .leftJoinAndSelect('ws.reviewNotesList', 'reviewNotesList')
      .where('ws.engagementId = :engagementId', { engagementId })
      .orderBy('ws.createdAt', 'ASC');

    if (user && !this.isPrivileged(user)) {
      const engagement = await this.engagementRepo.findOne({
        where: { id: engagementId },
      });
      if (engagement?.leadAuditorId !== user.userId) {
        query.andWhere(
          '(ws.assignedAuditorId = :userId OR ws.reviewerId = :userId)',
          { userId: user.userId },
        );
      }
    }

    return query.getMany();
  }

  async createWorkstream(engagementId: number, dto: any, user?: any): Promise<AuditWorkstream> {
    await this.assertCanManageEngagement(engagementId, user);
    const entity = this.workstreamRepo.create({
      ...dto,
      engagementId,
      status: dto.status || 'Draft',
    } as AuditWorkstream);
    return this.workstreamRepo.save(entity as AuditWorkstream);
  }

  async updateWorkstream(id: number, dto: any, user?: any): Promise<AuditWorkstream | null> {
    const existing = await this.workstreamRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy phần hành');
    await this.assertCanManageEngagement(existing.engagementId, user);
    await this.workstreamRepo.update(id, dto);
    return this.workstreamRepo.findOne({ where: { id } });
  }

  async deleteWorkstream(id: number, user?: any): Promise<{ success: boolean }> {
    const existing = await this.workstreamRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy phần hành');
    await this.assertCanManageEngagement(existing.engagementId, user);
    await this.workstreamRepo.delete(id);
    return { success: true };
  }

  async completeWorkstream(id: number, user?: any): Promise<AuditWorkstream | null> {
    const ws = await this.workstreamRepo.findOne({ where: { id } });
    if (!ws) throw new NotFoundException('Không tìm thấy phần hành');
    if (!this.isPrivileged(user) && ws.assignedAuditorId !== user?.userId) {
      throw new ForbiddenException('Chỉ KTV phụ trách được đánh dấu hoàn thành phần hành');
    }
    await this.workstreamRepo.update(id, {
      status: 'Completed',
      completedAt: new Date(),
    });
    return this.workstreamRepo.findOne({ where: { id } });
  }

  async reviewWorkstream(
    id: number,
    dto: { status: string; reviewNotes?: string },
    user?: any,
  ): Promise<AuditWorkstream | null> {
    const ws = await this.workstreamRepo.findOne({ where: { id } });
    if (!ws) throw new NotFoundException('Không tìm thấy phần hành');
    await this.assertCanManageEngagement(ws.engagementId, user);

    const isReviewed = dto.status === 'Reviewed';
    if (isReviewed) {
      // IIA 1311 Quality Gate: Không cho phép duyệt phân hành nếu còn Review Note chưa đóng
      await this.reviewNotesService.assertCanSignOff(undefined, id);
    }

    const status = dto.status === 'Rework' ? 'Rework' : 'Reviewed';
    await this.workstreamRepo.update(id, {
      status,
      reviewedAt: status === 'Reviewed' ? new Date() : undefined,
      reviewNotes: dto.reviewNotes || '',
    });
    return this.workstreamRepo.findOne({ where: { id } });
  }
}
