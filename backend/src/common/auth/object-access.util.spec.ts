import {
  assertCanAccessWorkingPaper,
  assertCanAccessFinding,
  assertCanAccessRecommendation,
  assertCanAccessEvidence,
  assertCanAccessFileLink,
  isUserInTeamMembers,
} from './object-access.util';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('Object-Level Authorization & IDOR Protection (object-access.util)', () => {
  describe('isUserInTeamMembers', () => {
    it('nhận diện đúng thành viên trong mảng object jsonb', () => {
      const members = [
        { userId: 10, fullName: 'Nguyễn Văn A' },
        { id: 20, fullName: 'Trần Thị B' },
      ];
      expect(isUserInTeamMembers(members, 10)).toBe(true);
      expect(isUserInTeamMembers(members, 20)).toBe(true);
      expect(isUserInTeamMembers(members, 99)).toBe(false);
    });

    it('nhận diện đúng khi teamMembers lưu dưới dạng chuỗi JSON thô', () => {
      const jsonStr = '[{"userId": 15, "role": "ktv"}]';
      expect(isUserInTeamMembers(jsonStr, 15)).toBe(true);
      expect(isUserInTeamMembers(jsonStr, 16)).toBe(false);
    });

    it('trả về false an toàn khi dữ liệu rỗng hoặc sai định dạng', () => {
      expect(isUserInTeamMembers(null, 10)).toBe(false);
      expect(isUserInTeamMembers(undefined, 10)).toBe(false);
      expect(isUserInTeamMembers('invalid json', 10)).toBe(false);
      expect(isUserInTeamMembers([], 10)).toBe(false);
    });
  });

  describe('assertCanAccessWorkingPaper (Chống IDOR trên Giấy tờ làm việc)', () => {
    const mockWp = {
      id: 101,
      title: 'WP Tín dụng CN Cần Thơ',
      creatorId: 5,
      reviewerId: 6,
      status: 'Draft',
      workstream: {
        assignedAuditorId: 5,
        reviewerId: 6,
      },
      engagement: {
        id: 20,
        leadAuditorId: 6,
        teamMembers: [{ userId: 5 }, { userId: 6 }, { userId: 7 }],
      },
    };

    it('cho phép Quản trị viên (Admin) và Lãnh đạo Khối toàn quyền truy cập', () => {
      const admin = { userId: 1, role: 'Quản trị viên hệ thống' };
      const cae = { userId: 2, role: 'Trưởng ban KTNB' };
      expect(() => assertCanAccessWorkingPaper(mockWp, admin, 'READ')).not.toThrow();
      expect(() => assertCanAccessWorkingPaper(mockWp, cae, 'UPDATE')).not.toThrow();
      expect(() => assertCanAccessWorkingPaper(mockWp, admin, 'DELETE')).not.toThrow();
    });

    it('chặn tuyệt đối Ban Kiểm soát (BKS) truy cập Working Paper nội bộ', () => {
      const bks = { userId: 99, role: 'Thành viên Ban Kiểm soát' };
      expect(() => assertCanAccessWorkingPaper(mockWp, bks, 'READ')).toThrow(ForbiddenException);
    });

    it('chặn tuyệt đối Đơn vị được kiểm toán (Auditee) truy cập Working Paper', () => {
      const auditee = { userId: 88, role: 'Đơn vị được kiểm toán' };
      expect(() => assertCanAccessWorkingPaper(mockWp, auditee, 'READ')).toThrow(ForbiddenException);
    });

    it('chặn KTV của đoàn khác (IDOR Attack) truy cập Working Paper', () => {
      const outsideAuditor = { userId: 999, role: 'Kiểm toán viên' };
      expect(() => assertCanAccessWorkingPaper(mockWp, outsideAuditor, 'READ')).toThrow(ForbiddenException);
      expect(() => assertCanAccessWorkingPaper(mockWp, outsideAuditor, 'UPDATE')).toThrow(ForbiddenException);
    });

    it('cho phép người lập (creator) đọc và sửa WP của mình', () => {
      const creator = { userId: 5, role: 'Kiểm toán viên' };
      expect(() => assertCanAccessWorkingPaper(mockWp, creator, 'READ')).not.toThrow();
      expect(() => assertCanAccessWorkingPaper(mockWp, creator, 'UPDATE')).not.toThrow();
    });

    it('cho phép Trưởng đoàn (leadAuditor) đọc, duyệt và xóa WP', () => {
      const lead = { userId: 6, role: 'Trưởng đoàn kiểm toán' };
      expect(() => assertCanAccessWorkingPaper(mockWp, lead, 'READ')).not.toThrow();
      expect(() => assertCanAccessWorkingPaper(mockWp, lead, 'UPDATE')).not.toThrow();
      expect(() => assertCanAccessWorkingPaper(mockWp, lead, 'DELETE')).not.toThrow();
    });

    it('thành viên khác trong đoàn (userId: 7) chỉ được đọc, không được sửa WP của KTV khác', () => {
      const teamMember = { userId: 7, role: 'Kiểm toán viên' };
      expect(() => assertCanAccessWorkingPaper(mockWp, teamMember, 'READ')).not.toThrow();
      expect(() => assertCanAccessWorkingPaper(mockWp, teamMember, 'UPDATE')).toThrow(ForbiddenException);
    });
  });

  describe('assertCanAccessFinding (Chống IDOR trên Phát hiện kiểm toán)', () => {
    const mockFinding = {
      id: 301,
      findingTitle: 'Vi phạm giải ngân chưa công chứng TSBĐ',
      status: 'Draft',
      engagement: {
        id: 10,
        leadAuditorId: 50,
        legacyAuditedDepartment: 'Chi nhánh Hà Nội',
        teamMembers: [{ userId: 50 }, { userId: 51 }],
      },
    };

    it('Auditee chi nhánh khác (Chi nhánh Đà Nẵng) bị chặn khi cố xem phát hiện (IDOR)', () => {
      const auditeeDaNang = {
        userId: 101,
        role: 'Đơn vị được kiểm toán',
        legacyDepartment: 'Chi nhánh Đà Nẵng',
      };
      expect(() => assertCanAccessFinding(mockFinding, auditeeDaNang, 'READ')).toThrow(ForbiddenException);
    });

    it('Auditee đúng chi nhánh (Chi nhánh Hà Nội) được xem phát hiện', () => {
      const auditeeHaNoi = {
        userId: 102,
        role: 'Đơn vị được kiểm toán',
        legacyDepartment: 'Chi nhánh Hà Nội',
      };
      expect(() => assertCanAccessFinding(mockFinding, auditeeHaNoi, 'READ')).not.toThrow();
    });

    it('Auditee bị chặn tuyệt đối khi cố UPDATE hoặc DELETE phát hiện', () => {
      const auditeeHaNoi = {
        userId: 102,
        role: 'Đơn vị được kiểm toán',
        legacyDepartment: 'Chi nhánh Hà Nội',
      };
      expect(() => assertCanAccessFinding(mockFinding, auditeeHaNoi, 'UPDATE')).toThrow(ForbiddenException);
      expect(() => assertCanAccessFinding(mockFinding, auditeeHaNoi, 'DELETE')).toThrow(ForbiddenException);
    });

    it('BKS bị chặn khi cố xem phát hiện đang Draft', () => {
      const bks = { userId: 200, role: 'Ban kiểm soát' };
      expect(() => assertCanAccessFinding(mockFinding, bks, 'READ')).toThrow(ForbiddenException);
    });

    it('BKS được xem phát hiện khi đã Reported / Closed', () => {
      const reportedFinding = { ...mockFinding, status: 'Reported' };
      const bks = { userId: 200, role: 'Ban kiểm soát' };
      expect(() => assertCanAccessFinding(reportedFinding, bks, 'READ')).not.toThrow();
    });

    it('KTV ngoài đoàn bị chặn khi cố truy cập phát hiện của đoàn khác', () => {
      const outsideKtv = { userId: 999, role: 'Kiểm toán viên' };
      expect(() => assertCanAccessFinding(mockFinding, outsideKtv, 'READ')).toThrow(ForbiddenException);
    });
  });

  describe('assertCanAccessRecommendation (Chống IDOR trên Kiến nghị kiểm toán)', () => {
    const mockRec = {
      id: 501,
      recommendation: 'Bổ sung đăng ký giao dịch bảo đảm',
      legacyDepartment: 'Phòng Tín dụng - CN Hà Nội',
      assignedToId: 60,
    };

    it('Auditee phòng ban khác cố cập nhật tiến độ kiến nghị bị chặn (IDOR)', () => {
      const auditeeKhac = {
        userId: 80,
        role: 'Đơn vị được kiểm toán',
        legacyDepartment: 'Phòng Kế toán - CN Hà Nội',
      };
      expect(() => assertCanAccessRecommendation(mockRec, auditeeKhac, 'UPDATE')).toThrow(ForbiddenException);
    });

    it('Auditee đúng phòng ban được cập nhật tiến độ', () => {
      const auditeeDung = {
        userId: 81,
        role: 'Đơn vị được kiểm toán',
        legacyDepartment: 'Phòng Tín dụng - CN Hà Nội',
      };
      expect(() => assertCanAccessRecommendation(mockRec, auditeeDung, 'UPDATE')).not.toThrow();
    });

    it('Auditee không có thẩm quyền CLOSE kiến nghị', () => {
      const auditeeDung = {
        userId: 81,
        role: 'Đơn vị được kiểm toán',
        legacyDepartment: 'Phòng Tín dụng - CN Hà Nội',
      };
      expect(() => assertCanAccessRecommendation(mockRec, auditeeDung, 'CLOSE')).toThrow(ForbiddenException);
    });
  });

  describe('assertCanAccessEvidence (Chống IDOR trên Bằng chứng kiểm toán)', () => {
    const mockWpEvidence = {
      id: 701,
      linkedResource: 'working_papers',
      linkedResourceId: 200,
      uploadedBy: 15,
    };

    it('chặn Auditee tải bằng chứng của working paper nội bộ', () => {
      const auditee = { userId: 88, role: 'Đơn vị được kiểm toán' };
      expect(() => assertCanAccessEvidence(mockWpEvidence, auditee, 'READ')).toThrow(ForbiddenException);
    });

    it('chặn Ban Kiểm soát tải bằng chứng của working paper nội bộ', () => {
      const bks = { userId: 89, role: 'Ban Kiểm soát' };
      expect(() => assertCanAccessEvidence(mockWpEvidence, bks, 'READ')).toThrow(ForbiddenException);
    });

    it('cho phép KTV tải bằng chứng working paper', () => {
      const ktv = { userId: 15, role: 'Kiểm toán viên' };
      expect(() => assertCanAccessEvidence(mockWpEvidence, ktv, 'READ')).not.toThrow();
    });

    it('chặn KTV khác xóa bằng chứng không phải do mình tải lên', () => {
      const otherKtv = { userId: 99, role: 'Kiểm toán viên' };
      expect(() => assertCanAccessEvidence(mockWpEvidence, otherKtv, 'DELETE')).toThrow(ForbiddenException);
    });

    it('cho phép người tải lên xóa bằng chứng của mình', () => {
      const uploader = { userId: 15, role: 'Kiểm toán viên' };
      expect(() => assertCanAccessEvidence(mockWpEvidence, uploader, 'DELETE')).not.toThrow();
    });
  });

  describe('assertCanAccessFileLink (Chống IDOR trên File Assets & Liên kết)', () => {
    const mockFileLink = {
      id: 801,
      ownerType: 'working_papers',
      ownerId: 200,
      metadata: {
        uploaderSnapshot: {
          linkedByUserId: 15,
        },
      },
    };

    it('chặn Auditee tải file của working paper', () => {
      const auditee = { userId: 88, role: 'Đơn vị được kiểm toán' };
      expect(() => assertCanAccessFileLink(mockFileLink, auditee, 'READ')).toThrow(ForbiddenException);
    });

    it('chặn người khác gỡ liên kết file (DELETE)', () => {
      const otherUser = { userId: 99, role: 'Kiểm toán viên' };
      expect(() => assertCanAccessFileLink(mockFileLink, otherUser, 'DELETE')).toThrow(ForbiddenException);
    });

    it('cho phép uploader hoặc admin gỡ liên kết file', () => {
      const uploader = { userId: 15, role: 'Kiểm toán viên' };
      const admin = { userId: 1, role: 'Admin' };
      expect(() => assertCanAccessFileLink(mockFileLink, uploader, 'DELETE')).not.toThrow();
      expect(() => assertCanAccessFileLink(mockFileLink, admin, 'DELETE')).not.toThrow();
    });
  });
});
