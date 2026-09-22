import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Table, Button, Space, Tag, Modal, message, Typography, Input } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;

const EngagementChangeRequests: React.FC = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit-engagements/change-requests?status=Pending');
      setRequests(res.data);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải danh sách yêu cầu thay đổi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests();
  }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/audit-engagements/change-requests/${id}/approve`);
      message.success('Đã phê duyệt yêu cầu thay đổi');
      fetchRequests();
      setIsModalVisible(false);
    } catch (err) {
      message.error('Lỗi khi phê duyệt');
    }
  };

  const handleReject = async (id: number) => {
    try {
      if (!reviewNotes) {
        message.warning('Vui lòng nhập lý do từ chối');
        return;
      }
      await api.post(`/audit-engagements/change-requests/${id}/reject`, { reviewNotes });
      message.success('Đã từ chối yêu cầu thay đổi');
      fetchRequests();
      setIsModalVisible(false);
    } catch (err) {
      message.error('Lỗi khi từ chối');
    }
  };

  const columns = [
    { title: 'Đoàn kiểm toán', dataIndex: ['engagement', 'name'], key: 'engagement' },
    { title: 'Người yêu cầu', dataIndex: 'requesterName', key: 'requesterName' },
    { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
    { 
      title: 'Thời gian gửi', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (val: string) => new Date(val).toLocaleString('vi-VN')
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button type="primary" icon={<EyeOutlined />} onClick={() => {
            setSelectedRequest(record);
            setReviewNotes('');
            setIsModalVisible(true);
          }}>
            Xem chi tiết
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Table columns={columns} dataSource={requests} loading={loading} rowKey="id" />

      <Modal
        title="Chi tiết Yêu cầu thay đổi Đoàn kiểm toán"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setIsModalVisible(false)}>{t('common.btnClose', 'Đóng')}</Button>,
          <Button key="reject" danger icon={<CloseCircleOutlined />} onClick={() => handleReject(selectedRequest?.id)}>{t('common.btnReject', 'Từ chối')}</Button>,
          <Button key="approve" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleApprove(selectedRequest?.id)}>{t('common.btnApprove', 'Phê duyệt')}</Button>
        ]}
        width={800}
      >
        {selectedRequest && (
          <div className="flex flex-col gap-4">
            <div>
              <Text strong>Đoàn kiểm toán: </Text>
              <Text>{selectedRequest.engagement?.name}</Text>
            </div>
            <div>
              <Text strong>Người yêu cầu: </Text>
              <Text>{selectedRequest.requesterName}</Text>
            </div>
            <div>
              <Text strong>Lý do thay đổi: </Text>
              <Text>{selectedRequest.reason}</Text>
            </div>
            <div>
              <Text strong>Dữ liệu thay đổi đề xuất (JSON): </Text>
              <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs mt-2">
                {JSON.stringify(selectedRequest.requestedChanges, null, 2)}
              </pre>
            </div>
            <div>
              <Text strong>Lý do từ chối (nếu từ chối): </Text>
              <Input.TextArea rows={2} value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Nhập lý do từ chối..." className="mt-2" />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default EngagementChangeRequests;
