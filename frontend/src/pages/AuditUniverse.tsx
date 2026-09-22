import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, Tag, message, Select, Row, Col, InputNumber, DatePicker, Divider, Tooltip, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, GlobalOutlined, SearchOutlined, SafetyCertificateOutlined, AlertOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../services/api';
import BulkImport from '../components/BulkImport';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import DynamicFormRenderer, { extractCustomFields } from '../components/DynamicFormRenderer';
import UnifiedRiskScoringModal from '../components/UnifiedRiskScoringModal';
import type { AuditUniverse as AuditUniverseType, AuditPlan, Department } from '../types';

const { Title, Text } = Typography;
const { Option } = Select;

const AuditUniverse: React.FC = () => {
  const { t } = useTranslation();

  const AUDIT_CATEGORY_MAP: Record<string, string> = {
    HoiSo:     t('auditPlan.tabs2.filter.hoiso', 'Hội sở'),
    ChiNhanh:  t('auditPlan.tabs2.filter.chinhanh', 'Chi nhánh'),
    PGD:       t('auditPlan.tabs2.filter.pgd', 'Phòng giao dịch lớn'),
    PGDBD:     'Phòng GD Bưu điện (PGDBD)',
    CongTyCon: 'Công ty trực thuộc',
    HeThong:   t('dashboard.tabs.it', 'Hệ thống CNTT & Mô hình'),
    ChuyenDe:  t('auditPlan.tabs2.filter.chuyende', 'Nghiệp vụ'),
  };

  const AUDIT_CATEGORIES: Record<string, { label: string; color: string }> = {
    HoiSo:     { label: t('auditPlan.tabs2.filter.hoiso', 'Hội sở'),        color: '#3f51b5' },
    ChiNhanh:  { label: t('auditPlan.tabs2.filter.chinhanh', 'Chi nhánh'),     color: '#ff9800' },
    PGD:       { label: t('auditPlan.tabs2.filter.pgd', 'Phòng giao dịch lớn'),color: '#10b981' },
    PGDBD:     { label: 'PGD Bưu điện (PGDBD)',                              color: '#d46b08' },
    CongTyCon: { label: 'Công ty trực thuộc',                               color: '#08979c' },
    HeThong:   { label: t('dashboard.tabs.it', 'Hệ thống CNTT & Mô hình'), color: '#ec4899' },
    ChuyenDe:  { label: t('auditPlan.tabs2.filter.chuyende', 'Nghiệp vụ'), color: '#8b5cf6' },
  };

  const OWNER_TEAM_MAP: Record<string, string> = {
    PKT_HoiSo:  t('auditUniverse.modal.teamHq', 'Phòng KT Hội sở & Hệ thống'),
    PKT_DVKD:   t('auditUniverse.modal.teamBranch', 'Phòng KT Đơn vị Kinh doanh'),
    TongHop:    t('auditEngagements.generalDepartment', 'Bộ phận Tổng hợp'),
  };

  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [customFieldsDef, setCustomFieldsDef] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [form] = Form.useForm();

  // State cho Unified Risk Modal
  const [isRiskModalVisible, setIsRiskModalVisible] = useState(false);
  const [selectedUniverseForRisk, setSelectedUniverseForRisk] = useState<any>(null);

  const getColumnSearchProps = (dataIndex: string, placeholderName: string) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={`Tìm ${placeholderName}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90, backgroundColor: '#ea9105', borderColor: '#ea9105' }}
          >
            Tìm
          </Button>
          <Button
            onClick={() => {
              clearFilters();
              confirm();
            }}
            size="small"
            style={{ width: 90 }}
          >
            Xóa
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered: boolean) => (
      <SearchOutlined style={{ color: filtered ? '#ea9105' : undefined }} />
    ),
    onFilter: (value: any, record: any) => {
      if (dataIndex === 'department') {
        const dept = record.department || '';
        const code = record.departmentCode || '';
        return (
          dept.toLowerCase().includes(value.toString().toLowerCase()) ||
          code.toLowerCase().includes(value.toString().toLowerCase())
        );
      }
      const val = record[dataIndex];
      if (!val) return false;
      return val.toString().toLowerCase().includes(value.toString().toLowerCase());
    }
  });

  const columns = [
    {
      title: 'Tên Quy trình / Hoạt động',
      dataIndex: 'name',
      key: 'name',
      width: '22%',
      sorter: (a: any, b: any) => (a.name || '').localeCompare(b.name || ''),
      ...getColumnSearchProps('name', 'tên quy trình'),
    },
    {
      title: 'Đơn vị phụ trách',
      key: 'department',
      width: 180,
      sorter: (a: any, b: any) => (a.department || '').localeCompare(b.department || ''),
      ...getColumnSearchProps('department', 'đơn vị'),
      render: (_: any, r: any) => (
        <Space orientation="vertical" size={0}>
          <Text style={{ fontSize: 13 }}>{r.department}</Text>
          {r.departmentCode && <Text code style={{ fontSize: 10 }}>{r.departmentCode}</Text>}
        </Space>
      ),
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
      title: 'Điểm rủi ro',
      dataIndex: 'riskScore',
      key: 'riskScore',
      width: 110,
      sorter: (a: any, b: any) => (a.riskScore || 0) - (b.riskScore || 0),
      filters: [
        { text: 'Rủi ro Cao (≥ 7.0)', value: 'high' },
        { text: 'Rủi ro T.Bình (4.0 - 6.9)', value: 'medium' },
        { text: 'Rủi ro Thấp (< 4.0)', value: 'low' },
      ],
      onFilter: (value: any, record: any) => {
        const score = record.riskScore || 5.0;
        if (value === 'high') return score >= 7.0;
        if (value === 'medium') return score >= 4.0 && score < 7.0;
        if (value === 'low') return score < 4.0;
        return true;
      },
      render: (score: number) => <b style={{ color: '#ea9105' }}>{score || '5.0'}</b>
    },
    {
      title: 'Xếp hạng rủi ro',
      dataIndex: 'dynamicRiskRating',
      key: 'dynamicRiskRating',
      width: 160,
      filters: [
        { text: 'Cao (Hàng năm)', value: 'High' },
        { text: 'Trung bình (2 năm)', value: 'Medium' },
        { text: 'Thấp (3 năm)', value: 'Low' },
      ],
      onFilter: (value: any, record: any) => record.dynamicRiskRating === value,
      sorter: (a: any, b: any) => {
        const map: any = { High: 3, Medium: 2, Low: 1 };
        return (map[a.dynamicRiskRating] || 0) - (map[b.dynamicRiskRating] || 0);
      },
      render: (rating: string) => {
        const color = rating === 'High' ? 'red' : rating === 'Medium' ? 'orange' : 'green';
        const label = rating === 'High' ? 'Cao (Hàng năm)' : rating === 'Medium' ? 'Trung bình (2 năm)' : 'Thấp (3 năm)';
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'Năm KT',
      dataIndex: 'nextAuditYear',
      key: 'nextAuditYear',
      width: 100,
      sorter: (a: any, b: any) => (a.nextAuditYear || 0) - (b.nextAuditYear || 0),
      filters: Array.from(new Set(data.map(d => d.nextAuditYear || 2026))).sort().map(year => ({ text: String(year), value: year })),
      onFilter: (value: any, record: any) => (record.nextAuditYear || 2026) === value,
      render: (year: number) => <Tag color="purple">{year || '2026'}</Tag>
    },
    {
      title: 'Phân loại',
      dataIndex: 'auditCategory',
      key: 'auditCategory',
      width: 120,
      filters: Object.entries(AUDIT_CATEGORY_MAP).map(([k, v]) => ({ text: v, value: k })),
      onFilter: (value: any, record: any) => record.auditCategory === value,
      sorter: (a: any, b: any) => (a.auditCategory || '').localeCompare(b.auditCategory || ''),
      render: (cat: string) => <Tag color="blue">{AUDIT_CATEGORY_MAP[cat] || cat}</Tag>
    },
    {
      title: 'Phòng KTNB',
      dataIndex: 'ownerTeam',
      key: 'ownerTeam',
      width: 140,
      filters: Object.entries(OWNER_TEAM_MAP).map(([k, v]) => ({ text: v, value: k })),
      onFilter: (value: any, record: any) => record.ownerTeam === value,
      sorter: (a: any, b: any) => (a.ownerTeam || '').localeCompare(b.ownerTeam || ''),
      render: (team: string) => <Tag color="cyan">{OWNER_TEAM_MAP[team] || team}</Tag>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      filters: [
        { text: 'Active', value: 'Active' },
        { text: 'Inactive', value: 'Inactive' },
      ],
      onFilter: (value: any, record: any) => record.status === value,
      sorter: (a: any, b: any) => (a.status || '').localeCompare(b.status || ''),
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Chấm điểm & Đánh giá rủi ro">
            <Button
              type="text"
              icon={<SafetyCertificateOutlined style={{ color: '#ea9105' }} />}
              onClick={() => {
                setSelectedUniverseForRisk(record);
                setIsRiskModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Sửa thông tin">
            <Button type="text" icon={<EditOutlined />} className="text-blue-500" onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const fetchAuditUniverse = async () => {
    setLoading(true);
    try {
      const response = await api.get('/audit-universe');
      setData(response.data);
      const customFieldsRes = await api.get('/custom-fields?entityType=AuditUniverse');
      setCustomFieldsDef(customFieldsRes.data || []);
    } catch (error) {
      message.error('Lỗi khi tải danh mục kiểm toán');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      setDepartments(res.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAuditUniverse();
    fetchDepartments();
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue({
      ...record,
      lastAuditDate: record.lastAuditDate ? dayjs(record.lastAuditDate) : null
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/audit-universe/${id}`);
      message.success('Đã xóa quy trình/hoạt động');
      fetchAuditUniverse();
    } catch (error) {
      message.error('Lỗi khi xóa quy trình/hoạt động');
    }
  };

  const handleRecalculateAll = async () => {
    setLoading(true);
    try {
      await api.post('/audit-universe/recalculate');
      message.success('Đã tính toán lại toàn bộ ma trận rủi ro kiểm toán năm nay!');
      fetchAuditUniverse();
    } catch (error) {
      message.error('Lỗi khi tính toán ma trận rủi ro');
    } finally {
      setLoading(false);
    }
  };

  const handleDepartmentSelect = (code: string) => {
    const dept = departments.find((d: any) => d.code === code);
    if (dept) {
      form.setFieldsValue({
        department: dept.name,
        departmentCode: dept.code,
      });
    }
  };

  const handleModalOk = () => {
    form.validateFields().then(async values => {
      try {
        const payload = {
          ...values,
          lastAuditDate: values.lastAuditDate ? values.lastAuditDate.format('YYYY-MM-DD') : null,
          customFields: extractCustomFields(values),
        };
        if (editingRecord) {
          await api.patch(`/audit-universe/${editingRecord.id}`, payload);
          message.success('Đã cập nhật hoạt động thành công');
        } else {
          await api.post('/audit-universe', { ...payload, status: 'Active' });
          message.success('Đã thêm quy trình/hoạt động thành công');
        }
        setIsModalVisible(false);
        fetchAuditUniverse();
      } catch (error: any) {
        message.error(error.response?.data?.message || 'Lỗi khi lưu dữ liệu');
      }
    });
  };

  // Filter by search text AND category
  const filteredData = data.filter((item: any) => {
    const matchSearch = filterRecursive(item, searchText);
    const matchCategory = !filterCategory || item.auditCategory === filterCategory;
    return matchSearch && matchCategory;
  });

  const handleExport = () => {
    exportToExcel(filteredData, columns as any, 'Danh_muc_kiem_toan');
  };



  // Thống kê theo 5 phân loại kiểm toán
  const catStats = Object.keys(AUDIT_CATEGORIES).map(cat => ({
    ...AUDIT_CATEGORIES[cat],
    value: cat,
    count: data.filter((d: any) => d.auditCategory === cat).length,
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <GlobalOutlined style={{ marginRight: 8, color: '#ea9105' }} />
            Đối tượng Kiểm toán (Audit Universe)
          </Title>
        </div>
        <Space>
          <Input.Search
            placeholder="Tìm kiếm..."
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 260 }}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport} disabled={filteredData.length === 0}>
            Tải Excel
          </Button>
          <Button
            type="default"
            style={{ borderColor: '#ea9105', color: '#ea9105' }}
            onClick={handleRecalculateAll}
            loading={loading}
          >
            Tính Ma trận Rủi ro
          </Button>
          <BulkImport
            module="audit-universe"
            onSuccess={fetchAuditUniverse}
            fileName="Danh_muc_kiem_toan"
            templateData={[
              {
                'Tên Quy trình / Hoạt động': 'Quy trình Thẩm định Tín dụng Doanh nghiệp',
                'Mã đơn vị phụ trách': 'CN_HN',
                'Đơn vị phụ trách': 'Chi nhánh Hà Nội',
                'Phân loại': 'ChiNhanh',
                'Phòng KTNB phụ trách': 'PKT_DVKD',
                'Quy mô tài sản/GD (1–10)': 5.0,
                'Rủi ro vận hành T2 (1–10)': 5.0,
                'Ngày kiểm toán gần nhất': '2025-12-31',
                'Năm KT tiếp theo': 2026,
              },
              {
                'Tên Quy trình / Hoạt động': 'Kiểm toán Hệ thống Core Banking & An ninh mạng',
                'Mã đơn vị phụ trách': 'CNTT',
                'Đơn vị phụ trách': 'Khối Công nghệ Thông tin',
                'Phân loại': 'HeThong',
                'Phòng KTNB phụ trách': 'PKT_HoiSo',
                'Quy mô tài sản/GD (1–10)': 8.0,
                'Rủi ro vận hành T2 (1–10)': 7.5,
                'Ngày kiểm toán gần nhất': '2025-06-30',
                'Năm KT tiếp theo': 2026,
              }
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}
            style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}>
            Thêm Hoạt động
          </Button>
        </Space>
      </div>



      {/* TABS: DIRECTORY vs DASHBOARD vs QA CHECK ENGINE */}
      <Tabs
        defaultActiveKey="directory"
        type="card"
        items={[
          {
            key: 'directory',
            label: (
              <span style={{ fontWeight: 600 }}>
                <GlobalOutlined style={{ marginRight: 6, color: '#ea9105' }} />
                Danh mục Vũ trụ Kiểm toán
              </span>
            ),
            children: (
              <div>
                {/* Thống kê nhanh theo các nhóm Phân loại kiểm toán */}
                <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ color: '#555', fontSize: 12 }}>PHÂN LOẠI KIỂM TOÁN</Text>
                  {filterCategory && (
                    <Button type="link" size="small" onClick={() => setFilterCategory('')} style={{ color: '#ea9105', padding: 0, fontSize: 12 }}>
                      Xóa lọc Phân loại
                    </Button>
                  )}
                </div>
                <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                  {catStats.map(c => (
                    <Col key={c.value} xs={24} sm={12} md={8} lg={4} xl={4} style={{ flex: '0 0 20%', maxWidth: '20%' }}>
                      <Card
                        variant="borderless"
                        size="small"
                        hoverable
                        onClick={() => setFilterCategory(filterCategory === c.value ? '' : c.value)}
                        className="rounded-xl border border-[#f1e5d8] bg-white transition-all"
                        style={{
                          borderTop: `3px solid ${c.color}`,
                          boxShadow: filterCategory === c.value ? `0 0 0 2px ${c.color}` : undefined,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: c.color }}>{c.count}</div>
                            <Text style={{ fontSize: 11, color: '#555' }}>{c.label}</Text>
                          </div>
                          <Tag color={c.color} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>Loại</Tag>
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Card variant="borderless" className="shadow-xs rounded-2xl overflow-hidden border border-[#f1e5d8] bg-white">
                  <Table
                    columns={columns}
                    dataSource={filteredData}
                    rowKey="id"
                    pagination={{ pageSize: 10, showTotal: t => `Tổng ${t} đối tượng` }}
                    loading={loading}
                    scroll={{ x: 'max-content' }}
                  />
                </Card>
              </div>
            ),
          },
          {
            key: 'dashboard',
            label: (
              <span style={{ fontWeight: 600 }}>
                <SafetyCertificateOutlined style={{ marginRight: 6, color: '#1890ff' }} />
                Dashboard Risk Universe (Mô hình THUCTE Sheet 04)
              </span>
            ),
            children: (
              <div>
                {/* 4 SUMMARY STATS CARDS */}
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Card size="small" style={{ borderTop: '3px solid #1890ff', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>TỔNG ĐỐI TƯỢNG ACTIVE</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#096dd9' }}>
                        {data.filter((d: any) => d.status !== 'Inactive').length} / {data.length}
                      </div>
                      <div style={{ fontSize: 11, color: '#52c41a' }}>🟢 Đang giám sát thực tế</div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" style={{ borderTop: '3px solid #cf1322', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>RỦI RO CAO / SEVERE (ĐỎ & CAM)</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#cf1322' }}>
                        {data.filter((d: any) => (d.dynamicRiskRating === 'Rất cao' || d.dynamicRiskRating === 'Cao' || (d.riskScore || 0) >= 3.0)).length}
                      </div>
                      <div style={{ fontSize: 11, color: '#cf1322' }}>Cần ưu tiên đưa vào Kế hoạch năm</div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" style={{ borderTop: '3px solid #fa8c16', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>QUÁ HẠN KIỂM TOÁN (OVERDUE)</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#fa8c16' }}>
                        {data.filter((d: any) => {
                          if (!d.lastAuditDate) return true;
                          const years = dayjs().diff(dayjs(d.lastAuditDate), 'year', true);
                          return years >= 3.0;
                        }).length}
                      </div>
                      <div style={{ fontSize: 11, color: '#fa8c16' }}>Khoảng cách KT ≥ 3 năm</div>
                    </Card>
                  </Col>
                  <Col span={6}>
                    <Card size="small" style={{ borderTop: '3px solid #52c41a', borderRadius: 8 }}>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>ĐÃ LÊN KẾ HOẠCH NĂM NAY</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#52c41a' }}>
                        {data.filter((d: any) => d.nextAuditYear === new Date().getFullYear()).length}
                      </div>
                      <div style={{ fontSize: 11, color: '#52c41a' }}>Kỳ kiểm toán {new Date().getFullYear()}</div>
                    </Card>
                  </Col>
                </Row>

                {/* DISTRIBUTION BREAKDOWNS */}
                <Row gutter={16}>
                  <Col span={12}>
                    <Card size="small" title="1. Phân Bổ Theo Băng Rủi Ro (Final Risk Band)" style={{ borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: '🔴 Severe / Rất cao (Đỏ)', count: data.filter((d: any) => d.dynamicRiskRating === 'Rất cao' || (d.riskScore || 0) >= 3.8).length, color: '#cf1322' },
                          { label: '🟠 High / Cao (Cam)', count: data.filter((d: any) => d.dynamicRiskRating === 'Cao' || ((d.riskScore || 0) >= 3.0 && (d.riskScore || 0) < 3.8)).length, color: '#d4380d' },
                          { label: '🟡 Medium / Trung bình (Vàng)', count: data.filter((d: any) => d.dynamicRiskRating === 'Trung bình' || ((d.riskScore || 0) >= 2.0 && (d.riskScore || 0) < 3.0)).length, color: '#d48806' },
                          { label: '🟢 Low / Thấp (Xanh)', count: data.filter((d: any) => d.dynamicRiskRating === 'Thấp' || ((d.riskScore || 0) < 2.0 && (d.riskScore || 0) > 0)).length, color: '#389e0d' },
                          { label: '⚪ Chưa chấm điểm', count: data.filter((d: any) => !d.riskScore && !d.dynamicRiskRating).length, color: '#8c8c8c' },
                        ].map((b, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: '#262626' }}>{b.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong style={{ fontSize: 14, color: b.color }}>{b.count}</strong>
                              <Tag color={b.color}>{data.length > 0 ? Math.round((b.count / data.length) * 100) : 0}%</Tag>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>

                  <Col span={12}>
                    <Card size="small" title="2. Khoảng Cách Thời Gian Kiểm Toán (Last Audit Gap)" style={{ borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: '⚠️ Chưa từng được kiểm toán (Never audited)', count: data.filter((d: any) => !d.lastAuditDate).length, color: '#cf1322' },
                          { label: '🚨 Quá 3 năm chưa kiểm toán (> 36 tháng)', count: data.filter((d: any) => d.lastAuditDate && dayjs().diff(dayjs(d.lastAuditDate), 'month') > 36).length, color: '#d4380d' },
                          { label: '⏳ Từ 2 - 3 năm (24 - 36 tháng)', count: data.filter((d: any) => d.lastAuditDate && dayjs().diff(dayjs(d.lastAuditDate), 'month') > 24 && dayjs().diff(dayjs(d.lastAuditDate), 'month') <= 36).length, color: '#fa8c16' },
                          { label: '✅ Dưới 2 năm (Gần đây)', count: data.filter((d: any) => d.lastAuditDate && dayjs().diff(dayjs(d.lastAuditDate), 'month') <= 24).length, color: '#52c41a' },
                        ].map((g, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, color: '#262626' }}>{g.label}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong style={{ fontSize: 14, color: g.color }}>{g.count}</strong>
                              <Tag color={g.color}>{data.length > 0 ? Math.round((g.count / data.length) * 100) : 0}%</Tag>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </Col>
                </Row>
              </div>
            ),
          },
          {
            key: 'qa-check',
            label: (
              <span style={{ fontWeight: 600 }}>
                <AlertOutlined style={{ marginRight: 6, color: '#cf1322' }} />
                Kiểm Tra Chất Lượng (QA Check Engine — 10 Rules THUCTE)
              </span>
            ),
            children: (
              <div>
                <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fffbe6', borderColor: '#ffe58f' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#873800', fontSize: 14 }}>
                        Bộ 10 Quy Tắc Kiểm Soát Chất Lượng Dữ Liệu Risk Universe (Sheet 05_QA_Check)
                      </strong>
                      <div style={{ fontSize: 12, color: '#595959', marginTop: 2 }}>
                        Rà soát tính toàn vẹn, hợp lệ và tuân thủ theo chuẩn phương pháp luận kiểm toán nội bộ trước khi chốt Kế hoạch Kiểm toán.
                      </div>
                    </div>
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      onClick={() => message.info('Đang chạy quét 10 quy tắc QA trên toàn bộ Vũ trụ kiểm toán...')}
                      style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
                    >
                      Quét Lại Toàn Bộ
                    </Button>
                  </div>
                </Card>

                {/* 10 QA RULES TABLE */}
                <Table
                  dataSource={[
                    {
                      id: 'QA-01',
                      name: 'ID trùng',
                      rule: 'Audit Object ID phải duy nhất trên toàn hệ thống',
                      severity: 'Error',
                      action: 'Chặn phê duyệt',
                      violations: data.filter((d: any, idx: number, arr: any[]) => arr.findIndex((x: any) => x.id === d.id) !== idx),
                    },
                    {
                      id: 'QA-02',
                      name: 'Thiếu thông tin quản trị',
                      rule: 'Các trường cốt lõi (Tên quy trình, Đơn vị, Phân loại) không được để trống',
                      severity: 'Error',
                      action: 'Chặn phê duyệt',
                      violations: data.filter((d: any) => !d.name || !d.auditCategory),
                    },
                    {
                      id: 'QA-03',
                      name: 'Điểm ngoài thang chuẩn',
                      rule: 'Điểm số rủi ro và các yếu tố đánh giá phải nằm trong thang 1.0 - 10.0',
                      severity: 'Error',
                      action: 'Chặn tính điểm',
                      violations: data.filter((d: any) => (d.financialSize && (d.financialSize < 1 || d.financialSize > 10)) || (d.operationalRiskScore && (d.operationalRiskScore < 1 || d.operationalRiskScore > 10))),
                    },
                    {
                      id: 'QA-04',
                      name: 'Liên kết cha - con không hợp lệ',
                      rule: 'Đối tượng con (PGD/Quy trình) phải có đơn vị cha hợp lệ',
                      severity: 'Error',
                      action: 'Chặn phê duyệt',
                      violations: data.filter((d: any) => d.auditCategory === 'PGD' && !d.department),
                    },
                    {
                      id: 'QA-05',
                      name: 'Override thiếu lý do',
                      rule: 'Khi điều chỉnh xếp hạng rủi ro thủ công bắt buộc phải có căn cứ (Rationale)',
                      severity: 'Error',
                      action: 'Chặn phê duyệt',
                      violations: data.filter((d: any) => d.scoreDetails?.isOverridden && !d.scoreDetails?.rationale),
                    },
                    {
                      id: 'QA-06',
                      name: 'Chu kỳ kiểm toán không phù hợp',
                      rule: 'Đối tượng bắt buộc (Mandatory) phải có tần suất kiểm toán theo quy định',
                      severity: 'Warning',
                      action: 'Cấp quản lý soát xét',
                      violations: data.filter((d: any) => d.auditCategory === 'ChiNhanh' && !d.nextAuditYear),
                    },
                    {
                      id: 'QA-07',
                      name: 'Chưa kiểm toán nhưng rủi ro Rất cao',
                      rule: 'Đối tượng Never Audited có rủi ro Rất cao/Cao phải được ưu tiên lập kế hoạch',
                      severity: 'Warning',
                      action: 'Báo cáo CAE',
                      violations: data.filter((d: any) => !d.lastAuditDate && (d.dynamicRiskRating === 'Rất cao' || d.dynamicRiskRating === 'Cao' || (d.riskScore || 0) >= 3.5)),
                    },
                    {
                      id: 'QA-08',
                      name: 'Thời hạn soát xét quá hạn',
                      rule: 'Risk Universe phải được cập nhật định kỳ (≥ 3 năm chưa KT)',
                      severity: 'Warning',
                      action: 'Yêu cầu cập nhật',
                      violations: data.filter((d: any) => d.lastAuditDate && dayjs().diff(dayjs(d.lastAuditDate), 'year', true) >= 3.0),
                    },
                    {
                      id: 'QA-09',
                      name: 'Đối tượng Inactive nằm trong kế hoạch',
                      rule: 'Đối tượng ngừng hoạt động (Inactive) không được có kỳ kiểm toán tiếp theo',
                      severity: 'Warning',
                      action: 'Soát xét kế hoạch',
                      violations: data.filter((d: any) => d.status === 'Inactive' && d.nextAuditYear),
                    },
                    {
                      id: 'QA-10',
                      name: 'Thiếu căn cứ đánh giá rủi ro',
                      rule: 'Điểm rủi ro phải có nguồn dữ liệu hoặc hồ sơ đánh giá truy xuất được',
                      severity: 'Error',
                      action: 'Chặn phê duyệt',
                      violations: data.filter((d: any) => d.riskScore && !d.financialSize && !d.scoreDetails),
                    },
                  ]}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Mã Rule',
                      dataIndex: 'id',
                      key: 'id',
                      width: 90,
                      render: (id: string) => <Tag color="geekblue">{id}</Tag>,
                    },
                    {
                      title: 'Tên Quy Tắc & Mô Tả',
                      key: 'ruleName',
                      render: (_: any, r: any) => (
                        <div>
                          <strong>{r.name}</strong>
                          <div style={{ fontSize: 11, color: '#595959' }}>{r.rule}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'Mức Độ',
                      dataIndex: 'severity',
                      key: 'severity',
                      width: 100,
                      render: (sev: string) => (
                        <Tag color={sev === 'Error' ? 'red' : 'gold'}>
                          {sev === 'Error' ? '🔴 Lỗi' : '🟡 Cảnh báo'}
                        </Tag>
                      ),
                    },
                    {
                      title: 'Hành Động Khuyến Nghị',
                      dataIndex: 'action',
                      key: 'action',
                      width: 150,
                      render: (act: string) => <Text type="secondary" style={{ fontSize: 12 }}>{act}</Text>,
                    },
                    {
                      title: 'Kết Quả Quét',
                      key: 'result',
                      width: 140,
                      render: (_: any, r: any) => {
                        const count = r.violations.length;
                        return count === 0 ? (
                          <Tag color="green">✅ Đạt (Pass)</Tag>
                        ) : (
                          <Tag color={r.severity === 'Error' ? 'red' : 'gold'}>
                            {count} vi phạm
                          </Tag>
                        );
                      },
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />

      {/* Modal Thêm / Sửa */}
      <Modal
        title={editingRecord ? 'Cập nhật Quy trình / Hoạt động' : 'Thêm Quy trình / Hoạt động mới'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={t('common.btnSave', 'Lưu')}
        cancelText={t('common.btnCancel', 'Hủy')}
        width={700}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Tên Quy trình / Hoạt động" rules={[{ required: true, message: t('auditUniverse.enterTheProcessName', 'Nhập tên quy trình') }]}>
            <Input placeholder="VD: Quy trình Vận hành thẻ, Giải ngân tín dụng CN..." />
          </Form.Item>

          <Divider orientation={"left" as any} orientationMargin={0} style={{ fontSize: 13, color: '#888' }}>Liên kết Cơ cấu Tổ chức</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="departmentCode" label="Đơn vị phụ trách (chọn từ danh mục)">
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Chọn đơn vị..."
                  allowClear
                  onChange={handleDepartmentSelect}
                >
                  {departments.map((d: any) => (
                    <Option key={d.code} value={d.code} label={`${d.code} ${d.name}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{d.name}</span>
                        <Text code style={{ fontSize: 10 }}>{d.code}</Text>
                      </div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department" label="Tên đơn vị hiển thị">
                <Input placeholder="Tự động điền khi chọn ở trên, hoặc nhập thủ công" />
              </Form.Item>
            </Col>
          </Row>


          <Divider orientation={"left" as any} orientationMargin={0} style={{ fontSize: 13, color: '#888' }}>Điểm số Ma trận Rủi ro</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="financialSize" label={t('auditUniverse.modal.finSize', 'Quy mô tài sản/GD (1–10)')} initialValue={5.0}>
                <InputNumber min={1.0} max={10.0} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="operationalRiskScore" label={t('auditUniverse.modal.opRisk', 'Rủi ro vận hành T2 (1–10)')} initialValue={5.0}>
                <InputNumber min={1.0} max={10.0} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="pastFindingsScore" label={t('auditUniverse.modal.pastFindings', 'Sai phạm lịch sử (1-5)')} initialValue={2.5} help="Được tính toán tự động từ Phát hiện KT">
                <InputNumber min={1.0} max={5.0} step={0.5} style={{ width: '100%' }} disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="lastAuditDate" label={t('auditUniverse.modal.lastAuditDate', 'Ngày kiểm toán gần nhất')}>
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="nextAuditYear" label="Năm KT tiếp theo" initialValue={2026}>
                <InputNumber min={2024} max={2030} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation={"left" as any} orientationMargin={0} style={{ fontSize: 13, color: '#888' }}>Phân loại Kiểm toán</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="auditCategory" label="Phân loại" initialValue="ChiNhanh">
                <Select>
                  <Option value="HoiSo">{t('auditPlan.tabs2.filter.hoiso', 'Hội sở')}</Option>
                  <Option value="ChiNhanh">{t('auditPlan.tabs2.filter.chinhanh', 'Chi nhánh')}</Option>
                  <Option value="PGD">{t('auditPlan.tabs2.filter.pgd', 'Phòng giao dịch')}</Option>
                  <Option value="HeThong">{t('dashboard.tabs.it', 'Hệ thống CNTT')}</Option>
                  <Option value="ChuyenDe">{t('auditPlan.tabs2.filter.chuyende', 'Nghiệp vụ')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ownerTeam" label="Phòng KTNB phụ trách" initialValue="PKT_DVKD">
                <Select>
                  <Option value="PKT_HoiSo">{t('auditUniverse.modal.teamHq', 'Phòng KT Hội sở & Hệ thống')}</Option>
                  <Option value="PKT_DVKD">{t('auditUniverse.modal.teamBranch', 'Phòng KT Đơn vị Kinh doanh')}</Option>
                  <Option value="TongHop">{t('auditEngagements.generalDepartment', 'Bộ phận Tổng hợp')}</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Hidden field for departmentCode auto-fill */}
          <Form.Item name="departmentCode" hidden><Input /></Form.Item>

          <DynamicFormRenderer entityType="AuditUniverse" form={form} initialValues={editingRecord} />
        </Form>
      </Modal>

      {/* MODAL CHẤM ĐIỂM RỦI RO ĐỒNG NHẤT */}
      <UnifiedRiskScoringModal
        visible={isRiskModalVisible}
        initialData={selectedUniverseForRisk}
        targetType="AuditUniverse"
        auditUniverses={data}
        onCancel={() => {
          setIsRiskModalVisible(false);
          setSelectedUniverseForRisk(null);
        }}
        onSuccess={() => {
          fetchAuditUniverse();
        }}
      />
    </div>
  );
};

export default AuditUniverse;
