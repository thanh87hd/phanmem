import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Department } from '../departments/entities/department.entity';
import { AuditUniverse } from '../audit-universe/entities/audit-universe.entity';
import { RcsaAssessment } from '../risk-assessments/entities/rcsa-assessment.entity';
import { AuditPlan } from '../audit-plans/entities/audit-plan.entity';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { AuditFinding } from '../audit-findings/entities/audit-finding.entity';
import { Recommendation } from '../recommendations/entities/recommendation.entity';
import { KpiAssessment } from '../kpi/entities/kpi-assessment.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { faker } from '@faker-js/faker';

async function bootstrap() {
  console.log('Khởi tạo application context...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const roleRepo = app.get<Repository<Role>>(getRepositoryToken(Role));
  const auditUniverseRepo = app.get<Repository<AuditUniverse>>(
    getRepositoryToken(AuditUniverse),
  );
  const rcsaRepo = app.get<Repository<RcsaAssessment>>(
    getRepositoryToken(RcsaAssessment),
  );
  const auditPlanRepo = app.get<Repository<AuditPlan>>(
    getRepositoryToken(AuditPlan),
  );
  const engagementRepo = app.get<Repository<AuditEngagement>>(
    getRepositoryToken(AuditEngagement),
  );
  const workstreamRepo = app.get<Repository<AuditWorkstream>>(
    getRepositoryToken(AuditWorkstream),
  );
  const wpRepo = app.get<Repository<WorkingPaper>>(
    getRepositoryToken(WorkingPaper),
  );
  const findingRepo = app.get<Repository<AuditFinding>>(
    getRepositoryToken(AuditFinding),
  );
  const recRepo = app.get<Repository<Recommendation>>(
    getRepositoryToken(Recommendation),
  );
  const kpiRepo = app.get<Repository<KpiAssessment>>(
    getRepositoryToken(KpiAssessment),
  );

  console.log('Bắt đầu sinh dữ liệu Mock Exam (Append Mode)...');

  // 1. Tạo Users nếu thiếu
  const roles = await roleRepo.find();
  const ktvRole =
    roles.find(
      (r) => r.name.includes('Kiểm toán viên') || r.name.includes('KTV'),
    ) || roles[0];

  const ktvUsers = await userRepo.find({ where: { role: { id: ktvRole.id } } });
  if (ktvUsers.length < 5) {
    for (let i = 0; i < 5; i++) {
      const uData = {
        username: faker.internet.username(),
        fullName: faker.person.fullName(),
        email: faker.internet.email(),
        passwordHash: 'Password@123',
        department: `Phòng KT ${faker.number.int({ min: 1, max: 3 })}`,
        teamCode: `KT${faker.number.int({ min: 1, max: 3 })}`,
        role: ktvRole,
      };
      const u = await userRepo.save(uData as any);
      ktvUsers.push(u);
    }
  }

  // 2. Tạo Audit Universe
  const processes = [
    'Cho vay KHCN',
    'Huy động vốn',
    'Thanh toán quốc tế',
    'Quản lý kho quỹ',
    'Bảo lãnh',
    'Thẻ tín dụng',
  ];
  const universeItems: any[] = [];
  for (const proc of processes) {
    const itemData = {
      code: `AU-${faker.string.alphanumeric(5).toUpperCase()}`,
      name: proc,
      description: faker.lorem.sentence(),
      category: 'Quy trình',
      status: 'Active',
      riskScore: faker.number.float({ min: 1, max: 5, fractionDigits: 1 }),
    };
    const saved = await auditUniverseRepo.save(itemData as any);
    universeItems.push(saved);

    // RCSA Assessment
    const rcsaData = {
      departmentName: 'Khối Bán Lẻ',
      auditUniverseId: saved.id,
      processName: proc,
      riskDescription: faker.lorem.sentence(),
      controlName: `Control ${faker.string.alphanumeric(3)}`,
      inherentRisk: faker.number.int({ min: 2, max: 5 }),
      controlEffectiveness: faker.helpers.arrayElement([
        'Strong',
        'Adequate',
        'Weak',
      ]),
      residualRisk: faker.number.int({ min: 1, max: 3 }),
      assessedByUsername: ktvUsers[0].username,
    };
    await rcsaRepo.save(rcsaData as any);
  }

  // 3. Annual Plan & Engagements
  const planData = {
    year: new Date().getFullYear(),
    name: `Kế hoạch Kiểm toán ${new Date().getFullYear()}`,
    status: 'Approved',
    description: 'Generated Mock Plan',
    approvedBy: 1,
  };
  const savedPlan = await auditPlanRepo.save(planData as any);

  const engagements: any[] = [];
  for (let i = 0; i < 3; i++) {
    const au = faker.helpers.arrayElement(universeItems);
    const engData = {
      plan: savedPlan,
      code: `ENG-${new Date().getFullYear()}-${faker.string.numeric(3)}`,
      name: `Kiểm toán ${au.name} ${faker.location.city()}`,
      status: faker.helpers.arrayElement([
        'In Progress',
        'Completed',
        'Planned',
      ]),
      description: faker.lorem.paragraph(),
      progressPercentage: faker.number.int({ min: 10, max: 100 }),
    };
    const savedEng = await engagementRepo.save(engData as any);
    engagements.push(savedEng);

    // 4. Workstreams & Working Papers
    const workstreams: any[] = [];
    for (let j = 0; j < 2; j++) {
      const wsData = {
        engagement: savedEng,
        title: `Kiểm tra ${faker.commerce.department()}`,
        status: faker.helpers.arrayElement(['Open', 'In Progress', 'Done']),
      };
      const savedWs = await workstreamRepo.save(wsData as any);
      workstreams.push(savedWs);

      for (let k = 0; k < 3; k++) {
        const creator = faker.helpers.arrayElement(ktvUsers);
        const wpData = {
          workstream: savedWs,
          engagement: savedEng,
          title: `GTLV: Kiểm tra mẫu ${faker.number.int({ min: 10, max: 50 })} HS`,
          referenceCode: `WP-${savedEng.code}-${k + 1}`,
          status: faker.helpers.arrayElement([
            'Draft',
            'Submitted',
            'Approved',
          ]),
        };
        const savedWp = await wpRepo.save(wpData as any);

        // 5. Audit Findings (50% chance)
        if (Math.random() > 0.5) {
          const findingData = {
            engagement: savedEng,
            workingPaper: savedWp,
            findingCode: `FIND-${savedEng.code}-${faker.number.int({ min: 1, max: 100 })}`,
            findingTitle: `Phát hiện: ${faker.hacker.phrase()}`,
            condition: faker.lorem.paragraph(),
            cause: faker.lorem.sentence(),
            consequence: faker.lorem.sentence(),
            recommendation: `Kiến nghị: ${faker.company.catchPhrase()}`,
            riskLevel: faker.helpers.arrayElement(['High', 'Medium', 'Low']),
            status: faker.helpers.arrayElement(['Open', 'Closed', 'Draft']),
          };
          const savedFinding = await findingRepo.save(findingData as any);

          // 6. Recommendations
          if (
            savedFinding.status === 'Closed' ||
            savedEng.status === 'Completed'
          ) {
            const recData = {
              findingId: savedFinding.id,
              finding: savedFinding.findingTitle,
              recommendation: `Kiến nghị: ${faker.company.catchPhrase()}`,
              status: faker.helpers.arrayElement(['Open', 'Overdue', 'Closed']),
              assignedToId: creator.id,
              assignedTo: creator.fullName,
            };
            await recRepo.save(recData as any);
          }
        }
      }
    }
  }

  // 7. KPI & HR
  for (const u of ktvUsers) {
    const kpiData = {
      user: u,
      userId: u.id,
      username: u.username,
      fullName: u.fullName,
      department: 'Phòng Kiểm toán Nội bộ',
      period: `Q${faker.number.int({ min: 1, max: 4 })}/${new Date().getFullYear()}`,
      totalScore: faker.number.float({ min: 60, max: 100, fractionDigits: 1 }),
      xepLoai: faker.helpers.arrayElement(['Xuất sắc', 'Tốt', 'Khá']),
      status: faker.helpers.arrayElement(['Draft', 'Submitted', 'Approved']),
    };
    await kpiRepo.save(kpiData as any);
  }

  console.log('✅ Đã tạo dữ liệu Mock Exam thành công!');
  await app.close();
}

bootstrap().catch((err) => {
  console.error('❌ Lỗi khi tạo dữ liệu:', err);
  process.exit(1);
});
