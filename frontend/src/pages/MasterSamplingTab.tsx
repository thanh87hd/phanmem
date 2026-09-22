import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, Button, Card, Space, Tag, Modal, Form, Input, Select, InputNumber, 
  message, Popconfirm, Tooltip, Segmented, Upload, Divider, Progress
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, BarChartOutlined, ThunderboltOutlined, LineChartOutlined,
  SafetyCertificateOutlined, DownloadOutlined, UserOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import SampleTestingDrawer from './SampleTestingDrawer';
import { SamplingWorkloadCard } from './components/SamplingWorkloadCard';
import { UnassignedSamplesModal } from './components/UnassignedSamplesModal';
import { AutoSamplingModal } from './components/AutoSamplingModal';
import { SamplingAnalyticsDrawer } from './components/SamplingAnalyticsDrawer';
import { BatchSamplesSubTable } from './components/BatchSamplesSubTable';

const { Option } = Select;
const { TextArea } = Input;

const DOMAIN_OPTIONS = [
  { label: '🏦 Tín dụng', value: 'CREDIT' },
  { label: '📋 Phi tín dụng', value: 'NON_CREDIT' },
  { label: '💻 CNTT', value: 'IT' },
  { label: '⚙️ Vận hành', value: 'OPERATIONS' },
];

const EFFECTIVENESS_OPTIONS = [
  { label: '✅ Hiệu quả (Effective)', value: 'EFFECTIVE', color: 'success' },
  { label: '⚠️ Hiệu quả một phần (Partially Effective)', value: 'PARTIALLY_EFFECTIVE', color: 'warning' },
  { label: '❌ Không hiệu quả (Ineffective)', value: 'INEFFECTIVE', color: 'error' },
];

interface MasterSamplingTabProps {
  engagementId: number;
}

