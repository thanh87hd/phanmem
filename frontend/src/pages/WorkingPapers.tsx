import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  Button, 
  Space, 
  Typography, 
  Card, 
  Modal, 
  Tag, 
  Tabs, 
  message, 
  Upload, 
  Row, 
  Col, 
  Radio, 
  Input, 
  Select, 
  Statistic,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  CheckOutlined, 
  SafetyOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  CloudUploadOutlined, 
  FileExcelOutlined, 
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UndoOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { filterRecursive } from '../utils/excelExport';
import { hasPermission } from '../utils/permission';
import { CreditWorkingPaperGrid } from './components/CreditWorkingPaperGrid';
import { PTDRemediationGrid } from './components/PTDRemediationGrid';
import { WorkingPaperDetailDrawer } from './components/WorkingPaperDetailDrawer';
import { WorkingPaperQaReviewModal } from './components/WorkingPaperQaReviewModal';
import { useCurrentUser } from '../utils/useCurrentUser';
import { DataImportModal } from '../components/DataImportModal';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text } = Typography;
const { Option } = Select;

const WorkingPapers: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useCurrentUser();
  const location = useLocation();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [auditPlans, setAuditPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [assignmentScope, setAssignmentScope] = useState<'all' | 'my'>('all');
  const [activeMainTab, setActiveMainTab] = useState<'list' | 'creditMatrix' | 'ptdMatrix'>('list');
  const [matrixWpId, setMatrixWpId] = useState<number | null>(null);

  // Drawer and Modal states
  const [selectedWp, setSelectedWp] = useState<any>(null);
  const [isDetailDrawerVisible, setIsDetailDrawerVisible] = useState(false);
  const [isQaModalVisible, setIsQaModalVisible] = useState(false);
  const [isImportModalVisible, setIsImportModalVisible] = useState(false);

  // Offline Sync State
  const [isSyncModalVisible, setIsSyncModalVisible] = useState(false);
  const [syncWp, setSyncWp] = useState<any>(null);

  const getStatusColor = (status: string) => {
    if (status === 'Approved') return 'green';
    if (status === 'Submitted' || status === 'PendingReview') return 'orange';
    if (status === 'Rework' || status === 'Rejected') return 'red';
    return 'default';
  };

  const getStatusText = (status: string) => {
    if (status === 'Approved') return t('workingPapers.status.Approved', 'Đã phê duyệt');
    if (status === 'Submitted' || status === 'PendingReview') return t('auditEngagements.statusLabels.Review', 'Chờ duyệt');
    if (status === 'Rework' || status === 'Rejected') return t('workingPapers.status.Rejected', 'Yêu cầu sửa');
    return t('auditTemplates.draft', 'Bản nháp');
  };

  const fetchWorkingPapers = async () => {
    setLoading(true);
    try {
      const response = await api.get('/working-papers?type=WP');
      setData(response.data || []);
    } catch (error) {
      message.error(t('workingPapers.errorWhenDownloadingWorkDocuments', 'Lỗi khi tải giấy tờ làm việc'));
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditPlans = async () => {
    try {
      const response = await api.get('/audit-engagements');
      const activeEngagements = (response.data || []).filter((e: any) => e.status !== 'Draft' && e.status !== 'Rejected');
      setAuditPlans(activeEngagements);
    } catch (error) {
      console.error('Error fetching audit plans', error);
    }
  };

  useEffect(() => {
    fetchWorkingPapers();
    fetchAuditPlans();
  }, []);

  // Handle template apply or auto-open WP from navigation state if present
  useEffect(() => {
    if (location.state && location.state.applyTemplate) {
      const tpl = location.state.applyTemplate;
      const newWpDraft = {
        title: `Nghiệp vụ: ${tpl.title}`,
        referenceCode: `WP-${tpl.domain ? tpl.domain.toUpperCase() : 'GEN'}-${Date.now().toString().slice(-6)}`,
        objectives: `Mục tiêu kiểm toán nghiệp vụ: ${tpl.title}\n\n${tpl.description || ''}`,
        domain: tpl.domain || 'credit',
        status: 'Draft',
      };
      setSelectedWp(newWpDraft);
      setIsDetailDrawerVisible(true);
      navigate(location.pathname, { replace: true, state: {} });
    } else if (location.state && location.state.wpId) {
      const targetId = Number(location.state.wpId);
      const existing = data.find((item) => item.id === targetId);
      if (existing) {
        setSelectedWp(existing);
        setIsDetailDrawerVisible(true);
        navigate(location.pathname, { replace: true, state: {} });
      } else if (!loading && data.length > 0) {
        api.get(`/working-papers/${targetId}`).then((res) => {
          if (res.data) {
            setSelectedWp(res.data);
            setIsDetailDrawerVisible(true);
            navigate(location.pathname, { replace: true, state: {} });
          }
        }).catch(() => {});
      }
    }
  }, [location, data, loading, navigate]);

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/working-papers/${id}`);
      message.success(t('workingPapers.deletedWpSuccessfully', 'Đã xóa WP thành công'));
      fetchWorkingPapers();
    } catch (error) {
      message.error(t('workingPapers.errorDeletingWp', 'Lỗi khi xóa WP'));
    }
  };

  const handleExportExcel = async (record: any) => {
    try {
      message.loading({ content: t('workingPapers.initializingAnOfflineExcelFile', 'Đang khởi tạo tệp Excel ngoại tuyến...'), key: 'exporting' });
      const response = await api.get(`/working-papers/${record.id}/export-excel`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `WP_${record.referenceCode || record.id}_Offline.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: t('workingPapers.downloadOfflineExcelFileSuccessfully', 'Tải file Excel ngoại tuyến thành công!'), key: 'exporting' });
    } catch (error) {
      message.error({ content: t('workingPapers.errorWhenDownloadingExcelFile', 'Lỗi khi tải file Excel'), key: 'exporting' });
    }
  };

  const handleOpenSync = (record: any) => {
    setSyncWp(record);
    setIsSyncModalVisible(true);
  };

  const handleImportExcel = async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      message.loading({ content: t('workingPapers.syncingOfflineDataToTheServer', 'Đang đồng bộ dữ liệu ngoại tuyến lên máy chủ...'), key: 'syncing' });
      const res = await api.post(`/working-papers/${id}/import-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success({ content: res.data.message || t('workingPapers.successfulOfflineExcelSync', 'Đồng bộ Excel ngoại tuyến thành công!'), key: 'syncing' });
      setIsSyncModalVisible(false);
      fetchWorkingPapers();
    } catch (error: any) {
      message.error({ content: error.response?.data?.message || t('workingPapers.excelDataSyncError', 'Lỗi đồng bộ dữ liệu Excel'), key: 'syncing' });
    }
  };

  const handleDownloadCreditTemplate = async () => {
    message.loading({ content: 'Đang tải file template mẫu 40 cột thực tế...', key: 'tpl' });
    try {
      const res = await api.get('/working-papers/template/credit-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_WP_TinDung_40Cot_ThucTe.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Tải template mẫu 40 cột thành công!', key: 'tpl' });
    } catch (err: any) {
      message.error({ content: 'Lỗi tải template mẫu', key: 'tpl' });
    }
  };

  const handleDownloadPtdTemplate = async () => {
    message.loading({ content: 'Đang tải file template mẫu PTD 20 cột...', key: 'tpl' });
    try {
      const res = await api.get('/working-papers/template/ptd-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_WP_PhiTinDung_20Cot_ThucTe.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Tải template mẫu PTD thành công!', key: 'tpl' });
    } catch (err: any) {
      message.error({ content: 'Lỗi tải template mẫu PTD', key: 'tpl' });
    }
  };

  const handleCreateQuickCreditWp = async () => {
    try {
      message.loading({ content: 'Đang khởi tạo Giấy tờ làm việc Tín dụng chuẩn...', key: 'quick-wp' });
      const firstPlan = auditPlans && auditPlans.length > 0 ? auditPlans[0] : null;
      const res = await api.post('/working-papers', {
        title: 'Giấy tờ làm việc Kiểm toán Quy trình Cấp tín dụng & TSBĐ (40 Cột Thực tế)',
        referenceCode: `WP-CREDIT-${Date.now().toString().slice(-4)}`,
        domain: 'credit',
        planName: firstPlan?.name || firstPlan?.title || 'Kế hoạch kiểm toán tín dụng',
        engagementId: firstPlan?.id || undefined,
        creator: currentUser?.fullName || currentUser?.username || 'KTV Kiểm toán',
        objectives: 'Kiểm toán toàn diện hoạt động cấp tín dụng và định giá TSBĐ theo chuẩn mực VSA 230.',
        procedures: 'Kiểm tra hồ sơ thẩm định, phê duyệt và giám sát sau vay.',
        methodology: 'Kiểm tra chứng từ (Vouching) và phỏng vấn cán bộ.',
        sampleSelection: 'Chọn mẫu phán đoán theo dư nợ lớn và rủi ro cao.',
        riskDescription: 'Rủi ro thẩm định sai lệch, định giá quá cao hoặc thiếu hồ sơ TSBĐ.',
        conclusion: 'Đã kiểm tra chi tiết theo bảng mẫu 40 cột tín dụng.',
        status: 'Draft',
        type: 'WP'
      });
      message.success({ content: 'Khởi tạo Working Paper Tín dụng thành công!', key: 'quick-wp' });
      await fetchWorkingPapers();
      if (res.data?.id) {
        setMatrixWpId(res.data.id);
      }
    } catch (err: any) {
      message.error({ content: err?.response?.data?.message || 'Lỗi khởi tạo Working Paper Tín dụng', key: 'quick-wp' });
    }
  };

  const handleCreateQuickPtdWp = async () => {
    try {
      message.loading({ content: 'Đang khởi tạo Giấy tờ làm việc Phi tín dụng & Khắc phục...', key: 'quick-wp' });
      const firstPlan = auditPlans && auditPlans.length > 0 ? auditPlans[0] : null;
      const res = await api.post('/working-papers', {
        title: 'Giấy tờ làm việc Kiểm toán Hoạt động Phi Tín Dụng & Quỹ (20 Cột Thực tế)',
        referenceCode: `WP-PTD-${Date.now().toString().slice(-4)}`,
        domain: 'ptd',
        planName: firstPlan?.name || firstPlan?.title || 'Kế hoạch kiểm toán chung',
        engagementId: firstPlan?.id || undefined,
        creator: currentUser?.fullName || currentUser?.username || 'KTV Kiểm toán',
        objectives: 'Kiểm toán tính tuân thủ giao dịch phi tín dụng, thanh toán và quản trị quỹ.',
        procedures: 'Kiểm kê thực tế và rà soát hồ sơ thanh toán.',
        methodology: 'Đối chiếu chứng từ và quan sát thực tế.',
        sampleSelection: 'Chọn mẫu ngẫu nhiên và mẫu giao dịch lớn.',
        riskDescription: 'Rủi ro thất thoát tài sản quỹ hoặc vi phạm quy chế thanh toán.',
        conclusion: 'Đã kiểm tra chi tiết theo bảng mẫu 20 cột phi tín dụng.',
        status: 'Draft',
        type: 'WP'
      });
      message.success({ content: 'Khởi tạo Working Paper Phi tín dụng thành công!', key: 'quick-wp' });
      await fetchWorkingPapers();
      if (res.data?.id) {
        setMatrixWpId(res.data.id);
      }
    } catch (err: any) {
      message.error({ content: err?.response?.data?.message || 'Lỗi khởi tạo Working Paper Phi tín dụng', key: 'quick-wp' });
    }
  };

  const handleCreateFindingFromWp = (record: any) => {
    navigate('/audit-findings', {
      state: {
        autoCreate: true,
        autoAI: true,
        engagementId: record.engagementId,
        workstreamId: record.workstreamId,
        condition: record.conclusion || record.riskDescription || '',
        title: `Phát hiện từ: ${record.title}`
      }
    });
  };

  const handleAdd = () => {
    setSelectedWp(null);
    setIsDetailDrawerVisible(true);
  };

  const handleEdit = (record: any) => {
    setSelectedWp(record);
    setIsDetailDrawerVisible(true);
  };

  const openQaModal = (record: any) => {
    setSelectedWp(record);
    setIsQaModalVisible(true);
  };

  // Filtered data calculation
  const filteredData = data
    .filter((item: any) => {
      if (assignmentScope === 'my') {
        const myName = currentUser?.fullName?.toLowerCase();
        const myUsername = currentUser?.username?.toLowerCase();
        const creator = item.creator?.toLowerCase();
        const creatorId = item.creatorUserId || item.creatorId;
        return (
          creatorId === currentUser?.id ||
          (myName && creator && creator.includes(myName)) ||
          (myUsername && creator && creator.includes(myUsername))
        );
      }
      return true;
    })
    .filter((item: any) => filterRecursive(item, searchText));

  // Statistics KPI computation
  const statsSummary = {
    total: data.length,
    approved: data.filter(w => w.status === 'Approved').length,
    submitted: data.filter(w => w.status === 'Submitted' || w.status === 'PendingReview').length,
    rework: data.filter(w => w.status === 'Rework' || w.status === 'Rejected').length,
    draft: data.filter(w => w.status === 'Draft' || !w.status).length,
  };

  const columns = [
    { 
      title: t('workingPapers.cols.code', 'Mã WP'), 
      dataIndex: 'referenceCode', 
      key: 'referenceCode',
      width: 140,
      ...getColumnSearchProps<any>('referenceCode', 'Mã WP'),
      sorter: getColumnSorter<any>('referenceCode', 'string'),
      render: (code: string) => <Tag color="geekblue" className="font-mono font-semibold">{code || 'WP-GEN-101'}</Tag>
    },
    { 
      title: t('workingPapers.cols.planName', 'Cuộc kiểm toán'), 
      dataIndex: 'planName', 
      key: 'planName', 
      width: 230,
      ellipsis: true,
      ...getColumnSearchProps<any>('planName', 'Cuộc kiểm toán'),
      sorter: getColumnSorter<any>('planName', 'string'),
    },
    { 
      title: t('workingPapers.cols.title', 'Tên / Chủ đề WP'), 
      dataIndex: 'title', 
      key: 'title', 
      width: 260,
      ellipsis: true,
      ...getColumnSearchProps<any>('title', 'Tên / Chủ đề WP'),
      sorter: getColumnSorter<any>('title', 'string'),
      render: (val: string, r: any) => (
        <a onClick={() => handleEdit(r)} className="font-medium text-slate-800 hover:text-blue-600 block truncate">
          {val}
        </a>
      )
    },
    { 
      title: t('workingPapers.cols.creator', 'Người lập'), 
      dataIndex: 'creator', 
      key: 'creator', 
      width: 150,
      ellipsis: true,
      ...getColumnSearchProps<any>('creator', 'Người lập'),
      sorter: getColumnSorter<any>('creator', 'string'),
    },
    { 
      title: t('auditTemplates.cols.status', 'Trạng thái'), 
      dataIndex: 'status', 
      key: 'status', 
      width: 130,
      ...getColumnSelectFilterProps<any>('status', [
        { text: 'Đã phê duyệt', value: 'Approved' },
        { text: 'Chờ duyệt', value: 'Submitted' },
        { text: 'Yêu cầu sửa', value: 'Rework' },
        { text: 'Bản nháp', value: 'Draft' },
      ], data),
      sorter: getColumnSorter<any>('status', 'string'),
      render: (status: string) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: 270,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => handleEdit(record)} 
            title="Xem / Chỉnh sửa hồ sơ"
            className="text-blue-600 hover:bg-blue-50"
          >
            Chi tiết
          </Button>

          <Button 
            type="text" 
            icon={<BulbOutlined />} 
            className="text-purple-600 font-semibold hover:bg-purple-50" 
            onClick={() => handleCreateFindingFromWp(record)} 
            title="Tạo Phát hiện 5C"
          >
            Phát hiện
          </Button>

          <Button 
            type="link" 
            size="small" 
            icon={<DownloadOutlined />} 
            onClick={() => handleExportExcel(record)} 
            title="Tải ngoại tuyến"
          />

          <Button 
            type="link" 
            size="small" 
            icon={<CloudUploadOutlined />} 
            onClick={() => handleOpenSync(record)} 
            className="!text-amber-600" 
            title="Đồng bộ Excel"
          />

          <Button 
            type="text" 
            size="small" 
            icon={<SafetyOutlined />} 
            onClick={() => openQaModal(record)}
            className="text-emerald-600 hover:bg-emerald-50 font-medium"
            title="QA Review IIA"
          >
            QA
          </Button>

          {record.status === 'Draft' && hasPermission(currentUser, 'wp:delete') && (
            <Button 
              type="text" 
              icon={<DeleteOutlined />} 
              danger 
              onClick={() => handleDelete(record.id)} 
              title="Xóa"
            />
          )}
        </Space>
      ),
    },
  ];

  const creditWpList = data.filter(
    (wp) =>
      wp.domain === 'credit' ||
      wp.title?.toLowerCase().includes('tín dụng') ||
      wp.referenceCode?.includes('CREDIT') ||
      wp.referenceCode?.includes('TD')
  );
  const ptdWpList = data.filter(
    (wp) =>
      wp.domain !== 'credit' &&
      !wp.title?.toLowerCase().includes('tín dụng')
  );

  const currentCreditWpId =
    matrixWpId || (creditWpList.length > 0 ? creditWpList[0].id : (data.length > 0 ? data[0].id : null));

  const currentPtdWpId =
    matrixWpId || (ptdWpList.length > 0 ? ptdWpList[0].id : (data.length > 0 ? data[0].id : null));

  return (
    <div className="space-y-4">
      {/* Top Header & Workload Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <Title level={3} className="!mb-0 text-slate-800">
            Giấy tờ làm việc & Kiểm soát Chất lượng (Working Papers)
          </Title>
          <Text type="secondary" className="text-xs sm:text-sm">
            Chuẩn mực VSA 230 / IIA GIAS 2024 - Tích hợp Ma trận 40 Cột Tín dụng & 20 Cột Phi tín dụng/Khắc phục
          </Text>
        </div>
        <Space wrap align="center">
          <Radio.Group
            value={assignmentScope}
            onChange={(e) => setAssignmentScope(e.target.value)}
            buttonStyle="solid"
            size="middle"
          >
            <Radio.Button value="all">Tất cả ({data.length})</Radio.Button>
            <Radio.Button value="my">Việc của tôi</Radio.Button>
          </Radio.Group>
          <Input.Search
            placeholder={t('workingPapers.searchWp', 'Tìm kiếm WP...')}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
            className="rounded-lg shadow-sm"
          />
          {hasPermission(currentUser, 'wp:create') && (
            <>
              <Button 
                type="default" 
                icon={<FileExcelOutlined />} 
                onClick={() => setIsImportModalVisible(true)}
                className="shadow-sm rounded-xl border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-semibold h-10 flex items-center gap-1.5"
              >
                Nhập Excel
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAdd}
                className="shadow-md rounded-xl bg-blue-600 hover:bg-blue-700 text-white border-none font-semibold h-10 flex items-center gap-1.5"
              >
                Tạo WP Mới
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* KPI Overview Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6} md={4}>
          <Card variant="borderless" className="shadow-sm rounded-2xl bg-white border border-slate-200 p-2">
            <Statistic 
              title={<span className="text-xs uppercase font-medium text-slate-500">Tổng số WP</span>} 
              value={statsSummary.total} 
              prefix={<FileTextOutlined className="text-blue-500 mr-1" />}
              valueStyle={{ fontSize: 22, fontWeight: 700, color: '#1e293b' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Card variant="borderless" className="shadow-sm rounded-2xl bg-white border border-emerald-200 p-2">
            <Statistic 
              title={<span className="text-xs uppercase font-medium text-emerald-700">Đã phê duyệt (MB04)</span>} 
              value={statsSummary.approved} 
              prefix={<CheckCircleOutlined className="text-emerald-500 mr-1" />}
              valueStyle={{ fontSize: 22, fontWeight: 700, color: '#059669' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Card variant="borderless" className="shadow-sm rounded-2xl bg-white border border-amber-200 p-2">
            <Statistic 
              title={<span className="text-xs uppercase font-medium text-amber-700">Chờ duyệt (4 Mắt)</span>} 
              value={statsSummary.submitted} 
              prefix={<ClockCircleOutlined className="text-amber-500 mr-1" />}
              valueStyle={{ fontSize: 22, fontWeight: 700, color: '#d97706' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Card variant="borderless" className="shadow-sm rounded-2xl bg-white border border-rose-200 p-2">
            <Statistic 
              title={<span className="text-xs uppercase font-medium text-rose-700">Yêu cầu chỉnh sửa</span>} 
              value={statsSummary.rework} 
              prefix={<UndoOutlined className="text-rose-500 mr-1" />}
              valueStyle={{ fontSize: 22, fontWeight: 700, color: '#e11d48' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={5}>
          <Card variant="borderless" className="shadow-sm rounded-2xl bg-white border border-slate-200 p-2">
            <Statistic 
              title={<span className="text-xs uppercase font-medium text-slate-500">Bản nháp KTV</span>} 
              value={statsSummary.draft} 
              prefix={<EditOutlined className="text-slate-400 mr-1" />}
              valueStyle={{ fontSize: 22, fontWeight: 700, color: '#64748b' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Workspace Tabs */}
      <Tabs
        activeKey={activeMainTab}
        onChange={(key) => setActiveMainTab(key as any)}
        type="card"
        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200"
        items={[
          {
            key: 'list',
            label: <span className="font-semibold">📋 Danh sách Giấy tờ làm việc</span>,
            children: (
              <Table 
                columns={columns as any} 
                dataSource={filteredData} 
                rowKey="id" 
                loading={loading} 
                scroll={{ x: 1250 }}
                pagination={{ pageSize: 12, showSizeChanger: true }}
              />
            ),
          },
          {
            key: 'creditMatrix',
            label: <span className="font-semibold">💳 Ma trận Tín dụng Thực tế (40 Cột)</span>,
            children: (
              <div className="space-y-4">
                <Card className="shadow-sm rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <Space wrap>
                      <Text strong>Chọn Giấy tờ làm việc Tín dụng:</Text>
                      <Select
                        style={{ width: 380 }}
                        value={currentCreditWpId || undefined}
                        onChange={(id) => setMatrixWpId(id)}
                        placeholder="Chọn WP Tín dụng..."
                      >
                        {data.map((wp) => (
                          <Option key={wp.id} value={wp.id}>
                            {wp.referenceCode ? `[${wp.referenceCode}] ` : ''}{wp.title}
                          </Option>
                        ))}
                      </Select>
                    </Space>
                    <Space wrap>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadCreditTemplate}
                        className="text-blue-600 border-blue-500"
                      >
                        Tải Template Excel (40 Cột)
                      </Button>
                      <Button
                        icon={<PlusOutlined />}
                        type="primary"
                        onClick={handleCreateQuickCreditWp}
                        className="bg-emerald-600 hover:bg-emerald-700 border-none"
                      >
                        Khởi tạo WP Tín Dụng Mẫu
                      </Button>
                    </Space>
                  </div>
                </Card>
                {currentCreditWpId ? (
                  <CreditWorkingPaperGrid workingPaperId={currentCreditWpId} />
                ) : (
                  <Card className="text-center py-8 rounded-xl shadow-sm border border-dashed border-slate-300">
                    <Title level={4} className="text-slate-700">Chưa có Giấy tờ làm việc nào được chọn</Title>
                    <Text className="text-slate-500 block mb-4">
                      Bạn có thể chọn một Giấy tờ làm việc ở trên hoặc bấm nút bên dưới để hệ thống tự động khởi tạo Working Paper Tín dụng 40 cột chuẩn thực tế.
                    </Text>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleCreateQuickCreditWp}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Khởi tạo ngay WP Tín Dụng 40 Cột
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        size="large"
                        onClick={handleDownloadCreditTemplate}
                      >
                        Tải File Excel Template 40 Cột
                      </Button>
                    </Space>
                  </Card>
                )}
              </div>
            ),
          },
          {
            key: 'ptdMatrix',
            label: <span className="font-semibold">📑 Phi Tín dụng & Theo dõi Khắc phục (20 Cột)</span>,
            children: (
              <div className="space-y-4">
                <Card className="shadow-sm rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex flex-wrap justify-between items-center gap-3">
                    <Space wrap>
                      <Text strong>Chọn Giấy tờ làm việc Phi Tín dụng:</Text>
                      <Select
                        style={{ width: 380 }}
                        value={currentPtdWpId || undefined}
                        onChange={(id) => setMatrixWpId(id)}
                        placeholder="Chọn WP Phi Tín dụng..."
                      >
                        {data.map((wp) => (
                          <Option key={wp.id} value={wp.id}>
                            {wp.referenceCode ? `[${wp.referenceCode}] ` : ''}{wp.title}
                          </Option>
                        ))}
                      </Select>
                    </Space>
                    <Space wrap>
                      <Button
                        icon={<DownloadOutlined />}
                        onClick={handleDownloadPtdTemplate}
                        className="text-blue-600 border-blue-500"
                      >
                        Tải Template Excel (20 Cột)
                      </Button>
                      <Button
                        icon={<PlusOutlined />}
                        type="primary"
                        onClick={handleCreateQuickPtdWp}
                        className="bg-indigo-600 hover:bg-indigo-700 border-none"
                      >
                        Khởi tạo WP Phi Tín Dụng Mẫu
                      </Button>
                    </Space>
                  </div>
                </Card>
                {currentPtdWpId ? (
                  <PTDRemediationGrid workingPaperId={currentPtdWpId} />
                ) : (
                  <Card className="text-center py-8 rounded-xl shadow-sm border border-dashed border-slate-300">
                    <Title level={4} className="text-slate-700">Chưa có Giấy tờ làm việc nào được chọn</Title>
                    <Text className="text-slate-500 block mb-4">
                      Bạn có thể chọn một Giấy tờ làm việc ở trên hoặc bấm nút bên dưới để hệ thống tự động khởi tạo Working Paper Phi Tín dụng 20 cột chuẩn thực tế.
                    </Text>
                    <Space>
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        size="large"
                        onClick={handleCreateQuickPtdWp}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        Khởi tạo ngay WP Phi Tín Dụng 20 Cột
                      </Button>
                      <Button
                        icon={<DownloadOutlined />}
                        size="large"
                        onClick={handleDownloadPtdTemplate}
                      >
                        Tải File Excel Template 20 Cột
                      </Button>
                    </Space>
                  </Card>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Unified Working Paper Detail & 5-Tab Editing Drawer */}
      {isDetailDrawerVisible && (
        <WorkingPaperDetailDrawer
          visible={isDetailDrawerVisible}
          onClose={() => {
            setIsDetailDrawerVisible(false);
            setSelectedWp(null);
          }}
          workingPaper={selectedWp}
          currentUser={currentUser}
          onSaved={() => {
            setIsDetailDrawerVisible(false);
            setSelectedWp(null);
            fetchWorkingPapers();
          }}
          auditPlans={auditPlans}
        />
      )}

      {/* QA Review Modal (IIA QAIP 3-Tier Quality Review) */}
      {isQaModalVisible && (
        <WorkingPaperQaReviewModal
          visible={isQaModalVisible}
          onClose={() => {
            setIsQaModalVisible(false);
            setSelectedWp(null);
          }}
          workingPaper={selectedWp}
          currentUser={currentUser}
          onSuccess={() => {
            setIsQaModalVisible(false);
            setSelectedWp(null);
            fetchWorkingPapers();
          }}
        />
      )}

      {/* Excel Offline Sync Modal */}
      <Modal
        title={<><CloudUploadOutlined className="text-amber-500 mr-2"/> {t('workingPapers.syncWorkPapersOffline', 'Đồng bộ Giấy tờ làm việc Ngoại tuyến')}</>}
        open={isSyncModalVisible}
        onCancel={() => setIsSyncModalVisible(false)}
        footer={null}
        width={500}
      >
        <div className="py-4 text-center">
          <FileExcelOutlined className="text-5xl text-green-600 mb-4" />
          <Title level={4}>{t('workingPapers.syncExcelV30', 'Đồng bộ Excel v3.0')}</Title>
          <Text className="block mb-4 text-gray-500 text-sm">
            {t('workingPapers.selectYourEditedOfflineWorkingPapers', 'Chọn tệp Excel giấy tờ làm việc ngoại tuyến đã chỉnh sửa của')} <strong>{syncWp?.title}</strong> {t('workingPapers.toSyncDirectlyToTheServer', 'để đồng bộ trực tiếp lên máy chủ.')}
          </Text>

          <Upload
            beforeUpload={(file) => {
              handleImportExcel(syncWp?.id, file);
              return false;
            }}
            showUploadList={false}
            accept=".xlsx"
          >
            <Button type="primary" size="large" icon={<CloudUploadOutlined />}>
              {t('workingPapers.selectAndSyncNow', 'Chọn và Đồng bộ Ngay')}
            </Button>
          </Upload>

          <Text className="block mt-4 text-xs text-red-500 font-semibold">
            {t('workingPapers.noteKeepTheTitleLineAnd', '⚠️ Lưu ý: Giữ nguyên dòng tiêu đề và mã ID của tệp Excel để tránh sai lệch dữ liệu.')}
          </Text>
        </div>
      </Modal>

      {/* Data Import Modal */}
      <DataImportModal
        visible={isImportModalVisible}
        onCancel={() => setIsImportModalVisible(false)}
        moduleName="working-papers"
        onSuccess={() => fetchWorkingPapers()}
      />
    </div>
  );
};

export default WorkingPapers;
