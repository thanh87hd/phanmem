import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Typography, Card, Modal, Form, Input, 
  Select, Tag, Row, Col, message, Spin, Tooltip, List
} from 'antd';
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, 
  UploadOutlined, DownloadOutlined, SafetyCertificateOutlined,
  BlockOutlined, ReloadOutlined, RobotOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import BulkImport from '../components/BulkImport';
import { exportToExcel, filterRecursive } from '../utils/excelExport';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const getRiskColor = (score: string) => {
  if (score === 'Critical') return '#cf1322';
  if (score === 'High') return '#f5222d';
  if (score === 'Medium') return '#faad14';
  if (score === 'Low') return '#52c41a';
  return 'default';
};

const getControlTypeColor = (type: string) => {
  if (type === 'Preventive') return 'blue';
  if (type === 'Detective') return 'purple';
  return 'default';
};

const RiskControlMatrix: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [searchText, setSearchText] = useState('');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('');
  const [filterControlType, setFilterControlType] = useState<string>('');
  const [filterAutomation, setFilterAutomation] = useState<string>('');
  const [form] = Form.useForm();
  
  // AI Suggestion state
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isSuggestModalVisible, setIsSuggestModalVisible] = useState(false);
  const [suggestedRisks, setSuggestedRisks] = useState<any[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/risk-control-matrix');
      setData(response.data || []);
    } catch (error) {
      message.error(t('riskControlMatrix.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    setSuggestedRisks([]);
    setIsModalVisible(true);
  };

  const handleAiSuggest = async () => {
    const processName = form.getFieldValue('processName');
    if (!processName) {
      message.warning(t('riskControlMatrix.warnAi'));
      return;
    }
    setIsAiLoading(true);
    try {
      const res = await api.post('/ai/suggest-rcm', { processName });
      const risksList = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.risks || []);
      setSuggestedRisks(risksList);
      setIsSuggestModalVisible(true);
    } catch (error) {
      message.error(t('riskControlMatrix.errorAi'));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleEdit = (record: any) => {
    setEditingRecord(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const filteredData = data.filter((item) => {
    const matchesSearch = filterRecursive(item, searchText);
    const matchesRisk = !filterRiskLevel || item.inherentRiskScore === filterRiskLevel;
    const matchesType = !filterControlType || item.controlType === filterControlType;
    const matchesAuto = !filterAutomation || item.controlAutomation === filterAutomation;
    return matchesSearch && matchesRisk && matchesType && matchesAuto;
  });

  const handleExport = () => {
    exportToExcel(filteredData, columns, 'Risk_Control_Matrix');
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/risk-control-matrix/${id}`);
      message.success(t('riskControlMatrix.delSuccess'));
      fetchData();
    } catch (error) {
      message.error(t('riskControlMatrix.errorDel'));
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingRecord) {
        await api.patch(`/risk-control-matrix/${editingRecord.id}`, values);
        message.success(t('riskControlMatrix.updateSuccess'));
      } else {
        await api.post('/risk-control-matrix', values);
        message.success(t('riskControlMatrix.createSuccess'));
      }
      setIsModalVisible(false);
      fetchData();
    } catch (error) {
      console.error(error);
      message.error(t('riskControlMatrix.errorForm'));
    }
  };

  const columns = [
    {
      title: t('riskControlMatrix.cols.process'),
      dataIndex: 'processName',
      key: 'processName',
      width: 200,
      ellipsis: true,
      ...getColumnSearchProps<any>('processName', 'Tên quy trình'),
      sorter: getColumnSorter<any>('processName', 'string'),
      render: (text: string, record: any) => (
        <div>
          <strong>{text || record.legacyProcessName || '-'}</strong>
          {record.subProcess && <div className="text-xs text-gray-500">{record.subProcess}</div>}
        </div>
      ),
    },
    {
      title: t('riskControlMatrix.cols.risk'),
      dataIndex: 'riskName',
      key: 'riskName',
      width: 240,
      ellipsis: true,
      ...getColumnSearchProps<any>('riskName', 'Rủi ro'),
      ...getColumnSelectFilterProps<any>('inherentRiskScore', undefined, data),
      sorter: getColumnSorter<any>('riskName', 'string'),
      render: (text: string, record: any) => (
        <div>
          <span className="text-red-700 font-medium">{text}</span>
          <div className="mt-1">
            <Tag color={getRiskColor(record.inherentRiskScore)}>{record.inherentRiskScore || 'N/A'}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: t('riskControlMatrix.cols.control'),
      dataIndex: 'controlName',
      key: 'controlName',
      width: 260,
      ellipsis: true,
      ...getColumnSearchProps<any>('controlName', 'Chốt kiểm soát'),
      ...getColumnSelectFilterProps<any>('controlType', undefined, data),
      sorter: getColumnSorter<any>('controlName', 'string'),
      render: (text: string, record: any) => (
        <div>
          <span className="text-blue-700 font-medium">{text}</span>
          <div className="mt-1 flex gap-1">
            <Tag color={getControlTypeColor(record.controlType)}>{record.controlType || 'N/A'}</Tag>
            {record.controlAutomation && <Tag>{record.controlAutomation}</Tag>}
          </div>
        </div>
      ),
    },
    {
      title: t('riskControlMatrix.cols.procedure'),
      dataIndex: 'testProcedure',
      key: 'testProcedure',
      width: 260,
      ellipsis: true,
      ...getColumnSearchProps<any>('testProcedure', 'Thủ tục kiểm tra'),
      render: (text: string) => (
        <div className="text-sm text-gray-600 line-clamp-3" title={text}>
          {text || '-'}
        </div>
      ),
    },
    {
      title: t('riskControlMatrix.cols.action'),
      key: 'action',
      width: 110,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Tooltip title={t('riskControlMatrix.tooltips.edit')}>
            <Button type="text" icon={<EditOutlined />} className="text-blue-500" onClick={() => handleEdit(record)} />
          </Tooltip>
          <Tooltip title={t('riskControlMatrix.tooltips.delete')}>
            <Button type="text" icon={<DeleteOutlined />} danger onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <BlockOutlined style={{ fontSize: 24, color: '#ea9105' }} />
            <Title level={3} className="!mb-0">{t('riskControlMatrix.title')}</Title>
          </div>
          <Text className="text-gray-500">
            {t('riskControlMatrix.desc')}
          </Text>
        </div>
        <Space className="flex-wrap">
          <BulkImport
            module="risk-control-matrix"
            onSuccess={fetchData}
            fileName="Risk_Control_Matrix_Template"
            templateData={[
              { 
                [t('riskControlMatrix.excel.processName', 'Tên quy trình')]: 'Cho vay KHCN', 
                [t('riskControlMatrix.excel.subProcess', 'Quy trình con')]: t('riskControlMatrix.documentAppraisal', 'Thẩm định hồ sơ'), 
                [t('riskControlMatrix.excel.objective', 'Mục tiêu kinh doanh')]: t('riskControlMatrix.makeSureYourDocumentsAreValid', 'Đảm bảo hồ sơ hợp lệ'), 
                [t('riskControlMatrix.excel.riskName', 'Tên rủi ro')]: t('riskControlMatrix.fakeProfile', 'Hồ sơ giả mạo'), 
                [t('riskControlMatrix.excel.riskLevel', 'Mức độ rủi ro')]: 'Cao', 
                [t('riskControlMatrix.excel.controlName', 'Tên chốt kiểm soát')]: t('riskControlMatrix.compareCccdWithCic', 'Đối chiếu CCCD với CIC'), 
                [t('riskControlMatrix.excel.controlType', 'Loại kiểm soát')]: t('riskControlMatrix.prevent', 'Phòng ngừa'), 
                [t('riskControlMatrix.excel.frequency', 'Tần suất')]: t('riskControlMatrix.everyDay', 'Hàng ngày'), 
                [t('riskControlMatrix.excel.automation', 'Mức độ tự động')]: t('riskControlMatrix.handmade', 'Thủ công'), 
                [t('riskControlMatrix.excel.procedure', 'Thủ tục kiểm tra')]: t('riskControlMatrix.check10RandomProfiles', 'Kiểm tra 10 hồ sơ ngẫu nhiên'), 
                [t('riskControlMatrix.excel.evidence', 'Bằng chứng mong đợi')]: t('riskControlMatrix.cicScreenshot', 'Bản chụp màn hình CIC') 
              }
            ]}
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>{t('riskControlMatrix.exportBtn')}</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            {t('riskControlMatrix.addBtn')}
          </Button>
        </Space>
      </div>

      {/* Toolbar Filter */}
      <Card variant="borderless" className="shadow-sm rounded-lg">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input.Search
              placeholder="Tìm quy trình, rủi ro, kiểm soát..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full"
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Mức độ rủi ro"
              className="w-full"
              value={filterRiskLevel || undefined}
              onChange={(val) => setFilterRiskLevel(val || '')}
              options={[
                { label: 'Critical', value: 'Critical' },
                { label: 'High', value: 'High' },
                { label: 'Medium', value: 'Medium' },
                { label: 'Low', value: 'Low' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Loại kiểm soát"
              className="w-full"
              value={filterControlType || undefined}
              onChange={(val) => setFilterControlType(val || '')}
              options={[
                { label: 'Preventive (Phòng ngừa)', value: 'Preventive' },
                { label: 'Detective (Phát hiện)', value: 'Detective' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              allowClear
              placeholder="Tự động hóa"
              className="w-full"
              value={filterAutomation || undefined}
              onChange={(val) => setFilterAutomation(val || '')}
              options={[
                { label: 'Manual (Thủ công)', value: 'Manual' },
                { label: 'Automated (Tự động)', value: 'Automated' },
                { label: 'IT-Dependent Manual', value: 'IT-Dependent Manual' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={3}>
            <Button
              onClick={() => {
                setSearchText('');
                setFilterRiskLevel('');
                setFilterControlType('');
                setFilterAutomation('');
              }}
              disabled={!searchText && !filterRiskLevel && !filterControlType && !filterAutomation}
            >
              Xóa lọc
            </Button>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" className="shadow-sm rounded-lg">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 1070 }}
        />
      </Card>

      <Modal
        title={editingRecord ? t('riskControlMatrix.modalUpdateTitle') : t('riskControlMatrix.modalAddTitle')}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        width={1000}
        okText={t('riskControlMatrix.btnSave')}
        cancelText={t('riskControlMatrix.btnCancel')}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={24}>
              <div className="bg-blue-50 p-2 rounded mb-4 text-blue-800 font-semibold flex items-center gap-2">
                <BlockOutlined /> {t('riskControlMatrix.sections.process')}
              </div>
            </Col>
            <Col span={12}>
              <Form.Item name="processName" label={t('riskControlMatrix.form.processName')} rules={[{ required: true }]}>
                <Input 
                  placeholder={t('riskControlMatrix.form.processNamePlaceholder')} 
                  addonAfter={
                    <Tooltip title={t('riskControlMatrix.tooltips.aiSuggest')}>
                      <Button 
                        type="text" 
                        icon={<RobotOutlined className="text-blue-600" />} 
                        loading={isAiLoading} 
                        onClick={handleAiSuggest} 
                        size="small"
                      />
                    </Tooltip>
                  } 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="subProcess" label={t('riskControlMatrix.form.subProcess')}>
                <Input placeholder={t('riskControlMatrix.form.subProcessPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="businessObjective" label={t('riskControlMatrix.form.objective')}>
                <TextArea rows={2} placeholder={t('riskControlMatrix.form.objectivePlaceholder')} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <div className="bg-red-50 p-2 rounded mb-4 text-red-800 font-semibold flex items-center gap-2 mt-4">
                <SafetyCertificateOutlined /> {t('riskControlMatrix.sections.risk')}
              </div>
            </Col>
            <Col span={16}>
              <Form.Item name="riskName" label={t('riskControlMatrix.form.riskName')} rules={[{ required: true }]}>
                <Input placeholder={t('riskControlMatrix.form.riskNamePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="inherentRiskScore" label={t('riskControlMatrix.form.riskLevel')}>
                <Select placeholder={t('riskControlMatrix.form.riskLevelPlaceholder')}>
                  <Option value="Critical">{t('riskControlMatrix.options.critical')}</Option>
                  <Option value="High">{t('riskControlMatrix.options.high')}</Option>
                  <Option value="Medium">{t('riskControlMatrix.options.medium')}</Option>
                  <Option value="Low">{t('riskControlMatrix.options.low')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="riskDescription" label={t('riskControlMatrix.form.riskDesc')}>
                <TextArea rows={2} />
              </Form.Item>
            </Col>

            <Col span={24}>
              <div className="bg-green-50 p-2 rounded mb-4 text-green-800 font-semibold flex items-center gap-2 mt-4">
                <SafetyCertificateOutlined /> {t('riskControlMatrix.sections.control')}
              </div>
            </Col>
            <Col span={24}>
              <Form.Item name="controlName" label={t('riskControlMatrix.form.controlName')} rules={[{ required: true }]}>
                <Input placeholder={t('riskControlMatrix.form.controlNamePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="controlType" label={t('riskControlMatrix.form.controlType')}>
                <Select placeholder={t('riskControlMatrix.form.controlTypePlaceholder')}>
                  <Option value="Preventive">{t('riskControlMatrix.options.preventive')}</Option>
                  <Option value="Detective">{t('riskControlMatrix.options.detective')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="controlAutomation" label={t('riskControlMatrix.form.automation')}>
                <Select placeholder={t('riskControlMatrix.form.automationPlaceholder')}>
                  <Option value="Manual">{t('riskControlMatrix.options.manual')}</Option>
                  <Option value="Automated">{t('riskControlMatrix.options.automated')}</Option>
                  <Option value="IT-Dependent Manual">{t('riskControlMatrix.options.itDependent')}</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="controlFrequency" label={t('riskControlMatrix.form.frequency')}>
                <Input placeholder={t('riskControlMatrix.form.frequencyPlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="testProcedure" label={t('riskControlMatrix.form.procedure')}>
                <TextArea rows={3} placeholder={t('riskControlMatrix.form.procedurePlaceholder')} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="expectedEvidence" label={t('riskControlMatrix.form.evidence')}>
                <Input placeholder={t('riskControlMatrix.form.evidencePlaceholder')} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* AI Suggestion Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-blue-700">
            <RobotOutlined /> {t('riskControlMatrix.aiModal.title')}
          </div>
        }
        open={isSuggestModalVisible}
        onCancel={() => setIsSuggestModalVisible(false)}
        footer={null}
        width={800}
      >
        <div className="mb-4 text-gray-500">
          {t('riskControlMatrix.aiModal.descPrefix')} <span className="font-semibold text-gray-700">{form.getFieldValue('processName')}</span>
        </div>
        <List
          dataSource={Array.isArray(suggestedRisks) ? suggestedRisks : []}
          renderItem={(item, index) => (
            <List.Item
              className="bg-white border rounded-lg mb-3 p-4 shadow-sm"
              actions={[
                <Button 
                  type="primary" 
                  onClick={() => {
                    form.setFieldsValue({
                      ...form.getFieldsValue(),
                      ...item
                    });
                    setIsSuggestModalVisible(false);
                    message.success(t('riskControlMatrix.aiModal.msgApplied'));
                  }}
                >
                  {t('riskControlMatrix.aiModal.btnApply')}
                </Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <span className="text-red-600 font-semibold text-lg">
                    {item.riskName} <Tag color={getRiskColor(item.inherentRiskScore)} className="ml-2">{item.inherentRiskScore}</Tag>
                  </span>
                }
                description={
                  <div className="mt-2 text-gray-700">
                    <div className="mb-2"><strong>{t('riskControlMatrix.aiModal.riskDesc')}</strong> {item.riskDescription}</div>
                    <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
                      <div className="font-semibold text-blue-800 mb-1">
                        {t('riskControlMatrix.aiModal.controlTitle')} {item.controlName} 
                        <Tag color={getControlTypeColor(item.controlType)} className="ml-2">{item.controlType}</Tag>
                      </div>
                      <div className="text-sm"><strong>{t('riskControlMatrix.aiModal.freq')}</strong> {item.controlFrequency} | <strong>{t('riskControlMatrix.aiModal.automation')}</strong> {item.controlAutomation}</div>
                      <div className="text-sm mt-1"><strong>{t('riskControlMatrix.aiModal.procedure')}</strong> {item.testProcedure}</div>
                    </div>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  );
};

export default RiskControlMatrix;
