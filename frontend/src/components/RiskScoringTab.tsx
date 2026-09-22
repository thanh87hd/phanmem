/**
 * RiskScoringTab.tsx
 * Tab chấm điểm rủi ro kiểm toán (Tuyến 3) — Nâng cấp chuyên nghiệp
 * Bao gồm: Bảng đánh giá, workflow phê duyệt, search/filter, export Excel, modal chi tiết
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Space, Typography, Card, Modal, Form, Select, Tag, InputNumber,
  Row, Col, message, Spin, Input, Tooltip, Drawer, Descriptions, Timeline, Badge, Divider, Popconfirm,
  Segmented, Checkbox, Alert,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SafetyCertificateOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SendOutlined, EyeOutlined,
  DownloadOutlined, SearchOutlined, HistoryOutlined, FilterOutlined,
  RadarChartOutlined, ThunderboltOutlined, SyncOutlined, FireOutlined, WarningOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import { useCurrentUser } from '../utils/useCurrentUser';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter, removeVietnameseTones, matchRecordSearch } from '../utils/tableFilterHelper';
import RiskGroupOverview from './RiskGroupOverview';
import BulkImport from './BulkImport';
import UnifiedRiskScoringModal from './UnifiedRiskScoringModal';
import { RiskScoringDetailDrawer } from './risk-scoring/RiskScoringDetailDrawer';
import { ContinuousMonitoringInsightsModal } from './risk-scoring/ContinuousMonitoringInsightsModal';
import { RiskScoringRejectModal } from './risk-scoring/RiskScoringRejectModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

/**
 * 12 Tiêu chí nhận diện Đơn vị Rủi ro Cao theo Điều 4.3 Quy trình 3002 (BKS 30/06/2026)
 */
export const HIGH_RISK_CRITERIA_LIST = [
  { key: 'directorChanged12M', label: '1. Thay đổi Giám đốc trong vòng 12 tháng' },
  { key: 'keyPersonnelChanged', label: '2. Thay đổi nhiều cán bộ vị trí chủ chốt' },
  { key: 'staffDisciplined12M', label: '3. Có nhiều nhân sự bị kỷ luật trong vòng 12 tháng' },
  { key: 'turnoverRateOver25Pct', label: '4. Tỷ lệ nhân viên nghỉ việc ≥ 25% trong 12 tháng gần nhất' },
  { key: 'relatedPartyWithDirector', label: '5. Cán bộ vị trí quan trọng có quan hệ gia đình/họ hàng với Giám đốc (hoặc với nhau)' },
  { key: 'newProductLaunched12M', label: '6. Có các sản phẩm, dịch vụ mới trong vòng 12 tháng' },
  { key: 'lossInLast2Years', label: '7. Đơn vị thua lỗ trong bất kỳ giai đoạn nào trong vòng 02 năm gần nhất' },
  { key: 'repeatViolationFound', label: '8. Sai phạm nghiêm trọng, tái phạm nhiều lần qua thanh tra/kiểm toán trước' },
  { key: 'unresolvedFindings', label: '9. Không chỉnh sửa đầy đủ các kiến nghị sau kiểm tra/kiểm toán' },
  { key: 'boardAttentionUrgent', label: '10. HĐQT/Ban TGĐ có sự quan tâm, lưu ý hoặc yêu cầu xử lý gấp' },
  { key: 'nplAboveSystemAverage', label: '11. Danh mục tín dụng có vấn đề, nợ quá hạn và nợ xấu vượt mức bình quân hệ thống' },
  { key: 'creditGrowthAnomaly', label: '12. Tăng trưởng tín dụng vượt bình quân hệ thống / Biến động bất thường BCTC' },
];



const getStatusTag = (status: string) => {
  const config: Record<string, { color: string; label: string; icon?: React.ReactNode }> = {
    Draft: { color: 'default', label: 'Nháp', icon: <EditOutlined /> },
    Submitted: { color: 'processing', label: 'Chờ duyệt', icon: <SendOutlined /> },
    Approved: { color: 'success', label: 'Đã duyệt', icon: <CheckCircleOutlined /> },
    Rejected: { color: 'error', label: 'Bị từ chối', icon: <CloseCircleOutlined /> },
  };
  const c = config[status] || { color: 'default', label: status };
  return <Tag color={c.color} icon={c.icon} style={{ fontWeight: 600 }}>{c.label}</Tag>;
};

