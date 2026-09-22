import React, { useState, useEffect } from 'react';
import {
  Modal, Form, Select, InputNumber, Slider, Row, Col, Typography,
  Divider, Card, Tag, Space, Button, Alert, Collapse, Badge, Tooltip, Input, message, Tabs, Switch, Radio
} from 'antd';
import {
  SafetyCertificateOutlined, AlertOutlined, CheckCircleOutlined,
  ThunderboltOutlined, InfoCircleOutlined, CalculatorOutlined,
  AuditOutlined, SendOutlined, SaveOutlined, AppstoreOutlined,
  SlidersOutlined, FireOutlined, ClockCircleOutlined, SyncOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Panel } = Collapse;

// THUCTE 10_Scoring_Model: 5 Impact components with standardized weights
export const DEFAULT_IMPACT_COMPONENTS = [
  { component: 'Tài chính', weight: 0.25, score: 3.0, note: 'Tổn thất tài chính, chi phí phát sinh' },
  { component: 'Pháp lý/tuân thủ', weight: 0.25, score: 3.0, note: 'Vi phạm quy định NHNN, pháp luật' },
  { component: 'Khách hàng/danh tiếng', weight: 0.15, score: 3.0, note: 'Ảnh hưởng uy tín, mất khách hàng' },
  { component: 'Hoạt động/resilience', weight: 0.20, score: 3.0, note: 'Gián đoạn hoạt động, quy trình gián đoạn' },
  { component: 'Dữ liệu/CNTT', weight: 0.15, score: 3.0, note: 'An ninh dữ liệu, sự cố hệ thống CNTT' },
];

// THUCTE 10_Scoring_Model: 4 Likelihood components with standardized weights
export const DEFAULT_LIKELIHOOD_COMPONENTS = [
  { component: 'Tần suất/phơi nhiễm', weight: 0.35, score: 3.0, note: 'Mật độ giao dịch, quy mô phơi nhiễm' },
  { component: 'Lịch sử sự cố', weight: 0.25, score: 3.0, note: 'Tần suất phát sinh lỗi trong quá khứ' },
  { component: 'Mức độ thay đổi', weight: 0.20, score: 3.0, note: 'Thay đổi nhân sự, quy trình, hệ thống' },
  { component: 'KRI/cảnh báo sớm', weight: 0.20, score: 3.0, note: 'Chỉ số cảnh báo rủi ro sớm kích hoạt' },
];

export const HIGH_RISK_FACTORS_DEFAULT = [
  { key: 'directorChanged12M', label: '1. Thay đổi Giám đốc trong vòng 12 tháng' },
  { key: 'keyPersonnelChanged', label: '2. Thay đổi nhiều cán bộ vị trí chủ chốt' },
  { key: 'staffDisciplined12M', label: '3. Có nhiều nhân sự bị kỷ luật trong vòng 12 tháng' },
  { key: 'turnoverRateOver25Pct', label: '4. Tỷ lệ nhân viên nghỉ việc ≥ 25% trong 12 tháng gần nhất' },
  { key: 'relatedPartyWithDirector', label: '5. Cán bộ vị trí quan trọng có quan hệ gia đình với Giám đốc' },
  { key: 'newProductLaunched12M', label: '6. Có các sản phẩm, dịch vụ mới trong vòng 12 tháng' },
  { key: 'lossInLast2Years', label: '7. Đơn vị thua lỗ trong bất kỳ giai đoạn nào trong 02 năm gần nhất' },
  { key: 'repeatViolationFound', label: '8. Sai phạm nghiêm trọng, tái phạm nhiều lần qua thanh tra/kiểm toán' },
  { key: 'unresolvedFindings', label: '9. Không chỉnh sửa đầy đủ các kiến nghị sau kiểm tra/kiểm toán' },
  { key: 'boardAttentionUrgent', label: '10. HĐQT/Ban TGĐ có sự quan tâm, lưu ý hoặc yêu cầu xử lý gấp' },
  { key: 'nplAboveSystemAverage', label: '11. Danh mục tín dụng có vấn đề, nợ quá hạn/nợ xấu vượt mức bình quân' },
  { key: 'creditGrowthAnomaly', label: '12. Tăng trưởng tín dụng vượt bình quân / Biến động bất thường BCTC' },
];

export interface UnifiedRiskScoringModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: (savedRecord: any) => void;
  initialData?: any;
  targetType?: 'AuditUniverse' | 'RiskAssessment' | 'RiskProfile';
  auditUniverses?: any[];
  riskCriteria?: any[];
}

