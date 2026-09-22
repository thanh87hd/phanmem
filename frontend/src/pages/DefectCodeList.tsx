import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Tabs, message, Button, Input, Tag, Typography, Modal, Form, Select, Upload } from 'antd';
import { SearchOutlined, PlusOutlined, UploadOutlined, DownloadOutlined, SyncOutlined, AuditOutlined } from '@ant-design/icons';
import api from '../services/api';
import { getColumnSearchProps, getColumnSelectFilterProps, getColumnSorter } from '../utils/tableFilterHelper';
import ProposeChangeModal from '../components/ProposeChangeModal';

const { Text } = Typography;

export const DefectCodeList: React.FC = () => {
  const { t } = useTranslation();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProposeModalVisible, setIsProposeModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  
  // Dynamic fields
  const dimension = Form.useWatch('dimension', form);
  const internalPrefix = Form.useWatch('internalPrefix', form);
  const l2Code = Form.useWatch('l2Code', form);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/defect-codes');
      setData(res.data);
    } catch {
      message.error('Lỗi khi tải danh mục mã lỗi');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCodes(); }, []);

  const handleUpload = async (info: any) => {
    if (info.file.status === 'uploading') {
      setSyncing(true);
      return;
    }
    if (info.file.status === 'done') {
      message.success(`Đã đồng bộ ${info.file.response?.added || 0} mã lỗi mới từ Excel`);
      fetchCodes();
      setSyncing(false);
    } else if (info.file.status === 'error') {
      message.error(`Lỗi khi tải lên file Excel: ${info.file.response?.message || 'Unknown error'}`);
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/ai/defect-codes/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Defect_Codes_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      message.error('Lỗi khi xuất dữ liệu Excel');
    }
  };

  const getColumns = (dim: string) => {
    const baseCols: any = [
      { 
        title: 'Version', 
        dataIndex: 'version', 
        key: 'version', 
        width: 100, 
        ...getColumnSelectFilterProps<any>('version', undefined, data),
        sorter: getColumnSorter<any>('version', 'string'),
        render: (v: string) => <Tag color="blue">{v || '1.0'}</Tag> 
      },
      { 
        title: 'Mã', 
        dataIndex: 'code', 
        key: 'code', 
        width: 140,
        ...getColumnSearchProps<any>('code', 'Mã'),
        sorter: getColumnSorter<any>('code', 'string'),
      },
      { 
        title: 'Mô tả chi tiết', 
        dataIndex: 'description', 
        key: 'description',
        ...getColumnSearchProps<any>('description', 'Mô tả chi tiết'),
        sorter: getColumnSorter<any>('description', 'string'),
      },
      { 
        title: 'Mã nhóm', 
        dataIndex: 'l2Code', 
        key: 'l2Code', 
        width: 140,
        ...getColumnSearchProps<any>('l2Code', 'Mã nhóm'),
        sorter: getColumnSorter<any>('l2Code', 'string'),
      },
    ];

    if (dim === 'ND340') {
      baseCols.push({ 
        title: 'Mức phạt TB', 
        dataIndex: 'avgFine', 
        key: 'avgFine',
        width: 150,
        sorter: (a: any, b: any) => (a.avgFine || 0) - (b.avgFine || 0),
        render: (val: number) => val ? `${val} Triệu đồng` : '-'
      });
      baseCols.push({ 
        title: 'Mức phạt Tối đa', 
        dataIndex: 'maxFine', 
        key: 'maxFine',
        width: 150,
        sorter: (a: any, b: any) => (a.maxFine || 0) - (b.maxFine || 0),
        render: (val: number) => val ? `${val} Triệu đồng` : '-'
      });
    }

    if (dim === 'INTERNAL') {
      baseCols.push({
        title: 'Quy định Nhân sự (Kỷ luật)',
        key: 'mappedNhanSu',
        width: 250,
        render: (_: any, record: any) => {
          const suggestions = record.mappedNhanSuSuggestions || [];
          if (suggestions.length === 0) return <Text type="secondary" className="text-xs italic">—</Text>;
          return (
            <div className="space-y-1">
              {suggestions.map((s: any, idx: number) => (
                <div key={idx} className="text-xs bg-amber-50/70 p-1.5 rounded border border-amber-200">
                  <Tag color="orange" className="!mr-1 font-mono text-[10px]">{s.code}</Tag>
                  <span className="text-slate-700 line-clamp-2">{s.desc}</span>
                </div>
              ))}
            </div>
          );
        },
      });

      baseCols.push({
        title: 'Nghị định 340 (Pháp lý)',
        key: 'mappedNd340',
        width: 250,
        render: (_: any, record: any) => {
          const suggestions = record.mappedNd340Suggestions || [];
          if (suggestions.length === 0) return <Text type="secondary" className="text-xs italic">—</Text>;
          return (
            <div className="space-y-1">
              {suggestions.map((s: any, idx: number) => (
                <div key={idx} className="text-xs bg-blue-50/70 p-1.5 rounded border border-blue-200">
                  <Tag color="blue" className="!mr-1 font-mono text-[10px]">{s.code}</Tag>
                  <span className="text-slate-700 line-clamp-2">{s.desc}</span>
                </div>
              ))}
            </div>
          );
        },
      });
    }

    return baseCols;
  };

  const filterData = (dim: string) => {
    return data.filter(d => 
      d.dimension === dim && 
      (d.code?.toLowerCase().includes(searchText.toLowerCase()) || 
       d.description?.toLowerCase().includes(searchText.toLowerCase()))
    );
  };

  const handleIssueSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const l1Code = data.find(d => d.l2Code === values.l2Code)?.l1Code || 'UNKNOWN';
      const payload = {
        ...values,
        l1Code
      };
      
      const res = await api.post('/ai/defect-codes/issue', payload);
      if (res.data.success) {
        message.success(`Đã cấp mã mới thành công: ${res.data.newCode} (Version: ${res.data.version})`);
        setIsModalVisible(false);
        form.resetFields();
        fetchCodes();
      }
    } catch (err: any) {
      message.error('Lỗi khi cấp mã: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  // Get unique L2 codes based on dimension choice
  const l2Options = Array.from(new Set(data
    .filter(d => d.dimension === dimension && (dimension === 'INTERNAL' ? d.code.startsWith(internalPrefix || '') : true))
    .map(d => d.l2Code)))
    .filter(Boolean)
    .map(l2 => ({ label: l2, value: l2 }));

  const l3ParentOptions = data
    .filter(d => d.dimension === dimension && d.l2Code === l2Code)
    .map(d => ({ label: `${d.code} - ${d.description}`, value: d.code }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Input 
          placeholder="Tìm kiếm mã, mô tả..." 
          prefix={<SearchOutlined />} 
          style={{ width: 300 }}
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            style={{ backgroundColor: '#fa8c16', color: '#fff', borderColor: '#fa8c16' }}
            loading={syncing}
            icon={<SyncOutlined />}
            onClick={async () => {
              try {
                setSyncing(true);
                const res = await api.post('/ai/defect-codes/sync-thucte');
                message.success(
                  `Đã đồng bộ thành công ${res.data.insertedCount} lỗi mới và cập nhật ${res.data.updatedCount} lỗi từ Danh mục lỗi ĐVKD thực tế (THUCTE)!`,
                );
                fetchCodes();
              } catch (err: any) {
                message.error(err.response?.data?.message || 'Lỗi khi đồng bộ danh mục lỗi THUCTE');
              } finally {
                setSyncing(false);
              }
            }}
          >
            Đồng bộ 924 Lỗi THUCTE
          </Button>
          <Button
            icon={<AuditOutlined />}
            onClick={() => setIsProposeModalVisible(true)}
            style={{ backgroundColor: '#13c2c2', color: '#fff', borderColor: '#13c2c2' }}
          >
            Đề xuất Bổ sung Lỗi Mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
            Cấp mã mới
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>
            Xuất Excel
          </Button>
          <Upload 
            name="file" 
            action={`${api.defaults.baseURL}/ai/defect-codes/import`}
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
      </div>

      <Tabs defaultActiveKey="INTERNAL">
        <Tabs.TabPane tab={`Mã lỗi Nội bộ (${data.filter(d => d.dimension === 'INTERNAL').length} lỗi)`} key="INTERNAL">
          <Table 
            size="small" 
            columns={getColumns('INTERNAL')} 
            dataSource={filterData('INTERNAL')} 
            rowKey="id" 
            loading={loading} 
            pagination={{ pageSize: 20 }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Nghị định 340" key="ND340">
          <Table 
            size="small" 
            columns={getColumns('ND340')} 
            dataSource={filterData('ND340')} 
            rowKey="id" 
            loading={loading} 
            pagination={{ pageSize: 20 }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Xử lý Kỷ luật Nhân sự" key="NHANSU">
          <Table 
            size="small" 
            columns={getColumns('NHANSU')} 
            dataSource={filterData('NHANSU')} 
            rowKey="id" 
            loading={loading} 
            pagination={{ pageSize: 20 }}
          />
        </Tabs.TabPane>
      </Tabs>

      <Modal
        title="Cấp mã lỗi mới (Auto-generation)"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleIssueSubmit}>
          <Form.Item name="dimension" label="Phân loại" rules={[{ required: true, message: 'Vui lòng chọn loại' }]}>
            <Select>
              <Select.Option value="INTERNAL">Mã lỗi Nội bộ</Select.Option>
              <Select.Option value="ND340">Nghị định 340</Select.Option>
              <Select.Option value="NHANSU">Xử lý Kỷ luật Nhân sự</Select.Option>
            </Select>
          </Form.Item>

          {dimension === 'INTERNAL' && (
            <Form.Item name="internalPrefix" label="Nghiệp vụ" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="TD">Tín Dụng (TD)</Select.Option>
                <Select.Option value="PTD">Phi Tín Dụng (PTD)</Select.Option>
                <Select.Option value="TKBD">Tiết Kiệm Bưu Điện (TKBĐ)</Select.Option>
              </Select>
            </Form.Item>
          )}

          {dimension && (dimension !== 'INTERNAL' || internalPrefix) && (
            <Form.Item name="l2Code" label="Chọn Nhóm (L2)" rules={[{ required: true }]}>
              <Select showSearch options={l2Options} placeholder="Chọn nhóm mã lỗi L2" />
            </Form.Item>
          )}

          {l2Code && (
            <>
              <Form.Item name="parentL3Code" label="Mã cha (L3) (Chỉ chọn nếu là biến thể)">
                <Select showSearch allowClear options={l3ParentOptions} placeholder="Nếu lỗi này là biến thể của lỗi đã có (thêm a, b..), hãy chọn" />
              </Form.Item>
              
              <Form.Item name="description" label="Mô tả lỗi (L3)" rules={[{ required: true }]}>
                <Input.TextArea rows={3} placeholder="Mô tả chi tiết hành vi vi phạm" />
              </Form.Item>

              {dimension !== 'ND340' && (
                <Form.Item name="riskLevel" label="Mức độ rủi ro (1-3)">
                  <Select>
                    <Select.Option value={1}>Mức 1 (Thấp)</Select.Option>
                    <Select.Option value={2}>Mức 2 (Trung bình)</Select.Option>
                    <Select.Option value={3}>Mức 3 (Cao)</Select.Option>
                  </Select>
                </Form.Item>
              )}

              <Form.Item name="reason" label="Lý do cấp mã mới (Change Log)" rules={[{ required: true }]}>
                <Input.TextArea rows={2} placeholder="Nêu rõ lý do để ghi vào Change Log" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" loading={submitting} block>
                  Phát hành & Cấp mã
                </Button>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* PROPOSE CHANGE MODAL */}
      <ProposeChangeModal
        visible={isProposeModalVisible}
        onCancel={() => setIsProposeModalVisible(false)}
        onSuccess={() => {
          setIsProposeModalVisible(false);
          fetchCodes();
        }}
        defaultCategory="DEFECT"
      />
    </div>
  );
};

export default DefectCodeList;
