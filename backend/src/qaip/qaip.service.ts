import { Injectable, OnModuleInit, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EqaAssessment } from './entities/eqa.entity';
import { QaipSurvey } from './entities/qaip-survey.entity';
import { IqaAssessment } from './entities/iqa-assessment.entity';

@Injectable()
export class QaipService implements OnModuleInit {
  private readonly logger = new Logger(QaipService.name);

  constructor(
    @InjectRepository(EqaAssessment)
    private eqaRepo: Repository<EqaAssessment>,
    @InjectRepository(QaipSurvey)
    private surveyRepo: Repository<QaipSurvey>,
    @InjectRepository(IqaAssessment)
    private iqaRepo: Repository<IqaAssessment>,
  ) {}

  async onModuleInit() {
    try {
      const eqaCount = await this.eqaRepo.count();
    if (eqaCount === 0) {
      await this.eqaRepo.save({
        title: 'Đánh giá Chất lượng Độc lập (EQA) 2021',
        evaluator: 'PwC Vietnam',
        dateConducted: '2021-10-15',
        nextDueDate: '2026-10-15',
        status: 'Completed',
        conformityLevel: 'Generally Conforms',
      });
    }

    const surveyCount = await this.surveyRepo.count();
    if (surveyCount === 0) {
      await this.surveyRepo.save([
        {
          engagementName: 'Kiểm toán Tín dụng Hội sở',
          departmentName: 'Khối Tín dụng',
          ratingProfessionalism: 5,
          ratingCommunication: 4,
          ratingValueAdded: 4,
          averageScore: 4.33,
          feedback: 'Đoàn kiểm toán làm việc chuyên nghiệp, kiến nghị thực tế.',
        },
        {
          engagementName: 'Kiểm toán CNTT',
          departmentName: 'Trung tâm CNTT',
          ratingProfessionalism: 4,
          ratingCommunication: 5,
          ratingValueAdded: 5,
          averageScore: 4.67,
          feedback: 'Phát hiện kịp thời lỗ hổng bảo mật.',
        },
      ]);
    }

    const iqaCount = await this.iqaRepo.count();
    if (iqaCount === 0) {
      await this.iqaRepo.save({
        title: 'Đánh giá Chất lượng Nội bộ (IQA) Đoàn Kiểm toán 2025',
        assessmentYear: 2025,
        assessmentPeriod: 'Annual',
        engagementName: 'Kiểm toán Hoạt động Tín dụng Hội sở 2025',
        assessorName: 'Phạm Đức Thành',
        overallScore: 92.5,
        conformityLevel: 'Generally Conforms',
        strengths: 'Tuân thủ chặt chẽ 5C trong lập phát hiện, thu thập bằng chứng đầy đủ.',
        areasForImprovement: 'Cần rút ngắn thời gian phát hành báo cáo chính thức.',
        wpFirstTimeApprovalRate: 88.5,
        avgReworkCount: 0.8,
        budgetVariance: 4.2,
        timelinessRate: 95.0,
        status: 'Approved',
        criteria: [
          {
            criterionId: 'IIA-STD-5.1',
            criterionName: 'Lập kế hoạch cuộc kiểm toán',
            maxScore: 20,
            actualScore: 19,
            notes: 'Kế hoạch chi tiết, đánh giá rủi ro đầy đủ',
          },
          {
            criterionId: 'IIA-STD-5.3',
            criterionName: 'Chất lượng giấy tờ làm việc',
            maxScore: 30,
            actualScore: 28,
            notes: 'Hồ sơ lưu trữ đúng Four-Eyes principle',
          },
          {
            criterionId: 'IIA-STD-6.1',
            criterionName: 'Chất lượng phát hiện 5C',
            maxScore: 30,
            actualScore: 28,
            notes: 'Đầy đủ Condition, Criteria, Cause, Consequence, Correction',
          },
          {
            criterionId: 'IIA-STD-6.2',
            criterionName: 'Thời hạn phát hành báo cáo',
            maxScore: 20,
            actualScore: 17.5,
            notes: 'Phát hành đúng hạn trong vòng 15 ngày sau kết thúc fieldwork',
          },
        ],
        actionItems: [
          {
            item: 'Tổ chức tập huấn rút ngắn quy trình soát xét báo cáo',
            assignee: 'Trưởng đoàn kiểm toán',
            dueDate: '2026-06-30',
            status: 'InProgress',
          },
        ],
      });
    }
    } catch (err: any) {
      this.logger.warn(`QaipService onModuleInit skipped seeding: ${err.message}`);
    }
  }

