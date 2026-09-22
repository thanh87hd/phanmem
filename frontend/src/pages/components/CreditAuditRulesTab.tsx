import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Tag, Switch, Input, Space, Button, message, Select, Card, Modal, Form, Row, Col, Popconfirm, InputNumber } from 'antd';
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { exportToExcel, filterRecursive } from '../../utils/excelExport';
import BulkImport from '../../components/BulkImport';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../../utils/tableFilterHelper';

const { Option } = Select;
const { TextArea } = Input;

interface CreditAuditRulesTabProps {
  rules: any[];
  onRefresh: () => void;
  loading: boolean;
}

export const CreditAuditRulesTab: React.FC<CreditAuditRulesTabProps> = ({ rules, onRefresh, loading }) => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState('');
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleToggleActive = async (id: number, checked: boolean) => {
    try {
      await api.patch(`/continuous-monitoring/audit-rules/${id}/status`, { isActive: checked });
      message.success(checked ? 'Đã bật rule' : 'Đã tắt rule');
      onRefresh();
    } catch (error) {
      message.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/continuous-monitoring/audit-rules/${id}`);
      message.success('Đã xóa rule thành công');
      onRefresh();
    } catch (error) {
      message.error('Lỗi khi xóa rule');
    }
  };

  const handleOpenModal = (rule?: any) => {
    setEditingRule(rule || null);
    if (rule) {
      form.setFieldsValue(rule);
    } else {
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleSave = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      if (editingRule) {
        await api.put(`/continuous-monitoring/audit-rules/${editingRule.id}`, values);
        message.success('Cập nhật rule thành công');
      } else {
        await api.post('/continuous-monitoring/audit-rules', values);
        message.success('Thêm rule mới thành công');
      }
      setIsModalVisible(false);
      onRefresh();
    } catch (error) {
      message.error('Lỗi khi lưu rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = () => {
    exportToExcel(filteredRules, columns, 'Thu_Vien_Rule_KT');
  };

  const filteredRules = rules.filter(r => {
    const matchSearch = filterRecursive(r, searchText);
    const matchDomain = domainFilter ? r.domain === domainFilter : true;
    return matchSearch && matchDomain;
  });

  const domains = Array.from(new Set(rules.map(r => r.domain).filter(Boolean)));

  const columns = [
    { 
      title: 'Mã Rule', 
      dataIndex: 'ruleId', 
      key: 'ruleId', 
      width: 100, 
      fixed: 'left' as const,
      ...getColumnSearchProps<any>('ruleId', 'Mã Rule'),
      sorter: getColumnSorter<any>('ruleId', 'string'),
    },
    { 
      title: 'Miền NV', 
      dataIndex: 'domain', 
      key: 'domain', 
      width: 120, 
      ...getColumnSelectFilterProps<any>('domain', undefined, rules),
      render: (val: string) => <Tag color="blue">{val}</Tag> 
    },
    { 
      title: 'Tên Rule', 
      dataIndex: 'ruleName', 
      key: 'ruleName', 
      width: 250,
      ...getColumnSearchProps<any>('ruleName', 'Tên Rule'),
      sorter: getColumnSorter<any>('ruleName', 'string'),
    },
    { 
      title: 'Mức cảnh báo', 
      dataIndex: 'alertLevel', 
      key: 'alertLevel', 
      width: 120, 
      ...getColumnSelectFilterProps<any>('alertLevel', undefined, rules),
      render: (val: string) => (
        <Tag color={val === 'Đỏ' ? 'red' : val === 'Vàng' ? 'orange' : 'default'}>{val}</Tag>
      )
    },
    { 
      title: 'SLA (h)', 
      dataIndex: 'slaHours', 
      key: 'slaHours', 
      width: 90,
      sorter: getColumnSorter<any>('slaHours', 'number'),
    },
    { 
      title: 'Rủi ro', 
      dataIndex: 'risk', 
      key: 'risk', 
      width: 200, 
      ellipsis: true,
      ...getColumnSearchProps<any>('risk', 'Rủi ro'),
    },
    { title: 'Logic kích hoạt', dataIndex: 'logic', key: 'logic', width: 300, ellipsis: true },
    { 
      title: 'Kích hoạt', 
      dataIndex: 'isActive', 
      key: 'isActive', 
      width: 100,
      ...getColumnSelectFilterProps<any>('isActive', [{ text: 'Đang bật', value: true }, { text: 'Đã tắt', value: false }]),
      render: (val: boolean, record: any) => (
        <Switch checked={val} onChange={(checked) => handleToggleActive(record.id, checked)} />
      )
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpenModal(record)} />
          <Popconfirm title="Bạn có chắc chắn muốn xóa rule này?" onConfirm={() => handleDelete(record.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const templateData = [{
    ruleId: 'RULE-001',
    domain: 'Tín dụng',
    ruleName: 'Nợ quá hạn vượt mức',
    alertLevel: 'Đỏ',
    slaHours: 24,
    risk: 'Rủi ro thanh khoản',
    logic: 'Ngày quá hạn > 30'
  }];

  return (
    <Card variant="borderless" className="shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <Space>
          <Input
            placeholder="Tìm kiếm rule..."
            prefix={<SearchOutlined />}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Select
            placeholder="Lọc theo miền nghiệp vụ"
            style={{ width: 200 }}
            allowClear
            onChange={setDomainFilter}
          >
            {domains.map(d => (
              <Option key={d as string} value={d as string}>{d as string}</Option>
            ))}
          </Select>
        </Space>
        <Space>
          <BulkImport 
            module="audit-rules" 
            fileName="DanhSachRule" 
            onSuccess={onRefresh}
            templateData={templateData}
            buttonText="Import Excel"
          />
          <Button icon={<DownloadOutlined />} onClick={handleExport}>Export Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal()}>
            Thêm Rule Mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={filteredRules}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 15 }}
        scroll={{ x: 'max-content' }}
        size="small"
      />

      <Modal
        title={editingRule ? 'Chỉnh sửa Rule' : 'Thêm Rule Mới'}
        open={isModalVisible}
        onOk={handleSave}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={submitting}
        width={800}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="ruleId" label="Mã Rule" rules={[{ required: true }]}>
                <Input placeholder="VD: CRD-001" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="domain" label="Miền nghiệp vụ" rules={[{ required: true }]}>
                <Input placeholder="VD: Tín dụng" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="ruleName" label="Tên Rule" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="alertLevel" label="Mức cảnh báo" rules={[{ required: true }]}>
                <Select>
                  <Option value="Đỏ">🔴 Đỏ</Option>
                  <Option value="Vàng">🟡 Vàng</Option>
                  <Option value="Xanh">🟢 Xanh</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slaHours" label="SLA Xử lý (giờ)">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="risk" label="Mô tả Rủi ro">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="logic" label="Logic / Tiêu chí kích hoạt">
                <TextArea rows={3} placeholder="VD: Dư nợ nhóm 2 > 5% tổng dư nợ" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="auditObjective" label="Mục tiêu kiểm toán">
                <TextArea rows={2} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </Card>
  );
};
