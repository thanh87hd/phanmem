import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table, Button, Space, Typography, Card, Modal, Form, Input,
  Tag, message, Tooltip, Select, Row, Col, DatePicker, Upload, Progress,
  Tabs, Spin, Empty, Divider, Badge
} from 'antd';
import {
  ReadOutlined, PlusOutlined, EditOutlined, 
  FileSearchOutlined, LinkOutlined, InboxOutlined,
  SearchOutlined, ThunderboltOutlined, CopyOutlined,
  FileTextOutlined, ApartmentOutlined, CheckCircleOutlined,
  BookOutlined
} from '@ant-design/icons';
import api from '../services/api';
import axios from 'axios';
import dayjs from 'dayjs';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import { filterRecursive } from '../utils/excelExport';

const { Title, Text } = Typography;
const { Option } = Select;

interface Regulatory {
  id: number;
  title: string;
  code: string;
  type: string;
  businessProcess: string;
  relatedRisks: string[];
  summary: string;
  fullContent?: string;
  effectiveDate?: string;
  status: string;
  downloadLink?: string;
  pageCount?: number;
  extractionMethod?: string;
  ocrConfidence?: number;
  sourceDocumentId?: string;
  createdAt?: string;
}

interface DocumentChunkItem {
  id: number;
  regulatoryKnowledgeId: number;
  chunkIndex: number;
  heading?: string;
  pageNumber?: number;
  charCount: number;
  content: string;
}

interface RegulatoryChunkSearchResult {
  chunkId: number;
  regulatoryKnowledgeId: number;
  documentCode: string;
  documentTitle: string;
  documentType: string;
  businessProcess: string;
  heading?: string;
  pageNumber?: number;
  content: string;
}

