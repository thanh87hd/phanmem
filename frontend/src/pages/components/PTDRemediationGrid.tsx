import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Upload,
  message,
  Card,
  Input,
  Select,
  AutoComplete,
  Typography,
  Badge,
  Tooltip,
  Segmented,
} from 'antd';
import {
  UploadOutlined,
  DownloadOutlined,
  ReloadOutlined,
  PlusOutlined,
  SaveOutlined,
  LinkOutlined,
  FullscreenOutlined,
  EditOutlined,
  AppstoreOutlined,
  TableOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import {
  PTDCustomerDetailModal,
  type PTDSampleItem,
} from './PTDCustomerDetailModal';
import {
  DEFAULT_PTD_PROCESSES,
  RISK_LEVEL_OPTIONS,
  REMEDIATION_STATUS_OPTIONS,
} from '../../constants/auditConstants';

const { Text } = Typography;

export const PTDRemediationGrid: React.FC<{
  workingPaperId: number;
  readOnly?: boolean;
}> = ({ workingPaperId, readOnly = false }) => {
  const [samples, setSamples] = useState<PTDSampleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [workingPaper, setWorkingPaper] = useState<any>(null);
  const [universeOptions, setUniverseOptions] = useState<{ label: string; value: string }[]>([]);
  const [unitOptions, setUnitOptions] = useState<{ label: string; value: string }[]>([]);

  // Chế độ hiển thị: 'compact' (Tóm tắt fit màn hình) hoặc 'full' (Ma trận 20 cột)
  const [viewMode, setViewMode] = useState<'compact' | 'full'>('compact');
  // Modal nhập liệu Toàn màn hình
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentDetailIndex, setCurrentDetailIndex] = useState(0);

  const fetchSamples = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/audit-samples/by-working-paper/${workingPaperId}`);
      setSamples(res.data || []);
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi tải danh sách mẫu Phi tín dụng');
    } finally {
      setLoading(false);
    }
  };

  const fetchContextData = async () => {
    try {
      const wpRes = await api.get(`/working-papers/${workingPaperId}`);
      const wpData = wpRes.data;
      setWorkingPaper(wpData);

      const inheritedBranch =
        wpData?.engagement?.branchName ||
        wpData?.engagement?.branchCode ||
        'Chi nhánh Tây Nghệ An';

      const units: { label: string; value: string }[] = [
        { label: 'Trụ sở CN', value: 'Trụ sở CN' },
        { label: `${inheritedBranch} - Trụ sở`, value: inheritedBranch },
        { label: 'BPGDBĐ Quỳ Hợp', value: 'BPGDBĐ Quỳ Hợp' },
        { label: 'PGD Quỳ Hợp', value: 'PGD Quỳ Hợp' },
        { label: 'Phòng DVKH', value: 'Phòng DVKH' },
        { label: 'Phòng Kế toán & Ngân quỹ', value: 'Phòng Kế toán & Ngân quỹ' },
      ];
      setUnitOptions(units);
    } catch (e) {
      console.warn('Could not fetch working paper details', e);
    }

    try {
      const uRes = await api.get('/audit-universe');
      let customProcesses: string[] = [];
      if (Array.isArray(uRes.data)) {
        customProcesses = uRes.data.map((u: any) => u.name);
      }
      const combined = Array.from(new Set([...DEFAULT_PTD_PROCESSES, ...customProcesses])).map(
        (p) => ({ label: p, value: p }),
      );
      setUniverseOptions(combined);
    } catch (e) {
      setUniverseOptions(DEFAULT_PTD_PROCESSES.map((p) => ({ label: p, value: p })));
    }
  };

  useEffect(() => {
    if (workingPaperId) {
      fetchSamples();
      fetchContextData();
    }
  }, [workingPaperId]);

  const handleCellChange = (id: number, field: keyof PTDSampleItem, value: any) => {
    setSamples((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleOpenDetailModal = (index: number) => {
    setCurrentDetailIndex(index);
    setDetailModalVisible(true);
  };

  const handleSaveRow = async (record: PTDSampleItem): Promise<boolean> => {
    try {
      const { batch, finding, createdAt, updatedAt, ...cleanRecord } = record as any;
      const res = await api.patch(`/audit-samples/${record.id}`, cleanRecord);
      if (res.data?.findingId && res.data.findingId !== record.findingId) {
        setSamples((prev) =>
          prev.map((s) => (s.id === record.id ? { ...s, ...cleanRecord, findingId: res.data.findingId } : s)),
        );
        message.success(
          `Đã lưu mục #${record.sequenceNo} (${record.businessProcess || record.branchCode}) và đồng bộ Phát hiện #FD-${res.data.findingId}`,
        );
      } else {
        setSamples((prev) =>
          prev.map((s) => (s.id === record.id ? { ...s, ...cleanRecord } : s)),
        );
        message.success(`Đã lưu mục #${record.sequenceNo} (${record.businessProcess || record.branchCode})`);
      }
      return true;
    } catch (err: any) {
      console.error('Lỗi khi lưu dòng mẫu PTD:', err);
      const errMsg = err?.response?.data?.message;
      const displayMsg = Array.isArray(errMsg) ? errMsg.join(', ') : (errMsg || 'Lỗi khi lưu dữ liệu dòng');
      message.error(displayMsg);
      return false;
    }
  };

  const handleExportExcel = async () => {
    message.loading({ content: 'Đang kết xuất Excel PTD 20 cột...', key: 'export' });
    try {
      const res = await api.get(`/working-papers/${workingPaperId}/export-ptd-excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `WP_PTD_TheoDoiKhacPhuc_WP${workingPaperId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Tải file Excel PTD thành công!', key: 'export' });
    } catch (err: any) {
      message.error({ content: 'Lỗi xuất file Excel PTD', key: 'export' });
    }
  };

  const handleDownloadTemplate = async () => {
    message.loading({ content: 'Đang tải file template mẫu PTD 20 cột...', key: 'tpl' });
    try {
      const res = await api.get('/working-papers/template/ptd-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Template_WP_PhiTinDung_20Cot_ThucTe.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Tải template mẫu PTD thành công!', key: 'tpl' });
    } catch (err: any) {
      message.error({ content: 'Lỗi tải template mẫu PTD', key: 'tpl' });
    }
  };

  const handleAddSample = async () => {
    try {
      const newSeq = samples.length + 1;
      const inheritedBranch =
        workingPaper?.engagement?.branchName ||
        workingPaper?.engagement?.branchCode ||
        'Chi nhánh Tây Nghệ An';

      await api.post(`/audit-samples/by-working-paper/${workingPaperId}`, {
        sequenceNo: newSeq,
        operationType: 'PTD',
        managingBranchName: inheritedBranch,
        branchCode: 'Trụ sở CN',
        businessProcess: DEFAULT_PTD_PROCESSES[0],
        condition: `Nội dung sai sót phát hiện mẫu PTD #${newSeq}`,
        errorCountText: '1 vụ việc',
        recommendationText: 'Đơn vị tuân thủ đúng quy định quy trình nghiệp vụ',
        residualRisk: 'Trung bình',
        deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        testResult: 'FAIL',
        remediationFeasibility: true,
        includeInReport: true,
      });
      message.success('Đã thêm dòng mẫu PTD mới (kế thừa Chi nhánh & Đoàn KT)');
      fetchSamples();
    } catch (err: any) {
      message.error('Lỗi khi thêm dòng mẫu PTD');
    }
  };

  const handleImportExcel = async (options: any) => {
    const { file } = options;
    const formData = new FormData();
    formData.append('file', file);

    message.loading({ content: 'Đang nạp file Excel PTD & Khắc phục thực tế...', key: 'import' });
    try {
      const res = await api.post(`/working-papers/${workingPaperId}/import-ptd-excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success({
        content: `Đã nạp thành công ${res.data?.totalSamples || 0} mục PTD và đồng bộ sang Theo dõi khắc phục!`,
        key: 'import',
      });
      fetchSamples();
    } catch (err: any) {
      message.error({
        content: err?.response?.data?.message || 'Lỗi nạp file Excel PTD',
        key: 'import',
      });
    }
  };

  const filteredSamples = samples.filter(
    (s) =>
      !searchText ||
      s.businessProcess?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.condition?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.relatedPersonnelText?.toLowerCase().includes(searchText.toLowerCase()) ||
      s.branchCode?.toLowerCase().includes(searchText.toLowerCase()),
  );

  const compactColumns: any[] = [
    {
      title: 'STT',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 75,
      align: 'center',
      fixed: 'left',
      render: (val: number, record: PTDSampleItem) => (
        <Space orientation="vertical" size={1} align="center">
          <Text strong>{val}</Text>
          {record.findingId ? (
            <Tooltip title={`Đã đồng bộ sang Phát hiện #FD-${record.findingId}`}>
              <Tag color="purple" style={{ fontSize: 9, padding: '0 3px', margin: 0, cursor: 'pointer' }}>
                FD-{record.findingId}
              </Tag>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Chi nhánh quản lý',
      dataIndex: 'managingBranchName',
      key: 'managingBranchName',
      width: 140,
      fixed: 'left',
      render: (text: string) => (
        <span className="text-xs text-slate-700 font-medium">
          {text || workingPaper?.engagement?.branchName || 'Chi nhánh'}
        </span>
      ),
    },
    {
      title: 'Đơn vị / PGD',
      dataIndex: 'branchCode',
      key: 'branchCode',
      width: 130,
      render: (text: string) => <Tag color="blue" className="text-xs">{text || 'Trụ sở CN'}</Tag>,
    },
    {
      title: 'Nghiệp vụ kiểm tra',
      dataIndex: 'businessProcess',
      key: 'businessProcess',
      width: 220,
      render: (text: string, record: PTDSampleItem) => {
        const idx = filteredSamples.findIndex((s) => s.id === record.id);
        return (
          <Button
            type="link"
            onClick={() => handleOpenDetailModal(idx >= 0 ? idx : 0)}
            className="p-0 font-bold text-slate-800 text-left hover:text-indigo-600 block truncate max-w-[210px] text-xs"
            title={text}
          >
            {text || 'Nghiệp vụ PTD'}
          </Button>
        );
      },
    },
    {
      title: 'Nội dung sai sót tóm tắt',
      dataIndex: 'condition',
      key: 'condition',
      width: 260,
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span className="text-xs text-slate-600 truncate block">{text || '---'}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Mức độ rủi ro',
      dataIndex: 'residualRisk',
      key: 'residualRisk',
      width: 120,
      align: 'center',
      render: (val: string) => (
        <Tag
          color={
            val === 'Cao' || val === '3'
              ? 'error'
              : val === 'Thấp' || val === '1'
              ? 'success'
              : 'warning'
          }
          className="font-semibold text-xs"
        >
          {val || 'Trung bình'}
        </Tag>
      ),
    },
    {
      title: 'Tiến độ khắc phục',
      dataIndex: 'testResult',
      key: 'testResult',
      width: 130,
      align: 'center',
      render: (val: string) => (
        <Tag
          color={val === 'PASS' ? 'success' : val === 'EXCEPTION' ? 'warning' : 'error'}
          className="font-semibold text-xs"
        >
          {val === 'PASS' ? 'Đã hoàn thành' : val === 'EXCEPTION' ? 'Đang thực hiện' : 'Chưa thực hiện'}
        </Tag>
      ),
    },
    {
      title: 'Hạn hoàn thành',
      dataIndex: 'deadline',
      key: 'deadline',
      width: 110,
      render: (text: string) => <span className="text-xs text-slate-600 font-mono">{text || '---'}</span>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 130,
      fixed: 'right',
      align: 'center',
      render: (_: any, record: PTDSampleItem) => {
        const idx = filteredSamples.findIndex((s) => s.id === record.id);
        return (
          <Button
            type="primary"
            size="small"
            icon={<FullscreenOutlined />}
            onClick={() => handleOpenDetailModal(idx >= 0 ? idx : 0)}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-xs rounded-lg text-xs font-medium border-none"
          >
            Nhập chi tiết
          </Button>
        );
      },
    },
  ];

  const columns: any[] = [
    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 1: THÔNG TIN ĐƠN VỊ & NGHIỆP VỤ (Cột 1 - 4)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-sky-800">🟦 1. ĐƠN VỊ & NGHIỆP VỤ (CỘT 1 - 4)</span>,
      children: [
        {
          title: 'STT (1)',
          dataIndex: 'sequenceNo',
          key: 'sequenceNo',
          width: 95,
          fixed: 'left',
          render: (val: number, record: PTDSampleItem) => {
            const idx = filteredSamples.findIndex((s) => s.id === record.id);
            return (
              <Space orientation="vertical" size={2} align="center">
                <Text strong>{val}</Text>
                <Button
                  size="small"
                  type="text"
                  icon={<FullscreenOutlined />}
                  onClick={() => handleOpenDetailModal(idx >= 0 ? idx : 0)}
                  className="text-indigo-600 hover:bg-indigo-50 p-0 text-xs h-5 font-semibold"
                  title="Mở màn hình nhập liệu toàn màn hình"
                >
                  Mở
                </Button>
                {record.findingId ? (
                  <Tooltip title={`Đã đồng bộ sang Phát hiện kiểm toán #FD-${record.findingId}`}>
                    <Tag color="purple" style={{ fontSize: 10, padding: '0 4px', margin: 0, cursor: 'pointer' }}>
                      🔗 FD-{record.findingId}
                    </Tag>
                  </Tooltip>
                ) : null}
              </Space>
            );
          },
        },
        {
          title: 'CN Quản lý (2)',
          dataIndex: 'managingBranchName',
          key: 'managingBranchName',
          width: 150,
          fixed: 'left',
          render: (text: string, record: PTDSampleItem) => {
            const displayBranch = text || workingPaper?.engagement?.branchName || 'Chi nhánh';
            return readOnly ? (
              displayBranch
            ) : (
              <Input
                size="small"
                value={text || workingPaper?.engagement?.branchName}
                placeholder={workingPaper?.engagement?.branchName || 'Chi nhánh quản lý'}
                onChange={(e) => handleCellChange(record.id, 'managingBranchName', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            );
          },
        },
        {
          title: 'Đơn vị / PGD (3)',
          dataIndex: 'branchCode',
          key: 'branchCode',
          width: 160,
          fixed: 'left',
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text || 'Trụ sở CN'
            ) : (
              <AutoComplete
                style={{ width: '100%' }}
                options={unitOptions}
                value={text}
                placeholder="Trụ sở / PGD..."
                onChange={(v) => handleCellChange(record.id, 'branchCode', v)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Nghiệp vụ (4)',
          dataIndex: 'businessProcess',
          key: 'businessProcess',
          width: 240,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              <Text strong>{text}</Text>
            ) : (
              <AutoComplete
                style={{ width: '100%' }}
                options={universeOptions}
                value={text}
                placeholder="Chọn hoặc nhập nghiệp vụ..."
                filterOption={(input, option) =>
                  (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
                }
                onChange={(v) => handleCellChange(record.id, 'businessProcess', v)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 2: NỘI DUNG SAI SÓT, KIẾN NGHỊ & TRÁCH NHIỆM (Cột 5 - 10)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-amber-800">🟨 2. SAI SÓT, KIẾN NGHỊ & TRÁCH NHIỆM (CỘT 5 - 10)</span>,
      children: [
        {
          title: 'Nội dung sai sót chi tiết (5)',
          dataIndex: 'condition',
          key: 'condition',
          width: 320,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Mô tả sai sót phát hiện..."
                onChange={(e) => handleCellChange(record.id, 'condition', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Số lượng sai sót (6)',
          dataIndex: 'errorCountText',
          key: 'errorCountText',
          width: 130,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              <Tag color="orange">{text || '1'}</Tag>
            ) : (
              <Input
                size="small"
                value={text}
                placeholder="vd: 5/17 tháng"
                onChange={(e) => handleCellChange(record.id, 'errorCountText', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Kiến nghị / Khuyến nghị của KTV dành cho ĐVKD (7)',
          dataIndex: 'recommendationText',
          key: 'recommendationText',
          width: 280,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Kiến nghị xử lý..."
                onChange={(e) => handleCellChange(record.id, 'recommendationText', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Trách nhiệm cá nhân/tập thể (8)',
          dataIndex: 'relatedPersonnelText',
          key: 'relatedPersonnelText',
          width: 220,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="vd: KSV Lê Thị A, GDV B..."
                onChange={(e) => handleCellChange(record.id, 'relatedPersonnelText', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Họ tên Giám đốc tại thời điểm sai phạm (9)',
          dataIndex: 'branchDirectorAtViolation',
          key: 'branchDirectorAtViolation',
          width: 170,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text
            ) : (
              <Input
                size="small"
                value={text}
                placeholder="Họ tên Giám đốc"
                onChange={(e) => handleCellChange(record.id, 'branchDirectorAtViolation', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Mức độ rủi ro (10)',
          dataIndex: 'residualRisk',
          key: 'residualRisk',
          width: 150,
          align: 'center',
          render: (val: string, record: PTDSampleItem) =>
            readOnly ? (
              <Tag
                color={
                  val === 'Cao' || val === '3'
                    ? 'error'
                    : val === 'Thấp' || val === '1'
                      ? 'success'
                      : 'warning'
                }
              >
                {val || 'Trung bình'}
              </Tag>
            ) : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val || 'Trung bình'}
                options={RISK_LEVEL_OPTIONS}
                onChange={(v) => {
                  handleCellChange(record.id, 'residualRisk', v);
                  handleSaveRow({ ...record, residualRisk: v });
                }}
              />
            ),
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 3: KẾ HOẠCH & TÌNH TRẠNG KHẮC PHỤC (Cột 11 - 15)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-emerald-800">🟩 3. KẾ HOẠCH & TIẾN ĐỘ KHẮC PHỤC (CỘT 11 - 15)</span>,
      children: [
        {
          title: 'Ngày hoàn thành khắc phục (11)',
          dataIndex: 'deadline',
          key: 'deadline',
          width: 140,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text
            ) : (
              <Input
                size="small"
                value={text}
                placeholder="YYYY-MM-DD"
                onChange={(e) => handleCellChange(record.id, 'deadline', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Tình trạng khắc phục (12)',
          dataIndex: 'testResult',
          key: 'testResult',
          width: 150,
          align: 'center',
          render: (val: string, record: PTDSampleItem) =>
            readOnly ? (
              <Tag color={val === 'PASS' ? 'success' : val === 'EXCEPTION' ? 'orange' : 'error'}>
                {val === 'PASS' ? 'Đã hoàn thành' : val === 'EXCEPTION' ? 'Đang thực hiện' : 'Chưa thực hiện'}
              </Tag>
            ) : (
              <Select
                size="small"
                style={{ width: '100%' }}
                value={val || 'FAIL'}
                options={REMEDIATION_STATUS_OPTIONS}
                onChange={(v) => {
                  handleCellChange(record.id, 'testResult', v);
                  handleSaveRow({ ...record, testResult: v });
                }}
              />
            ),
        },
        {
          title: 'Đánh giá khả năng tiếp tục khắc phục (13)',
          dataIndex: 'remediationFeasibility',
          key: 'remediationFeasibility',
          width: 140,
          align: 'center',
          render: (feasible: boolean, record: PTDSampleItem) =>
            readOnly ? (
              feasible ? <Tag color="green">Có</Tag> : <Tag color="red">Không</Tag>
            ) : (
              <Select
                size="small"
                style={{ width: 90 }}
                value={feasible ? 'Có' : 'Không'}
                options={[
                  { label: 'Có', value: 'Có' },
                  { label: 'Không', value: 'Không' },
                ]}
                onChange={(v) => {
                  const b = v === 'Có';
                  handleCellChange(record.id, 'remediationFeasibility', b);
                  handleSaveRow({ ...record, remediationFeasibility: b });
                }}
              />
            ),
        },
        {
          title: 'Nguyên nhân (Nếu không khắc phục được) (14)',
          dataIndex: 'remediationUnfeasibleReason',
          key: 'remediationUnfeasibleReason',
          width: 240,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text || '---'
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Nguyên nhân chưa khắc phục được..."
                onChange={(e) => handleCellChange(record.id, 'remediationUnfeasibleReason', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Đề xuất của Đơn vị được kiểm toán (15)',
          dataIndex: 'auditeeProposal',
          key: 'auditeeProposal',
          width: 250,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text || '---'
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Đề xuất của ĐVKD..."
                onChange={(e) => handleCellChange(record.id, 'auditeeProposal', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
      ],
    },

    // ══════════════════════════════════════════════════════════════════════════
    // KHỐI 4: PHÊ DUYỆT, KỲ THEO DÕI & BẰNG CHỨNG (Cột 16 - 20)
    // ══════════════════════════════════════════════════════════════════════════
    {
      title: <span className="font-bold text-purple-800">🟪 4. PHÊ DUYỆT & THEO DÕI KHẮC PHỤC (CỘT 16 - 20)</span>,
      children: [
        {
          title: 'Cán bộ phê duyệt khắc phục (16)',
          dataIndex: 'remediationApprover',
          key: 'remediationApprover',
          width: 170,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text || '---'
            ) : (
              <Input
                size="small"
                value={text}
                placeholder="Lãnh đạo phê duyệt"
                onChange={(e) => handleCellChange(record.id, 'remediationApprover', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Ngày phê duyệt (17)',
          dataIndex: 'remediationApprovedDate',
          key: 'remediationApprovedDate',
          width: 130,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text || '---'
            ) : (
              <Input
                size="small"
                value={text}
                placeholder="YYYY-MM-DD"
                onChange={(e) => handleCellChange(record.id, 'remediationApprovedDate', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Kỳ theo dõi (theo tháng) (18)',
          dataIndex: 'monitoringCycle',
          key: 'monitoringCycle',
          width: 140,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text
            ) : (
              <Input
                size="small"
                value={text}
                placeholder="Tháng 05/2026"
                onChange={(e) => handleCellChange(record.id, 'monitoringCycle', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Đường link scan chứng từ khắc phục (19)',
          dataIndex: 'remediationEvidenceLink',
          key: 'remediationEvidenceLink',
          width: 180,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text ? (
                <a href={text} target="_blank" rel="noreferrer" className="flex items-center text-blue-600">
                  <LinkOutlined className="mr-1" /> Xem scan
                </a>
              ) : (
                '---'
              )
            ) : (
              <Input
                size="small"
                value={text}
                placeholder="https://..."
                onChange={(e) => handleCellChange(record.id, 'remediationEvidenceLink', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
        {
          title: 'Ghi chú (20)',
          dataIndex: 'testNotes',
          key: 'testNotes',
          width: 180,
          render: (text: string, record: PTDSampleItem) =>
            readOnly ? (
              text
            ) : (
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={text}
                placeholder="Ghi chú thêm..."
                onChange={(e) => handleCellChange(record.id, 'testNotes', e.target.value)}
                onBlur={() => handleSaveRow(record)}
              />
            ),
        },
      ],
    },
  ];

  return (
    <>
      <Card
        title={
          <div className="flex items-center gap-3 flex-wrap">
            <Space>
              <Text strong className="text-base text-slate-800">
                Theo dõi Khắc phục Phi Tín Dụng & Tiết Kiệm Bưu Điện
              </Text>
              <Badge count={samples.length} overflowCount={999} style={{ backgroundColor: '#ea9105' }} />
            </Space>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as any)}
              options={[
                {
                  label: '📋 Danh sách tóm tắt (Fit màn hình)',
                  value: 'compact',
                  icon: <AppstoreOutlined />,
                },
                {
                  label: '📊 Ma trận 20 cột (Trải rộng)',
                  value: 'full',
                  icon: <TableOutlined />,
                },
              ]}
              className="bg-slate-100 p-0.5 rounded-lg border border-slate-200"
            />
          </div>
        }
        extra={
          <Space wrap>
            <Input.Search
              placeholder="Tìm theo Nghiệp vụ, Lỗi, Nhân sự..."
              style={{ width: 180 }}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
            <Button
              type="primary"
              icon={<FullscreenOutlined />}
              onClick={() => {
                if (filteredSamples.length > 0) {
                  handleOpenDetailModal(0);
                } else {
                  message.info('Chưa có mẫu nào để mở');
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white border-none font-semibold shadow-sm rounded-lg"
            >
              Nhập Full-Screen
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate} className="border-blue-500 text-blue-600">
              Tải Template (20 Cột)
            </Button>
            <Upload customRequest={handleImportExcel} showUploadList={false} accept=".xlsx,.xls">
              <Button icon={<UploadOutlined />} type="primary" className="bg-indigo-600 hover:bg-indigo-700">
                Nhập Excel PTD (20 cột)
              </Button>
            </Upload>
            <Button icon={<PlusOutlined />} onClick={handleAddSample} disabled={readOnly} type="default">
              Thêm dòng PTD
            </Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>
              Xuất Excel PTD
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchSamples}>
              Làm mới
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          columns={viewMode === 'compact' ? compactColumns : columns}
          dataSource={filteredSamples}
          loading={loading}
          scroll={viewMode === 'compact' ? { x: 1280, y: 560 } : { x: 4200, y: 560 }}
          pagination={{ pageSize: 20, showSizeChanger: true }}
          size="small"
          bordered
          onRow={(record) => {
            const idx = filteredSamples.findIndex((s) => s.id === record.id);
            return {
              onDoubleClick: () => handleOpenDetailModal(idx >= 0 ? idx : 0),
            };
          }}
          rowClassName="hover:bg-indigo-50/40 cursor-pointer transition-colors"
        />
      </Card>

      {/* Workspace Nhập liệu Toàn Màn Hình cho Phi Tín Dụng */}
      <PTDCustomerDetailModal
        visible={detailModalVisible}
        onClose={() => setDetailModalVisible(false)}
        samples={filteredSamples}
        currentIndex={currentDetailIndex}
        onIndexChange={(newIdx) => setCurrentDetailIndex(newIdx)}
        onSaveSample={handleSaveRow}
        readOnly={readOnly}
        unitOptions={unitOptions}
        universeOptions={universeOptions}
        defaultBranch={workingPaper?.engagement?.branchName || 'Chi nhánh'}
      />
    </>
  );
};
