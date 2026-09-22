import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Card, Select, Space, Tag, Modal, message, Tooltip, Radio, Input } from 'antd';
import { LinkOutlined, EditOutlined, SafetyCertificateOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../services/api';
import SampleTestingDrawer from './SampleTestingDrawer';

const { Option } = Select;

interface DetailedSamplingGridProps {
  workingPaperId?: number;
  engagementId?: number;
}

const DetailedSamplingGrid: React.FC<DetailedSamplingGridProps> = ({ workingPaperId, engagementId }) => {
  const { t } = useTranslation();
  const [samples, setSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [masterBatches, setMasterBatches] = useState<any[]>([]);
  const [linkedBatches, setLinkedBatches] = useState<any[]>([]);
  const [isLinkModalVisible, setIsLinkModalVisible] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [workingPaper, setWorkingPaper] = useState<any>(null);
  const [activeDomainFilter, setActiveDomainFilter] = useState<string>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>('');

  // Drawer states
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [selectedSample, setSelectedSample] = useState<any>(null);

  useEffect(() => {
    if (workingPaperId) {
      fetchWorkingPaper();
      fetchSamples();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingPaperId]);

  async function fetchWorkingPaper() {
    try {
      const res = await api.get(`/working-papers/${workingPaperId}`);
      setWorkingPaper(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchSamples() {
    try {
      setLoading(true);
      const res = await api.get('/audit-samples/batches', { params: { workingPaperId } });
      setLinkedBatches(res.data || []);
      let allSamples: any[] = [];
      res.data.forEach((batch: any) => {
        if (batch.samples) {
          const batchSamples = batch.samples.map((s: any) => ({
            ...s,
            batchId: batch.id,
            batchDomain: batch.auditDomain || 'CREDIT',
            batchName: batch.batchName,
          }));
          allSamples = [...allSamples, ...batchSamples];
        }
      });
      setSamples(allSamples);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách mẫu chi tiết');
    } finally {
      setLoading(false);
    }
  }

  const handleOpenLinkModal = async () => {
    if (!engagementId) {
      message.error('Vui lòng chọn Cuộc kiểm toán cho Giấy tờ này trước.');
      return;
    }
    try {
      const res = await api.get('/audit-samples/batches', { params: { engagementId } });
      setMasterBatches(res.data);
      setIsLinkModalVisible(true);
    } catch (err) {
      message.error('Lỗi tải Master Batches');
    }
  };

  const handleLinkBatch = async () => {
    if (!selectedBatchId || !workingPaperId) return;
    try {
      await api.patch(`/audit-samples/samples/${selectedBatchId}`, { workingPaperId });
      message.success('Đã liên kết Tập mẫu vào Giấy tờ làm việc!');
      setIsLinkModalVisible(false);
      fetchSamples();
    } catch (err) {
      message.error('Lỗi khi liên kết Tập mẫu');
    }
  };

  const handleBatchAutoVerify = async (batchId: number) => {
    try {
      setLoading(true);
      const res = await api.post(`/audit-samples/batches/${batchId}/auto-verify`);
      message.success(`Đã tự động kiểm tra hồ sơ: ${res.data.passed} Đạt / ${res.data.failed} Lỗi`);
      fetchSamples();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi chạy quét kiểm tra tự động');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDrawer = (record: any) => {
    setSelectedSample(record);
    setIsDrawerVisible(true);
  };

  // Branch list for dropdown
  const branchOptions = Array.from(new Set(samples.map(s => s.branchCode || s.managingBranchCode).filter(Boolean)));

  const filteredSamples = samples.filter(s => {
    const matchDomain = activeDomainFilter === 'ALL' || s.batchDomain === activeDomainFilter || s.operationType === activeDomainFilter;
    const matchBranch = selectedBranchFilter === 'ALL' || s.branchCode === selectedBranchFilter || s.managingBranchCode === selectedBranchFilter;
    const matchSearch = !searchText || 
      (s.cifOrAccount && s.cifOrAccount.toLowerCase().includes(searchText.toLowerCase())) ||
      (s.customerName && s.customerName.toLowerCase().includes(searchText.toLowerCase())) ||
      (s.managingBranchName && s.managingBranchName.toLowerCase().includes(searchText.toLowerCase()));
    return matchDomain && matchBranch && matchSearch;
  });

  const columns: any[] = [
    {
      title: 'Mã Mẫu / Tham chiếu',
      dataIndex: 'cifOrAccount',
      key: 'cifOrAccount',
      width: 150,
      render: (text: string, r: any) => (
        <div>
          <strong className="text-slate-800">{text || r.sampleData?.referenceNo || `Mẫu #${r.sequenceNo || r.id}`}</strong>
          {r.batchDomain && (
            <div className="text-xs text-gray-400">
              {r.batchDomain === 'NON_CREDIT' ? 'Phi tín dụng' : r.batchDomain === 'CREDIT' ? 'Tín dụng' : r.batchDomain}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Khách hàng / Đối tượng',
      dataIndex: 'customerName',
      key: 'customerName',
      render: (text: string, r: any) => (
        <div>
          <div className="font-medium text-slate-800">{text || r.sampleData?.customerName || '-'}</div>
          {r.customerType && <Tag color="cyan" className="text-[10px]">{r.customerType}</Tag>}
        </div>
      )
    },
    {
      title: 'Đơn vị kinh doanh (Chi nhánh)',
      key: 'branch',
      render: (_: any, r: any) => (
        <div>
          <span className="text-xs font-semibold text-slate-700">{r.managingBranchName || r.branchCode || 'CN Hội sở'}</span>
          {r.region && <div className="text-[11px] text-gray-400">{r.region}</div>}
        </div>
      )
    },
    {
      title: 'Quy mô / Dư nợ (VND)',
      key: 'amount',
      render: (_: any, r: any) => {
        const val = r.sampleData?.outstandingBalance || r.sampleData?.transactionAmount || r.sampleData?.amount || r.amount;
        return (
          <div>
            <span className="font-semibold text-slate-800">{val ? Number(val).toLocaleString() : '-'}</span>
            {r.sampleData?.debtGroup && (
              <div className="text-xs text-amber-600">Nhóm {r.sampleData.debtGroup}</div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Đánh giá HTKSNB',
      dataIndex: 'testResult',
      key: 'testResult',
      width: 140,
      render: (text: string) => {
        let color = 'default';
        let label = text || 'NOT_TESTED';
        if (text === 'PASS') { color = 'success'; label = 'ĐẠT (PASS)'; }
        if (text === 'FAIL') { color = 'error'; label = 'LỖI (FAIL)'; }
        if (text === 'EXCEPTION') { color = 'warning'; label = 'NGOẠI LỆ'; }
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      render: (_: any, record: any) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<EditOutlined />} 
          onClick={() => handleOpenDrawer(record)}
          className="bg-emerald-600 hover:bg-emerald-500 border-none rounded"
        >
          Biên bản KT
        </Button>
      )
    }
  ];

  if (!workingPaperId) {
    return <div className="text-gray-400 p-4 border border-dashed border-gray-300 rounded-lg text-center">Vui lòng lưu Giấy tờ làm việc trước khi thực hiện chọn mẫu chi tiết.</div>;
  }

  return (
    <Card 
      title={
        <div className="flex items-center gap-2">
          <span>Danh sách Mẫu Kiểm tra Chi tiết</span>
          {linkedBatches.length > 0 && (
            <Tag color="cyan">{linkedBatches.length} Tập mẫu liên kết</Tag>
          )}
        </div>
      } 
      variant="outlined" 
      className="shadow-sm" 
      extra={
        <Space wrap>
          {linkedBatches.length > 0 && (
            <Tooltip title="Chạy quét đối chiếu tự động các điều kiện kiểm soát rủi ro cho toàn bộ mẫu">
              <Button 
                icon={<SafetyCertificateOutlined />} 
                onClick={() => handleBatchAutoVerify(linkedBatches[0].id)} 
                size="small"
                className="text-indigo-600 border-indigo-200"
              >
                Quét Hồ sơ Tự động
              </Button>
            </Tooltip>
          )}
          <Button icon={<LinkOutlined />} onClick={handleOpenLinkModal} size="small">
            Liên kết từ Đoàn
          </Button>
        </Space>
      }
    >
      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <Space wrap>
          <Radio.Group 
            value={activeDomainFilter} 
            onChange={(e) => setActiveDomainFilter(e.target.value)} 
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="ALL">Tất cả ({samples.length})</Radio.Button>
            <Radio.Button value="CREDIT">Tín dụng</Radio.Button>
            <Radio.Button value="NON_CREDIT">Phi tín dụng</Radio.Button>
          </Radio.Group>

          <Select 
            size="small" 
            value={selectedBranchFilter} 
            onChange={setSelectedBranchFilter} 
            className="w-48"
            placeholder="Lọc theo Đơn vị KD"
          >
            <Option value="ALL">Tất cả Chi nhánh</Option>
            {branchOptions.map(b => (
              <Option key={b} value={b}>{b}</Option>
            ))}
          </Select>
        </Space>

        <Input 
          size="small" 
          placeholder="Tìm theo CIF, Tên KH, Chi nhánh..." 
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="w-64"
        />
      </div>

      <Table 
        columns={columns} 
        dataSource={filteredSamples} 
        rowKey="id" 
        loading={loading}
        pagination={{ pageSize: 5 }}
        size="small"
      />

      <Modal
        title="Liên kết Tập mẫu từ Đoàn kiểm toán"
        open={isLinkModalVisible}
        onOk={handleLinkBatch}
        onCancel={() => setIsLinkModalVisible(false)}
        okText={t('common.btnLink', 'Liên kết')}
        cancelText={t('common.btnCancel', 'Hủy')}
      >
        <p className="text-sm text-gray-600 mb-3">Chọn tập mẫu tổng thể (Master Batch) đã được thiết lập:</p>
        <Select
          className="w-full"
          placeholder="Chọn Master Batch..."
          onChange={setSelectedBatchId}
          value={selectedBatchId}
        >
          {masterBatches.map(b => (
            <Option key={b.id} value={b.id}>
              [{b.auditDomain || 'CREDIT'}] {b.batchName} ({b.samples?.length || 0} mẫu) - {b.samplingMethod}
            </Option>
          ))}
        </Select>
      </Modal>

      <SampleTestingDrawer
        open={isDrawerVisible}
        onClose={() => setIsDrawerVisible(false)}
        sample={selectedSample}
        templateId={workingPaper?.templateId}
        onSaved={fetchSamples}
      />
    </Card>
  );
};

export default DetailedSamplingGrid;