const RegulatoryKnowledgeBase: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<Regulatory[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<Regulatory | null>(null);
  const [editingRecord, setEditingRecord] = useState<Regulatory | null>(null);
  const [jobProgress, setJobProgress] = useState<number>(0);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [form] = Form.useForm();

  // Scanning folder states
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  // Chunks & RAG states
  const [activeViewTab, setActiveViewTab] = useState<string>('full');
  const [chunks, setChunks] = useState<DocumentChunkItem[]>([]);
  const [chunksLoading, setChunksLoading] = useState<boolean>(false);
  const [rechunkLoading, setRechunkLoading] = useState<boolean>(false);

  const [isRagModalOpen, setIsRagModalOpen] = useState<boolean>(false);
  const [ragQuery, setRagQuery] = useState<string>('');
  const [ragResults, setRagResults] = useState<RegulatoryChunkSearchResult[]>([]);
  const [ragSearching, setRagSearching] = useState<boolean>(false);

  const handleUploadAndScan = async () => {
    if (fileList.length === 0) {
      message.warning('Vui lòng chọn hoặc kéo thả ít nhất 1 tệp văn bản.');
      return;
    }
    
    setScanLoading(true);
    setScanResult(null);
    
    try {
      const formData = new FormData();
      fileList.forEach((file) => {
        const actualFile = file.originFileObj || file;
        formData.append('files', actualFile as Blob, actualFile.name);
      });
      
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/ai/regulatory/upload-bulk', formData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const jobId = res.data.jobId;
      if (!jobId) {
        setScanResult(res.data);
        setScanLoading(false);
        return;
      }
      
      setJobStatus('Đang chờ xử lý...');
      setJobProgress(0);

      const interval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`/api/ai/job-status/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const { status, progress, result } = statusRes.data;
          
          if (status === 'active') {
            setJobStatus(`Đang trích xuất AI...`);
            setJobProgress(progress || 0);
          }
          
          if (status === 'completed') {
            clearInterval(interval);
            setJobProgress(100);
            setJobStatus('Hoàn thành!');
            setScanResult(result);
            message.success(`Đã số hóa xong! Thành công số hóa ${result?.successCount} văn bản.`);
            fetchData();
            setFileList([]);
            setScanLoading(false);
          }
          
          if (status === 'failed') {
            clearInterval(interval);
            message.error('Job xử lý AI bị lỗi.');
            setScanLoading(false);
          }
        } catch (pollErr) {
          console.error(pollErr);
        }
      }, 3000);
      
    } catch (e: any) {
      console.error(e);
      message.error('Lỗi khi tải lên văn bản.');
      setScanLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/regulatory');
      setData(res.data || []);
    } catch {
      message.error('Không thể tải thư viện văn bản');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Fetch chunks when viewing document
  const fetchChunksForDoc = async (id: number) => {
    setChunksLoading(true);
    try {
      const res = await api.get(`/ai/regulatory/${id}/chunks`);
      setChunks(res.data || []);
    } catch (err) {
      console.error('Error fetching chunks:', err);
      message.error('Không thể tải danh sách phân đoạn');
    } finally {
      setChunksLoading(false);
    }
  };

  const handleOpenViewModal = (record: Regulatory) => {
    setViewRecord(record);
    setActiveViewTab('full');
    fetchChunksForDoc(record.id);
  };

  const handleRechunk = async (id: number) => {
    setRechunkLoading(true);
    try {
      const res = await api.post(`/ai/regulatory/${id}/rechunk`, {});
      message.success(`Phân đoạn lại thành công! Đã tạo ${res.data?.chunkCount || 0} phân đoạn.`);
      await fetchChunksForDoc(id);
    } catch (err) {
      console.error('Rechunk error:', err);
      message.error('Lỗi khi phân đoạn lại văn bản');
    } finally {
      setRechunkLoading(false);
    }
  };

  const handleRagSearch = async (queryToSearch?: string) => {
    const q = queryToSearch !== undefined ? queryToSearch : ragQuery;
    if (!q || !q.trim()) {
      message.warning('Vui lòng nhập từ khóa hoặc câu hỏi tìm kiếm.');
      return;
    }
    setRagSearching(true);
    try {
      const res = await api.get('/ai/regulatory/search-chunks', {
        params: { q: q.trim(), limit: 10 }
      });
      setRagResults(res.data || []);
      if ((res.data || []).length === 0) {
        message.info('Không tìm thấy điều khoản phù hợp với từ khóa.');
      }
    } catch (err) {
      console.error('RAG search error:', err);
      message.error('Lỗi khi tra cứu điều khoản');
    } finally {
      setRagSearching(false);
    }
  };

  const copyText = (content: string, label = 'nội dung') => {
    navigator.clipboard.writeText(content);
    message.success(`Đã sao chép ${label} vào clipboard!`);
  };

  const openModal = (record?: Regulatory) => {
    setEditingRecord(record || null);
    if (record) {
      form.setFieldsValue({
        ...record,
        effectiveDate: record.effectiveDate ? dayjs(record.effectiveDate) : null,
        relatedRisks: record.relatedRisks?.join(', '),
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
        effectiveDate: values.effectiveDate ? values.effectiveDate.format('YYYY-MM-DD') : null,
        relatedRisks: values.relatedRisks ? values.relatedRisks.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      };

      if (editingRecord) {
        await api.patch(`/ai/regulatory/${editingRecord.id}`, payload);
        message.success('Cập nhật văn bản và phân đoạn Markdown thành công');
      } else {
        await api.post('/ai/regulatory', payload);
        message.success('Thêm văn bản mới và phân đoạn Markdown thành công');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      const errMsg = e.response?.data?.message || e.message || 'Lỗi khi lưu dữ liệu';
      message.error(`Lỗi khi lưu dữ liệu: ${errMsg}`);
    }
  };

  const filteredData = data.filter((item) => {
    const matchesSearch = filterRecursive(item, searchText);
    const matchesType = !filterType || item.type === filterType;
    const matchesStatus = !filterStatus || item.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const renderExtractionBadge = (method?: string, confidence?: number) => {
    let badge = <Tag color="default">Nhập liệu thủ công</Tag>;
    if (method === 'marker-surya') {
      badge = <Tag color="#108ee9" icon={<ThunderboltOutlined />}>Marker-Surya OCR</Tag>;
    } else if (method === 'pdf-inspector') {
      badge = <Tag color="#52c41a">pdf-inspector</Tag>;
    } else if (method === 'python-docx') {
      badge = <Tag color="#722ed1">Word Native</Tag>;
    } else if (method === 'passthrough') {
      badge = <Tag color="cyan">Text Passthrough</Tag>;
    }

    return (
      <Space orientation="vertical" size={2}>
        {badge}
        {confidence !== undefined && confidence !== null && (
          <span style={{ fontSize: '11px', color: confidence >= 0.9 ? '#389e0d' : '#d46b08' }}>
            Độ tin cậy: <strong>{(confidence * 100).toFixed(0)}%</strong>
          </span>
        )}
      </Space>
    );
  };

  const renderMarkdown = (text: string) => {
    if (!text) return <span style={{ color: '#8c8c8c', fontStyle: 'italic' }}>Không có nội dung văn bản chi tiết.</span>;
    
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      const content = line;
      if (content.startsWith('# ')) return <h1 key={idx} style={{ fontSize: '20px', fontWeight: 'bold', color: '#ea580c', borderBottom: '1px solid #fde68a', paddingBottom: '4px', marginTop: '16px', marginBottom: '8px' }}>{content.substring(2)}</h1>;
      if (content.startsWith('## ')) return <h2 key={idx} style={{ fontSize: '16px', fontWeight: 'bold', color: '#b45309', marginTop: '12px', marginBottom: '6px' }}>{content.substring(3)}</h2>;
      if (content.startsWith('### ')) return <h3 key={idx} style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', marginTop: '8px', marginBottom: '4px' }}>{content.substring(4)}</h3>;
      if (content.startsWith('- ') || content.startsWith('* ')) return <li key={idx} style={{ marginLeft: '16px', listStyleType: 'disc', color: '#434343', marginBottom: '4px' }}>{content.substring(2)}</li>;
      if (content.trim() === '') return <div key={idx} style={{ height: '8px' }} />;
      return <p key={idx} style={{ color: '#434343', lineHeight: '1.6', marginBottom: '8px' }}>{content}</p>;
    });
  };

  const columns = [
    {
      title: 'Số hiệu / Tên văn bản',
      key: 'title',
      ...getColumnSearchProps<Regulatory>('title', 'Tên / Số hiệu văn bản'),
      sorter: getColumnSorter<Regulatory>('title', 'string'),
      render: (_: any, record: Regulatory) => (
        <div>
          <Text strong style={{ color: '#ea9105' }}>{record.code}</Text>
          <div style={{ fontWeight: 500 }}>{record.title}</div>
          <Space style={{ marginTop: 4 }}>
            <Tag color="purple">{record.type}</Tag>
            <Tag color="cyan">{record.businessProcess}</Tag>
          </Space>
        </div>
      ),
    },
    {
      title: 'Phương thức OCR & Số trang',
      key: 'ocrInfo',
      width: 190,
      render: (_: any, record: Regulatory) => (
        <div>
          {renderExtractionBadge(record.extractionMethod, record.ocrConfidence)}
          <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: 3 }}>
            {record.pageCount ? `Quy mô: ${record.pageCount} trang` : '1 văn bản'}
          </div>
        </div>
      )
    },
    {
      title: 'Loại văn bản',
      dataIndex: 'type',
      key: 'type',
      width: 130,
      ...getColumnSelectFilterProps<Regulatory>('type', undefined, data),
      render: (type: string) => <Tag color="purple">{type}</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      ...getColumnSelectFilterProps<Regulatory>('status', undefined, data),
      render: (status: string) => (
        <Tag color={status === 'Còn hiệu lực' ? 'green' : 'red'}>{status}</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_: any, record: Regulatory) => (
        <Space>
          <Tooltip title="Xem nội dung & phân đoạn Chunks">
            <Button type="text" icon={<ReadOutlined style={{ color: '#ea9105' }} />} onClick={() => handleOpenViewModal(record)} />
          </Tooltip>
          <Tooltip title="Chỉnh sửa thông tin">
            <Button type="text" icon={<EditOutlined style={{ color: '#d97706' }} />} onClick={() => openModal(record)} />
          </Tooltip>
          {record.downloadLink && (
            <Tooltip title="Tải văn bản gốc">
              <Button type="text" icon={<LinkOutlined />} onClick={() => window.open(record.downloadLink, '_blank')} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }} className="space-y-4">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            <ReadOutlined style={{ marginRight: 8, color: '#ea9105' }} />
            Thư viện Văn bản & Số hóa Tri thức (Regulatory Base)
          </Title>
          <Text type="secondary" style={{ fontSize: '13px' }}>
            Tích hợp Marker-Surya OCR, phân đoạn thông minh theo Điều/Khoản và tìm kiếm ngữ nghĩa RAG
          </Text>
        </div>
        <Space>
          <Button 
            icon={<SearchOutlined />} 
            onClick={() => { setIsRagModalOpen(true); setRagResults([]); setRagQuery(''); }}
            style={{ borderColor: '#722ed1', color: '#722ed1', fontWeight: 500 }}
          >
            Tra cứu Điều/Khoản (RAG)
          </Button>
          <Button icon={<FileSearchOutlined />} onClick={() => setIsScanModalOpen(true)} style={{ borderColor: '#ea9105', color: '#ea9105' }}>
            Quét thư mục AI
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}>
            Thêm Văn bản mới
          </Button>
        </Space>
      </div>

      <Card variant="borderless" className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Tìm kiếm số hiệu, tên văn bản..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="Lọc loại văn bản"
              style={{ width: '100%' }}
              value={filterType || undefined}
              onChange={(val) => setFilterType(val || '')}
              options={[
                { label: 'Luật', value: 'Luật' },
                { label: 'Thông tư', value: 'Thông tư' },
                { label: 'Quy định nội bộ', value: 'Quy định nội bộ' },
                { label: 'Quy trình nghiệp vụ', value: 'Quy trình nghiệp vụ' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              allowClear
              placeholder="Trạng thái"
              style={{ width: '100%' }}
              value={filterStatus || undefined}
              onChange={(val) => setFilterStatus(val || '')}
              options={[
                { label: 'Còn hiệu lực', value: 'Còn hiệu lực' },
                { label: 'Hết hiệu lực', value: 'Hết hiệu lực' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button onClick={() => { setSearchText(''); setFilterType(''); setFilterStatus(''); }} disabled={!searchText && !filterType && !filterStatus}>
              Xóa bộ lọc
            </Button>
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" className="shadow-sm">
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL ĐỌC VĂN BẢN CHI TIẾT & XEM CHUNKS */}
      <Modal
        title={
          <div style={{ paddingBottom: '8px', borderBottom: '2px solid #ea9105', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text strong style={{ color: '#ea9105', fontSize: '18px', marginRight: '8px' }}>[{viewRecord?.code}]</Text>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>{viewRecord?.title}</span>
            </div>
          </div>
        }
        open={!!viewRecord}
        onCancel={() => setViewRecord(null)}
        footer={[
          <Button key="close" onClick={() => setViewRecord(null)}>{t('common.btnClose', 'Đóng')}</Button>
        ]}
        width={950}
      >
        {viewRecord && (
          <div style={{ marginTop: '16px' }}>
            <Row gutter={[16, 16]} style={{ marginBottom: '16px', background: '#f5f5f5', padding: '12px', borderRadius: '6px' }}>
              <Col span={6}><Text type="secondary">Loại: </Text><Tag color="purple">{viewRecord.type}</Tag></Col>
              <Col span={6}><Text type="secondary">Nghiệp vụ: </Text><Tag color="cyan">{viewRecord.businessProcess}</Tag></Col>
              <Col span={6}><Text type="secondary">Trạng thái: </Text><Tag color={viewRecord.status === 'Còn hiệu lực' ? 'green' : 'red'}>{viewRecord.status}</Tag></Col>
              <Col span={6}><Text type="secondary">OCR: </Text>{renderExtractionBadge(viewRecord.extractionMethod, viewRecord.ocrConfidence)}</Col>
              {viewRecord.effectiveDate && (
                <Col span={8}><Text type="secondary">Ngày hiệu lực: </Text><strong>{dayjs(viewRecord.effectiveDate).format('DD/MM/YYYY')}</strong></Col>
              )}
              <Col span={16}>
                <Text type="secondary">Rủi ro liên quan: </Text>
                {viewRecord.relatedRisks?.map(r => <Tag key={r} color="orange">{r}</Tag>)}
              </Col>
            </Row>
            
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', marginBottom: '6px' }}>Tóm tắt cho AI:</h4>
              <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', padding: '10px 14px', borderRadius: '6px', fontStyle: 'italic', color: '#613400', fontSize: '13px' }}>
                {viewRecord.summary || "Chưa có tóm tắt."}
              </div>
            </div>

            <Tabs 
              activeKey={activeViewTab} 
              onChange={setActiveViewTab}
              items={[
                {
                  key: 'full',
                  label: (
                    <span>
                      <FileTextOutlined style={{ marginRight: 6 }} />
                      Toàn văn Markdown
                    </span>
                  ),
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
                        <Button 
                          size="small" 
                          icon={<CopyOutlined />} 
                          onClick={() => copyText(viewRecord.fullContent || '', 'toàn văn')}
                        >
                          Sao chép toàn văn
                        </Button>
                        <Button 
                          size="small" 
                          type="primary"
                          icon={<EditOutlined />} 
                          onClick={() => {
                            setIsViewModalOpen(false);
                            openModal(viewRecord);
                          }}
                          style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
                        >
                          Chỉnh sửa Markdown
                        </Button>
                      </div>
                      <div style={{ border: '1px solid #d9d9d9', borderRadius: '8px', padding: '20px', background: '#fafafa', maxHeight: '450px', overflowY: 'auto' }}>
                        {renderMarkdown(viewRecord.fullContent || '')}
                      </div>
                    </div>
                  )
                },
                {
                  key: 'chunks',
                  label: (
                    <span>
                      <ApartmentOutlined style={{ marginRight: 6 }} />
                      Phân đoạn RAG (Chunks)
                      <Badge count={chunks.length} overflowCount={999} style={{ backgroundColor: '#ea9105', marginLeft: 8 }} />
                    </span>
                  ),
                  children: (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: '13px' }}>
                          Văn bản được phân rã thành từng Điều/Khoản độc lập để phục vụ AI Retrieval-Augmented Generation (RAG).
                        </Text>
                        <Button
                          type="primary"
                          icon={<ThunderboltOutlined />}
                          loading={rechunkLoading}
                          onClick={() => handleRechunk(viewRecord.id)}
                          style={{ backgroundColor: '#722ed1', borderColor: '#722ed1' }}
                        >
                          Phân đoạn lại (Rechunk)
                        </Button>
                      </div>

                      {chunksLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                          <Spin tip="Đang tải các phân đoạn Điều/Khoản..." />
                        </div>
                      ) : chunks.length === 0 ? (
                        <Empty description="Chưa có phân đoạn nào. Vui lòng bấm 'Phân đoạn lại' để tạo các chunks cho văn bản này." />
                      ) : (
                        <div style={{ maxHeight: '450px', overflowY: 'auto', paddingRight: '8px' }} className="space-y-3">
                          {chunks.map((chunk) => (
                            <Card 
                              key={chunk.id} 
                              size="small" 
                              bordered 
                              style={{ 
                                borderColor: '#d3adf7', 
                                background: '#faf5ff',
                                borderRadius: '6px' 
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                <Space>
                                  <Tag color="purple">#Chunk {chunk.chunkIndex}</Tag>
                                  <Text strong style={{ color: '#531dab', fontSize: '14px' }}>
                                    {chunk.heading || 'Phân đoạn chung'}
                                  </Text>
                                </Space>
                                <Space>
                                  {chunk.pageNumber && <Tag color="blue">Trang {chunk.pageNumber}</Tag>}
                                  <Tag color="default">{chunk.charCount} ký tự</Tag>
                                  <Button 
                                    type="text" 
                                    size="small" 
                                    icon={<CopyOutlined />} 
                                    onClick={() => copyText(chunk.content, `Chunk ${chunk.chunkIndex}`)}
                                  />
                                </Space>
                              </div>
                              <div style={{ 
                                whiteSpace: 'pre-wrap', 
                                fontSize: '13px', 
                                color: '#262626', 
                                background: '#ffffff', 
                                padding: '10px 12px', 
                                borderRadius: '4px',
                                border: '1px solid #f0f0f0',
                                lineHeight: '1.6'
                              }}>
                                {chunk.content}
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}
      </Modal>

      {/* MODAL TRA CỨU NGỮ NGHĨA RAG CHUNKS */}
      <Modal
        title={
          <div style={{ paddingBottom: '8px', borderBottom: '2px solid #722ed1', display: 'flex', alignItems: 'center' }}>
            <SearchOutlined style={{ color: '#722ed1', fontSize: '20px', marginRight: '8px' }} />
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#22075e' }}>
              Tra cứu Ngữ nghĩa & Trích dẫn Điều khoản (Semantic RAG Search)
            </span>
          </div>
        }
        open={isRagModalOpen}
        onCancel={() => setIsRagModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsRagModalOpen(false)}>{t('common.btnClose', 'Đóng')}</Button>
        ]}
        width={900}
      >
        <div style={{ marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '13px', display: 'block', marginBottom: 12 }}>
            Tìm kiếm chính xác từng Điều, Khoản, Tiêu chuẩn trong toàn bộ kho tri thức quy chế ngân hàng phục vụ kiểm toán:
          </Text>

          <Input.Search
            placeholder="Nhập câu hỏi hoặc từ khóa nghiệp vụ (ví dụ: điều kiện cấp tín dụng, bảo đảm tiền vay, hạn mức...)"
            enterButton="Tra cứu RAG"
            size="large"
            value={ragQuery}
            onChange={(e) => setRagQuery(e.target.value)}
            onSearch={() => handleRagSearch()}
            loading={ragSearching}
            style={{ marginBottom: 12 }}
          />

          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: '12px', marginRight: 8 }}>Gợi ý nhanh:</Text>
            <Space wrap size={[6, 6]}>
              {[
                'điều kiện cấp tín dụng',
                'biện pháp bảo đảm tiền vay',
                'hạn mức cho vay',
                'thời hạn lưu trữ hồ sơ',
                'trách nhiệm kiểm soát viên'
              ].map((term) => (
                <Tag
                  key={term}
                  color="purple"
                  style={{ cursor: 'pointer', padding: '2px 8px' }}
                  onClick={() => {
                    setRagQuery(term);
                    handleRagSearch(term);
                  }}
                >
                  {term}
                </Tag>
              ))}
            </Space>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {ragSearching ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin tip="Đang quét ngữ nghĩa qua các phân đoạn tri thức..." />
            </div>
          ) : ragResults.length > 0 ? (
            <div>
              <div style={{ marginBottom: 10, fontWeight: 500, color: '#531dab' }}>
                Tìm thấy {ragResults.length} trích dẫn điều khoản phù hợp:
              </div>
              <div style={{ maxHeight: '420px', overflowY: 'auto' }} className="space-y-3">
                {ragResults.map((result, idx) => (
                  <Card 
                    key={idx} 
                    size="small" 
                    bordered 
                    style={{ 
                      borderRadius: '8px', 
                      borderColor: '#d3adf7',
                      background: '#fcfaff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <Tag color="magenta">{result.documentCode}</Tag>
                        <Text strong style={{ color: '#22075e', fontSize: '14px' }}>
                          {result.documentTitle}
                        </Text>
                        <div style={{ marginTop: 4 }}>
                          <Tag color="blue">{result.documentType}</Tag>
                          <Tag color="cyan">{result.businessProcess}</Tag>
                          {result.heading && (
                            <Tag color="purple" style={{ fontWeight: 600 }}>
                              📍 {result.heading}
                            </Tag>
                          )}
                        </div>
                      </div>
                      <Space>
                        {result.pageNumber && <Tag color="default">Trang {result.pageNumber}</Tag>}
                        <Button
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => copyText(result.content, result.heading || 'đoạn trích dẫn')}
                        >
                          Sao chép
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => {
                            const found = data.find(d => d.id === result.regulatoryKnowledgeId);
                            if (found) {
                              setIsRagModalOpen(false);
                              handleOpenViewModal(found);
                            }
                          }}
                        >
                          Xem văn bản gốc
                        </Button>
                      </Space>
                    </div>

                    <div style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontSize: '13px', 
                      color: '#262626', 
                      background: '#ffffff', 
                      padding: '10px 14px', 
                      borderRadius: '6px',
                      border: '1px solid #f0f0f0',
                      lineHeight: '1.6'
                    }}>
                      {result.content}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#8c8c8c' }}>
              <BookOutlined style={{ fontSize: '36px', color: '#d3adf7', marginBottom: '8px' }} />
              <div>Nhập câu hỏi hoặc chọn từ khóa gợi ý bên trên để tra cứu chính xác từng Điều/Khoản trong quy chế.</div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        title={editingRecord ? 'Cập nhật Văn bản' : 'Thêm Văn bản mới'}
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        width={800}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="type" label="Loại văn bản" rules={[{ required: true }]}>
                <Select placeholder="Chọn loại">
                  <Option value="Luật">Luật</Option>
                  <Option value="Nghị định">Nghị định</Option>
                  <Option value="Thông tư">Thông tư</Option>
                  <Option value="Quy định nội bộ">Quy định nội bộ</Option>
                  <Option value="Quy trình nghiệp vụ">Quy trình nghiệp vụ</Option>
                  <Option value="Tiêu chuẩn ngành">Tiêu chuẩn ngành</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="code" label="Số hiệu văn bản" rules={[{ required: true }]}>
                <Input placeholder="Vd: 39/2016/TT-NHNN" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="status" label="Trạng thái" rules={[{ required: true }]}>
                <Select placeholder="Chọn trạng thái">
                  <Option value="Còn hiệu lực">Còn hiệu lực</Option>
                  <Option value="Hết hiệu lực">Hết hiệu lực</Option>
                  <Option value="Sắp sửa đổi">Sắp sửa đổi</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="title" label="Tên văn bản / Quy trình" rules={[{ required: true }]}>
            <Input placeholder="Vd: Quy định về hoạt động cho vay của TCTD" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="businessProcess" label="Nghiệp vụ áp dụng" rules={[{ required: true }]}>
                <Select placeholder="Chọn nghiệp vụ">
                  <Option value="Tín dụng">Tín dụng</Option>
                  <Option value="Huy động">Huy động</Option>
                  <Option value="Kế toán">Kế toán</Option>
                  <Option value="CNTT">CNTT</Option>
                  <Option value="Nhân sự">Nhân sự</Option>
                  <Option value="Thanh toán">Thanh toán</Option>
                  <Option value="Toàn hệ thống">Toàn hệ thống</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="effectiveDate" label="Ngày hiệu lực">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="relatedRisks" label="Rủi ro liên quan (Từ khóa để AI quét - Phân tách bằng dấu phẩy)">
            <Input placeholder="Vd: hồ sơ vay, giải ngân, hạn mức, bảo lãnh, tài sản đảm bảo" />
          </Form.Item>

          <Form.Item name="summary" label="Tóm tắt nội dung chính (Cho AI học)">
            <Input.TextArea rows={3} placeholder="Trích dẫn các điều khoản quan trọng..." />
          </Form.Item>

          <Form.Item name="fullContent" label="Nội dung văn bản chi tiết (Định dạng Markdown thô)">
            <Input.TextArea rows={10} placeholder="# Tiêu đề&#10;&#10;## 1. Điều khoản 1&#10;- Ý 1&#10;- Ý 2" />
          </Form.Item>

          <Form.Item name="downloadLink" label="Link tài liệu (PDF/Doc)">
            <Input placeholder="http://sharepoint.bank.vn/docs/vban_39.pdf" />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL QUÉT THƯ MỤC AI */}
      <Modal
        title={
          <div style={{ paddingBottom: '8px', borderBottom: '2px solid #ea9105', display: 'flex', alignItems: 'center' }}>
            <FileSearchOutlined style={{ color: '#ea9105', fontSize: '20px', marginRight: '8px' }} />
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Số hóa thông tin bằng AI qua quét Thư mục</span>
          </div>
        }
        open={isScanModalOpen}
        onCancel={() => {
          if (!scanLoading) {
            setIsScanModalOpen(false);
            setScanResult(null);
          }
        }}
        footer={scanLoading ? null : [
          <Button key="close" onClick={() => { setIsScanModalOpen(false); setScanResult(null); setFileList([]); }}>{t('common.btnClose', 'Đóng')}</Button>,
          <Button key="scan" type="primary" style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }} onClick={handleUploadAndScan} disabled={fileList.length === 0}>{t('common.btnStartAiDigitize', 'Bắt đầu Số hóa bằng AI')}</Button>
        ]}
        width={750}
      >
        <div style={{ marginTop: '16px' }}>
          <p style={{ color: '#555', fontSize: '14px', lineHeight: '1.5' }}>
            Tính năng này cho phép tải lên trực tiếp nhiều tệp văn bản từ máy tính cá nhân (PDF, DOCX, TXT, MD), sau đó hệ thống sử dụng <strong>AI (Marker-Surya OCR + Semantic Chunker)</strong> để:
          </p>
          <ul style={{ paddingLeft: '20px', color: '#555', marginBottom: '16px' }}>
            <li>Tự động trích xuất nội dung văn bản (không cần chuyển bằng FTP lên máy chủ).</li>
            <li>Tự động nhận diện Tên văn bản, Số hiệu, Phân loại văn bản.</li>
            <li>Tự động phân đoạn theo từng Điều, Khoản, Mục quy định.</li>
            <li>Tự động tóm tắt nội dung chính và tự động tạo các <strong>AI Tags (từ khóa rủi ro liên quan)</strong> để phục vụ các tính năng AI khác của hệ thống.</li>
          </ul>

          <div style={{ background: '#f9f9f9', padding: '16px', borderRadius: '8px', border: '1px solid #e8e8e8', marginBottom: '24px' }}>
            <div style={{ fontWeight: 600, marginBottom: '8px', color: '#0f172a' }}>Chọn các tệp văn bản cần tải lên và quét:</div>
            <Upload.Dragger
              accept=".pdf,.docx,.txt,.md"
              multiple={true}
              beforeUpload={(file) => {
                setFileList((prev) => [...prev, file]);
                return false; // Prevent auto upload
              }}
              onRemove={(file) => {
                setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
              }}
              fileList={fileList}
              disabled={scanLoading}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined style={{ color: '#ea9105' }} />
              </p>
              <p className="ant-upload-text">Nhấp hoặc kéo thả các tệp vào đây để tải lên</p>
              <p className="ant-upload-hint">
                Hỗ trợ tải lên nhiều tệp cùng lúc. Chấp nhận các định dạng: .pdf, .docx, .txt, .md
              </p>
            </Upload.Dragger>
          </div>

          {scanLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ marginBottom: '16px' }}>
                <Progress type="circle" percent={jobProgress || 0} strokeColor="#ea9105" />
              </div>
              <h3 style={{ color: '#ea9105', margin: '0' }}>{jobStatus || 'Đang xử lý...'}</h3>
              <div style={{ color: '#8c8c8c', marginTop: '8px' }}>
                Hệ thống đang sử dụng AI để đọc và trích xuất dữ liệu.<br />
                Vui lòng không đóng cửa sổ này.
              </div>
            </div>
          )}

          {scanResult && (
            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
              <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col span={8}>
                  <Card size="small" style={{ textAlign: 'center', background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                    <div style={{ color: '#52c41a', fontSize: '24px', fontWeight: 'bold' }}>{scanResult.successCount}</div>
                    <div style={{ color: '#8c8c8c' }}>Thành công</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ textAlign: 'center', background: '#fff1f0', border: '1px solid #ffa39e' }}>
                    <div style={{ color: '#f5222d', fontSize: '24px', fontWeight: 'bold' }}>{scanResult.failedCount}</div>
                    <div style={{ color: '#8c8c8c' }}>Thất bại</div>
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" style={{ textAlign: 'center', background: '#fef7e6', border: '1px solid #f1e5d8' }}>
                    <div style={{ color: '#ea9105', fontSize: '24px', fontWeight: 'bold' }}>{scanResult.total}</div>
                    <div style={{ color: '#8c8c8c' }}>Tổng số tệp tìm thấy</div>
                  </Card>
                </Col>
              </Row>

              <h4 style={{ fontWeight: 600, color: '#0f172a', marginBottom: '12px' }}>Chi tiết kết quả quét:</h4>
              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: '6px' }}>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={scanResult.details || []}
                  rowKey="fileName"
                  columns={[
                    {
                      title: 'Tên file',
                      dataIndex: 'fileName',
                      key: 'fileName',
                      render: (text: string) => <Text code>{text}</Text>
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (status: string, rec: any) => (
                        status === 'success' ? 
                          <Tag color="green">Thành công</Tag> : 
                          <Tooltip title={rec.error}><Tag color="red">Thất bại</Tag></Tooltip>
                      )
                    },
                    {
                      title: 'Thông tin AI trích xuất',
                      key: 'info',
                      render: (_: any, rec: any) => {
                        if (rec.status !== 'success') return <Text type="danger">{rec.error || 'Lỗi không xác định'}</Text>;
                        return (
                          <div>
                            <div><strong>{rec.code}</strong> - {rec.title}</div>
                            <Space size={4} style={{ marginTop: '4px' }}>
                              <Tag color="purple">{rec.type}</Tag>
                              <Tag color="cyan">{rec.businessProcess}</Tag>
                            </Space>
                            <div style={{ marginTop: '4px' }}>
                              {rec.relatedRisks?.map((r: string) => (
                                <Tag key={r} color="orange" style={{ fontSize: '10px' }}>{r}</Tag>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    }
                  ]}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default RegulatoryKnowledgeBase;
