import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingRecord } from './entities/training-record.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class TrainingService implements OnModuleInit {
  private readonly logger = new Logger(TrainingService.name);

  constructor(
    @InjectRepository(TrainingRecord)
    private readonly repo: Repository<TrainingRecord>,
  ) {}

  async onModuleInit() {
    const count = await this.repo.count();
    if (count === 0) {
      const giamdoc = await this.repo.manager.findOne(User, {
        where: { username: 'binhtt12' },
      });
      const ktvCaocap = await this.repo.manager.findOne(User, {
        where: { username: 'chaunm3' },
      });
      const ktvThuong = await this.repo.manager.findOne(User, {
        where: { username: 'oanhdtk4' },
      });

      const currentYear = new Date().getFullYear();
      const defaultRecords: any[] = [];

      if (giamdoc) {
        defaultRecords.push(
          {
            userId: giamdoc.id,
            userName: giamdoc.fullName,
            courseName: 'Chứng chỉ Kiểm toán Nội bộ Quốc tế CIA (Part 1 & 2)',
            provider: 'IIA Global',
            startDate: `${currentYear}-01-15`,
            endDate: `${currentYear}-02-28`,
            cpeHours: 30,
            category: 'Technical',
            year: currentYear,
            status: 'Completed',
            notes: 'Hoàn thành xuất sắc khóa huấn luyện CIA',
          },
          {
            userId: giamdoc.id,
            userName: giamdoc.fullName,
            courseName: 'Quản trị Rủi ro Ngân hàng Thương mại nâng cao',
            provider: 'FTMS Vietnam',
            startDate: `${currentYear}-03-10`,
            endDate: `${currentYear}-03-20`,
            cpeHours: 15,
            category: 'Compliance',
            year: currentYear,
            status: 'Completed',
            notes: 'Tích lũy 15 giờ CPE nghiệp vụ Basel III',
          },
        );
      }

      if (ktvCaocap) {
        defaultRecords.push(
          {
            userId: ktvCaocap.id,
            userName: ktvCaocap.fullName,
            courseName: 'Kỹ năng Kiểm toán Tín dụng và Thẩm định Tài sản',
            provider: 'Hiệp hội Ngân hàng Việt Nam (VNBA)',
            startDate: `${currentYear}-02-05`,
            endDate: `${currentYear}-02-15`,
            cpeHours: 25,
            category: 'Technical',
            year: currentYear,
            status: 'Completed',
            notes: 'Nghiệp vụ tín dụng doanh nghiệp quy mô lớn',
          },
          {
            userId: ktvCaocap.id,
            userName: ktvCaocap.fullName,
            courseName: 'Kỹ năng Giao tiếp & Giải quyết Xung đột Thực địa',
            provider: 'Lực Nhân Edu',
            startDate: `${currentYear}-04-01`,
            endDate: `${currentYear}-04-05`,
            cpeHours: 10,
            category: 'SoftSkills',
            year: currentYear,
            status: 'Completed',
          },
        );
      }

      if (ktvThuong) {
        defaultRecords.push({
          userId: ktvThuong.id,
          userName: ktvThuong.fullName,
          courseName: 'Cơ bản về Phòng chống Rửa tiền AML & KYC',
          provider: 'Pháp chế LPBank',
          startDate: `${currentYear}-01-20`,
          endDate: `${currentYear}-01-25`,
          cpeHours: 12,
          category: 'Compliance',
          year: currentYear,
          status: 'Completed',
        });
      }

      if (defaultRecords.length > 0) {
        await this.repo.save(this.repo.create(defaultRecords));
        this.logger.log(
          `✅ Đã seed ${defaultRecords.length} hồ sơ đào tạo CPE thành công!`,
        );
      }
    }
  }

  create(dto: Partial<TrainingRecord>) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  findAll(query?: { userId?: number; year?: number }) {
    const where: any = {};
    if (query?.userId) where.userId = query.userId;
    if (query?.year) where.year = query.year;
    return this.repo.find({ where, order: { startDate: 'DESC' } });
  }

  findOne(id: number) {
    return this.repo.findOneBy({ id });
  }

  async getCpeSummary(year?: number) {
    const targetYear = year || new Date().getFullYear();
    const records = await this.repo.find({
      where: { year: targetYear, status: 'Completed' },
    });

    // Group by userId
    const byUser: Record<
      number,
      {
        userName: string;
        totalCpe: number;
        totalEthicsHours: number;
        courses: number;
        certifications: string[];
      }
    > = {};
    records.forEach((r) => {
      if (!byUser[r.userId]) {
        byUser[r.userId] = {
          userName: r.userName || `User ${r.userId}`,
          totalCpe: 0,
          totalEthicsHours: 0,
          courses: 0,
          certifications: [],
        };
      }
      byUser[r.userId].totalCpe += Number(r.cpeHours || 0);
      byUser[r.userId].totalEthicsHours += Number(r.ethicsHours || 0);
      byUser[r.userId].courses += 1;
      if (
        r.certificationType &&
        r.certificationType !== 'None' &&
        !byUser[r.userId].certifications.includes(r.certificationType)
      ) {
        byUser[r.userId].certifications.push(r.certificationType);
      }
    });

    const summary = Object.entries(byUser).map(([userId, data]) => ({
      userId: +userId,
      ...data,
      target: 40,
      ethicsTarget: 2,
      remaining: Math.max(0, 40 - data.totalCpe),
      ethicsRemaining: Math.max(0, 2 - data.totalEthicsHours),
      isCompliant: data.totalCpe >= 40,
      isEthicsCompliant: data.totalEthicsHours >= 2,
    }));

    return {
      year: targetYear,
      summary,
      totalCompliant: summary.filter((s) => s.isCompliant).length,
      totalNonCompliant: summary.filter((s) => !s.isCompliant).length,
      totalEthicsCompliant: summary.filter((s) => s.isEthicsCompliant).length,
    };
  }

  async verifyRecord(id: number, user: any): Promise<TrainingRecord> {
    const record = await this.findOne(id);
    if (!record) throw new Error(`Training record #${id} not found`);
    record.isVerified = true;
    record.verifiedById = user?.userId || user?.id;
    record.verifiedByName = user?.fullName || user?.username;
    record.verifiedAt = new Date();
    return this.repo.save(record);
  }

  update(id: number, dto: Partial<TrainingRecord>) {
    return this.repo.update(id, dto);
  }

  remove(id: number) {
    return this.repo.delete(id);
  }
}
