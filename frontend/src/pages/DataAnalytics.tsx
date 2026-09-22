import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Row, Col, Typography, Button, Tabs, Form, Input, InputNumber, Select, message, Table, Spin, Tag, Statistic, Alert, Modal, Upload } from 'antd';
import {
  CalculatorOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  AlertOutlined,
  SyncOutlined,
  DatabaseOutlined,
  FolderOpenOutlined,
  CloudUploadOutlined,
  InboxOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const DataAnalytics: React.FC = () => {
  const { t } = useTranslation();

  const [sampleForm] = Form.useForm();
  const [sampleResult, setSampleResult] = useState<number | null>(null);

  const [scriptType, setScriptType] = useState('duplicates');
  const [scriptContent, setScriptContent] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // 3. AI & ML Copilot states
  const [mlLoading, setMlLoading] = useState(false);
  const [mlPredictions, setMlPredictions] = useState<any[]>([]);
  const [draftDescription, setDraftDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  // 4. Data Ingestion Pipeline states
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batchesTotal, setBatchesTotal] = useState(0);
  const [batchesPage, setBatchesPage] = useState(1);
  const [scanLoading, setScanLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);

  const fetchBatches = async (page = 1) => {
    setBatchesLoading(true);
    try {
      const res = await api.get('/data-ingestion/batches', {
        params: { page, limit: 10 },
      });
      setBatches(res.data.items || []);
      setBatchesTotal(res.data.total || 0);
      setBatchesPage(page);
    } catch (e: any) {
      console.error('Failed to fetch batches', e);
    } finally {
      setBatchesLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleTriggerScan = async () => {
    setScanLoading(true);
    try {
      const res = await api.post('/data-ingestion/trigger-scan');
      message.success(
        t('dataAnalytics.scanComplete', `Đã quét xong thư mục inbox! Tìm thấy ${res.data?.scannedFiles || 0} file.`),
      );
      fetchBatches(1);
    } catch (e: any) {
      message.error(t('dataAnalytics.scanFailed', 'Lỗi khi quét thư mục inbox: ') + e.message);
    } finally {
      setScanLoading(false);
    }
  };

  const handleReprocessBatch = async (batchId: string) => {
    try {
      await api.post(`/data-ingestion/batches/${batchId}/reprocess`);
      message.success(t('dataAnalytics.reprocessTriggered', 'Đã kích hoạt chạy lại Pipeline!'));
      fetchBatches(batchesPage);
    } catch (e: any) {
      message.error(t('dataAnalytics.reprocessFailed', 'Lỗi khi chạy lại batch: ') + e.message);
    }
  };

  const handleDownloadTemplate = async (type: 'transactions' | 'metrics') => {
    try {
      const res = await api.get(`/data-ingestion/templates/${type}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        type === 'transactions'
          ? 'sample_transactions_template.xlsx'
          : 'sample_kri_metrics_template.xlsx',
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success(t('dataAnalytics.downloadSuccess', 'Tải file mẫu thành công!'));
    } catch (e: any) {
      message.error(t('dataAnalytics.downloadFailed', 'Lỗi khi tải file mẫu: ') + e.message);
    }
  };

  // ML Risk Prediction Simulator
  const handleRunMlPrediction = () => {
    setMlLoading(true);
    message.loading({ content: t('dataAnalytics.launchingTheXgboostIsolationForestModel', 'Đang khởi chạy mô hình XGBoost & Isolation Forest dự báo rủi ro...'), key: 'ml_run' });
    setTimeout(() => {
      setMlPredictions([
        {
          key: '1',
          branch: t('auditeePortal.hanoiBranch', 'Chi nhánh Hà Nội'),
          probability: 74.2,
          level: 'High',
          drivers: t('dataAnalytics.highStaffTurnover252Recommendations', 'Biến động nhân sự cao (>25%), 2 kiến nghị khắc phục trễ hạn quá 15 ngày.'),
        },
        {
          key: '2',
          branch: t('dataAnalytics.headOfficeOperationsDivision', 'Khối Vận hành Hội sở'),
          probability: 82.4,
          level: 'Critical',
          drivers: t('dataAnalytics.warningOfSuddenIncreaseInAml', 'Cảnh báo AML tăng đột biến (KRI breach), phát hiện sai phạm lặp lại (Gap analysis).'),
        },
        {
          key: '3',
          branch: t('dataAnalytics.hoChiMinhCityBranch', 'Chi nhánh TP.HCM'),
          probability: 58.9,
          level: 'Medium',
          drivers: t('dataAnalytics.group2BadDebtRatioReaches', 'Tỷ lệ nợ xấu nhóm 2 chạm ngưỡng cảnh báo, sáp nhập phòng giao dịch mới.'),
        },
        {
          key: '4',
          branch: t('dataAnalytics.informationTechnologyItDivision', 'Khối Công nghệ Thông tin (IT)'),
          probability: 21.5,
          level: 'Low',
          drivers: t('dataAnalytics.securityControlsWorkWellNoCore', 'Chốt kiểm soát bảo mật hoạt động tốt, không có sự cố core banking downtime.'),
        }
      ]);
      message.success({ content: t('dataAnalytics.trainingRunningMachineLearningPredictionsComplete', 'Huấn luyện & Chạy dự đoán Học máy hoàn tất!'), key: 'ml_run', duration: 3 });
      setMlLoading(false);
    }, 2000);
  };

  // GenAI NLP Analyzer
  const handleRunAiAnalysis = async () => {
    if (!draftDescription.trim()) {
      message.warning(t('dataAnalytics.pleaseEnterADraftDescriptionOf', 'Vui lòng nhập nội dung nháp mô tả sai phạm để AI phân tích'));
      return;
    }

    setAiLoading(true);
    setAiSuggestion(null);
    try {
      const response = await api.post('/ai/suggest-finding', { description: draftDescription });
      setAiSuggestion(response.data);
      message.success(t('dataAnalytics.aiCompletesAnalysisSuggestsAuditFindings', 'AI hoàn tất phân tích & gợi ý cấu trúc phát hiện kiểm toán!'));
    } catch (error) {
      console.error('Failed to run AI suggestion', error);
      message.error(t('dataAnalytics.errorConnectingToSmartAuditAi', 'Lỗi khi kết nối tới Smart Audit AI Hub'));
    } finally {
      setAiLoading(false);
    }
  };

  // 1. Audit Sampling Calculator
  const handleCalculateSample = (values: any) => {
    const { population, confidence, errorRate } = values;
    // z-scores for confidence levels: 90% = 1.645, 95% = 1.96, 99% = 2.576
    let z = 1.96;
    if (confidence === 90) z = 1.645;
    if (confidence === 99) z = 2.576;

    const p = 0.5; // assume max variance
    const e = errorRate / 100;

    // Cochran's formula: n0 = (Z^2 * p * q) / e^2
    const n0 = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(e, 2);

    // Finite population correction: n = n0 / (1 + (n0 - 1) / N)
    const n = n0 / (1 + (n0 - 1) / population);

    setSampleResult(Math.ceil(n));
    message.success(t('dataAnalytics.sampleSizeCalculated', 'Đã tính toán cỡ mẫu!'));
  };

  // 2. CAATTs Analytics
  const handleRunAnalytics = async () => {
    if (!scriptContent.trim() && scriptType === 'custom') {
      message.warning('Vui lòng nhập script để chạy');
      return;
    }

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const res = await api.post('/analytics/execute', { script: scriptContent, type: scriptType });
      setAnalysisResult(res.data);
      message.success(t('dataAnalytics.completeAnalysis', 'Hoàn thành phân tích'));
    } catch (e) {
      message.error(t('dataAnalytics.errorRunningAnalysisScript', 'Lỗi khi chạy kịch bản phân tích'));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleTemplateChange = (val: string) => {
    setScriptType(val);
    if (val === 'duplicates') {
      setScriptContent("SELECT tx_id, amount, date\nFROM transactions\nGROUP BY amount, date\nHAVING COUNT(*) > 1;");
    } else if (val === 'benford') {
      setScriptContent("SELECT LEFT(amount::text, 1) as digit, COUNT(*) as freq\nFROM transactions\nGROUP BY digit;");
    } else {
      setScriptContent("");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Title level={3} className="!mb-1"><CalculatorOutlined className="mr-2" />Data Analytics & Fieldwork Tools</Title>
        <Text className="text-gray-500">{t('dataAnalytics.subtitle', 'Công cụ Phân tích Dữ liệu và Hỗ trợ Lấy mẫu Kiểm toán')}</Text>
      </div>

      <Tabs defaultActiveKey="1" className="bg-white p-4 rounded-lg shadow-sm">
        {/* Tab 1: Audit Sampling Calculator */}
        <Tabs.TabPane tab={<span><CalculatorOutlined />{t('dataAnalytics.tabs.sampling', 'Công cụ Lấy mẫu (Audit Sampling)')}</span>} key="1">
          <Row gutter={24} className="mt-4">
            <Col xs={24} md={12}>
              <Card title={t('dataAnalytics.samplingParameters', 'Tham số Lấy mẫu')} variant="borderless" className="bg-gray-50 h-full border border-gray-200">
                <Form form={sampleForm} layout="vertical" onFinish={handleCalculateSample}>
                  <Form.Item name="population" label={t('dataAnalytics.overallPopulationSizeN', 'Tổng thể (Population Size - N)')} rules={[{ required: true }]} initialValue={10000}>
                    <InputNumber min={1} className="w-full" />
                  </Form.Item>
                  <Form.Item name="confidence" label={t('dataAnalytics.confidenceLevel', 'Độ tin cậy (Confidence Level)')} rules={[{ required: true }]} initialValue={95}>
                    <Select>
                      <Option value={90}>90%</Option>
                      <Option value={95}>95%</Option>
                      <Option value={99}>99%</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="errorRate" label={t('dataAnalytics.tolerableError', 'Tỷ lệ lỗi chấp nhận được (Tolerable Error %)')} rules={[{ required: true }]} initialValue={5}>
                    <InputNumber min={1} max={100} className="w-full" />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" icon={<CalculatorOutlined />} className="w-full">{t('dataAnalytics.sampleSizeCalculation', 'Tính Cỡ Mẫu')}</Button>
                </Form>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title={t('dataAnalytics.calculationResults', 'Kết quả Tính toán')} variant="borderless" className="h-full border border-gray-200 flex flex-col items-center justify-center">
                {sampleResult ? (
                  <div className="text-center">
                    <Statistic title={t('dataAnalytics.sampleSizeRequiredSampleSizeN', 'Cỡ mẫu Yêu cầu (Sample Size - n)')} value={sampleResult} valueStyle={{ color: '#ea9105', fontSize: '48px' }} suffix={t('dataAnalytics.sample', 'mẫu')} />
                    <Paragraph className="mt-4 text-gray-500">
                      {t('dataAnalytics.withOverall', 'Với tổng thể')} <Text strong>{sampleForm.getFieldValue('population')}</Text>{t('dataAnalytics.reliability', ', độ tin cậy')} <Text strong>{sampleForm.getFieldValue('confidence')}%</Text> {t('dataAnalytics.andErrorMargin', 'và biên độ lỗi')} <Text strong>{sampleForm.getFieldValue('errorRate')}%</Text>{t('dataAnalytics.youNeedRandomTestingAtLeast', ', bạn cần kiểm tra ngẫu nhiên ít nhất')} <Text strong className="text-amber-600">{sampleResult}</Text> {t('dataAnalytics.sampleToDrawConclusions', 'mẫu để đưa ra kết luận.')}
                    </Paragraph>
                    <Button type="dashed" className="mt-4" icon={<CheckCircleOutlined />}>{t('dataAnalytics.applyToWorkingPapers', 'Áp dụng vào Giấy tờ làm việc')}</Button>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">
                    <CalculatorOutlined className="text-4xl mb-4" />
                    <div>{t('dataAnalytics.enterTheParametersAndClickCalculate', 'Nhập tham số và bấm Tính toán để xem kết quả.')}</div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* Tab 2: CAATTs Analytics */}
        <Tabs.TabPane tab={<span><CodeOutlined />{t('dataAnalytics.tabs.caatts', 'Phân tích CAATTs (Computer-Assisted Audit)')}</span>} key="2">
          <Row gutter={24} className="mt-4">
            <Col xs={24} md={10}>
              <Card title={t('dataAnalytics.scriptEditor', 'Trình soạn thảo Script')} variant="borderless" className="h-full border border-gray-200 bg-gray-50">
                <div className="mb-4">
                  <Text className="block mb-2 font-semibold">{t('dataAnalytics.selectScenarioTemplate', 'Chọn Kịch bản (Template):')}</Text>
                  <Select value={scriptType} onChange={handleTemplateChange} className="w-full">
                    <Option value="duplicates">{t('dataAnalytics.detectDuplicateTransactions', 'Phát hiện Giao dịch Trùng lặp')}</Option>
                    <Option value="benford">{t('dataAnalytics.analysisOfBenfordsLawAntifraud', 'Phân tích Định luật Benford (Chống gian lận)')}</Option>
                    <Option value="custom">{t('dataAnalytics.optionalScenarioSqlpython', 'Kịch bản Tự chọn (SQL/Python)')}</Option>
                  </Select>
                </div>
                <div className="mb-4">
                  <Text className="block mb-2 font-semibold">Nội dung Script:</Text>
                  <TextArea 
                    rows={8} 
                    value={scriptContent} 
                    onChange={(e) => setScriptContent(e.target.value)} 
                    className="font-mono bg-[#1e1e1e] text-[#d4d4d4]" 
                    style={{ resize: 'none' }}
                  />
                </div>
                <Button type="primary" onClick={handleRunAnalytics} loading={analyzing} icon={<PlayCircleOutlined />} className="w-full bg-green-600 hover:bg-green-700 border-none">
                  {t('dataAnalytics.runAnalysis', 'Chạy Phân tích')}
                </Button>
              </Card>
            </Col>
            <Col xs={24} md={14}>
              <Card title={t('dataAnalytics.outputLogs', 'Kết quả Phân tích (Output Logs)')} variant="borderless" className="h-full border border-gray-200">
                {analyzing ? (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-500">
                    <Spin size="large" className="mb-4" />
                    <div>{t('dataAnalytics.theSystemIsScanningDataPlease', 'Hệ thống đang quét dữ liệu, vui lòng chờ...')}</div>
                  </div>
                ) : analysisResult ? (
                  <div>
                    <Alert message={analysisResult.message} type={analysisResult.data.length > 0 ? "warning" : "success"} showIcon className="mb-4" />
                    {analysisResult.data.length > 0 && (
                      <Table 
                        dataSource={analysisResult.data} 
                        columns={Object.keys(analysisResult.data[0]).map(k => ({ title: k.toUpperCase(), dataIndex: k, key: k }))}
                        pagination={false}
                        size="small"
                        rowKey="txId"
                      />
                    )}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-400">
                    <CodeOutlined className="text-3xl mr-2" /> {t('dataAnalytics.theResultsWillBeDisplayedHere', 'Kết quả sẽ hiển thị tại đây')}
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>
        
        {/* Tab 3: AI & ML Copilot */}
        <Tabs.TabPane tab={<span><RobotOutlined style={{ color: '#ea9105' }} /> AI & Machine Learning Copilot</span>} key="3">
          <Row gutter={24} className="mt-4">
            {/* Left: ML Predictive Modeling */}
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <span style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThunderboltOutlined style={{ color: '#ea9105' }} /> {t('dataAnalytics.unitRiskForecastingMachineLearningModel', 'Mô hình Học máy Dự báo Rủi ro Đơn vị (XGBoost/Isolation Forest)')}
                  </span>
                }
                variant="borderless" 
                className="h-full border border-gray-200"
                extra={
                  <Button 
                    type="primary" 
                    icon={<SyncOutlined spin={mlLoading} />} 
                    style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
                    onClick={handleRunMlPrediction}
                    loading={mlLoading}
                  >
                    {t('dataAnalytics.runMlPredictions', 'Chạy dự đoán ML')}
                  </Button>
                }
              >
                <Alert 
                  message="AI Predictive Modeling" 
                  description={t('dataAnalytics.multivariateDataAnalysisModelHumanResources', 'Mô hình phân tích dữ liệu đa biến (nhân sự, tài sản, KRI) để dự báo trước xác suất xảy ra sai phạm nghiêm trọng tại các chi nhánh.')}
                  type="info" 
                  showIcon 
                  style={{ marginBottom: 16 }}
                />

                {mlPredictions.length > 0 ? (
                  <Table 
                    dataSource={mlPredictions}
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: t('findingsAnalytics.unitTab.colUnit', 'Đơn vị / Chi nhánh'),
                        dataIndex: 'branch',
                        key: 'branch',
                        render: (text) => <strong style={{ color: '#0f172a' }}>{text}</strong>
                      },
                      {
                        title: t('dataAnalytics.probabilityOfError', 'Xác suất lỗi'),
                        dataIndex: 'probability',
                        key: 'probability',
                        render: (prob) => (
                          <span style={{ fontWeight: 600, color: prob > 70 ? '#ff4d4f' : '#faad14' }}>
                            {prob}%
                          </span>
                        )
                      },
                      {
                        title: t('riskAssessment.dynamicRerating.cols.rating', 'Xếp hạng'),
                        dataIndex: 'level',
                        key: 'level',
                        render: (lvl) => (
                          <Tag color={lvl === 'Critical' ? 'red' : lvl === 'High' ? 'orange' : lvl === 'Medium' ? 'yellow' : 'green'} style={{ fontWeight: 600 }}>
                            {lvl.toUpperCase()}
                          </Tag>
                        )
                      },
                      {
                        title: t('dataAnalytics.keyRiskDriversMlDrivers', 'Tác nhân rủi ro chính (ML Drivers)'),
                        dataIndex: 'drivers',
                        key: 'drivers',
                        render: (text) => <span style={{ fontSize: 11, color: '#8c8c8c' }}>{text}</span>
                      }
                    ]}
                  />
                ) : (
                  <div className="text-center py-12 text-gray-400" style={{ border: '1px dashed #d9d9d9', borderRadius: 8 }}>
                    <ExperimentOutlined style={{ fontSize: 32, marginBottom: 12, color: '#bfbfbf' }} />
                    <div>Bấm nút t('dataAnalytics.runMlPredictions', 'Chạy dự đoán ML') để huấn luyện và hiển thị kết quả phân tích đa biến XGBoost.</div>
                  </div>
                )}
              </Card>
            </Col>

            {/* Right: GenAI NLP Assistant */}
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <span style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RobotOutlined style={{ color: '#ea9105' }} /> {t('dataAnalytics.genaiNlpAssistantDraftingLookingUp', 'Trợ lý GenAI NLP Soạn thảo & Tra cứu Căn cứ Pháp lý')}
                  </span>
                }
                variant="borderless" 
                className="h-full border border-gray-200"
              >
                <div className="mb-4">
                  <Text className="block mb-2 font-semibold">{t('dataAnalytics.enterTheAuditorsRawFieldNotes', 'Nhập ghi chép thực địa thô của Kiểm toán viên:')}</Text>
                  <TextArea 
                    rows={4} 
                    value={draftDescription} 
                    onChange={(e) => setDraftDescription(e.target.value)} 
                    placeholder={t('dataAnalytics.forExampleTheHanoiBranchCredit', 'Ví dụ: nhân viên tín dụng chi nhánh hà nội bỏ qua bước thẩm định thực tế tài sản thế chấp mà vẫn giải ngân 10 tỷ đồng')}
                    className="border-gray-300"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button 
                      size="small" 
                      onClick={() => setDraftDescription(t('dataAnalytics.hanoiBranchCreditOfficerSkippedThe', 'nhân viên tín dụng chi nhánh hà nội bỏ qua bước thẩm định thực tế tài sản thế chấp mà vẫn giải ngân 10 tỷ đồng'))}
                    >
                      {t('dataAnalytics.form1CreditAppraisal', 'Mẫu 1: Thẩm định Tín dụng')}
                    </Button>
                    <Button 
                      size="small" 
                      onClick={() => setDraftDescription(t('dataAnalytics.theInterbankMoneyTransferTransactionHad', 'giao dịch chuyển tiền liên ngân hàng bị lỗi hệ thống downtime kéo dài 2 tiếng làm khách hàng khiếu nại nhiều'))}
                    >
                      {t('dataAnalytics.sample2CoreBankingProblem', 'Mẫu 2: Sự cố Core Banking')}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="primary" 
                  onClick={handleRunAiAnalysis} 
                  loading={aiLoading} 
                  icon={<RobotOutlined />} 
                  style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', color: '#ffffff', fontWeight: 600, width: '100%', marginBottom: 16 }}
                >
                  {t('dataAnalytics.aiStructuredAnalysisRecommendationNlpSuggest', 'AI Phân tích & Đề xuất Cấu trúc (NLP Suggest)')}
                </Button>

                {aiLoading ? (
                  <div className="text-center py-8 text-gray-500">
                    <Spin size="large" className="mb-4" />
                    <div>{t('dataAnalytics.intuitiveAiIsReviewingTheKnowledge', 'Trực giác AI đang rà soát kho tri thức sai phạm & thư viện pháp lý...')}</div>
                  </div>
                ) : aiSuggestion ? (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{t('dataAnalytics.recommendationsFromAiCopilot', 'Đề xuất từ AI Copilot:')}</span>
                      <Tag color="cyan" style={{ fontWeight: 600 }}>Độ tin cậy: {Math.round((aiSuggestion.confidence || 0.9) * 100)}%</Tag>
                    </div>

                    <Row gutter={16} className="mb-3">
                      <Col span={12}>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>{t('dataAnalytics.category', 'Phân loại (Category):')}</div>
                        <Tag color="purple" style={{ fontWeight: 600 }}>{aiSuggestion.suggestedCategory || t('dataAnalytics.creditcompliance', 'Tín dụng / Tuân thủ')}</Tag>
                      </Col>
                      <Col span={12}>
                        <div style={{ fontSize: 11, color: '#8c8c8c' }}>{t('dataAnalytics.severity', 'Mức độ rủi ro (Severity):')}</div>
                        <Tag color={aiSuggestion.suggestedRiskLevel === 'High' ? 'red' : 'orange'} style={{ fontWeight: 600 }}>
                          {(aiSuggestion.suggestedRiskLevel || 'HIGH').toUpperCase()}
                        </Tag>
                      </Col>
                    </Row>

                    <div className="mb-3">
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>{t('dataAnalytics.aisRecommendation', 'Kiến nghị khắc phục của AI (Recommendation):')}</div>
                      <div className="bg-white p-2 rounded border border-gray-300" style={{ fontSize: 12, fontStyle: 'italic' }}>
                        {aiSuggestion.suggestedRecommendation || t('dataAnalytics.itIsNecessaryToCorrectThe', 'Cần chấn chỉnh công tác thẩm định thực tế tài sản và ban hành văn bản nhắc nhở đối với cán bộ tín dụng liên quan.')}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, color: '#8c8c8c' }}>{t('dataAnalytics.proposedLegalBasisCriteria', 'Căn cứ pháp lý đề xuất (Criteria):')}</div>
                      <div className="bg-white p-2 rounded border border-gray-300 font-mono" style={{ fontSize: 11, whiteSpace: 'pre-wrap' }}>
                        {aiSuggestion.suggestedCriteria || t('dataAnalytics.circular132018ttnhnnCircular832025ttnhnnRegulationsOn', 'Thông tư 13/2018/TT-NHNN & Thông tư 83/2025/TT-NHNN - Quy định về hệ thống kiểm soát nội bộ của tổ chức tín dụng, chi nhánh ngân hàng nước ngoài.')}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400" style={{ border: '1px dashed #d9d9d9', borderRadius: 8 }}>
                    <RobotOutlined style={{ fontSize: 32, marginBottom: 12, color: '#bfbfbf' }} />
                    <div>{t('dataAnalytics.enterADraftOrSelectThe', 'Nhập nháp hoặc chọn mẫu thô ở trên rồi bấm nút phân tích AI.')}</div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </Tabs.TabPane>

        {/* Tab 4: Data Ingestion & Pipeline Management */}
        <Tabs.TabPane
          tab={
            <span>
              <DatabaseOutlined />
              {t('dataAnalytics.tabs.dataIngestion', 'Nạp & Pipeline Dữ liệu Thô (Ingestion)')}
            </span>
          }
          key="4"
        >
          <div className="mt-4">
            <Row gutter={16} className="mb-6">
              <Col xs={24} sm={12} md={6}>
                <Card variant="borderless" className="bg-blue-50 border border-blue-200">
                  <Statistic
                    title={t('dataAnalytics.totalBatches', 'Tổng đợt nạp')}
                    value={batchesTotal}
                    prefix={<DatabaseOutlined className="text-blue-500 mr-2" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card variant="borderless" className="bg-green-50 border border-green-200">
                  <Statistic
                    title={t('dataAnalytics.successBatches', 'Nạp thành công')}
                    value={batches.filter((b) => b.status === 'COMPLETED').length}
                    prefix={<CheckCircleOutlined className="text-green-500 mr-2" />}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card variant="borderless" className="bg-amber-50 border border-amber-200">
                  <Statistic
                    title={t('dataAnalytics.hotFolderWatcher', 'Watcher Thư mục')}
                    value={t('dataAnalytics.autoEvery5Min', 'Tự động 5p')}
                    prefix={<FolderOpenOutlined className="text-amber-500 mr-2" />}
                    valueStyle={{ fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card variant="borderless" className="bg-purple-50 border border-purple-200">
                  <Statistic
                    title={t('dataAnalytics.archiveStorage', 'Lưu trữ Bronze')}
                    value="/data/raw_archive"
                    prefix={<CloudUploadOutlined className="text-purple-500 mr-2" />}
                    valueStyle={{ fontSize: 14 }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title={
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span>{t('dataAnalytics.ingestionHistory', 'Lịch sử Thu thập & Xử lý Dữ liệu Thô')}</span>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadTemplate('transactions')}
                    >
                      {t('dataAnalytics.downloadTxTemplate', 'Mẫu Giao dịch (.xlsx)')}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownloadTemplate('metrics')}
                    >
                      {t('dataAnalytics.downloadMetricTemplate', 'Mẫu KRI Metrics (.xlsx)')}
                    </Button>
                    <Button
                      icon={<SyncOutlined spin={scanLoading} />}
                      onClick={handleTriggerScan}
                      loading={scanLoading}
                    >
                      {t('dataAnalytics.scanInboxNow', 'Quét Thư mục Inbox')}
                    </Button>
                    <Button
                      type="primary"
                      icon={<CloudUploadOutlined />}
                      style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', color: '#ffffff', fontWeight: 600 }}
                      onClick={() => setUploadModalVisible(true)}
                    >
                      {t('dataAnalytics.pushRawData', 'Nạp File Dữ liệu Thô')}
                    </Button>
                  </div>
                </div>
              }
              variant="borderless"
              className="border border-gray-200"
            >
              <Table
                dataSource={batches}
                rowKey="id"
                loading={batchesLoading}
                pagination={{
                  current: batchesPage,
                  pageSize: 10,
                  total: batchesTotal,
                  onChange: (p) => fetchBatches(p),
                }}
                columns={[
                  {
                    title: t('dataAnalytics.batchCode', 'Mã Lô'),
                    dataIndex: 'batchCode',
                    key: 'batchCode',
                    render: (text) => <Text strong className="font-mono text-xs text-blue-700">{text}</Text>,
                  },
                  {
                    title: t('dataAnalytics.dataSource', 'Nguồn Dữ liệu'),
                    dataIndex: 'dataSource',
                    key: 'dataSource',
                    render: (source) => {
                      const colors: Record<string, string> = {
                        CORE_BANKING: 'blue',
                        HRM: 'purple',
                        GL_TRANSACTIONS: 'cyan',
                        FILE_DROP_EXCEL: 'green',
                        FILE_DROP_CSV: 'orange',
                        API_PUSH: 'magenta',
                        MANUAL_UPLOAD: 'geekblue',
                      };
                      return <Tag color={colors[source] || 'default'}>{source}</Tag>;
                    },
                  },
                  {
                    title: t('dataAnalytics.fileName', 'File Gốc'),
                    dataIndex: 'fileName',
                    key: 'fileName',
                    render: (name) => <span className="font-mono text-xs">{name}</span>,
                  },
                  {
                    title: t('dataAnalytics.recordCount', 'Tổng / Thành công / Lỗi'),
                    key: 'counts',
                    render: (_, record) => (
                      <span className="text-xs">
                        <b>{record.recordCount}</b> /{' '}
                        <span className="text-green-600 font-semibold">{record.successCount}</span> /{' '}
                        <span className="text-red-600 font-semibold">{record.errorCount}</span>
                      </span>
                    ),
                  },
                  {
                    title: t('dataAnalytics.status', 'Trạng thái'),
                    dataIndex: 'status',
                    key: 'status',
                    render: (status) => {
                      const statusMap: Record<string, { color: string; label: string }> = {
                        QUEUED: { color: 'default', label: 'Chờ xử lý' },
                        PROCESSING: { color: 'processing', label: 'Đang xử lý' },
                        COMPLETED: { color: 'success', label: 'Hoàn tất' },
                        FAILED: { color: 'error', label: 'Lỗi' },
                      };
                      const s = statusMap[status] || { color: 'default', label: status };
                      return <Tag color={s.color}>{s.label}</Tag>;
                    },
                  },
                  {
                    title: t('dataAnalytics.createdAt', 'Thời gian nạp'),
                    dataIndex: 'createdAt',
                    key: 'createdAt',
                    render: (date) => (date ? new Date(date).toLocaleString('vi-VN') : 'N/A'),
                  },
                  {
                    title: t('dataAnalytics.actions', 'Thao tác'),
                    key: 'actions',
                    render: (_, record) => (
                      <div className="flex gap-2">
                        {record.errorLog && (
                          <Button
                            size="small"
                            danger
                            onClick={() => {
                              setSelectedBatch(record);
                              setLogModalVisible(true);
                            }}
                          >
                            {t('dataAnalytics.viewErrorLog', 'Xem Log')}
                          </Button>
                        )}
                        <Button
                          size="small"
                          icon={<ReloadOutlined />}
                          onClick={() => handleReprocessBatch(record.id)}
                        >
                          {t('dataAnalytics.reprocess', 'Chạy lại')}
                        </Button>
                      </div>
                    ),
                  },
                ]}
              />
            </Card>
          </div>

          {/* Modal Nạp File Thô Trực Tiếp */}
          <Modal
            title={t('dataAnalytics.pushRawDataModalTitle', 'Nạp File Dữ liệu Thô (Excel / CSV / JSON)')}
            open={uploadModalVisible}
            onCancel={() => setUploadModalVisible(false)}
            footer={null}
            destroyOnClose
          >
            <div className="py-2">
              <Paragraph className="text-gray-500 text-xs mb-4">
                {t(
                  'dataAnalytics.pushRawDataDescription',
                  'File nạp sẽ được lưu trữ nguyên trạng vào kho Bronze (/data/raw_archive) và tự động kích hoạt Pipeline chuẩn hóa dữ liệu, đánh giá quy tắc kiểm toán và cập nhật cảnh báo KRI.',
                )}
              </Paragraph>

              <Upload.Dragger
                name="file"
                multiple={false}
                customRequest={async ({ file, onSuccess, onError }) => {
                  const formData = new FormData();
                  formData.append('file', file as any);
                  formData.append('dataSource', 'MANUAL_UPLOAD');
                  try {
                    await api.post('/data-ingestion/push', formData, {
                      headers: { 'Content-Type': 'multipart/form-data' },
                    });
                    message.success(t('dataAnalytics.fileUploadSuccess', 'Nạp file thô thành công! Pipeline đang xử lý ngầm.'));
                    setUploadModalVisible(false);
                    fetchBatches(1);
                    onSuccess?.('ok');
                  } catch (err: any) {
                    message.error(t('dataAnalytics.fileUploadFailed', 'Lỗi khi nạp file: ') + err.message);
                    onError?.(err);
                  }
                }}
                accept=".xlsx,.xls,.csv,.json"
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ fontSize: 40, color: '#f59e0b' }} />
                </p>
                <p className="ant-upload-text">
                  {t('dataAnalytics.dragDropText', 'Kéo thả file dữ liệu thô vào đây hoặc click để chọn file')}
                </p>
                <p className="ant-upload-hint">
                  {t('dataAnalytics.dragDropHint', 'Hỗ trợ định dạng .xlsx, .xls, .csv, .json (Dung lượng tối đa 100MB)')}
                </p>
              </Upload.Dragger>
            </div>
          </Modal>

          {/* Modal Xem Chi Tiết Log Lỗi */}
          <Modal
            title={
              <span>
                <ExclamationCircleOutlined className="text-red-500 mr-2" />
                {t('dataAnalytics.errorLogTitle', 'Log Chi Tiết Đợt Nạp')} - {selectedBatch?.batchCode}
              </span>
            }
            open={logModalVisible}
            onCancel={() => setLogModalVisible(false)}
            footer={[
              <Button key="close" onClick={() => setLogModalVisible(false)}>
                {t('common.close', 'Đóng')}
              </Button>,
            ]}
            width={700}
          >
            <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-xs overflow-auto max-h-96 whitespace-pre-wrap">
              {selectedBatch?.errorLog || t('dataAnalytics.noErrorsLogged', 'Không có bản ghi lỗi.')}
            </div>
          </Modal>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default DataAnalytics;
