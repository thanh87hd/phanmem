import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Typography, Card, Upload, Button, Space, Input, message, 
  Divider, Skeleton, Tag, Tooltip, Modal, Row, Col, Select
} from 'antd';
import { 
  FileSearchOutlined, InboxOutlined, CopyOutlined, 
  DatabaseOutlined, FileTextOutlined, FileMarkdownOutlined,
  CheckCircleOutlined, ThunderboltOutlined,
  AppstoreAddOutlined
} from '@ant-design/icons';
import api from '../services/api';
import axios from 'axios';

const { Title, Text } = Typography;
const { Dragger } = Upload;
const { Option } = Select;

interface OcrMetadata {
  pageCount?: number;
  extractionMethod?: string;
  confidence?: number;
  category?: string;
}

const KnowledgeExtraction: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileList, setFileList] = useState<any[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [ocrMeta, setOcrMeta] = useState<OcrMetadata | null>(null);

  const [metadata, setMetadata] = useState({
    title: '',
    code: '',
    type: 'Quy định nội bộ',
    businessProcess: 'Chung',
    summary: '',
  });

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError } = options;
    const formData = new FormData();
    formData.append('file', file as Blob, file.name);

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/extraction/upload', formData, {
        timeout: 120000,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const res = response.data;
      setContent(res.content || '');
      setFileName(res.fileName || file.name);
      setOcrMeta({
        pageCount: res.pageCount,
        extractionMethod: res.extractionMethod,
        confidence: res.confidence,
        category: res.category,
      });

      setMetadata({
        title: (res.fileName || file.name).replace(/\.[^/.]+$/, ''),
        code: (res.fileName || file.name).replace(/\.[^/.]+$/, '').toUpperCase(),
        type: res.category || 'Quy định nội bộ',
        businessProcess: 'Chung',
        summary: (res.content || '').length > 300 ? (res.content || '').substring(0, 300) + '...' : (res.content || ''),
      });

      message.success('Trích xuất văn bản thành công!');
      onSuccess('ok');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Lỗi khi trích xuất tệp';
      message.error(msg);
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = () => {
    setContent('# TÊN VĂN BẢN QUY PHẠM / NỘI BỘ\n\n## Chương I: QUY ĐỊNH CHUNG\n\n### Điều 1. Phạm vi điều chỉnh\nQuy định về việc kiểm soát nội bộ và quản trị rủi ro...\n\n### Điều 2. Đối tượng áp dụng\nToàn thể cán bộ nhân viên và các đơn vị trực thuộc LPBank.');
    setFileName('van_ban_markdown.md');
    setOcrMeta({
      pageCount: 1,
      extractionMethod: 'passthrough',
      confidence: 1.0,
      category: 'Quy định nội bộ',
    });
    setMetadata({
      title: 'Văn bản số hóa Markdown',
      code: 'VB-MD-' + Date.now().toString().slice(-4),
      type: 'Quy định nội bộ',
      businessProcess: 'Chung',
      summary: 'Văn bản được biên soạn và số hóa trực tiếp dưới định dạng Markdown.',
    });
  };

  const handleSaveToKB = async () => {
    if (!metadata.title?.trim()) {
      message.warning('Vui lòng nhập Tên văn bản trước khi lưu');
      return;
    }
    if (!metadata.code?.trim()) {
      message.warning('Vui lòng nhập Số hiệu văn bản trước khi lưu');
      return;
    }
    if (!content?.trim()) {
      message.warning('Nội dung Markdown không được để trống');
      return;
    }

    try {
      await api.post('/ai/regulatory', {
        ...metadata,
        title: metadata.title.trim(),
        code: metadata.code.trim(),
        fullContent: content,
        pageCount: ocrMeta?.pageCount || 1,
        extractionMethod: ocrMeta?.extractionMethod || 'manual',
        ocrConfidence: ocrMeta?.confidence || 1.0,
      });
      message.success('Đã lưu tài liệu và tự động phân đoạn (chunking) vào Kho tri thức thành công!');
      setSaveModalOpen(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Lỗi khi lưu vào Kho tri thức';
      message.error(`Lưu vào Kho tri thức thất bại: ${msg}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    message.success('Đã sao chép vào bộ nhớ tạm');
  };

  const handleClear = () => {
    setContent('');
    setFileName('');
    setOcrMeta(null);
    setFileList([]);
  };

  const renderMethodBadge = (method?: string) => {
    switch (method) {
      case 'marker-surya':
        return <Tag color="purple">🤖 Marker-Surya OCR</Tag>;
      case 'pdf-inspector':
        return <Tag color="green"><ThunderboltOutlined /> Fast-path (pdf-inspector)</Tag>;
      case 'python-docx':
        return <Tag color="blue"><FileTextOutlined /> python-docx Native</Tag>;
      case 'passthrough':
        return <Tag color="cyan">📝 Passthrough</Tag>;
      default:
        return method ? <Tag color="default">{method}</Tag> : null;
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3}>
          <FileSearchOutlined style={{ marginRight: 8, color: '#ea9105' }} />
          Trích xuất Tri thức từ Tài liệu (Marker-Surya OCR & Fast-Path)
        </Title>
        <Text type="secondary">
          Tải lên tệp PDF (scan hoặc text), Word (.docx), Markdown (.md) hoặc ảnh để tự động số hóa thành văn bản Markdown chuẩn cấu trúc phục vụ AI trích dẫn và phân tích.
        </Text>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: content ? '1fr 1.3fr' : '1fr', gap: 24, transition: 'all 0.3s' }}>
        <Card title="Tải lên tài liệu" variant="borderless" className="shadow-sm">
          <Dragger
            accept=".pdf,.docx,.doc,.md,.txt,.jpg,.jpeg,.png"
            multiple={false}
            customRequest={handleUpload}
            fileList={fileList}
            onChange={({ fileList }) => setFileList(fileList)}
            showUploadList={true}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#ea9105' }} />
            </p>
            <p className="ant-upload-text">Nhấp hoặc kéo tệp vào đây để tải lên / số hóa</p>
            <p className="ant-upload-hint">
              Hỗ trợ PDF (scan & text), DOCX, MD, TXT. Nhận diện tự động bảng biểu, tiêu đề (Heading), và Điều/Khoản luật.
            </p>
          </Dragger>

          {!content && (
            <div style={{ marginTop: 16 }}>
              <Divider plain style={{ margin: '8px 0', fontSize: 12, color: '#8c8c8c' }}>hoặc</Divider>
              <Button icon={<FileMarkdownOutlined style={{ color: '#52c41a' }} />} onClick={handleManualInput} block>
                Nhập hoặc Dán trực tiếp nội dung Markdown
              </Button>
            </div>
          )}

          {content && (
            <div style={{ marginTop: 24 }}>
              <Button danger onClick={handleClear} block>{t('common.btnClearAndRetry', 'Xóa kết quả và làm lại')}</Button>
            </div>
          )}
        </Card>

        {content && (
          <Card 
            title={
              <Space>
                <FileMarkdownOutlined style={{ color: '#52c41a' }} />
                <span>Kết quả trích xuất: {fileName}</span>
              </Space>
            }
            extra={
              <Space>
                <Tooltip title="Sao chép nội dung">
                  <Button icon={<CopyOutlined />} onClick={handleCopy}>{t('common.btnCopy', 'Sao chép')}</Button>
                </Tooltip>
                <Button 
                  type="primary" 
                  icon={<DatabaseOutlined />}
                  onClick={() => setSaveModalOpen(true)}
                >
                  Lưu vào Kho tri thức
                </Button>
              </Space>
            }
            variant="borderless"
            className="shadow-sm"
          >
            {/* Metadata Tags Bar */}
            <div style={{ marginBottom: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {renderMethodBadge(ocrMeta?.extractionMethod)}
              {ocrMeta?.pageCount && (
                <Tag color="geekblue">📖 {ocrMeta.pageCount} trang</Tag>
              )}
              {ocrMeta?.confidence !== undefined && (
                <Tag color={ocrMeta.confidence >= 0.9 ? 'success' : 'warning'}>
                  🎯 Độ tin cậy OCR: {Math.round(ocrMeta.confidence * 100)}%
                </Tag>
              )}
              {ocrMeta?.category && (
                <Tag color="orange">🏷️ {ocrMeta.category}</Tag>
              )}
              <Tag color="cyan">{content.length.toLocaleString()} ký tự</Tag>
            </div>

            {loading ? (
              <Skeleton active paragraph={{ rows: 12 }} />
            ) : (
              <div style={{ maxHeight: 520, overflowY: 'auto', background: '#f9f9f9', padding: 16, borderRadius: 8, border: '1px solid #e8e8e8' }}>
                <Input.TextArea 
                  value={content} 
                  onChange={e => setContent(e.target.value)}
                  autoSize={{ minRows: 15, maxRows: 26 }}
                  style={{ border: 'none', background: 'transparent', fontFamily: 'Consolas, monospace', fontSize: 13 }}
                />
              </div>
            )}
            
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <Tag color="blue"><FileTextOutlined /> Markdown</Tag>
                <Tag color="green"><CheckCircleOutlined /> Sẵn sàng cho AI RAG</Tag>
              </Space>
              <Text type="secondary" italic style={{ fontSize: 12 }}>
                Bạn có thể chỉnh sửa trực tiếp nội dung Markdown trước khi bấm lưu.
              </Text>
            </div>
          </Card>
        )}
      </div>

      <Modal
        title={
          <Space>
            <AppstoreAddOutlined style={{ color: '#ea9105' }} />
            <span>Lưu vào Thư viện Văn bản & Số hóa Tri thức</span>
          </Space>
        }
        open={saveModalOpen}
        onOk={handleSaveToKB}
        onCancel={() => setSaveModalOpen(false)}
        okText={t('common.btnSaveNow', 'Lưu ngay')}
        cancelText={t('common.btnCancel', 'Hủy')}
        width={650}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text strong>Tên văn bản:</Text>
            <Input 
              value={metadata.title} 
              onChange={e => setMetadata({...metadata, title: e.target.value})} 
            />
          </div>
          <div>
            <Text strong>Số hiệu văn bản:</Text>
            <Input 
              placeholder="Vd: 39/2016/TT-NHNN, QD-2026-99"
              value={metadata.code} 
              onChange={e => setMetadata({...metadata, code: e.target.value})} 
            />
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>Loại văn bản:</Text>
              <Select 
                style={{ width: '100%', marginTop: 4 }} 
                value={metadata.type}
                onChange={v => setMetadata({...metadata, type: v})}
              >
                <Option value="Luật">Luật</Option>
                <Option value="Nghị định">Nghị định</Option>
                <Option value="Thông tư">Thông tư</Option>
                <Option value="Quy định nội bộ">Quy định nội bộ</Option>
                <Option value="Quy trình nghiệp vụ">Quy trình nghiệp vụ</Option>
                <Option value="Tiêu chuẩn ngành">Tiêu chuẩn ngành</Option>
                <Option value="Văn bản Pháp luật / Quy định">Khác</Option>
              </Select>
            </Col>
            <Col span={12}>
              <Text strong>Mảng nghiệp vụ:</Text>
              <Select 
                style={{ width: '100%', marginTop: 4 }} 
                value={metadata.businessProcess}
                onChange={v => setMetadata({...metadata, businessProcess: v})}
              >
                <Option value="Chung">Chung</Option>
                <Option value="Tín dụng">Tín dụng</Option>
                <Option value="Kế toán">Kế toán & Tài chính</Option>
                <Option value="Thanh toán quốc tế">Thanh toán quốc tế</Option>
                <Option value="CNTT & An ninh mạng">CNTT & An ninh mạng</Option>
                <Option value="Nguồn vốn & Kinh doanh vốn">Nguồn vốn & KD vốn</Option>
                <Option value="Quản trị rủi ro">Quản trị rủi ro</Option>
              </Select>
            </Col>
          </Row>
          <div>
            <Text strong>Tóm tắt trích yếu:</Text>
            <Input.TextArea 
              rows={3} 
              value={metadata.summary}
              onChange={e => setMetadata({...metadata, summary: e.target.value})}
            />
          </div>
          {ocrMeta && (
            <div style={{ background: '#f0f5ff', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
              <Space wrap>
                <Text type="secondary">Thuộc tính OCR:</Text>
                {renderMethodBadge(ocrMeta.extractionMethod)}
                {ocrMeta.pageCount && <Tag color="geekblue">{ocrMeta.pageCount} trang</Tag>}
                {ocrMeta.confidence !== undefined && (
                  <Tag color="gold">Độ tin cậy: {Math.round(ocrMeta.confidence * 100)}%</Tag>
                )}
              </Space>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default KnowledgeExtraction;
