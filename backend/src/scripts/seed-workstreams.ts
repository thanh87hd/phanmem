import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditEngagement } from '../audit-engagements/entities/audit-engagement.entity';
import { AuditWorkstream } from '../audit-engagements/entities/audit-workstream.entity';
import { WorkingPaper } from '../working-papers/entities/working-paper.entity';
import { User } from '../users/entities/user.entity';

async function run() {
  console.log('🚀 Khởi tạo ứng dụng để seed Workstreams...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const engagementRepo = app.get<Repository<AuditEngagement>>(
    getRepositoryToken(AuditEngagement),
  );
  const workstreamRepo = app.get<Repository<AuditWorkstream>>(
    getRepositoryToken(AuditWorkstream),
  );
  const wpRepo = app.get<Repository<WorkingPaper>>(
    getRepositoryToken(WorkingPaper),
  );
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const users = await userRepo.find();
  const adminUser = users.find((u) => u.username === 'admin') || users[0];
  const ktvUser = users.find((u) => u.username !== 'admin') || adminUser;

  const engagements = await engagementRepo.find();
  console.log(`Tìm thấy ${engagements.length} cuộc kiểm toán.`);

  if (engagements.length === 0) {
    console.log('Không có cuộc kiểm toán nào.');
    await app.close();
    return;
  }

  // Workstream definitions per engagement topic
  const standardWorkstreamsData = [
    {
      matchKeyword: 'tín dụng',
      workstreams: [
        {
          title: 'Phần hành Thẩm định & Cấp tín dụng Doanh nghiệp',
          scope:
            'Kiểm tra quy trình thẩm định tín dụng, tính xác thực của phương án vay vốn và thẩm quyền phê duyệt hạn mức',
          riskArea: 'Rủi ro tín dụng & Cấp tín dụng vượt thẩm quyền',
          status: 'Reviewed',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
        {
          title: 'Phần hành Kiểm tra Quản lý & Định giá Tài sản bảo đảm',
          scope:
            'Đánh giá tính hợp pháp, tính thanh khoản và việc đăng ký giao dịch bảo đảm đối với BĐS, cổ phiếu cầm cố',
          riskArea: 'Rủi ro định giá TSBĐ khống / định giá cao hơn thị trường',
          status: 'InProgress',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
        {
          title:
            'Phần hành Giám sát sau vay & Phân loại nợ theo Thông tư 31/NHNN',
          scope:
            'Kiểm tra việc kiểm tra mục đích sử dụng vốn vay định kỳ và phân loại nợ, trích lập DPRR',
          riskArea: 'Che giấu nợ xấu và chậm trễ phân loại nợ',
          status: 'InProgress',
          assignedAuditorName: adminUser?.fullName || 'Lê Kiểm Toán Viên',
          assignedAuditorId: adminUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
        {
          title:
            'Phần hành Kiểm tra Tuân thủ Giới hạn cấp tín dụng & Bên liên quan',
          scope:
            'Đối soát hạn mức cho vay tối đa đối với một khách hàng và nhóm người có liên quan theo Luật TCTD',
          riskArea: 'Vi phạm hạn mức tín dụng nhóm liên quan',
          status: 'Draft',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
      ],
    },
    {
      matchKeyword: 'thanh toán',
      workstreams: [
        {
          title:
            'Phần hành Giao dịch Thanh toán liên ngân hàng & Quốc tế (SWIFT/Napas)',
          scope:
            'Kiểm tra chứng từ chuyển tiền lớn, điện SWIFT và đối chiếu số dư tài khoản Nostro/Vostro',
          riskArea: 'Gian lận điện chuyển tiền & Rò rỉ khóa bảo mật',
          status: 'Reviewed',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
        {
          title:
            'Phần hành Quản lý Kho quỹ, Tiếp quỹ ATM & Tiền mặt tại Chi nhánh',
          scope:
            'Kiểm kê đột xuất tồn quỹ thực tế, quy trình đóng mở kho và kiểm soát niêm phong két sắt',
          riskArea: 'Thất thoát tiền mặt và thiếu hụt quỹ kiểm kê',
          status: 'Completed',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
        {
          title: 'Phần hành Kiểm soát Thấu chi & Phát hành Thẻ tín dụng',
          scope:
            'Kiểm tra hồ sơ mở thẻ, cấp hạn mức thấu chi và kiểm soát gian lận giao dịch thẻ e-Commerce',
          riskArea: 'Gian lận thẻ & mở thẻ khống',
          status: 'InProgress',
          assignedAuditorName: adminUser?.fullName || 'Lê Kiểm Toán Viên',
          assignedAuditorId: adminUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
      ],
    },
    {
      matchKeyword: 'vận hành',
      workstreams: [
        {
          title:
            'Phần hành Hạch toán & Đối chiếu Tài khoản trung gian, Treo chờ xử lý',
          scope:
            'Rà soát số dư các tài khoản treo quá hạn, tài khoản chênh lệch kiểm kê và chứng từ kế toán cuối ngày',
          riskArea:
            'Tồn đọng tài khoản trung gian che giấu chi phí hoặc sai sót số dư',
          status: 'Reviewed',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
        {
          title:
            'Phần hành Quản lý Chi phí hoạt động, Mua sắm & Đầu tư tài sản',
          scope:
            'Kiểm tra tính hợp lệ của hóa đơn điện tử, quy trình đấu thầu chào giá và nghiệm thu tài sản',
          riskArea: 'Thất thoát ngân sách chi tiêu và sai phạm đấu thầu',
          status: 'InProgress',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
        {
          title: 'Phần hành Kiểm soát Chấm công, Tiền lương & Trích nộp BHXH',
          scope:
            'Kiểm tra hồ sơ nhân sự, bảng chấm công và tính toán trích nộp thuế TNCN',
          riskArea: 'Sai sót chi trả tiền lương và vi phạm luật lao động',
          status: 'Draft',
          assignedAuditorName: adminUser?.fullName || 'Lê Kiểm Toán Viên',
          assignedAuditorId: adminUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
      ],
    },
    {
      matchKeyword: 'core',
      workstreams: [
        {
          title:
            'Phần hành Quản lý Tài khoản đặc quyền (Privileged Access) Core Banking',
          scope:
            'Kiểm tra danh sách user DBA, Root, can thiệp tham số hệ thống và lịch sử phê duyệt phân quyền',
          riskArea: 'Lạm dụng quyền quản trị viên can thiệp CSDL trái phép',
          status: 'Reviewed',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
        {
          title:
            'Phần hành Sao lưu dự phòng, Khôi phục thảm họa (DRP) & An toàn mạng',
          scope:
            'Kiểm tra kế hoạch DR drill, snapshot DB hằng ngày và cấu hình tường lửa',
          riskArea: 'Mất mát dữ liệu khi sự cố và gián đoạn hoạt động liên tục',
          status: 'InProgress',
          assignedAuditorName: ktvUser?.fullName || 'Nguyễn Văn Kiểm Toán',
          assignedAuditorId: ktvUser?.id,
          reviewerName: adminUser?.fullName || 'Trần Trưởng Đoàn',
          reviewerId: adminUser?.id,
        },
      ],
    },
  ];

  for (const eng of engagements) {
    const existingWs = await workstreamRepo.find({
      where: { engagementId: eng.id },
    });
    const engTitle = eng.name || '';
    if (existingWs.length > 0) {
      console.log(
        `Cuộc KT #${eng.id} (${engTitle}) đã có ${existingWs.length} workstreams, bỏ qua.`,
      );
      continue;
    }

    const engName = engTitle.toLowerCase();
    let template = standardWorkstreamsData.find((t) =>
      engName.includes(t.matchKeyword),
    );
    if (!template) {
      template = standardWorkstreamsData[0];
    }

    console.log(
      `Tạo ${template.workstreams.length} workstreams cho Cuộc KT #${eng.id} (${engTitle})...`,
    );
    for (const wsInfo of template.workstreams) {
      const newWs = workstreamRepo.create({
        engagementId: eng.id,
        title: wsInfo.title,
        scope: wsInfo.scope,
        riskArea: wsInfo.riskArea,
        status: wsInfo.status,
        assignedAuditorId: wsInfo.assignedAuditorId,
        assignedAuditorName: wsInfo.assignedAuditorName,
        reviewerId: wsInfo.reviewerId,
        reviewerName: wsInfo.reviewerName,
      });
      const savedWs = await workstreamRepo.save(newWs);

      // Link any matching unlinked working papers
      const wps = await wpRepo.find({ where: { engagementId: eng.id } });
      for (const wp of wps) {
        if (!wp.workstreamId) {
          const wpTitle = (wp.title || '').toLowerCase();
          const wsKey = wsInfo.title.toLowerCase();
          if (
            (wpTitle.includes('tín dụng') && wsKey.includes('tín dụng')) ||
            (wpTitle.includes('ngân quỹ') && wsKey.includes('ngân quỹ')) ||
            (wpTitle.includes('hạch toán') && wsKey.includes('hạch toán')) ||
            (wpTitle.includes('core') && wsKey.includes('core')) ||
            (wpTitle.includes('quyền') && wsKey.includes('quyền'))
          ) {
            wp.workstreamId = savedWs.id;
            await wpRepo.save(wp);
            console.log(
              `  -> Đã liên kết W/P #${wp.id} (${wp.title}) vào Phần hành #${savedWs.id}`,
            );
          }
        }
      }
    }
  }

  console.log('✅ Hoàn tất seed Workstreams thành công!');
  await app.close();
}

run().catch((err) => {
  console.error('❌ Lỗi khi seed workstreams:', err);
  process.exit(1);
});
