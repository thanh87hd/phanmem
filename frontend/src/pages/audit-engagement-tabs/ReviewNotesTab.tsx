import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  message,
  Select,
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  SafetyOutlined,
  MessageOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export interface ReviewNotesTabProps {
  engagementId: number;
  currentUser: any;
  workingPapers?: any[];
  workstreams?: any[];
  onNotesUpdated?: () => void;
}

export const ReviewNotesTab: React.FC<ReviewNotesTabProps> = ({
  engagementId,
  currentUser,
  workingPapers = [],
  workstreams = [],
  onNotesUpdated,
}) => {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal tạo điểm soát xét
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [creating, setCreating] = useState(false);

  // Modal giải trình
  const [respondModalVisible, setRespondModalVisible] = useState(false);
  const [selectedNoteForRespond, setSelectedNoteForRespond] = useState<any | null>(null);
  const [responseForm] = Form.useForm();
  const [responding, setResponding] = useState(false);

  const fetchNotes = async () => {
    if (!engagementId) return;
    setLoading(true);
    try {
      const res = await api.get(`/working-papers/review-notes?engagementId=${engagementId}`);
      setNotes(res.data || []);
      onNotesUpdated?.();
    } catch (err: any) {
      console.error('Lỗi tải danh sách Review Notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [engagementId]);

  const openCount = notes.filter((n) => n.status === 'OPEN').length;
  const resolvedCount = notes.filter((n) => n.status === 'RESOLVED').length;
  const closedCount = notes.filter((n) => n.status === 'CLOSED').length;
  const unclosedCount = openCount + resolvedCount;

  const handleCreateNote = async (values: any) => {
    setCreating(true);
    try {
      await api.post('/working-papers/review-notes', {
        engagementId,
        workingPaperId: values.workingPaperId || null,
        workstreamId: values.workstreamId || null,
        note: values.note.trim(),
      });
      message.success('Đã tạo điểm soát xét (MB-10) thành công');
      createForm.resetFields();
      setCreateModalVisible(false);
      fetchNotes();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi tạo điểm soát xét');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenRespond = (note: any) => {
    setSelectedNoteForRespond(note);
    responseForm.setFieldsValue({ response: note.auditorResponse || '' });
    setRespondModalVisible(true);
  };

  const handleConfirmRespond = async (values: any) => {
    if (!selectedNoteForRespond) return;
    setResponding(true);
    try {
      await api.post(`/working-papers/review-notes/${selectedNoteForRespond.id}/respond`, {
        response: values.response.trim(),
      });
      message.success('Đã gửi giải trình điểm soát xét');
      setRespondModalVisible(false);
      fetchNotes();
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Lỗi khi gửi giải trình');
    } finally {
      setResponding(false);
    }
  };

  const handleCloseNote = (note: any) => {
    Modal.confirm({
      title: `Ký đóng Điểm soát xét ${note.reviewSeq || `#${note.id}`}?`,
      icon: <CheckCircleOutlined className="text-emerald-500" />,
      content: 'Người soát xét / Trưởng đoàn xác nhận giải trình của KTV đạt yêu cầu và chính thức ĐÓNG điểm soát xét theo chuẩn IIA 1311.',
      okText: 'Xác nhận Đóng',
      cancelText: 'Hủy',
      okButtonProps: { className: 'bg-emerald-600 hover:bg-emerald-700' },
      onOk: async () => {
        try {
          await api.post(`/working-papers/review-notes/${note.id}/close`);
          message.success('Đã đóng điểm soát xét thành công');
          fetchNotes();
        } catch (err: any) {
          message.error(err?.response?.data?.message || 'Lỗi khi đóng điểm soát xét');
        }
      },
    });
  };

  const columns = [
    {
      title: 'Mã Ref',
      dataIndex: 'reviewSeq',
      key: 'reviewSeq',
      width: 100,
      render: (val: string, r: any) => (
        <Tag color="purple" className="font-bold font-mono">
          {val || `RN-${r.id}`}
        </Tag>
      ),
    },
    {
      title: 'Hồ sơ liên kết (WP / Phân hành)',
      key: 'target',
      width: 200,
      render: (_: any, r: any) => {
        if (r.workingPaper) {
          return (
            <div>
              <span className="font-semibold text-slate-800 text-xs block">
                {r.workingPaper.referenceCode || 'WP'} - {r.workingPaper.title}
              </span>
              <Text type="secondary" className="text-[11px]">Giấy tờ làm việc</Text>
            </div>
          );
        }
        if (r.workstream) {
          return (
            <div>
              <span className="font-semibold text-slate-800 text-xs block">
                {r.workstream.title}
              </span>
              <Text type="secondary" className="text-[11px]">Phân hành kiểm toán</Text>
            </div>
          );
        }
        return <Text type="secondary" className="text-xs italic">Toàn bộ cuộc KT</Text>;
      },
    },
    {
      title: 'Ý kiến chỉ đạo của Người soát xét',
      dataIndex: 'note',
      key: 'note',
      render: (val: string, r: any) => (
        <div className="space-y-1">
          <Paragraph className="mb-0 text-xs text-slate-800 font-medium whitespace-pre-wrap">
            {val}
          </Paragraph>
          <div className="text-[11px] text-slate-400">
            Bởi <span className="font-semibold text-slate-600">{r.reviewerName || 'Người soát xét'}</span> • {dayjs(r.createdAt).format('DD/MM/YYYY HH:mm')}
          </div>
        </div>
      ),
    },
    {
      title: 'KTV Giải trình / Bổ sung tài liệu',
      key: 'auditorResponse',
      render: (_: any, r: any) => {
        if (!r.auditorResponse) {
          return <span className="text-amber-600 text-xs italic">Chưa giải trình</span>;
        }
        return (
          <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <Paragraph className="mb-0 text-xs text-slate-700 whitespace-pre-wrap">
              {r.auditorResponse}
            </Paragraph>
            <div className="text-[11px] text-slate-400">
              Bởi <span className="font-semibold text-slate-600">{r.auditorName || 'KTV'}</span> • {r.responseAt ? dayjs(r.responseAt).format('DD/MM/YYYY HH:mm') : ''}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (st: string) => {
        if (st === 'CLOSED') {
          return <Tag color="success" className="font-semibold text-xs">✓ Đã đóng (Closed)</Tag>;
        }
        if (st === 'RESOLVED') {
          return <Tag color="processing" className="font-semibold text-xs">⏳ Chờ duyệt đóng</Tag>;
        }
        return <Tag color="error" className="font-semibold text-xs">⚠️ Đang mở (Open)</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 170,
      render: (_: any, r: any) => (
        <Space size="small">
          {r.status !== 'CLOSED' && (
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() => handleOpenRespond(r)}
              className="text-xs"
            >
              Giải trình
            </Button>
          )}
          {r.status !== 'CLOSED' && (
            <Button
              type="primary"
              size="small"
              icon={<SafetyOutlined />}
              onClick={() => handleCloseNote(r)}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold"
            >
              Ký đóng
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 pt-1">
      {/* Thống kê tiến độ */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card size="small" className="rounded-xl border border-slate-200 shadow-sm">
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500">TỔNG ĐIỂM SOÁT XÉT</span>}
              value={notes.length}
              prefix={<AuditOutlined className="text-purple-600 mr-1" />}
              valueStyle={{ fontWeight: 700, fontSize: 20 }}
              suffix={<span className="text-xs text-slate-400 font-normal">điểm</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="rounded-xl border border-rose-200 bg-rose-50/30 shadow-sm">
            <Statistic
              title={<span className="text-xs font-semibold text-rose-800">ĐANG MỞ (CẦN GIẢI TRÌNH)</span>}
              value={openCount}
              prefix={<ExclamationCircleOutlined className="text-rose-600 mr-1" />}
              valueStyle={{ color: '#e11d48', fontWeight: 700, fontSize: 20 }}
              suffix={<span className="text-xs text-rose-600 font-normal">điểm</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="rounded-xl border border-blue-200 bg-blue-50/30 shadow-sm">
            <Statistic
              title={<span className="text-xs font-semibold text-blue-800">ĐÃ GIẢI TRÌNH (CHỜ ĐÓNG)</span>}
              value={resolvedCount}
              prefix={<MessageOutlined className="text-blue-600 mr-1" />}
              valueStyle={{ color: '#2563eb', fontWeight: 700, fontSize: 20 }}
              suffix={<span className="text-xs text-blue-600 font-normal">điểm</span>}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" className="rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
            <Statistic
              title={<span className="text-xs font-semibold text-emerald-800">ĐÃ ĐÓNG HOÀN TẤT</span>}
              value={closedCount}
              prefix={<CheckCircleOutlined className="text-emerald-600 mr-1" />}
              valueStyle={{ color: '#059669', fontWeight: 700, fontSize: 20 }}
              suffix={<span className="text-xs text-emerald-600 font-normal">điểm</span>}
            />
          </Card>
        </Col>
      </Row>

      {/* Cảnh báo Hard Gate theo chuẩn IIA 1311 */}
      {unclosedCount > 0 ? (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined className="text-base text-amber-600" />}
          className="rounded-xl border-amber-200 bg-amber-50 shadow-sm"
          message={
            <span className="font-bold text-amber-900 text-sm">
              Cổng Kiểm Soát Chất Lượng IIA 1311 (Supervisory Review Gate - MB-10)
            </span>
          }
          description={
            <div className="text-amber-800 text-xs mt-1">
              Cuộc kiểm toán hiện còn <strong>{unclosedCount} điểm soát xét chưa được Người soát xét xác nhận ĐÓNG</strong>. 
              Hệ thống kích hoạt Hard Gate: <em>Chặn phê duyệt Giấy tờ làm việc (Working Paper) và Phân hành kiểm toán</em> cho đến khi toàn bộ các điểm soát xét được Người soát xét thẩm định và ký ĐÓNG.
            </div>
          }
        />
      ) : notes.length > 0 ? (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined className="text-base text-emerald-600" />}
          className="rounded-xl border-emerald-200 bg-emerald-50 shadow-sm"
          message={
            <span className="font-bold text-emerald-900 text-sm">
              Đạt Chuẩn Kiểm Soát Chất Lượng IIA 1311: 100% Điểm Soát Xét Đã Được Đóng
            </span>
          }
          description={
            <span className="text-emerald-800 text-xs">
              Toàn bộ các điểm soát xét của cuộc kiểm toán đã được giải trình và chuẩn y đóng. Hồ sơ đáp ứng tiêu chí chất lượng để chuyển giai đoạn Báo cáo & Họp đóng.
            </span>
          }
        />
      ) : null}

      {/* Bảng danh sách Điểm soát xét */}
      <Card
        variant="borderless"
        className="shadow-sm rounded-xl"
        title={
          <div className="flex justify-between items-center">
            <div>
              <Title level={5} className="!mb-0">
                Sổ tay Điểm Soát Xét Của Lãnh Đạo Đoàn (Mẫu Biểu MB-10)
              </Title>
              <Text type="secondary" className="text-xs">
                Theo dõi quá trình kiểm soát chất lượng, chỉ đạo của Người soát xét và giải trình của KTV theo Chuẩn mực IIA 1311.
              </Text>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
              className="bg-purple-600 hover:bg-purple-700 font-semibold text-xs h-9 rounded-lg"
            >
              Thêm Điểm Soát Xét
            </Button>
          </div>
        }
      >
        <Table
          columns={columns}
          dataSource={notes}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 1000 }}
          className="rounded-lg overflow-hidden"
        />
      </Card>

      {/* Modal Tạo Điểm Soát Xét Mới */}
      <Modal
        title={
          <Space>
            <AuditOutlined className="text-purple-600" />
            <span className="font-semibold text-slate-800">Tạo Điểm Soát Xét Mới (Mẫu biểu MB-10)</span>
          </Space>
        }
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateNote} className="pt-2">
          <Form.Item
            name="workingPaperId"
            label={<span className="font-semibold text-xs text-slate-700">Gắn với Giấy tờ làm việc (Working Paper)</span>}
          >
            <Select placeholder="Chọn Working Paper cần soát xét (tùy chọn)..." allowClear showSearch optionFilterProp="children">
              {workingPapers.map((wp) => (
                <Option key={wp.id} value={wp.id}>
                  [{wp.referenceCode || 'WP'}] {wp.title}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="workstreamId"
            label={<span className="font-semibold text-xs text-slate-700">Gắn với Phân hành kiểm toán</span>}
          >
            <Select placeholder="Chọn phân hành kiểm toán (tùy chọn)..." allowClear showSearch optionFilterProp="children">
              {workstreams.map((ws) => (
                <Option key={ws.id} value={ws.id}>
                  {ws.title} {ws.assignedAuditorName ? `(${ws.assignedAuditorName})` : ''}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="note"
            label={<span className="font-semibold text-xs text-slate-700">Nội dung chỉ đạo / Yêu cầu làm rõ <span className="text-rose-500">*</span></span>}
            rules={[{ required: true, message: 'Vui lòng nhập nội dung chỉ đạo soát xét' }]}
          >
            <TextArea
              rows={4}
              placeholder="Nêu rõ các thiếu sót trong hồ sơ, bằng chứng chưa đầy đủ hoặc thủ tục kiểm tra cần làm rõ..."
            />
          </Form.Item>

          <div className="flex justify-end gap-2 pt-2">
            <Button onClick={() => setCreateModalVisible(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={creating} className="bg-purple-600 hover:bg-purple-700">
              Lưu Điểm Soát Xét
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Modal KTV Giải Trình */}
      <Modal
        title={
          <Space>
            <MessageOutlined className="text-blue-600" />
            <span className="font-semibold text-slate-800">
              KTV Giải Trình Điểm Soát Xét {selectedNoteForRespond?.reviewSeq || `#${selectedNoteForRespond?.id}`}
            </span>
          </Space>
        }
        open={respondModalVisible}
        onCancel={() => setRespondModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <div className="py-1 space-y-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Text type="secondary" className="text-xs block">Ý kiến chỉ đạo của Người soát xét:</Text>
            <Paragraph className="mb-0 text-xs font-medium text-slate-800 mt-1 whitespace-pre-wrap">
              {selectedNoteForRespond?.note}
            </Paragraph>
          </div>

          <Form form={responseForm} layout="vertical" onFinish={handleConfirmRespond}>
            <Form.Item
              name="response"
              label={<span className="font-semibold text-xs text-slate-700">Nội dung giải trình / Bổ sung tài liệu <span className="text-rose-500">*</span></span>}
              rules={[{ required: true, message: 'Vui lòng nhập nội dung giải trình' }]}
            >
              <TextArea
                rows={4}
                placeholder="Giải trình chi tiết các phát hiện, căn cứ thực hiện hoặc ghi rõ tên file bằng chứng bổ sung đã đính kèm..."
              />
            </Form.Item>

            <div className="flex justify-end gap-2 pt-1">
              <Button onClick={() => setRespondModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={responding} className="bg-blue-600 hover:bg-blue-700">
                Gửi Giải Trình
              </Button>
            </div>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default ReviewNotesTab;