export const UnifiedRiskScoringModal: React.FC<UnifiedRiskScoringModalProps> = ({
  visible,
  onCancel,
  onSuccess,
  initialData,
  targetType = 'RiskAssessment',
  auditUniverses = [],
  riskCriteria = [],
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [scoringMode, setScoringMode] = useState<'thucte' | 'criteria'>('thucte');

  // THUCTE Framework state
  const [impactScores, setImpactScores] = useState<any[]>(DEFAULT_IMPACT_COMPONENTS);
  const [likelihoodScores, setLikelihoodScores] = useState<any[]>(DEFAULT_LIKELIHOOD_COMPONENTS);
  const [designEffectiveness, setDesignEffectiveness] = useState<number>(0.5); // 0 | 0.5 | 1
  const [operatingEffectiveness, setOperatingEffectiveness] = useState<number>(0.5); // 0 | 0.5 | 1
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [isOverdueCritical, setIsOverdueCritical] = useState<boolean>(false);
  const [isEmergingRisk, setIsEmergingRisk] = useState<boolean>(false);

  // Criteria & Quick mode state
  const [criteriaScores, setCriteriaScores] = useState<any[]>([]);
  const [highRiskFactors, setHighRiskFactors] = useState<Record<string, boolean>>({});
  const [controlEffectiveness, setControlEffectiveness] = useState<string>('Adequate');
  const [riskVelocity, setRiskVelocity] = useState<string>('Stable');

  // Computed Outputs
  const [calcResult, setCalcResult] = useState<{
    inherentRiskScore: number;
    impactComposite?: number;
    likelihoodComposite?: number;
    controlEffectiveness: string;
    controlMultiplier: number;
    designEffectiveness?: number;
    operatingEffectiveness?: number;
    residualRiskScore: number;
    adjustedResidualScore?: number;
    modifierScore?: number;
    riskLevel: string;
    riskLevelVi: string;
    riskBand?: string;
    auditFrequency: string;
    auditFrequencyVi: string;
    suggestedAuditYear: number;
    highRiskFactorsCount: number;
  }>({
    inherentRiskScore: 3.0,
    impactComposite: 3.0,
    likelihoodComposite: 3.0,
    controlEffectiveness: 'Adequate',
    controlMultiplier: 0.5,
    designEffectiveness: 0.5,
    operatingEffectiveness: 0.5,
    residualRiskScore: 1.5,
    adjustedResidualScore: 1.5,
    modifierScore: 1.0,
    riskLevel: 'Medium',
    riskLevelVi: 'Trung bình',
    riskBand: 'Vàng',
    auditFrequency: 'Biennial',
    auditFrequencyVi: '2 năm/lần',
    suggestedAuditYear: new Date().getFullYear() + 2,
    highRiskFactorsCount: 0,
  });

  useEffect(() => {
    if (visible) {
      // Restore or set default impact/likelihood
      if (initialData?.impactScores && Array.isArray(initialData.impactScores)) {
        setImpactScores(initialData.impactScores);
      } else {
        setImpactScores(DEFAULT_IMPACT_COMPONENTS);
      }

      if (initialData?.likelihoodScores && Array.isArray(initialData.likelihoodScores)) {
        setLikelihoodScores(initialData.likelihoodScores);
      } else {
        setLikelihoodScores(DEFAULT_LIKELIHOOD_COMPONENTS);
      }

      setDesignEffectiveness(initialData?.designEffectiveness !== undefined ? Number(initialData.designEffectiveness) : 0.5);
      setOperatingEffectiveness(initialData?.operatingEffectiveness !== undefined ? Number(initialData.operatingEffectiveness) : 0.5);

      const mods = initialData?.modifiers || {};
      setIsRecurring(!!(initialData?.isRecurring ?? mods.isRecurring));
      setIsOverdueCritical(!!(initialData?.isOverdueCritical ?? mods.isOverdueCritical));
      setIsEmergingRisk(!!(initialData?.isEmergingRisk ?? mods.isEmergingRisk));

      // Legacy Criteria setup
      const defaultCriteria = (riskCriteria && riskCriteria.length > 0) ? riskCriteria : [
        { id: 1, name: 'Quy mô tài chính & Khối lượng giao dịch', weight: 30, category: 'Tài chính' },
        { id: 2, name: 'Rủi ro vận hành & Quy trình nghiệp vụ', weight: 30, category: 'Vận hành' },
        { id: 3, name: 'Tính phức tạp & Biến động nhân sự', weight: 20, category: 'Nhân sự' },
        { id: 4, name: 'Lịch sử sai phạm & Kiến nghị chưa khắc phục', weight: 20, category: 'Tuân thủ' },
      ];

      let initialScores: any[] = [];
      if (initialData?.criteriaScores && Array.isArray(initialData.criteriaScores)) {
        initialScores = initialData.criteriaScores;
      } else {
        initialScores = defaultCriteria.map((c) => ({
          criteriaId: c.id,
          criteriaName: c.name,
          category: c.category,
          weight: c.weight || 25,
          score: 3.0,
          note: '',
        }));
      }
      setCriteriaScores(initialScores);

      const factors = initialData?.highRiskFactors || initialData?.highRiskFactorsList || {};
      setHighRiskFactors(factors);

      const ce = initialData?.controlEffectiveness || 'Adequate';
      setControlEffectiveness(ce);

      const velocity = initialData?.riskVelocity || 'Stable';
      setRiskVelocity(velocity);

      form.setFieldsValue({
        auditUniverseId: initialData?.auditUniverseId || initialData?.id,
        universeName: initialData?.universeName || initialData?.name,
        department: initialData?.department || initialData?.departmentName,
        auditCategory: initialData?.auditCategory || 'ChiNhanh',
        controlEffectiveness: ce,
        riskVelocity: velocity,
        assessmentYear: initialData?.assessmentYear || new Date().getFullYear(),
        rationale: initialData?.rationale || initialData?.priorityReason || '',
      });

      // Trigger initial calculation
      triggerCalculation({
        mode: scoringMode,
        impacts: initialData?.impactScores || DEFAULT_IMPACT_COMPONENTS,
        likelihoods: initialData?.likelihoodScores || DEFAULT_LIKELIHOOD_COMPONENTS,
        de: initialData?.designEffectiveness !== undefined ? Number(initialData.designEffectiveness) : 0.5,
        oe: initialData?.operatingEffectiveness !== undefined ? Number(initialData.operatingEffectiveness) : 0.5,
        rec: !!(initialData?.isRecurring ?? mods.isRecurring),
        overdue: !!(initialData?.isOverdueCritical ?? mods.isOverdueCritical),
        emerging: !!(initialData?.isEmergingRisk ?? mods.isEmergingRisk),
        crit: initialScores,
        factors,
        ce,
        velocity,
      });
    }
  }, [visible, initialData, riskCriteria]);

  // Unified trigger calculation
  const triggerCalculation = async (params: {
    mode?: 'thucte' | 'criteria';
    impacts?: any[];
    likelihoods?: any[];
    de?: number;
    oe?: number;
    rec?: boolean;
    overdue?: boolean;
    emerging?: boolean;
    crit?: any[];
    factors?: Record<string, boolean>;
    ce?: string;
    velocity?: string;
  }) => {
    const currentMode = params.mode ?? scoringMode;
    const impacts = params.impacts ?? impactScores;
    const likelihoods = params.likelihoods ?? likelihoodScores;
    const de = params.de ?? designEffectiveness;
    const oe = params.oe ?? operatingEffectiveness;
    const rec = params.rec ?? isRecurring;
    const overdue = params.overdue ?? isOverdueCritical;
    const emerging = params.emerging ?? isEmergingRisk;

    const crit = params.crit ?? criteriaScores;
    const factors = params.factors ?? highRiskFactors;
    const ce = params.ce ?? controlEffectiveness;
    const velocity = params.velocity ?? riskVelocity;

    try {
      setCalculating(true);
      let payload: any = {
        riskVelocity: velocity,
      };

      if (currentMode === 'thucte') {
        payload = {
          ...payload,
          impactScores: impacts,
          likelihoodScores: likelihoods,
          designEffectiveness: de,
          operatingEffectiveness: oe,
          isRecurring: rec,
          isOverdueCritical: overdue,
          isEmergingRisk: emerging,
          highRiskFactors: factors,
        };
      } else {
        payload = {
          ...payload,
          criteriaScores: crit,
          highRiskFactors: factors,
          controlEffectiveness: ce,
        };
      }

      const res = await api.post('/risk-assessments/calculate-unified-score', payload);
      setCalcResult(res.data);
    } catch (e) {
      // Local fallback calculation
      if (currentMode === 'thucte') {
        const imp = impacts.reduce((acc, i) => acc + (i.score || 3) * (i.weight || 0.2), 0);
        const lik = likelihoods.reduce((acc, l) => acc + (l.score || 3) * (l.weight || 0.25), 0);
        const inherent = Math.round(Math.sqrt(imp * lik) * 100) / 100;
        const ceVal = 0.4 * de + 0.6 * oe;
        const residual = Math.round(inherent * (1 - ceVal) * 100) / 100;
        let mod = 1.0;
        if (rec) mod *= 1.2;
        if (overdue) mod *= 1.15;
        if (emerging) mod *= 1.1;
        const adj = Math.min(5.0, Math.round(residual * mod * 100) / 100);

        setCalcResult({
          inherentRiskScore: inherent,
          impactComposite: Math.round(imp * 100) / 100,
          likelihoodComposite: Math.round(lik * 100) / 100,
          controlEffectiveness: ceVal >= 0.7 ? 'Strong' : ceVal >= 0.4 ? 'Adequate' : 'Weak',
          controlMultiplier: Math.round(ceVal * 100) / 100,
          designEffectiveness: de,
          operatingEffectiveness: oe,
          residualRiskScore: residual,
          adjustedResidualScore: adj,
          modifierScore: Math.round(mod * 100) / 100,
          riskLevel: adj >= 3.5 ? 'High' : adj >= 2.0 ? 'Medium' : 'Low',
          riskLevelVi: adj >= 3.5 ? 'Cao' : adj >= 2.0 ? 'Trung bình' : 'Thấp',
          riskBand: adj >= 3.8 ? 'Đỏ' : adj >= 3.0 ? 'Cam' : adj >= 2.0 ? 'Vàng' : 'Xanh',
          auditFrequency: adj >= 3.5 ? 'Annual' : adj >= 2.5 ? 'Biennial' : 'Triennial',
          auditFrequencyVi: adj >= 3.5 ? 'Hằng năm (1 năm/lần)' : adj >= 2.5 ? '2 năm/lần' : '3 năm/lần',
          suggestedAuditYear: new Date().getFullYear() + (adj >= 3.5 ? 1 : adj >= 2.5 ? 2 : 3),
          highRiskFactorsCount: Object.values(factors).filter(Boolean).length,
        });
      }
    } finally {
      setCalculating(false);
    }
  };

  const handleImpactChange = (idx: number, score: number) => {
    const updated = [...impactScores];
    updated[idx] = { ...updated[idx], score };
    setImpactScores(updated);
    triggerCalculation({ impacts: updated });
  };

  const handleLikelihoodChange = (idx: number, score: number) => {
    const updated = [...likelihoodScores];
    updated[idx] = { ...updated[idx], score };
    setLikelihoodScores(updated);
    triggerCalculation({ likelihoods: updated });
  };

  const handleDEChange = (val: number) => {
    setDesignEffectiveness(val);
    triggerCalculation({ de: val });
  };

  const handleOEChange = (val: number) => {
    setOperatingEffectiveness(val);
    triggerCalculation({ oe: val });
  };

  const handleModifierToggle = (modType: 'rec' | 'overdue' | 'emerging', checked: boolean) => {
    if (modType === 'rec') {
      setIsRecurring(checked);
      triggerCalculation({ rec: checked });
    } else if (modType === 'overdue') {
      setIsOverdueCritical(checked);
      triggerCalculation({ overdue: checked });
    } else {
      setIsEmergingRisk(checked);
      triggerCalculation({ emerging: checked });
    }
  };

  const handleCriteriaScoreChange = (idx: number, score: number) => {
    const updated = [...criteriaScores];
    updated[idx] = { ...updated[idx], score };
    setCriteriaScores(updated);
    triggerCalculation({ crit: updated });
  };

  const handleFactorToggle = (key: string, checked: boolean) => {
    const updated = { ...highRiskFactors, [key]: checked };
    setHighRiskFactors(updated);
    triggerCalculation({ factors: updated });
  };

  const handleSubmit = async (submitForApproval: boolean = false) => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: any = {
        ...values,
        scoringMode,
        inherentRiskScore: calcResult.inherentRiskScore,
        controlEffectiveness: calcResult.controlEffectiveness,
        residualRiskScore: calcResult.residualRiskScore,
        adjustedResidualScore: calcResult.adjustedResidualScore || calcResult.residualRiskScore,
        riskLevel: calcResult.riskLevelVi,
        riskLevelCode: calcResult.riskLevel,
        riskBand: calcResult.riskBand,
        riskVelocity,
        totalScore: calcResult.inherentRiskScore,
        auditFrequency: calcResult.auditFrequency,
        nextAuditYear: calcResult.suggestedAuditYear,
        status: submitForApproval ? 'Submitted' : (initialData?.status || 'Draft'),
        highRiskFactors,
      };

      if (scoringMode === 'thucte') {
        payload.impactScores = impactScores;
        payload.likelihoodScores = likelihoodScores;
        payload.designEffectiveness = designEffectiveness;
        payload.operatingEffectiveness = operatingEffectiveness;
        payload.modifiers = {
          isRecurring,
          isOverdueCritical,
          isEmergingRisk,
        };
      } else {
        payload.criteriaScores = criteriaScores;
      }

      let response;
      if (initialData?.id && targetType === 'RiskAssessment') {
        response = await api.patch(`/risk-assessments/${initialData.id}`, payload);
      } else if (targetType === 'AuditUniverse' && initialData?.id) {
        response = await api.put(`/audit-universe/${initialData.id}`, {
          riskScore: calcResult.adjustedResidualScore || calcResult.residualRiskScore,
          dynamicRiskRating: calcResult.riskLevelVi,
          nextAuditYear: calcResult.suggestedAuditYear,
          scoreDetails: {
            ...payload,
            calcResult,
          },
        });
      } else {
        response = await api.post('/risk-assessments', payload);
      }

      message.success(submitForApproval ? 'Đã lưu và gửi phê duyệt đánh giá rủi ro thành công!' : 'Đã lưu kết quả chấm điểm rủi ro thành công!');
      onSuccess(response.data);
      onCancel();
    } catch (e: any) {
      message.error(e?.response?.data?.message || 'Có lỗi xảy ra khi lưu kết quả chấm điểm');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    if (level === 'Critical' || level === 'Rất cao' || level === 'Đỏ') return '#cf1322';
    if (level === 'High' || level === 'Cao' || level === 'Cam') return '#d4380d';
    if (level === 'Medium' || level === 'Trung bình' || level === 'Vàng') return '#d48806';
    return '#389e0d';
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <SafetyCertificateOutlined style={{ fontSize: 22, color: '#ea9105' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>
              Màn Hình Chấm Điểm & Đánh Giá Rủi Ro Đồng Nhất (Unified Risk Workspace)
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Khung phương pháp luận thực tế THUCTE 2026 · IIA Standards · Basel Inherent ➔ Control ➔ Residual · TT13 NHNN
            </Text>
          </div>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={1120}
      style={{ top: 16 }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Đóng
        </Button>,
        <Button
          key="save"
          icon={<SaveOutlined />}
          loading={loading}
          onClick={() => handleSubmit(false)}
          style={{ borderColor: '#ea9105', color: '#ea9105' }}
        >
          Lưu Bản Nháp
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SendOutlined />}
          loading={loading}
          onClick={() => handleSubmit(true)}
          style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
        >
          Lưu & Gửi Phê Duyệt
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        {/* PANEL 1: THÔNG TIN ĐỐI TƯỢNG & CHẾ ĐỘ CHẤM ĐIỂM */}
        <Card size="small" style={{ backgroundColor: '#fcfaf7', borderColor: '#f1e5d8', marginBottom: 14 }}>
          <Row gutter={16} align="middle">
            <Col span={9}>
              <Form.Item
                name="auditUniverseId"
                label={<span style={{ fontWeight: 600 }}>Đối tượng Kiểm toán / Quy trình</span>}
                rules={[{ required: true, message: 'Vui lòng chọn đối tượng' }]}
                style={{ marginBottom: 4 }}
              >
                <Select
                  showSearch
                  placeholder="Chọn đối tượng kiểm toán..."
                  optionFilterProp="children"
                  onChange={(val) => {
                    const found = auditUniverses.find((u) => u.id === val);
                    if (found) {
                      form.setFieldsValue({
                        universeName: found.name,
                        department: found.department,
                        auditCategory: found.auditCategory || 'ChiNhanh',
                      });
                    }
                  }}
                >
                  {auditUniverses.map((u) => (
                    <Option key={u.id} value={u.id}>
                      [{u.auditCategory || 'Đơn vị'}] {u.name} - {u.department || 'LPBank'}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item name="auditCategory" label={<span style={{ fontWeight: 600 }}>Phân loại</span>} style={{ marginBottom: 4 }}>
                <Select disabled>
                  <Option value="HoiSo">Khối Hội sở (HO)</Option>
                  <Option value="ChiNhanh">Chi nhánh (CN)</Option>
                  <Option value="PGD">Phòng GD (PGD)</Option>
                  <Option value="HeThong">Hệ thống CNTT</Option>
                  <Option value="QuyTrinh">Quy trình nghiệp vụ</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={3}>
              <Form.Item name="assessmentYear" label={<span style={{ fontWeight: 600 }}>Kỳ (Năm)</span>} style={{ marginBottom: 4 }}>
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: '#0f172a' }}>
                Phương pháp chấm điểm:
              </div>
              <Radio.Group
                value={scoringMode}
                onChange={(e) => {
                  setScoringMode(e.target.value);
                  triggerCalculation({ mode: e.target.value });
                }}
                buttonStyle="solid"
                size="small"
              >
                <Radio.Button value="thucte">
                  <SlidersOutlined style={{ marginRight: 4 }} />
                  Mô hình Chuẩn THUCTE 2026 (13 thành phần)
                </Radio.Button>
                <Radio.Button value="criteria">
                  <AppstoreOutlined style={{ marginRight: 4 }} />
                  Tiêu chí rút gọn
                </Radio.Button>
              </Radio.Group>
            </Col>
          </Row>
        </Card>

        {/* MAIN BODY: THUCTE 13-COMPONENT MODEL VS CRITERIA MODE */}
        <Row gutter={16}>
          <Col span={15}>
            {scoringMode === 'thucte' ? (
              <div>
                {/* 1. IMPACT & LIKELIHOOD DECOMPOSITION */}
                <Tabs
                  type="card"
                  size="small"
                  items={[
                    {
                      key: 'impact',
                      label: (
                        <span style={{ fontWeight: 600 }}>
                          <AlertOutlined style={{ color: '#cf1322', marginRight: 4 }} />
                          1. Mức Độ Ảnh Hưởng (Impact — 5 Tiêu chí)
                        </span>
                      ),
                      children: (
                        <div style={{ padding: '8px 4px' }}>
                          {impactScores.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px dashed #f0f0f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <div>
                                  <strong style={{ fontSize: 12 }}>{item.component}</strong>
                                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>({item.note})</Text>
                                </div>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>
                                    Trọng số: <strong>{Math.round((item.weight || 0) * 100)}%</strong>
                                  </Text>
                                  <Tag color={item.score >= 4 ? 'red' : item.score >= 3 ? 'gold' : 'green'}>
                                    {item.score || 3.0} điểm
                                  </Tag>
                                </div>
                              </div>
                              <Row gutter={8} align="middle">
                                <Col span={18}>
                                  <Slider
                                    min={1}
                                    max={5}
                                    step={0.5}
                                    value={item.score || 3.0}
                                    onChange={(val) => handleImpactChange(idx, val)}
                                    marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
                                  />
                                </Col>
                                <Col span={6}>
                                  <InputNumber
                                    min={1}
                                    max={5}
                                    step={0.1}
                                    value={item.score || 3.0}
                                    onChange={(val) => handleImpactChange(idx, val || 1)}
                                    style={{ width: '100%' }}
                                    size="small"
                                  />
                                </Col>
                              </Row>
                            </div>
                          ))}
                        </div>
                      ),
                    },
                    {
                      key: 'likelihood',
                      label: (
                        <span style={{ fontWeight: 600 }}>
                          <CalculatorOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
                          2. Khả Năng Xảy Ra (Likelihood — 4 Tiêu chí)
                        </span>
                      ),
                      children: (
                        <div style={{ padding: '8px 4px' }}>
                          {likelihoodScores.map((item, idx) => (
                            <div key={idx} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px dashed #f0f0f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                <div>
                                  <strong style={{ fontSize: 12 }}>{item.component}</strong>
                                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>({item.note})</Text>
                                </div>
                                <div>
                                  <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>
                                    Trọng số: <strong>{Math.round((item.weight || 0) * 100)}%</strong>
                                  </Text>
                                  <Tag color={item.score >= 4 ? 'red' : item.score >= 3 ? 'gold' : 'green'}>
                                    {item.score || 3.0} điểm
                                  </Tag>
                                </div>
                              </div>
                              <Row gutter={8} align="middle">
                                <Col span={18}>
                                  <Slider
                                    min={1}
                                    max={5}
                                    step={0.5}
                                    value={item.score || 3.0}
                                    onChange={(val) => handleLikelihoodChange(idx, val)}
                                    marks={{ 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }}
                                  />
                                </Col>
                                <Col span={6}>
                                  <InputNumber
                                    min={1}
                                    max={5}
                                    step={0.1}
                                    value={item.score || 3.0}
                                    onChange={(val) => handleLikelihoodChange(idx, val || 1)}
                                    style={{ width: '100%' }}
                                    size="small"
                                  />
                                </Col>
                              </Row>
                            </div>
                          ))}
                        </div>
                      ),
                    },
                  ]}
                />

                {/* 12 HIGH RISK OVERRIDE FACTORS */}
                <Collapse ghost size="small" style={{ marginTop: 8 }}>
                  <Panel
                    header={
                      <span style={{ color: '#d4380d', fontWeight: 600 }}>
                        <AlertOutlined style={{ marginRight: 6 }} />
                        12 Tiêu Chí Nhận Diện Đơn Vị Rủi Ro Cao (Điều 4.3 QT 3002 - LPBank)
                        {calcResult.highRiskFactorsCount > 0 && (
                          <Badge
                            count={`${calcResult.highRiskFactorsCount} yếu tố`}
                            style={{ marginLeft: 8, backgroundColor: '#d4380d' }}
                          />
                        )}
                      </span>
                    }
                    key="1"
                  >
                    <div style={{ maxHeight: 150, overflowY: 'auto', paddingRight: 6 }}>
                      <Row gutter={[8, 6]}>
                        {HIGH_RISK_FACTORS_DEFAULT.map((item) => (
                          <Col span={12} key={item.key}>
                            <div
                              onClick={() => handleFactorToggle(item.key, !highRiskFactors[item.key])}
                              style={{
                                padding: '4px 8px',
                                borderRadius: 4,
                                cursor: 'pointer',
                                backgroundColor: highRiskFactors[item.key] ? '#fff2e8' : '#fafafa',
                                border: highRiskFactors[item.key] ? '1px solid #ffbb96' : '1px solid #f0f0f0',
                                fontSize: 11,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={!!highRiskFactors[item.key]}
                                onChange={(e) => handleFactorToggle(item.key, e.target.checked)}
                              />
                              <span style={{ color: highRiskFactors[item.key] ? '#d4380d' : '#595959' }}>
                                {item.label}
                              </span>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </Panel>
                </Collapse>
              </div>
            ) : (
              // CRITERIA / LEGACY MODE
              <Card
                size="small"
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>
                      <CalculatorOutlined style={{ color: '#ea9105', marginRight: 6 }} />
                      <strong>Chấm Điểm Tiêu Chí Rủi Ro Rút Gọn</strong>
                    </span>
                    <Tag color="gold">Thang điểm: 1 (Rất Thấp) ➔ 5 (Rất Cao)</Tag>
                  </div>
                }
              >
                {criteriaScores.map((criterion, idx) => (
                  <div key={idx} style={{ marginBottom: 12, paddingBottom: 8, borderBottom: '1px dashed #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <div>
                        <strong style={{ fontSize: 12 }}>{idx + 1}. {criterion.criteriaName}</strong>
                        {criterion.category && (
                          <Tag style={{ marginLeft: 6, fontSize: 10 }} color="geekblue">
                            {criterion.category}
                          </Tag>
                        )}
                      </div>
                      <div>
                        <Text type="secondary" style={{ fontSize: 11, marginRight: 6 }}>
                          Trọng số: <strong>{criterion.weight}%</strong>
                        </Text>
                        <Badge
                          count={`${criterion.score || 3.0} điểm`}
                          style={{
                            backgroundColor:
                              criterion.score >= 4 ? '#ff4d4f' : criterion.score >= 3 ? '#faad14' : '#52c41a',
                          }}
                        />
                      </div>
                    </div>
                    <Row gutter={10} align="middle">
                      <Col span={18}>
                        <Slider
                          min={1}
                          max={5}
                          step={0.5}
                          value={criterion.score || 3.0}
                          onChange={(val) => handleCriteriaScoreChange(idx, val)}
                        />
                      </Col>
                      <Col span={6}>
                        <InputNumber
                          min={1}
                          max={5}
                          step={0.1}
                          value={criterion.score || 3.0}
                          onChange={(val) => handleCriteriaScoreChange(idx, val || 1)}
                          style={{ width: '100%' }}
                          size="small"
                        />
                      </Col>
                    </Row>
                  </div>
                ))}
              </Card>
            )}
          </Col>

          {/* RIGHT COLUMN: CONTROLS, MODIFIERS, & UNIFIED DASHBOARD */}
          <Col span={9}>
            {/* KIỂM SOÁT THIẾT KẾ & VẬN HÀNH (THUCTE) */}
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <strong>Đánh Giá Hệ Thống Kiểm Soát (CE)</strong>
                </div>
              }
              style={{ marginBottom: 12 }}
            >
              {scoringMode === 'thucte' ? (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>Thiết kế kiểm soát (Design — 40%):</span>
                      <Tag color={designEffectiveness === 1 ? 'green' : designEffectiveness === 0.5 ? 'gold' : 'red'}>
                        {designEffectiveness === 1 ? '1.0 (Hiệu lực)' : designEffectiveness === 0.5 ? '0.5 (Một phần)' : '0.0 (Không hiệu lực)'}
                      </Tag>
                    </div>
                    <Radio.Group
                      value={designEffectiveness}
                      onChange={(e) => handleDEChange(e.target.value)}
                      size="small"
                      style={{ width: '100%', display: 'flex' }}
                    >
                      <Radio.Button value={1.0} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>1.0 Tốt</Radio.Button>
                      <Radio.Button value={0.5} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>0.5 TB</Radio.Button>
                      <Radio.Button value={0.0} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>0.0 Yếu</Radio.Button>
                    </Radio.Group>
                  </div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600 }}>Vận hành kiểm soát (Operating — 60%):</span>
                      <Tag color={operatingEffectiveness === 1 ? 'green' : operatingEffectiveness === 0.5 ? 'gold' : 'red'}>
                        {operatingEffectiveness === 1 ? '1.0 (Hiệu lực)' : operatingEffectiveness === 0.5 ? '0.5 (Một phần)' : '0.0 (Không hiệu lực)'}
                      </Tag>
                    </div>
                    <Radio.Group
                      value={operatingEffectiveness}
                      onChange={(e) => handleOEChange(e.target.value)}
                      size="small"
                      style={{ width: '100%', display: 'flex' }}
                    >
                      <Radio.Button value={1.0} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>1.0 Tốt</Radio.Button>
                      <Radio.Button value={0.5} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>0.5 TB</Radio.Button>
                      <Radio.Button value={0.0} style={{ flex: 1, textAlign: 'center', fontSize: 11 }}>0.0 Yếu</Radio.Button>
                    </Radio.Group>
                  </div>

                  <div style={{ backgroundColor: '#f6ffed', border: '1px solid #b7eb8f', padding: '6px 8px', borderRadius: 4, fontSize: 11 }}>
                    <Text type="secondary">Hiệu lực kiểm soát tổng hợp:</Text>{' '}
                    <strong>CE = 0.4×DE + 0.6×OE = {calcResult.controlMultiplier}</strong>
                  </div>
                </div>
              ) : (
                <div>
                  <Text style={{ fontSize: 11, color: '#595959' }}>Hiệu lực vận hành kiểm soát:</Text>
                  <Select
                    value={controlEffectiveness}
                    onChange={(val) => {
                      setControlEffectiveness(val);
                      triggerCalculation({ ce: val });
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                    size="small"
                  >
                    <Option value="Strong">🟢 Tốt / Strong (Hệ số 0.5)</Option>
                    <Option value="Adequate">🟡 Đạt / Adequate (Hệ số 0.75)</Option>
                    <Option value="Weak">🔴 Yếu / Weak (Hệ số 1.0)</Option>
                  </Select>
                </div>
              )}
            </Card>

            {/* 3 RISK MODIFIERS (THUCTE) */}
            {scoringMode === 'thucte' && (
              <Card
                size="small"
                title={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FireOutlined style={{ color: '#d4380d' }} />
                    <strong>Hệ Số Điều Chỉnh (Risk Modifiers)</strong>
                  </div>
                }
                style={{ marginBottom: 12 }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11 }}>
                      <SyncOutlined style={{ color: '#fa8c16', marginRight: 4 }} />
                      Tái diễn sai phạm (×1.2)
                    </span>
                    <Switch
                      size="small"
                      checked={isRecurring}
                      onChange={(chk) => handleModifierToggle('rec', chk)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11 }}>
                      <ClockCircleOutlined style={{ color: '#cf1322', marginRight: 4 }} />
                      Quá hạn nghiêm trọng (×1.15)
                    </span>
                    <Switch
                      size="small"
                      checked={isOverdueCritical}
                      onChange={(chk) => handleModifierToggle('overdue', chk)}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11 }}>
                      <ThunderboltOutlined style={{ color: '#722ed1', marginRight: 4 }} />
                      Rủi ro mới nổi (×1.10)
                    </span>
                    <Switch
                      size="small"
                      checked={isEmergingRisk}
                      onChange={(chk) => handleModifierToggle('emerging', chk)}
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* DASHBOARD KẾT QUẢ ĐỒNG NHẤT */}
            <Card
              size="small"
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ThunderboltOutlined style={{ color: '#fa8c16' }} />
                  <strong>Kết Quả Tổng Hợp (Unified Engine)</strong>
                </div>
              }
              style={{
                backgroundColor: '#fffbe6',
                borderColor: '#ffe58f',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', padding: '6px 0' }}>
                <div>
                  <div style={{ fontSize: 10, color: '#8c8c8c' }}>TIỀM ẨN</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#096dd9' }}>
                    {calcResult.inherentRiskScore.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 9, color: '#8c8c8c' }}>Inherent</div>
                </div>

                <div style={{ fontSize: 16, color: '#bfbfbf', alignSelf: 'center' }}>➔</div>

                <div>
                  <div style={{ fontSize: 10, color: '#8c8c8c' }}>CÒN LẠI</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#389e0d' }}>
                    {calcResult.residualRiskScore.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 9, color: '#8c8c8c' }}>Residual</div>
                </div>

                <div style={{ fontSize: 16, color: '#bfbfbf', alignSelf: 'center' }}>➔</div>

                <div>
                  <div style={{ fontSize: 10, color: '#8c8c8c' }}>SAU ĐIỀU CHỈNH</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: getRiskColor(calcResult.riskBand || calcResult.riskLevel) }}>
                    {(calcResult.adjustedResidualScore || calcResult.residualRiskScore).toFixed(2)}
                  </div>
                  <Tag color={getRiskColor(calcResult.riskBand || calcResult.riskLevel)} style={{ fontWeight: 700, margin: 0 }}>
                    {calcResult.riskBand ? `Băng ${calcResult.riskBand}` : calcResult.riskLevelVi}
                  </Tag>
                </div>
              </div>

              <Divider style={{ margin: '6px 0' }} />

              <div style={{ backgroundColor: '#fff', padding: '8px', borderRadius: 6, border: '1px solid #ffd666', fontSize: 11 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <AuditOutlined style={{ color: '#d48806' }} />
                  <strong style={{ color: '#873800' }}>Khuyến nghị Kiểm toán:</strong>
                </div>
                <div>• Chu kỳ: <strong>{calcResult.auditFrequencyVi}</strong></div>
                <div>• Năm kế hoạch: <strong>Năm {calcResult.suggestedAuditYear}</strong></div>
              </div>
            </Card>

            <Form.Item name="rationale" label={<span style={{ fontSize: 11, fontWeight: 600, marginTop: 8 }}>Ghi chú / Căn cứ:</span>} style={{ marginBottom: 0, marginTop: 8 }}>
              <TextArea rows={2} placeholder="Căn cứ điều chỉnh điểm hoặc nhận định..." />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default UnifiedRiskScoringModal;
