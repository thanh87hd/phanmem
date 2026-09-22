import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OllamaService } from '../ollama.service';
import { AuditFinding } from '../../audit-findings/entities/audit-finding.entity';
import { FindingKnowledge } from '../entities/finding-knowledge.entity';
import { RegulatoryKnowledge } from '../entities/regulatory-knowledge.entity';
import { DefectCode, DefectDimension } from '../entities/defect-code.entity';
import {
  FINDING_ANALYSIS_SYSTEM_PROMPT,
  buildFindingAnalysisUserPrompt,
  WORKING_PAPER_SYSTEM_PROMPT,
  buildWorkingPaperUserPrompt,
  RCM_SYSTEM_PROMPT,
  buildRcmUserPrompt,
  SMART_EVIDENCE_SYSTEM_PROMPT,
  buildSmartEvidenceUserPrompt,
  buildDuplicateFindingPrompt,
} from '../constants/prompts';

@Injectable()
export class AiAuditorAssistantService {
  private readonly logger = new Logger(AiAuditorAssistantService.name);

  constructor(
    private readonly ollamaService: OllamaService,
    @InjectRepository(FindingKnowledge)
    private readonly kbRepo: Repository<FindingKnowledge>,
    @InjectRepository(RegulatoryKnowledge)
    private readonly regRepo: Repository<RegulatoryKnowledge>,
    @InjectRepository(DefectCode)
    private readonly defectCodeRepo: Repository<DefectCode>,
  ) {}

  async runLocalLlamaInference(description: string): Promise<any> {
    const result = await this.ollamaService.generateJSON({
      prompt: buildFindingAnalysisUserPrompt(description),
      system: FINDING_ANALYSIS_SYSTEM_PROMPT,
      temperature: 0.2,
      timeoutMs: 15000,
    });

    if (result) {
      return {
        suggestedTitle: result.suggestedTitle || 'Phát hiện sai phạm nghiệp vụ',
        suggestedRiskLevel: result.suggestedRiskLevel || 'Medium',
        suggestedCategory: result.suggestedCategory || 'Process',
        suggestedConsequence: result.suggestedConsequence || '',
        suggestedCause: result.suggestedCause || '',
        suggestedRca: result.suggestedRca || '',
        suggestedRecommendation: result.suggestedRecommendation || '',
        suggestedCriteria: result.suggestedCriteria || '',
        confidence: 0.9,
        matchSource: 'Ollama Local LLM (Qwen3-0.6B)',
      };
    }
    return null;
  }

  // Ollama-powered LLM inference for IIA Working Papers
  async runLocalLlamaWorkingPaperInference(title: string): Promise<any> {
    const result = await this.ollamaService.generateJSON({
      prompt: buildWorkingPaperUserPrompt(title),
      system: WORKING_PAPER_SYSTEM_PROMPT,
      temperature: 0.3,
      timeoutMs: 15000,
    });

    if (result) {
      return {
        objectives: result.objectives || 'Mục tiêu kiểm toán tiêu chuẩn',
        riskDescription: result.riskDescription || 'Rủi ro vận hành tiêu chuẩn',
        methodology: result.methodology || 'Phương pháp đối chiếu chéo',
        sampleSelection:
          result.sampleSelection || 'Chọn mẫu ngẫu nhiên hệ thống',
        procedures: result.procedures || 'Các bước thủ tục kiểm toán',
        conclusion: result.conclusion || 'Kết luận của kiểm toán viên',
        referencePrefix: result.referencePrefix || 'GEN',
        domainLabel: result.domainLabel || 'Kiểm toán Tổng hợp',
      };
    }
    return null;
  }

  // Ollama-powered LLM inference for RCM
  async runLocalLlamaRcmInference(legacyProcessName: string): Promise<any> {
    const result = await this.ollamaService.generateJSON({
      prompt: buildRcmUserPrompt(legacyProcessName),
      system: RCM_SYSTEM_PROMPT,
      temperature: 0.3,
      timeoutMs: 15000,
    });

    if (result && Array.isArray(result)) {
      return result;
    } else if (result && result.risks && Array.isArray(result.risks)) {
      return result.risks;
    }
    return null;
  }

