import { ForbiddenException, NotFoundException } from '@nestjs/common';
import {
  isAdminRole,
  isLanhDaoRole,
  isBKSRole,
  isAuditeeRole,
  isTeamLeadRole,
} from '../../utils/role-checker.util';

export interface ObjectAuthUserContext {
  userId?: number;
  id?: number;
  username?: string;
  fullName?: string;
  role?: string | { name?: string };
  jobTitle?: string;
  department?: string;
  legacyDepartment?: string;
  teamCode?: string;
}

/**
 * Kiểm tra người dùng có quyền quản trị đặc quyền (Admin, CAE, Lãnh đạo Khối)
 */
export function isPrivilegedRole(role?: unknown, jobTitle?: string): boolean {
  const roleStr =
    typeof role === 'string'
      ? role
      : typeof role === 'object' && role && 'name' in role
        ? String((role as { name?: string }).name || '')
        : '';
  return (
    isAdminRole(roleStr) ||
    isLanhDaoRole(roleStr) ||
    (jobTitle ? jobTitle.toLowerCase().includes('giám đốc khối') : false)
  );
}

/**
 * Kiểm tra userId có nằm trong mảng jsonb `teamMembers` của AuditEngagement không
 */
export function isUserInTeamMembers(
  teamMembers: unknown,
  userId?: number | null,
): boolean {
  if (!userId || !teamMembers) return false;
  let members = teamMembers;
  if (typeof teamMembers === 'string') {
    try {
      members = JSON.parse(teamMembers);
    } catch {
      return false;
    }
  }
  if (!Array.isArray(members)) return false;
  return members.some((m: any) => {
    if (!m) return false;
    const mId = m.userId ?? m.id;
    return Number(mId) === Number(userId);
  });
}

/**
 * Trích xuất chuỗi role dạng string từ context user
 */
export function extractRoleString(user?: ObjectAuthUserContext | null): string {
  if (!user || !user.role) return '';
  return typeof user.role === 'string'
    ? user.role
    : typeof user.role === 'object' && 'name' in user.role
      ? String((user.role as { name?: string }).name || '')
      : '';
}

/**
 * BẢO MẬT ĐỐI TƯỢNG (OBJECT-LEVEL AUTHORIZATION): Giấy tờ làm việc kiểm toán (Working Paper)
 * Chống lỗ hổng IDOR / BOLA (OWASP API1:2023)
 */
export function assertCanAccessWorkingPaper(
  wp: any,
  user?: ObjectAuthUserContext | null,
  action: 'READ' | 'UPDATE' | 'DELETE' = 'READ',
): void {
  if (!wp) {
    throw new NotFoundException('Không tìm thấy Giấy tờ làm việc');
  }

  // Khi không có thông tin user, cho phép gọi nội bộ nếu không trong ngữ cảnh HTTP
  if (!user || (!user.userId && !user.id)) {
    return;
  }

  const userId = Number(user.userId || user.id);
  const roleStr = extractRoleString(user);

  // 1. Quản trị viên / Lãnh đạo Khối có toàn quyền
  if (isPrivilegedRole(roleStr, user.jobTitle)) {
    return;
  }

  // 2. Ban Kiểm soát bị chặn tuyệt đối khỏi hồ sơ nháp/giấy tờ làm việc nội bộ
  if (isBKSRole(roleStr)) {
    throw new ForbiddenException(
      'Ban Kiểm soát không có quyền truy cập Giấy tờ làm việc chi tiết của Đoàn kiểm toán.',
    );
  }

  // 3. Đơn vị được kiểm toán (Auditee) bị chặn tuyệt đối khỏi Giấy tờ làm việc
  if (isAuditeeRole(roleStr)) {
    throw new ForbiddenException(
      'Đơn vị được kiểm toán không có quyền truy cập Giấy tờ làm việc của Đoàn kiểm toán.',
    );
  }

  // 4. Kiểm tra mối liên hệ giữa Kiểm toán viên và Giấy tờ làm việc
  const hasOwnershipData =
    Boolean(wp.creatorId) ||
    Boolean(wp.reviewerId) ||
    Boolean(wp.engagement) ||
    Boolean(wp.engagementId) ||
    Boolean(wp.workstream) ||
    Boolean(wp.workstreamId);

  if (hasOwnershipData) {
    const isCreator = Number(wp.creatorId) === userId;
    const isReviewer = Number(wp.reviewerId) === userId;
    const isWorkstreamAuditor =
      Number(wp.workstream?.assignedAuditorId) === userId;
    const isWorkstreamReviewer = Number(wp.workstream?.reviewerId) === userId;
    const isLeadAuditor = Number(wp.engagement?.leadAuditorId) === userId;
    const isInTeam = isUserInTeamMembers(wp.engagement?.teamMembers, userId);

    const hasAccessToEngagement =
      isCreator ||
      isReviewer ||
      isWorkstreamAuditor ||
      isWorkstreamReviewer ||
      isLeadAuditor ||
      isInTeam;

    if (!hasAccessToEngagement) {
      throw new ForbiddenException(
        'Bạn không thuộc Đoàn kiểm toán phụ trách hoặc không có quyền truy cập Giấy tờ làm việc này (IDOR Protection).',
      );
    }

    // Phân quyền cho thao tác UPDATE
    if (action === 'UPDATE') {
      const canUpdate =
        isCreator ||
        isReviewer ||
        isWorkstreamAuditor ||
        isWorkstreamReviewer ||
        isLeadAuditor;
      if (!canUpdate) {
        throw new ForbiddenException(
          'Bạn là thành viên đoàn nhưng không phải người lập, người soát xét hoặc Trưởng đoàn phụ trách Giấy tờ làm việc này.',
        );
      }
    }

    // Phân quyền cho thao tác DELETE
    if (action === 'DELETE') {
      const canDelete =
        isLeadAuditor || (isCreator && wp.status === 'Draft');
      if (!canDelete) {
        throw new ForbiddenException(
          'Chỉ Trưởng đoàn kiểm toán hoặc người lập khi ở trạng thái Dự thảo (Draft) mới có quyền xóa Giấy tờ làm việc này.',
        );
      }
    }
  }
}

