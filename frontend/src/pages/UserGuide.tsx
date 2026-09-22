import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card, Row, Col, Typography, Tabs, Steps, Button, Tag, Space,
  Progress, Checkbox, Input, Alert, Collapse, Divider, Badge, Tooltip, Empty
} from 'antd';
import {
  BookOutlined, CompassOutlined, RobotOutlined, CheckCircleOutlined,
  SendOutlined, ArrowRightOutlined, StarOutlined, RocketOutlined,
  SafetyCertificateOutlined, ProjectOutlined, FileDoneOutlined,
  WarningOutlined, AuditOutlined, QuestionCircleOutlined, ThunderboltOutlined,
  BulbOutlined, SearchOutlined, DownloadOutlined, TrophyOutlined
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { IiaQuizletTab } from '../components/IiaQuizletTab';
import { ComprehensiveHandbookTab } from '../components/ComprehensiveHandbookTab';

const { Title, Text, Paragraph } = Typography;

interface ChatMsg {
  sender: 'user' | 'bot';
  text: string;
  suggestedLinks?: { title: string; route: string }[];
  quickActions?: string[];
  timestamp: Date;
}

const CHECKLIST_STORAGE_KEY = 'smart_audit_onboarding_checklist';

const defaultChecklist = [
  { id: 'step-1', title: 'Đổi mật khẩu tài khoản lần đầu & cập nhật số điện thoại', route: '/personnel', done: false },
  { id: 'step-2', title: 'Tìm hiểu Vũ trụ Kiểm toán (Audit Universe) & Bảng Đánh giá Rủi ro', route: '/risk-assessment', done: false },
  { id: 'step-3', title: 'Xem các Cuộc kiểm toán được phân công trên bảng Kanban', route: '/audit-engagements', done: false },
  { id: 'step-4', title: 'Thực hành tạo 01 Giấy tờ làm việc (WP) và đính kèm bằng chứng', route: '/working-papers', done: false },
  { id: 'step-5', title: 'Chuyển thử 01 WP thành Phát hiện Kiểm toán (Finding) chuẩn hóa', route: '/audit-findings', done: false },
  { id: 'step-6', title: 'Theo dõi tiến độ khắc phục Kiến nghị theo SLA', route: '/recommendations', done: false },
  { id: 'step-7', title: 'Tra cứu Thông tư 13/2018 & Nghị định 340 trong Thư viện Văn bản', route: '/regulatory-kb', done: false },
];

const UserGuide: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'handbook');
  const [handbookSubTab, setHandbookSubTab] = useState(() => searchParams.get('subTab') || 'c1');

  useEffect(() => {
    const tab = searchParams.get('tab');
    const subTab = searchParams.get('subTab');
    if (tab) setActiveTab(tab);
    if (subTab) setHandbookSubTab(subTab);
  }, [searchParams]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [checklist, setChecklist] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      return saved ? JSON.parse(saved) : defaultChecklist;
    } catch {
      return defaultChecklist;
    }
  });

  // Chatbot states
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      sender: 'bot',
      text: 'Xin chào! Tôi là **Trợ lý Hướng dẫn Hệ thống Smart Audit 4.0**.\n\nTôi có thể giải đáp mọi thắc mắc về quy trình 6 bước KTNB, cách lập Giấy tờ làm việc (WP), ghi nhận Phát hiện, theo dõi Kiến nghị hoặc phân quyền hệ thống.\n\nHãy chọn câu hỏi nhanh bên dưới hoặc nhập câu hỏi của bạn!',
      quickActions: [
        'Bộ chuẩn mực GIAS 2024 (5 Miền & 15 Nguyên tắc)',
        'Tra cứu Thuật ngữ chuyên ngành KTNB',
        'Quy trình tổng thể 6 bước KTNB',
        'Cách tạo Giấy tờ làm việc (WP)',
        'Làm sao chuyển WP thành Phát hiện?',
        'Quy định NĐ 340 và Mã lỗi'
      ],
      suggestedLinks: [
        { title: 'Chuẩn mực GIAS 2024', route: '/user-guide?tab=handbook&subTab=c6' },
        { title: 'Bản đồ Quy trình', route: '/user-guide?tab=workflow' },
        { title: 'Đoàn KT & Kanban', route: '/audit-engagements' },
        { title: 'Giấy tờ làm việc (WP)', route: '/working-papers' }
      ],
      timestamp: new Date()
    }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Workflow Stages
  const workflowStages = [
    {
      title: 'GĐ 1: Đánh giá Rủi ro & Audit Universe',
      subtitle: 'Xác định mục tiêu & vũ trụ kiểm toán',
      icon: <CompassOutlined className="text-xl text-blue-500" />,
      route: '/risk-assessment',
      tag: 'Kế hoạch hóa',
      color: '#ea9105',
      summary: 'Khảo sát và tính toán điểm rủi ro kế thừa (Inherent) và rủi ro còn lại (Residual) trên toàn bộ danh mục đơn vị, quy trình nghiệp vụ.',
      actions: [
        'Khai báo Đơn vị & Quy trình trong Vũ trụ Kiểm toán (/audit-universe)',
        'Chấm điểm ma trận rủi ro định lượng & định tính (/risk-assessment)',
        'Phân loại mức độ High / Medium / Low để ưu tiên lập kế hoạch năm'
      ]
    },
    {
      title: 'GĐ 2: Lập Kế hoạch KT Năm',
      subtitle: 'Phân bổ nguồn lực & trình phê duyệt',
      icon: <ProjectOutlined className="text-xl text-purple-500" />,
      route: '/audit-plan',
      tag: 'Phê duyệt',
      color: '#722ed1',
      summary: 'Lập danh mục cuộc kiểm toán ưu tiên dựa trên mức độ rủi ro, phân bổ thời gian và nhân lực, trình BKS/HĐQT phê duyệt.',
      actions: [
        'Tạo cuộc kiểm toán tự động từ danh sách ưu tiên rủi ro (/audit-plan)',
        'Phân bổ KTV, Trưởng đoàn và tính số ngày công (Mandays)',
        'Gửi duyệt điện tử và theo dõi trạng thái phê duyệt của BKS'
      ]
    },
    {
      title: 'GĐ 3: Chuẩn bị & Kế hoạch Chi tiết',
      subtitle: 'Thu thập thông tin & lập Chương trình KT',
      icon: <FileDoneOutlined className="text-xl text-amber-500" />,
      route: '/audit-engagements',
      tag: 'Khảo sát',
      color: '#fa8c16',
      summary: 'Gửi thông báo kiểm toán, khảo sát sơ bộ, xác định mục tiêu phạm vi, lập ma trận RCM và chương trình kiểm toán.',
      actions: [
        'Soạn và ban hành Quyết định kiểm toán & Thông báo (/audit-engagements)',
        'Khởi tạo và duyệt Ma trận Rủi ro & Kiểm soát RCM (/audit-programs)',
        'Họp mở đầu (Opening Meeting) và thống nhất phương pháp làm việc với ĐVKD'
      ]
    },
    {
      title: 'GĐ 4: Thực địa & Bằng chứng KT',
      subtitle: 'Lấy mẫu, kiểm tra & lập Giấy tờ làm việc (WP)',
      icon: <ThunderboltOutlined className="text-xl text-green-500" />,
      route: '/working-papers',
      tag: 'Thực địa',
      color: '#52c41a',
      summary: 'Kiểm toán viên thực hiện các thủ tục kiểm tra chi tiết, chọn mẫu, thu thập bằng chứng, lập WP và phát hiện sai sót (Finding).',
      actions: [
        'Thực hiện các thủ tục ToC (Thử nghiệm kiểm soát) & Substantive (/working-papers)',
        'Lập Giấy tờ làm việc (WP) kèm đính kèm file bằng chứng số hóa',
        'Ghi nhận Phát hiện 5C và phân loại theo Danh mục mã lỗi 3 chiều (/audit-findings)'
      ]
    },
    {
      title: 'GĐ 5: Báo cáo & Đóng Thực địa',
      subtitle: 'Họp bế mạc, ký MB04 & Phát hành Báo cáo',
      icon: <AuditOutlined className="text-xl text-rose-500" />,
      route: '/recommendations',
      tag: 'Khắc phục',
      color: '#f5222d',
      summary: 'Đơn vị được kiểm toán tiếp nhận kiến nghị, cập nhật kế hoạch khắc phục, KTV thẩm định bằng chứng và Lãnh đạo duyệt đóng kiến nghị.',
      actions: [
        'Giao kiến nghị và thời hạn cam kết (SLA) cho Đơn vị (/recommendations)',
        'Đơn vị cập nhật giải trình, kế hoạch và tài liệu chứng minh khắc phục',
        'KTV xác nhận (Verify) và Trưởng đoàn/Lãnh đạo duyệt Đóng kiến nghị'
      ]
    },
    {
      title: 'GĐ 6: Giám sát Liên tục & Đảm bảo CL (QAIP)',
      subtitle: 'Chạy KRI tự động & Báo cáo BKS',
      icon: <SafetyCertificateOutlined className="text-xl text-cyan-500" />,
      route: '/continuous-monitoring',
      tag: 'Giám sát 24/7',
      color: '#13c2c2',
      summary: 'Hệ thống chạy các script giám sát tự động KRI để phát hiện sớm rủi ro bất thường và thực hiện chương trình tự đánh giá QAIP.',
      actions: [
        'Theo dõi bảng tín hiệu rủi ro sớm KRI (/continuous-monitoring)',
        'Chấm điểm chất lượng cuộc kiểm toán QAIP (/quality-control)',
        'Báo cáo tự động lên Cổng thông tin Ủy ban Kiểm toán & BKS (/audit-committee)'
      ]
    }
  ];

  const handleToggleChecklist = (id: string) => {
    const updated = checklist.map(item => item.id === id ? { ...item, done: !item.done } : item);
    setChecklist(updated);
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(updated));
  };

  const completedCount = checklist.filter(c => c.done).length;
  const progressPercent = Math.round((completedCount / checklist.length) * 100);

  const handleSendChat = async (msgToSend?: string) => {
    const query = msgToSend || inputMsg;
    if (!query.trim()) return;

    const userMsg: ChatMsg = {
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputMsg('');
    setChatLoading(true);

    // Xử lý tức thì các câu hỏi chuẩn mực GIAS 2024 và Thuật ngữ
    const lowerQ = query.toLowerCase();
    if (lowerQ.includes('gias') || lowerQ.includes('chuẩn mực 2024') || lowerQ.includes('5 miền') || lowerQ.includes('15 nguyên tắc')) {
      setTimeout(() => {
        const botReply: ChatMsg = {
          sender: 'bot',
          text: `🏛️ **Bộ Chuẩn Mực Kiểm Toán Nội Bộ Toàn Cầu (IIA GIAS 2024):**\n\nBộ chuẩn mực mới nhất có hiệu lực từ ngày **09/01/2025** gồm **5 Miền (Domains), 15 Nguyên tắc và 52 Tiêu chuẩn**:\n\n- **Miền I: Mục đích của KTNB:** Tạo lập, bảo vệ và duy trì giá trị cho tổ chức.\n- **Miền II: Đạo đức & Tính chuyên nghiệp:** 5 Nguyên tắc (Liêm chính, Khách quan, Năng lực, Thận trọng thích đáng, Bảo mật thông tin).\n- **Miền III: Quản trị Chức năng KTNB:** 3 Nguyên tắc (Ủy quyền của BKS, Vị trí độc lập, BKS giám sát hoạt động).\n- **Miền IV: Quản lý Hoạt động KTNB (Trách nhiệm CAE):** 4 Nguyên tắc (Kế hoạch chiến lược, Quản lý nguồn lực, Giao tiếp hiệu quả, Nâng cao chất lượng QAIP).\n- **Miền V: Thực hiện Dịch vụ KTNB:** 3 Nguyên tắc (Lập kế hoạch cuộc KT hiệu quả, Thực địa & Đánh giá 5C, Báo cáo kết quả MB04 & Giám sát khắc phục).\n\nToàn bộ các tiêu chuẩn đã được tích hợp đối chiếu trực tiếp trên phần mềm! Bạn hãy mở tab **Cẩm Nang KTNB Toàn Diện ➔ Mục 2: Chuẩn Mực GIAS 2024** để tra cứu chi tiết từng chuẩn mực.`,
          suggestedLinks: [
            { title: 'Xem toàn văn Chuẩn mực GIAS 2024', route: '/user-guide?tab=handbook&subTab=c6' },
            { title: 'Đoàn KT & Quy trình thực địa', route: '/audit-engagements' },
            { title: 'Quản trị Đảm bảo chất lượng (QAIP)', route: '/quality-control' }
          ],
          quickActions: [
            'Tra cứu Thuật ngữ chuyên ngành KTNB',
            'Quy trình tổng thể 6 bước KTNB',
            'Cách tạo Giấy tờ làm việc (WP)'
          ],
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, botReply]);
        setChatLoading(false);
      }, 300);
      return;
    }

    if (lowerQ.includes('thuật ngữ') || lowerQ.includes('glossary') || lowerQ.includes('viết tắt')) {
      setTimeout(() => {
        const botReply: ChatMsg = {
          sender: 'bot',
          text: `📚 **Bảng Thuật Ngữ Kiểm Toán Nội Bộ Chuyên Ngành (Glossary):**\n\nHệ thống Smart Audit 4.0 đã chuẩn hóa hơn **45+ thuật ngữ quốc tế** chia theo 6 phân nhóm chuyên môn:\n\n1. **IIA & GIAS 2024:** CAE, QAIP, Due Professional Care, Independence, Objectivity, Professional Skepticism...\n2. **Pháp lý & NHNN:** Thông tư 13/2018/TT-NHNN, Nghị định 340, CAMELS, Basel II/III, AML/CFT, KYC/CDD, Sanctions...\n3. **Quy trình & W/P:** Audit Universe, Audit Engagement, Working Paper (W/P), RCM, Mô hình 5C, MB04, Substantive Testing, Test of Controls...\n4. **Rủi ro & KSNB:** COSO Framework, Inherent Risk, Control Risk, Residual Risk, Risk Appetite, KRI, Fraud Triangle, Segregation of Duties (SoD)...\n5. **Báo cáo & Khắc phục:** Audit Report, Overall Rating, Management Action Plan (MAP), Repeat Finding, Remediation SLA...\n6. **Công nghệ & CAATs:** CAATs, Continuous Auditing, Four-Eyes Principle, Stage-Gate Control, Defect Taxonomy, Audit Trail.\n\nBạn có thể mở tab **Cẩm Nang KTNB Toàn Diện ➔ Mục 1: Thuật Ngữ & Viết Tắt** để tra cứu bộ lọc và liên kết tắt đến từng màn hình chức năng!`,
          suggestedLinks: [
            { title: 'Bảng tra cứu Thuật ngữ', route: '/user-guide?tab=handbook&subTab=c1' },
            { title: 'Thư viện Văn bản Pháp quy', route: '/regulatory-kb' }
          ],
          quickActions: [
            'Bộ chuẩn mực GIAS 2024 (5 Miền & 15 Nguyên tắc)',
            'Quy trình tổng thể 6 bước KTNB',
            'Quy định NĐ 340 và Mã lỗi'
          ],
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, botReply]);
        setChatLoading(false);
      }, 300);
      return;
    }

    try {
      const res = await api.post('/ai/kita-chat', {
        message: query,
        history: chatMessages.slice(-4).map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }))
      });

      const botReply: ChatMsg = {
        sender: 'bot',
        text: res.data.reply || 'Tôi đã tiếp nhận câu hỏi của bạn. Vui lòng xem hướng dẫn chi tiết trên trang.',
        suggestedLinks: res.data.suggestedLinks || [],
        quickActions: res.data.quickActions || [],
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, botReply]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: 'Xin lỗi, không thể kết nối tới máy chủ AI trợ lý. Bạn có thể tra cứu nhanh các mục hướng dẫn theo từng tab phía trên!',
          timestamp: new Date()
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Header Banner - Clean Light Luxury Executive Card (WCAG AAA Contrast) */}
      <div className="bg-gradient-to-r from-amber-50/50 via-white to-slate-50/70 rounded-2xl p-7 mb-6 shadow-xs border border-slate-200/90 border-l-4 border-l-[#ea9105] relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-5 flex items-center pr-10 pointer-events-none text-amber-900">
          <BookOutlined style={{ fontSize: 240 }} />
        </div>
        <Row gutter={[24, 24]} align="middle" className="relative z-10">
          <Col xs={24} md={16}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300/80 shadow-2xs">
                🌟 Smart Audit 4.0 Onboarding Hub
              </span>
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-white shadow-2xs">
                LPBank Internal Audit
              </span>
            </div>
            <Title level={2} style={{ color: '#0f172a', marginBottom: 8, fontWeight: 900, fontSize: '26px', letterSpacing: '-0.02em' }}>
              Trung tâm Hướng dẫn Sử dụng & Trợ lý Nghiệp vụ
            </Title>
            <Paragraph style={{ color: '#475569', fontSize: 14, lineHeight: 1.65, marginBottom: 20 }} className="max-w-2xl">
              Nắm vững quy trình kiểm toán 6 giai đoạn, thành thạo các công cụ phân tích dữ liệu, lập giấy tờ làm việc và tương tác trực tiếp với Trợ lý AI để giải đáp mọi tình huống nghiệp vụ.
            </Paragraph>
            <Space size="middle" wrap>
              <Button 
                size="large" 
                icon={<BookOutlined />} 
                className="!bg-[#ea9105] hover:!bg-[#d97706] !text-white font-bold border-none shadow-sm h-11 px-5 rounded-xl transition-all active:scale-95"
                onClick={() => {
                  setActiveTab('handbook');
                  setHandbookSubTab('c1');
                  setTimeout(() => {
                    document.getElementById('user-guide-main-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
              >
                📖 Cẩm Nang KTNB Toàn Diện
              </Button>
              <Button 
                size="large" 
                icon={<SafetyCertificateOutlined />} 
                className="!bg-amber-50 hover:!bg-amber-100 !text-amber-900 !border-amber-300 font-bold shadow-xs h-11 px-5 rounded-xl transition-all active:scale-95"
                onClick={() => {
                  setActiveTab('handbook');
                  setHandbookSubTab('c6');
                  setTimeout(() => {
                    document.getElementById('user-guide-main-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
              >
                🏛️ Chuẩn Mực GIAS 2024
              </Button>
              <Button 
                size="large" 
                icon={<RocketOutlined />} 
                className="bg-white hover:!bg-slate-50 !text-slate-700 hover:!text-[#ea9105] border border-slate-200 font-bold shadow-xs h-11 px-5 rounded-xl transition-all active:scale-95"
                onClick={() => {
                  setActiveTab('workflow');
                  setTimeout(() => {
                    document.getElementById('user-guide-main-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
              >
                Khám phá Luồng 6 Bước
              </Button>
              <Button 
                size="large" 
                icon={<TrophyOutlined />} 
                className="bg-white hover:!bg-slate-50 !text-slate-700 hover:!text-blue-600 border border-slate-200 font-semibold shadow-xs h-11 px-5 rounded-xl transition-all active:scale-95"
                onClick={() => {
                  setActiveTab('quizlet');
                  setTimeout(() => {
                    document.getElementById('user-guide-main-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
              >
                🎓 Quizlet Chuẩn IIA
              </Button>
              <Button 
                size="large" 
                icon={<RobotOutlined />} 
                className="bg-blue-50 hover:!bg-blue-100 !text-blue-700 border border-blue-200 font-semibold shadow-xs h-11 px-5 rounded-xl transition-all active:scale-95"
                onClick={() => {
                  setActiveTab('chatbot');
                  setTimeout(() => {
                    document.getElementById('user-guide-main-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
              >
                Hỏi đáp Trợ lý AI
              </Button>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <div className="bg-gradient-to-br from-white to-amber-50/40 border border-slate-200 rounded-2xl p-5 shadow-xs">
              <div className="flex justify-between items-center mb-2">
                <span style={{ color: '#0f172a' }} className="font-bold text-sm">Tiến độ Làm quen Hệ thống</span>
                <span style={{ color: '#ea9105' }} className="font-extrabold text-base">{progressPercent}%</span>
              </div>
              <Progress percent={progressPercent} showInfo={false} strokeColor="#ea9105" trailColor="#e2e8f0" />
              <div className="mt-3 flex justify-between items-center text-xs">
                <span style={{ color: '#64748b' }}>Đã hoàn thành: <b style={{ color: '#0f172a' }}>{completedCount}/{checklist.length}</b> mục</span>
                <Button 
                  type="link" 
                  size="small" 
                  style={{ color: '#d97706', fontWeight: 700 }}
                  className="!p-0 text-xs hover:!text-amber-800"
                  onClick={() => {
                    setActiveTab('checklist');
                    setTimeout(() => {
                      document.getElementById('user-guide-main-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 50);
                  }}
                >
                  Xem Checklist ➔
                </Button>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Main Tabs */}
      <div id="user-guide-main-tabs">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          items={[
            {
              key: 'handbook',
              label: (
                <span className="font-semibold px-2 text-amber-700">
                  <BookOutlined className="text-amber-500 mr-1" />
                  Cẩm Nang KTNB Toàn Diện (IIA & TT13)
                </span>
              ),
              children: (
                <ComprehensiveHandbookTab 
                  activeSubTab={handbookSubTab} 
                  onSubTabChange={setHandbookSubTab} 
                />
              )
            },
          {
            key: 'workflow',
            label: <span className="font-semibold px-2"><CompassOutlined /> Bản đồ Quy trình 6 Bước</span>,
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  icon={<BulbOutlined className="text-blue-600" />}
                  message={<span className="font-semibold">Quy trình Kiểm toán Nội bộ Chuẩn hóa (End-to-End Workflow)</span>}
                  description="Bấm vào từng giai đoạn bên dưới để xem chi tiết các bước nghiệp vụ, màn hình chức năng phụ trách và chuyển đến thao tác trực tiếp."
                  className="mb-6 rounded-xl border-blue-200 bg-blue-50/50"
                />

                {/* Steps Navigator */}
                <div className="mb-8 overflow-x-auto pb-2">
                  <Steps
                    current={currentStageIndex}
                    onChange={setCurrentStageIndex}
                    items={workflowStages.map((s, idx) => ({
                      title: `GĐ ${idx + 1}`,
                      description: s.tag,
                      status: currentStageIndex === idx ? 'process' : 'wait'
                    }))}
                  />
                </div>

                {/* Active Stage Detail */}
                {(() => {
                  const stage = workflowStages[currentStageIndex];
                  return (
                    <Card className="border-2 rounded-2xl shadow-md mb-6" style={{ borderColor: stage.color }}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-gray-100">
                        <div>
                          <Space size="middle" align="center">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 shadow-sm">
                              {stage.icon}
                            </div>
                            <div>
                              <Title level={4} className="!mb-0 text-slate-800">{stage.title}</Title>
                              <Text type="secondary" className="text-sm">{stage.subtitle}</Text>
                            </div>
                          </Space>
                        </div>
                        <Button
                          type="primary"
                          size="large"
                          icon={<ArrowRightOutlined />}
                          className="font-semibold shadow-md rounded-xl"
                          style={{ backgroundColor: stage.color, borderColor: stage.color }}
                          onClick={() => navigate(stage.route)}
                        >
                          Mở màn hình này ngay
                        </Button>
                      </div>

                      <Paragraph className="text-base text-slate-700 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        {stage.summary}
                      </Paragraph>

                      <Title level={5} className="!text-slate-800 !mb-3">
                        📋 Các bước thực hiện chi tiết:
                      </Title>
                      <div className="space-y-3">
                        {stage.actions.map((act, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-400 transition-colors">
                            <span className="text-slate-700 font-medium">{act}</span>
                            <Button 
                              type="link" 
                              size="small" 
                              icon={<ArrowRightOutlined />} 
                              onClick={() => {
                                const match = act.match(/\((.*?)\)/);
                                if (match && match[1]) navigate(match[1]);
                              }}
                            >
                              Thực hiện
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })()}

                {/* Grid 6 Stages Overview */}
                <Title level={4} className="!text-slate-800 !mt-8 !mb-4">
                  Tổng quan 6 Giai đoạn Kiểm toán Nội bộ:
                </Title>
                <Row gutter={[16, 16]}>
                  {workflowStages.map((st, idx) => (
                    <Col xs={24} sm={12} lg={8} key={idx}>
                      <Card 
                        hoverable 
                        className={`h-full rounded-xl transition-all cursor-pointer border ${currentStageIndex === idx ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-slate-200'}`}
                        onClick={() => setCurrentStageIndex(idx)}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <Space>
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100">
                              {st.icon}
                            </div>
                            <span className="font-bold text-slate-800">Giai đoạn {idx + 1}</span>
                          </Space>
                          <Tag color={st.color} className="font-medium rounded-full px-2">{st.tag}</Tag>
                        </div>
                        <Text strong className="text-slate-800 block text-sm mb-1">{st.title.split(': ')[1]}</Text>
                        <Paragraph ellipsis={{ rows: 2 }} className="text-xs text-slate-500 mb-3">
                          {st.summary}
                        </Paragraph>
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                          <span className="text-blue-600 font-semibold">Xem chi tiết</span>
                          <ArrowRightOutlined className="text-blue-600" />
                        </div>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            )
          },
          {
            key: 'quizlet',
            label: <span className="font-semibold px-2"><TrophyOutlined className="text-amber-500" /> Quizlet & Trắc nghiệm Chuẩn IIA</span>,
            children: <IiaQuizletTab />
          },
          {
            key: 'roles',
            label: <span className="font-semibold px-2"><SafetyCertificateOutlined /> Hướng dẫn theo Vai trò</span>,
            children: (
              <div>
                <Collapse 
                  defaultActiveKey={['role-1', 'role-2']}
                  className="bg-transparent border-none space-y-4"
                  items={[
                    {
                      key: 'role-1',
                      label: (
                        <Space className="py-1">
                          <Tag color="blue" className="font-bold text-sm px-3 py-1">Kiểm toán viên (KTV)</Tag>
                          <span className="font-semibold text-slate-800 text-base">Hướng dẫn nghiệp vụ cốt lõi dành cho KTV</span>
                        </Space>
                      ),
                      children: (
                        <div className="p-4 bg-blue-50/40 rounded-xl space-y-4">
                          <Paragraph className="text-slate-700">
                            Với vai trò Kiểm toán viên, công việc trọng tâm của bạn là thực hiện các thủ tục kiểm toán, lấy mẫu, lập giấy tờ làm việc (WP) và theo dõi bằng chứng khắc phục.
                          </Paragraph>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card size="small" className="rounded-xl border-blue-200">
                              <span className="font-bold text-blue-800 block mb-2">1. Xem phân công nhiệm vụ</span>
                              <p className="text-xs text-slate-600 mb-3">Vào mục <b>Đoàn KT & Kanban</b> để xem các cuộc kiểm toán bạn tham gia và nhiệm vụ cụ thể.</p>
                              <Button type="primary" ghost size="small" onClick={() => navigate('/audit-engagements')}>{t('userGuide.btnOpenEngagements', 'Mở Đoàn KT')}</Button>
                            </Card>
                            <Card size="small" className="rounded-xl border-blue-200">
                              <span className="font-bold text-blue-800 block mb-2">2. Lập Giấy tờ làm việc (WP)</span>
                              <p className="text-xs text-slate-600 mb-3">Ghi nhận chi tiết kết quả kiểm tra mẫu, đính kèm file bằng chứng và gửi Trưởng đoàn duyệt.</p>
                              <Button type="primary" ghost size="small" onClick={() => navigate('/working-papers')}>{t('userGuide.btnOpenWorkingPapers', 'Mở Giấy tờ làm việc')}</Button>
                            </Card>
                            <Card size="small" className="rounded-xl border-blue-200">
                              <span className="font-bold text-blue-800 block mb-2">3. Ghi nhận Phát hiện (Finding)</span>
                              <p className="text-xs text-slate-600 mb-3">Chuyển các sai phạm từ WP sang Phát hiện, chọn mã lỗi chuẩn hóa và điều khoản NĐ 340.</p>
                              <Button type="primary" ghost size="small" onClick={() => navigate('/audit-findings')}>{t('userGuide.btnOpenFindings', 'Mở Phát hiện KT')}</Button>
                            </Card>
                            <Card size="small" className="rounded-xl border-blue-200">
                              <span className="font-bold text-blue-800 block mb-2">4. Thẩm định khắc phục (Verify)</span>
                              <p className="text-xs text-slate-600 mb-3">Kiểm tra tài liệu minh chứng của đơn vị và bấm xác nhận hoàn thành (Verified).</p>
                              <Button type="primary" ghost size="small" onClick={() => navigate('/recommendations')}>{t('userGuide.btnOpenRecommendations', 'Mở Kiến nghị')}</Button>
                            </Card>
                          </div>
                        </div>
                      )
                    },
                    {
                      key: 'role-2',
                      label: (
                        <Space className="py-1">
                          <Tag color="purple" className="font-bold text-sm px-3 py-1">Trưởng đoàn Kiểm toán</Tag>
                          <span className="font-semibold text-slate-800 text-base">Hướng dẫn điều phối và quản lý cuộc kiểm toán</span>
                        </Space>
                      ),
                      children: (
                        <div className="p-4 bg-purple-50/40 rounded-xl space-y-4">
                          <Paragraph className="text-slate-700">
                            Trưởng đoàn chịu trách nhiệm toàn diện về chất lượng cuộc kiểm toán, phân rã công việc WBS, duyệt WP và tổng hợp dự thảo báo cáo.
                          </Paragraph>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card size="small" className="rounded-xl border-purple-200">
                              <span className="font-bold text-purple-800 block mb-2">1. Thiết lập WBS & Phân công</span>
                              <p className="text-xs text-slate-600 mb-3">Tạo các phần hành kiểm toán (Workstreams) và giao nhiệm vụ cho từng KTV.</p>
                              <Button type="primary" ghost size="small" onClick={() => navigate('/audit-engagements')}>{t('userGuide.btnOpenKanban', 'Mở Kanban Đoàn KT')}</Button>
                            </Card>
                            <Card size="small" className="rounded-xl border-purple-200">
                              <span className="font-bold text-purple-800 block mb-2">2. Soạn thảo Báo cáo KT</span>
                              <p className="text-xs text-slate-600 mb-3">Tự động tổng hợp các finding vào dự thảo báo cáo, xếp loại mức độ cuộc kiểm toán.</p>
                              <Button type="primary" ghost size="small" onClick={() => navigate('/audit-reports')}>{t('userGuide.btnOpenReports', 'Mở Báo cáo KT')}</Button>
                            </Card>
                          </div>
                        </div>
                      )
                    },
                    {
                      key: 'role-3',
                      label: (
                        <Space className="py-1">
                          <Tag color="cyan" className="font-bold text-sm px-3 py-1">Đơn vị được Kiểm toán (ĐVĐKT)</Tag>
                          <span className="font-semibold text-slate-800 text-base">Hướng dẫn giải trình và cập nhật khắc phục</span>
                        </Space>
                      ),
                      children: (
                        <div className="p-4 bg-cyan-50/40 rounded-xl space-y-4">
                          <Paragraph className="text-slate-700">
                            Chi nhánh / Khối phòng ban nhận kiến nghị từ KTNB, xây dựng kế hoạch khắc phục, tải lên minh chứng và gửi xác nhận.
                          </Paragraph>
                          <Card size="small" className="rounded-xl border-cyan-200">
                            <span className="font-bold text-cyan-800 block mb-2">Quy trình khắc phục kiến nghị:</span>
                            <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-2 mb-3">
                              <li>Truy cập <b>Kiến nghị & Khắc phục</b> để xem danh sách kiến nghị.</li>
                              <li>Bấm <b>Cập nhật Kế hoạch</b>, chỉ định cán bộ đầu mối và ngày hoàn thành cam kết.</li>
                              <li>Sau khi xử lý xong, tải lên tài liệu minh chứng (Quyết định, biên bản, hợp đồng sửa đổi...).</li>
                              <li>Bấm <b>Gửi xác nhận</b> để KTV vào kiểm tra đóng kiến nghị.</li>
                            </ol>
                            <Button type="primary" ghost size="small" onClick={() => navigate('/recommendations')}>{t('userGuide.btnOpenRecPortal', 'Mở Cổng Kiến nghị')}</Button>
                          </Card>
                        </div>
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: 'checklist',
            label: <span className="font-semibold px-2"><CheckCircleOutlined /> Onboarding Checklist</span>,
            children: (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <Title level={4} className="!mb-1 text-slate-800">Nhiệm vụ Làm quen Hệ thống</Title>
                    <Text type="secondary">Hoàn thành các mục dưới đây để nắm vững 100% thao tác cơ bản trên Smart Audit 4.0</Text>
                  </div>
                  <Tag color="green" className="text-sm px-3 py-1 font-bold">
                    Hoàn thành: {completedCount}/{checklist.length}
                  </Tag>
                </div>

                <Progress percent={progressPercent} status="active" className="mb-6" />

                <div className="space-y-3">
                  {checklist.map(item => (
                    <div 
                      key={item.id} 
                      className={`p-4 rounded-xl border flex items-center justify-between transition-all ${item.done ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                    >
                      <Checkbox 
                        checked={item.done} 
                        onChange={() => handleToggleChecklist(item.id)}
                        className="text-sm font-medium text-slate-800"
                      >
                        <span className={item.done ? 'line-through text-slate-400' : 'text-slate-800'}>
                          {item.title}
                        </span>
                      </Checkbox>
                      {item.route && (
                        <Button 
                          type="link" 
                          size="small" 
                          icon={<ArrowRightOutlined />} 
                          onClick={() => navigate(item.route)}
                        >
                          Đi đến trang
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          },
          {
            key: 'chatbot',
            label: <span className="font-semibold px-2"><RobotOutlined /> Trợ lý AI Hướng dẫn 24/7</span>,
            children: (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chat Panel */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col h-[600px] shadow-sm">
                  <div className="p-4 border-b border-slate-200 bg-slate-50 rounded-t-xl flex justify-between items-center">
                    <Space>
                      <Badge status="processing" color="#52c41a" />
                      <span className="font-bold text-slate-800">Smart Audit Onboarding AI Copilot</span>
                    </Space>
                    <Tag color="blue">Ollama & System KB</Tag>
                  </div>

                  {/* Message History */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                    {chatMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm ${
                            msg.sender === 'user' 
                              ? 'bg-blue-600 text-white rounded-br-none' 
                              : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200'
                          }`}
                        >
                          <div className="whitespace-pre-wrap font-sans leading-relaxed">
                            {msg.text}
                          </div>

                          {/* Suggested Links */}
                          {msg.suggestedLinks && msg.suggestedLinks.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-200/50 flex flex-wrap gap-2">
                              <span className="text-xs text-blue-800 font-bold block w-full">📌 Liên kết nhanh:</span>
                              {msg.suggestedLinks.map((link, lIdx) => (
                                <Button 
                                  key={lIdx} 
                                  size="small" 
                                  type="primary" 
                                  className="text-xs rounded-lg font-semibold"
                                  onClick={() => {
                                    if (link.route.startsWith('/user-guide')) {
                                      const url = new URL(link.route, window.location.origin);
                                      const tabParam = url.searchParams.get('tab');
                                      const subTabParam = url.searchParams.get('subTab');
                                      if (tabParam) setActiveTab(tabParam);
                                      if (subTabParam) setHandbookSubTab(subTabParam);
                                      setTimeout(() => {
                                        document.getElementById('user-guide-main-tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                      }, 50);
                                    } else {
                                      navigate(link.route);
                                    }
                                  }}
                                >
                                  {link.title} ➔
                                </Button>
                              ))}
                            </div>
                          )}

                          {/* Quick Action chips inside message */}
                          {msg.quickActions && msg.quickActions.length > 0 && (
                            <div className="mt-3 pt-2 flex flex-wrap gap-1">
                              {msg.quickActions.map((qa, qIdx) => (
                                <Tag 
                                  key={qIdx} 
                                  color="cyan" 
                                  className="cursor-pointer hover:opacity-80 text-xs py-1"
                                  onClick={() => handleSendChat(qa)}
                                >
                                  💬 {qa}
                                </Tag>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-slate-100 p-3 rounded-xl text-slate-500 text-xs flex items-center space-x-2">
                          <RobotOutlined className="animate-spin text-blue-600" />
                          <span>Trợ lý AI đang tìm kiếm câu trả lời...</span>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Box */}
                  <div className="p-3 border-t border-slate-200 bg-white rounded-b-xl flex gap-2">
                    <Input
                      placeholder="Nhập câu hỏi về quy trình hoặc cách sử dụng hệ thống..."
                      value={inputMsg}
                      onChange={e => setInputMsg(e.target.value)}
                      onPressEnter={() => handleSendChat()}
                      disabled={chatLoading}
                      className="rounded-xl h-11"
                    />
                    <Button 
                      type="primary" 
                      icon={<SendOutlined />} 
                      onClick={() => handleSendChat()}
                      loading={chatLoading}
                      className="rounded-xl h-11 px-5 font-semibold"
                    >
                      Gửi
                    </Button>
                  </div>
                </div>

                {/* FAQ & Suggestions Sidebar */}
                <div className="space-y-4">
                  <Card title={<span className="text-sm font-bold text-slate-800">💡 Câu hỏi Thường gặp</span>} size="small" className="rounded-xl border-slate-200">
                    <div className="space-y-2">
                      {[
                        'Làm thế nào để tạo cuộc kiểm toán mới?',
                        'Quy trình từ Working Paper sang Finding?',
                        'Cách liên kết mã lỗi NĐ 340 vào phát hiện?',
                        'Phân quyền tài khoản và chức danh hệ thống?',
                        'Làm sao để xuất báo cáo kiểm toán ra Word/PDF?'
                      ].map((faq, fIdx) => (
                        <Button 
                          key={fIdx} 
                          type="text" 
                          block 
                          className="text-left text-xs text-blue-700 hover:bg-blue-50 h-auto py-2 whitespace-normal flex justify-start items-center rounded-lg"
                          onClick={() => handleSendChat(faq)}
                        >
                          <QuestionCircleOutlined className="mr-2 text-blue-500" />
                          {faq}
                        </Button>
                      ))}
                    </div>
                  </Card>

                  <Card title={<span className="text-sm font-bold text-slate-800">📖 Sổ tay Thuật ngữ KTNB</span>} size="small" className="rounded-xl border-slate-200">
                    <div className="space-y-2 text-xs text-slate-600">
                      <div><b>WP (Working Paper):</b> Giấy tờ làm việc ghi chép kết quả kiểm tra mẫu.</div>
                      <div><b>Finding:</b> Phát hiện kiểm toán / Sai phạm chuẩn hóa.</div>
                      <div><b>RCM:</b> Ma trận Rủi ro và Kiểm soát (Risk Control Matrix).</div>
                      <div><b>KRI:</b> Chỉ số Cảnh báo Rủi ro Sớm (Key Risk Indicator).</div>
                      <div><b>QAIP:</b> Chương trình Đảm bảo & Cải thiện Chất lượng.</div>
                    </div>
                  </Card>
                </div>
              </div>
            )
          }
        ]}
      />
      </div>
    </div>
  );
};

export default UserGuide;