  async suggestRcm(legacyProcessName: string) {
    const localResult = await this.runLocalLlamaRcmInference(legacyProcessName);
    if (localResult) {
      return localResult;
    }

    // Fallback Heuristic
    const nameLower = legacyProcessName.toLowerCase();
    if (nameLower.includes('tín dụng') || nameLower.includes('vay')) {
      return [
        {
          riskName: 'Giải ngân sai mục đích',
          riskDescription:
            'Khách hàng sử dụng vốn vay không đúng mục đích như cam kết trong hợp đồng tín dụng.',
          inherentRiskScore: 'High',
          controlName: 'Kiểm tra chứng từ sử dụng vốn',
          controlType: 'Preventive',
          controlFrequency: 'Mỗi giao dịch',
          controlAutomation: 'Manual',
          testProcedure:
            'Kiểm tra hồ sơ giải ngân thực tế và chứng từ chứng minh mục đích sử dụng vốn.',
        },
        {
          riskName: 'Tài sản bảo đảm bị định giá khống',
          riskDescription:
            'Cán bộ định giá thông đồng định giá tài sản bảo đảm cao hơn thực tế.',
          inherentRiskScore: 'Critical',
          controlName: 'Thẩm định giá độc lập',
          controlType: 'Preventive',
          controlFrequency: 'Mỗi giao dịch',
          controlAutomation: 'IT-Dependent Manual',
          testProcedure:
            'Rà soát chứng thư định giá và đối chiếu lịch sử giá khu vực trên hệ thống.',
        },
      ];
    } else if (
      nameLower.includes('công nghệ') ||
      nameLower.includes('it') ||
      nameLower.includes('hệ thống')
    ) {
      return [
        {
          riskName: 'Truy cập trái phép hệ thống',
          riskDescription:
            'Người dùng không có thẩm quyền truy cập vào hệ thống Core Banking.',
          inherentRiskScore: 'High',
          controlName: 'Xác thực đa yếu tố (MFA)',
          controlType: 'Preventive',
          controlFrequency: 'Mỗi lần đăng nhập',
          controlAutomation: 'Automated',
          testProcedure:
            'Kiểm tra cấu hình chính sách xác thực và thử đăng nhập không có MFA.',
        },
        {
          riskName: 'Mất mát dữ liệu do sự cố',
          riskDescription:
            'Dữ liệu giao dịch bị mất do lỗi phần cứng hoặc thảm họa.',
          inherentRiskScore: 'Critical',
          controlName: 'Sao lưu dữ liệu định kỳ',
          controlType: 'Corrective',
          controlFrequency: 'Hàng ngày',
          controlAutomation: 'Automated',
          testProcedure:
            'Kiểm tra nhật ký sao lưu và thực hiện diễn tập khôi phục dữ liệu.',
        },
      ];
    }

    return [
      {
        riskName: 'Sai sót vận hành chung',
        riskDescription:
          'Quy trình vận hành nội bộ có sai sót dẫn đến chậm trễ hoặc phát sinh chi phí.',
        inherentRiskScore: 'Medium',
        controlName: 'Kiểm tra kép (Dual Control)',
        controlType: 'Detective',
        controlFrequency: 'Mỗi giao dịch',
        controlAutomation: 'Manual',
        testProcedure:
          'Kiểm tra chữ ký duyệt của cấp có thẩm quyền trên hồ sơ.',
      },
    ];
  }