/**
 * BẢO MẬT ĐỐI TƯỢNG (OBJECT-LEVEL AUTHORIZATION): Phát hiện kiểm toán (Audit Finding)
 * Chống lỗ hổng IDOR / BOLA (OWASP API1:2023)
 */
export function assertCanAccessFinding(
  finding: any,
  user?: ObjectAuthUserContext | null,
  action: 'READ' | 'UPDATE' | 'DELETE' = 'READ',
): void {
  if (!finding) {
    throw new NotFoundException('Không tìm thấy Phát hiện kiểm toán');
  }

  if (!user || (!user.userId && !user.id)) {
    return;
  }

  const userId = Number(user.userId || user.id);
  const roleStr = extractRoleString(user);

  // 1. Quản trị viên / Lãnh đạo Khối có toàn quyền
  if (isPrivilegedRole(roleStr, user.jobTitle)) {
    return;
  }

  const isAuditee = isAuditeeRole(roleStr);
  const isBKS = isBKSRole(roleStr);

  // 2. Kiểm tra quyền của Đơn vị được kiểm toán (Auditee)
  if (isAuditee) {
    if (action === 'UPDATE' || action === 'DELETE') {
      throw new ForbiddenException(
        'Đơn vị được kiểm toán không có quyền chỉnh sửa hoặc xóa Phát hiện kiểm toán. Vui lòng gửi giải trình qua Cổng ĐVĐKT.',
      );
    }
    // Auditee chỉ được xem nếu phát hiện thuộc đúng phòng ban/chi nhánh của mình
    const auditeeDept = (user.legacyDepartment || user.department || '').trim().toLowerCase();
    const findingDept = (
      finding.engagement?.legacyAuditedDepartment ||
      finding.managingBranch?.name ||
      finding.recommendationTarget ||
      ''
    ).trim().toLowerCase();

    if (!auditeeDept || !findingDept || (!findingDept.includes(auditeeDept) && !auditeeDept.includes(findingDept))) {
      throw new ForbiddenException(
        'Đơn vị chỉ có quyền xem phát hiện kiểm toán thuộc phạm vi quản lý của đơn vị mình (IDOR Protection).',
      );
    }
    return;
  }

  // 3. Kiểm tra quyền của Ban Kiểm soát (BKS)
  if (isBKS) {
    if (action === 'UPDATE' || action === 'DELETE') {
      throw new ForbiddenException(
        'Ban Kiểm soát không có quyền chỉnh sửa hoặc xóa Phát hiện kiểm toán.',
      );
    }
    // BKS chỉ được xem phát hiện đã hoàn tất soát xét / báo cáo chính thức
    const officialStatuses = ['Confirmed', 'Reported', 'Closed'];
    if (!officialStatuses.includes(finding.status)) {
      throw new ForbiddenException(
        'Ban Kiểm soát chỉ có quyền giám sát các Phát hiện kiểm toán đã được soát xét và báo cáo chính thức.',
      );
    }
    return;
  }

  // 4. Kiểm toán viên nội bộ
  const hasOwnershipData =
    Boolean(finding.engagement) ||
    Boolean(finding.engagementId) ||
    Boolean(finding.creatorId) ||
    Boolean(finding.proposerUser) ||
    Boolean(finding.workingPaper);

  if (hasOwnershipData) {
    const isLeadAuditor = Number(finding.engagement?.leadAuditorId) === userId;
    const isInTeam = isUserInTeamMembers(finding.engagement?.teamMembers, userId);
    const isCreator =
      Number(finding.creatorId) === userId ||
      Number(finding.proposerUser?.id) === userId ||
      Number(finding.workingPaper?.creatorId) === userId;

    const hasAccess = isLeadAuditor || isInTeam || isCreator;
    if (!hasAccess) {
      throw new ForbiddenException(
        'Bạn không thuộc Đoàn kiểm toán phụ trách phát hiện này (IDOR Protection).',
      );
    }

    if (action === 'DELETE') {
      if (!isLeadAuditor) {
        throw new ForbiddenException(
          'Chỉ Trưởng đoàn kiểm toán hoặc Quản trị viên mới có quyền xóa phát hiện kiểm toán.',
        );
      }
    }
  }
}