interface RiskScoringTabProps {
  auditUniverses: any[];
  riskCriteria: any[];
  criteriaLoading: boolean;
}

const RiskScoringTab: React.FC<RiskScoringTabProps> = ({
  auditUniverses,
  riskCriteria,
  criteriaLoading,
}) => {
  const { t } = useTranslation();

  const getLevelColor = (level: string) => {
    if (level.includes(t('riskAssessment.groupOverview.levels.1', 'Hạng 1'))) return 'success';
    if (level.includes(t('riskAssessment.groupOverview.levels.2', 'Hạng 2'))) return 'lime';
    if (level.includes(t('riskAssessment.groupOverview.levels.3', 'Hạng 3'))) return 'warning';
    if (level.includes(t('riskAssessment.groupOverview.levels.4', 'Hạng 4'))) return 'orange';
    if (level.includes(t('riskAssessment.groupOverview.levels.5', 'Hạng 5'))) return 'error';
    if (level === 'High' || level === 'Critical') return 'error';
    if (level === 'Medium') return 'warning';
    if (level === 'Low') return 'success';
    return 'default';
  };
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterYear, setFilterYear] = useState<number | undefined>(new Date().getFullYear());
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isUnifiedRiskModalVisible, setIsUnifiedRiskModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modal từ chối
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // IIA 2024: Group filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // IIA 2024: Residual risk auto-calculation
  const CONTROL_MULTIPLIERS: Record<string, number> = {
    Strong: 0.3, Adequate: 0.5, Weak: 0.8, Ineffective: 1.0,
  };
  const [residualRiskScore, setResidualRiskScore] = useState(0);
  const [recommendedFrequency, setRecommendedFrequency] = useState('Annual');

  // Continuous Monitoring Recommendations Modal State
  const [cmModalVisible, setCmModalVisible] = useState(false);
  const [cmRecommendations, setCmRecommendations] = useState<any[]>([]);
  const [cmLoading, setCmLoading] = useState(false);

  const fetchCmRecommendations = async () => {
    setCmLoading(true);
    try {
      const res = await api.get('/continuous-monitoring/planning-recommendations');
      setCmRecommendations(res.data || []);
      setCmModalVisible(true);
    } catch {
      message.error('Không thể tải dữ liệu đề xuất từ Giám sát liên tục');
    } finally {
      setCmLoading(false);
    }
  };

  const currentUser = useCurrentUser();

  

  const fetchRiskAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterYear) params.year = filterYear;
      if (filterStatus) params.status = filterStatus;
      if (searchText) params.search = searchText;
      const response = await api.get('/risk-assessments', { params });
      setData(response.data);
    } catch (error) {
      message.error('Lỗi khi tải dữ liệu đánh giá rủi ro');
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterStatus, searchText]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRiskAssessments();
  }, [fetchRiskAssessments]);

  const handleAdd = () => {
    setEditingRecord(null);
    setIsUnifiedRiskModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setIsUnifiedRiskModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/risk-assessments/${id}`);
      message.success('Đã xóa đánh giá');
      fetchRiskAssessments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi xóa đánh giá');
    }
  };

  

  // Workflow actions
  const handleSubmit = async (id: number) => {
    try {
      await api.patch(`/risk-assessments/${id}/submit`);
      message.success('Đã gửi đánh giá để phê duyệt');
      fetchRiskAssessments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi gửi duyệt');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/risk-assessments/${id}/approve`, {
        reviewedBy: currentUser?.id || 0,
        reviewedByName: currentUser?.fullName || currentUser?.username || 'Reviewer',
        reviewNotes: t('auditCommitteePortal.table.btnApprove', 'Phê duyệt'),
      });
      message.success('Đã phê duyệt đánh giá rủi ro');
      fetchRiskAssessments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi phê duyệt');
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectReason) {
      message.warning('Vui lòng nhập lý do từ chối');
      return;
    }
    try {
      await api.patch(`/risk-assessments/${rejectingId}/reject`, {
        reviewedBy: currentUser?.id || 0,
        reviewedByName: currentUser?.fullName || currentUser?.username || 'Reviewer',
        reviewNotes: rejectReason,
      });
      message.success('Đã từ chối đánh giá rủi ro');
      setRejectModalOpen(false);
      setRejectReason('');
      setRejectingId(null);
      fetchRiskAssessments();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi từ chối');
    }
  };

  const handleViewDetail = async (record: any) => {
    setSelectedRecord(record);
    setDetailDrawerOpen(true);
    // Load history if auditUniverseId exists
    if (record.auditUniverseId) {
      setHistoryLoading(true);
      try {
        const response = await api.get(`/risk-assessments/history/${record.auditUniverseId}`);
        setHistoryData(response.data);
      } catch {
        setHistoryData([]);
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const handleExportExcel = () => {
    const exportData = data.map(d => ({
      [t('auditPlan.tabs3.cols.process', 'Quy trình / Đơn vị')]: d.universeName,
      [t('riskAssessment.excel.department', 'Bộ phận')]: d.department || '',
      [t('auditPlan.cols.year', 'Năm')]: d.assessmentYear,
      [t('riskAssessment.excel.totalScore', 'Tổng điểm')]: d.totalScore,
      'Mức rủi ro': d.riskLevel,
      [t('riskAssessment.excel.impact', 'Ảnh hưởng')]: d.impact,
      [t('riskAssessment.excel.likelihood', 'Khả năng')]: d.likelihood,
      'Trạng thái': d.status,
      'Người đánh giá': d.assessedByName || '',
      'Người duyệt': d.reviewedByName || '',
      [t('auditPlan.cols.notes', 'Ghi chú')]: d.notes || '',
    }));
    exportToExcel(exportData, columns, 'Danh_gia_rui_ro');
  };

  // Category label helper
  const CATEGORY_LABELS: Record<string, string> = {
    HoiSo: 'Hội sở', ChiNhanh: 'Chi nhánh', PGD: 'PGD',
  };

  // Control effectiveness color helper
  const getControlColor = (ce: string) => {
    if (ce === 'Strong') return 'success';
    if (ce === 'Adequate') return 'processing';
    if (ce === 'Weak') return 'warning';
    if (ce === 'Ineffective') return 'error';
    return 'default';
  };

  // Audit frequency label helper
  const FREQ_LABELS: Record<string, string> = {
    Annual: 'Hàng năm',
    Biennial: '2 năm/lần',
    Triennial: '3 năm/lần',
    AdHoc: 'Đột xuất',
  };

  const columns = [
    {
      title: t('auditPlan.tabs3.cols.process', 'Quy trình / Đơn vị'),
      dataIndex: 'universeName',
      key: 'universeName',
      width: 250,
      fixed: 'left' as const,
      ...getColumnSearchProps<any>('universeName', 'Quy trình / Đơn vị'),
      sorter: getColumnSorter<any>('universeName', 'string'),
      render: (text: string, record: any) => (
        <div style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 600, color: '#262626', whiteSpace: 'normal', wordBreak: 'break-word' }}>
            {text || '—'}
          </div>
          {record.department && (
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>{record.department}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Nhóm KT',
      dataIndex: 'auditCategory',
      key: 'auditCategory',
      width: 110,
      align: 'center' as const,
      ...getColumnSelectFilterProps<any>('auditCategory', Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ text: v, value: k }))),
      sorter: getColumnSorter<any>('auditCategory', 'string'),
      render: (cat: string) => (
        <Tag style={{ fontSize: 11 }}>{CATEGORY_LABELS[cat] || cat || '—'}</Tag>
      ),
    },
    {
      title: t('auditPlan.cols.year', 'Năm'),
      dataIndex: 'assessmentYear',
      key: 'assessmentYear',
      width: 85,
      align: 'center' as const,
      sorter: (a: any, b: any) => a.assessmentYear - b.assessmentYear,
    },
    {
      title: t('riskAssessment.excel.totalScore', 'Tổng điểm'),
      dataIndex: 'totalScore',
      key: 'totalScore',
      width: 105,
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.totalScore || 0) - (b.totalScore || 0),
      render: (score: number) => (
        <strong style={{
          color: score >= 75 ? '#389e0d' : score >= 40 ? '#d46b08' : '#cf1322',
          fontSize: 14,
        }}>
          {typeof score === 'number' ? Number(score.toFixed(1)) : (score ?? '—')}
        </strong>
      ),
    },
    {
      title: 'Kiểm soát',
      dataIndex: 'controlEffectiveness',
      key: 'controlEffectiveness',
      width: 115,
      align: 'center' as const,
      ...getColumnSelectFilterProps<any>('controlEffectiveness', [
        { text: 'Strong', value: 'Strong' },
        { text: 'Adequate', value: 'Adequate' },
        { text: 'Weak', value: 'Weak' },
        { text: 'Ineffective', value: 'Ineffective' },
      ]),
      sorter: getColumnSorter<any>('controlEffectiveness', 'string'),
      render: (ce: string) => ce ? (
        <Tag color={getControlColor(ce)} style={{ fontSize: 11 }}>{ce}</Tag>
      ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
    {
      title: 'RR Còn lại',
      dataIndex: 'residualRiskScore',
      key: 'residualRiskScore',
      width: 110,
      align: 'center' as const,
      sorter: (a: any, b: any) => (a.residualRiskScore || 0) - (b.residualRiskScore || 0),
      render: (score: number) => (score !== undefined && score !== null) ? (
        <strong style={{
          color: score >= 40 ? '#cf1322' : score >= 25 ? '#d46b08' : '#389e0d',
          fontSize: 14,
        }}>
          {typeof score === 'number' ? Number(score.toFixed(1)) : score}
        </strong>
      ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
    {
      title: t('riskAssessment.excel.auditFrequency', 'Tần suất KT'),
      dataIndex: 'auditFrequency',
      key: 'auditFrequency',
      width: 120,
      align: 'center' as const,
      ...getColumnSelectFilterProps<any>('auditFrequency', Object.entries(FREQ_LABELS).map(([k, v]) => ({ text: v, value: k }))),
      sorter: getColumnSorter<any>('auditFrequency', 'string'),
      render: (freq: string) => freq ? (
        <Tag color={freq === 'Annual' ? 'red' : freq === 'Biennial' ? 'orange' : 'green'}
          style={{ fontSize: 11 }}
        >
          {FREQ_LABELS[freq] || freq}
        </Tag>
      ) : <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
    {
      title: 'ĐV Rủi ro cao (QT 3002)',
      key: 'isHighRiskUnit',
      width: 165,
      align: 'center' as const,
      filters: [
        { text: 'Rủi ro cao (≥2 tiêu chí)', value: true },
        { text: 'Bình thường (<2 tiêu chí)', value: false },
      ],
      onFilter: (value: any, record: any) => (record.isHighRiskUnit || (record.highRiskCount || 0) >= 2) === value,
      render: (_: any, record: any) => {
        const isHigh = record.isHighRiskUnit || (record.highRiskCount || 0) >= 2;
        const count = record.highRiskCount || (record.highRiskFactors ? Object.values(record.highRiskFactors).filter(Boolean).length : 0);
        return isHigh ? (
          <Tooltip title={`Đạt ${count}/12 tiêu chí nhận diện Đơn vị rủi ro cao theo Điều 4.3 QT 3002. Bắt buộc kiểm toán hàng năm (Mục 5.3 QC 3001).`}>
            <Tag color="red" icon={<FireOutlined />} style={{ fontWeight: 700 }}>
              Rủi ro cao ({count}/12)
            </Tag>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
        );
      }
    },
    {
      title: t('riskAssessment.excel.riskLevel', 'Mức độ Rủi ro'),
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 155,
      align: 'center' as const,
      ...getColumnSelectFilterProps<any>('riskLevel', [
        { text: 'Hạng 1 (Tốt)', value: 'Hạng 1 (Tốt)' },
        { text: 'Hạng 2 (Khá)', value: 'Hạng 2 (Khá)' },
        { text: 'Hạng 3 (Trung bình)', value: 'Hạng 3 (Trung bình)' },
        { text: 'Hạng 4 (Yếu)', value: 'Hạng 4 (Yếu)' },
        { text: 'Hạng 5 (Kém)', value: 'Hạng 5 (Kém)' },
      ]),
      sorter: getColumnSorter<any>('riskLevel', 'string'),
      render: (level: string) => (
        <Tag color={getLevelColor(level)} style={{ fontWeight: 600, fontSize: 12, padding: '2px 8px' }}>{level || '—'}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 125,
      align: 'center' as const,
      ...getColumnSelectFilterProps<any>('status', [
        { text: 'Draft', value: 'Draft' },
        { text: 'Submitted', value: 'Submitted' },
        { text: 'Approved', value: 'Approved' },
        { text: 'Rejected', value: 'Rejected' },
      ]),
      sorter: getColumnSorter<any>('status', 'string'),
      render: (status: string) => getStatusTag(status || 'Draft'),
    },
    {
      title: 'Người đánh giá',
      dataIndex: 'assessedByName',
      key: 'assessedByName',
      width: 140,
      ellipsis: true,
      ...getColumnSearchProps<any>('assessedByName', 'Người đánh giá'),
      sorter: getColumnSorter<any>('assessedByName', 'string'),
      render: (name: string) => name || <Text type="secondary" style={{ fontSize: 11 }}>—</Text>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      fixed: 'right' as const,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size={2}>
          <Tooltip title="Xem chi tiết">
            <Button type="text" size="small" icon={<EyeOutlined />}
              style={{ color: '#d97706' }}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>

          {(record.status === 'Draft' || record.status === 'Rejected') && (
            <>
              <Tooltip title="Sửa (Chấm điểm đồng nhất)">
                <Button type="text" size="small" icon={<EditOutlined />}
                  style={{ color: '#ea9105' }}
                  onClick={() => handleEdit(record)}
                />
              </Tooltip>
              <Tooltip title="Gửi duyệt">
                <Popconfirm
                  title="Gửi đánh giá để phê duyệt?"
                  description="Sau khi gửi, bạn sẽ không thể sửa cho đến khi được phê duyệt hoặc bị từ chối."
                  onConfirm={() => handleSubmit(record.id)}
                  okText={t('common.btnSubmit', 'Gửi duyệt')}
                  cancelText={t('common.btnCancel', 'Hủy')}
                >
                  <Button type="text" size="small" icon={<SendOutlined />}
                    style={{ color: '#ea9105' }}
                  />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Xóa">
                <Popconfirm
                  title="Xóa đánh giá này?"
                  onConfirm={() => handleDelete(record.id)}
                  okText={t('common.btnDelete', 'Xóa')}
                  cancelText={t('common.btnCancel', 'Hủy')}
                >
                  <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                </Popconfirm>
              </Tooltip>
            </>
          )}

          {record.status === 'Submitted' && (
            <>
              <Tooltip title={t('auditCommitteePortal.table.btnApprove', 'Phê duyệt')}>
                <Popconfirm
                  title="Phê duyệt đánh giá rủi ro này?"
                  onConfirm={() => handleApprove(record.id)}
                  okText={t('auditCommitteePortal.table.btnApprove', 'Phê duyệt')}
                  cancelText={t('common.btnCancel', 'Hủy')}
                >
                  <Button type="text" size="small" icon={<CheckCircleOutlined />}
                    style={{ color: '#52c41a' }}
                  />
                </Popconfirm>
              </Tooltip>
              <Tooltip title="Từ chối">
                <Button type="text" size="small" icon={<CloseCircleOutlined />}
                  danger
                  onClick={() => {
                    setRejectingId(record.id);
                    setRejectModalOpen(true);
                  }}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const filteredData = data
    .filter((item: any) => !selectedCategory || item.auditCategory === selectedCategory)
    .filter((item: any) => !filterYear || item.assessmentYear === Number(filterYear))
    .filter((item: any) => !filterStatus || item.status === filterStatus)
    .filter((item: any) => matchRecordSearch(item, searchText));

  const categoryOptions = [
    { value: 'HoiSo', label: 'Hội sở', icon: '🏢' },
    { value: 'ChiNhanh', label: 'Chi nhánh', icon: '🏦' },
    { value: 'PGD', label: 'PGD', icon: '📍' },
    { value: 'HeThong', label: 'Hệ thống IT', icon: '💻' },
    { value: 'ChuyenDe', label: 'Nghiệp vụ', icon: '📋' },
  ];

  const segmentedOptions = categoryOptions.map(cat => ({
    value: cat.value,
    label: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4px 8px' }}>
        <span style={{ fontSize: 18 }}>{cat.icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{cat.label}</span>
      </div>
    ),
  }));

  return (
    <div>
      {/* IIA 2024: Group Overview Dashboard */}
      <RiskGroupOverview
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        year={filterYear}
      />

      {/* Thanh công cụ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input.Search
            placeholder="Tìm theo tên quy trình, đơn vị..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          />
          <Select
            allowClear
            placeholder={t('auditPlan.cols.year', 'Năm')}
            value={filterYear}
            onChange={setFilterYear}
            style={{ width: 110 }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <Option key={y} value={y}>{y}</Option>
            ))}
          </Select>
          <Select
            allowClear
            placeholder="Trạng thái"
            value={filterStatus}
            onChange={setFilterStatus}
            style={{ width: 140 }}
          >
            <Option value="Draft">Nháp</Option>
            <Option value="Submitted">Chờ duyệt</Option>
            <Option value="Approved">Đã duyệt</Option>
            <Option value="Rejected">Bị từ chối</Option>
          </Select>
          {(searchText || filterYear || filterStatus || selectedCategory) && (
            <Button
              type="link"
              onClick={() => {
                setSearchText('');
                setFilterYear(undefined);
                setFilterStatus(undefined);
                setSelectedCategory(null);
              }}
              style={{ padding: 0 }}
            >
              Xóa bộ lọc
            </Button>
          )}
        </div>
        <Space>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            disabled={data.length === 0}
          >
            Tải Excel
          </Button>
          <BulkImport
            module="risk-assessments"
            onSuccess={fetchRiskAssessments}
            fileName="Danh_gia_rui_ro"
            templateData={[
              {
                [t('auditPlan.tabs3.cols.process', 'Quy trình / Đơn vị')]: t('riskAssessment.groupOverview.categories.HeThong.description', 'Kiểm toán hệ thống công nghệ thông tin, an ninh mạng'),
                [t('riskAssessment.excel.department', 'Bộ phận')]: t('riskScoringTab.informationTechnologyDepartment', 'Phòng Công nghệ thông tin'),
                [t('riskAssessment.excel.auditCategory', 'Nhóm kiểm toán')]: selectedCategory || 'HeThong',
                [t('auditPlan.cols.year', 'Năm')]: new Date().getFullYear(),
                [t('riskAssessment.excel.totalScore', 'Tổng điểm')]: 75,
                [t('riskAssessment.excel.impact', 'Ảnh hưởng')]: 4,
                [t('riskAssessment.excel.likelihood', 'Khả năng')]: 3,
                [t('riskAssessment.excel.riskLevel', 'Mức độ Rủi ro')]: t('scoringTab.level2', 'Hạng 2 (Khá)'),
                [t('riskAssessment.excel.controlEffectiveness', 'Hiệu quả Kiểm soát')]: t('riskScoringTab.adequateFull', 'Adequate (Đầy đủ)'),
                [t('riskAssessment.excel.riskVelocity', 'Tốc độ biến động RR')]: t('riskScoringTab.stable', 'Stable (Ổn định)'),
                [t('riskAssessment.excel.riskAppetite', 'Khẩu vị rủi ro')]: t('scoringTab.modal.raMitigate', 'Mitigate (Giảm thiểu)'),
                [t('riskAssessment.excel.auditFrequency', 'Tần suất KT')]: t('scoringTab.modal.freqBiennial', '2 năm'),
                [t('riskAssessment.excel.riskDesc', 'Mô tả rủi ro chính')]: t('riskScoringTab.risksOfNetworkSecurityAndSystem', 'Rủi ro về an ninh mạng, rò rỉ dữ liệu hệ thống'),
                [t('riskAssessment.excel.mitigationPlan', 'Biện pháp giảm thiểu')]: t('riskScoringTab.strengthenFirewallsAndPeriodicallyTestPenetration', 'Tăng cường tường lửa và kiểm tra thâm nhập định kỳ'),
                [t('auditPlan.cols.notes', 'Ghi chú')]: t('riskScoringTab.gradedDraftForPlanningPurposes', 'Đã chấm điểm nháp phục vụ lập kế hoạch'),
              }
            ]}
          />
          <Button
            icon={<RadarChartOutlined style={{ color: '#ea9105' }} />}
            loading={cmLoading}
            onClick={fetchCmRecommendations}
            className="shadow-sm border-amber-200 hover:border-amber-500 font-semibold text-amber-700"
          >
            Insights Giám Sát Liên Tục
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
            onClick={handleAdd}
          >
            Chấm điểm mới
          </Button>
        </Space>
      </div>

      {/* Thống kê nhanh */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        {[
          { label: 'Tổng', value: data.length, color: '#d97706' },
          { label: 'Nháp', value: data.filter(d => d.status === 'Draft').length, color: '#8c8c8c' },
          { label: 'Chờ duyệt', value: data.filter(d => d.status === 'Submitted').length, color: '#ea9105' },
          { label: 'Đã duyệt', value: data.filter(d => d.status === 'Approved').length, color: '#52c41a' },
          { label: 'Bị từ chối', value: data.filter(d => d.status === 'Rejected').length, color: '#ff4d4f' },
        ].map(s => (
          <Col key={s.label} flex="1">
            <Card size="small" variant="borderless" style={{ borderTop: `3px solid ${s.color}`, borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <Text style={{ fontSize: 11, color: '#8c8c8c' }}>{s.label}</Text>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Bảng dữ liệu */}
      <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '30', '50', '100'],
            showTotal: (total) => `Tổng ${total} đánh giá`,
          }}
          loading={loading}
          size="middle"
          scroll={{ x: 1700 }}
          sticky={true}
          rowClassName={(record: any) => {
            if (record.status === 'Rejected') return 'ant-table-row-error';
            if (record.riskLevel?.includes(t('riskAssessment.groupOverview.levels.4', 'Hạng 4')) || record.riskLevel?.includes(t('riskAssessment.groupOverview.levels.5', 'Hạng 5')))
              return 'ant-table-row-warning';
            return '';
          }}
        />
      </Card>

      {/* MODAL TỪ CHỐI */}
      <RiskScoringRejectModal
        open={rejectModalOpen}
        rejectReason={rejectReason}
        onChangeReason={setRejectReason}
        onOk={handleReject}
        onCancel={() => { setRejectModalOpen(false); setRejectReason(''); }}
      />

      {/* DRAWER CHI TIẾT */}
      <RiskScoringDetailDrawer
        open={detailDrawerOpen}
        selectedRecord={selectedRecord}
        historyData={historyData}
        historyLoading={historyLoading}
        onClose={() => { setDetailDrawerOpen(false); setSelectedRecord(null); }}
        getStatusTag={getStatusTag}
        getLevelColor={getLevelColor}
      />

      {/* MODAL INSIGHTS GIÁM SÁT LIÊN TỤC */}
      <ContinuousMonitoringInsightsModal
        open={cmModalVisible}
        onClose={() => setCmModalVisible(false)}
        cmRecommendations={cmRecommendations}
      />

      {/* MÀN HÌNH CHẤM ĐIỂM RỦI RO ĐỒNG NHẤT */}
      <UnifiedRiskScoringModal
        visible={isUnifiedRiskModalVisible}
        initialData={editingRecord}
        targetType="RiskAssessment"
        auditUniverses={auditUniverses}
        riskCriteria={riskCriteria}
        onCancel={() => {
          setIsUnifiedRiskModalVisible(false);
          setEditingRecord(null);
        }}
        onSuccess={() => {
          fetchRiskAssessments();
        }}
      />
    </div>
  );
};

export default RiskScoringTab;