  // Suggest Working Paper Meta
  async suggestWorkingPaperMeta(title: string) {
    const localResult = await this.runLocalLlamaWorkingPaperInference(title);
    if (localResult) {
      return localResult;
    }

    const t = (title || '').toLowerCase();
    let domain = 'general';

    if (
      t.includes('tín dụng') ||
      t.includes('vay') ||
      t.includes('thế chấp') ||
      t.includes('giải ngân') ||
      t.includes('bảo lãnh')
    ) {
      domain = 'credit';
    } else if (
      t.includes('it') ||
      t.includes('công nghệ') ||
      t.includes('hệ thống') ||
      t.includes('bảo mật') ||
      t.includes('an toàn thông tin') ||
      t.includes('core')
    ) {
      domain = 'it';
    }

    if (domain === 'credit') {
      return {
        referencePrefix: 'CREDIT',
        domainLabel: 'Tín dụng & Cấp vốn (Credit Audit) [Heuristic]',
        objectives: `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính tuân thủ quy chế cấp tín dụng của NHNN (Thông tư 39/2016, Thông tư 13/2018) và quy định nội bộ ngân hàng.
- Đánh giá tính đầy đủ, hợp pháp và hợp lệ của hồ sơ thẩm định khách hàng, hồ sơ định giá và đăng ký giao dịch bảo đảm đối với tài sản thế chấp.
- Xác định tính chính xác trong việc phân loại nợ, trích lập dự phòng rủi ro và giám sát dòng tiền sau giải ngân.`,
        riskDescription: `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro khách hàng sử dụng vốn vay sai mục đích dẫn đến mất khả năng thanh toán nợ gốc và lãi.
- Rủi ro định giá khống tài sản bảo đảm, nhận tài sản không đủ điều kiện pháp lý hoặc chưa công chứng đăng ký biện pháp bảo đảm.
- Rủi ro đạo đức của cán bộ tín dụng thông đồng nới lỏng điều kiện phê duyệt hoặc bỏ qua các cảnh báo kiểm soát nội bộ.`,
        methodology: `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Vouching: Đối chiếu chứng từ giải ngân, hợp đồng mua bán, biên lai chuyển tiền với tài khoản thụ hưởng thực tế.
- Kiểm tra tuân thủ (Compliance Testing): Kiểm tra thẩm quyền phê duyệt phán quyết tín dụng theo phân cấp ủy quyền.
- Tái thực hiện (Re-performance): Tái tính toán điểm xếp hạng tín dụng nội bộ và định giá lại tài sản theo khung giá độc lập.`,
        sampleSelection: `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp chọn mẫu: Chọn mẫu có định hướng dựa trên rủi ro (Risk-based Sampling).
- Tiêu chí: Lọc 100% hồ sơ nợ nhóm 2 trở lên phát sinh trong kỳ + ngẫu nhiên 20 hồ sơ giải ngân có giá trị trên 5 tỷ VNĐ.
- Quy mô mẫu đại diện: 25 hồ sơ tín dụng doanh nghiệp và cá nhân tiêu biểu.`,
        procedures: `Bước 1: Kiểm tra tính tuân thủ điều kiện phê duyệt tín dụng.
- Thủ tục thực tế: Kiểm tra biên bản họp Hội đồng tín dụng và tờ trình thẩm định, xác nhận điều kiện cấp tín dụng đã được đáp ứng đầy đủ trước khi giải ngân.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Tờ trình thẩm định số [REF] & Quyết định phê duyệt.

Bước 2: Kiểm tra hồ sơ tài sản bảo đảm và đăng ký giao dịch.
- Thủ tục thực tế: Đối chiếu bản gốc Giấy chứng nhận quyền sử dụng đất / quyền sở hữu tài sản tại kho quỹ và tra cứu trên hệ thống UBot/Cục Đăng ký Quốc gia.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Đơn đăng ký biện pháp bảo đảm có xác nhận của cơ quan thẩm quyền.

Bước 3: Hậu kiểm sử dụng vốn và kiểm tra dòng tiền sau giải ngân.
- Thủ tục thực tế: Rà soát biên bản kiểm tra sử dụng vốn định kỳ 30 ngày/90 ngày sau giải ngân của ĐVKD và sao kê tài khoản bên thụ hưởng.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Báo cáo kiểm tra hiện trường & Sao kê tài khoản thụ hưởng.`,
        conclusion: `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Hệ thống kiểm soát nội bộ hoạt động cấp tín dụng [Hiệu quả / Hiệu quả một phần / Cần cải thiện].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: Có 02 hồ sơ giải ngân trước khi hoàn tất thủ tục đăng ký thế chấp tài sản tại Văn phòng Đăng ký Đất đai.
   - Phát hiện 2: Biên bản kiểm tra sử dụng vốn vay sau 30 ngày giải ngân lập mang tính hình thức, không chụp ảnh hiện trường kinh doanh.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-CREDIT-01, F-CREDIT-02] để gửi Trưởng đoàn xem xét.`,
      };
    } else if (domain === 'it') {
      return {
        referencePrefix: 'IT',
        domainLabel: 'Công nghệ thông tin & Bảo mật (IT Audit) [Heuristic]',
        objectives: `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính an toàn, bảo mật và tính sẵn sàng của hệ thống Core Banking theo tiêu chuẩn ISO 27001 và Thông tư 13/2018/TT-NHNN.
- Kiểm tra hiệu lực của kiểm soát phân quyền truy cập người dùng (User Access Management), quản lý tài khoản đặc quyền (PAM).
- Đánh giá quy trình quản lý thay đổi hệ thống (Change Management) và kế hoạch khôi phục sau thảm họa (Disaster Recovery).`,
        riskDescription: `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro bị tấn công mạng, rò rỉ dữ liệu tài khoản khách hàng do cấu hình sai quy định phân vùng mạng bảo mật.
- Rủi ro gián đoạn dịch vụ Core Banking quá thời gian cho phép (Downtime SLA) gây đình trệ giao dịch toàn ngân hàng.
- Rủi ro lạm quyền hoặc can thiệp trái phép vào cơ sở dữ liệu sản xuất từ các tài khoản quản trị không được giám sát nhật ký.`,
        methodology: `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Trích xuất cấu hình (System Configuration Review): Rà soát danh sách phân quyền trên Active Directory và Database Server.
- Phân tích nhật ký (Audit Log Analysis): Phân tích log truy cập ngoài giờ của tài khoản quản trị hệ thống.
- Phỏng vấn & Thử nghiệm thực tế (Walkthrough & Test of Details): Chứng kiến quy trình triển khai bản vá phần mềm lên môi trường UAT và Production.`,
        sampleSelection: `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp: Chọn mẫu 100% tài khoản có quyền Quản trị tối cao (Super Admin) + ngẫu nhiên 30 thay đổi mã nguồn trong quý.
- Quy mô mẫu đại diện: Toàn bộ danh sách 12 tài khoản đặc quyền CSDL và 15 Change Requests trọng yếu.`,
        procedures: `Bước 1: Rà soát danh sách tài khoản đặc quyền (PAM/Database Admin).
- Thủ tục thực tế: Đối chiếu danh sách tài khoản active trên Oracle/PostgreSQL với danh sách nhân sự IT đang làm việc.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: User access list export & Quyết định tiếp nhận/điều chuyển nhân sự.

Bước 2: Kiểm tra việc phân tách môi trường Development và Production.
- Thủ tục thực tế: Kiểm tra quyền commit/push trực tiếp mã nguồn vào nhánh Production mà không qua luồng phê duyệt pull request.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Splunk log query screenshots.

Bước 3: Rà soát quy trình diễn tập DR và khôi phục sự cố.
- Thủ tục thực tế: Kiểm tra biên bản diễn tập khôi phục thảm họa gần nhất và đo lường chỉ số RTO/RPO thực tế.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: DR Drill Report 2026.`,
        conclusion: `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Kiểm soát an toàn thông tin vận hành [Hiệu quả / Hiệu quả một phần / Không hiệu quả].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: 02 tài khoản cựu nhân sự đã nghỉ việc từ tháng 03/2026 vẫn chưa bị de-active quyền truy cập hệ thống Core.
   - Phát hiện 2: Nhật ký hoạt động của tài khoản quản trị CSDL chưa được lưu trữ độc lập tại phân vùng bảo mật riêng.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-IT-01, F-IT-02] để gửi Trưởng đoàn xem xét.`,
      };
    } else {
      return {
        referencePrefix: 'OP',
        domainLabel: 'Vận hành chi nhánh & Khác (Operations) [Heuristic]',
        objectives: `MỤC TIÊU KIỂM TOÁN (AUDIT OBJECTIVES - IIA Standard)
- Đánh giá tính tuân thủ quy trình kiểm kê quỹ, đối chiếu chứng từ kế toán cuối ngày và hạch toán chi phí.
- Đánh giá tính hiệu lực của kiểm soát phân tách trách nhiệm giữa kế toán viên và thủ quỹ.
- Đánh giá quy trình phê duyệt và thanh toán chi phí hoạt động nội bộ.`,
        riskDescription: `MÔ TẢ RỦI RO LIÊN QUAN (RISK CONTEXT)
- Rủi ro thất thoát tiền mặt tại quỹ do không thực hiện đúng quy định kiểm kê chéo cuối ngày.
- Rủi ro gian lận hạch toán khống chi phí mua sắm để trục lợi cá nhân.
- Rủi ro cán bộ kiêm nhiệm nhiều vai trò xung đột (lập phiếu và phê duyệt thanh toán).`,
        methodology: `PHƯƠNG PHÁP KIỂM TRA (TESTING METHODOLOGY)
- Kiểm tra thực tế (Physical Inspection): Tham gia chứng kiến kiểm kê quỹ tiền mặt đột xuất tại chi nhánh.
- Vouching: Kiểm tra tính hợp pháp của các hóa đơn VAT và chứng từ thanh toán đính kèm phiếu chi.
- Đối chiếu chéo: So sánh số dư sổ quỹ tiền mặt với số dư trên tài khoản GL Core Banking.`,
        sampleSelection: `CƠ SỞ CHỌN MẪU & QUY MÔ MẪU (SAMPLING METHOD - Auditboy Standard)
- Phương pháp chọn mẫu: Chọn mẫu ngẫu nhiên (Random Sampling) kết hợp chọn mẫu theo ngưỡng giá trị lớn (Monetary Unit Sampling).
- Kích thước mẫu: Chọn 30 chứng từ chi tiêu mua sắm nội bộ có giá trị lớn nhất và 10 chứng từ chọn ngẫu nhiên trong năm.`,
        procedures: `Bước 1: Chứng kiến kiểm kê quỹ tiền mặt đột xuất.
- Thủ tục thực tế: Thực hiện đếm tiền mặt thực tế tại két và đối chiếu với biên bản khóa sổ quỹ thời gian thực.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Biên bản kiểm quỹ ngày dd/mm/yyyy.

Bước 2: Kiểm tra chốt kiểm soát phê duyệt và phân tách trách nhiệm.
- Thủ tục thực tế: Rà soát danh sách user hạch toán và phê duyệt trên Core, đảm bảo không có tình trạng 1 user thực hiện cả 2 bước.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: GL Accounting transaction logs.

Bước 3: Rà soát tính hợp lệ của hóa đơn, chứng từ chi tiêu.
- Thủ tục thực tế: Tra cứu mã hóa đơn trên cổng thông tin của Tổng cục Thuế để xác thực hóa đơn đang hoạt động, không phải hóa đơn khống.
- Kết quả kiểm tra mẫu: [Mẫu đạt / Có lỗi ngoại lệ]
- Minh chứng: Hóa đơn điện tử VAT references.`,
        conclusion: `KẾT LUẬN CỦA KIỂM TOÁN VIÊN VỀ HIỆU QUẢ KIỂM SOÁT (AUDIT CONCLUSION - IIA 2024)
1. Đánh giá chung: Kiểm soát vận hành và kế toán hạch toán [Hiệu quả / Hiệu quả một phần / Không hiệu quả].
2. Điểm ngoại lệ chính phát hiện:
   - Phát hiện 1: Có 03 khoản chi mua sắm tài sản cố định trên 50 triệu đồng không thực hiện chào giá cạnh tranh 3 bên theo quy chế.
   - Phát hiện 2: Biên bản kiểm kê quỹ tiền mặt cuối ngày thiếu chữ ký xác nhận độc lập của Kiểm soát viên/Giám đốc Chi nhánh.
3. Tham chiếu sai phạm: Đã khởi tạo hồ sơ Phát hiện kiểm toán số [F-OP-01] để gửi Trưởng đoàn xem xét.`,
      };
    }
  }