const MasterSamplingTab: React.FC<MasterSamplingTabProps> = ({ engagementId }) => {
  const { t } = useTranslation();
  const [batches, setBatches] = useState<any[]>([]);
  const [engagement, setEngagement] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isAssessModalVisible, setIsAssessModalVisible] = useState(false);
  const [isAutoSampleModalVisible, setIsAutoSampleModalVisible] = useState(false);
  const [isAnalyticsDrawerVisible, setIsAnalyticsDrawerVisible] = useState(false);
  const [isUnassignedModalVisible, setIsUnassignedModalVisible] = useState(false);
  const [selectedBatchForAuto, setSelectedBatchForAuto] = useState<any | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // Sample testing drawer
  const [selectedSampleForDrawer, setSelectedSampleForDrawer] = useState<any | null>(null);
  const [isSampleDrawerVisible, setIsSampleDrawerVisible] = useState(false);

  // Controlled expanded rows for batches table so row stays open on updates
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);

  const [form] = Form.useForm();
  const [assessForm] = Form.useForm();
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [assessingBatch, setAssessingBatch] = useState<any | null>(null);
  const [domainFilter, setDomainFilter] = useState<string>('ALL');
  const [auditors, setAuditors] = useState<any[]>([]);

  const getSampleAmount = (s: any): number =>
    Number(
      s.loanAmount ||
      s.sampleData?.outstandingBalance ||
      s.sampleData?.transactionAmount ||
      s.sampleData?.amount ||
      0,
    );

  const fetchBatches = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/audit-samples/batches', { params: { engagementId } });
      setBatches(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      if (!silent) message.error('Không thể tải danh sách tập mẫu');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchEngagement = async () => {
    try {
      const res = await api.get(`/audit-engagements/${engagementId}`);
      setEngagement(res.data);
    } catch (err) {
      console.error('Không thể tải thông tin cuộc kiểm toán', err);
    }
  };

  useEffect(() => {
    if (engagementId) {
      fetchBatches();
      fetchEngagement();
    }
    api
      .get('/users')
      .then((res) => {
        setAuditors(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        console.error('Failed to load users for sampling', err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engagementId]);

  // ─── Team Members Computation (Memoized) ───
  const teamMembersList = useMemo(() => {
    const list: {
      userId: number;
      fullName: string;
      role: string;
      username?: string;
    }[] = [];
    const seen = new Set<number>();

    // 1. Lead Auditor
    if (engagement?.leadAuditorUser?.id) {
      list.push({
        userId: engagement.leadAuditorUser.id,
        fullName: engagement.leadAuditorUser.fullName || engagement.leadAuditorUser.username,
        username: engagement.leadAuditorUser.username,
        role: 'Trưởng đoàn',
      });
      seen.add(engagement.leadAuditorUser.id);
    } else if (engagement?.leadAuditorId) {
      const u = auditors.find((a: any) => a.id === engagement.leadAuditorId);
      list.push({
        userId: engagement.leadAuditorId,
        fullName: u?.fullName || u?.username || engagement.legacyLeadAuditor || 'Trưởng đoàn',
        username: u?.username,
        role: 'Trưởng đoàn',
      });
      seen.add(engagement.leadAuditorId);
    }

    // 2. Team Members from Engagement
    if (Array.isArray(engagement?.teamMembers)) {
      engagement.teamMembers.forEach((m: any) => {
        const uId = m.userId || m.id;
        if (uId && !seen.has(uId)) {
          const sysUser = auditors.find((a: any) => a.id === uId);
          list.push({
            userId: uId,
            fullName: m.fullName || sysUser?.fullName || sysUser?.username || `KTV #${uId}`,
            username: sysUser?.username,
            role: m.role || 'Thành viên đoàn',
          });
          seen.add(uId);
        }
      });
    }

    // 3. Fallback: Any auditor already assigned in batches
    batches.forEach((b: any) => {
      if (b.assignedAuditorId && !seen.has(b.assignedAuditorId)) {
        const sysUser = auditors.find((a: any) => a.id === b.assignedAuditorId);
        list.push({
          userId: b.assignedAuditorId,
          fullName: b.assignedAuditorName || sysUser?.fullName || sysUser?.username || `KTV #${b.assignedAuditorId}`,
          username: sysUser?.username,
          role: 'Thành viên đoàn (Tập mẫu)',
        });
        seen.add(b.assignedAuditorId);
      }
      b.samples?.forEach((s: any) => {
        if (s.assignedAuditorId && !seen.has(s.assignedAuditorId)) {
          const sysUser = auditors.find((a: any) => a.id === s.assignedAuditorId);
          list.push({
            userId: s.assignedAuditorId,
            fullName: s.assignedAuditorName || sysUser?.fullName || sysUser?.username || `KTV #${s.assignedAuditorId}`,
            username: sysUser?.username,
            role: 'Thành viên đoàn (Mẫu)',
          });
          seen.add(s.assignedAuditorId);
        }
      });
    });

    return list;
  }, [engagement, auditors, batches]);

  // ─── Workload & Unassigned Analysis (Memoized) ───
  const { memberWorkload, unassignedSamples, totalSamplesCount } = useMemo(() => {
    const allSamplesWithBatch: any[] = [];
    batches.forEach((b: any) => {
      if (Array.isArray(b.samples)) {
        b.samples.forEach((s: any) => {
          allSamplesWithBatch.push({
            ...s,
            batchId: b.id,
            batchName: b.batchName,
            batchAssignedAuditorId: b.assignedAuditorId,
            batchAssignedAuditorName: b.assignedAuditorName,
          });
        });
      }
    });

    // 1. Calculate per-member metrics
    const memberWorkload = teamMembersList.map((member) => {
      const assignedBatches = batches.filter(
        (b) =>
          b.assignedAuditorId === member.userId ||
          (b.assignedAuditorName &&
            b.assignedAuditorName.trim().toLowerCase() === member.fullName.trim().toLowerCase()),
      );

      const assignedSamples = allSamplesWithBatch.filter((s) => {
        if (s.assignedAuditorId === member.userId) return true;
        if (
          s.assignedAuditorName &&
          s.assignedAuditorName.trim().toLowerCase() === member.fullName.trim().toLowerCase()
        ) {
          return true;
        }
        // Fallback to batch auditor if sample has no individual assignment
        if (
          !s.assignedAuditorId &&
          !s.assignedAuditorName &&
          (s.batchAssignedAuditorId === member.userId ||
            (s.batchAssignedAuditorName &&
              s.batchAssignedAuditorName.trim().toLowerCase() === member.fullName.trim().toLowerCase()))
        ) {
          return true;
        }
        return false;
      });

      const sampleCount = assignedSamples.length;
      const testedCount = assignedSamples.filter(
        (s) => s.testResult && s.testResult !== 'NOT_TESTED',
      ).length;
      const passCount = assignedSamples.filter((s) => s.testResult === 'PASS').length;
      const failCount = assignedSamples.filter((s) => s.testResult === 'FAIL').length;
      const totalAmount = assignedSamples.reduce((sum, s) => sum + getSampleAmount(s), 0);

      return {
        ...member,
        batchCount: assignedBatches.length,
        sampleCount,
        testedCount,
        passCount,
        failCount,
        totalAmount,
        progressPct: sampleCount > 0 ? Math.round((testedCount / sampleCount) * 100) : 0,
      };
    });

    // 2. Identify unassigned samples
    const unassignedSamples: any[] = [];
    allSamplesWithBatch.forEach((s) => {
      // Check if matched to any team member
      const matched = teamMembersList.some((m) => {
        if (s.assignedAuditorId === m.userId) return true;
        if (
          s.assignedAuditorName &&
          s.assignedAuditorName.trim().toLowerCase() === m.fullName.trim().toLowerCase()
        ) {
          return true;
        }
        if (
          !s.assignedAuditorId &&
          !s.assignedAuditorName &&
          (s.batchAssignedAuditorId === m.userId ||
            (s.batchAssignedAuditorName &&
              s.batchAssignedAuditorName.trim().toLowerCase() === m.fullName.trim().toLowerCase()))
        ) {
          return true;
        }
        return false;
      });

      if (!matched) {
        let reason = 'Chưa chỉ định KTV trong file';
        if (s.assignedAuditorName) {
          reason = `Tên KTV trong file ("${s.assignedAuditorName}") chưa khớp thành viên đoàn`;
        } else if (s.batchAssignedAuditorName) {
          reason = `Tên KTV của tập mẫu ("${s.batchAssignedAuditorName}") chưa khớp thành viên đoàn`;
        }

        unassignedSamples.push({
          id: s.id,
          batchId: s.batchId,
          batchName: s.batchName,
          cifOrAccount: s.cifOrAccount || s.sampleCode || `Mẫu #${s.sequenceNo || s.id}`,
          customerName: s.customerName || s.sampleData?.customerName || '-',
          branchCode: s.branchCode || s.sampleData?.branchCode || s.sampleData?.branchName || '-',
          amount: getSampleAmount(s),
          rawAuditorName: s.assignedAuditorName || s.batchAssignedAuditorName || '(Để trống)',
          reason,
        });
      }
    });

    return { memberWorkload, unassignedSamples, totalSamplesCount: allSamplesWithBatch.length };
  }, [batches, teamMembersList]);

  const assignedSamplesCount = totalSamplesCount - unassignedSamples.length;

  const filteredBatches = domainFilter === 'ALL'
    ? batches
    : batches.filter(b => b.auditDomain === domainFilter);

  // ─── Overall Stats ───
  const totalSamples = filteredBatches.reduce((sum, b) => sum + (b.samples?.length || 0), 0);
  const testedSamples = filteredBatches.reduce((sum, b) =>
    sum + (b.samples?.filter((s: any) => s.testResult && s.testResult !== 'NOT_TESTED').length || 0), 0);
  const passCount = filteredBatches.reduce((sum, b) =>
    sum + (b.samples?.filter((s: any) => s.testResult === 'PASS').length || 0), 0);
  const failCount = filteredBatches.reduce((sum, b) =>
    sum + (b.samples?.filter((s: any) => s.testResult === 'FAIL').length || 0), 0);

  // ─── Actions & Handlers ───
  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      const res = await api.get('/audit-samples/template/excel', {
        params: { engagementId },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Mau_nhap_lieu_chon_mau.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success('Đã tải file mẫu Excel thành công (có cột KTV và Sheet nhân sự đoàn)');
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải file mẫu Excel');
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleAssignSampleAuditor = async (sampleId: number, auditorId: number | null) => {
    try {
      const u = auditors.find((item: any) => item.id === auditorId);
      await api.patch(`/audit-samples/samples/${sampleId}`, {
        assignedAuditorId: auditorId || null,
        assignedAuditorName: u ? (u.fullName || u.username) : null,
      });
      message.success('Đã cập nhật KTV cho mẫu kiểm toán');
      fetchBatches(true);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi phân công KTV cho mẫu');
    }
  };

  // ─── Modal handlers ───
  const handleOpenCreateModal = () => {
    setEditingBatch(null);
    form.resetFields();
    form.setFieldsValue({ auditDomain: domainFilter === 'ALL' ? 'CREDIT' : domainFilter });
    setIsModalVisible(true);
  };

  const handleOpenEditModal = (batch: any) => {
    setEditingBatch(batch);
    form.setFieldsValue({
      batchName: batch.batchName,
      auditDomain: batch.auditDomain || 'CREDIT',
      sampleType: batch.sampleType,
      samplingMethod: batch.samplingMethod,
      populationSize: batch.populationSize,
      sampleSize: batch.sampleSize,
      tolerableError: batch.tolerableError,
      confidenceLevel: batch.confidenceLevel,
      populationSource: batch.populationSource,
      notes: batch.notes,
      assignedAuditorId: batch.assignedAuditorId,
    });
    setIsModalVisible(true);
  };

  const handleSaveBatch = async () => {
    try {
      const values = await form.validateFields();
      if (values.assignedAuditorId) {
        const u = auditors.find((item: any) => item.id === values.assignedAuditorId);
        values.assignedAuditorName = u ? (u.fullName || u.username) : '';
      }
      if (editingBatch) {
        await api.patch(`/audit-samples/batches/${editingBatch.id}`, values);
        message.success('Cập nhật tập mẫu thành công');
      } else {
        await api.post('/audit-samples/batches', { ...values, engagementId });
        message.success('Tạo tập mẫu thành công');
      }
      setIsModalVisible(false);
      fetchBatches();
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message || 'Lỗi khi lưu tập mẫu');
    }
  };

  const handleDeleteBatch = async (id: number) => {
    try {
      await api.delete(`/audit-samples/batches/${id}`);
      message.success('Đã xóa tập mẫu');
      fetchBatches();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xóa tập mẫu');
    }
  };

  // ─── Auto-Sampling ───
  const handleOpenAutoSampleModal = (batch: any) => {
    setSelectedBatchForAuto(batch);
    setIsAutoSampleModalVisible(true);
  };

  // ─── Analytics ───
  const handleOpenAnalytics = async (batch: any) => {
    try {
      setAnalyticsLoading(true);
      setIsAnalyticsDrawerVisible(true);
      const res = await api.get(`/audit-samples/batches/${batch.id}/analytics`);
      setAnalyticsData(res.data);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải dữ liệu phân tích tập mẫu');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // ─── Auto-Verify (CAATTs) ───
  const handleAutoVerify = async (batchId: number) => {
    try {
      setLoading(true);
      const res = await api.post(`/audit-samples/batches/${batchId}/auto-verify`);
      message.success(`Đã quét tự động ${res.data.verifiedCount} hồ sơ mẫu: ${res.data.passed} Đạt / ${res.data.failed} Lỗi`);
      fetchBatches();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi quét kiểm tra hồ sơ tự động');
    } finally {
      setLoading(false);
    }
  };

  // ─── Import Excel ───
  const handleImportExcel = async (batchId: number, file: any) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post(`/audit-samples/batches/${batchId}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(res.data.message || `Đã import ${res.data.imported} mẫu`);
      fetchBatches();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi import file Excel');
    }
    return false;
  };

  // ─── HTKSNB Assessment ───
  const handleOpenAssessModal = (batch: any) => {
    setAssessingBatch(batch);
    assessForm.setFieldsValue({
      controlEffectiveness: batch.controlEffectiveness || undefined,
      controlConclusion: batch.controlConclusion || '',
    });
    setIsAssessModalVisible(true);
  };

  const handleSaveAssessment = async () => {
    try {
      const values = await assessForm.validateFields();
      await api.patch(`/audit-samples/batches/${assessingBatch.id}`, values);
      message.success('Đã lưu đánh giá HTKSNB');
      setIsAssessModalVisible(false);
      fetchBatches();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi lưu đánh giá');
    }
  };

  const domainLabel = (domain: string) => {
    const map: Record<string, { text: string; color: string }> = {
      CREDIT: { text: 'Tín dụng', color: 'blue' },
      NON_CREDIT: { text: 'Phi tín dụng', color: 'purple' },
      IT: { text: 'CNTT', color: 'cyan' },
      OPERATIONS: { text: 'Vận hành', color: 'orange' },
    };
    const d = map[domain] || { text: domain, color: 'default' };
    return <Tag color={d.color}>{d.text}</Tag>;
  };

  const effectivenessTag = (eff: string | null) => {
    if (!eff) return <Tag color="default">Chưa đánh giá</Tag>;
    const map: Record<string, { text: string; color: string }> = {
      EFFECTIVE: { text: '✅ Hiệu quả', color: 'success' },
      PARTIALLY_EFFECTIVE: { text: '⚠️ HQ một phần', color: 'warning' },
      INEFFECTIVE: { text: '❌ Không HQ', color: 'error' },
    };
    const e = map[eff] || { text: eff, color: 'default' };
    return <Tag color={e.color}>{e.text}</Tag>;
  };

  // ─── Table columns for Batches ───
  const columns = [
    {
      title: 'Tên tập mẫu',
      dataIndex: 'batchName',
      key: 'batchName',
      ...getColumnSearchProps<any>('batchName', 'Tên tập mẫu'),
      sorter: getColumnSorter<any>('batchName', 'string'),
      render: (text: string) => <strong>{text}</strong>
    },
    {
      title: 'Mảng nghiệp vụ',
      dataIndex: 'auditDomain',
      key: 'auditDomain',
      ...getColumnSelectFilterProps<any>('auditDomain', DOMAIN_OPTIONS.map(d => ({ text: d.label, value: d.value }))),
      sorter: getColumnSorter<any>('auditDomain', 'string'),
      render: (domain: string) => domainLabel(domain),
    },
    {
      title: 'PP chọn mẫu',
      dataIndex: 'samplingMethod',
      key: 'samplingMethod',
      ...getColumnSelectFilterProps<any>('samplingMethod', undefined, batches, (r) => r.samplingMethod || ''),
      sorter: getColumnSorter<any>('samplingMethod', 'string'),
      render: (method: string) => <Tag color="blue">{method}</Tag>
    },
    {
      title: 'Kích thước / Đã sinh',
      key: 'sampleSize',
      sorter: (a: any, b: any) => (a.samples?.length || 0) - (b.samples?.length || 0),
      render: (_: any, record: any) => {
        const count = record.samples?.length || 0;
        return (
          <Space>
            <span className="font-semibold text-blue-600">{count}</span>
            <span className="text-gray-400 text-xs">/ {record.sampleSize || 0} yêu cầu</span>
          </Space>
        );
      }
    },
    {
      title: 'Tiến độ kiểm tra',
      key: 'progress',
      width: 140,
      render: (_: any, record: any) => {
        const total = record.samples?.length || 0;
        const tested = record.samples?.filter((s: any) => s.testResult && s.testResult !== 'NOT_TESTED').length || 0;
        const pct = total > 0 ? Math.round((tested / total) * 100) : 0;
        return (
          <Tooltip title={`${tested}/${total} mẫu đã kiểm tra`}>
            <Progress percent={pct} size="small" strokeColor={pct === 100 ? '#52c41a' : '#ea9105'} />
          </Tooltip>
        );
      }
    },
    {
      title: 'KTV phụ trách tập',
      dataIndex: 'assignedAuditorName',
      key: 'assignedAuditorName',
      render: (name: string, record: any) => {
        const currentAuditorId =
          record.assignedAuditorId ||
          auditors.find(
            (u: any) =>
              (u.fullName || u.username) === (name || record.createdBy),
          )?.id;

        return (
          <Space orientation="vertical" size={2}>
            <Select
              size="small"
              style={{ minWidth: 160 }}
              placeholder="Chưa gán (Chọn KTV)"
              value={currentAuditorId || undefined}
              showSearch
              optionFilterProp="children"
              onChange={async (val) => {
                const u = auditors.find((item: any) => item.id === val);
                try {
                  await api.patch(`/audit-samples/batches/${record.id}`, {
                    assignedAuditorId: val,
                    assignedAuditorName: u ? u.fullName || u.username : '',
                  });
                  message.success('Đã phân công KTV phụ trách tập mẫu');
                  fetchBatches();
                } catch (err) {
                  message.error('Lỗi khi phân công KTV');
                }
              }}
              allowClear
              onClear={async () => {
                try {
                  await api.patch(`/audit-samples/batches/${record.id}`, {
                    assignedAuditorId: null,
                    assignedAuditorName: null,
                  });
                  message.success('Đã hủy gán KTV');
                  fetchBatches();
                } catch (err) {
                  message.error('Lỗi khi cập nhật KTV');
                }
              }}
            >
              <Select.OptGroup label="👥 Nhân sự trong Đoàn kiểm toán">
                {teamMembersList.map((m) => (
                  <Option key={`team-${m.userId}`} value={m.userId}>
                    <UserOutlined className="mr-1 text-blue-500" />
                    {m.fullName} ({m.role})
                  </Option>
                ))}
              </Select.OptGroup>
              <Select.OptGroup label="👤 Kiểm toán viên khác">
                {auditors
                  .filter((u) => !teamMembersList.some((m) => m.userId === u.id))
                  .map((u: any) => (
                    <Option key={`sys-${u.id}`} value={u.id}>
                      {u.fullName || u.username} ({u.role || 'KTV'})
                    </Option>
                  ))}
              </Select.OptGroup>
            </Select>
            {record.changeStatus === 'PendingLeader' && (
              <Tag color="volcano">Chờ Trưởng đoàn duyệt đổi mẫu</Tag>
            )}
            {record.changeStatus === 'Approved' && (
              <Tag color="success">Đã duyệt đổi mẫu</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Đánh giá KSNB',
      dataIndex: 'controlEffectiveness',
      key: 'effectiveness',
      ...getColumnSelectFilterProps<any>('controlEffectiveness', [
        { text: '✅ Hiệu quả', value: 'EFFECTIVE' },
        { text: '⚠️ HQ một phần', value: 'PARTIALLY_EFFECTIVE' },
        { text: '❌ Không HQ', value: 'INEFFECTIVE' },
      ]),
      sorter: getColumnSorter<any>('controlEffectiveness', 'string'),
      render: (_: any, record: any) => effectivenessTag(record.controlEffectiveness),
    },
    {
      title: 'Thao tác & Công cụ',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="⚡ Tự động chọn mẫu thông minh">
            <Button 
              type="primary" 
              size="small" 
              icon={<ThunderboltOutlined />} 
              onClick={() => handleOpenAutoSampleModal(record)} 
              className="bg-amber-600 hover:bg-amber-500 border-none"
            >
              Tự động bốc mẫu
            </Button>
          </Tooltip>
          <Tooltip title="📊 Phân tích Đơn vị & Khách hàng">
            <Button 
              size="small" 
              icon={<LineChartOutlined />} 
              onClick={() => handleOpenAnalytics(record)}
            />
          </Tooltip>
          <Tooltip title="🛡️ Quét đối chiếu kiểm tra tự động (CAATTs)">
            <Button 
              size="small" 
              icon={<SafetyCertificateOutlined />} 
              onClick={() => handleAutoVerify(record.id)}
              className="text-indigo-600"
            />
          </Tooltip>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={(file) => handleImportExcel(record.id, file)}
          >
            <Tooltip title="Import file Excel danh sách mẫu">
              <Button size="small" icon={<UploadOutlined />} className="text-green-600" />
            </Tooltip>
          </Upload>
          <Tooltip title="Đánh giá HTKSNB">
            <Button size="small" icon={<BarChartOutlined />} onClick={() => handleOpenAssessModal(record)} className="text-amber-600" />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => handleOpenEditModal(record)} />
          </Tooltip>
          <Popconfirm title="Chắc chắn xóa tập mẫu này?" onConfirm={() => handleDeleteBatch(record.id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ─── Expandable Row: Individual Samples in Batch ───
  const expandedRowRender = (batchRecord: any) => (
    <BatchSamplesSubTable
      batchRecord={batchRecord}
      auditors={auditors}
      teamMembersList={teamMembersList}
      onAssignSampleAuditor={handleAssignSampleAuditor}
      onOpenSampleDrawer={(sample) => {
        setSelectedSampleForDrawer(sample);
        setIsSampleDrawerVisible(true);
      }}
    />
  );

  return (
    <Card variant="borderless" className="shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
        <div>
          <h3 className="text-lg font-medium m-0">Chọn mẫu tổng thể & Phân tích Đơn vị (Master Sampling Engine)</h3>
          <p className="text-gray-500 m-0 text-sm">
            Tự động chọn mẫu theo mảng Tín dụng / Phi tín dụng, quản lý phân công KTV và theo dõi khối lượng công việc đoàn kiểm toán.
          </p>
        </div>
        <Space wrap>
          <Tooltip title="Tải file Excel mẫu chuẩn có sẵn cột KTV và Sheet danh sách KTV trong đoàn để điền dữ liệu">
            <Button
              icon={<DownloadOutlined />}
              onClick={handleDownloadTemplate}
              loading={downloadingTemplate}
              className="text-emerald-700 border-emerald-300 hover:text-emerald-600 hover:border-emerald-500"
            >
              Tải file mẫu Excel chuẩn (.xlsx)
            </Button>
          </Tooltip>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            Tạo tập mẫu mới
          </Button>
        </Space>
      </div>

      {/* ─── Bảng Tổng Hợp Phân Công Nhân Sự Đoàn Kiểm Toán ─── */}
      <SamplingWorkloadCard
        teamMembersList={teamMembersList}
        memberWorkload={memberWorkload}
        unassignedSamples={unassignedSamples}
        totalSamplesCount={totalSamplesCount}
        assignedSamplesCount={assignedSamplesCount}
        onOpenUnassignedModal={() => setIsUnassignedModalVisible(true)}
      />

      {/* Domain filter */}
      <div className="mb-4">
        <Segmented
          options={[{ label: 'Tất cả', value: 'ALL' }, ...DOMAIN_OPTIONS]}
          value={domainFilter}
          onChange={(v) => setDomainFilter(v as string)}
        />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
          <div className="text-xs text-slate-500">Tổng mẫu trong đợt</div>
          <div className="text-xl font-bold text-slate-700">{totalSamples}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
          <div className="text-xs text-blue-500">Đã kiểm tra</div>
          <div className="text-xl font-bold text-blue-700">
            {testedSamples}
            <span className="text-xs text-blue-400 ml-1">
              ({totalSamples > 0 ? Math.round((testedSamples / totalSamples) * 100) : 0}%)
            </span>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 border border-green-100">
          <div className="text-xs text-green-500 flex items-center gap-1"><CheckCircleOutlined /> Pass</div>
          <div className="text-xl font-bold text-green-700">{passCount}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-100">
          <div className="text-xs text-red-500 flex items-center gap-1"><CloseCircleOutlined /> Fail</div>
          <div className="text-xl font-bold text-red-700">{failCount}</div>
        </div>
      </div>

      {/* Batches Table with Expandable Samples */}
      <Table
        columns={columns}
        dataSource={filteredBatches}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        size="small"
        expandable={{
          expandedRowKeys,
          onExpandedRowsChange: setExpandedRowKeys,
          expandedRowRender,
          rowExpandable: (record) => (record.samples?.length || 0) > 0,
        }}
      />

      {/* ─── Modal: Phân Bổ Mẫu Chưa Được Phân Công (Unassigned Samples Modal) ─── */}
      <UnassignedSamplesModal
        visible={isUnassignedModalVisible}
        unassignedSamples={unassignedSamples}
        teamMembersList={teamMembersList}
        auditors={auditors}
        onClose={() => setIsUnassignedModalVisible(false)}
        onAssignSampleAuditor={handleAssignSampleAuditor}
        onBulkAssignSuccess={fetchBatches}
      />

      {/* ─── Modal: Tự động bốc mẫu thông minh ─── */}
      <AutoSamplingModal
        visible={isAutoSampleModalVisible}
        batch={selectedBatchForAuto}
        onClose={() => setIsAutoSampleModalVisible(false)}
        onSuccess={fetchBatches}
      />

      {/* ─── Drawer: Phân tích Dữ liệu Tập Mẫu theo Chi nhánh & Khách hàng ─── */}
      <SamplingAnalyticsDrawer
        visible={isAnalyticsDrawerVisible}
        analyticsData={analyticsData}
        loading={analyticsLoading}
        onClose={() => setIsAnalyticsDrawerVisible(false)}
      />

      {/* Create/Edit Batch Modal */}
      <Modal
        title={editingBatch ? "Sửa Tập Mẫu" : "Tạo Tập Mẫu Mới"}
        open={isModalVisible}
        onOk={handleSaveBatch}
        onCancel={() => setIsModalVisible(false)}
        width={750}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="batchName" label="Tên tập mẫu" rules={[{ required: true, message: 'Vui lòng nhập tên tập mẫu' }]}>
            <Input placeholder="VD: Mẫu Hồ sơ Tín dụng KHDN Q2/2026" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="auditDomain" label="Mảng nghiệp vụ" rules={[{ required: true }]}>
              <Select>
                {DOMAIN_OPTIONS.map(d => (
                  <Option key={d.value} value={d.value}>{d.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="sampleType" label="Loại mẫu" initialValue="DETAIL">
              <Select>
                <Option value="DETAIL">Mẫu chi tiết (Detail)</Option>
                <Option value="PROCESS_CONTROL">Kiểm soát quy trình (Process Control)</Option>
              </Select>
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="samplingMethod" label="Phương pháp chọn mẫu" initialValue="RANDOM">
              <Select>
                <Option value="RANDOM">Ngẫu nhiên (Random)</Option>
                <Option value="SYSTEMATIC">Hệ thống (Systematic)</Option>
                <Option value="JUDGMENTAL">Xét đoán (Judgmental)</Option>
                <Option value="MUS">Đơn vị tiền tệ (MUS)</Option>
                <Option value="STRATIFIED">Phân tầng (Stratified)</Option>
              </Select>
            </Form.Item>
          </div>

          <Divider className="my-3" />

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="populationSize" label="Quy mô tổng thể (Population)">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="sampleSize" label="Kích thước mẫu (Sample Size)">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="confidenceLevel" label="Mức tin cậy (%)">
              <InputNumber className="w-full" min={0} max={100} />
            </Form.Item>
          </div>

          <Form.Item name="populationSource" label="Nguồn dữ liệu tổng thể">
            <Input placeholder="VD: Trích xuất từ CoreBanking ngày 01/06/2026" />
          </Form.Item>

          <Form.Item name="assignedAuditorId" label="KTV phụ trách tập mẫu">
            <Select
              placeholder="Chọn KTV phụ trách tập mẫu"
              allowClear
              showSearch
              optionFilterProp="children"
            >
              <Select.OptGroup label="👥 Nhân sự trong Đoàn kiểm toán">
                {teamMembersList.map((m) => (
                  <Option key={`form-team-${m.userId}`} value={m.userId}>
                    {m.fullName} ({m.role})
                  </Option>
                ))}
              </Select.OptGroup>
              <Select.OptGroup label="👤 Kiểm toán viên khác">
                {auditors
                  .filter((u) => !teamMembersList.some((m) => m.userId === u.id))
                  .map((u: any) => (
                    <Option key={`form-sys-${u.id}`} value={u.id}>
                      {u.fullName || u.username} ({u.role || 'KTV'})
                    </Option>
                  ))}
              </Select.OptGroup>
            </Select>
          </Form.Item>

          <Form.Item name="notes" label="Ghi chú">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* HTKSNB Assessment Modal */}
      <Modal
        title={
          <Space>
            <BarChartOutlined className="text-amber-600" />
            <span>Đánh giá Hệ thống Kiểm soát Nội bộ</span>
          </Space>
        }
        open={isAssessModalVisible}
        onOk={handleSaveAssessment}
        onCancel={() => setIsAssessModalVisible(false)}
        okText={t('common.btnSaveEvaluation', 'Lưu đánh giá')}
        width={650}
      >
        {assessingBatch && (
          <div className="mb-4 bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-sm"><strong>Tập mẫu:</strong> {assessingBatch.batchName}</div>
            <div className="text-sm">
              <strong>Mảng:</strong> {domainLabel(assessingBatch.auditDomain || 'CREDIT')}
              <strong className="ml-4">Mẫu:</strong> {assessingBatch.samples?.length || 0} records
            </div>
          </div>
        )}
        <Form form={assessForm} layout="vertical">
          <Form.Item name="controlEffectiveness" label="Kết luận hiệu quả KSNB" rules={[{ required: true, message: 'Vui lòng chọn đánh giá' }]}>
            <Select placeholder="Chọn mức đánh giá">
              {EFFECTIVENESS_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="controlConclusion" label="Kết luận chi tiết của KTV">
            <TextArea rows={4} placeholder="Ghi nhận kết luận về hiệu quả vận hành của hệ thống kiểm soát nội bộ đối với nghiệp vụ được kiểm tra..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Sample Testing Drawer (Biên bản kiểm tra mẫu) */}
      <SampleTestingDrawer
        open={isSampleDrawerVisible}
        onClose={() => {
          setIsSampleDrawerVisible(false);
          setSelectedSampleForDrawer(null);
        }}
        sample={selectedSampleForDrawer}
        onSaved={fetchBatches}
      />
    </Card>
  );
};

export default MasterSamplingTab;
