import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  Tag,
  Tooltip,
  DatePicker,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm,
} from 'antd';
import type { TableColumnsType } from 'antd';
import {
  DownloadOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FileUnknownOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  FileTextOutlined,
  DatabaseOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

interface EvidenceItem {
  id: number;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  linkedResource: string;
  linkedResourceId: string | number;
  description?: string;
  uploadedBy?: number;
  uploadedByName?: string;
  uploadedAt: string;
}

const Evidences: React.FC = () => {
  const { t } = useTranslation();

  const [data, setData] = useState<EvidenceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterResource, setFilterResource] = useState<string>('');
  const [filterFileType, setFilterFileType] = useState<string>('');
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [searchText, setSearchText] = useState('');

  const fetchEvidences = async () => {
    setLoading(true);
    try {
      const res = await api.get('/evidences');
      setData(res.data || []);
    } catch (error) {
      message.error(t('evidences.messages.loadError', 'Lỗi khi tải dữ liệu bằng chứng'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidences();
  }, []);

  const handleDownload = async (id: number, originalName: string) => {
    try {
      const response = await api.get(`/evidences/${id}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data as any]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', originalName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      message.error(t('auditEngagements.errorWhenDownloadingFile', 'Lỗi khi tải file'));
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/evidences/${id}`);
      message.success(t('evidences.messages.deleteSuccess', 'Đã xóa bằng chứng thành công'));
      fetchEvidences();
    } catch (error) {
      message.error(t('evidences.messages.deleteError', 'Lỗi khi xóa bằng chứng'));
    }
  };

  const getFileTypeCategory = (mimeType: string, filename: string): string => {
    const mime = (mimeType || '').toLowerCase();
    const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
    if (mime.includes('pdf') || ext === 'pdf') return 'pdf';
    if (mime.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    if (mime.includes('word') || ['doc', 'docx'].includes(ext)) return 'word';
    if (mime.includes('excel') || mime.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    return 'other';
  };

  const getFileIcon = (mimeType: string, filename: string = '') => {
    const type = getFileTypeCategory(mimeType, filename);
    if (type === 'pdf') return <FilePdfOutlined className="text-red-500 text-lg" />;
    if (type === 'image') return <FileImageOutlined className="text-blue-500 text-lg" />;
    if (type === 'word') return <FileWordOutlined className="text-blue-700 text-lg" />;
    if (type === 'excel') return <FileExcelOutlined className="text-green-600 text-lg" />;
    return <FileUnknownOutlined className="text-gray-500 text-lg" />;
  };

  const handleResetFilters = () => {
    setSearchText('');
    setFilterResource('');
    setFilterFileType('');
    setFilterDateRange(null);
  };

  // Extract unique filter options
  const uniqueModules = useMemo(() => {
    const modules = Array.from(new Set(data.map((item) => item.linkedResource).filter(Boolean)));
    return modules.map((m) => ({ text: m, value: m }));
  }, [data]);

  const uniqueUploaders = useMemo(() => {
    const uploaders = Array.from(new Set(data.map((item) => item.uploadedByName).filter(Boolean)));
    return uploaders.map((u) => ({ text: u as string, value: u as string }));
  }, [data]);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const q = searchText.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.originalName && item.originalName.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.uploadedByName && item.uploadedByName.toLowerCase().includes(q)) ||
        (item.linkedResource && item.linkedResource.toLowerCase().includes(q)) ||
        String(item.linkedResourceId || '').toLowerCase().includes(q);

      const matchesResource = !filterResource || item.linkedResource === filterResource;

      const matchesFileType = !filterFileType || getFileTypeCategory(item.mimeType, item.originalName) === filterFileType;

      let matchesDate = true;
      if (filterDateRange && filterDateRange[0] && filterDateRange[1]) {
        const itemDate = dayjs(item.uploadedAt);
        matchesDate =
          (itemDate.isAfter(filterDateRange[0].startOf('day')) || itemDate.isSame(filterDateRange[0].startOf('day'))) &&
          (itemDate.isBefore(filterDateRange[1].endOf('day')) || itemDate.isSame(filterDateRange[1].endOf('day')));
      }

      return matchesSearch && matchesResource && matchesFileType && matchesDate;
    });
  }, [data, searchText, filterResource, filterFileType, filterDateRange]);

  // Statistics
  const totalSizeBytes = useMemo(() => {
    return filteredData.reduce((acc, item) => acc + (Number(item.size) || 0), 0);
  }, [filteredData]);

  const columns: TableColumnsType<EvidenceItem> = [
    {
      title: t('auditEngagements.fileName', 'Tên file'),
      dataIndex: 'originalName',
      key: 'originalName',
      sorter: (a, b) => (a.originalName || '').localeCompare(b.originalName || ''),
      render: (text: string, record: EvidenceItem) => (
        <Space align="center">
          {getFileIcon(record.mimeType, record.originalName)}
          <div>
            <Text strong className="hover:text-blue-600 transition-colors">
              {text}
            </Text>
            {record.description && (
              <div className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-xs">{record.description}</div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: t('auditEngagements.size', 'Kích thước'),
      dataIndex: 'size',
      key: 'size',
      width: 120,
      sorter: (a, b) => (a.size || 0) - (b.size || 0),
      render: (size: number) => {
        const sizeNum = Number(size) || 0;
        if (sizeNum < 1024 * 1024) {
          return <Tag color="default">{(sizeNum / 1024).toFixed(1)} KB</Tag>;
        }
        return <Tag color="blue">{(sizeNum / 1024 / 1024).toFixed(2)} MB</Tag>;
      },
    },
    {
      title: t('evidences.cols.module', 'Module liên kết'),
      dataIndex: 'linkedResource',
      key: 'linkedResource',
      width: 180,
      filters: uniqueModules,
      filterSearch: true,
      onFilter: (value, record) => record.linkedResource === value,
      render: (res: string, record: EvidenceItem) => (
        <Space orientation="vertical" size={2}>
          <Tag color="geekblue" className="font-medium">
            {res || 'N/A'}
          </Tag>
          {record.linkedResourceId && (
            <Text type="secondary" className="text-xs">
              ID: {record.linkedResourceId}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: t('auditEngagements.describe', 'Mô tả'),
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (desc: string) => desc || <Text type="secondary">-</Text>,
    },
    {
      title: t('documentManager.cols.uploader', 'Người tải lên'),
      dataIndex: 'uploadedByName',
      key: 'uploadedByName',
      width: 170,
      filters: uniqueUploaders,
      filterSearch: true,
      onFilter: (value, record) => record.uploadedByName === value,
      sorter: (a, b) => (a.uploadedByName || '').localeCompare(b.uploadedByName || ''),
      render: (name: string) => name || <Text type="secondary">System</Text>,
    },
    {
      title: t('workingPapers.time', 'Thời gian tải lên'),
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 160,
      defaultSortOrder: 'descend',
      sorter: (a, b) => dayjs(a.uploadedAt).unix() - dayjs(b.uploadedAt).unix(),
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <Text className="text-xs text-gray-600">{dayjs(date).format('DD/MM/YYYY HH:mm')}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('auditTemplates.cols.action', 'Thao tác'),
      key: 'action',
      width: 100,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: EvidenceItem) => (
        <Space size="small">
          <Tooltip title={t('auditEngagements.download', 'Tải xuống')}>
            <Button
              type="text"
              size="small"
              icon={<DownloadOutlined />}
              className="text-blue-600 hover:bg-blue-50"
              onClick={() => handleDownload(record.id, record.originalName)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa bằng chứng"
            description="Bạn có chắc chắn muốn xóa file đính kèm này?"
            okText={t('common.btnDelete', 'Xóa')}
            cancelText={t('common.btnCancel', 'Hủy')}
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title={t('auditTemplates.btnDelete', 'Xóa')}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} className="hover:bg-red-50" />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <Title level={3} className="!mb-1 flex items-center gap-2">
            <PaperClipOutlined className="text-blue-600" /> {t('evidences.title', 'Quản lý Kho Bằng chứng (Evidences)')}
          </Title>
          <Text type="secondary">{t('evidences.subtitle', 'Quản lý tập trung toàn bộ file đính kèm trên hệ thống')}</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchEvidences} loading={loading}>
          Làm mới
        </Button>
      </div>

      {/* Stats Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Tổng số File Bằng chứng"
              value={data.length}
              prefix={<FileTextOutlined className="text-blue-500 mr-1" />}
              suffix={<span className="text-sm font-normal text-gray-400">tệp</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Tổng Dung lượng Lưu trữ"
              value={(totalSizeBytes / 1024 / 1024).toFixed(2)}
              prefix={<DatabaseOutlined className="text-purple-500 mr-1" />}
              suffix={<span className="text-sm font-normal text-gray-400">MB</span>}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="shadow-sm">
            <Statistic
              title="Số File Đang Hiển thị (Lọc)"
              value={filteredData.length}
              valueStyle={{ color: filteredData.length === data.length ? '#ea9105' : '#52c41a' }}
              prefix={<FilterOutlined className="text-emerald-500 mr-1" />}
              suffix={<span className="text-sm font-normal text-gray-400">/ {data.length}</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Search & Filter Toolbar */}
      <Card variant="borderless" className="shadow-sm">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8} lg={6}>
            <div className="text-xs text-gray-500 mb-1 font-medium">{t('evidences.search', 'Tìm kiếm:')}</div>
            <Input
              placeholder={t('evidences.searchPlaceholder', 'Nhập tên file, mô tả, ID, người tải...')}
              prefix={<SearchOutlined className="text-gray-400" />}
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col xs={24} sm={12} md={5} lg={4}>
            <div className="text-xs text-gray-500 mb-1 font-medium">{t('evidences.filterModule', 'Module liên kết:')}</div>
            <Select
              allowClear
              placeholder={t('evidences.allModules', 'Tất cả Modules')}
              className="w-full"
              value={filterResource || undefined}
              onChange={(val) => setFilterResource(val || '')}
            >
              <Option value="working-papers">{t('menu.workPapers', 'Giấy tờ làm việc')}</Option>
              <Option value="audit-findings">{t('evidences.modules.findings', 'Phát hiện kiểm toán')}</Option>
              <Option value="recommendations">{t('auditeePortal.table.recommendation', 'Kiến nghị')}</Option>
              <Option value="audit-engagements">Đoàn kiểm toán</Option>
              <Option value="quality-reviews">Kiểm soát chất lượng</Option>
              <Option value="regulatory-exams">Thanh tra / Kiểm tra</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={5} lg={4}>
            <div className="text-xs text-gray-500 mb-1 font-medium">Định dạng file:</div>
            <Select
              allowClear
              placeholder="Tất cả định dạng"
              className="w-full"
              value={filterFileType || undefined}
              onChange={(val) => setFilterFileType(val || '')}
            >
              <Option value="pdf">Tài liệu PDF (.pdf)</Option>
              <Option value="word">Văn bản Word (.doc, .docx)</Option>
              <Option value="excel">Bảng tính Excel (.xls, .xlsx)</Option>
              <Option value="image">Hình ảnh (.png, .jpg, .svg)</Option>
              <Option value="other">Định dạng khác</Option>
            </Select>
          </Col>
          <Col xs={24} md={6} lg={6}>
            <div className="text-xs text-gray-500 mb-1 font-medium">Thời gian tải lên:</div>
            <RangePicker
              className="w-full"
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              value={filterDateRange}
              onChange={(dates) => setFilterDateRange(dates as any)}
            />
          </Col>
          <Col xs={24} md={4} lg={4} className="flex items-end">
            <Button
              onClick={handleResetFilters}
              disabled={!searchText && !filterResource && !filterFileType && !filterDateRange}
              className="mt-5"
            >
              Xóa bộ lọc
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Table */}
      <Card variant="borderless" className="shadow-sm">
        <Table<EvidenceItem>
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} file bằng chứng`,
          }}
          scroll={{ x: 1000 }}
        />
      </Card>
    </div>
  );
};

export default Evidences;