  // Suggest Finding Meta
  async suggestFindingMeta(description: string) {
    const localResult = await this.runLocalLlamaInference(description);
    if (localResult) {
      return localResult;
    }

    const desc = description.toLowerCase();

    // 2. Fallback: Tìm trong Kho tri thức sai phạm (KB)
    const knowledgeBase = await this.kbRepo.find();
    let bestMatch: FindingKnowledge | null = null;
    let maxMatches = 0;

    for (const item of knowledgeBase) {
      if (!item.keywords) continue;
      const matchCount = item.keywords.filter((kw) =>
        desc.includes(kw.toLowerCase()),
      ).length;
      if (matchCount > maxMatches) {
        maxMatches = matchCount;
        bestMatch = item;
      }
    }

    // 3. Tìm trong Thư viện văn bản (Reg) để làm giàu căn cứ
    const regulatoryBase = await this.regRepo.find();
    const criteriaSuggestions: any[] = [];
    for (const reg of regulatoryBase) {
      if (!reg.relatedRisks) continue;
      const match = reg.relatedRisks.some((risk) =>
        desc.includes(risk.toLowerCase()),
      );
      if (match) {
        let specificCitation = '';

        if (reg.code === '13/2018/TT-NHNN') {
          if (
            desc.includes('thẩm định') ||
            desc.includes('tín dụng') ||
            desc.includes('phê duyệt') ||
            desc.includes('giải ngân') ||
            desc.includes('tài sản') ||
            desc.includes('thế chấp') ||
            desc.includes('bỏ qua')
          ) {
            specificCitation = `   - Trích dẫn cụ thể: Khoản 2 Điều 14 (Kiểm soát đối với hoạt động cấp tín dụng)\n   - Nội dung quy định: "Tổ chức tín dụng phải thực hiện kiểm soát chéo, phân tách rõ ràng trách nhiệm giữa khâu thẩm định, phê duyệt và quản lý tín dụng."`;
          } else if (
            desc.includes('downtime') ||
            desc.includes('sự cố') ||
            desc.includes('hệ thống') ||
            desc.includes('core') ||
            desc.includes('banking') ||
            desc.includes('chuyển tiền') ||
            desc.includes('lỗi')
          ) {
            specificCitation = `   - Trích dẫn cụ thể: Khoản 1 Điều 23 (Kiểm soát đối với hệ thống công nghệ thông tin và duy trì tính liên tục của hoạt động)\n   - Nội dung quy định: "Tổ chức tín dụng phải thiết lập kiểm soát nhằm đảm bảo tính bảo mật, toàn vẹn và tính liên tục của hệ thống thông tin. Phải có phương án dự phòng, quy trình ứng phó khẩn cấp và khôi phục hoạt động sau sự cố để giảm thiểu thời gian ngừng hoạt động (downtime) của hệ thống core banking, đảm bảo quyền lợi của khách hàng và tính liên tục trong giao dịch."`;
          } else {
            specificCitation = `   - Trích dẫn cụ thể: Hệ thống kiểm soát nội bộ (Điều 14 & Điều 23)\n   - Nội dung quy định: Xem chi tiết các yêu cầu kiểm soát chéo và vận hành hệ thống thông tin liên tục tại Khung kiểm soát nội bộ của Tổ chức tín dụng.`;
          }
        } else if (reg.code === '83/2025/TT-NHNN') {
          if (
            desc.includes('thẩm định') ||
            desc.includes('tín dụng') ||
            desc.includes('phê duyệt') ||
            desc.includes('giải ngân') ||
            desc.includes('hạn mức') ||
            desc.includes('vượt') ||
            desc.includes('bỏ qua')
          ) {
            specificCitation = `   - Trích dẫn cụ thể: Khoản 3 Điều 8 (Quy định về hệ thống kiểm soát hạn mức tự động)\n   - Nội dung quy định: "Tổ chức tín dụng phải thiết lập và duy trì cơ chế tự động ngăn chặn việc cấp tín dụng vượt giới hạn, vượt hạn mức phê duyệt mà không có phê duyệt đặc cách theo đúng thẩm quyền. Hệ thống khởi tạo và phê duyệt khoản vay phải tự động đối chiếu hạn mức của khách hàng tại thời điểm giải ngân để cảnh báo và chặn giao dịch vi phạm."`;
          } else {
            specificCitation = `   - Trích dẫn cụ thể: Hệ thống kiểm soát rủi ro tự động (Điều 8)\n   - Nội dung quy định: Quản lý và giám sát tự động hạn mức cấp tín dụng trực tuyến nhằm ngăn chặn rủi ro tín dụng vượt ngưỡng an toàn.`;
          }
        } else {
          specificCitation = `   - Chi tiết: Xem Khung tiêu chuẩn ${reg.code} - ${reg.title}\n   - Nội dung quy định: ${reg.summary}`;
        }

        criteriaSuggestions.push(
          `📌 [${reg.type.toUpperCase()}] ${reg.code} - ${reg.title}\n${specificCitation}`,
        );
      }
    }

    // 4. Tìm Mã lỗi Nội bộ (Internal Defect Code)
    const defectCodes = await this.defectCodeRepo.find({
      where: { dimension: DefectDimension.INTERNAL },
    });
    let bestDefectCode: DefectCode | null = null;
    let maxDefectMatches = 0;

    for (const dc of defectCodes) {
      if (!dc.description) continue;
      const kwMatches = dc.description
        .toLowerCase()
        .split(' ')
        .filter((kw) => kw.length > 3 && desc.includes(kw)).length;
      if (kwMatches > maxDefectMatches) {
        maxDefectMatches = kwMatches;
        bestDefectCode = dc;
      }
    }

    // 5. Kết hợp kết quả
    if (bestMatch && maxMatches > 0) {
      return {
        suggestedTitle: bestMatch.title,
        suggestedRiskLevel: bestMatch.riskLevel,
        suggestedCategory: bestMatch.category,
        suggestedRecommendation: bestMatch.suggestedRecommendation,
        suggestedCriteria:
          criteriaSuggestions.length > 0
            ? criteriaSuggestions.join('\n')
            : bestMatch.criteria,
        suggestedInternalCode: bestDefectCode?.code || null,
        confidence: Math.min(0.98, 0.6 + maxMatches * 0.1),
        matchSource: 'AI Knowledge Network',
      };
    }

    // 5. Fallback: Logic cơ bản
    let riskLevel = 'Low';
    let category = 'Tuân thủ';

    if (
      desc.includes('tiền') ||
      desc.includes('thất thoát') ||
      desc.includes('gian lận')
    ) {
      riskLevel = 'High';
      category = 'Tài chính';
    } else if (
      desc.includes('hệ thống') ||
      desc.includes('lỗi code') ||
      desc.includes('bảo mật')
    ) {
      riskLevel = 'Medium';
      category = 'Công nghệ';
    }

    return {
      suggestedRiskLevel: riskLevel,
      suggestedCategory: category,
      suggestedCriteria:
        criteriaSuggestions.length > 0 ? criteriaSuggestions.join('\n') : '',
      suggestedInternalCode: bestDefectCode?.code || null,
      confidence: 0.5,
      matchSource: 'Heuristic',
    };
  }

