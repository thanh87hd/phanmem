import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Select,
  Tag,
  Modal,
  Form,
  InputNumber,
  Row,
  Col,
  Statistic,
  Badge,
  Tooltip,
  Popconfirm,
  message,
  Typography,
  Divider,
  Radio,
  Tabs,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  SlidersOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import api from '../services/api';
import RiskLevelTag from '../components/RiskLevelTag';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export const DOMAINS = [
  { code: 'CNTT', name: 'HS01. CNTT & An ninh mạng', color: '#ea9105' },
  { code: 'TT_TLAT_QTTC', name: 'HS02. Thị trường & Nguồn vốn', color: '#722ed1' },
  { code: 'QTRR', name: 'HS03. Quản trị rủi ro & CAMELS', color: '#eb2f96' },
  { code: 'VH', name: 'HS04. Hoạt động Khối Vận hành', color: '#fa8c16' },
  { code: 'NS_DVNB', name: 'HS05. Nhân sự & Dịch vụ nội bộ', color: '#13c2c2' },
  { code: 'VPQT', name: 'HS06. Văn phòng Quản trị & Pháp chế', color: '#faad14' },
  { code: 'TD_CLTD', name: 'HS07. Chính sách & CL Tín dụng', color: '#52c41a' },
  { code: 'PGDBD', name: 'HS08. Mạng lưới PGDBĐ (TKBĐ)', color: '#f5222d' },
  { code: 'PTD_DVKD', name: 'HS09. Phi tín dụng & Kho quỹ ĐVKD', color: '#fa541c' },
  { code: 'TD_DVKD', name: 'HS10. Tín dụng & Khách hàng ĐVKD', color: '#a0d911' },
  { code: 'NHDN', name: 'HS11. Ngân hàng Doanh nghiệp (SME)', color: '#d97706' },
  { code: 'NHBL', name: 'HS12. Ngân hàng Bán lẻ & Bancas', color: '#c41d7f' },
];

export interface RiskRegisterProps {
  embedded?: boolean;
}

