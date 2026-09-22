import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkingPaperTemplate } from './entities/working-paper-template.entity';
import { CreateWorkingPaperTemplateDto } from './dto/create-working-paper-template.dto';

const DEFAULT_TEMPLATES = [
  {
    name: 'Rà soát khoản vay KHCN',
    category: 'KHCN',
    isDefault: true,
    templateContent: {
      description:
        'Biểu mẫu rà soát hồ sơ và quy trình cấp tín dụng Khách hàng cá nhân',
    },
    fields: [
      {
        name: 'cifOrAccount',
        label: 'Số CIF / Số tài khoản',
        type: 'text',
        required: true,
      },
      {
        name: 'borrowerName',
        label: 'Tên khách hàng vay',
        type: 'text',
        required: true,
      },
      {
        name: 'loanAmount',
        label: 'Số dư nợ (VND)',
        type: 'number',
        required: true,
      },
      {
        name: 'collateralValue',
        label: 'Giá trị TSBD (VND)',
        type: 'number',
        required: false,
      },
      {
        name: 'purposeVerification',
        label: 'Kiểm tra mục đích sử dụng vốn vay',
        type: 'select',
        options: ['Đạt', 'Không đạt', 'Có lưu ý'],
        required: true,
      },
      {
        name: 'creditApprovalValidity',
        label: 'Phê duyệt tín dụng đúng thẩm quyền',
        type: 'select',
        options: ['Đạt', 'Không đạt'],
        required: true,
      },
      {
        name: 'postDisbursementMonitor',
        label: 'Kiểm tra sau giải ngân định kỳ',
        type: 'select',
        options: ['Đúng hạn', 'Trễ hạn', 'Không thực hiện'],
        required: true,
      },
      {
        name: 'generalCompliance',
        label: 'Đánh giá tính tuân thủ chung',
        type: 'textarea',
        required: false,
      },
    ],
  },
  {
    name: 'Rà soát khoản vay KHDN',
    category: 'KHDN',
    isDefault: true,
    templateContent: {
      description:
        'Biểu mẫu rà soát hồ sơ và quy trình cấp tín dụng Khách hàng doanh nghiệp',
    },
    fields: [
      {
        name: 'cifOrAccount',
        label: 'Số CIF / Số tài khoản',
        type: 'text',
        required: true,
      },
      {
        name: 'corporateName',
        label: 'Tên doanh nghiệp',
        type: 'text',
        required: true,
      },
      {
        name: 'loanAmount',
        label: 'Số dư nợ (VND)',
        type: 'number',
        required: true,
      },
      {
        name: 'financialAnalysis',
        label: 'Đánh giá báo cáo tài chính & dòng tiền',
        type: 'select',
        options: ['Tốt', 'Trung bình', 'Yếu'],
        required: true,
      },
      {
        name: 'collateralRegistration',
        label: 'Đăng ký giao dịch bảo đảm',
        type: 'select',
        options: ['Đạt', 'Không đạt'],
        required: true,
      },
      {
        name: 'covenantCompliance',
        label: 'Tuân thủ các điều kiện tín dụng (Covenants)',
        type: 'select',
        options: ['Đạt', 'Không đạt'],
        required: true,
      },
      {
        name: 'disbursementDocs',
        label: 'Chứng từ giải ngân và kiểm tra sau giải ngân',
        type: 'select',
        options: ['Đạt', 'Không đạt', 'Có lưu ý'],
        required: true,
      },
    ],
  },
  {
    name: 'Rà soát sàn/kho quỹ',
    category: 'Sàn/Kho quỹ',
    isDefault: true,
    templateContent: {
      description:
        'Biểu mẫu rà soát an toàn kho quỹ và kiểm kê tiền mặt sàn giao dịch',
    },
    fields: [
      {
        name: 'cashBalanceAudit',
        label: 'Kiểm kê tồn quỹ thực tế so với sổ sách',
        type: 'select',
        options: ['Khớp', 'Chênh lệch'],
        required: true,
      },
      {
        name: 'vaultSafetyDevices',
        label: 'Hoạt động của camera, báo động, hệ thống PCCC',
        type: 'select',
        options: ['Đạt', 'Không đạt'],
        required: true,
      },
      {
        name: 'keyManagement',
        label: 'Quản lý và bàn giao chìa khóa kho quỹ',
        type: 'select',
        options: ['Đúng quy định', 'Sai quy định'],
        required: true,
      },
      {
        name: 'limitCompliance',
        label: 'Tuân thủ hạn mức tồn quỹ cuối ngày',
        type: 'select',
        options: ['Đúng hạn mức', 'Vượt hạn mức'],
        required: true,
      },
    ],
  },
  {
    name: 'Quản lý con dấu',
    category: 'Con dấu',
    isDefault: true,
    templateContent: {
      description:
        'Biểu mẫu rà soát công tác quản lý và sử dụng con dấu của đơn vị',
    },
    fields: [
      {
        name: 'sealSecurity',
        label: 'Nơi lưu giữ và bảo quản con dấu',
        type: 'select',
        options: ['Đạt', 'Không đạt'],
        required: true,
      },
      {
        name: 'sealLogBook',
        label: 'Ghi chép nhật ký đóng dấu',
        type: 'select',
        options: ['Đầy đủ', 'Thiếu sót'],
        required: true,
      },
      {
        name: 'sealAuthorization',
        label: 'Phê duyệt đóng dấu đúng thẩm quyền',
        type: 'select',
        options: ['Đạt', 'Không đạt'],
        required: true,
      },
    ],
  },
  {
    name: 'Lưu trữ chứng từ',
    category: 'Chứng từ',
    isDefault: true,
    templateContent: {
      description:
        'Biểu mẫu rà soát công tác lưu trữ, bảo quản chứng từ giao dịch',
    },
    fields: [
      {
        name: 'archivalLocation',
        label: 'Địa điểm lưu trữ chứng từ vật lý',
        type: 'select',
        options: ['Đạt', 'Không đạt'],
        required: true,
      },
      {
        name: 'archivalCompleteness',
        label: 'Độ đầy đủ của bộ chứng từ giao dịch',
        type: 'select',
        options: ['Đầy đủ', 'Thiếu chứng từ'],
        required: true,
      },
      {
        name: 'systemDigitalization',
        label: 'Đã scan và số hóa chứng từ lên hệ thống',
        type: 'select',
        options: ['Đầy đủ', 'Chưa scan'],
        required: true,
      },
    ],
  },
];

@Injectable()
export class WorkingPaperTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(WorkingPaperTemplatesService.name);

  constructor(
    @InjectRepository(WorkingPaperTemplate)
    private repo: Repository<WorkingPaperTemplate>,
  ) {}

  async onModuleInit() {
    await this.seedTemplates();
  }

  async seedTemplates() {
    const count = await this.repo.count();
    if (count === 0) {
      for (const t of DEFAULT_TEMPLATES) {
        const entity = this.repo.create(t);
        await this.repo.save(entity);
      }
      this.logger.log('Seeded default Working Paper templates!');
    }
  }

  async findAll() {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  async create(dto: CreateWorkingPaperTemplateDto) {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: number, dto: any) {
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.repo.delete(id);
    return { success: true };
  }
}
