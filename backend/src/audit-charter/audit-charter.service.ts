import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditCharter } from './entities/audit-charter.entity';

@Injectable()
export class AuditCharterService {
  constructor(
    @InjectRepository(AuditCharter)
    private readonly charterRepo: Repository<AuditCharter>,
  ) {}

  async findAll(): Promise<AuditCharter[]> {
    return this.getCharters();
  }

  async getCharters(): Promise<AuditCharter[]> {
    const list = await this.charterRepo.find({
      order: { createdAt: 'DESC' },
    });

    if (list.length === 0) {
      const defaultCharter = this.charterRepo.create({
        version: 'v2026.1',
        title:
          'Điều lệ Kiểm toán Nội bộ Ngân hàng Thương mại Cổ phần Lộc Phát Việt Nam (LPBank)',
        content:
          'Quy định về Mục đích, Quyền hạn và Trách nhiệm của Khối Kiểm toán Nội bộ theo chuẩn mực quốc tế IIA Global Internal Audit Standards 2024 và Thông tư 13/2018/TT-NHNN.',
        purpose:
          'Quy định về Mục đích, Quyền hạn và Trách nhiệm của Khối Kiểm toán Nội bộ theo chuẩn mực quốc tế IIA Global Internal Audit Standards 2024 và Thông tư 13/2018/TT-NHNN.',
        authority:
          'Khối KTNB có quyền tiếp cận đầy đủ, không giới hạn đối với tất cả hồ sơ, tài sản, nhân sự và các hệ thống CNTT của LPBank.',
        responsibility:
          'Thực hiện kiểm toán độc lập, khách quan, tư vấn và đánh giá tính hiệu lực của hệ thống kiểm soát nội bộ và quản trị rủi ro.',
        status: 'Approved',
        approvedBy: 'Ban Kiểm Soát',
        approvedByName: 'Ban Kiểm Soát',
        approvalBody: 'BKS',
        approvedAt: new Date('2026-01-15'),
      });
      await this.charterRepo.save(defaultCharter);
      return [defaultCharter];
    }

    return list;
  }

  async findOne(id: number): Promise<AuditCharter> {
    const charter = await this.charterRepo.findOne({ where: { id } });
    if (!charter) throw new NotFoundException(`Charter #${id} not found`);
    return charter;
  }

  async findCurrentApproved(): Promise<AuditCharter | null> {
    return this.charterRepo.findOne({
      where: { status: 'Approved' },
      order: { createdAt: 'DESC' },
    });
  }

  async createCharter(data: Partial<AuditCharter>): Promise<AuditCharter> {
    const content = data.content || data.purpose || '';
    const purpose = data.purpose || data.content || '';
    const version = String(data.version || '1');

    const charter = this.charterRepo.create({
      ...data,
      content,
      purpose,
      version,
      status: data.status || 'Draft',
    });
    return this.charterRepo.save(charter);
  }

  async create(dto: Partial<AuditCharter>, user: any): Promise<AuditCharter> {
    const version = String(dto.version || '1');
    const content = dto.content || dto.purpose || '';
    const purpose = dto.purpose || dto.content || '';

    const charter = this.charterRepo.create({
      ...dto,
      version,
      content,
      purpose,
      status: 'Draft',
      draftedById: user?.userId,
      draftedByName: user?.fullName || user?.username,
      revisionHistory: [
        {
          version,
          action: 'DRAFT',
          actorId: user?.userId,
          actorName: user?.fullName || user?.username || '',
          role: user?.role || '',
          timestamp: new Date().toISOString(),
          notes: 'Khởi tạo Điều lệ KTNB',
        },
      ],
    });
    return this.charterRepo.save(charter);
  }

  async updateCharterStatus(
    id: number,
    status: string,
    username: string,
  ): Promise<AuditCharter> {
    const charter = await this.findOne(id);
    charter.status = status;
    if (status === 'Approved') {
      charter.approvedBy = username;
      charter.approvedByName = username;
      charter.approvedAt = new Date();
    }
    return this.charterRepo.save(charter);
  }

  async update(
    id: number,
    dto: Partial<AuditCharter>,
  ): Promise<AuditCharter> {
    const charter = await this.findOne(id);
    if (charter.status === 'Approved') {
      throw new BadRequestException(
        'Cannot edit an approved charter. Create a new version instead.',
      );
    }
    if (dto.content && !dto.purpose) {
      dto.purpose = dto.content;
    } else if (dto.purpose && !dto.content) {
      dto.content = dto.purpose;
    }
    Object.assign(charter, dto);
    return this.charterRepo.save(charter);
  }

