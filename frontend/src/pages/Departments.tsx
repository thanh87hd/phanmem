import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, Tag, message, Select, Row, Col, Tooltip, Divider, Segmented, Tree } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, BankOutlined, ApartmentOutlined, CloseOutlined, SwapOutlined, AuditOutlined } from '@ant-design/icons';
import api from '../services/api';
import BulkImport from '../components/BulkImport';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import DynamicFormRenderer, { extractCustomFields } from '../components/DynamicFormRenderer';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import ProposeChangeModal from '../components/ProposeChangeModal';

const { Title, Text } = Typography;
const { Option } = Select;



const Departments: React.FC = () => {
  const { t } = useTranslation();

  // Loại đơn vị tổ chức
  const UNIT_TYPES = [
    { value: 'HoiDong',         label: t('departments.council', 'Hội đồng'),             color: '#7b2ff7' },
    { value: 'UyBan',           label: t('departments.committeeboard', 'Ủy ban / Ban'),         color: '#d46b08' },
    { value: 'Khoi',            label: t('departments.block', 'Khối'),                 color: '#d97706' },
    { value: 'Phong',           label: t('departments.departments', 'Phòng ban'),            color: '#389e0d' },
    { value: 'ChiNhanh',        label: t('auditPlan.tabs2.filter.chinhanh', 'Chi nhánh'),            color: '#c41d7f' },
    { value: 'PGD',             label: t('departments.transactionOffice', 'Phòng Giao dịch'),      color: '#d4380d' },
    { value: 'TrungTam',        label: t('departments.center', 'Trung tâm'),            color: '#531dab' },
    { value: 'BDT',             label: t('dashboard.tabs.bdt', 'BĐT'),                  color: '#13c2c2' },
    { value: 'Khac',            label: t('auditFindings.other', 'Khác'),                 color: '#5c5c5c' },
  ];



  const getUnitTypeMeta = (value: string) => UNIT_TYPES.find(item => item.value === value) || { label: value, color: '#5c5c5c' };

  // Danh mục Vùng quản lý
  const REGION_OPTIONS = [
    { value: 'Vùng 1 (Miền Bắc)', label: t('departments.regions.north', 'Vùng 1 (Miền Bắc)') },
    { value: 'Vùng 2 (Miền Trung)', label: t('departments.regions.central', 'Vùng 2 (Miền Trung)') },
    { value: 'Vùng 3 (Miền Nam)', label: t('departments.regions.south', 'Vùng 3 (Miền Nam)') },
    { value: 'Hội sở chính', label: t('departments.regions.hq', 'Hội sở chính') },
    { value: 'Đơn vị sự nghiệp', label: t('departments.regions.sn', 'Đơn vị sự nghiệp') },
  ];

  const [data, setData] = useState<any[]>([]);



  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProposeModalVisible, setIsProposeModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedUnitType, setSelectedUnitType] = useState<string>('');
  const [filterUnitType, setFilterUnitType] = useState<string>('all');
  const [form] = Form.useForm();
  const [viewMode, setViewMode] = useState<'table' | 'tree'>('table');

  const buildTreeData = (items: any[]) => {
    const map: Record<string, any> = {};
    items.forEach(item => {
      map[item.code] = {
        key: item.id,
        title: (
          <div style={{ padding: '4px 0' }}>
            <span style={{ fontWeight: 600, fontSize: 13, marginRight: 8 }}>{item.name}</span>
            <Tag color={getUnitTypeMeta(item.unitType).color} style={{ fontSize: 10, scale: 0.9 }}>{getUnitTypeMeta(item.unitType).label}</Tag>
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>({item.code})</Text>
            {item.functions && (
              <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2, paddingLeft: 12, borderLeft: '2px solid #ea9105', fontStyle: 'italic' }}>
                Nhiệm vụ: {item.functions}
              </div>
            )}
          </div>
        ),
        code: item.code,
        parent: item.parent,
        parentId: item.parentId,
        raw: item,
        children: []
      };
    });

    const roots: any[] = [];
    Object.values(map).forEach(node => {
      let parentNode = null;
      if (node.parentId) {
        parentNode = Object.values(map).find((x: any) => x.raw.id === node.parentId);
      } else if (node.parent) {
        parentNode = map[node.parent];
      }

      if (parentNode) {
        parentNode.children.push(node);
      } else {
        roots.push(node);
      }
    });

    const cleanNodes = (nodes: any[]) => {
      nodes.forEach(n => {
        if (n.children.length === 0) {
          delete n.children;
        } else {
          cleanNodes(n.children);
        }
      });
    };
    cleanNodes(roots);
    return roots;
  };

  const columns = [
    {
      title: t('departments.cols.code', 'Mã Đơn vị'),
      dataIndex: 'code',
      key: 'code',
      width: 120,
      ...getColumnSearchProps<any>('code', 'Mã Đơn vị'),
      sorter: getColumnSorter<any>('code', 'string'),
    },
    {
      title: t('departments.cols.name', 'Tên Đơn vị'),
      dataIndex: 'name',
      key: 'name',
      ...getColumnSearchProps<any>('name', 'Tên Đơn vị'),
      sorter: getColumnSorter<any>('name', 'string'),
    },
    {
      title: t('departments.cols.unitType', 'Loại đơn vị'),
      dataIndex: 'unitType',
      key: 'unitType',
      width: 160,
      ...getColumnSelectFilterProps<any>('unitType', UNIT_TYPES.map(u => ({ text: u.label, value: u.value }))),
      sorter: getColumnSorter<any>('unitType', 'string'),
      render: (unitType: string) => {
        const meta = getUnitTypeMeta(unitType);
        return <Tag color={meta.color} style={{ borderRadius: 4 }}>{meta.label}</Tag>;
      },
    },
    {
      title: t('departments.cols.region', 'Vùng quản lý'),
      dataIndex: 'region',
      key: 'region',
      width: 150,
      ...getColumnSearchProps<any>('region', 'Vùng quản lý'),
      sorter: getColumnSorter<any>('region', 'string'),
      render: (region: string) => {
        if (!region) return <Text type="secondary">—</Text>;
        return <Tag color="blue" style={{ borderRadius: 4, fontSize: 11 }}>{region}</Tag>;
      },
    },
    {
      title: t('departments.cols.parent', 'Đơn vị cha'),
      dataIndex: 'parent',
      key: 'parent',
      width: 130,
      ...getColumnSearchProps<any>('parent', 'Đơn vị cha'),
      sorter: getColumnSorter<any>('parent', 'string'),
      render: (parent: string) => parent ? <Text code style={{ fontSize: 12 }}>{parent}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'),
      dataIndex: 'status',
      key: 'status',
      width: 100,
      ...getColumnSelectFilterProps<any>('status', [
        { text: 'Active', value: 'Active' },
        { text: 'Inactive', value: 'Inactive' },
      ]),
      sorter: getColumnSorter<any>('status', 'string'),
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: 140,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title="Đề xuất Biến động / Nâng cấp / Kế thừa Rủi ro">
            <Button
              type="text"
              icon={<SwapOutlined style={{ color: '#fa8c16' }} />}
              onClick={() => {
                setEditingRecord(record);
                setIsProposeModalVisible(true);
              }}
            />
          </Tooltip>
          <Button type="text" icon={<EditOutlined />} className="text-blue-500" onClick={() => handleEdit(record)} />
          <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const response = await api.get('/departments');
      setData(response.data);
    } catch (error) {
      message.error(t('departments.errorLoadingUnitList', 'Lỗi khi tải danh sách đơn vị'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDepartments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    setSelectedUnitType('');
    form.resetFields();
    form.setFieldsValue({ unitType: 'Phong', status: 'Active' });
    setSelectedUnitType('Phong');
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setSelectedUnitType(record.unitType || '');
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/departments/${id}`);
      message.success(t('departments.deletedUnit', 'Đã xóa đơn vị'));
      fetchDepartments();
    } catch (error) {
      message.error(t('departments.errorWhileDeletingUnits', 'Lỗi khi xóa đơn vị'));
    }
  };

  const handleModalOk = () => {
    form.validateFields().then(async values => {
      try {
        const payload = {
          ...values,
          status: values.status || 'Active',
          customFields: extractCustomFields(values),
        };
        if (editingRecord) {
          await api.patch(`/departments/${editingRecord.id}`, payload);
          message.success(t('departments.unitUpdatedSuccessfully', 'Đã cập nhật đơn vị thành công'));
        } else {
          await api.post('/departments', payload);
          message.success(t('departments.unitAddedSuccessfully', 'Đã thêm đơn vị thành công'));
        }
        setIsModalVisible(false);
        fetchDepartments();
      } catch (error: any) {
        message.error(error.response?.data?.message || t('departments.errorSavingUnits', 'Lỗi khi lưu đơn vị'));
      }
    });
  };

  const filteredData = data.filter((item: any) => {
    const matchSearch = filterRecursive(item, searchText);
    if (filterUnitType === 'all') return matchSearch;
    if (filterUnitType === 'BDT') {
      return matchSearch && ['BDT', 'DonViKinhDoanh'].includes(item.unitType);
    }
    return matchSearch && item.unitType === filterUnitType;
  });

  const handleExport = () => {
    exportToExcel(filteredData, columns as any, 'Co_cau_to_chuc');
  };

  // Nhóm thống kê nhanh
  const stats = {
    total: data.length,
    hoiDong: data.filter((d: any) => d.unitType === 'HoiDong').length,
    uyBan: data.filter((d: any) => d.unitType === 'UyBan').length,
    khoi: data.filter((d: any) => d.unitType === 'Khoi').length,
    phong: data.filter((d: any) => d.unitType === 'Phong').length,
    chiNhanh: data.filter((d: any) => d.unitType === 'ChiNhanh').length,
    pgd: data.filter((d: any) => d.unitType === 'PGD').length,
    trungTam: data.filter((d: any) => d.unitType === 'TrungTam').length,
    bdt: data.filter((d: any) => ['BDT', 'DonViKinhDoanh'].includes(d.unitType)).length,
  };

  if (isModalVisible) {
    return (
      <div className="animate-fadeIn p-1">
        {/* Premium Header with Back/Home button */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 bg-transparent">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => setIsModalVisible(false)} 
              className="flex items-center gap-2 rounded-xl shadow-sm border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold transition-all duration-200 h-10"
              icon={<CloseOutlined />}
            >
              {t('auditExpenses.form.btnBack', '← Quay lại danh sách')}
            </Button>
            <div>
              <Title level={3} className="!mb-1 text-slate-800" style={{ margin: 0 }}>
                {editingRecord ? [t('departments.updateUnits', 'Cập nhật Đơn vị')] : t('departments.addNewUnit', 'Thêm Đơn vị mới')}
              </Title>
              <Text type="secondary" className="text-sm">
              </Text>
            </div>
          </div>
          <Space>
            <Button onClick={() => setIsModalVisible(false)} className="rounded-xl shadow-sm h-10 px-5">
              {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
            </Button>
            <Button 
              type="primary" 
              onClick={handleModalOk} 
              className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 px-6 text-white"
            >
              {editingRecord ? [t('auditEngagements.update', 'Cập nhật')] : t('departments.addUnits', 'Thêm đơn vị')}
            </Button>
          </Space>
        </div>

        <Card variant="borderless" className="shadow-md rounded-2xl p-6 bg-white border border-slate-100">
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="code" label={<span className="font-semibold text-slate-700">{t('departments.cols.code', 'Mã Đơn vị')}</span>} rules={[{ required: true, message: t('departments.enterTheUnitCode', 'Nhập mã đơn vị') }]}>
                  <Input placeholder="VD: HDQT, KTNB, CN_HN" style={{ textTransform: 'uppercase' }} className="rounded-lg h-10" />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="name" label={<span className="font-semibold text-slate-700">{t('departments.cols.name', 'Tên Đơn vị')}</span>} rules={[{ required: true, message: t('departments.enterTheUnitName', 'Nhập tên đơn vị') }]}>
                  <Input placeholder={t('departments.forExampleBoardOfDirectorsHanoi', 'VD: Hội đồng Quản trị, Chi nhánh Hà Nội')} className="rounded-lg h-10" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="unitType" label={<span className="font-semibold text-slate-700">{t('departments.cols.unitType', 'Loại đơn vị')}</span>} rules={[{ required: true, message: t('departments.selectUnitType', 'Chọn loại đơn vị') }]}>
                  <Select
                    placeholder={t('departments.selectUnitType', 'Chọn loại đơn vị')}
                    className="h-10"
                    onChange={(val) => {
                      setSelectedUnitType(val);
                    }}
                  >
                    {UNIT_TYPES.map(t => (
                      <Option key={t.value} value={t.value}>
                        <Tag color={t.color} style={{ marginRight: 6, borderRadius: 3 }}>{t.label}</Tag>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="region" label={<span className="font-semibold text-slate-700">{t('departments.cols.region', 'Vùng quản lý')}</span>}>
                  <Select placeholder={t('departments.selectRegion', 'Chọn vùng quản lý...')} allowClear className="h-10">
                    {REGION_OPTIONS.map(r => (
                      <Option key={r.value} value={r.value}>{r.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="parent" label={<span className="font-semibold text-slate-700">{t('departments.parentUnitCodeLegacy', 'Đơn vị cha (mã code - legacy)')}</span>}>
              <Select
                placeholder={t('departments.selectParentUnitCode', 'Chọn đơn vị cha (mã code)')}
                allowClear
                showSearch
                optionFilterProp="children"
                className="h-10"
              >
                {data.filter((d: any) => d.code !== form.getFieldValue('code')).map((d: any) => (
                  <Option key={d.code} value={d.code}>
                    <Text code style={{ fontSize: 11 }}>{d.code}</Text> — {d.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="parentId" label={<span className="font-semibold text-slate-700">{t('departments.parentUnitTreeHierarchy', 'Đơn vị cha (Hệ thống phân cấp Tree)')}</span>}>
              <Select
                placeholder={t('departments.selectDirectParentUnit', 'Chọn đơn vị cha trực tiếp...')}
                allowClear
                showSearch
                optionFilterProp="children"
                className="h-10"
              >
                {data.filter((d: any) => d.id !== form.getFieldValue('id') && d.code !== form.getFieldValue('code')).map((d: any) => (
                  <Option key={d.id} value={d.id}>
                    {d.name} <span style={{ color: '#8c8c8c', fontSize: 11 }}>({d.code})</span>
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="functions" label={<span className="font-semibold text-slate-700">{t('departments.mainFunctionsDuties', 'Chức năng & Nhiệm vụ chính')}</span>}>
              <Input.TextArea rows={3} placeholder={t('departments.describeTheCoreFunctionsAndTasks', 'Mô tả các chức năng, nhiệm vụ cốt lõi được giao...')} className="rounded-lg" />
            </Form.Item>

            <Form.Item name="description" label={<span className="font-semibold text-slate-700">{t('departments.furtherDescription', 'Mô tả thêm')}</span>}>
              <Input.TextArea rows={2} placeholder={t('departments.describeTheMainFunctionsAndTasks', 'Mô tả chức năng, nhiệm vụ chính của đơn vị...')} className="rounded-lg" />
            </Form.Item>

            <Form.Item name="status" label={<span className="font-semibold text-slate-700">{t('auditTemplates.cols.status', 'Trạng thái')}</span>} initialValue="Active">
              <Select className="h-10">
                <Option value="Active"><Tag color="green">Active</Tag></Option>
                <Option value="Inactive"><Tag color="red">Inactive</Tag></Option>
              </Select>
            </Form.Item>
            
            <DynamicFormRenderer entityType="Department" form={form} initialValues={editingRecord} />
          </Form>

          <Divider className="my-6" />

          <div className="flex justify-end gap-3">
            <Button onClick={() => setIsModalVisible(false)} className="rounded-xl px-6 h-10">
              {t('auditTemplates.form.btnCancel', 'Hủy bỏ')}
            </Button>
            <Button 
              type="primary" 
              onClick={handleModalOk} 
              className="rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none px-6 font-semibold h-10 text-white"
            >
              {editingRecord ? [t('auditEngagements.update', 'Cập nhật')] : t('departments.addUnits', 'Thêm đơn vị')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ApartmentOutlined style={{ marginRight: 8, color: '#ea9105' }} />
            {t('departments.organizationalStructure', 'Cơ cấu Tổ chức')}
          </Title>
          <Text type="secondary">Danh mục đơn vị theo phân cấp: Hội đồng, Ủy ban / Ban, Khối, Phòng ban, Chi nhánh, PGD, Trung tâm, BĐT</Text>
        </div>
        <Space>
          <Segmented
            value={viewMode}
            onChange={(val: any) => setViewMode(val)}
            options={[
              { label: t('departments.listTable', 'Bảng danh sách'), value: 'table' },
              { label: t('departments.treeDiagramTree', 'Sơ đồ cây (Tree)'), value: 'tree' },
            ]}
            style={{ marginRight: 8 }}
          />
          <Input.Search
            placeholder={t('departments.searchForUnits', 'Tìm kiếm đơn vị...')}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 230 }}
            className="rounded-lg shadow-sm"
          />
          {filterUnitType !== 'all' && (
            <Button onClick={() => setFilterUnitType('all')} type="dashed" className="rounded-xl h-10">
              {t('departments.showAll', 'Hiện tất cả')}
            </Button>
          )}
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={filteredData.length === 0}
            className="shadow-sm rounded-xl border-slate-200 hover:text-[#ea9105] hover:border-[#ea9105] bg-white font-semibold h-10"
          >
            {t('personnel.export', 'Tải Excel')}
          </Button>
          <BulkImport
            module="departments"
            onSuccess={fetchDepartments}
            fileName="Co_cau_to_chuc"
            templateData={[
              {
                'Mã đơn vị': 'CN_HN',
                'Tên đơn vị': 'Chi nhánh Hà Nội',
                'Loại đơn vị': 'ChiNhanh',
                'Đơn vị cha': 'HO',
                'Trạng thái': 'Active'
              },
              {
                'Mã đơn vị': 'PGD_CG',
                'Tên đơn vị': 'Phòng Giao dịch Cầu Giấy',
                'Loại đơn vị': 'PGD',
                'Đơn vị cha': 'CN_HN',
                'Trạng thái': 'Active'
              }
            ]}
          />
          <Button
            icon={<AuditOutlined />}
            onClick={() => setIsProposeModalVisible(true)}
            style={{ backgroundColor: '#fa8c16', color: '#fff', borderColor: '#fa8c16' }}
            className="shadow-md rounded-xl font-semibold h-10 flex items-center gap-1.5"
          >
            Đề xuất Thay đổi ĐVKD
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleAdd}
            className="shadow-md rounded-xl bg-[#ea9105] hover:bg-[#d07e00] border-none font-semibold h-10 flex items-center gap-1.5 text-white"
          >
            {t('departments.btnNew', 'Thêm Đơn vị')}
          </Button>
        </Space>
      </div>

      {/* Thống kê nhanh */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { key: 'HoiDong', label: t('departments.council', 'Hội đồng'), count: stats.hoiDong, color: '#7b2ff7' },
          { key: 'UyBan', label: t('departments.committeeboard', 'Ủy ban / Ban'), count: stats.uyBan, color: '#d46b08' },
          { key: 'Khoi', label: t('departments.block', 'Khối'), count: stats.khoi, color: '#d97706' },
          { key: 'Phong', label: t('departments.departments', 'Phòng ban'), count: stats.phong, color: '#389e0d' },
          { key: 'ChiNhanh', label: t('auditPlan.tabs2.filter.chinhanh', 'Chi nhánh'), count: stats.chiNhanh, color: '#c41d7f' },
          { key: 'PGD', label: 'PGD', count: stats.pgd, color: '#d4380d' },
          { key: 'TrungTam', label: t('departments.center', 'Trung tâm'), count: stats.trungTam, color: '#531dab' },
          { key: 'BDT', label: t('dashboard.tabs.bdt', 'BĐT'), count: stats.bdt, color: '#13c2c2' },
        ].map(s => {
          const isActive = filterUnitType === s.key;
          return (
            <Col key={s.key} flex="1">
              <Card
                variant="borderless"
                size="small"
                hoverable
                onClick={() => setFilterUnitType(filterUnitType === s.key ? 'all' : s.key)}
                style={{ 
                  textAlign: 'center', 
                  borderTop: `4px solid ${s.color}`, 
                  borderRadius: 8, 
                  boxShadow: isActive ? `0 0 0 2px ${s.color}, 0 2px 8px rgba(0,0,0,0.15)` : '0 1px 4px rgba(0,0,0,0.08)',
                  transform: isActive ? 'scale(1.03)' : 'none',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  backgroundColor: isActive ? '#fafafa' : '#fff'
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.count}</div>
                <Text style={{ fontSize: 11, color: '#666', fontWeight: isActive ? 600 : 'normal' }}>{s.label}</Text>
              </Card>
            </Col>
          );
        })}
      </Row>

      {viewMode === 'table' ? (
        <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Table
            columns={[
              ...columns.slice(0, 4),
              {
                title: t('departments.mainMission', 'Nhiệm vụ chính'),
                dataIndex: 'functions',
                key: 'functions',
                width: 250,
                ellipsis: true,
                render: (f: string) => f ? <Text type="secondary" style={{ fontSize: 12 }}>{f}</Text> : <Text type="secondary" className="italic text-gray-300">—</Text>
              },
              ...columns.slice(4)
            ]}
            dataSource={filteredData}
            rowKey="id"
            pagination={{ pageSize: 15, showTotal: t => `Tổng ${t} đơn vị` }}
            loading={loading}
            scroll={{ x: 'max-content' }}
          />
        </Card>
      ) : (
        <Card variant="borderless" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: 12 }}>
          {filteredData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#8c8c8c' }}>{t('departments.noUnitsFound', 'Không tìm thấy đơn vị nào')}</div>
          ) : (
            <Tree
              showLine={{ showLeafIcon: false }}
              defaultExpandAll
              treeData={buildTreeData(filteredData)}
              className="premium-tree bg-slate-50/30 p-4 rounded-xl border border-slate-100"
              style={{ padding: 12 }}
            />
          )}
        </Card>
      )}

      {/* Modal Thêm / Sửa đã được chuyển thành Inline Editor ở trên */}

      <ProposeChangeModal
        visible={isProposeModalVisible}
        onCancel={() => {
          setIsProposeModalVisible(false);
          setEditingRecord(null);
        }}
        onSuccess={() => {
          setIsProposeModalVisible(false);
          setEditingRecord(null);
          fetchDepartments();
        }}
        defaultCategory="ORGANIZATION"
        targetItem={editingRecord}
      />
    </div>
  );
};

export default Departments;
