import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Popover, List, Button, Typography, Tag, Empty, Space, Tooltip, Modal } from 'antd';
import { BellOutlined, CheckOutlined, CheckCircleOutlined } from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;



interface NotifItem {
  id: number;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

interface Props {
  onNavigate?: (path: string) => void;
}

const NotificationBell: React.FC<Props> = ({ onNavigate }) => {
  const { t } = useTranslation();

  const typeConfig: Record<string, { color: string; label: string }> = {
    REVIEW_REQUEST: { color: 'blue', label: t('notificationBell.review', 'Soát xét') },
    OVERDUE_WARNING: { color: 'red', label: t('findingsAnalytics.remediationTab.legendOverdue', 'Quá hạn') },
    STATUS_CHANGE: { color: 'green', label: t('auditEngagements.update', 'Cập nhật') },
    ASSIGNMENT: { color: 'purple', label: t('notificationBell.assignment', 'Phân công') },
    REWORK: { color: 'orange', label: t('notificationBell.requestCorrection', 'Yêu cầu sửa') },
    SYSTEM: { color: 'default', label: t('auditTemplates.system', 'Hệ thống') },
    BIRTHDAY_ALERT: { color: 'pink', label: t('notificationBell.birthday', 'Sinh nhật') },
    BIRTHDAY_CARD: { color: 'gold', label: t('notificationBell.greetingCard', 'Thiệp chúc') },
  };

  const [notifications, setNotifications] = useState<NotifItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotifItem | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [notifsRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifsRes.data || []);
      setUnreadCount(countRes.data?.count || 0);
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
    // Polling every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkRead = async (id: number) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  const handleClick = (notif: NotifItem) => {
    if (!notif.isRead) handleMarkRead(notif.id);
    if (notif.type === 'BIRTHDAY_CARD') {
      setSelectedNotif(notif);
      setIsCardOpen(true);
      setOpen(false);
      return;
    }
    if (notif.link && onNavigate) {
      onNavigate(notif.link);
      setOpen(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t('notificationBell.justFinished', 'Vừa xong');
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} giờ trước`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay} ngày trước`;
  };

  const content = (
    <div style={{ width: 380, maxHeight: 480, overflow: 'auto' }}>
      <div className="flex justify-between items-center px-2 pb-2 border-b mb-2">
        <Text strong>{t('notificationBell.notification', 'Thông báo')}</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" onClick={handleMarkAllRead} icon={<CheckCircleOutlined />}>
            {t('notificationBell.readThemAll', 'Đọc tất cả')}
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <Empty description={t('notificationBell.noNotifications', 'Không có thông báo')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={notifications.slice(0, 20)}
          loading={loading}
          renderItem={(item: NotifItem) => {
            const cfg = typeConfig[item.type] || typeConfig.SYSTEM;
            return (
              <List.Item
                className={`cursor-pointer hover:bg-gray-50 px-2 rounded transition-colors ${!item.isRead ? 'bg-blue-50' : ''}`}
                onClick={() => handleClick(item)}
                style={{ borderBottom: '1px solid #f0f0f0' }}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>
                      <Text strong={!item.isRead} style={{ fontSize: 13 }}>{item.title}</Text>
                    </Space>
                  }
                  description={
                    <div>
                      <Text className="text-xs text-gray-500 block" ellipsis={{ tooltip: item.message }}>
                        {item.message}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-1 block">{formatTime(item.createdAt)}</Text>
                    </div>
                  }
                />
                {!item.isRead && (
                  <Tooltip title={t('notificationBell.markAsRead', 'Đánh dấu đã đọc')}>
                    <Button
                      type="text"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(item.id); }}
                    />
                  </Tooltip>
                )}
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes birthday-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .birthday-icon {
          animation: birthday-bounce 2s infinite ease-in-out;
        }
        .btn-thank-you:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 24px rgba(255, 107, 139, 0.4) !important;
        }
      `}</style>
      
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
        overlayStyle={{ padding: 0 }}
      >
        <div 
          className="hover:!bg-amber-50 transition-colors"
          style={{ 
            height: 34,
            width: 36,
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer',
            borderRadius: 8,
            border: '1px solid #fde68a',
            backgroundColor: '#ffffff',
          }}
        >
          <Badge count={unreadCount} overflowCount={99} size="small" offset={[4, -4]}>
            <BellOutlined
              style={{ fontSize: 16, color: '#d97706' }}
              className="hover:!text-amber-600 transition-colors"
            />
          </Badge>
        </div>
      </Popover>

      <Modal
        open={isCardOpen}
        onCancel={() => setIsCardOpen(false)}
        footer={null}
        centered
        width={500}
        styles={{
          body: {
            padding: 0,
            borderRadius: '24px',
            overflow: 'hidden',
          }
        }}
        modalRender={(node) => (
          <div style={{
            background: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)',
            borderRadius: '24px',
            boxShadow: '0 20px 40px rgba(255, 154, 158, 0.3)',
            border: '2px solid rgba(255, 255, 255, 0.4)',
            overflow: 'hidden',
            position: 'relative',
          }}>
            {node}
          </div>
        )}
      >
        <div style={{
          padding: '40px 24px',
          textAlign: 'center',
          color: '#fff',
          fontFamily: "'Outfit', 'Inter', sans-serif",
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Confetti decoration circles */}
          <div style={{ position: 'absolute', top: -20, left: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)', filter: 'blur(10px)' }} />
          <div style={{ position: 'absolute', bottom: -30, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.25)', filter: 'blur(15px)' }} />
          
          {/* Main card box */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
          }}>
            <div className="birthday-icon" style={{ fontSize: 64, marginBottom: 12, display: 'inline-block' }}>
              🎂
            </div>
            
            <h2 style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#ffffff',
              margin: '0 0 12px 0',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              fontFamily: "'Outfit', sans-serif",
            }}>
              Happy Birthday!
            </h2>
            
            <div style={{
              width: 50,
              height: 4,
              background: '#fff',
              margin: '0 auto 20px auto',
              borderRadius: 2,
              opacity: 0.8
            }} />
            
            <p style={{
              fontSize: 16,
              lineHeight: '1.6',
              color: '#ffffff',
              margin: '0 0 24px 0',
              fontWeight: 500,
              textShadow: '0 1px 2px rgba(0,0,0,0.05)',
            }}>
              {selectedNotif?.message.replace(t('notificationBell.clickHereToOpenABirthday', 'Nhấp vào đây để mở thiệp chúc mừng sinh nhật từ Ban Kiểm soát và Khối KTNB nhé!'), '')}
            </p>

            <div style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              fontSize: 14,
              lineHeight: 1.6,
              color: '#ffffff',
              marginBottom: 24,
              fontWeight: 500,
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              {t('notificationBell.theBoardOfSupervisorsInternalAudit', '💝 Ban Kiểm soát & Khối KTNB chúc bạn một tuổi mới luôn ngập tràn niềm vui, dồi dào sức khỏe, hạnh phúc và gặt hái thêm nhiều thành công rực rỡ trong cả công việc lẫn cuộc sống!')}
            </div>

            <Button
              type="primary"
              size="large"
              onClick={() => setIsCardOpen(false)}
              className="btn-thank-you"
              style={{
                background: '#ffffff',
                border: 'none',
                color: '#ff6b8b',
                fontWeight: 700,
                borderRadius: '50px',
                padding: '0 32px',
                height: '46px',
                boxShadow: '0 10px 20px rgba(255, 107, 139, 0.2)',
                fontSize: 15,
                transition: 'all 0.3s ease',
              }}
            >
              {t('notificationBell.thanksForTheWishes', 'Cảm ơn lời chúc! ✨')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default NotificationBell;