/**
 * BẢO MẬT ĐỐI TƯỢNG (OBJECT-LEVEL AUTHORIZATION): Kiến nghị kiểm toán (Recommendation)
 * Chống lỗ hổng IDOR / BOLA (OWASP API1:2023)
 */
export function assertCanAccessRecommendation(
  rec: any,
  user?: ObjectAuthUserContext | null,
  action: 'READ' | 'UPDATE' | 'CLOSE' = 'READ',
): void {
  if (!rec) {
    throw new NotFoundException('Không tìm thấy Kiến nghị kiểm toán');
  }

  if (!user || (!user.userId && !user.id)) {
    return;
  }

  const userId = Number(user.userId || user.id);
  const roleStr = extractRoleString(user);

  // 1. Quản trị viên / Lãnh đạo Khối có toàn quyền
  if (isPrivilegedRole(roleStr, user.jobTitle)) {
    return;
  }

  const isAuditee = isAuditeeRole(roleStr);

  // 2. Đơn vị được kiểm toán (Auditee)
  if (isAuditee) {
    if (action === 'CLOSE') {
      throw new ForbiddenException(
        'Đơn vị được kiểm toán không có quyền đóng hoặc xác nhận hoàn thành Kiến nghị kiểm toán. Thẩm quyền thuộc về KTNB.',
      );
    }
    const auditeeDept = (user.legacyDepartment || user.department || '').trim().toLowerCase();
    const recDept = (
      rec.legacyDepartment ||
      rec.department ||
      rec.responsibleParty ||
      ''
    ).trim().toLowerCase();

    if (!auditeeDept || !recDept || (!recDept.includes(auditeeDept) && !auditeeDept.includes(recDept))) {
      throw new ForbiddenException(
        'Đơn vị chỉ có quyền truy cập và báo cáo tiến độ cho các Kiến nghị gửi tới đơn vị mình (IDOR Protection).',
      );
    }
    return;
  }

  // 3. Ban Kiểm soát (Read-only)
  if (isBKSRole(roleStr)) {
    if (action === 'UPDATE' || action === 'CLOSE') {
      throw new ForbiddenException(
        'Ban Kiểm soát chỉ có quyền giám sát tiến độ Kiến nghị, không được trực tiếp cập nhật trạng thái.',
      );
    }
    return;
  }

  // 4. Kiểm toán viên nội bộ
  const finding = rec.auditFinding || rec.finding;
  const hasOwnershipData =
    Boolean(rec.assignedToId) ||
    Boolean(finding?.engagement) ||
    Boolean(finding?.engagementId);

  if (hasOwnershipData && action !== 'READ') {
    const isAssigned = Number(rec.assignedToId) === userId;
    const isLead = Number(finding?.engagement?.leadAuditorId) === userId;
    const isInTeam = isUserInTeamMembers(finding?.engagement?.teamMembers, userId);

    const hasAccess = isAssigned || isLead || isInTeam;
    if (!hasAccess) {
      throw new ForbiddenException(
        'Bạn không thuộc đoàn kiểm toán hoặc không được phân công theo dõi kiến nghị này.',
      );
    }
  }
}

