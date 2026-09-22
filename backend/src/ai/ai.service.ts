import { Injectable, OnModuleInit, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, ILike } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as ExcelJS from 'exceljs';

import { getExcelCellString } from '../common/utils/excel.util';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { Department } from '../departments/entities/department.entity';
import { FindingKnowledge } from './entities/finding-knowledge.entity';
import { RegulatoryKnowledge } from './entities/regulatory-knowledge.entity';
import { ProcessLoophole } from './entities/process-loophole.entity';
import { User } from '../users/entities/user.entity';
import { AuditSchedule } from '../audit-schedules/entities/audit-schedule.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { Evidence } from '../evidences/entities/evidence.entity';
import { AuditReport } from '../audit-reports/entities/audit-report.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { TrainingRecord } from '../training/entities/training-record.entity';
import { RiskAssessment } from '../risk-assessments/entities/risk-assessment.entity';
import { AuditTask } from '../audit-tasks/entities/audit-task.entity';
import { KitaChatLog } from './entities/kita-chat-log.entity';
import { AiResponseCache } from './entities/ai-response-cache.entity';
import { DefectCode, DefectDimension } from './entities/defect-code.entity';
import { DefectCodeChangeLog } from './entities/defect-code-changelog.entity';

import { OllamaService } from './ollama.service';
import { ExtractionService } from '../extraction/extraction.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';

// Modular Sub-services
import { IntentClassifierService } from './services/intent-classifier.service';
import { DefectClassifierService } from './services/defect-classifier.service';
import { KnowledgeRagService } from './services/knowledge-rag.service';
import { RegulatoryKnowledgeService } from './services/regulatory-knowledge.service';
import { LoopholeDetectionService } from './services/loophole-detection.service';
import { ResourceAllocationService } from './services/resource-allocation.service';
import { AiAuditorAssistantService } from './services/ai-auditor-assistant.service';
import { KitaChatService } from './services/kita-chat.service';

