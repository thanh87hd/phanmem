import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Typography, Card, Modal, Form, Input, InputNumber, Tag, message, Select, Tabs, Badge } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../services/api';
import BulkImport from '../components/BulkImport';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Paragraph } = Typography;

const RiskCriteria: React.FC = () => {
  const { t } = useTranslation();

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('ChiNhanh');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [form] = Form.useForm();

  const auditCategories = [
    { key: 'HoiSo', label: t('auditPlan.tabs2.filter.hoiso', 'Hội sở'), icon: '🏢' },
    { key: 'ChiNhanh', label: t('auditPlan.tabs2.filter.chinhanh', 'Chi nhánh'), icon: '🏦' },
    { key: 'PGD', label: t('auditPlan.tabs2.filter.pgd', 'Phòng giao dịch'), icon: '📍' },
    { key: 'HeThong', label: t('dashboard.tabs.it', 'Hệ thống CNTT'), icon: '💻' },
    { key: 'ChuyenDe', label: t('auditPlan.tabs2.filter.chuyende', 'Nghiệp vụ'), icon: '📋' },
  ];

  const columns = [
    {
      title: t('riskCriteria.nameRiskCriteria', 'Tên Tiêu chí rủi ro'),
      dataIndex: 'name',
      key: 'name',
      ...getColumnSearchProps<any>('name', 'Tên Tiêu chí rủi ro'),
      sorter: getColumnSorter<any>('name', 'string'),
      render: (name: string, record: any) => (
        <div>
          <span className="font-semibold">{name}</span>
          {record.description && (
            <div className="text-gray-400 text-xs mt-0.5 font-light">{record.description}</div>
          )}
        </div>
      ),
    },
    {
      title: t('riskCriteria.riskGroupTt832025', 'Nhóm rủi ro (TT83/2025)'),
      dataIndex: 'category',
      key: 'category',
      ...getColumnSelectFilterProps<any>('category', undefined, data),
      sorter: getColumnSorter<any>('category', 'string'),
      render: (cat: string) => {
        const colors: Record<string, string> = {
          [t('riskAssessment.creditRisk', 'Rủi ro Tín dụng')]: 'red',
          [t('riskAssessment.operationalRisk', 'Rủi ro Hoạt động')]: 'orange',
          [t('riskCriteria.liquidityRisk', 'Rủi ro Thanh khoản')]: 'blue',
          [t('riskCriteria.marketRisk', 'Rủi ro Thị trường')]: 'cyan',
          [t('riskCriteria.bankBookInterestRateRisk', 'Rủi ro Lãi suất sổ ngân hàng')]: 'purple',
          [t('riskAssessment.complianceRisk', 'Rủi ro Tuân thủ')]: 'green',
        };
        return <Tag color={colors[cat] || 'geekblue'}>{cat || t('riskAssessment.operationalRisk', 'Rủi ro Hoạt động')}</Tag>;
      },
    },
    {
      title: t('riskCriteria.weight', 'Trọng số (%)'),
      dataIndex: 'weight',
      key: 'weight',
      sorter: getColumnSorter<any>('weight', 'number'),
      render: (weight: number) => <strong className="text-lg text-primary">{weight}%</strong>,
    },
    {
      title: t('auditTemplates.cols.status', 'Trạng thái'),
      dataIndex: 'status',
      key: 'status',
      ...getColumnSelectFilterProps<any>('status', undefined, data),
      sorter: getColumnSorter<any>('status', 'string'),
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} className="text-blue-500 hover:bg-blue-50" onClick={() => handleEdit(record)} />
          <Button type="text" icon={<DeleteOutlined />} danger className="hover:bg-red-50" onClick={() => handleDelete(record.id)} />
        </Space>
      ),
    },
  ];

  const fetchRiskCriteria = async () => {
    setLoading(true);
    try {
      const response = await api.get('/risk-criteria');
      setData(response.data);
    } catch (error) {
      message.error(t('riskCriteria.errorLoadingRiskCriteria', 'Lỗi khi tải tiêu chí rủi ro'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRiskCriteria();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({
      auditCategory: activeTab,
      category: t('riskAssessment.operationalRisk', 'Rủi ro Hoạt động'),
    });
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/risk-criteria/${id}`);
      message.success(t('riskCriteria.removedRiskCriteria', 'Đã xóa tiêu chí rủi ro'));
      fetchRiskCriteria();
    } catch (error) {
      message.error(t('riskCriteria.errorWhileDeletingCriteria', 'Lỗi khi xóa tiêu chí'));
    }
  };

  const handleModalOk = () => {
    form.validateFields().then(async values => {
      try {
        if (editingRecord) {
          await api.patch(`/risk-criteria/${editingRecord.id}`, values);
          message.success(t('riskCriteria.updatedSuccessCriteria', 'Đã cập nhật tiêu chí thành công'));
        } else {
          const payload = {
            ...values,
            status: 'Active',
          };
          await api.post('/risk-criteria', payload);
          message.success(t('riskCriteria.addedSuccessCriteria', 'Đã thêm tiêu chí thành công'));
        }
        setIsModalVisible(false);
        fetchRiskCriteria();
      } catch (error: any) {
        message.error(error.response?.data?.message || t('findingKB.messages.saveError', 'Lỗi khi lưu dữ liệu'));
      }
    });
  };

  const getWeightForCategory = (cat: string) => {
    return data.filter((item: any) => item.auditCategory === cat).reduce((sum, item) => sum + item.weight, 0);
  };

  const currentCategoryWeight = getWeightForCategory(activeTab);

  const tabItems = auditCategories.map(cat => {
    const w = getWeightForCategory(cat.key);
    const isValid = w === 100;
    return {
      key: cat.key,
      label: (
        <span className="flex items-center gap-1.5 px-1 py-0.5">
          <span>{cat.icon}</span>
          <span className="font-medium">{cat.label}</span>
          <Badge
            count={`${w}%`}
            style={{ 
              backgroundColor: isValid ? '#52c41a' : '#f5222d',
              boxShadow: 'none',
            }} 
          />
        </span>
      ),
    };
  });

  const filteredData = data
    .filter((item: any) => item.auditCategory === activeTab)
    .filter((item: any) => (!selectedCategoryFilter || item.category === selectedCategoryFilter))
    .filter((item: any) => (!selectedStatusFilter || item.status === selectedStatusFilter))
    .filter((item: any) => filterRecursive(item, searchText));

  const handleExportExcel = () => {
    exportToExcel(filteredData, columns, `Tieu_chi_rui_ro_${activeTab}`);
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <Title level={3} className="!mb-0 !font-bold text-gray-800">{t('riskCriteria.configureRiskAssessmentCriteria', 'Cấu hình Tiêu chí Đánh giá Rủi ro')}</Title>
          <Paragraph className="!text-gray-500 !mb-0 mt-1">
            {t('riskCriteria.setUpPotentialRiskCriteriaAnd', 'Thiết lập các tiêu chí rủi ro tiềm ẩn (Inherent Risk) và trọng số đánh giá riêng biệt cho từng nhóm kiểm toán theo chuẩn mực IIA 2024 & Thông tư 83/2025/TT-NHNN.')}
          </Paragraph>
        </div>
        <Space className="w-full md:w-auto justify-end flex-wrap">
          <Input.Search
            placeholder={t('riskCriteria.searchCriteria', 'Tìm kiếm tiêu chí...')}
            allowClear
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }}
            className="shadow-sm"
          />
          <Select
            allowClear
            placeholder="Lọc Nhóm rủi ro"
            style={{ width: 170 }}
            value={selectedCategoryFilter || undefined}
            onChange={(val) => setSelectedCategoryFilter(val || '')}
            options={[
              { label: 'Rủi ro Tín dụng', value: 'Rủi ro Tín dụng' },
              { label: 'Rủi ro Hoạt động', value: 'Rủi ro Hoạt động' },
              { label: 'Rủi ro Thanh khoản', value: 'Rủi ro Thanh khoản' },
              { label: 'Rủi ro Thị trường', value: 'Rủi ro Thị trường' },
              { label: 'Rủi ro Lãi suất', value: 'Rủi ro Lãi suất sổ ngân hàng' },
              { label: 'Rủi ro Tuân thủ', value: 'Rủi ro Tuân thủ' },
            ]}
          />
          <Select
            allowClear
            placeholder="Trạng thái"
            style={{ width: 120 }}
            value={selectedStatusFilter || undefined}
            onChange={(val) => setSelectedStatusFilter(val || '')}
            options={[
              { label: 'Active', value: 'Active' },
              { label: 'Inactive', value: 'Inactive' },
            ]}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExportExcel} disabled={filteredData.length === 0} className="hover:border-primary hover:text-primary">
            {t('personnel.export', 'Tải Excel')}
          </Button>
          <BulkImport
            module="risk-criteria"
            onSuccess={fetchRiskCriteria}
            fileName={`Tieu_chi_rui_ro_${activeTab}`}
            templateData={[
              { name: 'Tỷ lệ nợ xấu và nợ nhóm 2 (Chi nhánh)', weight: 30, category: t('riskAssessment.creditRisk', 'Rủi ro Tín dụng'), auditCategory: activeTab, description: 'Tỷ lệ nợ xấu (nhóm 3-5) và nợ cần chú ý (nhóm 2) trên tổng dư nợ cấp tín dụng của đơn vị chi nhánh.' }
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd} className="bg-primary hover:bg-primary-hover border-none shadow-md">
            {t('riskCriteria.addCriteria', 'Thêm Tiêu chí')}
          </Button>
        </Space>
      </div>

      {/* Tabs list to choose the audit group */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        items={tabItems}
        className="mb-4"
        size="large"
      />

      {/* Info strip about the current weight */}
      <div className={`p-4 rounded-lg mb-6 flex items-center gap-3 shadow-sm border ${
        currentCategoryWeight === 100 
          ? 'bg-green-50 border-green-200 text-green-700' 
          : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}>
        {currentCategoryWeight === 100 ? (
          <CheckCircleOutlined className="text-xl text-green-600" />
        ) : (
          <WarningOutlined className="text-xl text-amber-600 animate-pulse" />
        )}
        <div>
          <span className="font-semibold text-base">
            Tổng trọng số nhóm "{auditCategories.find(c => c.key === activeTab)?.label}": {currentCategoryWeight}%
          </span>
          {currentCategoryWeight !== 100 && (
            <span className="ml-2 font-medium">
              {t('riskCriteria.itIsNecessaryToAdjustThe', '(Cần điều chỉnh các tiêu chí để tổng đạt chính xác 100% nhằm đảm bảo tính toán xếp hạng chính xác)')}
            </span>
          )}
        </div>
      </div>

      {/* Table of Criteria */}
      <Card variant="borderless" className="shadow-md rounded-xl">
        <Table 
          columns={columns} 
          dataSource={filteredData} 
          rowKey="id" 
          pagination={false} 
          loading={loading}
          className="border-none"
        />
      </Card>

      {/* Modal Form */}
      <Modal
        title={
          <div className="border-b pb-3 mb-2 font-bold text-lg text-gray-800">
            {editingRecord ? [t('riskCriteria.updateRiskCriteria', '✏️ Cập nhật Tiêu chí Rủi ro')] : t('riskCriteria.addNewRiskCriteria', '✨ Thêm Tiêu chí Rủi ro Mới')}
          </div>
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={t('timesheet.form.btnSave', 'Lưu lại')}
        cancelText={t('findingKB.modal.cancelText', 'Hủy')}
        className="rounded-lg"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="auditCategory" label={t('riskCriteria.appliedAuditTeam', 'Nhóm Kiểm toán áp dụng')} rules={[{ required: true, message: t('scoringTab.modal.auditGroupReq', 'Vui lòng chọn nhóm kiểm toán') }]}>
            <Select placeholder={t('riskCriteria.selectAuditGroup', 'Chọn nhóm kiểm toán')}>
              {auditCategories.map(cat => (
                <Select.Option key={cat.key} value={cat.key}>
                  {cat.icon} {cat.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item name="category" label={t('riskCriteria.riskGroupingCircular832025ttnhnn', 'Phân nhóm rủi ro (Thông tư 83/2025/TT-NHNN)')} rules={[{ required: true, message: t('riskCriteria.pleaseSelectARiskGroup', 'Vui lòng chọn phân nhóm rủi ro') }]}>
            <Select placeholder={t('riskCriteria.selectTheRiskType', 'Chọn loại rủi ro')}>
              <Select.Option value={t('riskAssessment.creditRisk', 'Rủi ro Tín dụng')}>{t('riskCriteria.creditRisk', '🔴 Rủi ro Tín dụng')}</Select.Option>
              <Select.Option value={t('riskAssessment.operationalRisk', 'Rủi ro Hoạt động')}>{t('riskCriteria.operationalRisk', '🟠 Rủi ro Hoạt động')}</Select.Option>
              <Select.Option value={t('riskCriteria.liquidityRisk', 'Rủi ro Thanh khoản')}>{t('riskCriteria.liquidityRisk', '🔵 Rủi ro Thanh khoản')}</Select.Option>
              <Select.Option value={t('riskCriteria.marketRisk', 'Rủi ro Thị trường')}>{t('riskCriteria.marketRisk', '🌐 Rủi ro Thị trường')}</Select.Option>
              <Select.Option value={t('riskCriteria.bankBookInterestRateRisk', 'Rủi ro Lãi suất sổ ngân hàng')}>{t('riskCriteria.bankBookInterestRateRiskIrrbb', '🟣 Rủi ro Lãi suất sổ ngân hàng (IRRBB)')}</Select.Option>
              <Select.Option value={t('riskAssessment.complianceRisk', 'Rủi ro Tuân thủ')}>{t('riskCriteria.complianceRisk', '🟢 Rủi ro Tuân thủ')}</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="name" label={t('riskCriteria.nameDetailedRiskCriteria', 'Tên Tiêu chí rủi ro chi tiết')} rules={[{ required: true, message: t('riskCriteria.criteriaNamesCannotBeLeftBlank', 'Tên tiêu chí không được để trống') }]}>
            <Input placeholder={t('riskCriteria.forExampleBadDebtRatioOperational', 'VD: Tỷ lệ nợ xấu, Lỗi tác nghiệp, Sự cố CNTT...')} className="rounded-md" />
          </Form.Item>

          <Form.Item name="weight" label={t('riskCriteria.weight', 'Trọng số (%)')} rules={[{ required: true, message: t('riskCriteria.pleaseEnterWeight', 'Vui lòng nhập trọng số') }]}>
            <InputNumber min={1} max={100} className="w-full rounded-md" placeholder="VD: 15" suffix="%" />
          </Form.Item>

          <Form.Item name="description" label={t('riskCriteria.descriptionOfCriteriaHowToMeasure', 'Mô tả tiêu chí / Cách đo lường')}>
            <Input.TextArea placeholder={t('riskCriteria.describeInDetailTheMeasurementIndex', 'Mô tả chi tiết chỉ số đo lường, nguồn dữ liệu hoặc công thức xác định...')} rows={3} className="rounded-md" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RiskCriteria;
