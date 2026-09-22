import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Button, Tag, Space, Radio,
  Progress, Alert, Badge, Tooltip, Divider, Empty
} from 'antd';
import {
  BookOutlined, CheckCircleOutlined, CloseCircleOutlined,
  SwapOutlined, RetweetOutlined, ArrowLeftOutlined, ArrowRightOutlined,
  TrophyOutlined, BulbOutlined, StarOutlined, StarFilled,
  CompassOutlined, RocketOutlined, LinkOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { IIA_QUIZ_DATA } from '../data/iiaQuizData';
import type { QuizQuestion } from '../data/iiaQuizData';

const { Title, Text, Paragraph } = Typography;

export const IiaQuizletTab: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'flashcard' | 'quiz'>('flashcard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Flashcard states
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [masteredCards, setMasteredCards] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('iia_mastered_cards');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Quiz mode states
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Filtered list
  const filteredQuestions = IIA_QUIZ_DATA.filter(q => {
    if (selectedCategory === 'all') return true;
    return q.category === selectedCategory;
  });

  const currentCard = filteredQuestions[cardIndex] || filteredQuestions[0];

  const handleToggleMastered = (id: string) => {
    let next: string[];
    if (masteredCards.includes(id)) {
      next = masteredCards.filter(c => c !== id);
    } else {
      next = [...masteredCards, id];
    }
    setMasteredCards(next);
    localStorage.setItem('iia_mastered_cards', JSON.stringify(next));
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev + 1) % filteredQuestions.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCardIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const rand = Math.floor(Math.random() * filteredQuestions.length);
    setCardIndex(rand);
  };

  // Quiz calculations
  const totalQuestions = filteredQuestions.length;
  const answeredCount = Object.keys(userAnswers).filter(id => filteredQuestions.some(q => q.id === id)).length;
  const correctCount = filteredQuestions.filter(q => userAnswers[q.id] === q.correctAnswer).length;
  const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const handleSelectAnswer = (qId: string, optIdx: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optIdx
    }));
  };

  const handleResetQuiz = () => {
    setUserAnswers({});
    setQuizSubmitted(false);
  };

  return (
    <div className="space-y-6">
      {/* Category filter & Mode switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <Space wrap>
          <span className="font-bold text-slate-700 text-sm">Chủ đề:</span>
          <Radio.Group 
            value={selectedCategory} 
            onChange={e => {
              setSelectedCategory(e.target.value);
              setCardIndex(0);
              setIsFlipped(false);
            }}
            buttonStyle="solid"
            size="middle"
          >
            <Radio.Button value="all">Tất cả ({IIA_QUIZ_DATA.length})</Radio.Button>
            <Radio.Button value="iia_standards">Chuẩn mực IIA IPPF</Radio.Button>
            <Radio.Button value="methodology">Phương pháp luận KT</Radio.Button>
            <Radio.Button value="regulations">Pháp lý & Thông tư NHNN</Radio.Button>
            <Radio.Button value="smart_audit_app">Thực hành Smart Audit</Radio.Button>
          </Radio.Group>
        </Space>

        <Space>
          <Radio.Group 
            value={mode} 
            onChange={e => setMode(e.target.value)} 
            buttonStyle="solid"
            size="middle"
          >
            <Radio.Button value="flashcard">
              <SwapOutlined className="mr-1" /> Thẻ Flashcard
            </Radio.Button>
            <Radio.Button value="quiz">
              <TrophyOutlined className="mr-1" /> Trắc nghiệm Chấm điểm
            </Radio.Button>
          </Radio.Group>
        </Space>
      </div>

      {filteredQuestions.length === 0 ? (
        <Empty description="Không có câu hỏi trong phân loại này" />
      ) : mode === 'flashcard' ? (
        /* ══════════ FLASHCARD MODE ══════════ */
        <div className="max-w-4xl mx-auto">
          {/* Card Progress & Stats */}
          <div className="flex justify-between items-center mb-3 text-sm text-slate-600">
            <span className="font-semibold">
              Thẻ {cardIndex + 1} / {filteredQuestions.length}
            </span>
            <Space>
              <Tag color="gold" icon={<StarFilled />}>
                Đã nắm vững: {masteredCards.filter(id => filteredQuestions.some(q => q.id === id)).length}/{filteredQuestions.length}
              </Tag>
              <Button size="small" icon={<RetweetOutlined />} onClick={handleShuffle}>
                Xáo trộn
              </Button>
            </Space>
          </div>

          {/* Flashcard Box */}
          <div 
            className="perspective-1000 cursor-pointer min-h-[380px]"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <Card 
              className={`rounded-3xl shadow-lg border-2 transition-all duration-300 p-6 flex flex-col justify-between ${
                isFlipped 
                  ? 'bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white border-blue-400' 
                  : 'bg-white text-slate-800 border-blue-200 hover:border-blue-400 hover:shadow-xl'
              }`}
              style={{ minHeight: 380 }}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start mb-4">
                <Tag color={isFlipped ? 'cyan' : 'blue'} className="font-bold text-xs px-3 py-1 rounded-full">
                  {currentCard.categoryName}
                </Tag>
                <Space onClick={e => e.stopPropagation()}>
                  <Button 
                    type="text" 
                    icon={masteredCards.includes(currentCard.id) ? <StarFilled className="text-amber-400 text-lg" /> : <StarOutlined className="text-slate-400 text-lg" />}
                    onClick={() => handleToggleMastered(currentCard.id)}
                    title="Đánh dấu đã thuộc"
                  />
                  <Tag className="text-xs">{isFlipped ? 'Mặt sau: Đáp án & Giải thích' : 'Mặt trước: Câu hỏi'}</Tag>
                </Space>
              </div>

              {/* Card Body */}
              <div className="flex-1 flex flex-col justify-center my-4">
                {!isFlipped ? (
                  <div>
                    <span className="text-xs uppercase tracking-wider text-blue-600 font-bold block mb-2">
                      💡 CÂU HỎI TÌNH HUỐNG CHUẨN IIA:
                    </span>
                    <Title level={3} className="!text-slate-800 !mb-4 leading-relaxed font-sans">
                      {currentCard.flashcardFront}
                    </Title>
                    <Paragraph className="text-slate-500 text-sm">
                      (Bấm vào thẻ hoặc nút "Lật thẻ" để xem giải thích chuyên sâu & chuẩn mực liên quan)
                    </Paragraph>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs uppercase tracking-wider text-amber-300 font-bold block mb-2">
                      ✅ ĐÁP ÁN & NGUYÊN TẮC CỐT LÕI:
                    </span>
                    <div className="text-base text-blue-50 font-medium whitespace-pre-wrap leading-relaxed mb-4">
                      {currentCard.flashcardBack}
                    </div>
                    <div className="p-3 bg-white/10 rounded-xl border border-white/20 text-xs text-blue-100 space-y-1">
                      <div><b>📚 Chuẩn mực:</b> {currentCard.standardRef}</div>
                      <div><b>🔍 Giải thích chuyên sâu:</b> {currentCard.explanation}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-4 border-t border-slate-100/30 flex justify-between items-center text-xs">
                <span className={isFlipped ? 'text-blue-200' : 'text-slate-400'}>
                  {isFlipped ? '✨ Bấm để quay lại mặt trước' : '🔄 Bấm để xem đáp án'}
                </span>
                {isFlipped && currentCard.appLink && (
                  <Button 
                    type="link" 
                    size="small" 
                    icon={<LinkOutlined />} 
                    className="!text-amber-300 hover:!underline !p-0 font-bold"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentCard.appLink) navigate(currentCard.appLink.route);
                    }}
                  >
                    Thực hành: {currentCard.appLink.title} ➔
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <Button 
              size="large" 
              icon={<ArrowLeftOutlined />} 
              onClick={handlePrevCard}
              className="rounded-xl px-6 font-semibold"
            >
              Thẻ trước
            </Button>
            <Button 
              type="primary" 
              size="large" 
              icon={<SwapOutlined />} 
              onClick={() => setIsFlipped(!isFlipped)}
              className="bg-blue-600 rounded-xl px-8 font-bold shadow-md h-12 text-base"
            >
              {isFlipped ? 'Xem Câu hỏi' : 'Lật xem Đáp án'}
            </Button>
            <Button 
              size="large" 
              icon={<ArrowRightOutlined />} 
              onClick={handleNextCard}
              className="rounded-xl px-6 font-semibold"
            >
              Thẻ tiếp
            </Button>
          </div>
        </div>
      ) : (
        /* ══════════ PRACTICE QUIZ MODE ══════════ */
        <div className="space-y-6">
          {/* Header Score summary */}
          <Card className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md border border-indigo-800">
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={16}>
                <Title level={4} className="!text-white !mb-1">
                  Luyện tập Trắc nghiệm Chuẩn IIA & Smart Audit
                </Title>
                <Paragraph className="text-slate-300 text-xs !mb-0">
                  Chọn câu trả lời cho từng tình huống dưới đây. Hệ thống sẽ chấm điểm và hiển thị giải thích chuyên sâu ngay lập tức.
                </Paragraph>
              </Col>
              <Col xs={24} md={8} className="text-right">
                <Space size="large">
                  <div>
                    <span className="text-xs text-slate-400 block">Đã trả lời</span>
                    <span className="text-xl font-bold text-blue-400">{answeredCount}/{totalQuestions}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Đúng</span>
                    <span className="text-xl font-bold text-emerald-400">{correctCount}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Tỷ lệ</span>
                    <span className="text-xl font-bold text-amber-400">{scorePercent}%</span>
                  </div>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* List Questions */}
          <div className="space-y-6">
            {filteredQuestions.map((item, idx) => {
              const selectedOpt = userAnswers[item.id];
              const isAnswered = selectedOpt !== undefined;
              const isCorrect = selectedOpt === item.correctAnswer;

              return (
                <Card 
                  key={item.id} 
                  className={`rounded-2xl border-2 transition-all shadow-sm ${
                    isAnswered 
                      ? isCorrect 
                        ? 'border-emerald-300 bg-emerald-50/20' 
                        : 'border-rose-300 bg-rose-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <Space>
                      <Badge 
                        count={idx + 1} 
                        style={{ backgroundColor: isAnswered ? (isCorrect ? '#52c41a' : '#f5222d') : '#ea9105' }} 
                      />
                      <Tag color="gold" className="font-semibold text-xs">{item.categoryName}</Tag>
                    </Space>
                    {isAnswered && (
                      <Tag color={isCorrect ? 'success' : 'error'} className="font-bold px-3 py-0.5 text-xs">
                        {isCorrect ? '✓ CHÍNH XÁC' : '✕ CHƯA ĐÚNG'}
                      </Tag>
                    )}
                  </div>

                  <Title level={5} className="!text-slate-800 !mb-4 font-sans leading-snug">
                    {item.question}
                  </Title>

                  {/* Options */}
                  <div className="space-y-2.5 mb-4">
                    {item.options.map((opt, optIdx) => {
                      const isOptionSelected = selectedOpt === optIdx;
                      const isThisCorrect = item.correctAnswer === optIdx;

                      let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:border-blue-400';
                      if (isAnswered) {
                        if (isThisCorrect) {
                          btnStyle = 'bg-emerald-100/80 border-emerald-500 text-emerald-900 font-bold';
                        } else if (isOptionSelected && !isCorrect) {
                          btnStyle = 'bg-rose-100/80 border-rose-500 text-rose-900 font-bold';
                        } else {
                          btnStyle = 'bg-white border-slate-200 text-slate-400 opacity-60';
                        }
                      }

                      return (
                        <div 
                          key={optIdx}
                          onClick={() => handleSelectAnswer(item.id, optIdx)}
                          className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${btnStyle}`}
                        >
                          <span className="text-sm">{opt}</span>
                          {isAnswered && isThisCorrect && (
                            <CheckCircleOutlined className="text-emerald-600 text-base ml-2" />
                          )}
                          {isAnswered && isOptionSelected && !isCorrect && (
                            <CloseCircleOutlined className="text-rose-600 text-base ml-2" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Deep-dive Explanation Box */}
                  {isAnswered && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2 animate-fadeIn">
                      <div className="flex items-center text-blue-700 font-bold text-sm">
                        <BulbOutlined className="mr-1.5" /> Giải thích Chuyên sâu (Rationale):
                      </div>
                      <Paragraph className="text-slate-700 text-xs !mb-2 leading-relaxed">
                        {item.explanation}
                      </Paragraph>
                      <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <span className="text-slate-500 font-semibold">
                          📖 Căn cứ: <span className="text-slate-800">{item.standardRef}</span>
                        </span>
                        {item.appLink && (
                          <Button 
                            type="link" 
                            size="small" 
                            className="!text-blue-600 font-bold !p-0"
                            onClick={() => {
                              if (item.appLink) navigate(item.appLink.route);
                            }}
                          >
                            🔗 Thực hành trên phần mềm: {item.appLink.title} ➔
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Reset Quiz Button */}
          {answeredCount > 0 && (
            <div className="text-center pt-4">
              <Button size="large" icon={<RetweetOutlined />} onClick={handleResetQuiz} className="rounded-xl px-8 font-semibold">
                Làm lại bộ câu hỏi
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
