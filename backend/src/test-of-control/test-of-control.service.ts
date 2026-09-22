import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { TestOfControl } from './entities/test-of-control.entity';
import { ControlException } from './entities/control-exception.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';

@Injectable()
export class TestOfControlService {
  constructor(
    @InjectRepository(TestOfControl)
    private readonly tocRepo: Repository<TestOfControl>,
    @InjectRepository(ControlException)
    private readonly excRepo: Repository<ControlException>,
    @InjectRepository(AuditFinding)
    private readonly findingRepo: Repository<AuditFinding>,
  ) {}

  async findAll(query: {
    engagementId?: string;
    result?: string;
    status?: string;
    search?: string;
    limit?: number;
    page?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const qb = this.tocRepo
      .createQueryBuilder('toc')
      .leftJoinAndSelect('toc.exceptions', 'exceptions')
      .orderBy('toc.id', 'ASC')
      .skip(skip)
      .take(limit);

    if (query.engagementId) {
      qb.andWhere('toc.engagementId = :engId', { engId: query.engagementId });
    }

    if (query.result) {
      qb.andWhere('toc.finalResult = :res', { res: query.result });
    }

    if (query.status) {
      qb.andWhere('toc.testStatus = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(toc.testId ILIKE :s OR toc.controlDescription ILIKE :s OR toc.controlOwner ILIKE :s OR toc.riskId ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(testId: string): Promise<TestOfControl> {
    const item = await this.tocRepo.findOne({
      where: { testId },
      relations: ['exceptions'],
    });
    if (!item) {
      throw new NotFoundException(`Test of control ${testId} not found`);
    }
    return item;
  }

  async create(dto: Partial<TestOfControl>): Promise<TestOfControl> {
    const itemsTested = Number(dto.itemsTested) || 0;
    const validExceptions = Number(dto.validExceptions) || 0;
    const exceptionRate = itemsTested > 0 ? validExceptions / itemsTested : 0;
    const tolerableRate = Number(dto.tolerableRate) || 0.05;

    const suggestedResult =
      (validExceptions > 0 && exceptionRate > tolerableRate) ||
      dto.materialException === 'Y'
        ? 'Fail'
        : 'Pass';

    const entity = this.tocRepo.create({
      ...dto,
      exceptionRate,
      suggestedResult,
      finalResult: dto.finalResult || suggestedResult,
    });

    return await this.tocRepo.save(entity);
  }

  async update(
    testId: string,
    dto: Partial<TestOfControl>,
  ): Promise<TestOfControl> {
    const existing = await this.findOne(testId);

    const itemsTested =
      dto.itemsTested !== undefined
        ? Number(dto.itemsTested)
        : existing.itemsTested;
    const validExceptions =
      dto.validExceptions !== undefined
        ? Number(dto.validExceptions)
        : existing.validExceptions;
    const exceptionRate = itemsTested > 0 ? validExceptions / itemsTested : 0;
    const tolerableRate =
      dto.tolerableRate !== undefined
        ? Number(dto.tolerableRate)
        : existing.tolerableRate;

    const material =
      dto.materialException !== undefined
        ? dto.materialException
        : existing.materialException;
    const suggestedResult =
      (validExceptions > 0 && exceptionRate > tolerableRate) || material === 'Y'
        ? 'Fail'
        : 'Pass';

    Object.assign(existing, {
      ...dto,
      itemsTested,
      validExceptions,
      exceptionRate,
      suggestedResult,
      finalResult: dto.finalResult || suggestedResult,
    });

    return await this.tocRepo.save(existing);
  }

  async addException(
    testId: string,
    excDto: Partial<ControlException>,
  ): Promise<ControlException> {
    const test = await this.findOne(testId);

    const exc = this.excRepo.create({
      ...excDto,
      testId: test.testId,
      exceptionId:
        excDto.exceptionId || `EXC-${Date.now().toString().slice(-6)}`,
    });

    const savedExc = await this.excRepo.save(exc);

    // Recompute TOC counts
    const allExceptions = await this.excRepo.find({ where: { testId } });
    const validCount = allExceptions.filter(
      (e) => e.validException === 'Y',
    ).length;

    test.validExceptions = validCount;
    test.exceptionRate =
      test.itemsTested > 0 ? validCount / test.itemsTested : 0;
    if (
      test.exceptionRate > test.tolerableRate ||
      test.materialException === 'Y'
    ) {
      test.suggestedResult = 'Fail';
    }
    if (validCount > 0) {
      test.issueRequired = 'Y';
    }
    await this.tocRepo.save(test);

    return savedExc;
  }

  async generateFindingFromException(
    exceptionId: string,
  ): Promise<AuditFinding> {
    const exc = await this.excRepo.findOne({ where: { exceptionId } });
    if (!exc) {
      throw new NotFoundException(`Exception ${exceptionId} not found`);
    }

    const test = await this.tocRepo.findOne({ where: { testId: exc.testId } });

    // Generate finding code
    const findingCode = `ISS-TOC-${Date.now().toString().slice(-6)}`;

    // Map risk level based on financial exposure & materiality
    let riskLevel = 'Medium';
    if (
      Number(exc.financialExposure) > 5000000000 ||
      exc.regulatoryImpact === 'Y'
    ) {
      riskLevel = 'High';
    }
    if (Number(exc.financialExposure) > 20000000000) {
      riskLevel = 'Critical';
    }

    const finding = this.findingRepo.create({
      findingTitle: `[Ngoại lệ TOC] ${exc.exceptionDescription || test?.controlDescription || 'Phát hiện ngoại lệ kiểm soát'}`,
      findingCode,
      condition: exc.exceptionDescription || '',
      criteria: exc.criteriaBreached || test?.criteria || '',
      cause:
        exc.auditorValidation ||
        exc.managementExplanation ||
        test?.rootCauseAssessment ||
        '',
      consequence: exc.riskImpact || test?.riskImpactAssessment || '',
      recommendation: `Khắc phục nguyên nhân gốc rễ và củng cố kiểm soát ${test?.controlId || ''}: ${test?.controlDescription || ''}`,
      riskLevel,
      status: 'Open',
      financialExposure: Number(exc.financialExposure) || 0,
      channel: 'TOC',
      riskGroupGeneral: test?.riskId || 'Operational Risk',
    });

    const savedFinding = await this.findingRepo.save(finding);

    // Link back to Exception and TOC
    exc.issueId = findingCode;
    await this.excRepo.save(exc);

    if (test && !test.issueId) {
      test.issueId = findingCode;
      test.issueRequired = 'Y';
      await this.tocRepo.save(test);
    }

    return savedFinding;
  }

  async getSummaryStats() {
    const totalTests = await this.tocRepo.count();
    const passCount = await this.tocRepo.count({
      where: { finalResult: 'Pass' },
    });
    const failCount = await this.tocRepo.count({
      where: { finalResult: 'Fail' },
    });
    const pendingCount = totalTests - passCount - failCount;

    const totalExceptions = await this.excRepo.count();
    const validExceptions = await this.excRepo.count({
      where: { validException: 'Y' },
    });

    const totalExposureRes = await this.excRepo
      .createQueryBuilder('exc')
      .select('SUM(exc.financialExposure)', 'total')
      .getRawOne();

    return {
      totalTests,
      passCount,
      failCount,
      pendingCount,
      passRate: totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0,
      totalExceptions,
      validExceptions,
      totalFinancialExposure: Number(totalExposureRes?.total) || 0,
    };
  }
}