  async runLocalLlamaEvidenceInference(
    fileName: string,
    description: string,
    recommendation: string,
  ): Promise<any> {
    const result = await this.ollamaService.generateJSON({
      prompt: buildSmartEvidenceUserPrompt(
        fileName,
        description,
        recommendation,
      ),
      system: SMART_EVIDENCE_SYSTEM_PROMPT,
      temperature: 0.1,
      timeoutMs: 10000,
    });

    if (result) {
      return {
        status: result.status === 'Verified' ? 'Verified' : 'Rejected',
        estimatedProgress:
          typeof result.estimatedProgress === 'number'
            ? result.estimatedProgress
            : 50,
        analysis: result.analysis || 'Đã phân tích bằng chứng bằng AI.',
      };
    }
    return null;
  }

  async verifyEvidenceDetails(dto: {
    fileName: string;
    description: string;
    recommendation: string;
  }) {
    // 1. Try Ollama LLM
    const localResult = await this.runLocalLlamaEvidenceInference(
      dto.fileName,
      dto.description,
      dto.recommendation,
    );
    if (localResult) {
      return localResult;
    }

    // 2. Heuristic Fallback
    const name = dto.fileName.toLowerCase();
    const desc = (dto.description || '').toLowerCase();

    // Check matching keywords
    const matchedKeywords: any[] = [];
    if (
      name.includes('bien ban') ||
      name.includes('bb') ||
      desc.includes('biên bản')
    )
      matchedKeywords.push('Biên bản làm việc/nghiệm thu');
    if (
      name.includes('quyet dinh') ||
      name.includes('qd') ||
      desc.includes('quyết định')
    )
      matchedKeywords.push('Quyết định ban hành');
    if (
      name.includes('chu ky') ||
      name.includes('signed') ||
      desc.includes('chữ ký') ||
      desc.includes('đã ký')
    )
      matchedKeywords.push('Chữ ký số/con dấu xác nhận');
    if (
      name.includes('bao cao') ||
      name.includes('bc') ||
      desc.includes('báo cáo')
    )
      matchedKeywords.push('Báo cáo kết quả khắc phục');
    if (
      name.includes('hinh anh') ||
      name.includes('anh') ||
      name.includes('png') ||
      name.includes('jpg')
    )
      matchedKeywords.push('Ảnh chụp minh chứng thực tế');

    let status = 'Rejected';
    let progress = 40;
    let analysis = '';

    if (
      matchedKeywords.length >= 2 ||
      (matchedKeywords.length >= 1 &&
        (name.includes('cv') ||
          name.includes('cong van') ||
          name.includes('minh chung')))
    ) {
      status = 'Verified';
      progress = 100;
      analysis = `🔍 [Hệ thống Smart Evidences Verifier - Bản Heuristic RAG]
✅ Kết quả: ĐẠT YÊU CẦU THẨM ĐỊNH (Sơ bộ).
- Đã nhận diện tệp minh chứng: "${dto.fileName}" (${matchedKeywords.join(', ')}).
- Đánh giá Heuristic: Dựa trên tên file, có thể đây là minh chứng hợp lệ (chưa quét OCR nội dung sâu để xác minh chữ ký số/con dấu).
- Đối chiếu: File tải lên có vẻ phù hợp với yêu cầu khắc phục của kiến nghị "${dto.recommendation.substring(0, 80)}...".
- Đề xuất: Kiến nghị đủ điều kiện để chuyển trạng thái "Verified" (Đã xác nhận hoàn thành). KTV cần kiểm tra chéo nội dung file trước khi phê duyệt đóng hồ sơ.`;
    } else {
      status = 'Rejected';
      progress = 30;
      analysis = `🔍 [Hệ thống Smart Evidences Verifier - Bản Heuristic RAG]
❌ Kết quả: CHƯA ĐẠT YÊU CẦU (Cần bổ sung thông tin).
- Minh chứng nhận diện: "${dto.fileName}". Chưa tìm thấy các từ khóa xác nhận pháp lý chính thức trong tên file (như Biên bản, Quyết định có chữ ký hoặc Báo cáo kết quả đóng dấu).
- Đánh giá Heuristic: Dựa trên tên file, hệ thống chưa đủ cơ sở để xác nhận đây là minh chứng hợp lệ (chưa quét OCR nội dung).
- Đối chiếu: Yêu cầu khắc phục kiến nghị là "${dto.recommendation.substring(0, 100)}...", nhưng minh chứng chưa chứng minh được hành động kiểm soát chốt chặn đã được kích hoạt.
- Đề xuất: Yêu cầu Đơn vị được kiểm toán bổ sung thêm Biên bản ký duyệt chính thức hoặc Quyết định điều chỉnh quy trình có dấu mộc đỏ.`;
    }

    return { status, estimatedProgress: progress, analysis };
  }

