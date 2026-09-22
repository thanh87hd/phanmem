import React from 'react';
import {
  Card,
  Table,
  Tag,
  Typography,
  Row,
  Col,
  Spin,
  Button,
  Space,
  Select,
  Divider,
  Alert,
  Steps,
  Statistic,
  Upload,
  InputNumber,
  Progress,
} from 'antd';
import {
  UserOutlined,
  DownloadOutlined,
  UploadOutlined,
  FileExcelOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  EditOutlined,
} from '@ant-design/icons';
import type { Mb02Item } from './bscKpiTypes';
import {
  BSC_PILLAR_COLOR,
  XEPLOAI_COLOR,
} from './bscKpiTypes';

const { Text } = Typography;
const { Option } = Select;

interface KpiAssessmentTabProps {
  assessmentLoading: boolean;
  assessmentStatus: 'Draft' | 'Submitted' | 'ApprovedL1' | 'ApprovedL2' | 'Rejected' | 'Confirmed';
  rejectionReason: string;
  isStaffOnly: boolean;
  currentUser: any;
  selectedStaffUser: string;
  setSelectedStaffUser: (val: string) => void;
  assessmentList: any[];
  summaryData: any[];
  exportMb02Csv: () => void;
  handleUploadAssessmentCsv: (file: any) => boolean;
  exportAllDepartmentAssessmentCsv: () => void;
  onOpenPrintModal: () => void;
  calculatedMb02: {
    items: (Mb02Item & { completionRate: number; diemHoanThanh: number })[];
    totalScore: number;
    xepLoai: string;
  };
  handleSaveAssessmentDraft: () => Promise<void>;
  handleSubmitAssessment: () => void;
  onOpenConfirmModal: () => void;
  isDeptHead: boolean;
  isDivisionHead: boolean;
  handleApproveL1: () => void;
  handleApproveL2: () => void;
  onOpenRejectModal: () => void;
  selectedStaffObj: any;
  period: string;
  handleUpdateAssessmentValue: (id: string, val: number) => void;
}

