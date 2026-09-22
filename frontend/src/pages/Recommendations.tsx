import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, Tag, message, Select, Progress, Tooltip, Badge, Row, Col, InputNumber, DatePicker, Tabs, Descriptions } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  UploadOutlined, PaperClipOutlined, PlusOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, ClockCircleOutlined, SafetyOutlined,
  ReloadOutlined, VerifiedOutlined, DownloadOutlined, WarningOutlined,
  InfoCircleOutlined, FileTextOutlined, SolutionOutlined, HistoryOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import EvidenceManager from '../components/EvidenceManager';
import DynamicFormRenderer, { extractCustomFields } from '../components/DynamicFormRenderer';
import { RecommendationCreateModal } from './recommendations/RecommendationCreateModal';
import { RecommendationActionModals } from './recommendations/RecommendationActionModals';
import { RecommendationTimeline } from './recommendations/RecommendationTimeline';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const Recommendations: React.FC = () => {
  const { t } = useTranslation();

  const statusConfig: Record<string, { color: string; label: string }> = {
    NotStarted: { color: 'default', label: t('executionDashboard.cols.notStarted', 'Chưa bắt đầu') },
    InProgress: { color: 'blue', label: t('auditEngagements.statusLabels.InProgress', 'Đang thực hiện') },
    Completed: { color: 'green', label: t('workingPapers.actions.completed', 'Đã hoàn thành') },
    Overdue: { color: 'red', label: t('findingsAnalytics.remediationTab.legendOverdue', 'Quá hạn') },
    Verified: { color: 'purple', label: t('recommendations.statusLabels.Verified', 'Đã xác nhận KTV') },
  };

  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [isVerifyVisible, setIsVerifyVisible] = useState(false);
  const [isCloseVisible, setIsCloseVisible] = useState(false);
  const [isSelfMonitorVisible, setIsSelfMonitorVisible] = useState(false);
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [createForm] = Form.useForm();
  const [verifyForm] = Form.useForm();
  const [closeForm] = Form.useForm();
  const [selfMonitorForm] = Form.useForm();

  // QT 3002: Phê duyệt Gia hạn & Giám sát Tuyến 2 (Khối NV Hội sở)
  const [isExtensionReviewVisible, setIsExtensionReviewVisible] = useState(false);
  const [extensionReviewRec, setExtensionReviewRec] = useState<any>(null);
  const [extensionReviewForm] = Form.useForm();

  const [isLine2Visible, setIsLine2Visible] = useState(false);
  const [line2Rec, setLine2Rec] = useState<any>(null);
  const [line2Form] = Form.useForm();

  const [findings, setFindings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [slaFilter, setSlaFilter] = useState<string>('All');
  const [closureStatusFilter, setClosureStatusFilter] = useState<string>('All');
  const [selfMonitorWatch, setSelfMonitorWatch] = useState(false);
  const [customFieldsDef, setCustomFieldsDef] = useState<any[]>([]);
  const watchedDeptId = Form.useWatch('departmentId', createForm);
  const selectedDept = departments.find((d: any) => d.id === watchedDeptId);
  const auditeeUsers = selectedDept 
    ? users.filter((u: any) => !u.department || u.department.toLowerCase().includes(selectedDept.name.toLowerCase()) || selectedDept.name.toLowerCase().includes(u.department.toLowerCase()) || u.department === selectedDept.code)
    : users;

  const handleApproveExtension = async (approved: boolean) => {
    try {
      const values = await extensionReviewForm.validateFields();
      await api.post(`/recommendations/${extensionReviewRec.id}/approve-extension`, {
        approved,
        notes: values.notes,
      });
      message.success(approved ? 'Đã phê duyệt gia hạn kiến nghị' : 'Đã từ chối đơn gia hạn');
      setIsExtensionReviewVisible(false);
      fetchAll();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi xử lý đơn gia hạn');
    }
  };

  const handleSubmitLine2Monitoring = async () => {
    try {
      const values = await line2Form.validateFields();
      await api.post(`/recommendations/${line2Rec.id}/line2-monitor`, values);
      message.success('Đã cập nhật ý kiến giám sát Tuyến 2 thành công');
      setIsLine2Visible(false);
      fetchAll();
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Lỗi khi lưu ý kiến giám sát');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [recsRes, statsRes, findingsRes, deptsRes, usersRes, customFieldsRes] = await Promise.all([
        api.get('/recommendations'),
        api.get('/recommendations/stats').catch(() => ({ data: null })),
        api.get('/audit-findings').catch(() => ({ data: [] })),
        api.get('/departments').catch(() => ({ data: [] })),
        api.get('/users').catch(() => ({ data: [] })),
        api.get('/custom-fields?entityType=Recommendation').catch(() => ({ data: [] })),
      ]);
      setData(recsRes.data || []);
      setStats(statsRes.data);
      setFindings(findingsRes.data || []);
      setDepartments(deptsRes.data || []);
      setUsers(usersRes.data || []);
      setCustomFieldsDef(customFieldsRes.data || []);
    } catch {
      message.error(t('independence.messages.loadError', 'Lỗi khi tải dữ liệu'));
    } finally {
      setLoading(false);
    }
  };
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { 
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll(); 
    
    const queryParams = new URLSearchParams(location.search);
    const queryClosureStatus = queryParams.get('closureStatus');
    const stateClosureStatus = location.state?.closureStatus;
    const targetClosureStatus = stateClosureStatus || queryClosureStatus;
    if (targetClosureStatus) {
      setClosureStatusFilter(targetClosureStatus);
    }

    if (location.state && location.state.autoCreate) {
      setTimeout(() => {
        createForm.resetFields();
        createForm.setFieldsValue({
          findingId: location.state.findingId,
          finding: location.state.findingTitle,
          recommendation: location.state.recommendation,
          department: location.state.department,
          dueDate: location.state.dueDate
        });
        setIsCreateVisible(true);
        navigate('/recommendations', { replace: true, state: {} });
      }, 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, location.search]);

  const handleCheckOverdue = async () => {
    try {
      const res = await api.post('/recommendations/check-overdue');
      message.success(res.data?.message || t('recommendations.messages.checkOverdueSuccess', 'Đã kiểm tra kiến nghị quá hạn'));
      fetchAll();
    } catch {
      message.error(t('recommendations.messages.checkOverdueError', 'Lỗi khi kiểm tra quá hạn'));
    }
  };

  const handleCreate = () => {
    createForm.resetFields();
    setIsCreateVisible(true);
  };

  const handleCreateOk = async () => {
    try {
      const values = await createForm.validateFields();
      const finding = findings.find(f => f.id === values.findingId);
      await api.post('/recommendations', {
        finding: finding?.findingTitle || values.finding || '',
        findingId: values.findingId,
        recommendation: values.recommendation,
        departmentId: values.departmentId,
        auditeeOwnerId: values.auditeeOwnerId,
        auditeeOwnerName: users.find((u: any) => u.id === values.auditeeOwnerId)?.fullName || '',
        ktnbReviewerId: values.ktnbReviewerId,
        ktnbReviewerName: users.find((u: any) => u.id === values.ktnbReviewerId)?.fullName || '',
        assignedToId: values.ktnbReviewerId,
        assignedTo: users.find((u: any) => u.id === values.ktnbReviewerId)?.fullName || '',
        dueDate: values.dueDate?.format?.('YYYY-MM-DD') || values.dueDate,
        status: 'NotStarted',
        closureStatus: 'Open',
        customFields: extractCustomFields(values),
      });
      message.success(t('recommendations.messages.createSuccess', 'Đã tạo kiến nghị mới'));
      setIsCreateVisible(false);
      fetchAll();
    } catch (err: any) {
      message.error(err.response?.data?.message || t('recommendations.messages.createError', 'Lỗi khi tạo kiến nghị'));
    }
  };

  const handleOpenVerify = (record: any) => {
    setSelectedRec(record);
    verifyForm.resetFields();
    setIsVerifyVisible(true);
  };

  const handleVerify = async () => {
    try {
      const values = await verifyForm.validateFields();
      await api.post(`/recommendations/${selectedRec.id}/verify`, { notes: values.notes });
      message.success(t('recommendations.messages.verifySuccess', 'Đã xác nhận khắc phục thành công!'));
      setIsVerifyVisible(false);
      fetchAll();
    } catch {
      message.error(t('recommendations.messages.verifyError', 'Lỗi khi xác nhận'));
    }
  };

  const handleCloseConfirm = async () => {
    try {
      const values = await closeForm.validateFields();
      await api.post(`/recommendations/${selectedRec.id}/close`, { closedReason: values.closedReason });
      message.success(t('recommendations.messages.closeSuccess', 'Đã đóng kiến nghị thành công!'));
      setIsCloseVisible(false);
      fetchAll();
    } catch (err: any) {
      message.error(err.response?.data?.message || t('recommendations.messages.closeError', 'Lỗi khi đóng kiến nghị'));
    }
  };

  const handleSelfMonitorSave = async () => {
    try {
      const values = await selfMonitorForm.validateFields();
      await api.patch(`/recommendations/${selectedRec.id}/self-monitor`, {
        selfMonitored: values.selfMonitored,
        selfMonitorFrequency: values.selfMonitored ? values.selfMonitorFrequency : null,
      });
      message.success(t('recommendations.messages.selfMonitorSuccess', 'Cập nhật chế độ tự theo dõi thành công!'));
      setIsSelfMonitorVisible(false);
      fetchAll();
    } catch {
      message.error(t('recommendations.messages.selfMonitorError', 'Lỗi khi cập nhật tự theo dõi'));
    }
  };

  const postAction = async (url: string, body: any, success: string) => {
    try {
      await api.post(url, body);
      message.success(success);
      fetchAll();
    } catch (error: any) {
      message.error(error.response?.data?.message || t('recommendations.messages.actionError', 'Không thể thực hiện thao tác'));
    }
  };

  const handleExportFull = async () => {
    try {
      const response = await api.get('/recommendations/export-full', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Findings_Recommendations_Full.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success(t('recommendations.messages.exportSuccess', 'Đã tải Excel tổng hợp'));
    } catch {
      message.error(t('recommendations.messages.exportError', 'Lỗi khi xuất Excel tổng hợp'));
    }
  };

  const columns = [
    {
      title: t('auditeePortal.table.findingText', 'Phát hiện'), 
      dataIndex: 'finding', 
      key: 'finding', 
      width: 220,
      ellipsis: true,
      ...getColumnSearchProps<any>('finding', 'Phát hiện'),
      sorter: getColumnSorter<any>('finding', 'string'),
      render: (text: string) => <Text strong className="text-sm">{text}</Text>,
    },
    {
      title: t('auditeePortal.table.recommendation', 'Kiến nghị'), 
      dataIndex: 'recommendation', 
      key: 'recommendation', 
      width: 240,
      ellipsis: true,
      ...getColumnSearchProps<any>('recommendation', 'Kiến nghị'),
      sorter: getColumnSorter<any>('recommendation', 'string'),
      render: (text: string) => <Tooltip title={text}><Text className="text-sm">{text}</Text></Tooltip>,
    },
    ...customFieldsDef.filter((f: any) => f.showInTable).map((f: any) => ({
      title: f.label,
      dataIndex: ['customFields', f.name],
      key: `cf_${f.name}`,
      width: 130,
      render: (val: any) => {
        if (Array.isArray(val)) return val.join(', ');
        if (typeof val === 'boolean') return val ? 'Có' : 'Không';
        return val || '-';
      }
    })),
    { 
      title: t('auditEngagements.cols.department', 'Đơn vị'), 
      key: 'department', 
      width: 130, 
      ...getColumnSelectFilterProps<any>('department', undefined, data, (r) => r.department?.name || r.legacyDepartmentName || ''),
      sorter: getColumnSorter<any>('department', 'string', (r) => r.department?.name || r.legacyDepartmentName || ''),
      render: (_: any, r: any) => <Text className="text-sm">{r.department?.name || r.legacyDepartmentName || '-'}</Text> 
    },
    {
      title: t('recommendations.cols.dueDate', 'Hạn SLA'), 
      dataIndex: 'dueDate', 
      key: 'dueDate', 
      width: 110,
      ...getColumnSearchProps<any>('dueDate', 'Hạn SLA'),
      sorter: getColumnSorter<any>('dueDate', 'date'),
      render: (date: string) => <Text className="text-sm">{date || '-'}</Text>,
    },
    {
      title: t('auditeePortal.table.progress', 'Tiến độ'), 
      key: 'progress', 
      width: 120,
      sorter: (a: any, b: any) => (a.progressPercent || 0) - (b.progressPercent || 0),
      render: (_: any, r: any) => (
        <Progress
          percent={r.progressPercent || 0}
          size="small"
          status={r.status === 'Overdue' ? 'exception' : r.status === 'Verified' ? 'success' : 'active'}
        />
      ),
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status', 
      width: 140,
      ...getColumnSelectFilterProps<any>('status', Object.entries(statusConfig).map(([k, v]) => ({ text: v.label, value: k })), data),
      sorter: getColumnSorter<any>('status', 'string'),
      render: (status: string, record: any) => {
        const cfg = statusConfig[status] || statusConfig.NotStarted;
        const slaLabel = record.slaStatus === 'QuaHan' ? [t('findingsAnalytics.remediationTab.legendOverdue', 'Quá hạn')] : record.slaStatus === 'GiaHan' ? [t('recommendations.slaOptions.GiaHan', 'Gia hạn')] : t('recommendations.slaOptions.ChuaDenHan', 'Chưa đến hạn');
        const slaColor = record.slaStatus === 'QuaHan' ? 'red' : record.slaStatus === 'GiaHan' ? 'blue' : 'green';
        return (
          <Space orientation="vertical" size={2} style={{ display: 'flex' }}>
            <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
            {record.closureStatus !== 'Closed' && status !== 'Verified' && (
              <Tag color={slaColor} style={{ margin: 0 }}>SLA: {slaLabel}</Tag>
            )}
            {record.escalationLevel > 0 && (
              <Tag color={record.escalationLevel === 3 ? 'red' : record.escalationLevel === 2 ? 'orange' : 'gold'} style={{ fontSize: 10, margin: 0, fontWeight: 500 }}>
                ⚠️ Leo thang Lvl {record.escalationLevel}
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: t('recommendations.cols.owners', 'Phụ trách/Rà soát'),
      key: 'owners',
      width: 180,
      ...getColumnSearchProps<any>('owners', 'Phụ trách', (r) => `${r.auditeeOwnerName || ''} ${r.ktnbReviewerName || ''} ${r.assignedTo || ''}`),
      render: (_: any, record: any) => (
        <Space orientation="vertical" size={0}>
          <Text className="text-xs">ĐVĐKT: {record.auditeeOwnerName || '-'}</Text>
          <Text className="text-xs">KTNB: {record.ktnbReviewerName || record.assignedTo || '-'}</Text>
          <Tag color={record.closureStatus === 'Closed' ? 'green' : record.closureStatus === 'PendingTeamLeadOpinion' ? 'orange' : 'default'} style={{ marginTop: 4 }}>
            {record.closureStatus || 'Open'}
          </Tag>
          {record.selfMonitored && (
            <Tag color="cyan" style={{ marginTop: 4 }}>
              Tự theo dõi ({record.selfMonitorFrequency === '6thang' ? [t('recommendations.selfMonitorModal.freqOptions.6months', '6 tháng')] : record.selfMonitorFrequency === 'quarterly' ? [t('recommendations.selfMonitorModal.freqOptions.quarterly', 'Hàng quý')] : record.selfMonitorFrequency === 'yearly' ? [t('auditPlan.tabs2.annual', 'Hàng năm')] : record.selfMonitorFrequency || t('recommendations.periodic', 'Định kỳ')})
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Tuyến 2 (Khối NV Hội sở)',
      key: 'line2',
      width: 170,
      render: (_: any, record: any) => (
        <Space orientation="vertical" size={1}>
          <Text className="text-xs font-semibold text-blue-900">{record.line2Department || 'Khối NV Hội sở'}</Text>
          <Tag color={record.line2MonitoringStatus === 'Satisfied' ? 'green' : record.line2MonitoringStatus === 'NeedsAction' ? 'red' : 'blue'} style={{ fontSize: 10 }}>
            {record.line2MonitoringStatus === 'Satisfied' ? 'Đã đạt yêu cầu' : record.line2MonitoringStatus === 'NeedsAction' ? 'Cần bổ sung' : 'Đang giám sát'}
          </Tag>
          {record.line2Notes && (
            <Tooltip title={record.line2Notes}>
              <Text type="secondary" className="text-[11px] block truncate max-w-[150px] italic">
                "{record.line2Notes}"
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'), key: 'action', width: 360, fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space wrap>
          {record.extensionStatus === 'Pending' && (
            <Button
              size="small"
              type="primary"
              style={{ backgroundColor: '#fa8c16', borderColor: '#fa8c16' }}
              onClick={() => {
                setExtensionReviewRec(record);
                extensionReviewForm.resetFields();
                setIsExtensionReviewVisible(true);
              }}
            >
              Duyệt gia hạn ⏳
            </Button>
          )}
          <Button
            size="small"
            style={{ borderColor: '#ea9105', color: '#ea9105' }}
            onClick={() => {
              setLine2Rec(record);
              line2Form.resetFields();
              line2Form.setFieldsValue({
                line2Department: record.line2Department || '',
                line2MonitoringStatus: record.line2MonitoringStatus || 'Monitoring',
                line2Notes: record.line2Notes || '',
              });
              setIsLine2Visible(true);
            }}
          >
            Tuyến 2 giám sát
          </Button>
          <Button size="small" onClick={() => postAction(`/recommendations/${record.id}/request-closure`, {}, t('recommendations.closeRequestSent', 'Đã gửi yêu cầu đóng'))}>
            {t('recommendations.actionBtns.requestClose', 'Yêu cầu đóng')}
          </Button>
          <Button size="small" onClick={() => postAction(`/recommendations/${record.id}/ktnb-review`, { notes: t('recommendations.internalAuditConfirmedFromTheMonitoring', 'KTNB xác nhận từ màn hình theo dõi') }, t('recommendations.internalAuditConfirmed', 'Đã xác nhận KTNB'))}>
            {t('recommendations.actionBtns.confirmKtnb', 'KTNB xác nhận')}
          </Button>
          <Button size="small" onClick={() => {
            Modal.confirm({
              title: t('recommendations.leadOpinionModal.title', 'Ý kiến Trưởng đoàn'),
              content: (
                <Input.TextArea
                  id="teamLeadOpinionInput"
                  rows={4}
                  placeholder={t('recommendations.leadOpinionModal.placeholder', 'Nhập ý kiến trước khi đóng kiến nghị')}
                />
              ),
              onOk: () => {
                const value = (document.getElementById('teamLeadOpinionInput') as HTMLTextAreaElement)?.value;
                return postAction(`/recommendations/${record.id}/team-lead-opinion`, { opinion: value }, t('recommendations.theOpinionOfTheDelegationLeader', 'Đã lưu ý kiến Trưởng đoàn'));
              },
            });
          }}>
            {t('recommendations.actionBtns.leadOpinion', 'Ý kiến TĐ')}
          </Button>
          <Button size="small" danger onClick={() => {
            setSelectedRec(record);
            closeForm.resetFields();
            setIsCloseVisible(true);
          }}>
            {t('regulatoryKB.btnClose', 'Đóng')}
          </Button>
          <Button size="small" type="dashed" onClick={() => {
            setSelectedRec(record);
            selfMonitorForm.setFieldsValue({
              selfMonitored: record.selfMonitored || false,
              selfMonitorFrequency: record.selfMonitorFrequency || undefined,
            });
            setSelfMonitorWatch(record.selfMonitored || false);
            setIsSelfMonitorVisible(true);
          }}>
            {t('recommendations.actionBtns.selfMonitor', 'Tự theo dõi')}
          </Button>
          {record.status === 'Completed' && (
            <Tooltip title="KTV xác nhận khắc phục">
              <Button
                type="primary"
                size="small"
                icon={<SafetyOutlined />}
                className="bg-purple-500 border-purple-500"
                onClick={() => handleOpenVerify(record)}
              >
                Verify
              </Button>
            </Tooltip>
          )}
          {record.status === 'Verified' && (
            <Tag color="purple" icon={<CheckCircleOutlined />}>{t('auditeePortal.status.verified', 'Đã xác nhận')}</Tag>
          )}
        </Space>
      ),
    },
  ];

  const filteredData = data
    .filter((item: any) => filterRecursive(item, searchText))
    .filter((item: any) => slaFilter === 'All' || (item.slaStatus || 'ChuaDenHan') === slaFilter)
    .filter((item: any) => closureStatusFilter === 'All' || (item.closureStatus || 'Open') === closureStatusFilter);

  const handleExportExcel = () => {
    exportToExcel(filteredData, columns, 'Theo_doi_kien_nghi');
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1">{t('recommendations.title', 'Theo dõi Kiến nghị Kiểm toán')}</Title>
          <Text className="text-gray-500">{t('recommendations.subtitle', 'Quản lý và giám sát tiến độ khắc phục kiến nghị')}</Text>
        </div>
        <Space wrap>
          <Select value={closureStatusFilter} onChange={(val) => setClosureStatusFilter(val)} style={{ width: 195 }} placeholder="Quy trình đóng hồ sơ...">
            <Option value="All">Tất cả quy trình đóng</Option>
            <Option value="Open">Chưa yêu cầu đóng</Option>
            <Option value="PendingKTNBReview">Chờ KTV thẩm tra (B4)</Option>
            <Option value="PendingLeadOpinion">Chờ Trưởng đoàn (B5)</Option>
            <Option value="PendingCAEApproval">Chờ CAE phê duyệt</Option>
            <Option value="Closed">Đã đóng hồ sơ</Option>
          </Select>
          <Select value={slaFilter} onChange={(val) => setSlaFilter(val)} style={{ width: 140 }} placeholder={t('recommendations.filterSla', 'Lọc SLA...')}>
            <Option value="All">{t('recommendations.allSla', 'Tất cả SLA')}</Option>
            <Option value="ChuaDenHan">{t('recommendations.slaOptions.ChuaDenHan', 'Chưa đến hạn')}</Option>
            <Option value="QuaHan">{t('findingsAnalytics.remediationTab.legendOverdue', 'Quá hạn')}</Option>
            <Option value="GiaHan">{t('recommendations.slaOptions.GiaHan', 'Gia hạn')}</Option>
          </Select>
          <Input.Search
            placeholder={t('recommendations.searchPlaceholder', 'Tìm kiến nghị, đơn vị...')}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 230 }}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel} disabled={filteredData.length === 0}>
            {t('personnel.export', 'Tải Excel')}
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExportFull}>
            {t('recommendations.btnExportFull', 'Xuất tổng hợp')}
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleCheckOverdue}>
            Kiểm tra Quá hạn
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            {t('recommendations.btnCreate', 'Tạo Kiến nghị')}
          </Button>
        </Space>
      </div>

      {/* Stats Row */}
      {stats && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} sm={8} lg={4}>
            <Card variant="borderless" className="shadow-sm text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <Text className="text-xs text-gray-500">{t('recommendations.stats.total', 'Tổng cộng')}</Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="borderless" className="shadow-sm text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <Text className="text-xs text-gray-500">{t('auditEngagements.statusLabels.Done', 'Hoàn thành')}</Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="borderless" className="shadow-sm text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.verified}</div>
              <Text className="text-xs text-gray-500">{t('auditeePortal.status.verified', 'Đã xác nhận')}</Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="borderless" className="shadow-sm text-center">
              <div className="text-2xl font-bold text-blue-500">{stats.inProgress}</div>
              <Text className="text-xs text-gray-500">{t('findingsAnalytics.historySection.statusInProgress', 'Đang xử lý')}</Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="borderless" className="shadow-sm text-center">
              <div className="text-2xl font-bold text-red-500">{stats.overdue}</div>
              <Text className="text-xs text-gray-500">{t('findingsAnalytics.remediationTab.legendOverdue', 'Quá hạn')}</Text>
            </Card>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <Card variant="borderless" className="shadow-sm text-center">
              <div className="text-2xl font-bold text-orange-500">{stats.pendingTeamLeadOpinion || 0}</div>
              <Text className="text-xs text-gray-500">{t('recommendations.stats.pendingOpinion', 'Chờ ý kiến TĐ')}</Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* SLA & Self-monitoring Stats Row */}
      {stats && (stats.slaChuaDenHan !== undefined || stats.selfMonitoredCount !== undefined) && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="shadow-sm text-center bg-green-50/20 border border-green-100">
              <div className="text-xl font-bold text-green-600">{stats.slaChuaDenHan || 0}</div>
              <Text className="text-xs text-gray-600">{t('recommendations.stats.slaChuaDenHan', 'SLA Chưa đến hạn')}</Text>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="shadow-sm text-center bg-red-50/20 border border-red-100">
              <div className="text-xl font-bold text-red-600">{stats.slaQuaHan || 0}</div>
              <Text className="text-xs text-gray-600">{t('recommendations.stats.slaQuaHan', 'SLA Quá hạn')}</Text>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="shadow-sm text-center bg-blue-50/20 border border-blue-100">
              <div className="text-xl font-bold text-blue-600">{stats.slaGiaHan || 0}</div>
              <Text className="text-xs text-gray-600">{t('recommendations.stats.slaGiaHan', 'SLA Gia hạn')}</Text>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card variant="borderless" className="shadow-sm text-center bg-cyan-50/20 border border-cyan-100">
              <div className="text-xl font-bold text-cyan-600">{stats.selfMonitoredCount || 0}</div>
              <Text className="text-xs text-gray-600">{t('recommendations.stats.selfMonitored', 'Giao tự theo dõi')}</Text>
            </Card>
          </Col>
        </Row>
      )}

      {stats && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} lg={8}>
            <Card title={t('recommendations.stats.byRisk', 'Phát hiện theo mức RR')} variant="borderless" className="shadow-sm">
              {Object.entries(stats.byFindingRiskLevel || {}).map(([level, count]: any) => (
                <div key={level} className="flex justify-between mb-2">
                  <Tag color={level === 'Critical' ? 'red' : level === 'High' ? 'orange' : 'blue'}>{level}</Tag>
                  <Text strong>{count}</Text>
                </div>
              ))}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={t('recommendations.stats.byDept', 'Hoàn thành theo đơn vị')} variant="borderless" className="shadow-sm">
              {Object.entries(stats.byDepartment || {}).slice(0, 5).map(([dept, item]: any) => (
                <div key={dept} className="mb-2">
                  <div className="flex justify-between"><Text className="text-xs">{dept}</Text><Text className="text-xs">{item.completionRate}%</Text></div>
                  <Progress percent={item.completionRate} size="small" />
                </div>
              ))}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={t('recommendations.stats.byEng', 'Hoàn thành theo CTKT')} variant="borderless" className="shadow-sm">
              {Object.entries(stats.byEngagement || {}).slice(0, 5).map(([eng, item]: any) => (
                <div key={eng} className="mb-2">
                  <div className="flex justify-between"><Text className="text-xs">{eng}</Text><Text className="text-xs">{item.completionRate}%</Text></div>
                  <Progress percent={item.completionRate} size="small" />
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Table */}
      <Card variant="borderless" className="shadow-sm">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1680 }}
          expandable={{
            expandedRowRender: (record: any) => {
              const finding = record.auditFinding || {};
              
              const getDaysRemaining = (dueDate: string) => {
                if (!dueDate) return null;
                const today = dayjs();
                const due = dayjs(dueDate);
                return due.diff(today, 'day');
              };
              
              const getRiskTag = (level: string) => {
                const colors: Record<string, string> = {
                  Critical: 'red',
                  High: 'volcano',
                  Medium: 'warning',
                  Low: 'green'
                };
                return <Tag color={colors[level] || 'blue'}>{level || t('auditeePortal.detail.unclassified', 'Chưa phân loại')}</Tag>;
              };

              const getFeasibilityTag = (feas: any) => {
                if (feas === undefined || feas === null) return <Tag color="warning">{t('auditeePortal.detail.unevaluated', 'Chưa đánh giá')}</Tag>;
                return feas ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>{t('auditeePortal.detail.feasible', 'Có thể khắc phục')}</Tag>
                ) : (
                  <Tag color="red" icon={<ExclamationCircleOutlined />}>{t('auditeePortal.detail.unfeasible', 'Không thể khắc phục')}</Tag>
                );
              };

              const getEscalationAlert = () => {
                if (!record.escalationLevel || record.escalationLevel === 0) return null;
                return (
                  <div className="mb-4 p-3 rounded border" style={{ background: '#fff2e8', borderColor: '#ffbb96' }}>
                    <Text strong style={{ color: '#d4380d' }}>
                      <WarningOutlined style={{ marginRight: 6 }} />
                      {t('auditeePortal.detail.escalationTitle', 'Hồ sơ Cảnh báo Leo thang (Escalation Profile):')}
                    </Text>
                    <Text type="danger" style={{ display: 'block', fontSize: 13, marginTop: 4 }}>
                      {record.escalationLevel === 3 
                        ? t('auditeePortal.detail.escalationLevel3', '🔴 Cảnh báo Cấp 3 (Hạn chót trễ > 60 ngày): Sự việc đã được tự động leo thang báo cáo khẩn cấp lên Ban Kiểm Soát & Giám đốc Khối KTNB.')
                        : record.escalationLevel === 2
                        ? t('auditeePortal.detail.escalationLevel2', '🟠 Cảnh báo Cấp 2 (Hạn chót trễ > 30 ngày): Đã gửi cảnh báo leo thang nhắc nhở và giải trình tới Giám đốc Vùng và Ban Điều Hành phụ trách.')
                        : t('auditeePortal.detail.escalationLevel1', '🟡 Cảnh báo Cấp 1 (Hạn chót trễ > 15 ngày): Đã gửi cảnh báo trực tiếp Giám đốc Chi nhánh quản lý.')}
                    </Text>
                    {record.escalatedAt && (
                      <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                        Thời điểm leo thang gần nhất: {dayjs(record.escalatedAt).format('DD/MM/YYYY HH:mm:ss')}
                      </Text>
                    )}
                  </div>
                );
              };

              return (
                <div className="p-5 bg-[#fafafa] rounded-xl border border-gray-200 shadow-inner">
                  {getEscalationAlert()}
                  <RecommendationTimeline 
                    recommendation={record} 
                    onRefresh={fetchRecommendations} 
                  />
                  
                  <Tabs
                    type="card"
                    size="small"
                    items={[
                      {
                        key: 'finding_details',
                        label: (
                          <span className="font-semibold text-gray-700">
                            <FileTextOutlined style={{ marginRight: 4, color: '#ea9105' }} />
                            {t('auditeePortal.tabs.findingInfo', '1. Thông tin Phát hiện & Sai phạm (BCKT)')}
                          </span>
                        ),
                        children: (
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <div className="border-b border-gray-100 pb-3 mb-4 flex justify-between items-start">
                              <div>
                                <Text strong style={{ fontSize: 15, color: '#1f1f1f' }}>{finding.findingTitle || record.finding || t('auditeePortal.detail.findingErrorDesc', 'Chi tiết sai sót phát hiện')}</Text>
                                <div className="text-xs text-gray-400 mt-1">
                                  {t('auditeePortal.detail.findingCodeLabel', 'Mã phát hiện:')} <Tag color="blue" className="text-[10px] py-0 px-1 m-0">{finding.findingCode || `FD-${finding.id || record.id || 'N/A'}`}</Tag> | 
                                  Số BCKT: <span className="font-semibold text-gray-600">{finding.engagement?.reportNumber || 'N/A'}</span>
                                </div>
                              </div>
                              <div>
                                {getRiskTag(finding.riskLevel || record.riskLevel)}
                              </div>
                            </div>

                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={12}>
                                <Card size="small" title={<span className="text-xs font-bold text-gray-600">{t('auditeePortal.detail.targetProductTitle', '📂 ĐỐI TƯỢNG & SẢN PHẨM SAI PHẠM (A-AA)')}</span>} variant="borderless" className="bg-gray-50/50">
                                  <Descriptions column={1} size="small" layout="horizontal" contentStyle={{ fontSize: 13 }} labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}>
                                    <Descriptions.Item label={t('auditeePortal.detail.colCif', 'Số TK / CIF')}>{finding.cifOrAccount || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.colCustName', 'Tên khách hàng')}>{finding.customerName || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.colCustType', 'Loại khách hàng')}>{finding.customerType || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.colProduct', 'Sản phẩm lỗi')}>{finding.productName || '-'}</Descriptions.Item>
                                  </Descriptions>
                                </Card>
                              </Col>
                              
                              <Col xs={24} md={12}>
                                <Card size="small" title={<span className="text-xs font-bold text-gray-600">{t('auditeePortal.detail.opsRiskTitle', '⚡ CHI TIẾT NGHIỆP VỤ & PHÂN LOẠI RR (A-AA)')}</span>} variant="borderless" className="bg-gray-50/50">
                                  <Descriptions column={1} size="small" layout="horizontal" contentStyle={{ fontSize: 13 }} labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}>
                                    <Descriptions.Item label={t('knowledgeExtraction.saveModal.labelBusiness', 'Mảng nghiệp vụ')}>
                                      <Tag color="cyan">{finding.operationType === 'TD' ? [t('personnel.credit', 'Tín dụng')] : finding.operationType === 'PTD' ? [t('auditeePortal.detail.opNonCredit', 'Phi tín dụng')] : finding.operationType === t('auditFindings.tkbd', 'TKBĐ') ? [t('auditeePortal.detail.opPostal', 'Tiết kiệm Bưu điện')] : finding.operationType || '-'}</Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.colProcess', 'Quy trình')}>{finding.businessProcess || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditFindings.aggregateRiskGroup', 'Nhóm rủi ro tổng hợp')}>{finding.riskGroupGeneral || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditFindings.detailedRiskGroup', 'Nhóm rủi ro chi tiết')}>{finding.riskGroupDetail || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.colRecTarget', 'Đối tượng kiến nghị')}>{finding.recommendationTarget || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditFindings.typeOfRecommendation', 'Loại kiến nghị')}>{finding.recommendationType === 'Publish' ? [t('auditFindings.officialRelease', 'Phát hành chính thức')] : finding.recommendationType || '-'}</Descriptions.Item>
                                  </Descriptions>
                                </Card>
                              </Col>

                              <Col xs={24}>
                                <Card size="small" title={<span className="text-xs font-bold text-gray-600">{t('auditeePortal.detail.responsibleStaffTitle', '👤 NHÂN SỰ CHỊU TRÁCH NHIỆM TRỰC TIẾP (BCKT)')}</span>} variant="borderless" className="bg-gray-50/50">
                                  <Row gutter={16}>
                                    <Col span={8}>
                                      <Text type="secondary" className="text-xs">{t('auditeePortal.detail.labelProposer', 'Cán bộ đề xuất:')}</Text>
                                      <div className="font-semibold text-sm mt-1 text-gray-800">{finding.proposerOfficer || <Text type="secondary" italic className="text-xs">{t('auditeePortal.detail.unidentified', 'Chưa xác định')}</Text>}</div>
                                    </Col>
                                    <Col span={8}>
                                      <Text type="secondary" className="text-xs">{t('auditeePortal.detail.labelAppraiser', 'Cán bộ thẩm định:')}</Text>
                                      <div className="font-semibold text-sm mt-1 text-gray-800">{finding.appraiserOfficer || <Text type="secondary" italic className="text-xs">{t('auditeePortal.detail.unidentified', 'Chưa xác định')}</Text>}</div>
                                    </Col>
                                    <Col span={8}>
                                      <Text type="secondary" className="text-xs">{t('auditeePortal.detail.labelLeader', 'Lãnh đạo phê duyệt lỗi:')}</Text>
                                      <div className="font-semibold text-sm mt-1 text-gray-800">{finding.businessLeader || <Text type="secondary" italic className="text-xs">{t('auditeePortal.detail.unidentified', 'Chưa xác định')}</Text>}</div>
                                    </Col>
                                  </Row>
                                </Card>
                              </Col>

                              <Col xs={24}>
                                <Card size="small" title={<span className="text-xs font-bold text-gray-600">{t('auditeePortal.detail.findingContentTitle', '📝 NỘI DUNG PHÁT HIỆN & PHÁP LÝ (BCKT)')}</span>} variant="borderless" className="bg-gray-50/50">
                                  <Descriptions column={1} size="small" layout="vertical" labelStyle={{ fontWeight: 600, color: '#595959', marginTop: 8 }}>
                                    <Descriptions.Item label={t('auditeePortal.detail.labelCondition', 'Hiện trạng sai phạm (Condition)')}>
                                      <div className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap">{finding.condition || '-'}</div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.labelConsequence', 'Hậu quả rủi ro (Consequence)')}>
                                      <div className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap">{finding.consequence || '-'}</div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.labelCause', 'Nguyên nhân sai phạm (Cause)')}>
                                      <div className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-700 whitespace-pre-wrap">{finding.cause || '-'}</div>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('auditFindings.legalBasisViolationsCriteria', 'Cơ sở pháp lý / Quy định vi phạm (Criteria)')}>
                                      <div className="bg-white p-3 rounded border border-gray-100 text-xs text-gray-500 whitespace-pre-wrap">{finding.criteria || '-'}</div>
                                    </Descriptions.Item>
                                  </Descriptions>
                                </Card>
                              </Col>
                            </Row>
                          </div>
                        )
                      },
                      {
                        key: 'remediation_details',
                        label: (
                          <span className="font-semibold text-gray-700">
                            <SolutionOutlined style={{ marginRight: 4, color: '#ea9105' }} />
                            {t('auditeePortal.tabs.remediationDetails', '2. Kế hoạch & Tiến độ Khắc phục (ĐVKD)')}
                          </span>
                        ),
                        children: (
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={16}>
                                <Descriptions title={<span className="text-sm font-semibold text-gray-800">{t('auditeePortal.detail.actualUpdateTitle', '📋 Nội dung cập nhật thực tế (AB-AJ)')}</span>} column={1} size="small" labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}>
                                  <Descriptions.Item label={t('auditeePortal.detail.lblRec', 'Kiến nghị cần khắc phục')}>
                                    <div className="bg-amber-50/20 p-3 rounded border border-amber-100 text-sm text-gray-800 font-medium">
                                      {record.recommendation}
                                    </div>
                                  </Descriptions.Item>
                                  <Descriptions.Item label={t('auditeePortal.detail.lblPlan', 'Kế hoạch khắc phục')}>
                                    <div className="bg-gray-50 p-3 rounded border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap" style={{ minHeight: 60 }}>
                                      {record.remediationPlan || <Text type="secondary" italic>{t('auditeePortal.detail.fallbackPlan', 'Chưa thiết lập kế hoạch khắc phục')}</Text>}
                                    </div>
                                  </Descriptions.Item>
                                  <Descriptions.Item label={t('auditeePortal.detail.lblActualExplanation', 'Giải trình kết quả thực tế')}>
                                    <div className="bg-gray-50 p-3 rounded border border-gray-100 text-sm text-gray-700 whitespace-pre-wrap" style={{ minHeight: 60 }}>
                                      {record.response || <Text type="secondary" italic>{t('auditeePortal.detail.fallbackExplanation', 'Chưa cập nhật nội dung giải trình kết quả thực tế')}</Text>}
                                    </div>
                                  </Descriptions.Item>
                                  <Descriptions.Item label={t('auditeePortal.detail.lblInternalNotes', 'Ghi chú nội bộ Đơn vị')}>
                                    <div className="bg-gray-50 p-3 rounded border border-gray-100 text-xs text-gray-600">
                                      {record.auditeeNotes || '-'}
                                    </div>
                                  </Descriptions.Item>
                                </Descriptions>
                              </Col>

                              <Col xs={24} md={8}>
                                <Card size="small" title={<span className="text-xs font-bold text-gray-600">{t('auditeePortal.detail.assignmentCommitmentTitle', '⚙️ THÔNG TIN PHÂN CÔNG & CAM KẾT')}</span>} variant="borderless" className="bg-gray-50/50">
                                  <Descriptions column={1} size="small" layout="horizontal" contentStyle={{ fontSize: 13 }} labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblFeasibility', 'Khả năng khắc phục')}>
                                      {getFeasibilityTag(record.remediationFeasibility)}
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblCycle', 'Kỳ theo dõi (Tháng)')}>
                                      <Tag color="purple">{record.monitoringCycle || '-'}</Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblDueDate', 'Hạn cam kết')}>{record.auditeeTargetDate || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblUnitHead', 'Trưởng đơn vị')}>{record.auditeeUnitHead || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblPoc', 'Đầu mối phụ trách')}>{record.auditeePoc || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblReportedTime', 'Báo cáo lúc')}>
                                      {record.completedAt ? dayjs(record.completedAt).format('DD/MM/YYYY HH:mm') : '-'}
                                    </Descriptions.Item>
                                  </Descriptions>
                                </Card>

                                {record.remediationFeasibility === false && (
                                  <div className="mt-4 p-3 bg-red-50/50 rounded-lg border border-red-100">
                                    <div className="text-xs font-bold text-red-600 mb-1">
                                      {t('auditeePortal.detail.unfeasibleReason', 'Lý do không thể khắc phục:')}
                                    </div>
                                    <Paragraph className="text-xs text-gray-700 mb-3">{record.remediationUnfeasibleReason || '-'}</Paragraph>
                                    
                                    <div className="text-xs font-bold text-orange-600 mb-1">
                                      {t('auditeePortal.detail.unitProposal', 'Đề xuất giải pháp của Đơn vị:')}
                                    </div>
                                    <Paragraph className="text-xs text-gray-700">{record.auditeeProposal || '-'}</Paragraph>
                                  </div>
                                )}
                              </Col>
                            </Row>
                          </div>
                        )
                      },
                      {
                        key: 'ktnb_assessment',
                        label: (
                          <span className="font-semibold text-gray-700">
                            <HistoryOutlined style={{ marginRight: 4, color: '#ea9105' }} />
                            {t('auditeePortal.tabs.ktnbVerification', '3. Thẩm định & Đóng hồ sơ (KTNB)')}
                          </span>
                        ),
                        children: (
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <Row gutter={[16, 16]}>
                              <Col xs={24} md={16}>
                                <Descriptions title={<span className="text-sm font-semibold text-gray-800">{t('auditeePortal.detail.independentEvalTitle', '⚖️ Kết quả đánh giá độc lập (AK-AM)')}</span>} column={1} size="small" labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}>
                                  <Descriptions.Item label={t('auditeePortal.detail.lblVerifierOpinion', 'Ý kiến thẩm định KTV')}>
                                    <div className="bg-green-50/20 p-3 rounded border border-green-100 text-sm text-gray-800 whitespace-pre-wrap" style={{ minHeight: 60 }}>
                                      {record.verificationNotes ? (
                                        <span className="text-green-700 font-semibold"><CheckCircleOutlined className="mr-1 text-green-600" />{record.verificationNotes}</span>
                                      ) : (
                                        <Text type="secondary" italic>{t('auditeePortal.detail.fallbackVerifierOpinion', 'Đoàn kiểm toán chưa đưa ra ý kiến thẩm định chốt cuối cùng')}</Text>
                                      )}
                                    </div>
                                  </Descriptions.Item>
                                  <Descriptions.Item label={t('auditeePortal.detail.lblLeadOpinion', 'Ý kiến của Trưởng đoàn')}>
                                    <div className="bg-amber-50/20 p-3 rounded border border-amber-100 text-sm text-gray-800 whitespace-pre-wrap" style={{ minHeight: 60 }}>
                                      {record.teamLeadClosureOpinion ? (
                                        <span className="text-amber-700 font-semibold">{record.teamLeadClosureOpinion}</span>
                                      ) : (
                                        <Text type="secondary" italic>{t('auditeePortal.detail.fallbackLeadOpinion', 'Chưa có ý kiến chỉ đạo đóng hồ sơ từ Trưởng đoàn kiểm toán')}</Text>
                                      )}
                                    </div>
                                  </Descriptions.Item>
                                  {record.closureStatus === 'Closed' && (
                                    <Descriptions.Item label={t('recommendations.ktnbAssessment.closureReason', 'Lý do đóng kiến nghị')}>
                                      <div className="bg-red-50/10 p-3 rounded border border-red-100 text-sm text-gray-700 whitespace-pre-wrap" style={{ minHeight: 40 }}>
                                        {record.closedReason || <Text type="secondary" italic>{t('recommendations.ktnbAssessment.noClosureReason', 'Không có lý do đóng')}</Text>}
                                      </div>
                                    </Descriptions.Item>
                                  )}
                                </Descriptions>
                              </Col>

                              <Col xs={24} md={8}>
                                <Card size="small" title={<span className="text-xs font-bold text-gray-600">{t('auditeePortal.detail.finalDecisionTitle', '🔒 PHÁN QUYẾT CHỐT SỐ LIỆU')}</span>} variant="borderless" className="bg-gray-50/50">
                                  <Descriptions column={1} size="small" layout="horizontal" contentStyle={{ fontSize: 13 }} labelStyle={{ fontWeight: 500, color: '#8c8c8c' }}>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblClosureStatus', 'Trạng thái đóng')}>
                                      <Tag color={record.closureStatus === 'Closed' ? 'green' : record.closureStatus === 'PendingTeamLeadOpinion' ? 'orange' : 'red'}>
                                        {record.closureStatus === 'Closed' ? [t('auditeePortal.detail.statusClosed', 'Đã đóng (Closed)')] : record.closureStatus === 'PendingTeamLeadOpinion' ? [t('auditeePortal.detail.statusPendingLead', 'Chờ duyệt đóng')] : record.closureStatus || t('auditeePortal.detail.statusOpen', 'Mở (Open)')}
                                      </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblVerifier', 'KTV rà soát')}>{record.ktnbReviewerName || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblLead', 'Trưởng đoàn duyệt')}>{record.teamLeadClosureOpinionByName || '-'}</Descriptions.Item>
                                    <Descriptions.Item label={t('auditeePortal.detail.lblClosedTime', 'Thời điểm đóng')}>
                                      {record.closedAt ? dayjs(record.closedAt).format('DD/MM/YYYY HH:mm') : '-'}
                                    </Descriptions.Item>
                                  </Descriptions>
                                </Card>
                              </Col>
                            </Row>
                          </div>
                        )
                      },
                      {
                        key: 'evidence_docs',
                        label: (
                          <span className="font-semibold text-gray-700">
                            <PaperClipOutlined style={{ marginRight: 4, color: '#ea9105' }} />
                            4. Bằng chứng đính kèm ({record.evidenceCount || 0})
                          </span>
                        ),
                        children: (
                          <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <EvidenceManager
                              linkedResource="recommendations"
                              linkedResourceId={record.id}
                              readOnly={record.status === 'Verified' || record.closureStatus === 'Closed'}
                            />
                          </div>
                        )
                      }
                    ]}
                  />
                </div>
              );
            },
          }}
        />
      </Card>

      {/* Create Modal */}
      <RecommendationCreateModal
        open={isCreateVisible}
        onClose={() => setIsCreateVisible(false)}
        onOk={handleCreateOk}
        form={createForm}
        findings={findings}
        departments={departments}
        selectedDept={selectedDept}
        auditeeUsers={auditeeUsers}
        users={users}
      />

      {/* Action Modals: Verify, Close, Self-Monitor, Extension Review, Line 2 Monitoring */}
      <RecommendationActionModals
        selectedRec={selectedRec}
        isVerifyVisible={isVerifyVisible}
        onCloseVerify={() => setIsVerifyVisible(false)}
        handleVerify={handleVerify}
        verifyForm={verifyForm}
        isCloseVisible={isCloseVisible}
        onCloseClose={() => setIsCloseVisible(false)}
        handleCloseConfirm={handleCloseConfirm}
        closeForm={closeForm}
        isSelfMonitorVisible={isSelfMonitorVisible}
        onCloseSelfMonitor={() => setIsSelfMonitorVisible(false)}
        handleSelfMonitorSave={handleSelfMonitorSave}
        selfMonitorForm={selfMonitorForm}
        selfMonitorWatch={selfMonitorWatch}
        setSelfMonitorWatch={setSelfMonitorWatch}
        isExtensionReviewVisible={isExtensionReviewVisible}
        onCloseExtensionReview={() => setIsExtensionReviewVisible(false)}
        handleApproveExtension={handleApproveExtension}
        extensionReviewRec={extensionReviewRec}
        extensionReviewForm={extensionReviewForm}
        isLine2Visible={isLine2Visible}
        onCloseLine2={() => setIsLine2Visible(false)}
        handleSubmitLine2Monitoring={handleSubmitLine2Monitoring}
        line2Rec={line2Rec}
        line2Form={line2Form}
        departments={departments}
      />
    </div>
  );
};

export default Recommendations;