/**
 * BẢO MẬT ĐỐI TƯỢNG (OBJECT-LEVEL AUTHORIZATION): Tài liệu / Bằng chứng kiểm toán (Evidence)
 * Chống lỗ hổng IDOR / BOLA (OWASP API1:2023)
 */
export function assertCanAccessEvidence(
  evidence: any,
  user?: ObjectAuthUserContext | null,
  action: 'READ' | 'DELETE' = 'READ',
): void {
  if (!evidence) {
    throw new NotFoundException('Không tìm thấy tài liệu bằng chứng');
  }

  if (!user || (!user.userId && !user.id)) {
    return;
  }

  const userId = Number(user.userId || user.id);
  const roleStr = extractRoleString(user);

  // 1. Quản trị viên / Lãnh đạo Khối có toàn quyền
  if (isPrivilegedRole(roleStr, user.jobTitle)) {
    return;
  }

  const isAuditee = isAuditeeRole(roleStr);
  const isBKS = isBKSRole(roleStr);
  const resource = (evidence.linkedResource || '').toString().toLowerCase();

  // 2. Chặn Auditee và BKS truy cập bằng chứng của Giấy tờ làm việc nội bộ
  if (
    resource.includes('working_paper') ||
    resource.includes('workingpaper') ||
    resource.includes('working-paper')
  ) {
    if (isAuditee) {
      throw new ForbiddenException(
        'Đơn vị được kiểm toán không có quyền truy cập bằng chứng Giấy tờ làm việc nội bộ.',
      );
    }
    if (isBKS) {
      throw new ForbiddenException(
        'Ban Kiểm soát không có quyền truy cập bằng chứng Giấy tờ làm việc nội bộ của Đoàn kiểm toán.',
      );
    }
  }

  // 3. Phân quyền thao tác DELETE
  if (action === 'DELETE') {
    const isUploader = Number(evidence.uploadedBy) === userId;
    if (!isUploader) {
      throw new ForbiddenException(
        'Bạn không phải người tải lên và không có quyền xóa tệp bằng chứng này.',
      );
    }
  }
}

/**
 * BẢO MẬT ĐỐI TƯỢNG (OBJECT-LEVEL AUTHORIZATION): Liên kết tệp (FileLink / FileAsset)
 * Chống lỗ hổng IDOR / BOLA (OWASP API1:2023)
 */
export function assertCanAccessFileLink(
  link: any,
  user?: ObjectAuthUserContext | null,
  action: 'READ' | 'DELETE' = 'READ',
): void {
  if (!link) {
    throw new NotFoundException('Không tìm thấy liên kết tệp');
  }

  if (!user || (!user.userId && !user.id)) {
    return;
  }

  const userId = Number(user.userId || user.id);
  const roleStr = extractRoleString(user);

  // 1. Quản trị viên / Lãnh đạo Khối có toàn quyền
  if (isPrivilegedRole(roleStr, user.jobTitle)) {
    return;
  }

  const isAuditee = isAuditeeRole(roleStr);
  const isBKS = isBKSRole(roleStr);
  const ownerType = (link.ownerType || '').toString().toLowerCase();

  // 2. Chặn Auditee và BKS truy cập file của Giấy tờ làm việc nội bộ
  if (
    ownerType.includes('working_paper') ||
    ownerType.includes('workingpaper') ||
    ownerType.includes('working-paper')
  ) {
    if (isAuditee) {
      throw new ForbiddenException(
        'Đơn vị được kiểm toán không có quyền truy cập tệp đính kèm Giấy tờ làm việc nội bộ.',
      );
    }
    if (isBKS) {
      throw new ForbiddenException(
        'Ban Kiểm soát không có quyền truy cập tệp đính kèm Giấy tờ làm việc nội bộ của Đoàn kiểm toán.',
      );
    }
  }

  // 3. Phân quyền thao tác DELETE (gỡ liên kết)
  if (action === 'DELETE') {
    const linkedBy = Number(
      link.metadata?.uploaderSnapshot?.linkedByUserId ||
        link.metadata?.uploaderSnapshot?.userId,
    );
    const isLinker = linkedBy === userId;
    if (!isLinker && linkedBy > 0) {
      throw new ForbiddenException(
        'Chỉ người gắn liên kết hoặc Quản trị viên mới có quyền gỡ liên kết tệp này.',
      );
    }
  }
}