export const KpiAssessmentTab: React.FC<KpiAssessmentTabProps> = ({
  assessmentLoading,
  assessmentStatus,
  rejectionReason,
  isStaffOnly,
  currentUser,
  selectedStaffUser,
  setSelectedStaffUser,
  assessmentList,
  summaryData,
  exportMb02Csv,
  handleUploadAssessmentCsv,
  exportAllDepartmentAssessmentCsv,
  onOpenPrintModal,
  calculatedMb02,
  handleSaveAssessmentDraft,
  handleSubmitAssessment,
  onOpenConfirmModal,
  isDeptHead,
  isDivisionHead,
  handleApproveL1,
  handleApproveL2,
  onOpenRejectModal,
  selectedStaffObj,
  period,
  handleUpdateAssessmentValue,
}) => {
  return (
    <Spin spinning={assessmentLoading}>
      {/* Cảnh báo trạng thái nếu bị Trả lại */}
      {assessmentStatus === 'Rejected' && (
        <Alert
          type="error"
          showIcon
          message={<b>Bản đánh giá đã bị trả lại</b>}
          description={`Lý do: ${rejectionReason || 'Vui lòng cập nhật lại kết quả thực hiện theo yêu cầu của cấp duyệt và gửi lại.'}`}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Thanh điều khiển chọn nhân sự & thao tác */}
      <Card style={{ marginBottom: 16 }} variant="borderless">
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Space wrap size="middle">
              {/* KTV thường: KHÔNG hiển thị dropdown chọn người khác */}
              {isStaffOnly ? (
                <div>
                  <Text type="secondary">Nhân sự được đánh giá:</Text>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                    <UserOutlined style={{ marginRight: 6, color: '#ea9105' }} />
                    {currentUser.fullName || currentUser.username} ({currentUser.username})
                    <Tag color="blue" style={{ marginLeft: 8 }}>
                      {currentUser.department || 'KTNB'}
                    </Tag>
                  </div>
                </div>
              ) : (
                <div>
                  <Text type="secondary">Chọn nhân sự đánh giá:</Text>
                  <div>
                    <Select
                      value={selectedStaffUser}
                      onChange={(u) => {
                        setSelectedStaffUser(u);
                      }}
                      style={{ width: 300 }}
                      showSearch
                      optionFilterProp="children"
                    >
                      {(assessmentList.length > 0 ? assessmentList : summaryData).map(
                        (s: any) => (
                          <Option key={s.username} value={s.username}>
                            <b>{s.fullName || s.username}</b> ({s.username}) —{' '}
                            {s.department || 'KTNB'}
                          </Option>
                        ),
                      )}
                    </Select>
                  </div>
                </div>
              )}

              <Divider type="vertical" style={{ height: 40 }} />

              <div>
                <Text type="secondary">Trạng thái phê duyệt:</Text>
                <div>
                  <Tag
                    color={
                      assessmentStatus === 'ApprovedL2'
                        ? 'green'
                        : assessmentStatus === 'ApprovedL1'
                          ? 'cyan'
                          : assessmentStatus === 'Submitted'
                            ? 'orange'
                            : assessmentStatus === 'Rejected'
                              ? 'red'
                              : 'default'
                    }
                    style={{ fontSize: 13, padding: '2px 8px' }}
                  >
                    {assessmentStatus === 'ApprovedL2'
                      ? '✅ Lãnh Đạo Khối Đã Duyệt Chốt (Cấp 2)'
                      : assessmentStatus === 'ApprovedL1'
                        ? '🔹 Lãnh Đạo Phòng Đã Duyệt (Cấp 1)'
                        : assessmentStatus === 'Submitted'
                          ? '⏳ Đã Gửi Duyệt'
                          : assessmentStatus === 'Rejected'
                            ? '❌ Bị Trả Lại'
                            : '📝 Bản Nháp (Draft)'}
                  </Tag>
                </div>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Button icon={<DownloadOutlined />} onClick={exportMb02Csv}>
                Tải Mẫu (CSV)
              </Button>

              {!isStaffOnly && (
                <Upload
                  beforeUpload={handleUploadAssessmentCsv}
                  showUploadList={false}
                  accept=".csv"
                >
                  <Button icon={<UploadOutlined />}>Upload CSV</Button>
                </Upload>
              )}

              {!isStaffOnly && (
                <Button
                  icon={<FileExcelOutlined />}
                  onClick={exportAllDepartmentAssessmentCsv}
                >
                  Tải Tổng Hợp Phòng
                </Button>
              )}

              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={onOpenPrintModal}
              >
                In Biểu MB02
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Tiến trình 4 bước phê duyệt */}
      <Card style={{ marginBottom: 16 }} variant="borderless">
        <Steps
          current={
            assessmentStatus === 'ApprovedL2'
              ? 3
              : assessmentStatus === 'ApprovedL1'
                ? 2
                : assessmentStatus === 'Submitted'
                  ? 1
                  : 0
          }
          size="small"
          status={assessmentStatus === 'Rejected' ? 'error' : undefined}
          items={[
            {
              title: '1. Điền Điểm (Draft)',
              description: 'KTV / Quản lý nhập kết quả',
            },
            {
              title: '2. Gửi Duyệt (Submitted)',
              description: 'KTV gửi lên Lãnh đạo Phòng',
            },
            {
              title: '3. LĐ Phòng Duyệt (Cấp 1)',
              description: 'Họp 1-1 & LĐP xác nhận',
            },
            {
              title: '4. LĐ Khối Duyệt Chốt (Cấp 2)',
              description: 'Giám đốc Khối phê duyệt',
            },
          ]}
        />
      </Card>

      {/* Thẻ tóm tắt kết quả chấm điểm & Nút hành động */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card variant="borderless" style={{ textAlign: 'center' }}>
            <Statistic
              title="Tổng Tỷ Trọng Phân Giao"
              value={100}
              suffix="%"
              valueStyle={{ color: '#595959', fontSize: 26 }}
            />
            <Text type="secondary">7 tiêu chí chuẩn MB02.HRM.2026</Text>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" style={{ textAlign: 'center' }}>
            <Statistic
              title="Điểm Hoàn Thành Đánh Giá"
              value={(calculatedMb02.totalScore * 100).toFixed(1)}
              suffix="%"
              valueStyle={{
                color: XEPLOAI_COLOR[calculatedMb02.xepLoai] || '#1890ff',
                fontSize: 28,
                fontWeight: 'bold',
              }}
            />
            <Tag
              color={XEPLOAI_COLOR[calculatedMb02.xepLoai] || 'blue'}
              style={{ marginTop: 4 }}
            >
              {calculatedMb02.xepLoai}
            </Tag>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 8 }}>
              Hành động phê duyệt
            </div>
            <Space wrap>
              {/* Nút cho KTV: Lưu Nháp + Gửi Duyệt */}
              {(assessmentStatus === 'Draft' || assessmentStatus === 'Rejected') && (
                <>
                  <Button onClick={handleSaveAssessmentDraft}>Lưu Nháp</Button>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleSubmitAssessment}
                  >
                    Gửi Duyệt
                  </Button>
                </>
              )}

              {/* Nút Họp 1-1 / Nhận xét */}
              <Button icon={<UserOutlined />} onClick={onOpenConfirmModal}>
                Ý Kiến & Họp 1-1
              </Button>

              {/* Nút Phê Duyệt Cấp 1 (Lãnh đạo Phòng) */}
              {(isDeptHead || isDivisionHead) && assessmentStatus === 'Submitted' && (
                <>
                  <Button
                    type="primary"
                    icon={<CheckOutlined />}
                    style={{ backgroundColor: '#13c2c2', borderColor: '#13c2c2' }}
                    onClick={handleApproveL1}
                  >
                    LĐP Duyệt Cấp 1
                  </Button>
                  <Button danger onClick={onOpenRejectModal}>
                    Trả lại
                  </Button>
                </>
              )}

              {/* Nút Phê Duyệt Cấp 2 (Lãnh đạo Khối / Admin) */}
              {isDivisionHead &&
                (assessmentStatus === 'ApprovedL1' ||
                  assessmentStatus === 'Submitted') && (
                  <>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      onClick={handleApproveL2}
                    >
                      LĐK Duyệt Chốt (Cấp 2)
                    </Button>
                    <Button danger onClick={onOpenRejectModal}>
                      Trả lại
                    </Button>
                  </>
                )}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Bảng chấm điểm chi tiết 7 tiêu chí MB02.HRM.2026 */}
      <Card
        title={
          <Space>
            <EditOutlined style={{ color: '#ea9105' }} />
            <span>
              Bảng Chấm Điểm Chi Tiết — {selectedStaffObj?.fullName || selectedStaffUser}{' '}
              ({period})
            </span>
          </Space>
        }
        variant="borderless"
      >
        <Table
          dataSource={calculatedMb02.items}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: 'Trụ Cột & Tỷ Trọng',
              width: 140,
              render: (_: any, row: Mb02Item) => (
                <div>
                  <Tag color={BSC_PILLAR_COLOR[row.nhomTieuChi] || 'default'}>
                    <b>{row.nhomTieuChi}</b>
                  </Tag>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                    Trụ cột: {row.tyTrongPillar}
                  </div>
                </div>
              ),
            },
            {
              title: 'Mục Tiêu & Tiêu Chí (MB02.HRM.2026)',
              render: (_: any, row: Mb02Item) => (
                <div>
                  <div style={{ fontWeight: '600' }}>{row.tieuChi}</div>
                  <div style={{ fontSize: 12, color: '#595959' }}>
                    {row.mucTieuChienLuoc}
                  </div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                    📝 {row.moTa}
                  </div>
                </div>
              ),
            },
            {
              title: 'Tỷ trọng',
              width: 80,
              render: (_: any, row: Mb02Item) => (
                <b>{(row.tyTrong * 100).toFixed(0)}%</b>
              ),
            },
            {
              title: 'Ngưỡng / Giao',
              width: 120,
              render: (_: any, row: Mb02Item) => (
                <div style={{ fontSize: 11 }}>
                  <div>Ngưỡng: {(row.nguong * 100).toFixed(0)}%</div>
                  <div>
                    Giao: <b>{(row.chiTieuGiao * 100).toFixed(0)}%</b>
                  </div>
                  <div>Trần: {(row.mucTran * 100).toFixed(0)}%</div>
                </div>
              ),
            },
            {
              title: 'Phương Pháp Đo Lường',
              width: 160,
              render: (_: any, row: Mb02Item) => (
                <div style={{ fontSize: 11, color: '#595959' }}>
                  <div>{row.phuongPhapDo}</div>
                  <div style={{ color: '#8c8c8c' }}>ĐV: {row.donViLuongHoa}</div>
                </div>
              ),
            },
            {
              title: 'Kết Quả Thực Hiện (%)',
              width: 130,
              render: (_: any, row: Mb02Item) => (
                <InputNumber
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={row.ketQuaThucHien}
                  formatter={(v) => `${(Number(v) * 100).toFixed(0)}%`}
                  parser={(v) => (Number(v?.replace('%', '')) / 100) as any}
                  onChange={(val) => handleUpdateAssessmentValue(row.id, val ?? 1.0)}
                  style={{ width: 95 }}
                />
              ),
            },
            {
              title: 'Tỷ Lệ Hoàn Thành',
              width: 130,
              render: (_: any, row: any) => (
                <Progress
                  percent={Math.round(row.completionRate * 100)}
                  size="small"
                  status={
                    row.completionRate >= 1.0
                      ? 'success'
                      : row.completionRate >= 0.7
                        ? 'active'
                        : 'exception'
                  }
                />
              ),
            },
            {
              title: 'Điểm Hoàn Thành',
              width: 120,
              render: (_: any, row: any) => (
                <Text strong style={{ color: '#ea9105' }}>
                  {(row.diemHoanThanh * 100).toFixed(1)}%
                </Text>
              ),
            },
          ]}
          scroll={{ x: 'max-content' }}
        />

        {/* Hàng tổng cộng */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fafafa',
            padding: '12px 20px',
            marginTop: 12,
            borderRadius: 6,
            border: '1px solid #e8e8e8',
          }}
        >
          <div>
            <Text strong style={{ fontSize: 15 }}>
              TỔNG CỘNG ĐIỂM HOÀN THÀNH:
            </Text>
            <Tag
              color={XEPLOAI_COLOR[calculatedMb02.xepLoai] || 'default'}
              style={{ marginLeft: 12, fontSize: 13 }}
            >
              Phân nhóm: <b>{calculatedMb02.xepLoai}</b>
            </Tag>
          </div>
          <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ea9105' }}>
            {(calculatedMb02.totalScore * 100).toFixed(1)}%
          </div>
        </div>
      </Card>
    </Spin>
  );
};