  async submitForApproval(id: number, user: any): Promise<AuditCharter> {
    const charter = await this.findOne(id);
    if (charter.status !== 'Draft') {
      throw new BadRequestException(
        `Charter must be in Draft status to submit. Current: ${charter.status}`,
      );
    }
    charter.status = 'PendingApproval';
    charter.revisionHistory = [
      ...(charter.revisionHistory || []),
      {
        version: charter.version,
        action: 'SUBMIT',
        actorId: user?.userId,
        actorName: user?.fullName || user?.username || '',
        role: user?.role || '',
        timestamp: new Date().toISOString(),
        notes: 'Trình phê duyệt Điều lệ KTNB',
      },
    ];
    return this.charterRepo.save(charter);
  }

  async approve(id: number, user: any, notes?: string): Promise<AuditCharter> {
    const charter = await this.findOne(id);
    if (charter.status !== 'PendingApproval') {
      throw new BadRequestException(
        `Charter must be PendingApproval to approve. Current: ${charter.status}`,
      );
    }

    // Supersede any previously approved charters
    await this.charterRepo.update(
      { status: 'Approved' },
      { status: 'Superseded' },
    );

    charter.status = 'Approved';
    charter.approvedById = user?.userId;
    charter.approvedByName = user?.fullName || user?.username;
    charter.approvedBy = user?.fullName || user?.username;
    charter.approvedAt = new Date();
    charter.approvalNotes = notes || '';
    charter.revisionHistory = [
      ...(charter.revisionHistory || []),
      {
        version: charter.version,
        action: 'APPROVE',
        actorId: user?.userId,
        actorName: user?.fullName || user?.username || '',
        role: user?.role || '',
        timestamp: new Date().toISOString(),
        notes: notes || 'Phê duyệt Điều lệ KTNB',
      },
    ];
    return this.charterRepo.save(charter);
  }

  async reject(id: number, user: any, notes: string): Promise<AuditCharter> {
    const charter = await this.findOne(id);
    if (charter.status !== 'PendingApproval') {
      throw new BadRequestException(
        `Charter must be PendingApproval to reject. Current: ${charter.status}`,
      );
    }
    charter.status = 'Draft';
    charter.revisionHistory = [
      ...(charter.revisionHistory || []),
      {
        version: charter.version,
        action: 'REJECT',
        actorId: user?.userId,
        actorName: user?.fullName || user?.username || '',
        role: user?.role || '',
        timestamp: new Date().toISOString(),
        notes: notes || 'Từ chối phê duyệt',
      },
    ];
    return this.charterRepo.save(charter);
  }

  async createNewVersion(
    sourceId: number,
    user: any,
  ): Promise<AuditCharter> {
    const source = await this.findOne(sourceId);
    const numVersion = parseInt(source.version.replace(/[^0-9]/g, ''), 10);
    const newVersion = !isNaN(numVersion) ? String(numVersion + 1) : `${source.version}.1`;

    const newCharter = this.charterRepo.create({
      title: source.title,
      version: newVersion,
      content: source.content || source.purpose,
      purpose: source.purpose || source.content,
      authority: source.authority,
      responsibility: source.responsibility,
      scope: source.scope,
      reportingLine: source.reportingLine,
      independenceStatement: source.independenceStatement,
      standardsConformance: source.standardsConformance,
      status: 'Draft',
      draftedById: user?.userId,
      draftedByName: user?.fullName || user?.username,
      revisionHistory: [
        {
          version: newVersion,
          action: 'DRAFT',
          actorId: user?.userId,
          actorName: user?.fullName || user?.username || '',
          role: user?.role || '',
          timestamp: new Date().toISOString(),
          notes: `Tạo phiên bản mới v${newVersion} từ v${source.version}`,
        },
      ],
    });
    return this.charterRepo.save(newCharter);
  }

  async remove(id: number): Promise<void> {
    const charter = await this.findOne(id);
    if (charter.status === 'Approved') {
      throw new BadRequestException('Cannot delete an approved charter');
    }
    await this.charterRepo.remove(charter);
  }
}
