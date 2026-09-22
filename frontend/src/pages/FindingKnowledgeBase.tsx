import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Space, Typography, Card, Modal, Form, Input,
  Tag, message, Tooltip, Select, Row, Col, Divider, Empty, Tabs, Upload
} from 'antd';
import {
  BookOutlined, PlusOutlined, EditOutlined, DeleteOutlined, 
  RobotOutlined, TagOutlined, BulbOutlined, BugOutlined,
  UploadOutlined, DownloadOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { DefectCodeList } from './DefectCodeList';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface Knowledge {
  id: number;
  category: string;
  title: string;
  description: string;
  criteria?: string;
  riskLevel: string;
  suggestedRecommendation?: string;
  closingGuide?: string;
  keywords?: string[];
}

const FindingKnowledgeBase: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<Knowledge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [universes, setUniverses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Knowledge | null>(null);
  const [defectCodes, setDefectCodes] = useState<any[]>([]);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [kbRes, defectRes, universeRes] = await Promise.all([
        api.get('/ai/knowledge'),
        api.get('/ai/defect-codes'),
        api.get('/audit-universe')
      ]);
      setData(kbRes.data);
      setUniverses(universeRes.data);
      setDefectCodes(defectRes.data);
      
      const uniqueL1s = Array.from(new Set(defectRes.data.map((c: any) => c.l1Desc).filter(Boolean))) as string[];
      setCategories(uniqueL1s.length > 0 ? uniqueL1s : [
        'Tín dụng', 'Huy động', 'Kế toán & Kho quỹ', 'Công nghệ thông tin', 
        'Thanh toán quốc tế', 'Vận hành & Nhân sự'
      ]);
    } catch {
      message.error('Không thể tải danh mục lỗi');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData(); }, []);

  const openModal = (record?: Knowledge) => {
    setEditingRecord(record || null);
    if (record) {
      form.setFieldsValue({
        ...record,
        keywords: record.keywords?.join(', '),
      });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        keywords: values.keywords ? values.keywords.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      };

      if (editingRecord) {
        await api.post(`/ai/knowledge/${editingRecord.id}`, payload);
        message.success('Cập nhật tri thức thành công');
      } else {
        await api.post('/ai/knowledge', payload);
        message.success('Thêm tri thức mới thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error('Lỗi khi lưu dữ liệu');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/ai/knowledge/${id}`); // Need to add delete endpoint or use POST /delete
      message.success('Đã xóa tri thức');
      fetchData();
    } catch {
      message.error('Không thể xóa');
    }
  };

  const handleUpload = async (info: any) => {
    if (info.file.status === 'uploading') {
      setSyncing(true);
      return;
    }
    if (info.file.status === 'done') {
      message.success(`Đã đồng bộ ${info.file.response?.added || 0} mục mới, cập nhật ${info.file.response?.updated || 0} mục từ Excel`);
      fetchData();
      setSyncing(false);
    } else if (info.file.status === 'error') {
      message.error(`Lỗi khi tải lên file Excel: ${info.file.response?.message || 'Unknown error'}`);
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/ai/knowledge/export-excel', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Sai_Pham_Mau_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      message.error('Lỗi khi xuất dữ liệu Excel');
    }
  };

  const columns = [
    {
      title: 'Danh mục / Sai phạm',
      key: 'title',
      render: (_: any, record: Knowledge) => (
        <div>
          <Tag color="blue">{record.category}</Tag>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{record.title}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description.length > 80 ? `${record.description.substring(0, 80)}...` : record.description}
          </Text>
        </div>
      ),
    },
    {
      title: 'Mức độ rủi ro',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      render: (level: string) => (
        <Tag color={level === 'High' ? 'red' : level === 'Medium' ? 'orange' : 'blue'}>
          {level}
        </Tag>
      ),
    },
    {
      title: 'Từ khóa nhận diện (AI Keywords)',
      dataIndex: 'keywords',
      key: 'keywords',
      render: (kws: string[]) => (
        <div style={{ maxWidth: 200 }}>
          {kws?.map(kw => <Tag key={kw} icon={<TagOutlined />} style={{ marginBottom: 4 }}>{kw}</Tag>)}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: any, record: Knowledge) => (
        <Space>
          <Tooltip title="Sửa">
            <Button type="text" icon={<EditOutlined />} onClick={() => openModal(record)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <RobotOutlined style={{ marginRight: 8, color: '#ea9105' }} />
            Danh mục lỗi (Defect Catalog)
          </Title>
          <Text type="secondary">Quản lý tri thức lỗi và danh mục mã lỗi để AI gợi ý tự động</Text>
        </div>
      </div>

      <Tabs defaultActiveKey="1" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <Tabs.TabPane tab={<span><BookOutlined /> Sai phạm mẫu</span>} key="1">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              Thêm Sai phạm mẫu
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              Xuất Excel
            </Button>
            <Upload 
              name="file" 
              action={`${api.defaults.baseURL}/ai/knowledge/import-excel`}
              headers={{ Authorization: `Bearer ${localStorage.getItem('token')}` }}
              showUploadList={false}
              onChange={handleUpload}
              accept=".xlsx, .xls"
            >
              <Button icon={<UploadOutlined />} loading={syncing}>
                Upload Excel
              </Button>
            </Upload>
          </div>
          <Row gutter={24}>
        <Col span={18}>
          <Card styles={{ body: {} }}>
            <Table
              dataSource={data}
              columns={columns}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card title={<><BulbOutlined /> Hướng dẫn AI</>} style={{ height: '100%' }}>
            <Paragraph>
              Hệ thống AI sẽ quét nội dung mô tả của KTV và so khớp với các <b>Từ khóa nhận diện</b> trong kho tri thức này.
            </Paragraph>
            <Paragraph>
              Khi tìm thấy sự tương đồng, AI sẽ tự động gợi ý:
              <ul>
                <li>Tiêu đề sai phạm</li>
                <li>Mức độ rủi ro</li>
                <li>Khuyến nghị khắc phục</li>
                <li>Chuẩn mực/Quy định áp dụng</li>
              </ul>
            </Paragraph>
            <Divider />
            <Text type="secondary">Càng nhiều dữ liệu mẫu, AI càng đưa ra gợi ý chính xác hơn.</Text>
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingRecord ? 'Cập nhật Tri thức' : 'Thêm Sai phạm mẫu'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={700}
        okText={t('common.btnSaveData', 'Lưu dữ liệu')}
        cancelText={t('common.btnCancel', 'Hủy')}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="category" label="Danh mục nghiệp vụ (L1)" rules={[{ required: true }]}>
                <Select placeholder="Chọn danh mục" showSearch>
                  {categories.map(c => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="riskLevel" label="Mức độ rủi ro mẫu" rules={[{ required: true }]}>
                <Select placeholder="Chọn mức độ">
                  <Option value="High">High (Cao)</Option>
                  <Option value="Medium">Medium (Trung bình)</Option>
                  <Option value="Low">Low (Thấp)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="auditUniverseId" label="Thuộc Quy trình (Audit Universe)">
                <Select placeholder="Chọn quy trình liên kết (không bắt buộc)..." allowClear showSearch optionFilterProp="children">
                  {universes.map((u: any) => (
                    <Option key={u.id} value={u.id}>{u.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="defectCodeId" label="Liên kết Mã lỗi (Defect Code)">
                <Select placeholder="Chọn mã lỗi (nếu có)..." allowClear showSearch optionFilterProp="children">
                  {defectCodes.map((d: any) => (
                    <Option key={d.id} value={d.id}>{d.code} - {d.description || d.l2Desc}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="title" label="Tiêu đề sai phạm mẫu" rules={[{ required: true }]}>
            <Input placeholder="Vd: Hồ sơ vay thiếu chữ ký của người bảo lãnh" />
          </Form.Item>

          <Form.Item name="description" label="Mô tả chi tiết sai phạm" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Mô tả hành vi, các dấu hiệu nhận biết..." />
          </Form.Item>

          <Form.Item name="keywords" label="Từ khóa nhận diện (Phân tách bằng dấu phẩy)" rules={[{ required: true }]}>
            <Input placeholder="Vd: thiếu chữ ký, không có bảo lãnh, quá hạn, chưa phê duyệt" />
          </Form.Item>

          <Form.Item name="criteria" label="Chuẩn mực / Quy định liên quan">
            <Input.TextArea rows={2} placeholder="Vd: Thông tư 39/2016/TT-NHNN, Quy trình tín dụng số 123..." />
          </Form.Item>

          <Form.Item name="suggestedRecommendation" label="Khuyến nghị khắc phục mẫu">
            <Input.TextArea rows={3} placeholder="AI sẽ gợi ý nội dung này cho KTV..." />
          </Form.Item>
          
          <Form.Item name="closingGuide" label="Gợi ý đóng kiến nghị kiểm toán (Hồ sơ cần thu thập để đóng KQKT)">
            <Input.TextArea rows={3} placeholder="Mô tả các tài liệu, hồ sơ bằng chứng mà đơn vị cần cung cấp để được đóng kiến nghị..." />
          </Form.Item>
        </Form>
      </Modal>
        </Tabs.TabPane>
        <Tabs.TabPane tab={<span><BugOutlined /> Danh mục Mã lỗi</span>} key="2">
          <DefectCodeList />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default FindingKnowledgeBase;
