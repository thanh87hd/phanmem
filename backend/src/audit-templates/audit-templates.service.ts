import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditTemplate } from './entities/audit-template.entity';

@Injectable()
export class AuditTemplatesService implements OnModuleInit {
  constructor(
    @InjectRepository(AuditTemplate)
    private repo: Repository<AuditTemplate>,
  ) {}

  async onModuleInit() {
    const defaultTemplates = [
      {
        domain: 'Credit',
        title: 'Kiểm toán Hồ sơ Tín dụng (Basel II)',
        description:
          'Mẫu kiểm tra hồ sơ cấp tín dụng, định giá tài sản đảm bảo và phân loại nợ.',
        checklist: [
          { step: 1, task: 'Kiểm tra tính pháp lý của hồ sơ vay vốn' },
          { step: 2, task: 'Đánh giá năng lực tài chính của Khách hàng' },
          { step: 3, task: 'Kiểm tra hồ sơ định giá Tài sản đảm bảo' },
          { step: 4, task: 'Kiểm tra việc giải ngân đúng mục đích' },
        ],
      },
      {
        domain: 'AML',
        title: 'Kiểm toán Phòng chống Rửa tiền (AML/CFT)',
        description: 'Mẫu kiểm tra tính tuân thủ quy định FATF và NHNN về AML.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra quy trình KYC / CDD đối với KH rủi ro cao',
          },
          {
            step: 2,
            task: 'Kiểm tra hệ thống lọc giao dịch (Transaction Monitoring)',
          },
          {
            step: 3,
            task: 'Kiểm tra báo cáo giao dịch đáng ngờ (STR) gửi Cục PCRT',
          },
        ],
      },
      {
        domain: 'IT',
        title: 'Kiểm toán An ninh Mạng (Cyber Security)',
        description:
          'Mẫu kiểm toán hệ thống CNTT theo chuẩn ISO 27001 và COBIT 2019.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra phân quyền truy cập hệ thống (Access Control)',
          },
          {
            step: 2,
            task: 'Kiểm tra nhật ký hệ thống (Audit Logs) của Core Banking',
          },
          {
            step: 3,
            task: 'Đánh giá kết quả Penetration Test (Pentest) gần nhất',
          },
          { step: 4, task: 'Kiểm tra kế hoạch phục hồi sau thảm họa (DRP)' },
        ],
      },
      {
        domain: 'Operations',
        title: 'Chương trình Kiểm toán Vận hành & Quỹ Chi nhánh',
        description:
          'Mẫu quy trình kiểm tra các chốt kiểm soát an toàn quỹ, hạn mức teller và tuân thủ nghiệp vụ quầy.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm kê thực tế tiền mặt tại kho quỹ và đối chiếu sổ sách',
          },
          {
            step: 2,
            task: 'Kiểm tra khóa an toàn, mã số két và quy trình mở/đóng cửa kho quỹ',
          },
          {
            step: 3,
            task: 'Kiểm tra việc tuân thủ hạn mức giao dịch (Teller limits) trong ngày',
          },
          {
            step: 4,
            task: 'Đánh giá việc phê duyệt các giao dịch vượt hạn mức của Trưởng phòng',
          },
        ],
      },
      {
        domain: 'RiskManagement',
        title: 'Kiểm toán Quản trị Rủi ro Thanh khoản (Tuyến 2)',
        description:
          'Mẫu kiểm tra tính tuân thủ hạn mức rủi ro, kiểm thử stress test thanh khoản và chỉ số LCR/NSFR.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra chính sách hạn mức rủi ro thanh khoản đã được phê duyệt',
          },
          {
            step: 2,
            task: 'Đánh giá tính chính xác của phương pháp đo lường LCR và NSFR',
          },
          {
            step: 3,
            task: 'Kiểm tra kịch bản kiểm thử áp lực (Liquidity Stress Testing)',
          },
          {
            step: 4,
            task: 'Đánh giá quy trình báo cáo và xử lý khi vượt ngưỡng cảnh báo',
          },
        ],
      },
      {
        domain: 'Governance',
        title: 'Đánh giá Văn hóa Kiểm soát & Quản trị Doanh nghiệp',
        description:
          'Mẫu đánh giá hiệu quả giám sát của HĐQT, chính sách tố giác sai phạm (Whistleblowing) và đạo đức nghề nghiệp.',
        checklist: [
          {
            step: 1,
            task: 'Đánh giá tần suất và biên bản các cuộc họp của Ủy ban Kiểm toán',
          },
          {
            step: 2,
            task: 'Kiểm tra tính độc lập và phân quyền của bộ phận KTNB',
          },
          {
            step: 3,
            task: 'Kiểm tra hiệu quả vận hành của kênh tiếp nhận thông tin tố giác',
          },
          {
            step: 4,
            task: 'Đánh giá truyền thông và tập huấn quy tắc đạo đức nghề nghiệp',
          },
        ],
      },
      {
        domain: 'Credit',
        title: 'Mẫu Giấy tờ làm việc (WP) - Phê duyệt Tín dụng Doanh nghiệp',
        description:
          'Mẫu WP thực địa phân tích hồ sơ tín dụng doanh nghiệp quy mô lớn, kiểm tra điều kiện giải ngân.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra tờ trình phê duyệt tín dụng và biên bản họp Hội đồng tín dụng',
          },
          {
            step: 2,
            task: 'Kiểm tra việc hoàn thiện các điều kiện trước khi giải ngân (CPs)',
          },
          {
            step: 3,
            task: 'Kiểm tra đăng ký giao dịch bảo đảm đối với Tài sản thế chấp',
          },
          {
            step: 4,
            task: 'Đánh giá việc giám sát sau cho vay và kiểm tra thực tế sử dụng vốn',
          },
        ],
      },
      {
        domain: 'Governance',
        title: 'Mẫu Báo cáo Kiểm toán Nội bộ chuẩn (Circular 13/NHNN)',
        description:
          'Mẫu đề cương báo cáo kiểm toán nội bộ chính thức gửi Ủy ban Kiểm toán và Thống đốc NHNN theo quy định.',
        checklist: [
          {
            step: 1,
            task: 'Xây dựng Tóm tắt kết quả (Executive Summary) và Ý kiến KTV',
          },
          {
            step: 2,
            task: 'Liệt kê các Điểm mạnh cốt lõi kiểm soát nội bộ của đơn vị',
          },
          {
            step: 3,
            task: 'Trình bày các phát hiện kiểm toán chính (Condition, Criteria, Cause)',
          },
          {
            step: 4,
            task: 'Đề xuất kiến nghị khắc phục và thời hạn hoàn thành của đơn vị',
          },
        ],
      },
      {
        domain: 'Finance',
        title: 'Kiểm toán Báo cáo Tài chính Ngân hàng',
        description:
          'Mẫu kiểm tra tính trung thực của Báo cáo tài chính, đối chiếu tài khoản kế toán chi tiết với Sổ cái.',
        checklist: [
          {
            step: 1,
            task: 'Đối chiếu số dư tài khoản kế toán chi tiết với sổ cái (General Ledger)',
          },
          {
            step: 2,
            task: 'Kiểm tra tính chính xác của phương pháp hạch toán doanh thu và chi phí dồn tích',
          },
          {
            step: 3,
            task: 'Đánh giá các khoản trích lập dự phòng rủi ro và tài sản ngoại bảng',
          },
          {
            step: 4,
            task: 'Kiểm tra tính tuân thủ chính sách kế toán hiện hành của Ngân hàng Nhà nước',
          },
        ],
      },
      {
        domain: 'RiskManagement',
        title: 'Đánh giá Tỷ lệ An toàn Vốn ICAAP (Basel III)',
        description:
          'Quy trình đánh giá nội bộ về mức độ an toàn vốn (ICAAP), tính toán RWA cho rủi ro tín dụng, hoạt động và thị trường.',
        checklist: [
          {
            step: 1,
            task: 'Đánh giá quy trình tự đánh giá an toàn vốn nội bộ (ICAAP)',
          },
          {
            step: 2,
            task: 'Kiểm tra mô hình đo lường tài sản có rủi ro (RWA) cho các loại rủi ro',
          },
          {
            step: 3,
            task: 'Kiểm tra kiểm thử sức căng vốn (Capital Stress Testing) và đòn bẩy',
          },
          {
            step: 4,
            task: 'Đánh giá kế hoạch vốn dự phòng và bộ đệm an toàn vốn của ngân hàng',
          },
        ],
      },
      {
        domain: 'RiskManagement',
        title: 'Kiểm toán Mô hình Rủi ro (Model Risk Audit)',
        description:
          'Mẫu kiểm tra tính độc lập trong phê duyệt, định giá và kiểm tra hiệu năng các mô hình PD, LGD, EAD, VaR.',
        checklist: [
          {
            step: 1,
            task: 'Rà soát danh mục mô hình rủi ro đang áp dụng (PD, LGD, EAD, VaR)',
          },
          {
            step: 2,
            task: 'Kiểm tra quy trình phê duyệt và thẩm định độc lập mô hình (Model Validation)',
          },
          {
            step: 3,
            task: 'Đánh giá chất lượng dữ liệu đầu vào và các giả định của mô hình',
          },
          {
            step: 4,
            task: 'Kiểm tra việc theo dõi và đánh giá hiệu năng mô hình định kỳ (Backtesting)',
          },
        ],
      },
      {
        domain: 'Operations',
        title: 'Kiểm toán Hoạt động Nhân sự & Quản trị Lương thưởng',
        description:
          'Quy trình kiểm tra tính tuân thủ tuyển dụng, chính sách lương thưởng, KPI và quy chế lương thưởng của NHNN.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra hồ sơ tuyển dụng và quy trình bổ nhiệm cán bộ nhân sự',
          },
          {
            step: 2,
            task: 'Đánh giá tính chính xác của việc tính lương, thưởng và trích nộp bảo hiểm',
          },
          {
            step: 3,
            task: 'Kiểm tra việc thực hiện đánh giá hiệu năng (KPI) và thăng tiến cán bộ',
          },
          {
            step: 4,
            task: 'Kiểm tra tính tuân thủ chính sách lương thưởng theo quy định của NHNN',
          },
        ],
      },
      {
        domain: 'Finance',
        title: 'Kiểm toán Hoạt động Nguồn vốn & Thị trường Tài chính',
        description:
          'Mẫu kiểm toán Treasury, rà soát hạn mức giao dịch nguồn vốn, đối chiếu giao dịch liên ngân hàng.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra tính tuân thủ hạn mức giao dịch nguồn vốn (Treasury Limits)',
          },
          {
            step: 2,
            task: 'Đối chiếu xác nhận giao dịch liên ngân hàng (Interbank Confirmations)',
          },
          {
            step: 3,
            task: 'Đánh giá quy trình định giá lại tài sản tài chính hàng ngày (Mark-to-Market)',
          },
          {
            step: 4,
            task: 'Kiểm tra quy trình thanh toán và đối chiếu số liệu tiền gửi liên ngân hàng',
          },
        ],
      },
      {
        domain: 'Finance',
        title: 'Kiểm toán Kinh doanh Ngoại tệ & Phái sinh (Forex Trading)',
        description:
          'Mẫu rà soát hạn mức trạng thái ngoại tệ mở (Net Open Position), kiểm tra giao dịch SWAP, FORWARD.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra hạn mức trạng thái ngoại tệ mở hàng ngày (Net Open Position)',
          },
          {
            step: 2,
            task: 'Đánh giá quy trình phê duyệt giao dịch ngoại hối phái sinh (SWAP, FORWARD)',
          },
          {
            step: 3,
            task: 'Kiểm tra tính chính xác của việc đối chiếu tỷ giá giao dịch thực tế',
          },
          {
            step: 4,
            task: 'Kiểm tra công tác báo cáo trạng thái ngoại hối gửi Ngân hàng Nhà nước',
          },
        ],
      },
      {
        domain: 'RiskManagement',
        title: 'Kiểm toán Quản trị Rủi ro Hoạt động (Operational Risk)',
        description:
          'Mẫu kiểm tra thu thập sự kiện tổn thất rủi ro hoạt động (LDC), chốt tự kiểm soát (RCSA) và kế hoạch liên tục BCP.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra quy trình nhận diện và thu thập sự kiện tổn thất rủi ro hoạt động (LDC)',
          },
          {
            step: 2,
            task: 'Đánh giá hiệu quả thực hiện các chốt tự kiểm soát (Control Self-Assessment)',
          },
          {
            step: 3,
            task: 'Kiểm tra kế hoạch duy trì hoạt động liên tục (BCP) của các khối nghiệp vụ',
          },
          {
            step: 4,
            task: 'Đánh giá việc tập huấn nhận thức rủi ro hoạt động cho cán bộ nhân viên',
          },
        ],
      },
      {
        domain: 'Credit',
        title: 'Kiểm toán Rủi ro Tín dụng & Trích lập Dự phòng',
        description:
          'Mẫu đánh giá phân loại nhóm nợ, xếp hạng tín dụng nội bộ và tính chính xác của trích lập dự phòng rủi ro.',
        checklist: [
          {
            step: 1,
            task: 'Kiểm tra quy trình xếp hạng tín dụng nội bộ và phân loại nhóm nợ',
          },
          {
            step: 2,
            task: 'Đánh giá tính chính xác của giá trị tài sản bảo đảm khấu trừ',
          },
          {
            step: 3,
            task: 'Kiểm tra việc trích lập dự phòng cụ thể và dự phòng chung theo Thông tư',
          },
          {
            step: 4,
            task: 'Rà soát quy trình xử lý nợ xấu và sử dụng dự phòng rủi ro để xử lý nợ',
          },
        ],
      },
    ];

    for (let i = 0; i < defaultTemplates.length; i++) {
      const tpl = defaultTemplates[i];
      const existing = await this.repo.findOne({ where: { title: tpl.title } });
      if (!existing) {
        // Generate realistic deterministic initial values
        const randomUsage = 5 + ((i * 3) % 25); // Deterministic between 5 and 30
        const randomHours = [24, 40, 60, 80, 120][i % 5];
        const standardsList = [
          'IIA 1200',
          'IIA 2100',
          'IIA 2200',
          'IIA 2300',
          'IIA 2400',
        ];
        const randomStandards = [standardsList[i % standardsList.length]].join(
          ', ',
        );

        const randomDepts = [
          'Phòng Tín dụng',
          'Phòng CNTT',
          'Khối Vận hành',
          'Khối Quản trị rủi ro',
          'Phòng Kế toán tài chính',
        ];
        const randomDept = randomDepts[i % randomDepts.length];

        await this.repo.save({
          ...tpl,
          version: '1.0',
          status: 'Published',
          createdBy: 'Hệ thống',
          usageCount: randomUsage,
          lastUsedAt: new Date(Date.now() - (i % 30) * 24 * 60 * 60 * 1000),
          targetDepartments: randomDept,
          estimatedHours: randomHours,
          iiaStandards: randomStandards,
        });
      }
    }
  }

  findAll() {
    return this.repo.find();
  }

  create(data: Partial<AuditTemplate>) {
    return this.repo.save(this.repo.create(data));
  }

  async use(id: number) {
    const tpl = await this.repo.findOne({ where: { id } });
    if (tpl) {
      tpl.usageCount = (tpl.usageCount || 0) + 1;
      tpl.lastUsedAt = new Date();
      await this.repo.save(tpl);
    }
    return tpl;
  }

  async update(id: number, data: Partial<AuditTemplate>) {
    await this.repo.update(id, data);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: number) {
    await this.repo.delete(id);
    return { success: true };
  }
}
