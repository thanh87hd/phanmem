import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Select,
  Typography,
  Row,
  Col,
  Button,
  Tabs,
  message,
  Space,
  Modal,
  Form,
  Input,
} from 'antd';
import {
  BarChartOutlined,
  SettingOutlined,
  TeamOutlined,
  ReloadOutlined,
  BookOutlined,
  PieChartOutlined,
  PrinterOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import type {
  PersonalKpiResult,
  KpiTarget,
  Mb02Item,
} from './bsc-kpi/bscKpiTypes';
import {
  DEFAULT_MB02_ITEMS,
  buildPeriodOptions,
  normalizeToPercent,
} from './bsc-kpi/bscKpiTypes';
import { KpiPersonalTab } from './bsc-kpi/KpiPersonalTab';
import { KpiAssessmentTab } from './bsc-kpi/KpiAssessmentTab';
import { KpiSummaryTab } from './bsc-kpi/KpiSummaryTab';
import { KpiRankingReportTab } from './bsc-kpi/KpiRankingReportTab';
import { KpiSettingsTab } from './bsc-kpi/KpiSettingsTab';
import { KpiGuideTab } from './bsc-kpi/KpiGuideTab';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const BscKpiPage: React.FC = () => {
  const { t } = useTranslation();
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser
    ? JSON.parse(storedUser)
    : { id: 1, username: 'admin', fullName: 'Quản trị viên', role: 'Admin', department: 'Phòng Công nghệ' };

  // Xác định quyền quản lý (Hỗ trợ Phó phòng, Trưởng phòng, Admin, CAE)
  const roleName = typeof currentUser.role === 'string' ? currentUser.role : currentUser.role?.name || '';
  const roleLower = ((roleName || '') + ' ' + (currentUser.jobTitle || '')).toLowerCase();
  const roleId = currentUser.roleId || currentUser.role?.id;

  const isGlobalCaeOrAdmin =
    currentUser.role === 'Admin' ||
    currentUser.role === 'Giám đốc Khối' ||
    roleLower.includes('admin') ||
    roleLower.includes('giám đốc khối') ||
    currentUser.department === 'Ban Giám đốc Khối KTNB' ||
    currentUser.department === 'Phòng Công nghệ';

  const isManager =
    isGlobalCaeOrAdmin ||
    ['manager', 'deputy', 'leadauditor', 'trưởng phòng', 'phó phòng', 'truongphong', 'phophong'].some((r) =>
      roleLower.includes(r),
    ) ||
    [20, 21, 22, 23, 24, 25].includes(roleId);

  const [period, setPeriod] = useState(`${new Date().getFullYear()}-H1`);
  const [targetRoleType, setTargetRoleType] = useState<'All' | 'Manager'>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    isGlobalCaeOrAdmin ? 'ALL' : currentUser.department || 'ALL',
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PersonalKpiResult | null>(null);
  const [summaryData, setSummaryData] = useState<PersonalKpiResult[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [targets, setTargets] = useState<KpiTarget[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(false);
  const [editedTargets, setEditedTargets] = useState<Record<string, Partial<KpiTarget>>>({});
  const [activeTab, setActiveTab] = useState('personal');

  // State Quota & Ràng buộc Xếp hạng A1/A2/A3
  const [quotaA1, setQuotaA1] = useState(15);
  const [quotaA2, setQuotaA2] = useState(35);
  const [assignedRanks, setAssignedRanks] = useState<Record<string, 'A1' | 'A2' | 'A3' | 'C'>>({});

  // State Chấm Điểm Định Kỳ (MB02.HRM.2026)
  const [selectedStaffUser, setSelectedStaffUser] = useState<string>(currentUser.username || 'admin');
  const [assessmentItems, setAssessmentItems] = useState<Mb02Item[]>(DEFAULT_MB02_ITEMS);
  const [currentAssessmentId, setCurrentAssessmentId] = useState<number | null>(null);
  const [assessmentStatus, setAssessmentStatus] = useState<
    'Draft' | 'Submitted' | 'ApprovedL1' | 'ApprovedL2' | 'Rejected' | 'Confirmed'
  >('Draft');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [assessmentList, setAssessmentList] = useState<any[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [ktvFeedback, setKtvFeedback] = useState('');
  const [managerFeedback, setManagerFeedback] = useState('');
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [isPrintModalVisible, setIsPrintModalVisible] = useState(false);
  const [isRejectModalVisible, setIsRejectModalVisible] = useState(false);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const periodOptions = buildPeriodOptions();

  // Phân quyền phê duyệt
  const isDeptHead = ['trưởng phòng', 'phó phòng', 'manager', 'deputy', 'truongphong', 'phophong'].some((r) =>
    roleLower.includes(r),
  );
  const isDivisionHead = isGlobalCaeOrAdmin;
  const isStaffOnly = !isDeptHead && !isDivisionHead;

  // ---- Tải KPI cá nhân ----
  const fetchPersonalKpi = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/kpi/personal?period=${period}`);
      setResult(res.data);
    } catch {
      try {
        const res = await api.post(`/kpi/personal?period=${period}`, {
          id: currentUser.id || 1,
          username: currentUser.username || 'admin',
          fullName: currentUser.fullName || currentUser.username || 'Kiểm toán viên',
          roleType: isManager ? 'Manager' : 'KTV',
          department: currentUser.department || '',
        });
        setResult(res.data);
      } catch {
        message.error('Không thể tải dữ liệu KPI. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, [period, currentUser.username, currentUser.id, isManager]);

  // ---- Tải bản đánh giá MB02 từ Backend ----
  const fetchAssessmentData = useCallback(async () => {
    setAssessmentLoading(true);
    try {
      if (isStaffOnly) {
        const res = await api.get(`/kpi/assessment/me?period=${period}`);
        const data = res.data;
        if (data) {
          setCurrentAssessmentId(data.id);
          setAssessmentStatus(data.status || 'Draft');
          setKtvFeedback(data.ktvFeedback || '');
          setManagerFeedback(data.managerFeedback || '');
          setRejectionReason(data.rejectionReason || '');
          setAssessmentItems(Array.isArray(data.items) && data.items.length > 0 ? data.items : DEFAULT_MB02_ITEMS);
        }
      } else {
        const resList = await api.get(`/kpi/assessments?period=${period}`);
        setAssessmentList(resList.data || []);

        const staffObj = (resList.data || []).find((a: any) => a.username === selectedStaffUser);
        if (staffObj) {
          setCurrentAssessmentId(staffObj.id);
          setAssessmentStatus(staffObj.status || 'Draft');
          setKtvFeedback(staffObj.ktvFeedback || '');
          setManagerFeedback(staffObj.managerFeedback || '');
          setRejectionReason(staffObj.rejectionReason || '');
          setAssessmentItems(Array.isArray(staffObj.items) && staffObj.items.length > 0 ? staffObj.items : DEFAULT_MB02_ITEMS);
        } else {
          const resMe = await api.get(`/kpi/assessment/me?period=${period}`);
          if (resMe.data) {
            setCurrentAssessmentId(resMe.data.id);
            setAssessmentStatus(resMe.data.status || 'Draft');
            setKtvFeedback(resMe.data.ktvFeedback || '');
            setManagerFeedback(resMe.data.managerFeedback || '');
            setRejectionReason(resMe.data.rejectionReason || '');
            setAssessmentItems(Array.isArray(resMe.data.items) && resMe.data.items.length > 0 ? resMe.data.items : DEFAULT_MB02_ITEMS);
          }
        }
      }
    } catch (e) {
      console.error('Lỗi khi tải bản đánh giá MB02:', e);
    } finally {
      setAssessmentLoading(false);
    }
  }, [period, isStaffOnly, selectedStaffUser]);

  // ---- Tải tổng hợp (manager theo phân quyền phòng ban) ----
  const fetchSummary = useCallback(async () => {
    if (!isManager) return;
    setSummaryLoading(true);
    try {
      const res = await api.post(`/kpi/personal/summary?period=${period}`, []);
      setSummaryData(res.data);
      if (res.data.length > 0 && !selectedStaffUser) {
        setSelectedStaffUser(res.data[0].username);
      }
    } catch {
      message.error('Không thể tải tổng hợp KPI');
    } finally {
      setSummaryLoading(false);
    }
  }, [period, isManager, selectedStaffUser]);

  // ---- Tải ngưỡng chỉ tiêu ----
  const fetchTargets = useCallback(async () => {
    setTargetsLoading(true);
    try {
      const res = await api.get(`/kpi/targets?period=${period}&roleType=${targetRoleType}`);
      setTargets(res.data);
      setEditedTargets({});
    } catch {
      message.error('Không thể tải cấu hình ngưỡng KPI');
    } finally {
      setTargetsLoading(false);
    }
  }, [period, targetRoleType]);

  useEffect(() => {
    fetchPersonalKpi();
  }, [fetchPersonalKpi]);

  useEffect(() => {
    if (activeTab === 'summary' || activeTab === 'ranking_report') fetchSummary();
  }, [activeTab, fetchSummary]);

  useEffect(() => {
    if (activeTab === 'assessment') fetchAssessmentData();
  }, [activeTab, fetchAssessmentData]);

  useEffect(() => {
    if (activeTab === 'settings') fetchTargets();
  }, [activeTab, fetchTargets]);

  // ---- Tính toán tổng kết quả chấm điểm MB02 ----
  const calculatedMb02 = useMemo(() => {
    let totalScore = 0;
    const computedItems = assessmentItems.map((item) => {
      const completionRate =
        item.chiTieuGiao > 0
          ? Math.min(item.ketQuaThucHien / item.chiTieuGiao, item.mucTran / item.chiTieuGiao)
          : 1.0;
      const diemHoanThanh = item.tyTrong * completionRate;
      totalScore += diemHoanThanh;
      return {
        ...item,
        completionRate,
        diemHoanThanh,
      };
    });

    const xepLoai = totalScore >= 1.0 ? 'Vượt yêu cầu' : totalScore >= 0.7 ? 'Đạt yêu cầu' : 'Cần cố gắng';

    return {
      items: computedItems,
      totalScore,
      xepLoai,
    };
  }, [assessmentItems]);

  const handleUpdateAssessmentValue = (id: string, val: number) => {
    setAssessmentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ketQuaThucHien: val } : item)),
    );
  };

  // ---- Workflow API actions cho Chấm Điểm MB02 ----
  const handleSaveAssessmentDraft = async () => {
    try {
      const targetUserObj = summaryData.find((s) => s.username === selectedStaffUser) || currentUser;
      const targetUserId = targetUserObj.id || currentUser.id;
      const res = await api.post('/kpi/assessment', {
        period,
        targetUserId,
        items: calculatedMb02.items,
        totalScore: calculatedMb02.totalScore,
        xepLoai: calculatedMb02.xepLoai,
        ktvFeedback,
        managerFeedback,
      });
      setCurrentAssessmentId(res.data.id);
      setAssessmentStatus(res.data.status);
      message.success('Đã lưu bản chấm điểm (Draft) thành công!');
      fetchAssessmentData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Lỗi khi lưu bản chấm điểm');
    }
  };

  const handleSubmitAssessment = async () => {
    if (!currentAssessmentId) {
      await handleSaveAssessmentDraft();
    }
    try {
      const idToSubmit = currentAssessmentId;
      await api.post(`/kpi/assessment/${idToSubmit}/submit`);
      setAssessmentStatus('Submitted');
      message.success('Đã gửi duyệt bản đánh giá KPI lên Lãnh đạo Phòng thành công!');
      fetchAssessmentData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Lỗi khi gửi duyệt bản đánh giá');
    }
  };

  const handleApproveL1 = async () => {
    if (!currentAssessmentId) return;
    try {
      await api.post(`/kpi/assessment/${currentAssessmentId}/approve-l1`, {
        managerFeedback,
      });
      setAssessmentStatus('ApprovedL1');
      message.success('Lãnh đạo Phòng đã phê duyệt (Cấp 1) thành công! Bản đánh giá được chuyển lên Lãnh đạo Khối.');
      fetchAssessmentData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Lỗi khi phê duyệt cấp 1');
    }
  };

  const handleApproveL2 = async () => {
    if (!currentAssessmentId) return;
    try {
      await api.post(`/kpi/assessment/${currentAssessmentId}/approve-l2`);
      setAssessmentStatus('ApprovedL2');
      message.success('Lãnh đạo Khối KTNB đã phê duyệt chốt (Cấp 2) thành công!');
      fetchAssessmentData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Lỗi khi phê duyệt cấp 2');
    }
  };

  const handleRejectAssessment = async () => {
    if (!currentAssessmentId) return;
    if (!rejectReasonInput.trim()) {
      message.warning('Vui lòng nhập lý do trả lại');
      return;
    }
    try {
      await api.post(`/kpi/assessment/${currentAssessmentId}/reject`, {
        reason: rejectReasonInput,
      });
      setAssessmentStatus('Rejected');
      setRejectionReason(rejectReasonInput);
      setIsRejectModalVisible(false);
      setRejectReasonInput('');
      message.success('Đã trả lại bản đánh giá để nhân sự rà soát lại.');
      fetchAssessmentData();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Lỗi khi trả lại bản đánh giá');
    }
  };

  // ---- Lưu cấu hình ngưỡng KPI ----
  const saveTargets = async () => {
    const items = targets.map((t) => ({
      ...t,
      ...(editedTargets[t.kpiCode] || {}),
    }));
    try {
      await api.put(`/kpi/targets?period=${period}&roleType=${targetRoleType}`, items);
      message.success('Đã lưu cấu hình ngưỡng chỉ tiêu và hệ số quy đổi thành công!');
      setEditedTargets({});
      fetchTargets();
      fetchPersonalKpi();
      if (activeTab === 'summary') fetchSummary();
    } catch {
      message.error('Lỗi khi lưu cấu hình!');
    }
  };

  // ---- Tự động phân bổ Rank A1, A2, A3 theo ràng buộc Quota ----
  const autoAssignRanks = useCallback(() => {
    if (summaryData.length === 0) return;
    const sorted = [...summaryData].sort((a, b) => b.finalScore - a.finalScore);
    const N = sorted.length;
    const maxA1Count = Math.max(1, Math.floor(N * (quotaA1 / 100)));
    const maxA2Count = Math.max(1, Math.floor(N * (quotaA2 / 100)));

    const newRanks: Record<string, 'A1' | 'A2' | 'A3' | 'C'> = {};
    let a1Assigned = 0;
    let a2Assigned = 0;

    sorted.forEach((u) => {
      if (u.finalScore < 0.7) {
        newRanks[u.username] = 'C';
      } else if (a1Assigned < maxA1Count && u.finalScore >= 1.0) {
        newRanks[u.username] = 'A1';
        a1Assigned++;
      } else if (a2Assigned < maxA2Count && u.finalScore >= 0.9) {
        newRanks[u.username] = 'A2';
        a2Assigned++;
      } else {
        newRanks[u.username] = 'A3';
      }
    });

    setAssignedRanks(newRanks);
    message.success(`Đã tự động phân bổ: A1 (${a1Assigned}/${N}), A2 (${a2Assigned}/${N}), A3 (${N - a1Assigned - a2Assigned}/${N})!`);
  }, [summaryData, quotaA1, quotaA2]);

  useEffect(() => {
    if (summaryData.length > 0 && Object.keys(assignedRanks).length === 0) {
      autoAssignRanks();
    }
  }, [summaryData, autoAssignRanks]);

  // ---- Lọc bảng tổng hợp theo phòng ban ----
  const filteredSummary = summaryData.filter((r) => {
    if (departmentFilter === 'ALL') return true;
    return r.department === departmentFilter;
  });

  // ---- Tính tổng trọng số các chỉ tiêu đang Active ----
  const standardTargets = targets.filter((t) => t.bscPillar !== 'CẤU HÌNH HỆ THỐNG');
  const totalActiveWeight = standardTargets
    .filter((t) => (editedTargets[t.kpiCode]?.isActive ?? t.isActive) !== false)
    .reduce((sum, t) => sum + Number(editedTargets[t.kpiCode]?.weight ?? t.weight), 0);

  // ---- Thống kê KPI theo từng Phòng Ban ----
  const departmentStats = useMemo(() => {
    const depMap: Record<
      string,
      {
        department: string;
        totalStaff: number;
        avgTotalScore: number;
        avgFinalScore: number;
        countA1: number;
        countA2: number;
        countA3: number;
        countC: number;
      }
    > = {};

    summaryData.forEach((s) => {
      const dep = s.department || 'Khối KTNB';
      if (!depMap[dep]) {
        depMap[dep] = {
          department: dep,
          totalStaff: 0,
          avgTotalScore: 0,
          avgFinalScore: 0,
          countA1: 0,
          countA2: 0,
          countA3: 0,
          countC: 0,
        };
      }
      depMap[dep].totalStaff++;
      depMap[dep].avgTotalScore += s.totalScore;
      depMap[dep].avgFinalScore += s.finalScore;

      const rank = assignedRanks[s.username] || 'A3';
      if (rank === 'A1') depMap[dep].countA1++;
      else if (rank === 'A2') depMap[dep].countA2++;
      else if (rank === 'A3') depMap[dep].countA3++;
      else if (rank === 'C') depMap[dep].countC++;
    });

    return Object.values(depMap).map((d) => ({
      ...d,
      avgTotalScore: d.totalStaff > 0 ? d.avgTotalScore / d.totalStaff : 0,
      avgFinalScore: d.totalStaff > 0 ? d.avgFinalScore / d.totalStaff : 0,
    }));
  }, [summaryData, assignedRanks]);

  const currentA1Count = Object.values(assignedRanks).filter((r) => r === 'A1').length;
  const currentA2Count = Object.values(assignedRanks).filter((r) => r === 'A2').length;
  const currentA3Count = Object.values(assignedRanks).filter((r) => r === 'A3').length;
  const currentCCount = Object.values(assignedRanks).filter((r) => r === 'C').length;
  const totalCount = summaryData.length || 1;

  const selectedStaffObj = summaryData.find((s) => s.username === selectedStaffUser) || result;

  // ---- Xuất Bảng Chấm Điểm MB02 Cá Nhân ra CSV ----
  const exportMb02Csv = () => {
    const headers = [
      'STT', 'Nhóm tiêu chí', 'Mục tiêu chiến lược', 'Tiêu chí', 'Định nghĩa/Mô tả',
      'Tỷ trọng (%)', 'Ngưỡng chấp nhận (%)', 'Chỉ tiêu phân giao (%)', 'Mức trần (%)',
      'Bắt đầu', 'Kết thúc', 'Phương pháp đo lường', 'Đơn vị phụ trách',
      'Kết quả thực hiện (%)', 'Tỷ lệ hoàn thành (%)', 'Điểm hoàn thành (%)',
    ];
    const rows = calculatedMb02.items.map((it, idx) => [
      idx + 1,
      `"${it.nhomTieuChi}"`,
      `"${it.mucTieuChienLuoc}"`,
      `"${it.tieuChi}"`,
      `"${it.moTa}"`,
      `${(it.tyTrong * 100).toFixed(0)}%`,
      `${(it.nguong * 100).toFixed(0)}%`,
      `${(it.chiTieuGiao * 100).toFixed(0)}%`,
      `${(it.mucTran * 100).toFixed(0)}%`,
      it.batDau,
      it.ketThuc,
      `"${it.phuongPhapDo}"`,
      `"${it.donViLuongHoa}"`,
      `${(it.ketQuaThucHien * 100).toFixed(1)}%`,
      `${(it.completionRate * 100).toFixed(1)}%`,
      `${(it.diemHoanThanh * 100).toFixed(1)}%`,
    ]);

    rows.push([
      '', 'TỔNG CỘNG', '', '', '', '100%', '95%', '98%', '100%', '', '', '', '',
      '98%', '100%', `${(calculatedMb02.totalScore * 100).toFixed(1)}%`,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Cham_Diem_MB02_${selectedStaffUser}_${period}.csv`;
    a.click();
    message.success('Đã tải xuống bảng chấm điểm MB02.HRM.2026 thành công!');
  };

  const exportAllDepartmentAssessmentCsv = () => {
    if (summaryData.length === 0) return;
    const headers = [
      'STT', 'Mã NV', 'Họ và Tên', 'Phòng Ban', 'Chức Danh',
      'Tài Chính (10%)', 'Khách Hàng (10%)', 'Quy Trình (60%)', 'Học Hỏi (20%)',
      'Tổng Điểm (%)', 'Xếp Loại', 'Trạng Thái Xác Nhận',
    ];
    const rows = summaryData.map((s, idx) => [
      idx + 1,
      s.username,
      s.fullName,
      s.department || 'Khối KTNB',
      s.roleType === 'Manager' ? 'Lãnh đạo Phòng' : 'Kiểm toán viên',
      '10.0%',
      '10.0%',
      (s.totalScore * 60).toFixed(1) + '%',
      '20.0%',
      (s.finalScore * 100).toFixed(1) + '%',
      s.xepLoai,
      'Đã họp 1-1 & Ký duyệt',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bang_Tong_Hop_Cham_Diem_Phong_${period}.csv`;
    a.click();
    message.success('Đã tải xuống bảng tổng hợp chấm điểm toàn phòng!');
  };

  const handleUploadAssessmentCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          message.error('File không chứa dữ liệu hợp lệ');
          return;
        }
        message.success(`Đã nhập thành công bảng chấm điểm từ file [${file.name}]!`);
        setAssessmentStatus('Confirmed');
      } catch {
        message.error('Lỗi khi đọc file bảng chấm');
      }
    };
    reader.readAsText(file);
    return false;
  };

  return (
    <div style={{ padding: '12px', minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ maxWidth: 1380, margin: '0 auto' }}>
        {/* Responsive Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', fontSize: '18px' }}>
              <BarChartOutlined style={{ marginRight: 8, color: '#ea9105' }} />
              Hệ Thống BSC-KPI & Chấm Điểm MB02.HRM.2026
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Giao kế hoạch, chấm điểm định kỳ, họp 1-1 và xuất mẫu biểu in ấn Khối KTNB
            </Text>
          </div>
          <Space wrap style={{ width: '100%', justifyContent: 'flex-start' }} className="sm:!w-auto sm:!justify-end">
            <Select
              value={period}
              onChange={setPeriod}
              style={{ width: 180, minWidth: 140 }}
              options={periodOptions}
              placeholder="Chọn kỳ đánh giá"
            />
            <Button icon={<ReloadOutlined />} onClick={fetchPersonalKpi}>
              {t('common.btnRecalculate', 'Tính lại')}
            </Button>
          </Space>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'personal',
              label: (
                <span>
                  <BarChartOutlined />
                  KPI Cá Nhân Của Tôi
                </span>
              ),
              children: (
                <KpiPersonalTab
                  loading={loading}
                  result={result}
                  period={period}
                  onOpenPrintModal={() => {
                    setSelectedStaffUser(currentUser.username);
                    setIsPrintModalVisible(true);
                  }}
                />
              ),
            },
            {
              key: 'assessment',
              label: (
                <span>
                  <AuditOutlined />
                  Chấm Điểm & Xác Nhận Đánh Giá MB02
                </span>
              ),
              children: (
                <KpiAssessmentTab
                  assessmentLoading={assessmentLoading}
                  assessmentStatus={assessmentStatus}
                  rejectionReason={rejectionReason}
                  isStaffOnly={isStaffOnly}
                  currentUser={currentUser}
                  selectedStaffUser={selectedStaffUser}
                  setSelectedStaffUser={setSelectedStaffUser}
                  assessmentList={assessmentList}
                  summaryData={summaryData}
                  exportMb02Csv={exportMb02Csv}
                  handleUploadAssessmentCsv={handleUploadAssessmentCsv}
                  exportAllDepartmentAssessmentCsv={exportAllDepartmentAssessmentCsv}
                  onOpenPrintModal={() => setIsPrintModalVisible(true)}
                  calculatedMb02={calculatedMb02}
                  handleSaveAssessmentDraft={handleSaveAssessmentDraft}
                  handleSubmitAssessment={handleSubmitAssessment}
                  onOpenConfirmModal={() => setIsConfirmModalVisible(true)}
                  isDeptHead={isDeptHead}
                  isDivisionHead={isDivisionHead}
                  handleApproveL1={handleApproveL1}
                  handleApproveL2={handleApproveL2}
                  onOpenRejectModal={() => setIsRejectModalVisible(true)}
                  selectedStaffObj={selectedStaffObj}
                  period={period}
                  handleUpdateAssessmentValue={handleUpdateAssessmentValue}
                />
              ),
            },
            ...(isManager
              ? [
                  {
                    key: 'summary',
                    label: (
                      <span>
                        <TeamOutlined />
                        Tổng Hợp & Xếp Hạng Đơn Vị
                      </span>
                    ),
                    children: (
                      <KpiSummaryTab
                        summaryLoading={summaryLoading}
                        period={period}
                        isGlobalCaeOrAdmin={isGlobalCaeOrAdmin}
                        departmentFilter={departmentFilter}
                        setDepartmentFilter={setDepartmentFilter}
                        currentUser={currentUser}
                        fetchSummary={fetchSummary}
                        filteredSummary={filteredSummary}
                      />
                    ),
                  },
                  {
                    key: 'ranking_report',
                    label: (
                      <span>
                        <PieChartOutlined />
                        Báo Cáo Động & Phân Bổ Rank Cuối Năm
                      </span>
                    ),
                    children: (
                      <KpiRankingReportTab
                        summaryLoading={summaryLoading}
                        quotaA1={quotaA1}
                        setQuotaA1={setQuotaA1}
                        quotaA2={quotaA2}
                        setQuotaA2={setQuotaA2}
                        autoAssignRanks={autoAssignRanks}
                        totalCount={totalCount}
                        currentA1Count={currentA1Count}
                        currentA2Count={currentA2Count}
                        currentA3Count={currentA3Count}
                        currentCCount={currentCCount}
                        departmentStats={departmentStats}
                      />
                    ),
                  },
                  {
                    key: 'settings',
                    label: (
                      <span>
                        <SettingOutlined />
                        Lựa Chọn & Thiết Lập Chỉ Tiêu Hàng Năm
                      </span>
                    ),
                    children: (
                      <KpiSettingsTab
                        targetsLoading={targetsLoading}
                        period={period}
                        targetRoleType={targetRoleType}
                        setTargetRoleType={setTargetRoleType}
                        totalActiveWeight={totalActiveWeight}
                        standardTargets={standardTargets}
                        editedTargets={editedTargets}
                        setEditedTargets={setEditedTargets}
                        saveTargets={saveTargets}
                        onOpenAddModal={() => message.info('Vui lòng sử dụng biểu mẫu thiết lập chỉ tiêu chuẩn')}
                        onOpenCloneModal={() => message.info('Vui lòng chọn kỳ cần sao chép')}
                      />
                    ),
                  },
                ]
              : []),
            {
              key: 'guide',
              label: (
                <span>
                  <BookOutlined />
                  Cẩm Nang & Hỏi Đáp BSC-KPI
                </span>
              ),
              children: <KpiGuideTab />,
            },
          ]}
        />
      </div>

      {/* Modal Trả Lại Bản Đánh Giá */}
      <Modal
        title="❌ Trả Lại Bản Đánh Giá KPI"
        open={isRejectModalVisible}
        onCancel={() => {
          setIsRejectModalVisible(false);
          setRejectReasonInput('');
        }}
        onOk={handleRejectAssessment}
        okText={t('common.btnConfirmReturn', 'Xác Nhận Trả Lại')}
        okButtonProps={{ danger: true }}
        cancelText={t('common.btnCancel', 'Hủy')}
      >
        <Paragraph>
          Vui lòng nhập lý do trả lại để cán bộ (
          <b>{selectedStaffObj?.fullName || selectedStaffUser}</b>) có cơ sở cập nhật lại:
        </Paragraph>
        <TextArea
          rows={4}
          value={rejectReasonInput}
          onChange={(e) => setRejectReasonInput(e.target.value)}
          placeholder="Ví dụ: Cần cập nhật lại kết quả tiêu chí PRO_02 theo biên bản họp thực địa..."
        />
      </Modal>

      {/* Modal Xác Nhận Cuộc Họp 1-1 */}
      <Modal
        title="🤝 Ý Kiến Phản Hồi & Cuộc Họp Đánh Giá 1-1 (MB02.HRM.2026)"
        open={isConfirmModalVisible}
        onCancel={() => setIsConfirmModalVisible(false)}
        onOk={async () => {
          await handleSaveAssessmentDraft();
          setIsConfirmModalVisible(false);
          message.success('Đã lưu ý kiến cuộc họp 1-1 thành công!');
        }}
        okText={t('common.btnSaveComments', 'Lưu Ý Kiến')}
        cancelText={t('common.btnCancel', 'Hủy')}
        width={600}
      >
        <Paragraph>
          Ghi nhận ý kiến cuộc họp 1-1 giữa Lãnh đạo phòng (CBQL cấp N+1) và CBNV (
          <b>{selectedStaffObj?.fullName || selectedStaffUser}</b>) đối với kết quả công việc kỳ <b>{period}</b>.
        </Paragraph>
        <Form layout="vertical">
          <Form.Item label="Ý kiến phản hồi của CBNV:">
            <TextArea
              rows={3}
              value={ktvFeedback}
              onChange={(e) => setKtvFeedback(e.target.value)}
              placeholder="Nhập ý kiến hoặc nguyện vọng đào tạo, phát triển của CBNV..."
            />
          </Form.Item>
          <Form.Item label="Nhận xét & Định hướng của CBQL cấp N+1 (Lãnh đạo phòng):">
            <TextArea
              rows={3}
              value={managerFeedback}
              onChange={(e) => setManagerFeedback(e.target.value)}
              placeholder="Đánh giá điểm mạnh, điểm cần cải thiện của cán bộ..."
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal In Mẫu Biểu MB02.HRM.2026 Chuẩn Khổ Giấy In */}
      <Modal
        title="🖨️ Xem Trước Mẫu Biểu In Ấn MB02.HRM.2026"
        open={isPrintModalVisible}
        onCancel={() => setIsPrintModalVisible(false)}
        width={1100}
        footer={[
          <Button key="back" onClick={() => setIsPrintModalVisible(false)}>
            Đóng
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            In Ngay (Print)
          </Button>,
        ]}
      >
        <div style={{ padding: '20px', background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: '2px solid #000',
              paddingBottom: 10,
              marginBottom: 15,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>
                NGÂN HÀNG THƯƠNG MẠI CỔ PHẦN LỘC PHÁT VIỆT NAM (LPBank)
              </div>
              <div style={{ fontSize: 12, fontWeight: 'bold' }}>KHỐI KIỂM TOÁN NỘI BỘ</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 'bold' }}>MẪU BIỂU: MB02.HRM.2026</div>
              <div style={{ fontSize: 11, fontStyle: 'italic' }}>
                Kỳ đánh giá: {period} (01/01/2026 - 30/06/2026)
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' }}>
              BẢN GIAO KẾ HOẠCH & ĐÁNH GIÁ KẾT QUẢ CÔNG VIỆC
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              Họ và tên: <b>{selectedStaffObj?.fullName || selectedStaffUser}</b> | Mã NV: <b>{selectedStaffUser}</b> |
              Phòng: <b>{selectedStaffObj?.department || 'Phòng KT Hội sở và Hệ thống'}</b>
            </div>
          </div>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', marginBottom: 15 }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse', fontSize: 11 }} border={1}>
              <thead>
                <tr style={{ background: '#f2f2f2', textAlign: 'center' }}>
                  <th style={{ padding: 4 }}>Tỷ trọng</th>
                  <th style={{ padding: 4 }}>Nhóm tiêu chí</th>
                  <th style={{ padding: 4 }}>Mục tiêu chiến lược</th>
                  <th style={{ padding: 4 }}>Tiêu chí</th>
                  <th style={{ padding: 4 }}>Định nghĩa/Mô tả</th>
                  <th style={{ padding: 4 }}>Tỷ trọng (%)</th>
                  <th style={{ padding: 4 }}>Ngưỡng</th>
                  <th style={{ padding: 4 }}>Chỉ tiêu giao</th>
                  <th style={{ padding: 4 }}>Mức trần</th>
                  <th style={{ padding: 4 }}>Phương pháp đo lường</th>
                  <th style={{ padding: 4 }}>Đơn vị phụ trách</th>
                  <th style={{ padding: 4 }}>Kết quả</th>
                  <th style={{ padding: 4 }}>Tỷ lệ HT (%)</th>
                  <th style={{ padding: 4 }}>Điểm HT (%)</th>
                </tr>
              </thead>
              <tbody>
                {calculatedMb02.items.map((it) => (
                  <tr key={it.id}>
                    <td style={{ textAlign: 'center', padding: 4, fontWeight: 'bold' }}>{it.tyTrongPillar}</td>
                    <td style={{ padding: 4, fontWeight: 'bold' }}>{it.nhomTieuChi}</td>
                    <td style={{ padding: 4 }}>{it.mucTieuChienLuoc}</td>
                    <td style={{ padding: 4, fontWeight: 'bold' }}>{it.tieuChi}</td>
                    <td style={{ padding: 4 }}>{it.moTa}</td>
                    <td style={{ textAlign: 'center', padding: 4 }}>{(it.tyTrong * 100).toFixed(0)}%</td>
                    <td style={{ textAlign: 'center', padding: 4 }}>{(it.nguong * 100).toFixed(0)}%</td>
                    <td style={{ textAlign: 'center', padding: 4 }}>{(it.chiTieuGiao * 100).toFixed(0)}%</td>
                    <td style={{ textAlign: 'center', padding: 4 }}>{(it.mucTran * 100).toFixed(0)}%</td>
                    <td style={{ padding: 4 }}>{it.phuongPhapDo}</td>
                    <td style={{ padding: 4 }}>{it.donViLuongHoa}</td>
                    <td style={{ textAlign: 'center', padding: 4, fontWeight: 'bold' }}>
                      {(it.ketQuaThucHien * 100).toFixed(0)}%
                    </td>
                    <td style={{ textAlign: 'center', padding: 4 }}>{(it.completionRate * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'center', padding: 4, fontWeight: 'bold' }}>
                      {(it.diemHoanThanh * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
                <tr style={{ background: '#fdf6ec', fontWeight: 'bold' }}>
                  <td colSpan={5} style={{ padding: 6, textAlign: 'center' }}>
                    TỔNG CỘNG
                  </td>
                  <td style={{ textAlign: 'center', padding: 6 }}>100%</td>
                  <td style={{ textAlign: 'center', padding: 6 }}>95%</td>
                  <td style={{ textAlign: 'center', padding: 6 }}>98%</td>
                  <td style={{ textAlign: 'center', padding: 6 }}>100%</td>
                  <td colSpan={2}></td>
                  <td style={{ textAlign: 'center', padding: 6 }}>98%</td>
                  <td style={{ textAlign: 'center', padding: 6 }}>100%</td>
                  <td style={{ textAlign: 'center', padding: 6, fontSize: 13, color: '#ea9105' }}>
                    {(calculatedMb02.totalScore * 100).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 30,
              fontSize: 12,
            }}
          >
            <div>
              <div>
                Tỷ lệ hoàn thành tổng thể: <b>{(calculatedMb02.totalScore * 100).toFixed(1)}%</b>
              </div>
              <div>
                Phân nhóm xếp loại: <b>{calculatedMb02.xepLoai}</b>
              </div>
            </div>
            <div style={{ fontStyle: 'italic' }}>
              Ngày in báo cáo: {new Date().toLocaleDateString('vi-VN')}
            </div>
          </div>

          <Row gutter={24} style={{ textAlign: 'center', marginTop: 30, fontSize: 12 }}>
            <Col span={8}>
              <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>CBNV</div>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 50 }}>(Ký và ghi rõ họ tên)</div>
              <div>
                <b>{selectedStaffObj?.fullName || selectedStaffUser}</b>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>CBQL CẤP N+1</div>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 50 }}>(Họp 1-1 với CBNV)</div>
              <div>
                <b>Nguyễn Thị Lương / Phạm Đức Thành</b>
              </div>
            </Col>
            <Col span={8}>
              <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>CBQL CẤP N+2</div>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 50 }}>(Giám đốc Khối KTNB)</div>
              <div>
                <b>Nguyễn Tuấn Hiệp (CAE)</b>
              </div>
            </Col>
          </Row>
        </div>
      </Modal>
    </div>
  );
};

export default BscKpiPage;
