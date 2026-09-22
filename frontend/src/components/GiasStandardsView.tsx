import React, { useState } from 'react';
import {
  Card, Row, Col, Typography, Input, Tag, Space, Button,
  Collapse, Divider, Alert, Tooltip, Badge
} from 'antd';
import {
  SafetyCertificateOutlined, SearchOutlined, ArrowRightOutlined,
  BookOutlined, CompassOutlined, CheckCircleOutlined, InfoCircleOutlined,
  AppstoreOutlined, FileProtectOutlined, TeamOutlined, FundProjectionScreenOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { giasStandardsData, type GiasDomain, type GiasPrinciple } from '../data/giasStandardsData';

const { Title, Text, Paragraph } = Typography;

export const GiasStandardsView: React.FC = () => {
  const navigate = useNavigate();
  const [selectedDomain, setSelectedDomain] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Count total standards
  const totalPrinciples = giasStandardsData.reduce((acc, d) => acc + d.principles.length, 0);
  const totalStandards = giasStandardsData.reduce(
    (acc, d) => acc + d.principles.reduce((pAcc, p) => pAcc + p.standards.length, 0), 0
  );

  // Filter logic
  const filteredDomains = giasStandardsData
    .filter(d => selectedDomain === 'ALL' || d.id === selectedDomain)
    .map(d => {
      if (!searchKeyword.trim()) return d;
      const kw = searchKeyword.toLowerCase();
      const matchedPrinciples = d.principles.filter(p => {
        const pMatch = p.titleVi.toLowerCase().includes(kw) ||
          p.titleEn.toLowerCase().includes(kw) ||
          p.summary.toLowerCase().includes(kw);
        const sMatch = p.standards.some(s =>
          s.code.toLowerCase().includes(kw) ||
          s.nameVi.toLowerCase().includes(kw) ||
          s.nameEn.toLowerCase().includes(kw) ||
          s.description.toLowerCase().includes(kw) ||
          s.smartAuditSupport.toLowerCase().includes(kw)
        );
        return pMatch || sMatch;
      });
      return { ...d, principles: matchedPrinciples };
    })
    .filter(d => d.principles.length > 0);

  return (
    <div className="space-y-6">
      {/* Header Banner - High Contrast Executive Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-7 border border-amber-200/90 shadow-xs relative overflow-hidden">
        {/* Soft elegant watermark */}
        <div className="absolute -right-8 -bottom-10 opacity-5 pointer-events-none text-amber-950">
          <SafetyCertificateOutlined style={{ fontSize: 210 }} />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-white font-bold bg-[#ea9105] rounded-full text-xs shadow-2xs">
              🏛️ CHUẨN MỰC NGHỀ NGHIỆP TOÀN CẦU
            </span>
            <span className="inline-flex items-center px-3 py-1 text-white font-semibold bg-slate-800 rounded-full text-xs shadow-2xs">
              HIỆU LỰC CHÍNH THỨC 09/01/2025
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 font-bold border border-emerald-300 bg-emerald-50 text-emerald-800 rounded-full text-xs shadow-2xs">
              ✓ ĐÃ TÍCH HỢP 100% TRÊN LPBANK SMART AUDIT
            </span>
          </div>

          <Title level={3} style={{ color: '#0f172a', marginBottom: 8, fontWeight: 900, fontSize: '24px', letterSpacing: '-0.02em' }}>
            Bộ Chuẩn Mực Kiểm Toán Nội Bộ Toàn Cầu (IIA GIAS 2024)
          </Title>
          <Paragraph style={{ color: '#475569', fontSize: 14, marginBottom: 20 }} className="max-w-3xl leading-relaxed">
            Khung chuẩn mực nghề nghiệp mới nhất của Hiệp hội Kiểm toán Nội bộ Quốc tế (The IIA) thay thế toàn diện khung IPPF 2017. Toàn bộ 5 Miền (Domains), 15 Nguyên tắc (Principles) và 52 Tiêu chuẩn chi tiết bắt buộc đã được tích hợp và lập trình sẵn sàng đối chiếu trực tiếp trên hệ thống <strong style={{ color: '#ea9105' }}>LPBank Smart Audit 4.0</strong>.
          </Paragraph>

          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <div className="bg-gradient-to-b from-amber-50 to-white rounded-xl p-4 border border-amber-200/80 text-center shadow-xs hover:border-amber-400 transition-colors">
                <div className="text-3xl font-black text-amber-600 mb-0.5">5</div>
                <div className="text-xs font-bold text-amber-950 uppercase tracking-wide">Miền Nghiệp vụ</div>
                <div className="text-[11px] text-slate-500 font-medium">5 Domains</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="bg-gradient-to-b from-blue-50 to-white rounded-xl p-4 border border-blue-200/80 text-center shadow-xs hover:border-blue-400 transition-colors">
                <div className="text-3xl font-black text-blue-600 mb-0.5">15</div>
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wide">Nguyên tắc cốt lõi</div>
                <div className="text-[11px] text-slate-500 font-medium">15 Principles</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="bg-gradient-to-b from-purple-50 to-white rounded-xl p-4 border border-purple-200/80 text-center shadow-xs hover:border-purple-400 transition-colors">
                <div className="text-3xl font-black text-purple-600 mb-0.5">{totalStandards}+</div>
                <div className="text-xs font-bold text-purple-950 uppercase tracking-wide">Tiêu chuẩn Chi tiết</div>
                <div className="text-[11px] text-slate-500 font-medium">52 Standards</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div className="bg-gradient-to-b from-emerald-50 to-white rounded-xl p-4 border border-emerald-200/80 text-center shadow-xs hover:border-emerald-400 transition-colors">
                <div className="text-3xl font-black text-emerald-600 mb-0.5">100%</div>
                <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">Sẵn sàng vận hành</div>
                <div className="text-[11px] text-slate-500 font-medium">Smart Audit Ready</div>
              </div>
            </Col>
          </Row>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card variant="borderless" className="shadow-xs rounded-2xl border border-slate-200">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Domain Selector Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              type={selectedDomain === 'ALL' ? 'primary' : 'default'}
              onClick={() => setSelectedDomain('ALL')}
              className={`rounded-xl font-bold text-xs h-9 ${
                selectedDomain === 'ALL' 
                  ? '!bg-[#ea9105] !border-[#ea9105] !text-white shadow-xs' 
                  : 'border-slate-200 text-slate-700 hover:text-amber-700 hover:border-amber-300'
              }`}
            >
              Tất cả các Miền (5 Domains)
            </Button>
            {giasStandardsData.map(d => (
              <Button
                key={d.id}
                type={selectedDomain === d.id ? 'primary' : 'default'}
                onClick={() => setSelectedDomain(d.id)}
                className={`rounded-xl font-semibold text-xs h-9 ${
                  selectedDomain === d.id 
                    ? '!bg-[#ea9105] !border-[#ea9105] !text-white shadow-xs' 
                    : 'border-slate-200 text-slate-700 hover:text-amber-700 hover:border-amber-300'
                }`}
              >
                {d.number}: {d.titleVi}
              </Button>
            ))}
          </div>

          {/* Search Input */}
          <Input
            placeholder="Tìm theo mã chuẩn mực, tên hoặc từ khóa..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="rounded-xl w-full lg:w-72"
            allowClear
          />
        </div>
      </Card>

      {/* Domains List */}
      <div className="space-y-6">
        {filteredDomains.length === 0 ? (
          <Card className="text-center py-12 rounded-2xl border border-dashed border-slate-300">
            <Text type="secondary">Không tìm thấy chuẩn mực nào phù hợp với từ khóa "{searchKeyword}".</Text>
          </Card>
        ) : (
          filteredDomains.map(domain => (
            <Card
              key={domain.id}
              variant="borderless"
              className="shadow-sm rounded-2xl border border-slate-200 overflow-hidden"
              styles={{
                header: {
                  borderBottom: `2px solid ${domain.color}`,
                  background: '#fcfaf7',
                  padding: '16px 24px'
                }
              }}
              title={
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="px-3 py-1 rounded-lg text-white font-bold text-xs tracking-wider uppercase"
                      style={{ backgroundColor: domain.color }}
                    >
                      {domain.number}
                    </span>
                    <span className="text-base sm:text-lg font-black text-slate-800">
                      {domain.titleVi}
                    </span>
                    <span className="text-xs text-slate-500 hidden md:inline font-medium italic">
                      ({domain.titleEn})
                    </span>
                  </div>
                  <Tag color="gold" className="font-semibold rounded-full px-3 py-0.5 m-0 text-xs">
                    {domain.badge}
                  </Tag>
                </div>
              }
            >
              <Paragraph className="text-slate-600 text-sm mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                {domain.description}
              </Paragraph>

              {/* Principles Accordion */}
              <div className="space-y-4">
                {domain.principles.map(principle => (
                  <div
                    key={principle.number}
                    className="border border-slate-200 rounded-xl overflow-hidden hover:border-amber-400 transition-colors"
                  >
                    <div className="p-4 bg-amber-50/40 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                      <div>
                        <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                          <CheckCircleOutlined className="text-amber-600" />
                          <span>{principle.titleVi}</span>
                        </div>
                        <div className="text-xs text-slate-500 italic mt-0.5">
                          {principle.titleEn}
                        </div>
                      </div>
                      <Tag color="cyan" className="font-semibold text-xs">
                        {principle.standards.length} Tiêu chuẩn
                      </Tag>
                    </div>

                    <div className="p-4 bg-white space-y-4">
                      <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border-l-4 border-amber-500">
                        <b>Tóm lược nguyên tắc:</b> {principle.summary}
                      </div>

                      {/* Standards Grid */}
                      <div className="space-y-3">
                        {principle.standards.map((std, sIdx) => (
                          <div
                            key={sIdx}
                            className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-xs transition-shadow"
                          >
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <Tag color="blue" className="font-bold text-xs m-0 px-2 py-0.5">
                                  {std.code}
                                </Tag>
                                <span className="font-bold text-slate-800 text-sm">
                                  {std.nameVi}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500 italic">
                                {std.nameEn}
                              </span>
                            </div>

                            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                              {std.description}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                              {/* Mandatory Requirements */}
                              <div className="p-2.5 rounded-lg bg-red-50/50 border border-red-100">
                                <div className="text-[11px] font-bold text-red-800 mb-1 flex items-center gap-1">
                                  <span>📌 Yêu cầu thực hành bắt buộc:</span>
                                </div>
                                <ul className="text-[11px] text-slate-700 pl-3.5 list-disc space-y-0.5 m-0">
                                  {std.requirements.map((req, rIdx) => (
                                    <li key={rIdx}>{req}</li>
                                  ))}
                                </ul>
                              </div>

                              {/* Smart Audit Mapping */}
                              <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between">
                                <div>
                                  <div className="text-[11px] font-bold text-emerald-800 mb-1 flex items-center gap-1">
                                    <span>⚡ Ánh xạ trên LPBank Smart Audit:</span>
                                  </div>
                                  <p className="text-[11px] text-slate-700 leading-snug m-0">
                                    {std.smartAuditSupport}
                                  </p>
                                </div>
                                {std.relatedRoute && (
                                  <div className="mt-2 text-right">
                                    <Button
                                      type="link"
                                      size="small"
                                      className="!p-0 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                                      onClick={() => navigate(std.relatedRoute!)}
                                    >
                                      Xem tính năng trên hệ thống <ArrowRightOutlined />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
