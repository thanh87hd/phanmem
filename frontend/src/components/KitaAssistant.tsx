import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Drawer, Input, Space, Typography, Badge, Card, message, List, Tag, Tooltip } from 'antd';
import { 
  RobotOutlined, SendOutlined, CloseOutlined, 
  MessageOutlined, ThunderboltOutlined, DatabaseOutlined, 
  InfoCircleOutlined, BookOutlined, CalendarOutlined, FileTextOutlined
} from '@ant-design/icons';
import api from '../services/api';
import dayjs from 'dayjs';
import './KitaAssistant.css';

const { Text, Paragraph, Title } = Typography;

interface ChatMessage {
  id: string;
  sender: 'user' | 'kita';
  text: string;
  timestamp: Date;
  category?: string;
  source?: string;
}

const KitaAssistant: React.FC = () => {
  const { t } = useTranslation();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'kita',
      text: t('kitaAssistant.helloIAmKitaSmartAi', 'Xin chào! Tôi là **Kita - Trợ lý ảo AI thông minh** chuyên trách nghiệp vụ Kiểm toán Nội bộ tại LPBank. CSDL của tôi đã được kết nối thời gian thực với hệ thống Smart Audit 4.0.\n\nTôi có thể giúp bạn:\n- Tra cứu nhanh **kế hoạch kiểm toán** và danh sách đoàn.\n- Đối chiếu các **văn bản pháp quy** (Thông tư 13/2018, Thông tư 83/2025, COSO, COBIT).\n- Gợi ý **phương pháp, thủ tục** và soạn thảo **finding** chuyên nghiệp.\n\nHãy đặt câu hỏi cho tôi!'),
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Position and drag states for the assistant button
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const elementStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasDraggedRef = useRef<boolean>(false);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag on left click
    if (e.button !== 0) return;
    
    setIsDragging(true);
    hasDraggedRef.current = false;
    
    const rect = e.currentTarget.getBoundingClientRect();
    elementStartRef.current = {
      x: rect.left,
      y: rect.top
    };
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY
    };
    
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    hasDraggedRef.current = false;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    elementStartRef.current = {
      x: rect.left,
      y: rect.top
    };
    
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY
    };
    
    if (!position) {
      setPosition({ x: rect.left, y: rect.top });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDraggedRef.current = true;
      }
      
      let newX = elementStartRef.current.x + deltaX;
      let newY = elementStartRef.current.y + deltaY;
      
      const buttonWidth = 160; // Approximate button width
      const buttonHeight = 52;
      
      newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStartRef.current.x;
      const deltaY = touch.clientY - dragStartRef.current.y;
      
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDraggedRef.current = true;
      }
      
      let newX = elementStartRef.current.x + deltaX;
      let newY = elementStartRef.current.y + deltaY;
      
      const buttonWidth = 160;
      const buttonHeight = 52;
      
      newX = Math.max(0, Math.min(newX, window.innerWidth - buttonWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - buttonHeight));
      
      setPosition({ x: newX, y: newY });

      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  useEffect(() => {
    const handleResize = () => {
      if (!position) return;
      
      const buttonWidth = 160;
      const buttonHeight = 52;
      
      const newX = Math.max(0, Math.min(position.x, window.innerWidth - buttonWidth));
      const newY = Math.max(0, Math.min(position.y, window.innerHeight - buttonHeight));
      
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    setOpen(true);
  };

  const floatingStyle: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        bottom: 'auto',
        right: 'auto',
        zIndex: 1000,
        userSelect: 'none',
        touchAction: 'none',
      }
    : {
        touchAction: 'none',
      };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 100);
    }
  }, [history, open]);

  const quickPrompts = [
    { label: '📖 Hướng dẫn Onboarding?', icon: <BookOutlined />, text: 'Tôi là người mới, hãy hướng dẫn tôi quy trình 6 bước và các thao tác cơ bản trên Smart Audit 4.0' },
    { label: t('kitaAssistant.auditPlan', 'Kế hoạch kiểm toán?'), icon: <CalendarOutlined />, text: t('kitaAssistant.whatAuditsAreActiveInThis', 'Kế hoạch kiểm toán năm nay có những cuộc kiểm toán nào đang hoạt động?') },
    { label: t('kitaAssistant.creditAuditProcedures', 'Thủ tục kiểm toán tín dụng?'), icon: <ThunderboltOutlined />, text: t('kitaAssistant.suggestMeMethodsAndProceduresFor', 'Gợi ý cho tôi phương pháp và thủ tục kiểm toán quy trình cấp tín dụng?') },
    { label: t('kitaAssistant.lookUpCircular13', 'Tra cứu Thông tư 13?'), icon: <BookOutlined />, text: t('kitaAssistant.circular132018ttnhnnWhatRegulationsOnCrosscontrol', 'Thông tư 13/2018/TT-NHNN quy định gì về kiểm soát chéo và kiểm soát rủi ro?') },
    { label: t('kitaAssistant.createASampleFindingDraft', 'Tạo dự thảo Finding mẫu?'), icon: <FileTextOutlined />, text: t('kitaAssistant.iWantToWriteAnAudit', 'Tôi muốn viết một Phát hiện kiểm toán (Finding) về lỗi giải ngân thiếu chữ ký người bảo lãnh tại Chi nhánh A.') }
  ];

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim()) return;

    if (!textToSend) setInput('');

    const userMsg: ChatMessage = {
      // eslint-disable-next-line react-hooks/purity
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: new Date()
    };

    setHistory(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const chatHistoryForBackend = history.map(h => ({
        sender: h.sender,
        text: h.text
      }));

      const res = await api.post('/ai/kita-chat', {
        message: messageText,
        history: chatHistoryForBackend
      }, {
        timeout: 90000
      });

      const kitaMsg: ChatMessage = {
        // eslint-disable-next-line react-hooks/purity
        id: `msg-${Date.now() + 1}`,
        sender: 'kita',
        text: res.data?.reply || t('kitaAssistant.sorryImHavingTroubleConnectingTo', 'Xin lỗi, tôi gặp sự cố khi kết nối dữ liệu.'),
        timestamp: new Date(),
        category: res.data?.category,
        source: res.data?.source
      };

      setHistory(prev => [...prev, kitaMsg]);
    } catch (error) {
      message.error(t('kitaAssistant.unableToConnectToVirtualAssistant', 'Không thể kết nối với Trợ lý ảo Kita'));
    } finally {
      setLoading(false);
    }
  };

  const renderMessageText = (text: string) => {
    // Basic Markdown formatting helper
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      // Line break support
      return part.split('\n').map((line, i) => (
        <span key={`${index}-${i}`}>
          {line}
          {i < part.split('\n').length - 1 && <br />}
        </span>
      ));
    });
  };

  return (
    <>
      {/* Pulse Floating Gradient Capsule Button with LPBank Style Speech Bubble */}
      <div 
        className={`kita-floating-button-container ${isDragging ? 'dragging' : ''}`}
        style={floatingStyle}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2">
          {/* LPBank Official Mascot Speech Bubble (as seen on LPBank website) */}
          <div className="lpbank-speech-bubble hidden sm:inline-flex cursor-pointer select-none">
            <span>✨ Xin chào, Kita đang lắng nghe bạn!</span>
          </div>

          <Badge status="processing" offset={[-4, 40]}>
            <div className="kita-floating-button-wrapper shadow-lg">
              <div className="kita-floating-avatar-container">
                <img src="/kita-goat.png" alt="Kita Goat" className="kita-floating-avatar" />
              </div>
              <div className="kita-floating-label">{t('kitaAssistant.kitaAiAssistant', 'Trợ lý Kita AI')}</div>
            </div>
          </Badge>
        </div>
      </div>

      <Drawer
        title={
          <div className="kita-header-container">
            <div className="kita-header-left">
              <div className="kita-header-avatar-ring">
                <img src="/kita-goat.png" alt="Kita Logo" className="kita-header-avatar" />
              </div>
              <div className="kita-header-text">
                <Title level={5} className="kita-header-title">{t('kitaAssistant.kitaSmartAssistant', 'Trợ lý thông minh Kita')}</Title>
                <div className="kita-header-status">
                  <span className="kita-active-dot" />
                  <Text type="secondary" className="kita-header-subtitle">LPBank Smart Audit Copilot</Text>
                </div>
              </div>
            </div>
          </div>
        }
        placement="right"
        width={420}
        onClose={() => setOpen(false)}
        open={open}
        mask={false}
        className="kita-chat-drawer"
        styles={{ body: {} }}
      >
        {/* Chat History Panel */}
        <div className="kita-chat-messages-container">
          <List
            dataSource={history}
            renderItem={(item) => (
              <div className={`kita-message-row ${item.sender === 'user' ? 'user-row' : 'kita-row'}`}>
                {item.sender === 'kita' && (
                  <div className="kita-avatar-bubble">
                    <img src="/kita-goat.png" alt="Kita" className="kita-avatar-image" />
                  </div>
                )}
                <div className="kita-message-bubble shadow-sm">
                  <div className="kita-message-content">
                    {renderMessageText(item.text)}
                  </div>

                  {/* Metadata block for Kita response */}
                  {item.sender === 'kita' && (item.category || item.source) && (
                    <div className="kita-metadata-bar">
                      <span className="kita-metadata-source">
                        {item.source?.includes('LLM') ? (
                          <>
                            <span className="icon">🧠</span> Nguồn: {item.source}
                          </>
                        ) : (
                          <>
                            <span className="icon">⚡</span> Nguồn: {item.source || t('auditTemplates.system', 'Hệ thống')}
                          </>
                        )}
                      </span>
                      {item.category && (
                        <Tag className="kita-metadata-tag">
                          {item.category}
                        </Tag>
                      )}
                    </div>
                  )}
                  
                  <div className="kita-message-time">
                    {dayjs(item.timestamp).format('HH:mm')}
                  </div>
                </div>
              </div>
            )}
          />
          {loading && (
            <div className="kita-message-row kita-row">
              <div className="kita-avatar-bubble">
                <img src="/kita-goat.png" alt="Kita" className="kita-avatar-image" />
              </div>
              <div className="kita-message-bubble loading-bubble shadow-sm">
                <div className="kita-typing-container">
                  <div className="kita-typing-wave">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                  <span className="kita-typing-text">{t('kitaAssistant.kitaIsQueryingTheDatabaseThinking', 'Kita đang truy vấn CSDL & suy nghĩ...')}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts Panel */}
        <div className="kita-quick-prompts-container mb-3 mt-2">
          <Text type="secondary" className="kita-quick-prompts-title">{t('kitaAssistant.quickHint', '💡 Gợi ý nhanh:')}</Text>
          <div className="kita-quick-prompts-wrapper">
            {quickPrompts.map((p, idx) => (
              <Button
                key={idx}
                size="small"
                icon={p.icon}
                className="kita-quick-prompt-btn"
                onClick={() => handleSend(p.text)}
                disabled={loading}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Input Panel */}
        <div className="kita-input-panel">
          <div className="kita-input-container">
            <Input.TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('kitaAssistant.askKitaAboutPlansLegalDocuments', 'Hỏi Kita về kế hoạch, văn bản pháp quy, finding...')}
              autoSize={{ minRows: 1, maxRows: 3 }}
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              className="kita-input-area"
            />
            <Button 
              type="primary" 
              shape="circle"
              icon={<SendOutlined />} 
              onClick={() => handleSend()}
              loading={loading}
              className="kita-send-btn-round"
            />
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default KitaAssistant;