  async extractFindingsToKnowledgeBase(findings: AuditFinding[]) {
    if (!findings || findings.length === 0) return { added: 0, skipped: 0 };

    const isOllamaAvailable = await this.ollamaService.isAvailable();
    if (!isOllamaAvailable) {
      throw new Error('AI không khả dụng để phân tích.');
    }

    let added = 0;
    let skipped = 0;

    for (const finding of findings) {
      const existingKbs = await this.kbRepo.find({
        select: ['title', 'category'],
      });
      const existingListStr = existingKbs
        .map((kb) => `- [${kb.category}] ${kb.title}`)
        .join('\n');

      const findingStr = `
Tiêu đề phát hiện: ${finding.findingTitle}
Mô tả/Tình trạng: ${finding.condition?.replace(/<[^>]+>/g, '') || ''}
Rủi ro: ${finding.riskLevel}
Khuyến nghị: ${finding.recommendation?.replace(/<[^>]+>/g, '') || ''}
`;

      const prompt = buildDuplicateFindingPrompt(existingListStr, findingStr);

      try {
        const json = await this.ollamaService.generateJSON({
          prompt,
          timeoutMs: 60000,
        });

        if (json) {
          if (json.isDuplicate) {
            skipped++;
          } else {
            const newKb = this.kbRepo.create({
              category: json.category || 'Khác',
              title: finding.findingTitle,
              description:
                finding.condition?.replace(/<[^>]+>/g, '') || 'Không có mô tả',
              riskLevel: finding.riskLevel || 'Medium',
              suggestedRecommendation:
                finding.recommendation?.replace(/<[^>]+>/g, '') || '',
              keywords: json.keywords || [],
              criteria: '',
            });
            await this.kbRepo.save(newKb);
            added++;
          }
        } else {
          skipped++;
        }
      } catch (err) {
        this.logger.error('Lỗi khi phân tích finding:', err);
        skipped++;
      }
    }

    return { added, skipped };
  }
}