  // EQA
  getEqas() {
    return this.eqaRepo.find({ order: { dateConducted: 'DESC' } });
  }

  createEqa(data: Partial<EqaAssessment>) {
    return this.eqaRepo.save(this.eqaRepo.create(data));
  }

  // Surveys
  getSurveys() {
    return this.surveyRepo.find({ order: { createdAt: 'DESC' } });
  }

  createSurvey(data: Partial<QaipSurvey>) {
    const p = data.ratingProfessionalism || 0;
    const c = data.ratingCommunication || 0;
    const v = data.ratingValueAdded || 0;
    const avg = (p + c + v) / 3;
    const survey = this.surveyRepo.create({
      ...data,
      averageScore: Number(avg.toFixed(2)),
    });
    return this.surveyRepo.save(survey);
  }

  async getSurveyStats() {
    const surveys = await this.surveyRepo.find();
    if (surveys.length === 0) return { averageScore: 0, count: 0 };

    const totalScore = surveys.reduce((sum, s) => sum + s.averageScore, 0);
    return {
      averageScore: Number((totalScore / surveys.length).toFixed(2)),
      count: surveys.length,
    };
  }

  // ===== IIA Standard 4.1: Internal Quality Assessment (IQA) =====
  getIqas(year?: number) {
    const query = this.iqaRepo.createQueryBuilder('iqa');
    if (year) {
      query.where('iqa.assessmentYear = :year', { year });
    }
    return query.orderBy('iqa.createdAt', 'DESC').getMany();
  }

  async getIqa(id: number): Promise<IqaAssessment> {
    const iqa = await this.iqaRepo.findOne({ where: { id } });
    if (!iqa) throw new NotFoundException(`IQA Assessment #${id} not found`);
    return iqa;
  }

  createIqa(data: Partial<IqaAssessment>, user?: any): Promise<IqaAssessment> {
    const entity = this.iqaRepo.create({
      ...data,
      assessorId: user?.userId || user?.id || data.assessorId,
      assessorName: user?.fullName || user?.username || data.assessorName,
    });
    return this.iqaRepo.save(entity);
  }

  async updateIqa(id: number, data: Partial<IqaAssessment>): Promise<IqaAssessment> {
    const iqa = await this.getIqa(id);
    Object.assign(iqa, data);
    return this.iqaRepo.save(iqa);
  }

  async deleteIqa(id: number): Promise<void> {
    const iqa = await this.getIqa(id);
    await this.iqaRepo.remove(iqa);
  }

  async getIqaKpis(year?: number) {
    const iqas = await this.getIqas(year);
    if (iqas.length === 0) {
      return {
        totalAssessments: 0,
        avgOverallScore: 0,
        avgWpFirstTimeApprovalRate: 0,
        avgReworkCount: 0,
        avgBudgetVariance: 0,
        avgTimelinessRate: 0,
        conformityDistribution: {
          generallyConforms: 0,
          partiallyConforms: 0,
          doesNotConform: 0,
        },
      };
    }

    const n = iqas.length;
    const sumScore = iqas.reduce((acc, i) => acc + (i.overallScore || 0), 0);
    const sumWp = iqas.reduce((acc, i) => acc + (i.wpFirstTimeApprovalRate || 0), 0);
    const sumRework = iqas.reduce((acc, i) => acc + (i.avgReworkCount || 0), 0);
    const sumVariance = iqas.reduce((acc, i) => acc + (i.budgetVariance || 0), 0);
    const sumTimeliness = iqas.reduce((acc, i) => acc + (i.timelinessRate || 0), 0);

    const conformityDistribution = {
      generallyConforms: iqas.filter((i) => i.conformityLevel === 'Generally Conforms').length,
      partiallyConforms: iqas.filter((i) => i.conformityLevel === 'Partially Conforms').length,
      doesNotConform: iqas.filter((i) => i.conformityLevel === 'Does Not Conform').length,
    };

    return {
      totalAssessments: n,
      avgOverallScore: Number((sumScore / n).toFixed(1)),
      avgWpFirstTimeApprovalRate: Number((sumWp / n).toFixed(1)),
      avgReworkCount: Number((sumRework / n).toFixed(2)),
      avgBudgetVariance: Number((sumVariance / n).toFixed(1)),
      avgTimelinessRate: Number((sumTimeliness / n).toFixed(1)),
      conformityDistribution,
    };
  }
}
