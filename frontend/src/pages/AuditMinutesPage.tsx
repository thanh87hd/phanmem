import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  DatePicker,
  message,
  Tag,
  Select,
  Card,
  Row,
  Col,
  Typography,
  Tooltip,
  Tabs,
  Badge,
  Descriptions,
  Divider,
  Statistic,
  Empty,
  Spin,
  Alert
} from 'antd';
import {
  EditOutlined,
  DownloadOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  UserOutlined,
  TeamOutlined,
  FileExcelOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  SolutionOutlined,
  CalendarOutlined,
  SnippetsOutlined,
  AuditOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const AuditMinutesPage: React.FC = () => {
  const { t } = useTranslation();

  // Danh sách cuộc kiểm toán và cuộc kiểm toán đang chọn
  const [engagements, setEngagements] = useState<any[]>([]);
  const [selectedEngagementId, setSelectedEngagementId] = useState<number | null>(null);
  const [engagement, setEngagement] = useState<any>(null);

  // Dữ liệu Biên bản và Phát hiện
  const [minutes, setMinutes] = useState<any[]>([]);
  const [currentMinute, setCurrentMinute] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);

  // Trạng thái giao diện
  const [loading, setLoading] = useState(false);
  const [collating, setCollating] = useState(false);
  const [exportingWord, setExportingWord] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [activeMainTab, setActiveMainTab] = useState<string>('detailedMinutes');
  const [detailedSubTab, setDetailedSubTab] = useState<string>('KHCN');

  const [form] = Form.useForm();

  // 1. Tải danh sách các cuộc kiểm toán
  const fetchEngagements = async () => {
    try {
      const res = await api.get('/audit-engagements');
      const data = res.data || [];
      setEngagements(data);
      if (data.length > 0 && !selectedEngagementId) {
        setSelectedEngagementId(data[0].id);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách cuộc kiểm toán:', error);
    }
  };

  useEffect(() => {
    fetchEngagements();
  }, []);

  // 2. Tải thông tin chi tiết cuộc kiểm toán, biên bản và các phát hiện khi đổi selection
  const fetchEngagementDetails = async (engId: number) => {
    setLoading(true);
    try {
      const [engRes, minRes, findRes] = await Promise.all([
        api.get(`/audit-engagements/${engId}`),
        api.get(`/audit-minutes?engagementId=${engId}`),
        api.get(`/audit-findings?engagementId=${engId}`),
      ]);

      setEngagement(engRes.data);
      const minData = minRes.data || [];
      setMinutes(minData);
      setCurrentMinute(minData.length > 0 ? minData[0] : null);
      setFindings(findRes.data || []);
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu biên bản kiểm toán:', error);
      message.error('Không thể tải dữ liệu biên bản của cuộc kiểm toán này');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEngagementId) {
      fetchEngagementDetails(selectedEngagementId);
    }
  }, [selectedEngagementId]);

  // 3. Tự động bóc tách và tổng hợp từ Working Papers vào Biên bản (Auto-collate)
  const handleAutoCollate = async () => {
    if (!selectedEngagementId) return;
    setCollating(true);
    message.loading({
      content: 'Đang bóc tách phát hiện, nhân sự và giấy tờ làm việc (WP) vào Biên bản kiểm toán (MB04)...',
      key: 'collate'
    });
    try {
      await api.post(`/audit-minutes/auto-collate/${selectedEngagementId}`);
      message.success({
        content: '🌟 Đã tổng hợp thành công toàn bộ thông tin đoàn, nhân sự và phát hiện vào Biên bản MB04!',
        key: 'collate'
      });
      await fetchEngagementDetails(selectedEngagementId);
    } catch (error: any) {
      message.error({
        content: error?.response?.data?.message || 'Lỗi khi tự động tổng hợp Biên bản kiểm toán',
        key: 'collate'
      });
    } finally {
      setCollating(false);
    }
  };

  // 4. Mở Modal tạo / sửa biên bản
  const handleOpenEditModal = (record?: any) => {
    const target = record || currentMinute;
    setEditingRecord(target);

    if (target) {
      form.setFieldsValue({
        ...target,
        issueDate: target.issueDate ? dayjs(target.issueDate) : dayjs(),
      });
    } else {
      form.resetFields();
      const leadName =
        engagement?.leadAuditorUser?.fullName ||
        engagement?.legacyLeadAuditor ||
        engagement?.leadAuditor ||
        '';
      const unitName =
        engagement?.branchName ||
        engagement?.auditedDepartment?.name ||
        engagement?.legacyAuditedDepartment ||
        engagement?.name ||
        '';
      const decNo = engagement?.decisionNo || '';
      const fwStart = engagement?.fieldworkStartDate
        ? dayjs(engagement.fieldworkStartDate).format('DD/MM/YYYY')
        : '';
      const fwEnd = engagement?.fieldworkEndDate
        ? dayjs(engagement.fieldworkEndDate).format('DD/MM/YYYY')
        : '';
      const fieldworkStr = fwStart && fwEnd ? `Từ ngày ${fwStart} đến ngày ${fwEnd}` : '';

      let teamStr = '';
      if (engagement?.teamMembers && Array.isArray(engagement.teamMembers)) {
        teamStr = engagement.teamMembers
          .map(
            (tm: any, i: number) =>
              `${i + 1}. ${tm.fullName || tm.userId} - ${tm.role || 'Thành viên'}`
          )
          .join('\n');
      }

      form.setFieldsValue({
        minuteNo: decNo
          ? `BBKT-${decNo}`
          : `BBKT-${selectedEngagementId}-${new Date().getFullYear()}`,
        decisionNumber: decNo,
        title: `Biên bản kiểm toán tại ${unitName}`,
        auditedUnitName: unitName,
        leadAuditorName: leadName,
        fieldworkPeriod: fieldworkStr,
        teamMembersText: teamStr,
        issueDate: dayjs(),
        status: 'Draft',
        minuteType: 'MB04_CHI_TIET',
        meetingLocation: `Phòng họp Trụ sở ${unitName}`,
        unitRepresentativesText: `1. Ông/Bà: Giám đốc Chi nhánh\n2. Ông/Bà: Phó Giám đốc Chi nhánh\n3. Ông/Bà: Kế toán trưởng\n4. Các Trưởng/Phó phòng nghiệp vụ`,
        auditeeFeedback: 'Đơn vị thống nhất với các nội dung kết luận và phát hiện kiểm toán của Đoàn KTNB.',
        commitmentNotes: 'Đơn vị cam kết xây dựng kế hoạch khắc phục và hoàn thành chỉnh sửa trước hạn quy định.'
      });
    }
    setIsModalVisible(true);
  };

  // 5. Lưu thông tin biên bản
  const handleSaveMinute = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        engagementId: selectedEngagementId,
        issueDate: values.issueDate ? values.issueDate.format('YYYY-MM-DD') : null,
      };

      if (editingRecord?.id) {
        await api.patch(`/audit-minutes/${editingRecord.id}`, payload);
        message.success('Cập nhật thông tin Biên bản kiểm toán thành công');
      } else {
        await api.post('/audit-minutes', payload);
        message.success('Khởi tạo Biên bản kiểm toán thành công');
      }
      setIsModalVisible(false);
      if (selectedEngagementId) {
        fetchEngagementDetails(selectedEngagementId);
      }
    } catch (error) {
      console.error('Validate Failed:', error);
    }
  };

  // 6. Xuất Word: Hỗ trợ MB04_CHI_TIET và MB04_TONG_HOP
  const handleExportWord = async (exportType: string = 'MB04_CHI_TIET') => {
    if (!currentMinute?.id) {
      message.warning('Vui lòng tạo hoặc tự động tổng hợp Biên bản trước khi xuất tệp');
      return;
    }
    setExportingWord(true);
    const label =
      exportType === 'MB04_CHI_TIET'
        ? 'Biên bản kiểm toán chi tiết (MB04 Chi tiết)'
        : 'Biên bản kiểm toán tổng hợp (MB04 Tổng hợp Exit Meeting)';

    message.loading({ content: `Đang kết xuất ${label} (Word .docx)...`, key: 'export_word' });
    try {
      const res = await api.get(`/audit-minutes/${currentMinute.id}/export/word?type=${exportType}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `${exportType}_${currentMinute.minuteNo || currentMinute.id}_${dayjs().format('YYYYMMDD')}.docx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: `Xuất ${label} thành công!`, key: 'export_word' });
    } catch (error) {
      message.error({ content: `Lỗi khi xuất file ${label}`, key: 'export_word' });
    } finally {
      setExportingWord(false);
    }
  };

  // 7. Xuất Excel Đối soát quy mô lớn
  const handleExportExcel = async () => {
    if (!currentMinute?.id) {
      message.warning('Vui lòng tạo hoặc tự động tổng hợp Biên bản trước khi xuất tệp');
      return;
    }
    setExportingExcel(true);
    message.loading({
      content: 'Đang kết xuất Bảng kê đối soát chi tiết (> 1.000 dòng)...',
      key: 'export_excel',
    });
    try {
      const res = await api.get(`/audit-minutes/${currentMinute.id}/export/excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Bang_Ke_Doi_Soat_MB04_${currentMinute.minuteNo || currentMinute.id}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Xuất file Excel đối soát thành công!', key: 'export_excel' });
    } catch (error) {
      message.error({ content: 'Lỗi khi xuất file Excel đối soát', key: 'export_excel' });
    } finally {
      setExportingExcel(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DỮ LIỆU PHÂN LOẠI THEO CÁC MẢNG NGHIỆP VỤ (TAB 1: MB04 CHI TIẾT)
  // ══════════════════════════════════════════════════════════════════════════
  const findingsByCategory = useMemo(() => {
    const khcn: any[] = [];
    const khdn: any[] = [];
    const ptd: any[] = [];
    const pgdbd: any[] = [];
    const hoiso: any[] = [];

    findings.forEach((f) => {
      const cat = (f.findingCategory || '').toUpperCase();
      const op = (f.operationType || '').toUpperCase();
      const title = (f.findingTitle || '').toLowerCase();
      const group = (f.findingGroup || '').toLowerCase();

      if (op === 'KHCN' || cat === 'KHCN' || title.includes('khcn') || title.includes('tiêu dùng') || title.includes('cá nhân')) {
        khcn.push(f);
      } else if (op === 'KHDN' || cat === 'KHDN' || title.includes('khdn') || title.includes('doanh nghiệp')) {
        khdn.push(f);
      } else if (op === 'TKBĐ' || cat === 'PGDBD' || f.channel === 'PGDBD' || title.includes('bưu điện') || title.includes('pgdbđ') || title.includes('tkbđ')) {
        pgdbd.push(f);
      } else if (op === 'PTD' || cat === 'PTD' || cat === 'KETOAN' || title.includes('phi tín dụng') || title.includes('kho quỹ') || title.includes('kế toán') || title.includes('ấn chỉ')) {
        ptd.push(f);
      } else if (op === 'TD' || cat === 'TD') {
        // Nếu là TD chung, chia vào KHCN mặc định nếu không xác định KHDN
        khcn.push(f);
      } else {
        hoiso.push(f);
      }
    });

    return { khcn, khdn, ptd, pgdbd, hoiso };
  }, [findings]);

  // Đánh giá chất lượng nghiệp vụ (Đạt / Cần cải thiện / Không đạt)
  const calculateQualityRating = (items: any[]) => {
    const highRisk = items.filter((f) => f.riskLevel === 'High' || f.riskLevel === 'Cao').length;
    const medRisk = items.filter((f) => f.riskLevel === 'Medium' || f.riskLevel === 'Trung bình').length;

    if (highRisk >= 3 || items.length >= 10) {
      return { status: 'Không đạt', color: 'error', icon: <CloseCircleOutlined />, desc: 'Rủi ro trọng yếu cao, phát hiện nhiều sai phạm có tính hệ thống.' };
    }
    if (highRisk > 0 || medRisk >= 4 || items.length >= 5) {
      return { status: 'Cần cải thiện', color: 'warning', icon: <WarningOutlined />, desc: 'Có sai sót rủi ro trung bình cần chấn chỉnh kịp thời.' };
    }
    return { status: 'Đạt', color: 'success', icon: <CheckCircleOutlined />, desc: 'Kiểm soát tuân thủ tốt, chỉ ghi nhận sai sót hành chính không trọng yếu.' };
  };

  // ══════════════════════════════════════════════════════════════════════════
  // DỮ LIỆU TỔNG HỢP CÁN BỘ VI PHẠM (TAB 2: MB04 TỔNG HỢP - PL 3B, 5B, 6B)
  // ══════════════════════════════════════════════════════════════════════════
  const personnelBreakdown = useMemo(() => {
    // Gom nhóm cán bộ tín dụng (Phụ lục 3B)
    const creditOfficersMap = new Map<string, any>();
    // Gom nhóm cán bộ phi tín dụng (Phụ lục 5B)
    const ptdOfficersMap = new Map<string, any>();
    // Gom nhóm cán bộ PGDBĐ (Phụ lục 6B)
    const pgdbdOfficersMap = new Map<string, any>();

    findings.forEach((f) => {
      const isCredit =
        f.operationType === 'TD' ||
        f.operationType === 'KHCN' ||
        f.operationType === 'KHDN' ||
        f.findingCategory === 'TD' ||
        f.findingCategory === 'KHCN' ||
        f.findingCategory === 'KHDN';

      const isPostal =
        f.operationType === 'TKBĐ' ||
        f.findingCategory === 'PGDBD' ||
        f.channel === 'PGDBD';

      // 1. Cán bộ Đề xuất
      const proposer = f.legacyProposerOfficer || f.proposerUser?.fullName;
      if (proposer && proposer !== '---') {
        const targetMap = isPostal ? pgdbdOfficersMap : isCredit ? creditOfficersMap : ptdOfficersMap;
        if (!targetMap.has(proposer)) {
          targetMap.set(proposer, {
            name: proposer,
            role: 'Cán bộ Đề xuất / Thụ lý',
            proposeCount: 0,
            appraiseCount: 0,
            approveCount: 0,
            totalViolations: 0,
            findings: [],
            responsibilityType: 'Trực tiếp',
          });
        }
        const item = targetMap.get(proposer);
        item.proposeCount += 1;
        item.totalViolations += 1;
        item.findings.push(f.findingCode || `FD-${f.id}`);
      }

      // 2. Cán bộ Thẩm định
      const appraiser = f.legacyAppraiserOfficer || f.appraiserUser?.fullName;
      if (appraiser && appraiser !== '---') {
        const targetMap = isPostal ? pgdbdOfficersMap : isCredit ? creditOfficersMap : ptdOfficersMap;
        if (!targetMap.has(appraiser)) {
          targetMap.set(appraiser, {
            name: appraiser,
            role: 'Cán bộ Thẩm định / KSV',
            proposeCount: 0,
            appraiseCount: 0,
            approveCount: 0,
            totalViolations: 0,
            findings: [],
            responsibilityType: 'Trực tiếp',
          });
        }
        const item = targetMap.get(appraiser);
        item.appraiseCount += 1;
        item.totalViolations += 1;
        item.findings.push(f.findingCode || `FD-${f.id}`);
      }

      // 3. Cấp Phê duyệt (Lãnh đạo phòng / Ban Giám đốc)
      const leader = f.legacyBusinessLeader || f.businessLeaderUser?.fullName;
      if (leader && leader !== '---') {
        const targetMap = isPostal ? pgdbdOfficersMap : isCredit ? creditOfficersMap : ptdOfficersMap;
        if (!targetMap.has(leader)) {
          targetMap.set(leader, {
            name: leader,
            role: 'Cấp Phê duyệt / Lãnh đạo ĐVKD',
            proposeCount: 0,
            appraiseCount: 0,
            approveCount: 0,
            totalViolations: 0,
            findings: [],
            responsibilityType: 'Liên đới trách nhiệm quản lý',
          });
        }
        const item = targetMap.get(leader);
        item.approveCount += 1;
        item.totalViolations += 1;
        item.findings.push(f.findingCode || `FD-${f.id}`);
      }
    });

    return {
      creditOfficers: Array.from(creditOfficersMap.values()),
      ptdOfficers: Array.from(ptdOfficersMap.values()),
      pgdbdOfficers: Array.from(pgdbdOfficersMap.values()),
    };
  }, [findings]);

  // Cột hiển thị bảng phát hiện chi tiết (Tab 1)
  const detailedFindingColumns = [
    {
      title: 'Mã & Mức độ',
      key: 'code',
      width: 140,
      render: (_: any, r: any) => (
        <Space orientation="vertical" size={2}>
          <Text strong className="text-blue-900">{r.findingCode || `FD-${r.id}`}</Text>
          <Tag color={r.riskLevel === 'High' || r.riskLevel === 'Cao' ? 'red' : r.riskLevel === 'Medium' || r.riskLevel === 'Trung bình' ? 'orange' : 'blue'}>
            {r.riskLevel || 'Trung bình'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Tiêu đề & Nội dung tồn tại',
      key: 'title_condition',
      render: (_: any, r: any) => (
        <div>
          <div className="font-semibold text-slate-800 text-sm mb-1">{r.findingTitle}</div>
          {r.condition && (
            <div className="text-xs text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 mb-1">
              <span className="font-semibold text-slate-700">Hiện trạng:</span> {r.condition}
            </div>
          )}
          {r.criteria && (
            <div className="text-xs text-amber-800">
              <span className="font-medium">Căn cứ quy định:</span> {r.criteria}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Hồ sơ / Khách hàng / Số tiền',
      key: 'sample_info',
      width: 200,
      render: (_: any, r: any) => (
        <div className="text-xs space-y-1">
          {r.customerName && <div><span className="font-semibold">KH:</span> {r.customerName}</div>}
          {r.contractNo && <div><span className="font-semibold">Số HĐ:</span> {r.contractNo}</div>}
          {r.collateralInfo && <div><span className="font-semibold">TSBĐ:</span> {r.collateralInfo}</div>}
          {r.actualFineAmount > 0 && (
            <div className="text-red-600 font-bold">
              Phạt: {r.actualFineAmount.toLocaleString('vi-VN')} đ
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Cán bộ liên đới (3 cấp)',
      key: 'officers',
      width: 220,
      render: (_: any, r: any) => {
        const p = r.legacyProposerOfficer || r.proposerUser?.fullName || '---';
        const a = r.legacyAppraiserOfficer || r.appraiserUser?.fullName || '---';
        const l = r.legacyBusinessLeader || r.businessLeaderUser?.fullName || '---';
        return (
          <div className="text-xs space-y-0.5">
            <div><Tag color="cyan">ĐX</Tag> {p}</div>
            <div><Tag color="geekblue">TĐ</Tag> {a}</div>
            <div><Tag color="purple">Duyệt</Tag> {l}</div>
          </div>
        );
      },
    },
    {
      title: 'Mã lỗi 3 chiều',
      key: 'defectCodes',
      width: 170,
      render: (_: any, r: any) => {
        const nb = r.legacyInternalDefectCode || r.internalDefectCodeEntity?.code || '---';
        const nd = r.legacyNd340DefectCode || r.nd340DefectCodeEntity?.code || '---';
        const ns = r.legacyNhanSuDefectCode || r.nhanSuDefectCodeEntity?.code || '---';
        return (
          <div className="text-xs space-y-0.5 font-mono">
            <div><span className="text-slate-500">NB:</span> <Tag color="blue">{nb}</Tag></div>
            <div><span className="text-slate-500">340:</span> <Tag color="volcano">{nd}</Tag></div>
            <div><span className="text-slate-500">NS:</span> <Tag color="gold">{ns}</Tag></div>
          </div>
        );
      },
    },
    {
      title: 'Khuyến nghị Đoàn KT',
      key: 'recommendation',
      width: 240,
      render: (_: any, r: any) => (
        <div className="text-xs text-slate-700 italic">
          {r.recommendation || 'Yêu cầu đơn vị rà soát, khắc phục và báo cáo tiến độ.'}
        </div>
      ),
    },
  ];

  // Cột bảng tổng hợp trách nhiệm cán bộ (Tab 2 - Phụ lục 3B, 5B, 6B)
  const personnelTableColumns = [
    {
      title: 'STT',
      key: 'idx',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Họ và tên cán bộ',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span className="font-semibold text-blue-900 flex orientation-row items-center gap-1">
          <UserOutlined /> {name}
        </span>
      ),
    },
    {
      title: 'Chức danh / Vị trí',
      dataIndex: 'role',
      key: 'role',
      render: (r: string) => <Tag color="blue">{r}</Tag>,
    },
    {
      title: 'Số hồ sơ / vụ việc sai sót',
      key: 'breakdown',
      render: (_: any, r: any) => (
        <Space size={4}>
          {r.proposeCount > 0 && <Tag color="cyan">Đề xuất: {r.proposeCount}</Tag>}
          {r.appraiseCount > 0 && <Tag color="geekblue">Thẩm định: {r.appraiseCount}</Tag>}
          {r.approveCount > 0 && <Tag color="purple">Phê duyệt: {r.approveCount}</Tag>}
          <Tag color="volcano" className="font-bold">Tổng: {r.totalViolations}</Tag>
        </Space>
      ),
    },
    {
      title: 'Các phát hiện liên quan',
      dataIndex: 'findings',
      key: 'findings',
      render: (list: string[]) => (
        <Space wrap size={[2, 2]}>
          {list.map((code, idx) => (
            <Tag key={idx} color="default">{code}</Tag>
          ))}
        </Space>
      ),
    },
    {
      title: 'Tính chất trách nhiệm',
      dataIndex: 'responsibilityType',
      key: 'responsibilityType',
      render: (t: string) => (
        <Tag color={t.includes('Trực tiếp') ? 'red' : 'orange'}>{t}</Tag>
      ),
    },
  ];

  const overallQuality = calculateQualityRating(findings);

  return (
    <div className="space-y-4 p-4">
      {/* ═══════════ HEADER THANH ĐIỀU HƯỚNG VÀ CHỌN CUỘC KIỂM TOÁN ═══════════ */}
      <Card className="shadow-sm border-amber-200 bg-gradient-to-r from-amber-50 via-white to-blue-50">
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={12}>
            <div className="flex orientation-row items-center gap-3">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow">
                <FileTextOutlined style={{ fontSize: 28 }} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }} className="text-slate-800">
                  Biên bản Kiểm toán MB04 (Chi tiết & Tổng hợp Exit Meeting)
                </Title>
                <Text type="secondary" className="text-xs">
                  Chuẩn hóa theo quy trình kiểm toán LPBank & Bộ mẫu biểu thực tế MB04 Chi tiết và MB04 Họp Exit Meeting
                </Text>
              </div>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs font-semibold text-slate-600">Chọn cuộc kiểm toán:</span>
              <Select
                showSearch
                style={{ width: 320 }}
                placeholder="Chọn cuộc kiểm toán"
                value={selectedEngagementId}
                onChange={(val) => setSelectedEngagementId(val)}
                filterOption={(input, option: any) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
                {engagements.map((eng) => (
                  <Option key={eng.id} value={eng.id}>
                    [{eng.code || eng.id}] {eng.branchName || eng.name || 'Cuộc kiểm toán'}
                  </Option>
                ))}
              </Select>

              <Button
                type="primary"
                icon={<ThunderboltOutlined />}
                loading={collating}
                onClick={handleAutoCollate}
                className="bg-amber-600 hover:bg-amber-700 font-semibold"
              >
                Tự động bóc tách từ WP
              </Button>

              <Button
                icon={<EditOutlined />}
                onClick={() => handleOpenEditModal(currentMinute)}
              >
                {currentMinute ? 'Chỉnh sửa Biên bản' : 'Khởi tạo Biên bản'}
              </Button>
            </div>
          </Col>
        </Row>

        {/* Thông tin nhanh cuộc kiểm toán */}
        {engagement && (
          <>
            <Divider style={{ margin: '14px 0 10px 0' }} />
            <Row gutter={[16, 8]} className="text-xs text-slate-700">
              <Col xs={12} sm={6}>
                <span className="text-slate-500">Đơn vị kiểm toán:</span>{' '}
                <strong className="text-slate-900">{engagement.branchName || engagement.name}</strong>
              </Col>
              <Col xs={12} sm={6}>
                <span className="text-slate-500">Trưởng đoàn:</span>{' '}
                <strong className="text-blue-700">
                  {engagement.legacyLeadAuditor || engagement.leadAuditorUser?.fullName || 'Trưởng đoàn'}
                </strong>
              </Col>
              <Col xs={12} sm={6}>
                <span className="text-slate-500">Quyết định số:</span>{' '}
                <strong className="text-slate-900">{engagement.decisionNo || '---'}</strong>
              </Col>
              <Col xs={12} sm={6}>
                <span className="text-slate-500">Thời gian thực địa:</span>{' '}
                <span>
                  {engagement.fieldworkStartDate ? dayjs(engagement.fieldworkStartDate).format('DD/MM/YYYY') : '...'} -{' '}
                  {engagement.fieldworkEndDate ? dayjs(engagement.fieldworkEndDate).format('DD/MM/YYYY') : '...'}
                </span>
              </Col>
            </Row>
          </>
        )}
      </Card>

      {/* ═══════════ KHUNG HÀNH ĐỘNG XUẤT TỆP ═══════════ */}
      <Card className="shadow-sm border-slate-200">
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col xs={24} md={14}>
            <Space wrap size="middle">
              <Statistic
                title="Tổng phát hiện"
                value={findings.length}
                valueStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                prefix={<SnippetsOutlined />}
              />
              <Divider orientation="vertical" style={{ height: 40 }} />
              <Statistic
                title="Rủi ro Cao"
                value={findings.filter((f) => f.riskLevel === 'High' || f.riskLevel === 'Cao').length}
                valueStyle={{ color: '#dc2626', fontWeight: 'bold' }}
              />
              <Statistic
                title="Rủi ro Trung bình"
                value={findings.filter((f) => f.riskLevel === 'Medium' || f.riskLevel === 'Trung bình').length}
                valueStyle={{ color: '#d97706', fontWeight: 'bold' }}
              />
              <Statistic
                title="Rủi ro Thấp"
                value={findings.filter((f) => f.riskLevel === 'Low' || f.riskLevel === 'Thấp').length}
                valueStyle={{ color: '#2563eb', fontWeight: 'bold' }}
              />
              <Divider orientation="vertical" style={{ height: 40 }} />
              <div>
                <div className="text-xs text-slate-500 mb-1">Đánh giá hệ thống KSNB</div>
                <Tag color={overallQuality.color} className="font-bold text-sm px-2.5 py-0.5">
                  {overallQuality.icon} {overallQuality.status}
                </Tag>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={10}>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Tooltip title="Xuất văn bản Biên bản kiểm toán chi tiết theo 5 mảng nghiệp vụ (Phụ lục 1-6) kèm Bảng xếp hạng rủi ro">
                <Button
                  type="default"
                  icon={<DownloadOutlined />}
                  loading={exportingWord}
                  onClick={() => handleExportWord('MB04_CHI_TIET')}
                  className="border-blue-500 text-blue-700 hover:bg-blue-50 font-medium"
                >
                  Xuất Word MB04 Chi tiết
                </Button>
              </Tooltip>

              <Tooltip title="Xuất văn bản Biên bản kiểm toán tổng hợp phục vụ Họp Exit Meeting toàn đoàn (Kèm Phụ lục 3B, 5B, 6B tổng hợp cán bộ)">
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={exportingWord}
                  onClick={() => handleExportWord('MB04_TONG_HOP')}
                  className="bg-blue-800 hover:bg-blue-900 font-semibold"
                >
                  Xuất Word MB04 Tổng hợp (Exit Meeting)
                </Button>
              </Tooltip>

              <Tooltip title="Xuất toàn bộ bảng kê đối soát phục vụ KTV chạy Pivot/Hàm (> 1.000 dòng)">
                <Button
                  icon={<FileExcelOutlined />}
                  loading={exportingExcel}
                  onClick={handleExportExcel}
                  className="border-green-600 text-green-700 hover:bg-green-50 font-medium"
                >
                  Xuất Excel đối soát
                </Button>
              </Tooltip>
            </div>
          </Col>
        </Row>
      </Card>

      {/* ═══════════ 2 TAB LỚN ĐỘC LẬP: CHI TIẾT & TỔNG HỢP ═══════════ */}
      <Card className="shadow-sm border-slate-200">
        <Tabs
          activeKey={activeMainTab}
          onChange={(key) => setActiveMainTab(key)}
          type="card"
          size="large"
          items={[
            {
              key: 'detailedMinutes',
              label: (
                <span className="font-semibold text-base px-2">
                  <SnippetsOutlined /> Tab 1: Biên bản kiểm toán chi tiết (MB04 Chi tiết)
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  <Alert
                    type="info"
                    showIcon
                    message="Quy trình lập Biên bản kiểm toán chi tiết"
                    description="Biên bản kiểm toán chi tiết được lập bởi các Kiểm toán viên phụ trách từng mảng nghiệp vụ, chốt số liệu và ký xác nhận với các Trưởng bộ phận của Đơn vị trước khi họp Exit Meeting toàn đoàn."
                  />

                  {/* 5 Subtabs theo mảng nghiệp vụ */}
                  <Tabs
                    activeKey={detailedSubTab}
                    onChange={(k) => setDetailedSubTab(k)}
                    type="line"
                    items={[
                      {
                        key: 'KHCN',
                        label: (
                          <span>
                            Cho vay KHCN (Phụ lục 3) <Badge count={findingsByCategory.khcn.length} overflowCount={99} />
                          </span>
                        ),
                        children: (
                          <div className="space-y-3">
                            <Card size="small" className="bg-slate-50 border-slate-200">
                              <Row gutter={16} align="middle">
                                <Col span={18}>
                                  <div className="font-semibold text-slate-800">
                                    Đánh giá chất lượng nghiệp vụ Cho vay KHCN:
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {calculateQualityRating(findingsByCategory.khcn).desc}
                                  </div>
                                </Col>
                                <Col span={6} className="text-right">
                                  <Tag color={calculateQualityRating(findingsByCategory.khcn).color} className="text-sm px-3 py-1 font-bold">
                                    {calculateQualityRating(findingsByCategory.khcn).icon}{' '}
                                    {calculateQualityRating(findingsByCategory.khcn).status}
                                  </Tag>
                                </Col>
                              </Row>
                            </Card>
                            <Table
                              dataSource={findingsByCategory.khcn}
                              columns={detailedFindingColumns}
                              rowKey="id"
                              pagination={{ pageSize: 8 }}
                              size="middle"
                              bordered
                            />
                          </div>
                        ),
                      },
                      {
                        key: 'KHDN',
                        label: (
                          <span>
                            Cho vay KHDN (Phụ lục 4) <Badge count={findingsByCategory.khdn.length} overflowCount={99} />
                          </span>
                        ),
                        children: (
                          <div className="space-y-3">
                            <Card size="small" className="bg-slate-50 border-slate-200">
                              <Row gutter={16} align="middle">
                                <Col span={18}>
                                  <div className="font-semibold text-slate-800">
                                    Đánh giá chất lượng nghiệp vụ Cho vay KHDN:
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {calculateQualityRating(findingsByCategory.khdn).desc}
                                  </div>
                                </Col>
                                <Col span={6} className="text-right">
                                  <Tag color={calculateQualityRating(findingsByCategory.khdn).color} className="text-sm px-3 py-1 font-bold">
                                    {calculateQualityRating(findingsByCategory.khdn).icon}{' '}
                                    {calculateQualityRating(findingsByCategory.khdn).status}
                                  </Tag>
                                </Col>
                              </Row>
                            </Card>
                            <Table
                              dataSource={findingsByCategory.khdn}
                              columns={detailedFindingColumns}
                              rowKey="id"
                              pagination={{ pageSize: 8 }}
                              size="middle"
                              bordered
                            />
                          </div>
                        ),
                      },
                      {
                        key: 'PTD',
                        label: (
                          <span>
                            Phi tín dụng & Kho quỹ (Phụ lục 5) <Badge count={findingsByCategory.ptd.length} overflowCount={99} />
                          </span>
                        ),
                        children: (
                          <div className="space-y-3">
                            <Card size="small" className="bg-slate-50 border-slate-200">
                              <Row gutter={16} align="middle">
                                <Col span={18}>
                                  <div className="font-semibold text-slate-800">
                                    Đánh giá chất lượng nghiệp vụ Phi tín dụng & Vận hành kho quỹ:
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {calculateQualityRating(findingsByCategory.ptd).desc}
                                  </div>
                                </Col>
                                <Col span={6} className="text-right">
                                  <Tag color={calculateQualityRating(findingsByCategory.ptd).color} className="text-sm px-3 py-1 font-bold">
                                    {calculateQualityRating(findingsByCategory.ptd).icon}{' '}
                                    {calculateQualityRating(findingsByCategory.ptd).status}
                                  </Tag>
                                </Col>
                              </Row>
                            </Card>
                            <Table
                              dataSource={findingsByCategory.ptd}
                              columns={detailedFindingColumns}
                              rowKey="id"
                              pagination={{ pageSize: 8 }}
                              size="middle"
                              bordered
                            />
                          </div>
                        ),
                      },
                      {
                        key: 'PGDBD',
                        label: (
                          <span>
                            Quản lý PGDBĐ & Thẻ (Phụ lục 6) <Badge count={findingsByCategory.pgdbd.length} overflowCount={99} />
                          </span>
                        ),
                        children: (
                          <div className="space-y-3">
                            <Card size="small" className="bg-slate-50 border-slate-200">
                              <Row gutter={16} align="middle">
                                <Col span={18}>
                                  <div className="font-semibold text-slate-800">
                                    Đánh giá chất lượng mạng lưới Phòng Giao dịch Bưu điện (PGDBĐ):
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {calculateQualityRating(findingsByCategory.pgdbd).desc}
                                  </div>
                                </Col>
                                <Col span={6} className="text-right">
                                  <Tag color={calculateQualityRating(findingsByCategory.pgdbd).color} className="text-sm px-3 py-1 font-bold">
                                    {calculateQualityRating(findingsByCategory.pgdbd).icon}{' '}
                                    {calculateQualityRating(findingsByCategory.pgdbd).status}
                                  </Tag>
                                </Col>
                              </Row>
                            </Card>
                            <Table
                              dataSource={findingsByCategory.pgdbd}
                              columns={detailedFindingColumns}
                              rowKey="id"
                              pagination={{ pageSize: 8 }}
                              size="middle"
                              bordered
                            />
                          </div>
                        ),
                      },
                      {
                        key: 'HOISO',
                        label: (
                          <span>
                            Khối Hội sở & Chuyên đề (Phụ lục 1 & 2) <Badge count={findingsByCategory.hoiso.length} overflowCount={99} />
                          </span>
                        ),
                        children: (
                          <div className="space-y-3">
                            <Card size="small" className="bg-slate-50 border-slate-200">
                              <Row gutter={16} align="middle">
                                <Col span={18}>
                                  <div className="font-semibold text-slate-800">
                                    Đánh giá chất lượng nghiệp vụ Khối Hội sở & Chuyên đề:
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {calculateQualityRating(findingsByCategory.hoiso).desc}
                                  </div>
                                </Col>
                                <Col span={6} className="text-right">
                                  <Tag color={calculateQualityRating(findingsByCategory.hoiso).color} className="text-sm px-3 py-1 font-bold">
                                    {calculateQualityRating(findingsByCategory.hoiso).icon}{' '}
                                    {calculateQualityRating(findingsByCategory.hoiso).status}
                                  </Tag>
                                </Col>
                              </Row>
                            </Card>
                            <Table
                              dataSource={findingsByCategory.hoiso}
                              columns={detailedFindingColumns}
                              rowKey="id"
                              pagination={{ pageSize: 8 }}
                              size="middle"
                              bordered
                            />
                          </div>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'summaryMinutes',
              label: (
                <span className="font-semibold text-base px-2">
                  <AuditOutlined /> Tab 2: Biên bản kiểm toán tổng hợp (Exit Meeting MB04)
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  <Alert
                    type="warning"
                    showIcon
                    message="Phiên họp thông qua kết quả kiểm toán (Exit Meeting)"
                    description="Biên bản kiểm toán tổng hợp do Trưởng đoàn kiểm toán chủ trì, dùng trong cuộc họp toàn thể với Ban Giám đốc và các cán bộ chủ chốt của Đơn vị được kiểm toán để chính thức chốt phát hiện, trách nhiệm cá nhân (Phụ lục 3B/5B/6B) và kế hoạch cam kết khắc phục."
                  />

                  {/* Mục 1: Thông tin cuộc họp */}
                  <Card title="1. Thông tin Cuộc họp Exit Meeting & Thành phần tham dự" size="small">
                    <Row gutter={16}>
                      <Col span={12}>
                        <Descriptions size="small" column={1} bordered>
                          <Descriptions.Item label="Thời gian họp">
                            {currentMinute?.issueDate ? dayjs(currentMinute.issueDate).format('DD/MM/YYYY') : 'Cuối đợt thực địa'}
                          </Descriptions.Item>
                          <Descriptions.Item label="Địa điểm họp">
                            {currentMinute?.meetingLocation || `Hội trường Trụ sở ${engagement?.branchName || 'ĐVKD'}`}
                          </Descriptions.Item>
                          <Descriptions.Item label="Trưởng đoàn KTNB">
                            <span className="font-semibold text-blue-800">
                              {currentMinute?.leadAuditorName || engagement?.legacyLeadAuditor || 'Trưởng đoàn'}
                            </span>
                          </Descriptions.Item>
                        </Descriptions>
                      </Col>
                      <Col span={12}>
                        <div className="p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                          <div className="font-semibold text-slate-800 mb-1">Thành phần Đoàn KTNB:</div>
                          <pre className="text-slate-600 font-sans whitespace-pre-wrap">
                            {currentMinute?.teamMembersText || '1. Trưởng đoàn\n2. Các Kiểm toán viên thành viên'}
                          </pre>
                          <Divider style={{ margin: '6px 0' }} />
                          <div className="font-semibold text-slate-800 mb-1">Thành phần Đơn vị được kiểm toán:</div>
                          <pre className="text-slate-600 font-sans whitespace-pre-wrap">
                            {currentMinute?.unitRepresentativesText || '1. Giám đốc Chi nhánh\n2. Kế toán trưởng\n3. Trưởng các phòng ban nghiệp vụ'}
                          </pre>
                        </div>
                      </Col>
                    </Row>
                  </Card>

                  {/* Mục 2: Bảng xếp hạng KSNB toàn đơn vị */}
                  <Card title="2. Đánh giá chất lượng Hệ thống Kiểm soát Nội bộ (KSNB) toàn Đơn vị" size="small">
                    <Row gutter={16} align="middle">
                      <Col span={8} className="text-center p-4 border-r border-slate-200">
                        <div className="text-xs text-slate-500 mb-1">XẾP HẠNG TOÀN ĐƠN VỊ</div>
                        <div className="text-2xl font-extrabold text-amber-700 mb-2">
                          {overallQuality.status.toUpperCase()}
                        </div>
                        <Tag color={overallQuality.color} className="text-sm px-3 py-1 font-semibold">
                          {overallQuality.icon} {overallQuality.desc}
                        </Tag>
                      </Col>
                      <Col span={16}>
                        <div className="text-xs font-semibold text-slate-700 mb-2">
                          Tổng hợp xếp hạng theo từng phân hệ nghiệp vụ:
                        </div>
                        <Row gutter={[8, 8]}>
                          <Col span={12}>
                            <div className="p-2 border rounded bg-slate-50 flex justify-between items-center text-xs">
                              <span>Nghiệp vụ Cho vay KHCN:</span>
                              <Tag color={calculateQualityRating(findingsByCategory.khcn).color}>
                                {calculateQualityRating(findingsByCategory.khcn).status}
                              </Tag>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div className="p-2 border rounded bg-slate-50 flex justify-between items-center text-xs">
                              <span>Nghiệp vụ Cho vay KHDN:</span>
                              <Tag color={calculateQualityRating(findingsByCategory.khdn).color}>
                                {calculateQualityRating(findingsByCategory.khdn).status}
                              </Tag>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div className="p-2 border rounded bg-slate-50 flex justify-between items-center text-xs">
                              <span>Phi tín dụng & Kho quỹ:</span>
                              <Tag color={calculateQualityRating(findingsByCategory.ptd).color}>
                                {calculateQualityRating(findingsByCategory.ptd).status}
                              </Tag>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div className="p-2 border rounded bg-slate-50 flex justify-between items-center text-xs">
                              <span>Quản lý mạng lưới PGDBĐ:</span>
                              <Tag color={calculateQualityRating(findingsByCategory.pgdbd).color}>
                                {calculateQualityRating(findingsByCategory.pgdbd).status}
                              </Tag>
                            </div>
                          </Col>
                        </Row>
                      </Col>
                    </Row>
                  </Card>

                  {/* Mục 3: Bảng tổng hợp trách nhiệm cán bộ (Phụ lục 3B, 5B, 6B) */}
                  <Card
                    title="3. Bảng tổng hợp trách nhiệm cá nhân liên quan đến các vi phạm (Phụ lục 3B, 5B, 6B)"
                    size="small"
                  >
                    <Tabs
                      type="card"
                      items={[
                        {
                          key: 'pl3b',
                          label: `Phụ lục 3B: Cán bộ Cho vay (${personnelBreakdown.creditOfficers.length})`,
                          children: (
                            <Table
                              dataSource={personnelBreakdown.creditOfficers}
                              columns={personnelTableColumns}
                              rowKey="name"
                              pagination={{ pageSize: 6 }}
                              size="small"
                              bordered
                            />
                          ),
                        },
                        {
                          key: 'pl5b',
                          label: `Phụ lục 5B: Cán bộ Phi tín dụng & Kho quỹ (${personnelBreakdown.ptdOfficers.length})`,
                          children: (
                            <Table
                              dataSource={personnelBreakdown.ptdOfficers}
                              columns={personnelTableColumns}
                              rowKey="name"
                              pagination={{ pageSize: 6 }}
                              size="small"
                              bordered
                            />
                          ),
                        },
                        {
                          key: 'pl6b',
                          label: `Phụ lục 6B: Cán bộ PGDBĐ & Thẻ (${personnelBreakdown.pgdbdOfficers.length})`,
                          children: (
                            <Table
                              dataSource={personnelBreakdown.pgdbdOfficers}
                              columns={personnelTableColumns}
                              rowKey="name"
                              pagination={{ pageSize: 6 }}
                              size="small"
                              bordered
                            />
                          ),
                        },
                      ]}
                    />
                  </Card>

                  {/* Mục 4: Ý kiến giải trình và Cam kết của ĐVKD */}
                  <Card title="4. Ý kiến giải trình và Cam kết của Đơn vị được kiểm toán" size="small">
                    <Row gutter={16}>
                      <Col span={12}>
                        <div className="font-semibold text-slate-800 text-xs mb-1">
                          Ý kiến của Ban Lãnh đạo Đơn vị được kiểm toán:
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 min-h-[80px]">
                          {currentMinute?.auditeeFeedback ||
                            'Đơn vị đã rà soát và nhất trí với các tồn tại được Đoàn Kiểm toán nội bộ chỉ ra trong Biên bản. Các nội dung giải trình chi tiết đối với từng hồ sơ đã được bổ sung hồ sơ chứng minh.'}
                        </div>
                      </Col>
                      <Col span={12}>
                        <div className="font-semibold text-slate-800 text-xs mb-1">
                          Cam kết thời hạn khắc phục chỉnh sửa:
                        </div>
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 min-h-[80px]">
                          {currentMinute?.commitmentNotes ||
                            'Chi nhánh cam kết phân công các cán bộ liên quan khẩn trương thu thập bổ sung chứng từ, tất toán hồ sơ rủi ro và báo cáo tiến độ khắc phục về Khối KTNB trước ngày 30 hàng tháng.'}
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* ═══════════ MODAL TẠO / CHỈNH SỬA THÔNG TIN BIÊN BẢN ═══════════ */}
      <Modal
        title={editingRecord?.id ? 'Chỉnh sửa Biên bản kiểm toán (MB04)' : 'Khởi tạo Biên bản kiểm toán (MB04)'}
        open={isModalVisible}
        onOk={handleSaveMinute}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="minuteNo"
                label="Số Biên bản"
                rules={[{ required: true, message: 'Vui lòng nhập số biên bản' }]}
              >
                <Input placeholder="VD: BBKT-01/2026/ĐKT" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="decisionNumber" label="Căn cứ Quyết định số">
                <Input placeholder="VD: QĐ-KTNB-12" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="title"
                label="Tiêu đề Biên bản"
                rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
              >
                <Input placeholder="Biên bản kiểm toán tại..." />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="issueDate" label="Ngày ký / Ban hành">
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="auditedUnitName" label="Đơn vị được kiểm toán">
                <Input placeholder="Tên ĐVKD / Chi nhánh" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="leadAuditorName" label="Trưởng đoàn kiểm toán">
                <Input placeholder="Họ và tên Trưởng đoàn" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="fieldworkPeriod" label="Thời gian kiểm toán thực địa">
                <Input placeholder="Từ ngày ... đến ngày ..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="meetingLocation" label="Địa điểm tổ chức họp Exit Meeting">
                <Input placeholder="Phòng họp Trụ sở Chi nhánh..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="teamMembersText" label="Thành phần Đoàn kiểm toán">
                <TextArea rows={4} placeholder="Danh sách cán bộ trong đoàn..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unitRepresentativesText" label="Thành phần Đơn vị được kiểm toán">
                <TextArea rows={4} placeholder="Ban Giám đốc, Kế toán trưởng..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="auditeeFeedback" label="Ý kiến giải trình của Đơn vị">
                <TextArea rows={3} placeholder="Ghi nhận ý kiến thống nhất hoặc bảo lưu..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="commitmentNotes" label="Cam kết thời hạn khắc phục">
                <TextArea rows={3} placeholder="Cam kết hoàn thành chỉnh sửa trước ngày..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái Biên bản">
                <Select>
                  <Option value="Draft">Bản nháp (Draft)</Option>
                  <Option value="Sent">Đã gửi đơn vị xem xét (Sent)</Option>
                  <Option value="Confirmed">Đã thông qua & Ký chốt (Confirmed)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default AuditMinutesPage;