const RiskRegister: React.FC<RiskRegisterProps> = ({ embedded = false }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [auditUniverses, setAuditUniverses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  // Filters
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [selectedRiskBand, setSelectedRiskBand] = useState<string>('ALL');
  const [selectedUniverseId, setSelectedUniverseId] = useState<number | undefined>(undefined);
  const [searchText, setSearchText] = useState('');

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form] = Form.useForm();

  // Modal import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  // Realtime computation states inside form modal
  const [modalImpact, setModalImpact] = useState<number>(3);
  const [modalLikelihood, setModalLikelihood] = useState<number>(3);
  const [modalDesignEff, setModalDesignEff] = useState<number>(0.5);
  const [modalOperEff, setModalOperEff] = useState<number>(0.5);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedDomain !== 'ALL') params.domain = selectedDomain;
      if (selectedRiskBand !== 'ALL') params.finalRiskBand = selectedRiskBand;
      if (selectedUniverseId) params.auditObjectId = selectedUniverseId;
      if (searchText) params.search = searchText;

      const [resList, resSum] = await Promise.all([
        api.get('/risk-register', { params }),
        api.get('/risk-register/summary'),
      ]);

      setItems(resList.data?.items || resList.data || []);
      setSummary(resSum.data);
    } catch (e) {
      console.error('Failed to load risk register', e);
      message.error('Không thể tải danh sách sổ đăng ký rủi ro');
    } finally {
      setLoading(false);
    }
  };

  const fetchUniverses = async () => {
    try {
      const res = await api.get('/audit-universe');
      setAuditUniverses(res.data || []);
    } catch (e) {
      console.error('Failed to load universes', e);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [selectedDomain, selectedRiskBand, selectedUniverseId]);

  useEffect(() => {
    fetchUniverses();
  }, []);

  // Compute live values inside modal
  const liveInherent = useMemo(() => {
    return Math.round(Math.sqrt(modalImpact * modalLikelihood) * 100) / 100;
  }, [modalImpact, modalLikelihood]);

  const liveCE = useMemo(() => {
    return Math.round((0.4 * modalDesignEff + 0.6 * modalOperEff) * 100) / 100;
  }, [modalDesignEff, modalOperEff]);

  const liveResidual = useMemo(() => {
    return Math.round(liveInherent * (1 - liveCE) * 100) / 100;
  }, [liveInherent, liveCE]);

  const liveBand = useMemo(() => {
    if (liveResidual >= 3.8) return { label: 'Đỏ', color: '#cf1322' };
    if (liveResidual >= 3.0) return { label: 'Cam', color: '#d4380d' };
    if (liveResidual >= 2.0) return { label: 'Vàng', color: '#d48806' };
    return { label: 'Xanh', color: '#389e0d' };
  }, [liveResidual]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      domain: 'CNTT',
      riskCategory: 'Rủi ro An ninh mạng & CNTT',
      impactScore: 3,
      likelihoodScore: 3,
      designEffectiveness: 0.5,
      operatingEffectiveness: 0.5,
      riskResponse: 'Mitigate',
      assessmentYear: new Date().getFullYear(),
      status: 'Active',
    });
    setModalImpact(3);
    setModalLikelihood(3);
    setModalDesignEff(0.5);
    setModalOperEff(0.5);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    form.setFieldsValue({
      ...item,
      auditObjectId: item.auditObjectId || item.auditObject?.id,
    });
    setModalImpact(item.impactScore || 3);
    setModalLikelihood(item.likelihoodScore || 3);
    setModalDesignEff(item.designEffectiveness !== undefined ? item.designEffectiveness : 0.5);
    setModalOperEff(item.operatingEffectiveness !== undefined ? item.operatingEffectiveness : 0.5);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingItem?.id) {
        await api.patch(`/risk-register/${editingItem.id}`, values);
        message.success('Cập nhật rủi ro thành công!');
      } else {
        await api.post('/risk-register', values);
        message.success('Thêm mới rủi ro vào sổ đăng ký thành công!');
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Có lỗi xảy ra khi lưu rủi ro');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/risk-register/${id}`);
      message.success('Đã xóa rủi ro khỏi sổ đăng ký');
      fetchItems();
    } catch (e) {
      message.error('Không thể xóa rủi ro');
    }
  };

  const handleImportSampleData = async () => {
    try {
      setImportLoading(true);
      // Sample structured risks from HSRR
      const sampleRisks = [
        {
          hsrrCode: 'HS01_CNTT_001',
          domain: 'CNTT',
          sequenceNo: 1,
          riskCategory: 'Rủi ro An toàn Thông tin & An ninh mạng',
          riskTitle: 'Lỗ hổng bảo mật máy chủ & thất thoát dữ liệu khách hàng',
          riskDescription: 'Hệ thống máy chủ ứng dụng Internet Banking chưa vá các bản vá bảo mật định kỳ, tiềm ẩn nguy cơ bị hacker xâm nhập đánh cắp dữ liệu.',
          impactScore: 4.5,
          likelihoodScore: 3.5,
          controlObjective: 'Bảo đảm 100% máy chủ được quét lỗ hổng định kỳ và vá bản vá bảo mật trong vòng 14 ngày.',
          controlMeasures: 'Cài đặt phần mềm EDR, tường lửa WAF, rà soát lỗ hổng tự động hàng tuần.',
          controlCriteria: 'Có biên bản rà quét lỗ hổng bảo mật hàng tháng do Trung tâm An ninh mạng lập.',
          designEffectiveness: 1.0,
          operatingEffectiveness: 0.5,
          riskResponse: 'Mitigate',
          actionPlan: 'Triển khai nâng cấp hệ thống SIEM và vá tự động trong Q2/2026',
          targetDate: '2026-06-30',
          responsibleUnit: 'Trung tâm CNTT & ANM - Hội sở',
        },
        {
          hsrrCode: 'HS10_TD_001',
          domain: 'TD_DVKD',
          sequenceNo: 1,
          riskCategory: 'Rủi ro Thẩm định & Cấp tín dụng',
          riskTitle: 'Thẩm định nguồn thu nhập trả nợ không có chứng từ xác thực hợp lệ',
          riskDescription: 'Cán bộ tín dụng chỉ căn cứ vào sao kê tài khoản hoặc tự khai thu nhập mà không kiểm tra thực tế mô hình sản xuất kinh doanh.',
          impactScore: 4.0,
          likelihoodScore: 4.0,
          controlObjective: 'Kiểm soát chặt chẽ hồ sơ chứng minh thu nhập của khách hàng vay vốn theo quy định 3002.',
          controlMeasures: 'Kiểm tra chéo giữa Phòng Khách hàng và Phòng QLRR Tín dụng trước khi phê duyệt.',
          controlCriteria: 'Hồ sơ lưu trữ đầy đủ biên bản xác minh thực địa và hóa đơn chứng từ liên quan.',
          designEffectiveness: 0.5,
          operatingEffectiveness: 0.5,
          riskResponse: 'Mitigate',
          actionPlan: 'Tăng cường phúc tra hồ sơ tín dụng định kỳ hàng quý tại ĐVKD',
          targetDate: '2026-09-30',
          responsibleUnit: 'Khối KHDN & Khối KHCN',
        },
        {
          hsrrCode: 'HS04_VH_001',
          domain: 'VH',
          sequenceNo: 1,
          riskCategory: 'Rủi ro Quản lý Kho quỹ & Tiền mặt',
          riskTitle: 'Chênh lệch tồn quỹ thực tế so với sổ sách cuối ngày tại Quỹ nghiệp vụ',
          riskDescription: 'Thủ quỹ không kiểm đếm chính xác từng cọc tiền khi nhập xuất kho quỹ cuối ngày làm phát sinh thừa thiếu tiền.',
          impactScore: 3.0,
          likelihoodScore: 2.5,
          controlObjective: 'Đảm bảo tồn quỹ khớp 100% giữa sổ quỹ điện tử và hiện vật kho quỹ.',
          controlMeasures: 'Kiểm quỹ kép hàng ngày giữa Trưởng phòng Kế toán / Giám đốc và Thủ quỹ.',
          controlCriteria: 'Biên bản kiểm kê quỹ cuối ngày có đầy đủ chữ ký 3 bên.',
          designEffectiveness: 1.0,
          operatingEffectiveness: 1.0,
          riskResponse: 'Accept',
          actionPlan: 'Duy trì camera giám sát phòng kho quỹ 24/7 và kiểm kê đột xuất',
          targetDate: '2026-12-31',
          responsibleUnit: 'Khối Vận hành - Phòng Quản lý Kho quỹ',
        },
      ];

      await api.post('/risk-register/bulk-import', sampleRisks);
      message.success(`Đã nạp thành công ${sampleRisks.length} rủi ro mẫu theo chuẩn HSRR!`);
      setIsImportModalOpen(false);
      fetchItems();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Có lỗi khi nạp dữ liệu mẫu');
    } finally {
      setImportLoading(false);
    }
  };

  const getBandColor = (band: string) => {
    if (band === 'Đỏ' || band === 'Rất cao') return '#cf1322';
    if (band === 'Cam' || band === 'Cao') return '#d4380d';
    if (band === 'Vàng' || band === 'Trung bình') return '#d48806';
    return '#389e0d';
  };

  const columns = [
    {
      title: 'Mã / STT',
      dataIndex: 'hsrrCode',
      key: 'hsrrCode',
      width: 130,
      render: (code: string, record: any) => (
        <div>
          <strong style={{ color: '#096dd9', fontSize: 12 }}>{code || `RR-${record.id}`}</strong>
          {record.sequenceNo && <div style={{ fontSize: 10, color: '#8c8c8c' }}>STT: #{record.sequenceNo}</div>}
        </div>
      ),
    },
    {
      title: 'Lĩnh vực & Nhóm rủi ro',
      key: 'domainAndCategory',
      width: 220,
      render: (_: any, record: any) => {
        const dom = DOMAINS.find((d) => d.code === record.domain);
        return (
          <div>
            <Tag color={dom?.color || 'blue'} style={{ marginBottom: 4, fontSize: 11 }}>
              {dom ? dom.name : record.domain || 'Chung'}
            </Tag>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#262626' }}>{record.riskCategory}</div>
            {record.auditObject && (
              <div style={{ fontSize: 11, color: '#595959', marginTop: 2 }}>
                🏛️ {record.auditObject.name}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tên & Mô tả rủi ro cụ thể',
      dataIndex: 'riskTitle',
      key: 'riskTitle',
      render: (title: string, record: any) => (
        <div>
          <strong style={{ fontSize: 13, color: '#0f172a' }}>{title}</strong>
          {record.riskDescription && (
            <Paragraph
              ellipsis={{ rows: 2, expandable: true, symbol: 'Xem thêm' }}
              style={{ fontSize: 11, color: '#475569', marginTop: 4, marginBottom: 0 }}
            >
              {record.riskDescription}
            </Paragraph>
          )}
          {record.controlMeasures && (
            <div style={{ fontSize: 11, color: '#08979c', marginTop: 4 }}>
              🛡️ <strong>Kiểm soát:</strong> {record.controlMeasures}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Rủi ro Tiềm ẩn (Inherent)',
      key: 'inherent',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#096dd9' }}>
            {record.inherentRiskScore ? Number(record.inherentRiskScore).toFixed(2) : '—'}
          </div>
          <div style={{ fontSize: 10, color: '#8c8c8c' }}>
            I: {record.impactScore || '—'} × L: {record.likelihoodScore || '—'}
          </div>
          {record.inherentRiskLevel && (
            <Tag color={getBandColor(record.inherentRiskLevel)} style={{ fontSize: 10, marginTop: 2 }}>
              {record.inherentRiskLevel}
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Kiểm soát (CE)',
      key: 'controlEffectiveness',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const de = record.designEffectiveness;
        const oe = record.operatingEffectiveness;
        const cr = record.controlRating;
        return (
          <div>
            <Tag color={cr === 'Tốt' ? 'green' : cr === 'Trung bình' ? 'gold' : cr === 'Yếu' ? 'red' : 'default'}>
              {cr || 'Chưa đánh giá'}
            </Tag>
            <div style={{ fontSize: 10, color: '#595959', marginTop: 2 }}>
              Thiết kế (DE): <strong>{de !== undefined ? de : '—'}</strong>
            </div>
            <div style={{ fontSize: 10, color: '#595959' }}>
              Vận hành (OE): <strong>{oe !== undefined ? oe : '—'}</strong>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Rủi ro Còn lại (Residual)',
      key: 'residual',
      width: 140,
      align: 'center' as const,
      render: (_: any, record: any) => {
        const band = record.finalRiskBand || 'Vàng';
        return (
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: getBandColor(band) }}>
              {record.residualRiskScore ? Number(record.residualRiskScore).toFixed(2) : '—'}
            </div>
            <Tag color={getBandColor(band)} style={{ fontWeight: 700, marginTop: 2 }}>
              Băng {band}
            </Tag>
          </div>
        );
      },
    },
    {
      title: 'Phản hồi & Đơn vị',
      key: 'responseAndUnit',
      width: 170,
      render: (_: any, record: any) => (
        <div>
          <Tag color="geekblue" style={{ fontSize: 11, marginBottom: 2 }}>
            {record.riskResponse === 'Accept' ? 'Chấp nhận' : record.riskResponse === 'Mitigate' ? 'Giảm thiểu' : record.riskResponse === 'Avoid' ? 'Né tránh' : 'Chuyển giao'}
          </Tag>
          <div style={{ fontSize: 11, color: '#262626', fontWeight: 500 }}>
            {record.responsibleUnit || 'Chưa phân công'}
          </div>
          {record.targetDate && (
            <div style={{ fontSize: 10, color: '#fa8c16' }}>
              📅 Hạn: {record.targetDate}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined style={{ color: '#ea9105' }} />}
            onClick={() => handleOpenEdit(record)}
          />
          <Popconfirm
            title="Xác nhận xóa rủi ro này khỏi Sổ đăng ký?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* HEADER */}
      {!embedded ? (
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={3} className="!mb-1">
              <SafetyCertificateOutlined style={{ color: '#ea9105', marginRight: 8 }} />
              Sổ Đăng Ký Rủi Ro (Risk Register — Chuẩn THUCTE 2026)
            </Title>
            <Text type="secondary">
              Quản lý rủi ro ở cấp quy trình con (Sub-process level) · Chuẩn phương pháp luận Bo_phuong_phap_luan Sheet 05 · Khung HSRR 12 Lĩnh vực · Inherent ➔ Control (DE/OE) ➔ Residual Risk Band
            </Text>
          </div>
          <Space>
            <Button
              icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
              onClick={() => setIsImportModalOpen(true)}
            >
              Nạp dữ liệu mẫu HSRR
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
            >
              Thêm Rủi Ro Mới
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchItems}>
              Làm mới
            </Button>
          </Space>
        </div>
      ) : (
        <div className="flex justify-between items-center mb-4 p-3 rounded-lg bg-orange-50/60 border border-orange-200">
          <div>
            <Text strong style={{ color: '#b45309', fontSize: 14 }}>
              <SafetyCertificateOutlined style={{ marginRight: 6 }} />
              Sổ Đăng Ký Rủi Ro Cấp Quy Trình (Sub-process Risk Register — GIAS 2024 / Sheet 05)
            </Text>
            <div style={{ fontSize: 12, color: '#78716c' }}>
              Quản lý danh mục rủi ro chi tiết 12 lĩnh vực · Đánh giá Inherent ➔ Control (DE/OE) ➔ Residual Risk Band
            </div>
          </div>
          <Space>
            <Button
              size="small"
              icon={<FileExcelOutlined style={{ color: '#52c41a' }} />}
              onClick={() => setIsImportModalOpen(true)}
            >
              Nạp DL mẫu HSRR
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleOpenCreate}
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
            >
              Thêm rủi ro mới
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={fetchItems}>
              Làm mới
            </Button>
          </Space>
        </div>
      )}

      {/* STATS CARDS */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" style={{ borderTop: '3px solid #1890ff', borderRadius: 8 }}>
            <Statistic title="Tổng số rủi ro" value={summary?.total || items.length} prefix={<FolderOpenOutlined />} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderTop: '3px solid #cf1322', borderRadius: 8 }}>
            <Statistic
              title="Rủi ro Băng Đỏ (Rất cao)"
              value={summary?.byRiskBand?.['Đỏ'] || items.filter(i => i.finalRiskBand === 'Đỏ').length}
              valueStyle={{ color: '#cf1322', fontWeight: 700 }}
              prefix={<AlertOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderTop: '3px solid #d4380d', borderRadius: 8 }}>
            <Statistic
              title="Rủi ro Băng Cam (Cao)"
              value={summary?.byRiskBand?.['Cam'] || items.filter(i => i.finalRiskBand === 'Cam').length}
              valueStyle={{ color: '#d4380d', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderTop: '3px solid #d48806', borderRadius: 8 }}>
            <Statistic
              title="Rủi ro Băng Vàng (TB)"
              value={summary?.byRiskBand?.['Vàng'] || items.filter(i => i.finalRiskBand === 'Vàng').length}
              valueStyle={{ color: '#d48806', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderTop: '3px solid #389e0d', borderRadius: 8 }}>
            <Statistic
              title="Rủi ro Băng Xanh (Thấp)"
              value={summary?.byRiskBand?.['Xanh'] || items.filter(i => i.finalRiskBand === 'Xanh').length}
              valueStyle={{ color: '#389e0d', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" style={{ borderTop: '3px solid #722ed1', borderRadius: 8 }}>
            <Statistic
              title="Điểm RR Còn lại TB"
              value={summary?.avgResidual || 0}
              precision={2}
              valueStyle={{ color: '#722ed1', fontWeight: 700 }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* FILTERS & SEARCH */}
      <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fcfaf7', borderColor: '#f1e5d8' }}>
        <Row gutter={12} align="middle">
          <Col span={6}>
            <Select
              value={selectedDomain}
              onChange={setSelectedDomain}
              style={{ width: '100%' }}
              placeholder="Chọn lĩnh vực (12 Lĩnh vực HSRR)"
            >
              <Option value="ALL">🌐 Tất cả 12 Lĩnh vực</Option>
              {DOMAINS.map((d) => (
                <Option key={d.code} value={d.code}>
                  {d.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={5}>
            <Select
              value={selectedRiskBand}
              onChange={setSelectedRiskBand}
              style={{ width: '100%' }}
              placeholder="Chọn Băng rủi ro"
            >
              <Option value="ALL">Tất cả Băng rủi ro</Option>
              <Option value="Đỏ">🔴 Băng Đỏ (Rất cao)</Option>
              <Option value="Cam">🟠 Băng Cam (Cao)</Option>
              <Option value="Vàng">🟡 Băng Vàng (Trung bình)</Option>
              <Option value="Xanh">🟢 Băng Xanh (Thấp)</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select
              value={selectedUniverseId}
              onChange={setSelectedUniverseId}
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              placeholder="Chọn Đối tượng kiểm toán (Audit Universe)"
            >
              {auditUniverses.map((u) => (
                <Option key={u.id} value={u.id}>
                  [{u.auditCategory || 'Đơn vị'}] {u.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={7}>
            <Input
              placeholder="Tìm kiếm theo mã HSRR, tên hoặc mô tả rủi ro..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={fetchItems}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* DATA TABLE */}
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Tổng cộng ${total} rủi ro` }}
        bordered
        size="small"
      />

      {/* CREATE / EDIT MODAL */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SafetyCertificateOutlined style={{ color: '#ea9105', fontSize: 20 }} />
            <span>{editingItem ? 'Chỉnh Sửa Rủi Ro trong Sổ Đăng Ký' : 'Thêm Mới Rủi Ro vào Sổ Đăng Ký (Sub-process Level)'}</span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        width={960}
        okText="Lưu rủi ro"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#ea9105', borderColor: '#ea9105' } }}
      >
        <Form form={form} layout="vertical">
          {/* SECTION 1: ĐỊNH DANH & PHÂN LOẠI */}
          <Row gutter={12}>
            <Col span={6}>
              <Form.Item name="domain" label={<span style={{ fontWeight: 600 }}>Lĩnh vực (HSRR)</span>} rules={[{ required: true }]}>
                <Select placeholder="Chọn lĩnh vực">
                  {DOMAINS.map((d) => (
                    <Option key={d.code} value={d.code}>
                      {d.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="hsrrCode" label={<span style={{ fontWeight: 600 }}>Mã rủi ro HSRR</span>}>
                <Input placeholder="VD: HS01_CNTT_001" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="sequenceNo" label={<span style={{ fontWeight: 600 }}>STT</span>}>
                <InputNumber style={{ width: '100%' }} placeholder="1" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="auditObjectId" label={<span style={{ fontWeight: 600 }}>Đối tượng Kiểm toán cha</span>}>
                <Select showSearch optionFilterProp="children" placeholder="Liên kết với Audit Universe">
                  {auditUniverses.map((u) => (
                    <Option key={u.id} value={u.id}>
                      [{u.auditCategory || 'ĐV'}] {u.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="riskCategory" label={<span style={{ fontWeight: 600 }}>Nhóm rủi ro</span>} rules={[{ required: true }]}>
                <Input placeholder="VD: Rủi ro Hạ tầng & An ninh mạng" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="riskTitle" label={<span style={{ fontWeight: 600 }}>Tên rủi ro cụ thể</span>} rules={[{ required: true }]}>
                <Input placeholder="Tên rủi ro ngắn gọn, chuẩn hóa..." />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="riskDescription" label={<span style={{ fontWeight: 600 }}>Mô tả chi tiết rủi ro & nguyên nhân</span>}>
            <TextArea rows={2} placeholder="Mô tả nguyên nhân, bối cảnh, hậu quả có thể xảy ra..." />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          {/* SECTION 2: ĐÁNH GIÁ TIỀM ẨN & KIỂM SOÁT THIẾT KẾ / VẬN HÀNH */}
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" title="1. Đánh Giá Rủi Ro Tiềm Ẩn (Inherent)" style={{ backgroundColor: '#fafafa' }}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item label="Mức ảnh hưởng (Impact: 1 - 5)">
                      <InputNumber
                        min={1}
                        max={5}
                        step={0.1}
                        value={modalImpact}
                        onChange={(val) => {
                          setModalImpact(val || 1);
                          form.setFieldsValue({ impactScore: val || 1 });
                        }}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Khả năng xảy ra (Likelihood: 1 - 5)">
                      <InputNumber
                        min={1}
                        max={5}
                        step={0.1}
                        value={modalLikelihood}
                        onChange={(val) => {
                          setModalLikelihood(val || 1);
                          form.setFieldsValue({ likelihoodScore: val || 1 });
                        }}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <div style={{ backgroundColor: '#e6f7ff', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>
                  Điểm Tiềm ẩn = √(I × L) = <strong>{liveInherent}</strong>
                </div>
              </Card>
            </Col>

            <Col span={12}>
              <Card size="small" title="2. Đánh Giá Kiểm Soát Nội Bộ (CE)" style={{ backgroundColor: '#fafafa' }}>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                    Thiết kế kiểm soát (Design — 40%):
                  </div>
                  <Radio.Group
                    value={modalDesignEff}
                    onChange={(e) => {
                      setModalDesignEff(e.target.value);
                      form.setFieldsValue({ designEffectiveness: e.target.value });
                    }}
                    size="small"
                  >
                    <Radio.Button value={1.0}>1.0 Tốt</Radio.Button>
                    <Radio.Button value={0.5}>0.5 Trung bình</Radio.Button>
                    <Radio.Button value={0.0}>0.0 Không hiệu lực</Radio.Button>
                  </Radio.Group>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
                    Vận hành kiểm soát (Operating — 60%):
                  </div>
                  <Radio.Group
                    value={modalOperEff}
                    onChange={(e) => {
                      setModalOperEff(e.target.value);
                      form.setFieldsValue({ operatingEffectiveness: e.target.value });
                    }}
                    size="small"
                  >
                    <Radio.Button value={1.0}>1.0 Tốt</Radio.Button>
                    <Radio.Button value={0.5}>0.5 Trung bình</Radio.Button>
                    <Radio.Button value={0.0}>0.0 Không hiệu lực</Radio.Button>
                  </Radio.Group>
                </div>

                <div style={{ backgroundColor: '#f6ffed', padding: '6px 10px', borderRadius: 6, fontSize: 12 }}>
                  Hệ số CE = 0.4×DE + 0.6×OE = <strong>{liveCE}</strong>
                </div>
              </Card>
            </Col>
          </Row>

          {/* REALTIME RESULT BANNER */}
          <div
            style={{
              marginTop: 12,
              marginBottom: 12,
              padding: '10px 16px',
              borderRadius: 8,
              backgroundColor: '#fffbe6',
              border: '1px solid #ffe58f',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
            }}
          >
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>RỦI RO TIỀM ẨN:</Text>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#096dd9' }}>{liveInherent}</div>
            </div>
            <div style={{ fontSize: 16, color: '#bfbfbf' }}>➔</div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>HỆ SỐ KIỂM SOÁT (CE):</Text>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#389e0d' }}>{liveCE}</div>
            </div>
            <div style={{ fontSize: 16, color: '#bfbfbf' }}>➔</div>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>RỦI RO CÒN LẠI (RESIDUAL):</Text>
              <div style={{ fontSize: 20, fontWeight: 900, color: liveBand.color }}>
                {liveResidual} (Băng {liveBand.label})
              </div>
            </div>
          </div>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="controlObjective" label={<span style={{ fontWeight: 600 }}>Mục tiêu kiểm soát</span>}>
                <Input placeholder="Mục tiêu kiểm soát chính..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="controlMeasures" label={<span style={{ fontWeight: 600 }}>Biện pháp kiểm soát hiện hành</span>}>
                <Input placeholder="Biện pháp kiểm soát thực tế đang áp dụng..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="riskResponse" label={<span style={{ fontWeight: 600 }}>Phản hồi rủi ro</span>}>
                <Select>
                  <Option value="Mitigate">Giảm thiểu rủi ro (Mitigate)</Option>
                  <Option value="Accept">Chấp nhận rủi ro (Accept)</Option>
                  <Option value="Avoid">Né tránh rủi ro (Avoid)</Option>
                  <Option value="Transfer">Chuyển giao rủi ro (Transfer)</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="responsibleUnit" label={<span style={{ fontWeight: 600 }}>Đơn vị chịu trách nhiệm</span>}>
                <Input placeholder="VD: Khối CNTT, Khối Vận hành, Chi nhánh..." />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="targetDate" label={<span style={{ fontWeight: 600 }}>Ngày hoàn thành mục tiêu</span>}>
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="actionPlan" label={<span style={{ fontWeight: 600 }}>Kế hoạch hành động kiểm soát / giảm trừ</span>}>
            <TextArea rows={2} placeholder="Hành động cụ thể, các bước triển khai..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL NẠP DỮ LIỆU MẪU HSRR */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileExcelOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            <span>Nạp Dữ Liệu Hồ Sơ Rủi Ro Chuẩn Hóa (HSRR 12 Lĩnh Vực)</span>
          </div>
        }
        open={isImportModalOpen}
        onCancel={() => setIsImportModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsImportModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="import"
            type="primary"
            icon={<FileExcelOutlined />}
            loading={importLoading}
            onClick={handleImportSampleData}
            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
          >
            Nạp dữ liệu mẫu chuẩn HSRR vào Sổ
          </Button>,
        ]}
      >
        <Alert
          message="Khung Hồ sơ rủi ro (HSRR) 12 Lĩnh vực THUCTE 2026"
          description="Hệ thống hỗ trợ nạp cấu trúc 16 cột chuẩn hóa từ tài liệu HSRR_TONG_HOP_KTNB_2026.xlsx bao gồm: Mã HSRR, Lĩnh vực, Nhóm rủi ro, Mô tả chi tiết, Đánh giá Impact/Likelihood, Tiêu chí kiểm soát và Kế hoạch giảm trừ."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <div style={{ fontSize: 13, color: '#595959', lineHeight: 1.8 }}>
          Nhấn nút <strong>"Nạp dữ liệu mẫu chuẩn HSRR vào Sổ"</strong> bên dưới để tự động tạo các bản ghi mẫu đại diện cho CNTT, Tín dụng ĐVKD và Vận hành Kho quỹ với đầy đủ công thức tính điểm chuẩn xác.
        </div>
      </Modal>
    </div>
  );
};

export default RiskRegister;