function loadAiDataFile<T>(filename: string): T {
  const candidatePaths = [
    path.join(__dirname, 'data', filename),
    path.join(process.cwd(), 'src', 'ai', 'data', filename),
    path.join(process.cwd(), 'dist', 'ai', 'data', filename),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  return [] as unknown as T;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private jobTracker = new Map<string, any>();

  constructor(
    private readonly intentClassifier: IntentClassifierService,
    private readonly defectClassifierService: DefectClassifierService,
    private readonly knowledgeRagService: KnowledgeRagService,
    private readonly regKnowledgeService: RegulatoryKnowledgeService,
    private readonly loopholeService: LoopholeDetectionService,
    private readonly resourceAllocationService: ResourceAllocationService,
    private readonly assistantService: AiAuditorAssistantService,
    private readonly kitaChatService: KitaChatService,
    private readonly notificationsService: NotificationsService,
    private readonly ollamaService: OllamaService,
    private readonly extractionService: ExtractionService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
    @InjectRepository(Recommendation)
    private readonly recommendationRepo: Repository<Recommendation>,
    @InjectRepository(FindingKnowledge)
    private readonly kbRepo: Repository<FindingKnowledge>,
    @InjectRepository(RegulatoryKnowledge)
    private readonly regRepo: Repository<RegulatoryKnowledge>,
    @InjectRepository(ProcessLoophole)
    private readonly loopholeRepo: Repository<ProcessLoophole>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(AuditSchedule)
    private readonly scheduleRepo: Repository<AuditSchedule>,
    @InjectRepository(AuditEngagement)
    private readonly engagementRepo: Repository<AuditEngagement>,
    @InjectRepository(WorkingPaper)
    private readonly wpRepo: Repository<WorkingPaper>,
    @InjectRepository(Evidence)
    private readonly evidenceRepo: Repository<Evidence>,
    @InjectRepository(AuditReport)
    private readonly reportRepo: Repository<AuditReport>,
    @InjectRepository(AuditPlan)
    private readonly planRepo: Repository<AuditPlan>,
    @InjectRepository(TrainingRecord)
    private readonly trainingRepo: Repository<TrainingRecord>,
    @InjectRepository(RiskAssessment)
    private readonly riskRepo: Repository<RiskAssessment>,
    @InjectRepository(AuditTask)
    private readonly taskRepo: Repository<AuditTask>,
    @InjectRepository(KitaChatLog)
    private readonly chatLogRepo: Repository<KitaChatLog>,
    @InjectRepository(AiResponseCache)
    private readonly cacheRepo: Repository<AiResponseCache>,
    @InjectRepository(DefectCode)
    private readonly defectCodeRepo: Repository<DefectCode>,
    @InjectRepository(DefectCodeChangeLog)
    private readonly defectCodeChangeLogRepo: Repository<DefectCodeChangeLog>,
  ) {}

  async onModuleInit() {
    // Seed regulatory documents dynamically if empty or missing
    const defaultRegulations = loadAiDataFile<any[]>('seed-regulations.json');
    for (const reg of defaultRegulations) {
      const existing = await this.regRepo.findOne({
        where: { code: reg.code },
      });
      if (!existing) {
        await this.regRepo.save(this.regRepo.create(reg));
        this.logger.log(`✅ Đã seed văn bản quy chế: ${reg.code}`);
      } else {
        existing.type = reg.type;
        existing.title = reg.title;
        existing.summary = reg.summary;
        existing.fullContent = reg.fullContent;
        existing.businessProcess =
          reg.legacyBusinessProcess || reg.businessProcess || 'Chung';
        existing.relatedRisks = reg.relatedRisks;
        existing.status = reg.status;
        await this.regRepo.save(existing);
      }
    }

    // Seed FindingKnowledge dynamically if empty or missing
    const defaultFindingKnowledge = loadAiDataFile<any[]>(
      'seed-finding-knowledge.json',
    );
    for (const kb of defaultFindingKnowledge) {
      const existing = await this.kbRepo.findOne({
        where: { title: kb.title },
      });
      if (!existing) {
        await this.kbRepo.save(this.kbRepo.create(kb));
        this.logger.log(`✅ Đã seed tri thức sai phạm mẫu: ${kb.title}`);
      } else {
        existing.category = kb.category;
        existing.description = kb.description;
        existing.criteria = kb.criteria;
        existing.riskLevel = kb.riskLevel;
        existing.suggestedRecommendation = kb.suggestedRecommendation;
        existing.keywords = kb.keywords;
        await this.kbRepo.save(existing);
      }
    }
  }

  /**
   * --- PHẦN 1: QUẢN LÝ KHO TRI THỨC SAI PHẠM (KB) ---
   */
  // ... (existing methods omitted for brevity in replace_file_content but I will keep them)
  async getAllKnowledge() {
    return this.kbRepo.find({ order: { category: 'ASC', title: 'ASC' } });
  }

  async createKnowledge(dto: any) {
    const item = this.kbRepo.create(dto);
    return this.kbRepo.save(item);
  }

  async updateKnowledge(id: number, dto: any) {
    await this.kbRepo.update(id, dto);
    return this.kbRepo.findOne({ where: { id } });
  }

  async deleteKnowledge(id: number) {
    await this.kbRepo.delete(id);
    return { success: true };
  }

  async exportFindingKnowledgeExcel() {
    const items = await this.kbRepo.find({
      order: { category: 'ASC', title: 'ASC' },
    });

    const data = items.map((c) => ({
      'Nhóm (Category)': c.category,
      'Tên sai phạm mẫu': c.title,
      'Mô tả chi tiết': c.description,
      'Căn cứ / Chuẩn mực': c.criteria || '',
      'Mức rủi ro': c.riskLevel,
      'Khuyến nghị khắc phục mẫu': c.suggestedRecommendation || '',
      'Gợi ý đóng kiến nghị kiểm toán': c.closingGuide || '',
      'Từ khóa (Keywords)': c.keywords ? c.keywords.join(', ') : '',
    }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    const defaultHeaders = [
      'Nhóm (Category)',
      'Tên sai phạm mẫu',
      'Mô tả chi tiết',
      'Căn cứ / Chuẩn mực',
      'Mức rủi ro',
      'Khuyến nghị khắc phục mẫu',
      'Gợi ý đóng kiến nghị kiểm toán',
      'Từ khóa (Keywords)',
    ];
    ws.columns = defaultHeaders.map((header) => ({
      header,
      key: header,
      width: 25,
    }));
    if (data.length > 0) {
      data.forEach((item) => ws.addRow(item));
    }
    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  async syncKnowledgeFromDefectCodes() {
    const defectCodes = await this.defectCodeRepo.find({
      where: { dimension: DefectDimension.INTERNAL },
    });
    let added = 0;

    for (const dc of defectCodes) {
      if (!dc.description) continue;
      const existing = await this.kbRepo.findOne({
        where: { title: dc.description },
      });
      if (!existing) {
        const kb = this.kbRepo.create({
          category: dc.l1Desc || 'Khác',
          title: dc.description,
          description: dc.description,
          riskLevel:
            dc.riskLevel === 3 ? 'High' : dc.riskLevel === 2 ? 'Medium' : 'Low',
        });
        await this.kbRepo.save(kb);
        added++;
      }
    }
    return {
      success: true,
      added,
      message: `Synced ${added} items from Defect Codes`,
    };
  }

  async importFindingKnowledgeExcel(file: any) {
    const wb = new ExcelJS.Workbook();
    if (file?.path && fs.existsSync(file.path)) {
      await wb.xlsx.readFile(file.path);
    } else if (file?._buf || file?.buffer) {
      await wb.xlsx.load(file._buf || file.buffer);
    } else if (Buffer.isBuffer(file)) {
      await wb.xlsx.load(file as any);
    } else {
      throw new Error('Không tìm thấy dữ liệu file tải lên');
    }
    const sheetName = wb.worksheets[0]?.name || '';
    const rows = (function (sheetName) {
      const ws = wb.getWorksheet(sheetName);
      if (!ws) return [];
      const data: any[] = [];
      let hd: string[] = [];
      ws.eachRow((row, rIdx) => {
        const vals = Array.isArray(row.values) ? row.values.slice(1) : [];
        if (rIdx === 1) {
          hd = vals.map((v) =>
            v !== null && v !== undefined ? (v as any).toString() : '',
          );
        } else {
          const obj: any = {};
          hd.forEach((h, i) => (obj[h] = vals[i]));
          data.push(obj);
        }
      });
      return data;
    })(sheetName);

    let added = 0;
    let updated = 0;

    for (const row of rows) {
      const title = row['Tên sai phạm mẫu'];
      if (!title) continue;

      const category = row['Nhóm (Category)'] || 'Khác';
      const description = row['Mô tả chi tiết'] || '';
      const criteria = row['Căn cứ / Chuẩn mực'] || '';
      const riskLevel = row['Mức rủi ro'] || 'Medium';
      const suggestedRecommendation = row['Khuyến nghị khắc phục mẫu'] || '';
      const closingGuide = row['Gợi ý đóng kiến nghị kiểm toán'] || '';
      const keywordsStr = row['Từ khóa (Keywords)'] || '';
      const keywords = keywordsStr
        .split(',')
        .map((k: string) => k.trim())
        .filter(Boolean);

      const existing = await this.kbRepo.findOne({ where: { title } });
      if (existing) {
        existing.category = category;
        existing.description = description;
        existing.criteria = criteria;
        existing.riskLevel = riskLevel;
        existing.suggestedRecommendation = suggestedRecommendation;
        existing.closingGuide = closingGuide;
        existing.keywords = keywords;
        await this.kbRepo.save(existing);
        updated++;
      } else {
        const newItem = this.kbRepo.create({
          category,
          title,
          description,
          criteria,
          riskLevel,
          suggestedRecommendation,
          closingGuide,
          keywords,
        });
        await this.kbRepo.save(newItem);
        added++;
      }
    }

    return {
      success: true,
      added,
      updated,
      message: `Imported ${added} new items, updated ${updated} existing items.`,
    };
  }

  async processFindingKnowledgeBulkUpload(files: any[]) {
    const results: any[] = [];
    const isOllamaAvailable = await this.ollamaService.isAvailable();

    for (const file of files) {
      try {
        const originalName = file.originalname;
        const markdownContent = file.buffer.toString('utf8');
        if (!markdownContent.trim()) {
          results.push({
            fileName: originalName,
            status: 'failed',
            error: 'File rỗng hoặc không có nội dung',
          });
          continue;
        }

        let items: any[] | null = null;

        if (isOllamaAvailable) {
          const prompt = `Bạn là trợ lý AI chuyên nghiệp phân tích mẫu lỗi và sai sót kiểm toán ngân hàng.
Hãy đọc tài liệu Markdown sau và trích xuất danh sách các mẫu lỗi/sai sót kiểm toán dưới định dạng JSON array.

Nội dung tài liệu:
"""
${markdownContent.substring(0, 4000)}
"""

Hãy trả về chính xác một mảng các đối tượng JSON (JSON array) với các trường sau (không trả về giải thích hay từ ngữ nào khác ngoài JSON, không sử dụng định dạng markdown \`\`\`json ở đầu và cuối):
[
  {
    "category": "Danh mục nghiệp vụ liên quan (Chỉ chọn một trong các giá trị: 'Tín dụng', 'Huy động', 'Kế toán & Kho quỹ', 'Công nghệ thông tin', 'Thanh toán quốc tế', 'Vận hành & Nhân sự')",
    "title": "Tiêu đề lỗi/sai phạm mẫu ngắn gọn (VD: Hồ sơ giải ngân thiếu chữ ký phê duyệt)",
    "description": "Mô tả chi tiết về hành vi sai phạm, cách thức phát hiện hoặc nội dung lỗi",
    "criteria": "Căn cứ pháp lý, thông tư hoặc quy định nội bộ bị vi phạm (VD: Khoản 2 Điều 14 Thông tư 13/2018/TT-NHNN)",
    "riskLevel": "Mức độ rủi ro của lỗi (Chỉ chọn một trong: 'High', 'Medium', 'Low')",
    "suggestedRecommendation": "Khuyến nghị khắc phục hoặc xử lý mẫu đề xuất cho đơn vị",
    "keywords": ["từ khóa 1", "từ khóa 2"] (Mảng chứa 3-5 từ khóa nhận diện chính, ví dụ: "thiếu chữ ký", "giải ngân", "hồ sơ")
  }
]
`;
          items = await this.ollamaService.generateJSON<any[]>({
            prompt,
            temperature: 0.2,
          });
        }

        // Fallback Heuristics nếu Ollama lỗi hoặc không khả dụng
        if (!items || !Array.isArray(items) || items.length === 0) {
          this.logger.log(
            `[Finding KB Bulk] Sử dụng Heuristics fallback cho file: ${originalName}`,
          );

          // Trích xuất bằng regex cơ bản (tách theo dòng tiêu đề H1/H2)
          const headings = markdownContent.match(/^#+\s+(.+)$/gm) || [];
          const textBlocks = markdownContent
            .split(/^#+\s+.+$/gm)
            .filter(Boolean);

          items = [];
          for (let i = 0; i < Math.min(headings.length, 10); i++) {
            const headingText = headings[i].replace(/^#+\s+/, '').trim();
            const blockText = textBlocks[i] || '';
            const desc =
              blockText.trim().slice(0, 400) ||
              'Mô tả chi tiết hành vi sai phạm mẫu.';

            // Tìm từ khóa
            const keywords = headingText
              .toLowerCase()
              .split(/\s+/)
              .filter((w: string) => w.length > 3)
              .slice(0, 5);

            items.push({
              category: originalName.toLowerCase().includes('tin_dung')
                ? 'Tín dụng'
                : 'Vận hành & Nhân sự',
              title: headingText,
              description: desc,
              criteria: 'Quy định nội bộ liên quan',
              riskLevel: 'Medium',
              suggestedRecommendation:
                'Chấn chỉnh nghiệp vụ và bổ sung kiểm soát chéo.',
              keywords: keywords.length > 0 ? keywords : ['sai phạm'],
            });
          }

          // Dự phòng cuối cùng nếu vẫn rỗng
          if (items.length === 0) {
            const title = originalName
              .replace(/\.md$/i, '')
              .replace(/[_-]/g, ' ');
            items.push({
              category: 'Vận hành & Nhân sự',
              title: title,
              description: markdownContent.slice(0, 500),
              criteria: 'Quy định ban hành',
              riskLevel: 'Medium',
              suggestedRecommendation:
                'Thực hiện kiểm tra tính tuân thủ quy trình.',
              keywords: ['tuân thủ'],
            });
          }
        }

        // Tạo các bản ghi trong Database
        const savedItems: any[] = [];
        for (const item of items) {
          const kbItem = this.kbRepo.create({
            category: item.category || 'Vận hành & Nhân sự',
            title: item.title || 'Lỗi sai phạm mẫu',
            description: item.description || 'Mô tả chi tiết sai phạm.',
            criteria: item.criteria || '',
            riskLevel: item.riskLevel || 'Medium',
            suggestedRecommendation: item.suggestedRecommendation || '',
            keywords: Array.isArray(item.keywords)
              ? item.keywords
              : ['sai phạm'],
          });
          const saved = await this.kbRepo.save(kbItem);
          savedItems.push(saved);
        }

        results.push({
          fileName: originalName,
          status: 'success',
          count: savedItems.length,
        });
      } catch (err: any) {
        this.logger.error(
          `[Finding KB Bulk] Lỗi xử lý file ${file.originalname}: ${err.message}`,
        );
        results.push({
          fileName: file.originalname,
          status: 'failed',
          error: err.message,
        });
      }
    }

    const totalUploaded = results.reduce((acc, r) => acc + (r.count || 0), 0);
    return {
      totalFiles: files.length,
      totalFindingsCreated: totalUploaded,
      successCount: results.filter((r) => r.status === 'success').length,
      failedCount: results.filter((r) => r.status === 'failed').length,
      details: results,
    };
  }

  /**
   * --- PHẦN 2: QUẢN LÝ THƯ VIỆN VĂN BẢN PHÁP QUY (REG) ---
   */

  // === PHẦN 2: DELEGATION VĂN BẢN PHÁP QUY (Regulatory Knowledge) ===
  async getAllRegulatory() {
    return this.regKnowledgeService.getAllRegulatory();
  }

  async getRegulatoryById(id: number) {
    return this.regKnowledgeService.getRegulatoryById(id);
  }

  async getDocumentChunks(id: number) {
    return this.regKnowledgeService.getDocumentChunks(id);
  }

  async rechunkDocument(id: number, markdown: string) {
    return this.regKnowledgeService.rechunkDocument(id, markdown);
  }

  async createRegulatory(dto: any) {
    return this.regKnowledgeService.createRegulatory(dto);
  }

  async updateRegulatory(id: number, dto: any) {
    return this.regKnowledgeService.updateRegulatory(id, dto);
  }

  async deleteRegulatory(id: number) {
    return this.regKnowledgeService.deleteRegulatory(id);
  }

  async processRegulatoryBulkUploadAsync(jobId: string, files: any[]) {
    return this.regKnowledgeService.processRegulatoryBulkUploadAsync(
      jobId,
      files,
    );
  }

  async processRegulatoryBulkUpload(files: any[]) {
    const jobId = `reg_bulk_${Date.now()}`;
    await this.regKnowledgeService.processRegulatoryBulkUploadAsync(
      jobId,
      files,
    );
    return { success: true, jobId };
  }

  async scanDirectoryForRegulations(directoryPath?: string) {
    return this.regKnowledgeService.scanDirectoryForRegulations(
      directoryPath || path.join(process.cwd(), 'uploads', 'regulations'),
    );
  }

  async calculateUnitRiskScore(unitName: string): Promise<{
    unitName: string;
    score: number;
    level: string;
    factors: any;
    trend: string;
  }> {
    const findings = await this.findingRepo
      .createQueryBuilder('f')
      .leftJoin('f.engagement', 'e')
      .where('e.legacyAuditedDepartment = :unit', { unit: unitName })
      .getMany();
    const high = findings.filter(
      (f) => f.riskLevel === 'High' || f.riskLevel === 'Critical',
    ).length;
    const medium = findings.filter((f) => f.riskLevel === 'Medium').length;
    const low = findings.filter((f) => f.riskLevel === 'Low').length;

    const recommendations = await this.recommendationRepo.find({
      where: { legacyDepartment: unitName },
    });
    const totalRecs = recommendations.length;
    const completedRecs = recommendations.filter(
      (r) => r.status === 'Verified' || r.status === 'Completed',
    ).length;
    const remediationRate = totalRecs > 0 ? completedRecs / totalRecs : 1;

    // Tính điểm (Càng cao càng rủi ro)
    let score = high * 15 + medium * 7 + low * 3;
    score = score * (1.5 - remediationRate); // Nếu khắc phục tốt (rate=1) thì nhân 0.5, nếu kém (rate=0) thì nhân 1.5

    // Làm tròn
    score = Math.min(100, Math.max(0, Math.round(score)));

    let level = 'Low';
    if (score > 70) level = 'Critical';
    else if (score > 50) level = 'High';
    else if (score > 30) level = 'Medium';

    return {
      unitName,
      score,
      level,
      factors: {
        highFindings: high,
        mediumFindings: medium,
        lowFindings: low,
        remediationRate: Math.round(remediationRate * 100),
      },
      trend:
        remediationRate < 0.7 && high + medium > 0
          ? 'Up'
          : remediationRate >= 0.8
            ? 'Down'
            : 'Stable',
    };
  }

  /**
   * Tổng hợp bản đồ rủi ro toàn hệ thống theo phân loại unitType
   */
  async getRiskHeatmap(unitType?: string) {
    // Load all departments to check unitType dynamically (even if status is not active)
    const allDepts = await this.deptRepo.find();
    const deptTypeMap = new Map<string, string>();
    allDepts.forEach((d) => {
      deptTypeMap.set(d.name, d.unitType);
    });

    const allowedTypes =
      unitType && unitType !== 'all'
        ? unitType === 'BDT'
          ? ['BDT', 'DonViKinhDoanh']
          : [unitType]
        : [
            'Khoi',
            'ChiNhanh',
            'TrungTam',
            'BDT',
            'DonViKinhDoanh',
            'UyBan',
            'HoiDong',
            'Phong',
            'PGD',
          ];

    // 1. Lấy tất cả các đơn vị chính trực thuộc Cơ cấu tổ chức đang hoạt động của các loại được chọn
    const majorDepts = allDepts.filter(
      (d) => d.status === 'Active' && allowedTypes.includes(d.unitType),
    );

    // 2. Lấy tất cả phát hiện và kiến nghị từ database
    const allFindings = await this.findingRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.engagement', 'e')
      .getMany();

    const allRecs = await this.recommendationRepo.find();

    // 3. Tìm các đơn vị có phát hiện hoặc kiến nghị thực tế thuộc allowedTypes nhưng chưa có trong danh sách đơn vị chính
    const activeUnitNames = new Set<string>();
    allFindings.forEach((f) => {
      const name = f.engagement?.legacyAuditedDepartment;
      if (name) {
        const type = deptTypeMap.get(name);
        if (type && allowedTypes.includes(type)) {
          activeUnitNames.add(name);
        }
      }
    });
    allRecs.forEach((r) => {
      const name = r.legacyDepartment;
      if (name) {
        const type = deptTypeMap.get(name);
        if (type && allowedTypes.includes(type)) {
          activeUnitNames.add(name);
        }
      }
    });

    const majorUnitNames = new Set(majorDepts.map((d) => d.name));
    const finalUnitNames = Array.from(
      new Set([...majorUnitNames, ...activeUnitNames]),
    );

    // 4. Nhóm phát hiện và kiến nghị theo đơn vị trong bộ nhớ để tăng hiệu năng xử lý (O(1) lookup)
    const findingsByDept: Record<string, AuditFinding[]> = {};
    allFindings.forEach((f) => {
      const deptName = f.engagement?.legacyAuditedDepartment;
      if (deptName) {
        if (!findingsByDept[deptName]) {
          findingsByDept[deptName] = [];
        }
        findingsByDept[deptName].push(f);
      }
    });

    const recsByDept: Record<string, Recommendation[]> = {};
    allRecs.forEach((r) => {
      const deptName = r.legacyDepartment;
      if (deptName) {
        if (!recsByDept[deptName]) {
          recsByDept[deptName] = [];
        }
        recsByDept[deptName].push(r);
      }
    });

    // 5. Tính toán điểm rủi ro cho từng đơn vị
    const results: any[] = [];
    for (const unit of finalUnitNames) {
      const deptFindings = findingsByDept[unit] || [];
      const deptRecs = recsByDept[unit] || [];

      const high = deptFindings.filter(
        (f) => f.riskLevel === 'High' || f.riskLevel === 'Critical',
      ).length;
      const medium = deptFindings.filter(
        (f) => f.riskLevel === 'Medium',
      ).length;
      const low = deptFindings.filter((f) => f.riskLevel === 'Low').length;

      const totalRecs = deptRecs.length;
      const completedRecs = deptRecs.filter(
        (r) => r.status === 'Verified' || r.status === 'Completed',
      ).length;
      const remediationRate = totalRecs > 0 ? completedRecs / totalRecs : 1;

      // Tính điểm (Càng cao càng rủi ro)
      let score = high * 15 + medium * 7 + low * 3;
      score = score * (1.5 - remediationRate); // Nếu khắc phục tốt (rate=1) thì nhân 0.5, nếu kém (rate=0) thì nhân 1.5

      // Làm tròn
      score = Math.min(100, Math.max(0, Math.round(score)));

      let level = 'Low';
      if (score > 70) level = 'Critical';
      else if (score > 50) level = 'High';
      else if (score > 30) level = 'Medium';

      let trend = 'Down';
      if (high > 0 || score > 40 || (totalRecs > 0 && remediationRate < 0.8)) {
        trend = 'Up';
      }

      results.push({
        unitName: unit,
        score,
        level,
        factors: {
          highFindings: high,
          mediumFindings: medium,
          lowFindings: low,
          remediationRate: Math.round(remediationRate * 100),
        },
        trend,
      });
    }

    // Sắp xếp đơn vị rủi ro cao lên hàng đầu
    return results.sort((a, b) => b.score - a.score);
  }

  // Dynamic native CPU-only multi-threaded LLM execution

  // === PHẦN 4: DELEGATION AI ASSISTANT & INFERENCE ===
  async runLocalLlamaInference(description: string): Promise<any> {
    return this.assistantService.runLocalLlamaInference(description);
  }

  async runLocalLlamaWorkingPaperInference(title: string): Promise<any> {
    return this.assistantService.runLocalLlamaWorkingPaperInference(title);
  }

  async runLocalLlamaRcmInference(legacyProcessName: string): Promise<any> {
    return this.assistantService.runLocalLlamaRcmInference(legacyProcessName);
  }

  async suggestRcm(legacyProcessName: string) {
    return this.assistantService.suggestRcm(legacyProcessName);
  }

  async suggestWorkingPaperMeta(title: string) {
    return this.assistantService.suggestWorkingPaperMeta(title);
  }

  async suggestFindingMeta(description: string) {
    return this.assistantService.suggestFindingMeta(description);
  }

  // === PHẦN 5: DELEGATION LỖ HỔNG QUY TRÌNH (Process Loopholes) ===
  async analyzeProcessLoopholes() {
    return this.loopholeService.analyzeProcessLoopholes();
  }

  async runAiLoopholeDetection() {
    return this.loopholeService.runAiLoopholeDetection();
  }

  async approveLoophole(id: number, approver: string) {
    return this.loopholeService.approveLoophole(id, approver);
  }

  async rejectLoophole(id: number) {
    return this.loopholeService.rejectLoophole(id);
  }

  async getMonthlyLoopholeReport(year: number, month: number) {
    return this.loopholeService.getMonthlyLoopholeReport(year, month);
  }

  // === PHẦN 6: DELEGATION PHÂN BỔ NGUỒN LỰC & STRESS TEST ===
  async runStressTest(count: number) {
    return this.resourceAllocationService.runStressTest(count);
  }

  async allocateResources(year: number = 2026) {
    return this.resourceAllocationService.allocateResources(year);
  }

  async approveAnnualPlan() {
    return this.resourceAllocationService.approveAnnualPlan();
  }

  // === PHẦN 7: DELEGATION MINH CHỨNG & CHATBOT KITA ASSISTANT ===
  async runLocalLlamaEvidenceInference(
    fileName: string,
    description: string,
    recommendation: string,
  ): Promise<any> {
    return this.assistantService.runLocalLlamaEvidenceInference(
      fileName,
      description,
      recommendation,
    );
  }

  async verifyEvidenceDetails(dto: {
    fileName: string;
    description: string;
    recommendation: string;
  }) {
    return this.assistantService.verifyEvidenceDetails(dto);
  }

  async saveChatLog(
    userMsg: string,
    aiReply: string,
    intent: string,
    source: string,
    category: string,
    isConfidenceLow: boolean = false,
    responseTimeMs: number = 0,
    user?: { userId?: number; username?: string },
  ) {
    return this.kitaChatService.saveChatLog(
      userMsg,
      aiReply,
      intent,
      source,
      category,
      isConfidenceLow,
      responseTimeMs,
      user,
    );
  }

  async getChatLogs() {
    return this.kitaChatService.getChatLogs();
  }

  async getChatAnalytics() {
    return this.kitaChatService.getChatAnalytics();
  }

  async kitaChat(
    dto: { message: string; history?: any[] },
    user?: { userId?: number; username?: string },
  ) {
    return this.kitaChatService.kitaChat(dto, user);
  }

  async extractFindingsToKnowledgeBase(findings: AuditFinding[]) {
    return this.assistantService.extractFindingsToKnowledgeBase(findings);
  }

  async getDefectCodes(dimension?: string) {
    if (dimension) {
      return this.defectCodeRepo.find({
        where: { dimension: dimension as DefectDimension },
      });
    }
    return this.defectCodeRepo.find();
  }

  async importDefectCodes(file?: any) {
    let wb: ExcelJS.Workbook;

    if (file) {
      wb = new ExcelJS.Workbook();
      if (file?.path && fs.existsSync(file.path)) {
        await wb.xlsx.readFile(file.path);
      } else if (file?._buf || file?.buffer) {
        await wb.xlsx.load(file._buf || file.buffer);
      } else if (Buffer.isBuffer(file)) {
        await wb.xlsx.load(file as any);
      } else {
        throw new Error('Không tìm thấy dữ liệu file tải lên');
      }
    } else {
      const filePath = path.join(process.cwd(), '..', 'docs', 'MALOI.xlsx');
      if (!fs.existsSync(filePath)) {
        throw new Error(`Không tìm thấy file MALOI.xlsx tại ${filePath}`);
      }
      wb = new ExcelJS.Workbook();
      await wb.xlsx.readFile(filePath);
    }

    let added = 0;

    // Helper
    const parseFloatSafe = (val: any) => {
      if (typeof val === 'number') return val;
      if (typeof val === 'string')
        return parseFloat(val.replace(/,/g, '')) || 0;
      return 0;
    };

    // 1. ND340
    if (wb.getWorksheet('ND340_Codebook_Moi')) {
      const rows = (function (sheetName) {
        const ws = wb.getWorksheet(sheetName);
        if (!ws) return [];
        const data: any[][] = [];
        ws.eachRow((row) => {
          data.push(Array.isArray(row.values) ? row.values.slice(1) : []);
        });
        return data;
      })('ND340_Codebook_Moi');
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[4]) continue; // L3_code is at index 4
        const exist = await this.defectCodeRepo.findOne({
          where: { code: row[4], dimension: DefectDimension.ND340 },
        });
        if (!exist) {
          await this.defectCodeRepo.save({
            dimension: DefectDimension.ND340,
            l1Code: row[0],
            l1Desc: row[1],
            l2Code: row[2],
            l2Desc: row[3],
            code: row[4],
            description: row[5],
            minFine: parseFloatSafe(row[6]),
            maxFine: parseFloatSafe(row[7]),
            avgFine: parseFloatSafe(row[8]),
          });
          added++;
        }
      }
    }

    // 2. NhanSu
    if (wb.getWorksheet('NhanSu_Codebook_Moi')) {
      const rows = (function (sheetName) {
        const ws = wb.getWorksheet(sheetName);
        if (!ws) return [];
        const data: any[][] = [];
        ws.eachRow((row) => {
          data.push(Array.isArray(row.values) ? row.values.slice(1) : []);
        });
        return data;
      })('NhanSu_Codebook_Moi');
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[4]) continue; // L3_code at 4
        const exist = await this.defectCodeRepo.findOne({
          where: { code: row[4], dimension: DefectDimension.NHANSU },
        });
        if (!exist) {
          await this.defectCodeRepo.save({
            dimension: DefectDimension.NHANSU,
            l1Code: row[0],
            l1Desc: row[1],
            l2Code: row[2],
            l2Desc: row[3],
            code: row[4],
            description: row[5],
            riskLevel: parseInt(row[6]) || 0,
          });
          added++;
        }
      }
    }

    // 3. Internal (PTD_TKBD) + TD
    // We will read PTD_TKBD first.
    if (wb.getWorksheet('PTD_TKBD_Codebook_Moi')) {
      const rows = (function (sheetName) {
        const ws = wb.getWorksheet(sheetName);
        if (!ws) return [];
        const data: any[][] = [];
        ws.eachRow((row) => {
          data.push(Array.isArray(row.values) ? row.values.slice(1) : []);
        });
        return data;
      })('PTD_TKBD_Codebook_Moi');
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[4]) continue; // L3_code at 4
        const exist = await this.defectCodeRepo.findOne({
          where: { code: row[4], dimension: DefectDimension.INTERNAL },
        });
        if (!exist) {
          await this.defectCodeRepo.save({
            dimension: DefectDimension.INTERNAL,
            l1Code: row[0],
            l1Desc: row[1],
            l2Code: row[2],
            l2Desc: row[3],
            code: row[4],
            description: row[5],
            riskLevel: parseInt(row[6]) || 0,
          });
          added++;
        }
      }
    }

    if (wb.getWorksheet('TD_Codebook_Moi')) {
      const rows = (function (sheetName) {
        const ws = wb.getWorksheet(sheetName);
        if (!ws) return [];
        const data: any[][] = [];
        ws.eachRow((row) => {
          data.push(Array.isArray(row.values) ? row.values.slice(1) : []);
        });
        return data;
      })('TD_Codebook_Moi');
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row[4]) continue; // L3_code at 4
        const exist = await this.defectCodeRepo.findOne({
          where: { code: row[4], dimension: DefectDimension.INTERNAL },
        });
        if (!exist) {
          await this.defectCodeRepo.save({
            dimension: DefectDimension.INTERNAL,
            l1Code: row[0],
            l1Desc: row[1],
            l2Code: row[2],
            l2Desc: row[3],
            code: row[4],
            description: row[5],
            riskLevel: parseInt(row[6]) || 0,
          });
          added++;
        }
      }
    }

    // MAP ND340
    if (wb.getWorksheet('MAP_TD_PTD_TKBD_TO_ND340_L123')) {
      const rows = (function (sheetName) {
        const ws = wb.getWorksheet(sheetName);
        if (!ws) return [];
        const data: any[][] = [];
        ws.eachRow((row) => {
          data.push(Array.isArray(row.values) ? row.values.slice(1) : []);
        });
        return data;
      })('MAP_TD_PTD_TKBD_TO_ND340_L123');
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const srcL3 = row[3];
        if (!srcL3) continue;
        const internal = await this.defectCodeRepo.findOne({
          where: { code: srcL3, dimension: DefectDimension.INTERNAL },
        });
        if (internal) {
          const nd340s: any[] = [];
          if (row[8])
            nd340s.push({ code: row[8], desc: row[9], score: row[10] }); // ND340_L3_1
          if (row[13])
            nd340s.push({ code: row[13], desc: row[14], score: row[15] }); // ND340_L3_2
          if (row[18])
            nd340s.push({ code: row[18], desc: row[19], score: row[20] }); // ND340_L3_3
          internal.mappedNd340Suggestions = nd340s;
          await this.defectCodeRepo.save(internal);
        }
      }
    }

    // MAP NhanSu
    if (wb.getWorksheet('MAP_TD_PTD_TKBD_TO_NHANSU')) {
      const rows = (function (sheetName) {
        const ws = wb.getWorksheet(sheetName);
        if (!ws) return [];
        const data: any[][] = [];
        ws.eachRow((row) => {
          data.push(Array.isArray(row.values) ? row.values.slice(1) : []);
        });
        return data;
      })('MAP_TD_PTD_TKBD_TO_NHANSU');
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const srcL3 = row[3];
        if (!srcL3) continue;
        const internal = await this.defectCodeRepo.findOne({
          where: { code: srcL3, dimension: DefectDimension.INTERNAL },
        });
        if (internal) {
          const nhansus: any[] = [];
          if (row[8])
            nhansus.push({
              code: row[8],
              desc: row[9],
              risk: row[10],
              score: row[11],
            }); // NS_L3_1
          if (row[14])
            nhansus.push({
              code: row[14],
              desc: row[15],
              risk: row[16],
              score: row[17],
            }); // NS_L3_2
          if (row[20])
            nhansus.push({
              code: row[20],
              desc: row[21],
              risk: row[22],
              score: row[23],
            }); // NS_L3_3
          internal.mappedNhanSuSuggestions = nhansus;
          await this.defectCodeRepo.save(internal);
        }
      }
    }

    // 5. Support exported defect catalog format (e.g. Defect_Codes_Export.xlsx)
    const exportSheet = wb.getWorksheet('Sheet1') || wb.worksheets[0];
    if (exportSheet && added === 0) {
      const headerRow = exportSheet.getRow(1);
      const hValues = Array.isArray(headerRow.values)
        ? headerRow.values.map((v: any) => String(v || '').toLowerCase())
        : [];
      const isExportFormat = hValues.some(
        (h: string) =>
          h.includes('dimension') ||
          h.includes('mã lỗi') ||
          h.includes('l3 code'),
      );

      if (isExportFormat) {
        const rowsToImport: any[] = [];
        const getCellText = (cell: any): string => {
          const val = cell?.value;
          if (val == null) return '';
          if (typeof val === 'object') {
            if ('text' in val && typeof val.text === 'string') return val.text;
            if ('result' in val && val.result != null)
              return String(val.result);
          }
          return String(val);
        };

        exportSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const dimension = getCellText(row.getCell(1)).trim().toUpperCase();
          const version = getCellText(row.getCell(2)).trim() || '1.0';
          const code = getCellText(row.getCell(3)).trim();
          const description = getCellText(row.getCell(4)).trim();
          const l2Code = getCellText(row.getCell(5)).trim();
          const l2Desc = getCellText(row.getCell(6)).trim();
          const l1Code = getCellText(row.getCell(7)).trim();
          const l1Desc = getCellText(row.getCell(8)).trim();
          const riskLevel =
            parseInt(getCellText(row.getCell(9)) || '0', 10) || 0;
          const avgFine = parseFloatSafe(row.getCell(10).value);
          const maxFine = parseFloatSafe(row.getCell(11).value);

          if (code) {
            let dimEnum = DefectDimension.INTERNAL;
            if (dimension.includes('ND340') || dimension.includes('340'))
              dimEnum = DefectDimension.ND340;
            else if (
              dimension.includes('NHANSU') ||
              dimension.includes('NHÂN SỰ')
            )
              dimEnum = DefectDimension.NHANSU;

            rowsToImport.push({
              dimension: dimEnum,
              version,
              code,
              description,
              l2Code,
              l2Desc,
              l1Code,
              l1Desc,
              riskLevel,
              avgFine,
              maxFine,
              isActive: true,
            });
          }
        });

        for (const item of rowsToImport) {
          const exist = await this.defectCodeRepo.findOne({
            where: { code: item.code, dimension: item.dimension },
          });
          if (!exist) {
            await this.defectCodeRepo.save(item);
            added++;
          }
        }
      }
    }

    return { added, success: true };
  }

  /**
   * Nạp và đồng bộ toàn bộ 3-in-1 Danh mục lỗi thực tế, Nghị định 340 và Kỷ luật Nhân sự từ 'maloimap_v3.xlsx'
   */
  async importActualDefectCatalog(filePath?: string) {
    let actualPath = filePath;
    if (!actualPath) {
      const p3 = path.resolve(process.cwd(), '../docs/THUCTE/maloimap_v3.xlsx');
      const p2 = path.resolve(process.cwd(), '../docs/THUCTE/maloimap_v2.xlsx');
      const pOld = path.resolve(
        process.cwd(),
        '../docs/THUCTE/Danh mục lỗi ĐVKD.xlsx',
      );

      if (fs.existsSync(p3)) actualPath = p3;
      else if (fs.existsSync(p2)) actualPath = p2;
      else if (fs.existsSync(pOld)) actualPath = pOld;
    }

    if (!actualPath || !fs.existsSync(actualPath)) {
      throw new Error(`Không tìm thấy file danh mục lỗi tại: ${actualPath}`);
    }

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(actualPath);

    let insertedCount = 0;
    let updatedCount = 0;

    // 1. Nạp TỪ ĐIỂN NGHỊ ĐỊNH 340 (ND340)
    const wsND = wb.getWorksheet('TỪ ĐIỂN NGHỊ ĐỊNH (ND)');
    if (wsND) {
      for (let r = 2; r <= wsND.rowCount; r++) {
        const row = wsND.getRow(r);
        const code = getExcelCellString(row.getCell(1).value);
        const oldCode = getExcelCellString(row.getCell(2).value);
        const l1Code = getExcelCellString(row.getCell(3).value);
        const l1Desc = getExcelCellString(row.getCell(4).value);
        const l2Code = getExcelCellString(row.getCell(5).value);
        const l2Desc = getExcelCellString(row.getCell(6).value);
        const l3Desc = getExcelCellString(row.getCell(7).value);
        const riskLevel =
          parseInt(getExcelCellString(row.getCell(8).value)) || 2;

        if (!code && !l3Desc) continue;
        const defectCodeVal = code || oldCode || `ND340_${r - 1}`;
        const descVal = l3Desc || l2Desc || l1Desc || defectCodeVal;

        let exist = await this.defectCodeRepo.findOne({
          where: { code: defectCodeVal, dimension: DefectDimension.ND340 },
        });

        if (!exist && oldCode) {
          exist = await this.defectCodeRepo.findOne({
            where: { code: oldCode, dimension: DefectDimension.ND340 },
          });
        }

        if (!exist) {
          exist = this.defectCodeRepo.create({
            dimension: DefectDimension.ND340,
            code: defectCodeVal,
            description: descVal,
            l1Code: l1Code || 'ND',
            l1Desc: l1Desc || 'Nghị định 340',
            l2Code: l2Code || `${l1Code}_L2`,
            l2Desc: l2Desc || '',
            riskLevel,
            version: '3.0-ND340',
            isActive: true,
          });
          insertedCount++;
        } else {
          exist.code = defectCodeVal;
          exist.description = descVal;
          exist.l1Code = l1Code || exist.l1Code;
          exist.l1Desc = l1Desc || exist.l1Desc;
          exist.l2Code = l2Code || exist.l2Code;
          exist.l2Desc = l2Desc || exist.l2Desc;
          exist.riskLevel = riskLevel;
          exist.version = '3.0-ND340';
          updatedCount++;
        }
        await this.defectCodeRepo.save(exist);
      }
    }

    // 2. Nạp TỪ ĐIỂN NHÂN SỰ (NHANSU)
    const wsNS = wb.getWorksheet('TỪ ĐIỂN NHÂN SỰ (NS)');
    if (wsNS) {
      for (let r = 2; r <= wsNS.rowCount; r++) {
        const row = wsNS.getRow(r);
        const code = getExcelCellString(row.getCell(1).value);
        const oldCode = getExcelCellString(row.getCell(2).value);
        const l1Code = getExcelCellString(row.getCell(3).value);
        const l1Desc = getExcelCellString(row.getCell(4).value);
        const l2Code = getExcelCellString(row.getCell(5).value);
        const l2Desc = getExcelCellString(row.getCell(6).value);
        const l3Desc = getExcelCellString(row.getCell(7).value);
        const riskLevel =
          parseInt(getExcelCellString(row.getCell(8).value)) || 2;

        if (!code && !l3Desc) continue;
        const defectCodeVal = code || oldCode || `NS_${r - 1}`;
        const descVal = l3Desc || l2Desc || l1Desc || defectCodeVal;

        let exist = await this.defectCodeRepo.findOne({
          where: { code: defectCodeVal, dimension: DefectDimension.NHANSU },
        });

        if (!exist && oldCode) {
          exist = await this.defectCodeRepo.findOne({
            where: { code: oldCode, dimension: DefectDimension.NHANSU },
          });
        }

        if (!exist) {
          exist = this.defectCodeRepo.create({
            dimension: DefectDimension.NHANSU,
            code: defectCodeVal,
            description: descVal,
            l1Code: l1Code || 'NS',
            l1Desc: l1Desc || 'Kỷ luật nhân sự',
            l2Code: l2Code || `${l1Code}_L2`,
            l2Desc: l2Desc || '',
            riskLevel,
            version: '3.0-NHANSU',
            isActive: true,
          });
          insertedCount++;
        } else {
          exist.code = defectCodeVal;
          exist.description = descVal;
          exist.l1Code = l1Code || exist.l1Code;
          exist.l1Desc = l1Desc || exist.l1Desc;
          exist.l2Code = l2Code || exist.l2Code;
          exist.l2Desc = l2Desc || exist.l2Desc;
          exist.riskLevel = riskLevel;
          exist.version = '3.0-NHANSU';
          updatedCount++;
        }
        await this.defectCodeRepo.save(exist);
      }
    }

    // 3. Nạp DANH MỤC LỖI TỔNG HỢP 3 IN 1 (INTERNAL) KÈM GỢI Ý MAPPING
    const ws3in1 = wb.getWorksheet('DANH MỤC LỖI TỔNG HỢP 3 IN 1');
    if (ws3in1) {
      for (let r = 2; r <= ws3in1.rowCount; r++) {
        const row = ws3in1.getRow(r);
        const codeThucTe = getExcelCellString(row.getCell(1).value);
        const mangNghiepVu = getExcelCellString(row.getCell(2).value);
        const l1 = getExcelCellString(row.getCell(3).value);
        const l2 = getExcelCellString(row.getCell(4).value);
        const l3 = getExcelCellString(row.getCell(5).value);
        const maKT = getExcelCellString(row.getCell(6).value);
        const riskLevel =
          parseInt(getExcelCellString(row.getCell(7).value)) || 2;
        const maNS = getExcelCellString(row.getCell(8).value);
        const descNS = getExcelCellString(row.getCell(9).value);
        const maND = getExcelCellString(row.getCell(10).value);
        const descND = getExcelCellString(row.getCell(11).value);

        if (!codeThucTe && !l3) continue;
        const finalCode = codeThucTe || maKT || `INT_${r - 1}`;
        const mappedNd340Suggestions = maND
          ? [{ code: maND, desc: descND, score: 0.95 }]
          : [];
        const mappedNhanSuSuggestions = maNS
          ? [{ code: maNS, desc: descNS, risk: riskLevel, score: 0.95 }]
          : [];

        let exist = await this.defectCodeRepo.findOne({
          where: { code: finalCode, dimension: DefectDimension.INTERNAL },
        });

        if (!exist) {
          exist = this.defectCodeRepo.create({
            dimension: DefectDimension.INTERNAL,
            code: finalCode,
            description: l3,
            l1Code: mangNghiepVu || 'INTERNAL',
            l1Desc: l1,
            l2Code: `${mangNghiepVu}_L2`,
            l2Desc: l2,
            riskLevel,
            mappedNd340Suggestions,
            mappedNhanSuSuggestions,
            version: '3.0-THUCTE',
            isActive: true,
          });
          insertedCount++;
        } else {
          exist.description = l3;
          exist.l1Desc = l1;
          exist.l2Desc = l2;
          exist.riskLevel = riskLevel;
          exist.mappedNd340Suggestions = mappedNd340Suggestions;
          exist.mappedNhanSuSuggestions = mappedNhanSuSuggestions;
          exist.version = '3.0-THUCTE';
          updatedCount++;
        }
        await this.defectCodeRepo.save(exist);
      }
    }

    this.logger.log(
      `Đã đồng bộ Danh mục lỗi 3-in-1: Thêm mới ${insertedCount}, Cập nhật ${updatedCount} bản ghi.`,
    );

    return {
      success: true,
      insertedCount,
      updatedCount,
      totalProcessed: insertedCount + updatedCount,
    };
  }

  async exportDefectCodes() {
    return this.defectClassifierService.exportDefectCodes();
  }

  async issueNewDefectCode(dto: any, username: string) {
    return this.defectClassifierService.issueNewDefectCode(dto, username);
  }
}
