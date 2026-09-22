import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Table, Button, Space, Typography, Card, Tag, Row, Col, Input, Statistic, message } from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  DownloadOutlined,
  SolutionOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { filterRecursive } from '../utils/excelExport';
import { hasPermission } from '../utils/permission';
import { useCurrentUser } from '../utils/useCurrentUser';
import { AuditFindingDetailDrawer } from './components/AuditFindingDetailDrawer';

const { Title } = Typography;

const getRiskColor = (level: string) => {
  if (level === 'Critical') return '#cf1322'; // Dark Red
  if (level === 'High') return '#f5222d'; // Red
  if (level === 'Medium') return '#faad14'; // Orange
  if (level === 'Low') return '#52c41a'; // Green
  return 'default';
};

const AuditFindings: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();

  const [data, setData] = useState<any[]>([]);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [defectCodes, setDefectCodes] = useState<any[]>([]);
  const [internalDefectCodes, setInternalDefectCodes] = useState<any[]>([]);
  const [nd340DefectCodes, setNd340DefectCodes] = useState<any[]>([]);
  const [nhanSuDefectCodes, setNhanSuDefectCodes] = useState<any[]>([]);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [drawerInitialValues, setDrawerInitialValues] = useState<any>(undefined);
  const [drawerAutoAI, setDrawerAutoAI] = useState(false);

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit-findings');
      setData(response.data || []);
    } catch (error) {
      message.error('Lỗi khi tải phát hiện kiểm toán');
    } finally {
      setLoading(false);
    }
  };

  const fetchEngagements = async () => {
    try {
      const response = await api.get('/audit-engagements');
      if (response.data && response.data.length > 0) {
        setEngagements(response.data);
      }
    } catch (error) {
      console.error('Failed to load engagements', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data || []);
    } catch (e) {
      console.error('Failed to load users', e);
    }
  };

  const fetchUnits = async () => {
    try {
      const res = await api.get('/audit-universe');
      setUnits(res.data || []);
    } catch (e) {
      console.error('Failed to load audit universe', e);
    }
  };

  const fetchDefectCodes = async () => {
    try {
      const res = await api.get('/ai/defect-codes');
      const all = res.data || [];
      setDefectCodes(all);
      setInternalDefectCodes(all.filter((d: any) => !d.dimension || d.dimension === 'INTERNAL'));
      setNd340DefectCodes(all.filter((d: any) => d.dimension === 'ND340'));
      setNhanSuDefectCodes(all.filter((d: any) => d.dimension === 'NHANSU'));
    } catch (e) {
      console.error('Failed to load defect codes', e);
    }
  };

  useEffect(() => {
    fetchFindings();
    fetchEngagements();
    fetchUsers();
    fetchUnits();
    fetchDefectCodes();
  }, []);

  // Check if coming from Working Papers with autoCreate flag
  useEffect(() => {
    if (location.state && location.state.autoCreate) {
      const matchedEng = engagements.find(e => e.id === location.state.engagementId);
      setEditingRecord(null);
      setDrawerInitialValues({
        engagementId: location.state.engagementId,
        workstreamId: location.state.workstreamId,
        title: location.state.title,
        condition: location.state.condition,
        branchCode: matchedEng?.branchCode || 'CN001',
        managingBranchName: matchedEng?.branchName || matchedEng?.legacyAuditedDepartment || 'Hội Sở Chính',
        managingBranchCode: matchedEng?.branchCode || 'HO',
        managingBranchId: matchedEng?.auditedDepartmentId
      });
      setDrawerAutoAI(!!location.state.autoAI);
      setIsDrawerOpen(true);
      navigate('/audit-findings', { replace: true, state: {} });
    }
  }, [location.state, engagements, navigate]);

  const handleAdd = () => {
    setEditingRecord(null);
    setDrawerInitialValues(undefined);
    setDrawerAutoAI(false);
    setIsDrawerOpen(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setDrawerInitialValues(undefined);
    setDrawerAutoAI(false);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/audit-findings/${id}`);
      message.success('Đã xóa phát hiện');
      fetchFindings();
    } catch (error) {
      message.error('Lỗi khi xóa phát hiện');
    }
  };

  const handleCreateRecommendationFromFinding = (record: any) => {
    navigate('/recommendations', {
      state: {
        autoCreate: true,
        findingId: record.id,
        findingTitle: record.findingTitle,
        recommendation: record.recommendation || '',
        department: record.managingBranchName || record.department || record.branchCode || '',
        dueDate: record.dueDate || undefined
      }
    });
  };

  const handleExportExcel = async () => {
    try {
      message.loading({ content: 'Đang tải danh sách Phát hiện từ hệ thống...', key: 'export_findings' });
      const response = await api.get('/audit-findings/export', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Audit_Findings_Export_${new Date().getFullYear()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Xuất danh sách Excel thành công!', key: 'export_findings' });
    } catch (error) {
      message.error({ content: 'Lỗi khi xuất danh sách Excel', key: 'export_findings' });
    }
  };

  const handleImportFindingsExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    message.loading({ content: 'Đang tải file lên để xử lý...', key: 'import_findings' });
    const formData = new FormData();
    formData.append('file', file);

    try {
      const resp = await api.post('/audit-findings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success({ content: `Đã nhập thành công ${resp.data.successCount} phát hiện từ Excel. Vui lòng duyệt lại.`, key: 'import_findings' });
      fetchFindings();
    } catch (err) {
      console.error(err);
      message.error({ content: 'Lỗi khi nhập file Excel', key: 'import_findings' });
    }
    e.target.value = '';
  };

  const filteredData = useMemo(() => {
    return data.filter((item: any) => filterRecursive(item, searchText));
  }, [data, searchText]);

  // Statistics KPI
  const stats = useMemo(() => {
    const total = data.length;
    const highOrCritical = data.filter(d => d.riskLevel === 'Critical' || d.riskLevel === 'High').length;
    const open = data.filter(d => d.status === 'Open').length;
    const resolved = data.filter(d => d.status === 'Resolved').length;
    return { total, highOrCritical, open, resolved };
  }, [data]);

  const columns = [
    {
      title: 'Tóm tắt Phát hiện',
      dataIndex: 'findingTitle',
      key: 'findingTitle',
      width: 340,
      ellipsis: true,
      render: (text: string, record: any) => (
        <div>
          <div className="font-semibold text-slate-800 hover:text-amber-600 cursor-pointer" onClick={() => handleEdit(record)}>
            {text}
          </div>
          {record.internalDefectCode && (
            <span className="text-[11px] text-blue-600 font-mono">[{record.internalDefectCode}] </span>
          )}
          <span className="text-[11px] text-slate-500">
            {record.managingBranchName || record.branchCode || ''}
          </span>
        </div>
      )
    },
    {
      title: 'Thuộc WP / Cuộc kiểm toán',
      dataIndex: 'wpTitle',
      key: 'wpTitle',
      width: 220,
      ellipsis: true,
      render: (text: string, record: any) => (
        <span className="text-xs text-slate-600">
          {text || record.engagement?.name || '-'}
        </span>
      )
    },
    {
      title: 'Mức rủi ro',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 120,
      render: (level: string) => (
        <Tag color={getRiskColor(level)} className="font-semibold">{level || 'Medium'}</Tag>
      ),
    },
    {
      title: 'Chuyên đề & Tái diễn',
      key: 'thematic',
      width: 180,
      render: (_: any, r: any) => (
        <div>
          {r.themeId ? (
            <Tag color="#0f172a" style={{ fontSize: '11px', marginBottom: 2 }}>{r.themeId}</Tag>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          )}
          <div>
            {r.repeatCount && r.repeatCount > 1 ? (
              <Tag color="error" style={{ fontSize: '10px' }}>Tái diễn ({r.repeatCount} lần)</Tag>
            ) : (
              <Tag color="default" style={{ fontSize: '10px' }}>Lần đầu</Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Tuổi nợ & Quá hạn',
      key: 'aging',
      width: 160,
      render: (_: any, r: any) => (
        <div>
          <Tag color={r.agingBucket === '>180 ngày' ? 'red' : r.agingBucket === '91-180 ngày' ? 'orange' : 'blue'}>
            {r.agingBucket || '0-30 ngày'}
          </Tag>
          {r.daysOverdue > 0 && (
            <div className="text-[11px] text-red-600 font-medium">
              Quá hạn {r.daysOverdue} ngày
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => {
        const color = status === 'Open' ? 'blue' : status === 'Resolved' ? 'green' : 'gray';
        return <Tag color={color}>{status || 'Open'}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          {hasPermission(currentUser, 'finding:edit', record.engagement?.ownerTeam || record.engagement?.branchCode, record.workingPaper?.creatorId) && (
            <>
              <Button type="text" icon={<EditOutlined />} className="text-blue-500" onClick={() => handleEdit(record)} title="Chỉnh sửa 5C" />
              <Button type="text" icon={<SolutionOutlined />} className="text-green-600 font-semibold text-xs" onClick={() => handleCreateRecommendationFromFinding(record)} title="Chuyển thành Kiến nghị">
                Kiến nghị
              </Button>
            </>
          )}
          {record.status === 'Open' && hasPermission(currentUser, 'finding:delete') && (
            <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} title="Xóa phát hiện" />
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-4 bg-[#fcfcfc] min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <Title level={3} className="!mb-1 text-slate-800">Phát hiện Kiểm toán (Audit Findings)</Title>
          <p className="text-slate-500 text-xs mb-0">Quản lý các sai phạm, phát hiện kiểm toán chuẩn 5C và phân tích nguyên nhân gốc rễ (RCA)</p>
        </div>
        <Space wrap>
          <Input.Search
            placeholder="Tìm theo phát hiện, mã lỗi, đơn vị..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel} disabled={filteredData.length === 0}>
            Tải Excel
          </Button>
          {hasPermission(currentUser, 'finding:create') && (
            <>
              <input 
                type="file" 
                id="finding-import-excel-input" 
                style={{ display: 'none' }} 
                accept=".xlsx, .xls"
                onChange={handleImportFindingsExcel} 
              />
              <Button 
                onClick={() => document.getElementById('finding-import-excel-input')?.click()}
                style={{ borderColor: '#217346', color: '#217346', fontWeight: 600, borderRadius: 8 }}
              >
                Nhập Excel
              </Button>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={handleAdd} 
                style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', fontWeight: 600, borderRadius: 8 }}
              >
                Ghi nhận Phát hiện mới
              </Button>
            </>
          )}
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="shadow-xs rounded-xl border border-slate-100 bg-white">
            <Statistic 
              title={<span className="text-xs font-semibold text-slate-500">TỔNG PHÁT HIỆN</span>}
              value={stats.total}
              prefix={<FileTextOutlined className="text-amber-500 mr-1" />}
              valueStyle={{ color: '#1e293b', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="shadow-xs rounded-xl border border-slate-100 bg-white">
            <Statistic 
              title={<span className="text-xs font-semibold text-red-500">RỦI RO CAO / NGHIÊM TRỌNG</span>}
              value={stats.highOrCritical}
              prefix={<AlertOutlined className="text-red-500 mr-1" />}
              valueStyle={{ color: '#dc2626', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="shadow-xs rounded-xl border border-slate-100 bg-white">
            <Statistic 
              title={<span className="text-xs font-semibold text-blue-500">ĐANG MỞ (OPEN)</span>}
              value={stats.open}
              prefix={<ExclamationCircleOutlined className="text-blue-500 mr-1" />}
              valueStyle={{ color: '#2563eb', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card variant="borderless" className="shadow-xs rounded-xl border border-slate-100 bg-white">
            <Statistic 
              title={<span className="text-xs font-semibold text-emerald-500">ĐÃ XỬ LÝ (RESOLVED)</span>}
              value={stats.resolved}
              prefix={<CheckCircleOutlined className="text-emerald-500 mr-1" />}
              valueStyle={{ color: '#059669', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Table */}
      <Card variant="borderless" className="shadow-xs rounded-xl overflow-hidden border border-slate-200 bg-white">
        <Table 
          columns={columns as any} 
          dataSource={filteredData} 
          rowKey="id" 
          pagination={{ pageSize: 10, showSizeChanger: true }} 
          loading={loading}
          scroll={{ x: 900 }}
        />
      </Card>

      {/* 5C Detail Drawer Component */}
      <AuditFindingDetailDrawer
        visible={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingRecord(null);
          setDrawerInitialValues(undefined);
          setDrawerAutoAI(false);
        }}
        editingRecord={editingRecord}
        initialValues={drawerInitialValues}
        autoAI={drawerAutoAI}
        engagements={engagements}
        users={users}
        units={units}
        defectCodes={defectCodes}
        internalDefectCodes={internalDefectCodes}
        nd340DefectCodes={nd340DefectCodes}
        nhanSuDefectCodes={nhanSuDefectCodes}
        currentUser={currentUser}
        onSuccess={fetchFindings}
      />
    </div>
  );
};

export default AuditFindings;
