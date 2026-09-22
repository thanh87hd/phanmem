import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Typography, Modal, Form, Select, DatePicker,
  Row, Col, Statistic, Alert, Progress, Tooltip, InputNumber, Divider, message
} from 'antd';
import {
  ExperimentOutlined, PlayCircleOutlined, CheckCircleOutlined,
  WarningOutlined, CloseCircleOutlined, ThunderboltOutlined,
  RadarChartOutlined, LineChartOutlined, BulbOutlined, HistoryOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

interface KriBacktestingTabProps {
  kriRules: any[];
}

export const KriBacktestingTab: React.FC<KriBacktestingTabProps> = ({ kriRules }) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await api.get('/continuous-monitoring/backtesting/results');
      setResults(res.data);
      if (res.data.length > 0 && !selectedResult) {
        setSelectedResult(res.data[0]);
      }
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải kết quả kiểm thử ngược');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleRunBacktest = async (values: any) => {
    try {
      setRunning(true);
      const [startDate, endDate] = values.dateRange;

      const payload = {
        ruleCode: values.ruleCode,
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        strategy: values.strategy || 'HISTORICAL_REPLAY',
        testedThresholds: {
          yellowThreshold: values.yellowThreshold,
          redThreshold: values.redThreshold,
          comparisonOperator: values.comparisonOperator || '>=',
        },
      };

      const res = await api.post('/continuous-monitoring/backtesting/run', payload);
      message.success(`Đã hoàn tất kiểm thử ngược cho Rule ${values.ruleCode}!`);
      setIsModalVisible(false);
      form.resetFields();
      setSelectedResult(res.data);
      fetchResults();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi chạy backtest');
    } finally {
      setRunning(false);
    }
  };

  const columns = [
    {
      title: 'Mã & Tên Rule',
      dataIndex: 'ruleCode',
      key: 'ruleCode',
      render: (code: string, record: any) => (
        <div>
          <div className="font-semibold text-slate-800">{record.ruleName}</div>
          <Text code style={{ fontSize: 11 }}>{code}</Text>
        </div>
      ),
    },
    {
      title: 'Khung Thời Gian',
      key: 'timeRange',
      render: (_: any, record: any) => (
        <span className="text-xs text-slate-600">
          {dayjs(record.startDate).format('DD/MM/YYYY')} $\rightarrow$ {dayjs(record.endDate).format('DD/MM/YYYY')}
        </span>
      ),
    },
    {
      title: 'Độ Nhạy (Recall/Hit Rate)',
      dataIndex: 'hitRateRecall',
      key: 'hitRateRecall',
      render: (val: number) => (
        <div>
          <span className={`font-semibold ${val >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {val}%
          </span>
          <Progress percent={val} size="small" status={val >= 80 ? 'success' : 'normal'} showInfo={false} />
        </div>
      ),
    },
    {
      title: 'Độ Chuẩn Xác (Precision)',
      dataIndex: 'precision',
      key: 'precision',
      render: (val: number) => (
        <span className={`font-semibold ${val >= 70 ? 'text-blue-600' : 'text-slate-600'}`}>
          {val}%
        </span>
      ),
    },
    {
      title: 'Báo Động Giả (FPR)',
      dataIndex: 'falsePositiveRate',
      key: 'falsePositiveRate',
      render: (val: number) => (
        <Tag color={val <= 15 ? 'success' : val <= 30 ? 'warning' : 'error'}>
          {val}%
        </Tag>
      ),
    },
    {
      title: 'F1-Score / AUC',
      key: 'f1Score',
      render: (_: any, record: any) => (
        <div>
          <div><b>F1:</b> {record.f1Score}</div>
          <div className="text-xs text-slate-400"><b>AUC:</b> {record.aucRoc}</div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Button
          size="small"
          type={selectedResult?.id === record.id ? 'primary' : 'default'}
          onClick={() => setSelectedResult(record)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* HEADER ACTION */}
      <div className="flex justify-between items-center bg-gradient-to-r from-slate-900 to-indigo-950 p-4 rounded-xl text-white shadow-md">
        <div>
          <Title level={4} className="!text-white !mb-1">
            <ExperimentOutlined className="text-amber-400 mr-2" />
            Khung Kiểm Thử Ngược Mô Hình Cảnh Báo Sớm Rủi Ro (KRI / EWS Backtesting)
          </Title>
          <Text className="text-slate-300 text-xs">
            Kiểm định độ nhạy bắt nợ xấu (Recall) & tỷ lệ báo động giả (False Positive Rate) trên dữ liệu Point-in-Time lịch sử theo chuẩn Basel & TT 13
          </Text>
        </div>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={() => setIsModalVisible(true)}
          style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', height: 40 }}
          className="font-semibold"
        >
          Chạy Phiên Backtest Mới
        </Button>
      </div>

      {/* DETAILED RESULTS SPOTLIGHT */}
      {selectedResult && (
        <Row gutter={16}>
          {/* CONFUSION MATRIX 2x2 */}
          <Col span={10}>
            <Card
              variant="borderless"
              className="shadow-sm border border-slate-200"
              title={
                <Space>
                  <RadarChartOutlined className="text-blue-500" />
                  <span>Ma Trận Nhầm Lẫn (Confusion Matrix 2x2)</span>
                </Space>
              }
            >
              <div className="text-xs text-slate-500 mb-3">
                Tổng số quan sát chuỗi thời gian: <b>{selectedResult.totalObservations} chu kỳ</b>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                {/* True Positive */}
                <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3">
                  <div className="text-xs text-emerald-800 font-semibold">True Positive (Bắt đúng nợ xấu)</div>
                  <div className="text-2xl font-bold text-emerald-600 mt-1">{selectedResult.truePositives}</div>
                  <div className="text-[11px] text-emerald-700 mt-1">Cảnh báo Đỏ & Nợ chuyển xấu thật</div>
                </div>

                {/* False Positive */}
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                  <div className="text-xs text-amber-800 font-semibold">False Positive (Báo động giả)</div>
                  <div className="text-2xl font-bold text-amber-600 mt-1">{selectedResult.falsePositives}</div>
                  <div className="text-[11px] text-amber-700 mt-1">Cảnh báo Đỏ nhưng KH vẫn an toàn</div>
                </div>

                {/* False Negative */}
                <div className="bg-rose-50 border border-rose-300 rounded-lg p-3">
                  <div className="text-xs text-rose-800 font-semibold">False Negative (Bỏ lọt rủi ro)</div>
                  <div className="text-2xl font-bold text-rose-600 mt-1">{selectedResult.falseNegatives}</div>
                  <div className="text-[11px] text-rose-700 mt-1">Không cảnh báo nhưng phát sinh nợ xấu</div>
                </div>

                {/* True Negative */}
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                  <div className="text-xs text-blue-800 font-semibold">True Negative (Bình thường an toàn)</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{selectedResult.trueNegatives}</div>
                  <div className="text-[11px] text-blue-700 mt-1">Không cảnh báo & Khoản vay tốt</div>
                </div>
              </div>
            </Card>
          </Col>

          {/* AI OPTIMAL THRESHOLD RECOMMENDATION */}
          <Col span={14}>
            <Card
              variant="borderless"
              className="shadow-sm border border-slate-200"
              title={
                <Space>
                  <BulbOutlined className="text-amber-500" />
                  <span>Khuyến Nghị Tối Ưu Hóa Ngưỡng (Walk-Forward Threshold Optimizer)</span>
                </Space>
              }
            >
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Ngưỡng thử nghiệm hiện tại:</span>
                  <span>
                    <Tag color="gold">Vàng: {selectedResult.testedThresholds?.yellowThreshold}</Tag>
                    <Tag color="red">Đỏ: {selectedResult.testedThresholds?.redThreshold}</Tag>
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-emerald-700 font-semibold">Ngưỡng tối ưu AI đề xuất:</span>
                  <span>
                    <Tag color="success">
                      Vàng đề xuất: {selectedResult.optimalThresholdRecommendation?.recommendedYellow}
                    </Tag>
                    <Tag color="error">
                      Đỏ đề xuất: {selectedResult.optimalThresholdRecommendation?.recommendedRed}
                    </Tag>
                  </span>
                </div>
              </div>

              <Alert
                type="info"
                showIcon
                message="Đánh giá & Cơ sở lý luận (Rationale):"
                description={selectedResult.optimalThresholdRecommendation?.rationale}
                className="text-xs"
              />

              <Row gutter={12} className="mt-4">
                <Col span={8}>
                  <Statistic
                    title="Độ Nhạy (Recall)"
                    value={selectedResult.hitRateRecall}
                    suffix="%"
                    valueStyle={{ color: selectedResult.hitRateRecall >= 80 ? '#10b981' : '#f59e0b' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Báo động giả (FPR)"
                    value={selectedResult.falsePositiveRate}
                    suffix="%"
                    valueStyle={{ color: selectedResult.falsePositiveRate <= 15 ? '#10b981' : '#ef4444' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="AUC-ROC"
                    value={selectedResult.aucRoc}
                    valueStyle={{ color: '#3b82f6' }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* TABLE HISTORY */}
      <Card
        variant="borderless"
        className="shadow-sm"
        title={
          <Space>
            <HistoryOutlined />
            <span>Lịch Sử Các Phiên Kiểm Thử Ngược (Backtest Runs)</span>
          </Space>
        }
      >
        <Table
          size="small"
          columns={columns}
          dataSource={results}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* MODAL RUN BACKTEST */}
      <Modal
        title={
          <Space>
            <ExperimentOutlined className="text-amber-500" />
            <span>Cấu Hình & Kích Hoạt Phiên Backtest KRI / EWS</span>
          </Space>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={650}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleRunBacktest}
          initialValues={{
            strategy: 'HISTORICAL_REPLAY',
            dateRange: [dayjs().subtract(1, 'year'), dayjs()],
            yellowThreshold: 3.0,
            redThreshold: 5.0,
            comparisonOperator: '>=',
          }}
        >
          <Form.Item
            name="ruleCode"
            label="Chọn Chỉ số KRI / Mô hình Cảnh báo sớm"
            rules={[{ required: true, message: 'Vui lòng chọn Rule' }]}
          >
            <Select placeholder="Chọn mô hình cần kiểm thử ngược...">
              {kriRules.map((r) => (
                <Option key={r.ruleCode} value={r.ruleCode}>
                  [{r.ruleCode}] {r.metricName || r.ruleName} ({r.category})
                </Option>
              ))}
              <Option value="EWS_DEBT_MIGRATION">EWS - Chuyển nhóm nợ Nợ 1 sang Nợ 2-5</Option>
              <Option value="CAMELS_A_NPL">CAMELS (A) - Tỷ lệ Nợ xấu / Tổng dư nợ</Option>
              <Option value="CAMELS_L_LDR">CAMELS (L) - Tỷ lệ LDR Thanh khoản</Option>
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="strategy" label="Chiến lược Kiểm thử (Strategy)">
                <Select>
                  <Option value="HISTORICAL_REPLAY">Historical Replay (Tái hiện lịch sử)</Option>
                  <Option value="WALK_FORWARD">Walk-Forward Analysis (Cửa sổ trượt)</Option>
                  <Option value="MONTE_CARLO">Monte Carlo Simulation</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="dateRange"
                label="Khung thời gian kiểm thử (In-Sample / Out-of-Sample)"
                rules={[{ required: true }]}
              >
                <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>

          <div className="bg-slate-50 p-3 rounded border mb-4">
            <Text strong className="text-xs text-slate-700">Ngưỡng cảnh báo cần kiểm thử:</Text>
            <Row gutter={16} className="mt-2">
              <Col span={8}>
                <Form.Item name="comparisonOperator" label="Toán tử" className="!mb-0">
                  <Select>
                    <Option value=">=">&gt;= (Lớn hơn hoặc bằng)</Option>
                    <Option value="<=">&lt;= (Nhỏ hơn hoặc bằng)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="yellowThreshold" label="Ngưỡng Vàng" className="!mb-0" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} step={0.1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="redThreshold" label="Ngưỡng Đỏ" className="!mb-0" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} step={0.1} />
                </Form.Item>
              </Col>
            </Row>
          </div>

          <Form.Item className="!mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={running}
              block
              style={{ backgroundColor: '#ea9105', borderColor: '#ea9105', height: 40 }}
              className="font-semibold"
            >
              Bắt đầu Kiểm Thử Ngược & Tối Ưu Hóa Ngưỡng
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KriBacktestingTab;
