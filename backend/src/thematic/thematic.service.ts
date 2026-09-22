import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { ThematicTheme } from './entities/thematic-theme.entity';
import { CreateThematicThemeDto } from './dto/create-thematic-theme.dto';
import { UpdateThematicThemeDto } from './dto/update-thematic-theme.dto';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { RiskRegister } from '../risk-register/entities/risk-register.entity';

@Injectable()
export class ThematicService implements OnModuleInit {
  private readonly logger = new Logger(ThematicService.name);

  constructor(
    @InjectRepository(ThematicTheme)
    private readonly themeRepo: Repository<ThematicTheme>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(RiskRegister)
    private readonly riskRepo: Repository<RiskRegister>,
  ) {}

  async onModuleInit() {
    await this.seedInitialThemes();
  }

  async findAll(query?: {
    domain?: string;
    priority?: string;
    trajectory?: string;
    status?: string;
    search?: string;
  }): Promise<ThematicTheme[]> {
    const qb = this.themeRepo.createQueryBuilder('theme');

    if (query?.domain) {
      qb.andWhere('theme.riskDomainCode = :domain', { domain: query.domain });
    }
    if (query?.priority) {
      qb.andWhere('theme.themePriority = :priority', {
        priority: query.priority,
      });
    }
    if (query?.trajectory) {
      qb.andWhere('theme.riskTrajectory = :trajectory', {
        trajectory: query.trajectory,
      });
    }
    if (query?.status) {
      qb.andWhere('theme.status = :status', { status: query.status });
    }
    if (query?.search) {
      qb.andWhere(
        '(theme.themeId ILIKE :search OR theme.themeTitle ILIKE :search OR theme.systemicRootCause ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('theme.themePriority', 'ASC').addOrderBy('theme.id', 'ASC');
    return qb.getMany();
  }

  async findOne(id: number): Promise<ThematicTheme> {
    const theme = await this.themeRepo.findOne({ where: { id } });
    if (!theme) {
      throw new NotFoundException(`Thematic theme with ID ${id} not found`);
    }
    return theme;
  }

  async create(dto: CreateThematicThemeDto): Promise<ThematicTheme> {
    const theme = this.themeRepo.create(dto);
    return this.themeRepo.save(theme);
  }

  async update(
    id: number,
    dto: UpdateThematicThemeDto,
  ): Promise<ThematicTheme> {
    const theme = await this.findOne(id);
    Object.assign(theme, dto);
    return this.themeRepo.save(theme);
  }

  async remove(id: number): Promise<void> {
    const theme = await this.findOne(id);
    await this.themeRepo.remove(theme);
  }

  async getDashboard() {
    const themes = await this.themeRepo.find();

    const priorityCounts: Record<string, number> = {
      Critical: 0,
      High: 0,
      Moderate: 0,
      Low: 0,
    };
    const trajectoryCounts: Record<string, number> = {
      Increasing: 0,
      Stable: 0,
      Decreasing: 0,
      Emerging: 0,
    };
    const statusCounts: Record<string, number> = {
      Draft: 0,
      Approved: 0,
      In_Progress: 0,
      Action_Taken: 0,
      Closed: 0,
    };
    const domainCounts: Record<string, number> = {};

    let totalLinkedIssues = 0;
    let totalLinkedRisks = 0;

    for (const t of themes) {
      if (t.themePriority && priorityCounts[t.themePriority] !== undefined) {
        priorityCounts[t.themePriority]++;
      }
      if (
        t.riskTrajectory &&
        trajectoryCounts[t.riskTrajectory] !== undefined
      ) {
        trajectoryCounts[t.riskTrajectory]++;
      }
      if (t.status && statusCounts[t.status] !== undefined) {
        statusCounts[t.status]++;
      }
      if (t.riskDomainCode) {
        domainCounts[t.riskDomainCode] =
          (domainCounts[t.riskDomainCode] || 0) + 1;
      }
      if (Array.isArray(t.issueIds)) {
        totalLinkedIssues += t.issueIds.length;
      }
      if (Array.isArray(t.riskIds)) {
        totalLinkedRisks += t.riskIds.length;
      }
    }

    // Top systemic root causes
    const topCauses = themes
      .filter((t) => t.systemicRootCause)
      .map((t) => ({
        themeId: t.themeId,
        title: t.themeTitle,
        cause: t.systemicRootCause,
        priority: t.themePriority,
        trajectory: t.riskTrajectory,
      }));

    return {
      totalThemes: themes.length,
      priorityCounts,
      trajectoryCounts,
      statusCounts,
      domainCounts,
      totalLinkedIssues,
      totalLinkedRisks,
      topCauses,
    };
  }

  async autoDetectThemes() {
    // Scan findings with repeatCount > 1 or nature = HeThong
    const systemicFindings = await this.findingRepo
      .createQueryBuilder('f')
      .where(
        "f.violationHistory IN ('Lặp lại', 'Hệ thống') OR f.repeatCount > 1 OR f.findingNature = 'HeThong'",
      )
      .take(50)
      .getMany();

    const groupedByCategory: Record<string, AuditFinding[]> = {};
    for (const f of systemicFindings) {
      const cat = f.findingCategory || f.operationType || 'CHUNG';
      if (!groupedByCategory[cat]) groupedByCategory[cat] = [];
      groupedByCategory[cat].push(f);
    }

    const recommendations = Object.entries(groupedByCategory).map(
      ([cat, list]) => ({
        proposedDomain: cat,
        suggestedTitle: `Rủi ro chuyên đề: Lặp lại sai phạm trong nghiệp vụ ${cat}`,
        findingCount: list.length,
        sampleFindingCodes: list
          .slice(0, 5)
          .map((x) => x.findingCode || `FD-${x.id}`),
        commonCauses: list
          .map((x) => x.cause)
          .filter(Boolean)
          .slice(0, 3),
        riskTrajectory: list.length > 3 ? 'Increasing' : 'Emerging',
        proposedPriority: list.some(
          (x) => x.riskLevel === 'Critical' || x.riskLevel === 'High',
        )
          ? 'High'
          : 'Moderate',
      }),
    );

    return {
      totalSystemicFindings: systemicFindings.length,
      clusters: recommendations,
    };
  }

  async seedInitialThemes() {
    const count = await this.themeRepo.count();
    if (count > 0) return;

    this.logger.log(
      'Seeding initial Thematic Risk Themes based on THUCTE standard...',
    );

    const initialThemes: Partial<ThematicTheme>[] = [
      {
        themeId: 'TH-2026-001',
        themeTitle: 'Quản trị phân quyền và kiểm soát truy cập đặc quyền (PAM)',
        riskDomainCode: 'CNTT',
        analysisPeriod: '2024-2026H1',
        affectedPopulation:
          'Trung tâm CNTT, Khối Ngân hàng số và 12 Chi nhánh trọng điểm',
        issueIds: ['ISS-2026-010', 'ISS-2026-014', 'ISS-2026-022'],
        riskIds: ['RISK-CNTT-001', 'RISK-CNTT-005', 'RISK-CNTT-012'],
        riskTrajectory: 'Increasing',
        systemicRootCause:
          'Thiếu giải pháp Privileged Access Management (PAM) tập trung; chưa tự động thu hồi quyền sau khi luân chuyển nhân sự hoặc kết thúc dự án.',
        assuranceGap:
          'Chưa đánh giá toàn diện quyền truy cập ở tầng cơ sở dữ liệu và hạ tầng máy chủ tại các công ty con/đơn vị liên kết.',
        recommendedResponse:
          'CAE ban hành yêu cầu kiểm toán chuyên đề Security Access; Khối CNTT triển khai PAM tích hợp IAM toàn hàng.',
        themePriority: 'Critical',
        approvalRef: 'CAE/BKS-QĐ-08/2026',
        status: 'Approved',
        metadata: { source: 'THUCTE_08_Thematic' },
      },
      {
        themeId: 'TH-2026-002',
        themeTitle: 'Tuân thủ điều kiện giải ngân và kiểm tra sau cho vay',
        riskDomainCode: 'TD_DVKD',
        analysisPeriod: '2025-2026',
        affectedPopulation: 'Toàn bộ mạng lưới ĐVKD (Chi nhánh & PGD loại 1)',
        issueIds: ['ISS-2026-011', 'ISS-2026-018', 'ISS-2026-025'],
        riskIds: ['RISK-TD-0001', 'RISK-TD-0003'],
        riskTrajectory: 'Stable',
        systemicRootCause:
          'Áp lực chỉ tiêu tăng trưởng tín dụng cuối quý dẫn đến việc nới lỏng thu thập chứng từ giải ngân; biên bản kiểm tra sử dụng vốn lập mang tính hình thức.',
        assuranceGap:
          'Chưa có công cụ phân tích tự động hóa đối soát hóa đơn điện tử với Tổng cục Thuế trong hồ sơ giải ngân.',
        recommendedResponse:
          'Tích hợp công cụ e-Invoice validation vào phần mềm LOS; chuyển mẫu kiểm toán chọn mẫu xác minh chéo tại bên thứ ba.',
        themePriority: 'High',
        approvalRef: 'CAE-TB-12/2026',
        status: 'In_Progress',
        metadata: { source: 'THUCTE_08_Thematic' },
      },
      {
        themeId: 'TH-2026-003',
        themeTitle:
          'Kiểm soát an toàn giao dịch tại quầy và kênh Phòng Giao dịch Bưu điện (PGDBĐ)',
        riskDomainCode: 'PGDBD',
        analysisPeriod: '2025-2026H1',
        affectedPopulation:
          'Kênh PGDBĐ tại 45 tỉnh thành và các bưu cục cấp huyện',
        issueIds: ['ISS-2026-030', 'ISS-2026-033'],
        riskIds: ['RISK-PGD-0001', 'RISK-PGD-0004'],
        riskTrajectory: 'Increasing',
        systemicRootCause:
          'Trình độ nhân sự kiêm nhiệm tại một số bưu cục chưa đồng đều; giám sát camera từ xa và hậu kiểm chữ ký điện tử chưa được thực hiện hàng ngày.',
        assuranceGap:
          'Các bưu cục vùng sâu vùng xa có tần suất kiểm toán trực tiếp thấp (> 2 năm chưa kiểm toán).',
        recommendedResponse:
          'Tăng cường giám sát từ xa (Continuous Auditing) trên hệ thống giao dịch thẻ và sổ tiết kiệm bưu điện.',
        themePriority: 'High',
        approvalRef: 'BKS-2026-05',
        status: 'Approved',
        metadata: { source: 'THUCTE_08_Thematic' },
      },
      {
        themeId: 'TH-2026-004',
        themeTitle:
          'Bảo vệ dữ liệu cá nhân khách hàng theo Nghị định 13/2023/NĐ-CP',
        riskDomainCode: 'QTRR',
        analysisPeriod: '2025-2026',
        affectedPopulation:
          'Khối Dịch vụ Ngân hàng Bán lẻ, Khối CNTT, Khối Marketing',
        issueIds: ['ISS-2026-041'],
        riskIds: ['RISK-QTRR-0008'],
        riskTrajectory: 'Emerging',
        systemicRootCause:
          'Quy trình chia sẻ dữ liệu với các đối tác Fintech và đơn vị cung ứng dịch vụ ngoài chưa hoàn thiện thỏa thuận xử lý dữ liệu (DPA).',
        assuranceGap:
          'Chưa tiến hành kiểm toán bảo mật API đối với các kênh Open Banking bên thứ ba.',
        recommendedResponse:
          'Rà soát pháp lý 100% hợp đồng đối tác có tích hợp API; thực hiện Pentest định kỳ quý cho kênh API mở.',
        themePriority: 'Critical',
        approvalRef: 'CAE-ND13-2026',
        status: 'Action_Taken',
        metadata: { source: 'THUCTE_08_Thematic' },
      },
    ];

    await this.themeRepo.save(this.themeRepo.create(initialThemes));
    this.logger.log(
      `Successfully seeded ${initialThemes.length} Thematic Risk Themes.`,
    );
  }
}
