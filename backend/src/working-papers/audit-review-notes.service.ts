import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuditReviewNote,
  ReviewNoteStatus,
} from './entities/audit-review-note.entity';
import { CreateReviewNoteDto } from './dto/create-review-note.dto';
import { RespondReviewNoteDto } from './dto/respond-review-note.dto';
import type { AuthUserContext } from './dto/working-paper-types';

@Injectable()
export class AuditReviewNotesService {
  constructor(
    @InjectRepository(AuditReviewNote)
    private readonly repo: Repository<AuditReviewNote>,
  ) {}

  async findAll(query: {
    engagementId?: number;
    workingPaperId?: number;
    workstreamId?: number;
    status?: string;
  }) {
    const qb = this.repo.createQueryBuilder('rn')
      .leftJoinAndSelect('rn.reviewer', 'reviewer')
      .leftJoinAndSelect('rn.auditor', 'auditor')
      .leftJoinAndSelect('rn.closedBy', 'closedBy')
      .orderBy('rn.createdAt', 'ASC');

    if (query.engagementId) {
      qb.andWhere('rn.engagementId = :engagementId', { engagementId: query.engagementId });
    }
    if (query.workingPaperId) {
      qb.andWhere('rn.workingPaperId = :workingPaperId', { workingPaperId: query.workingPaperId });
    }
    if (query.workstreamId) {
      qb.andWhere('rn.workstreamId = :workstreamId', { workstreamId: query.workstreamId });
    }
    if (query.status && query.status !== 'ALL') {
      qb.andWhere('rn.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<AuditReviewNote> {
    const note = await this.repo.findOne({
      where: { id },
      relations: ['reviewer', 'auditor', 'closedBy'],
    });
    if (!note) {
      throw new NotFoundException(`Không tìm thấy điểm soát xét #${id}`);
    }
    return note;
  }

  async create(dto: CreateReviewNoteDto, user?: AuthUserContext): Promise<AuditReviewNote> {
    const reviewerId = user?.id || user?.userId;
    const reviewerName = user?.fullName || user?.username || 'Người soát xét';

    let seq = dto.reviewSeq;
    if (!seq) {
      const count = await this.repo.count({
        where: { engagementId: dto.engagementId },
      });
      seq = `RN-${String(count + 1).padStart(2, '0')}`;
    }

    const entity = this.repo.create({
      engagementId: dto.engagementId,
      workingPaperId: dto.workingPaperId,
      workstreamId: dto.workstreamId,
      reviewSeq: seq,
      note: dto.note,
      reviewerId,
      reviewerName,
      status: ReviewNoteStatus.OPEN,
    });

    return this.repo.save(entity);
  }

  async respond(
    id: number,
    dto: RespondReviewNoteDto,
    user?: AuthUserContext,
  ): Promise<AuditReviewNote> {
    const note = await this.findOne(id);
    if (note.status === ReviewNoteStatus.CLOSED) {
      throw new BadRequestException('Điểm soát xét đã được đóng, không thể giải trình thêm.');
    }

    const auditorId = user?.id || user?.userId;
    const auditorName = user?.fullName || user?.username || 'Kiểm toán viên';

    note.auditorResponse = dto.response;
    note.auditorId = auditorId ?? null;
    note.auditorName = auditorName;
    note.responseAt = new Date();
    note.status = ReviewNoteStatus.RESOLVED;

    return this.repo.save(note);
  }

  async close(id: number, user?: AuthUserContext): Promise<AuditReviewNote> {
    const note = await this.findOne(id);
    const closedById = user?.id || user?.userId;

    note.status = ReviewNoteStatus.CLOSED;
    note.closedAt = new Date();
    note.closedById = closedById ?? null;

    return this.repo.save(note);
  }

  /**
   * IIA 1311 Quality Gate: Không cho phép phê duyệt nếu còn Review Note chưa đóng.
   */
  async assertCanSignOff(wpId?: number, workstreamId?: number): Promise<void> {
    if (!wpId && !workstreamId) return;

    const qb = this.repo.createQueryBuilder('rn')
      .where('rn.status != :closedStatus', { closedStatus: ReviewNoteStatus.CLOSED });

    if (wpId) {
      qb.andWhere('rn.workingPaperId = :wpId', { wpId });
    }
    if (workstreamId) {
      qb.andWhere('rn.workstreamId = :workstreamId', { workstreamId });
    }

    const openNotes = await qb.getMany();
    if (openNotes.length > 0) {
      const openSeqs = openNotes.map((n) => n.reviewSeq || `#${n.id}`).join(', ');
      throw new BadRequestException(
        `Không thể phê duyệt (Sign-off) vì còn ${openNotes.length} điểm soát xét chưa được đóng: [${openSeqs}]. Theo Chuẩn mực IIA 1311 (MB-10), toàn bộ điểm soát xét phải được Người soát xét xác nhận ĐÓNG (CLOSED) trước khi hoàn tất hồ sơ.`,
      );
    }
  }
}
