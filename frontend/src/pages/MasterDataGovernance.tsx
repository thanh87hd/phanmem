import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Table, Tabs, Tag, Button, Space, Typography, Modal, Input, message, Alert, Statistic, Row, Col, Tooltip, Popconfirm
} from 'antd';
import {
  AuditOutlined, CheckCircleOutlined, CloseCircleOutlined, PlusOutlined,
  AlertOutlined, TrophyOutlined, BankOutlined, SafetyCertificateOutlined,
  FileTextOutlined, SyncOutlined
} from '@ant-design/icons';
import api from '../services/api';
import ProposeChangeModal from '../components/ProposeChangeModal';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const MasterDataGovernancePage: React.FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [isProposeModalVisible, setIsProposeModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'ORGANIZATION' | 'RISK' | 'DEFECT'>('ORGANIZATION');

  // Approval modal state
  const [isApproveModalVisible, setIsApproveModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approvalLevel, setApprovalLevel] = useState<'L1' | 'L2'>('L1');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [resReqs, resSummary] = await Promise.all([
        api.get('/master-data-changes'),
        api.get('/master-data-changes/emerging-risks-summary'),
      ]);
      setRequests(resReqs.data);
      setSummary(resSummary.data);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải danh sách yêu cầu thay đổi danh mục');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleOpenApproveModal = (req: any, level: 'L1' | 'L2') => {
    setSelectedRequest(req);
    setApprovalLevel(level);
    setApprovalNotes('');
    setIsApproveModalVisible(true);
  };

  const handleApproveSubmit = async () => {
    if (!selectedRequest) return;
    try {
      setSubmitting(true);
      const endpoint =
        approvalLevel === 'L1'
          ? `/master-data-changes/${selectedRequest.id}/approve-l1`
          : `/master-data-changes/${selectedRequest.id}/approve-l2`;

      await api.post(endpoint, { notes: approvalNotes });
      message.success(
        approvalLevel === 'L1'
          ? 'Đã duyệt cấp Phòng (L1)! Yêu cầu đã được chuyển lên Lãnh đạo Khối phê duyệt.'
          : 'Đã phê duyệt chính thức (L2)! Dữ liệu đã được cập nhật vào danh mục hệ thống và ghi nhận BSC-KPI.',
      );
      setIsApproveModalVisible(false);
      fetchRequests();
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi phê duyệt');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await api.post(`/master-data-changes/${id}/reject`, { reason: 'Không phù hợp' });
      message.info('Đã từ chối yêu cầu thay đổi danh mục');
      fetchRequests();
    } catch (err: any) {
      message.error('Lỗi khi từ chối yêu cầu');
    }
  };

  const categoryTag = (cat: string) => {
    if (cat === 'ORGANIZATION') return <Tag color="blue">🏢 Cơ cấu ĐVKD</Tag>;
    if (cat === 'RISK') return <Tag color="orange">⚠️ Danh mục Rủi ro</Tag>;
    if (cat === 'DEFECT') return <Tag color="purple">📋 Danh mục Lỗi</Tag>;
    return <Tag>{cat}</Tag>;
  };

  const statusTag = (st: string) => {
    if (st === 'Pending_L1') return <Tag color="processing">Chờ Phòng soát xét (L1)</Tag>;
    if (st === 'Pending_L2') return <Tag color="warning">Chờ Khối duyệt (L2)</Tag>;
    if (st === 'Approved') return <Tag color="success">Đã phê duyệt</Tag>;
    if (st === 'Rejected') return <Tag color="error">Đã từ chối</Tag>;
    return <Tag>{st}</Tag>;
  };

  const columns = [
    {
      title: 'Mã YC',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number) => <span className="font-semibold text-slate-800">#CR-{id}</span>,
    },
    {
      title: 'Phân loại Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (c: string) => categoryTag(c),
    },
    {
      title: 'Hình thức',
      dataIndex: 'changeType',
      key: 'changeType',
      width: 120,
      render: (t: string) => <Tag color="cyan">{t}</Tag>,
    },
    {
      title: 'Nội dung Thay đổi',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: any) => (
        <div>
          <div className="font-semibold text-slate-800">{title}</div>
          <div className="text-xs text-slate-500">{record.reason}</div>
          {record.isMidYearAddition && (
            <Tag color="volcano" className="mt-1">
              ⭐ Rủi ro Mới (BSC Bonus: +{record.kpiBonusPoints || (record.riskImpactLevel === 3 ? 5 : record.riskImpactLevel === 2 ? 3 : 1)}đ)
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Người đề xuất',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
      width: 140,
      render: (name: string, record: any) => (
        <div>
          <div>{name || 'KTV'}</div>
          <div className="text-xs text-slate-400">{dayjs(record.createdAt).format('DD/MM/YYYY')}</div>
        </div>
      ),
    },
    {
      title: 'Trạng thái Phê duyệt',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (s: string) => statusTag(s),
    },
    {
      title: 'Thao tác Phê duyệt 2 Cấp',
      key: 'action',
      width: 220,
      render: (_: any, record: any) => (
        <Space>
          {record.status === 'Pending_L1' && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleOpenApproveModal(record, 'L1')}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Phòng duyệt L1
            </Button>
          )}
          {record.status === 'Pending_L2' && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleOpenApproveModal(record, 'L2')}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Khối duyệt L2
            </Button>
          )}
          {(record.status === 'Pending_L1' || record.status === 'Pending_L2') && (
            <Popconfirm title="Từ chối yêu cầu này?" onConfirm={() => handleReject(record.id)}>
              <Button size="small" danger>
                Từ chối
              </Button>
            </Popconfirm>
          )}
          {record.status === 'Approved' && (
            <Tag color="green" icon={<CheckCircleOutlined />}>
              Đã thực thi
            </Tag>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ fontFamily: 'Outfit, sans-serif' }}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={3} className="!mb-1">
            <AuditOutlined style={{ color: '#ea9105', marginRight: 8 }} />
            Quản trị Tập Trung Danh Mục & Phê Duyệt Thay Đổi (Change Governance Hub)
          </Title>
          <Text type="secondary">
            Kiểm soát thay đổi 3 danh mục lõi (Cơ cấu ĐVKD, Rủi ro, 924 Lỗi THUCTE) · Quy trình phê duyệt 2 cấp (Phòng L1 $\rightarrow$ Khối L2) · Đánh giá Rủi ro Mới tích hợp BSC-KPI (MB02.HRM.2026)
          </Text>
        </div>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsProposeModalVisible(true)}
            style={{ backgroundColor: '#ea9105', borderColor: '#ea9105' }}
          >
            Đề xuất Thay đổi Danh mục
          </Button>
          <Button icon={<SyncOutlined />} onClick={fetchRequests}>
            Làm mới
          </Button>
        </Space>
      </div>

      {/* STATS OVERVIEW */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card variant="borderless" className="shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
            <Statistic
              title="Tổng số Đề xuất Thay đổi"
              value={requests.length}
              prefix={<FileTextOutlined className="text-blue-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-sm bg-gradient-to-r from-amber-50 to-orange-50">
            <Statistic
              title="Chờ Phòng / Khối Duyệt"
              value={requests.filter((r) => r.status.startsWith('Pending')).length}
              prefix={<AlertOutlined className="text-amber-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-sm bg-gradient-to-r from-rose-50 to-pink-50">
            <Statistic
              title="Rủi ro & Lỗi mới Phát sinh (Emerging)"
              value={summary?.totalEmergingRequests || 0}
              prefix={<AlertOutlined className="text-rose-500" />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card variant="borderless" className="shadow-sm bg-gradient-to-r from-emerald-50 to-green-50">
            <Statistic
              title="Tổng Điểm BSC-KPI Thưởng Đã Ghi Nhận"
              value={summary?.totalKpiBonusEarned || 0}
              suffix="điểm"
              prefix={<TrophyOutlined className="text-emerald-500" />}
            />
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" className="shadow-sm">
        <Tabs
          defaultActiveKey="ALL"
          items={[
            {
              key: 'ALL',
              label: `Tất cả Yêu cầu (${requests.length})`,
              children: <Table size="small" columns={columns} dataSource={requests} rowKey="id" loading={loading} />,
            },
            {
              key: 'PENDING',
              label: `Đang chờ Phê duyệt (${requests.filter((r) => r.status.startsWith('Pending')).length})`,
              children: (
                <Table
                  size="small"
                  columns={columns}
                  dataSource={requests.filter((r) => r.status.startsWith('Pending'))}
                  rowKey="id"
                  loading={loading}
                />
              ),
            },
            {
              key: 'EMERGING',
              label: `⭐ Rủi ro Mới Phát sinh trong năm (${requests.filter((r) => r.isMidYearAddition).length})`,
              children: (
                <Table
                  size="small"
                  columns={columns}
                  dataSource={requests.filter((r) => r.isMidYearAddition)}
                  rowKey="id"
                  loading={loading}
                />
              ),
            },
          ]}
        />
      </Card>

      {/* APPROVAL MODAL */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined className="text-emerald-500" />
            <span>
              {approvalLevel === 'L1'
                ? 'Phê Duyệt Cấp 1 (Lãnh đạo Phòng soát xét)'
                : 'Phê Duyệt Cấp 2 (Lãnh đạo Khối / Trưởng Ban KTNB)'}
            </span>
          </Space>
        }
        open={isApproveModalVisible}
        onCancel={() => setIsApproveModalVisible(false)}
        onOk={handleApproveSubmit}
        confirmLoading={submitting}
        okText={approvalLevel === 'L1' ? 'Xác nhận & Chuyển Lãnh đạo Khối' : 'Phê duyệt & Áp dụng hệ thống'}
        cancelText="Hủy"
        width={600}
      >
        {selectedRequest && (
          <div className="space-y-3">
            <div className="bg-slate-50 p-3 rounded border text-xs space-y-1">
              <div>• <b>Phân loại:</b> {selectedRequest.category} | <b>Hình thức:</b> {selectedRequest.changeType}</div>
              <div>• <b>Nội dung:</b> {selectedRequest.title}</div>
              <div>• <b>Căn cứ / Số Quyết định:</b> {selectedRequest.proposedData?.decisionNumber || 'Chưa cập nhật'}</div>
              <div>• <b>Lý do:</b> {selectedRequest.reason}</div>
              {selectedRequest.isMidYearAddition && (
                <div className="text-rose-600 font-semibold">
                  • Đây là Rủi ro Mới phát sinh trong năm $\rightarrow$ Sẽ kích hoạt tích hợp điểm thưởng BSC-KPI sau khi duyệt.
                </div>
              )}
            </div>

            {/* SO SÁNH SỐ LIỆU TRƯỚC VÀ SAU THAY ĐỔI */}
            {selectedRequest.category === 'ORGANIZATION' && (
              <div className="border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                <Text strong className="text-xs text-slate-800 mb-2 block">
                  So sánh Số Liệu Trước & Sau Biến Động:
                </Text>
                <Row gutter={12}>
                  <Col span={12}>
                    <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs">
                      <div className="font-bold text-rose-800 mb-1">1. Đơn Vị Cũ (Trước Thay Đổi)</div>
                      {selectedRequest.currentData ? (
                        <div className="space-y-0.5 text-slate-700">
                          <div>• Mã: <Text code>{selectedRequest.currentData.code}</Text></div>
                          <div>• Tên: {selectedRequest.currentData.name}</div>
                          <div>• Loại: <Tag color="orange">{selectedRequest.currentData.unitType}</Tag></div>
                          <div className="text-[11px] text-rose-600 font-semibold mt-1">
                            $\rightarrow$ Đã đóng băng Snapshot trong <code>department_histories</code>.
                          </div>
                        </div>
                      ) : (
                        <div className="text-slate-400 italic">Thành lập mới</div>
                      )}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-xs">
                      <div className="font-bold text-emerald-800 mb-1">2. Đơn Vị Mới (Sau Thay Đổi)</div>
                      <div className="space-y-0.5 text-slate-700">
                        <div>• Mã: <Text code>{selectedRequest.proposedData?.code}</Text></div>
                        <div>• Tên: {selectedRequest.proposedData?.name}</div>
                        <div>• Loại: <Tag color="green">{selectedRequest.proposedData?.unitType}</Tag></div>
                        <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                          $\rightarrow$ Kế thừa điểm rủi ro & chuyển giao các Finding chưa đóng.
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </div>
            )}

            <div>
              <Text strong>Ý kiến chỉ đạo & Ghi chú phê duyệt:</Text>
              <TextArea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Nhập ý kiến chỉ đạo của Lãnh đạo..."
                className="mt-1"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* PROPOSE CHANGE MODAL */}
      <ProposeChangeModal
        visible={isProposeModalVisible}
        onCancel={() => setIsProposeModalVisible(false)}
        onSuccess={() => {
          setIsProposeModalVisible(false);
          fetchRequests();
        }}
        defaultCategory={selectedCategory}
      />
    </div>
  );
};

export default MasterDataGovernancePage;
