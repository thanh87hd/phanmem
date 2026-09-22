import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calculator,
  Sliders,
  ChevronRight,
  TrendingDown,
  FileSpreadsheet,
} from 'lucide-react';
import api from '../services/api';

interface AuditRatingItem {
  id: number;
  ratingCode: string;
  engagementId: string;
  auditObjectId: string;
  engagementTitle: string;
  auditType: string;
  coverageGapPct: number;
  residualRiskScore: number;
  controlEffectivenessScore: number;
  criticalIssuesCount: number;
  highIssuesCount: number;
  moderateIssuesCount: number;
  lowIssuesCount: number;
  issueSeverityScore: number;
  managementResponseScore: number;
  scopeLimitation: string;
  baseWeightedScore: number;
  calculatedRating: string;
  decisionRuleRating: string;
  decisionRuleRationale: string;
  finalRating: string;
  overallConclusion: string;
  keyStrengths: string;
  keyWeaknesses: string;
  status: string;
}

export const AuditRatingView: React.FC = () => {
  const [items, setItems] = useState<AuditRatingItem[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    satisfactory: 0,
    generallySatisfactory: 0,
    needsImprovement: 0,
    unsatisfactory: 0,
  });
  const [loading, setLoading] = useState(false);
  const [ratingFilter, setRatingFilter] = useState('');
  const [selectedRating, setSelectedRating] = useState<AuditRatingItem | null>(null);

  // Simulator State
  const [simResidual, setSimResidual] = useState(2.2);
  const [simControl, setSimControl] = useState(2.0);
  const [simCritical, setSimCritical] = useState(0);
  const [simHigh, setSimHigh] = useState(1);
  const [simModerate, setSimModerate] = useState(4);
  const [simGap, setSimGap] = useState(0.05);
  const [simResponse, setSimResponse] = useState(1.5);
  const [simScope, setSimScope] = useState('None');
  const [simResult, setSimResult] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resList, resStats] = await Promise.all([
        api.get('/audit-ratings', { params: { rating: ratingFilter || undefined } }),
        api.get('/audit-ratings/stats'),
      ]);
      setItems(resList.data || []);
      setStats(resStats.data);
    } catch (err) {
      console.error('Failed to load ratings', err);
    } finally {
      setLoading(false);
    }
  };

  const calculatePreview = async () => {
    try {
      const res = await api.post('/audit-ratings/preview-calculate', {
        residualRiskScore: simResidual,
        controlEffectivenessScore: simControl,
        criticalIssuesCount: simCritical,
        highIssuesCount: simHigh,
        moderateIssuesCount: simModerate,
        coverageGapPct: simGap,
        managementResponseScore: simResponse,
        scopeLimitation: simScope,
      });
      setSimResult(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ratingFilter]);

  useEffect(() => {
    calculatePreview();
  }, [simResidual, simControl, simCritical, simHigh, simModerate, simGap, simResponse, simScope]);

  const getTierBadge = (rating: string) => {
    switch (rating) {
      case 'Satisfactory':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> Satisfactory (Tốt)
          </span>
        );
      case 'Generally Satisfactory':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" /> Generally Satisfactory (Khá)
          </span>
        );
      case 'Needs Improvement':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <AlertTriangle className="w-3.5 h-3.5" /> Needs Improvement (Cần cải thiện)
          </span>
        );
      case 'Unsatisfactory':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1.5 w-fit">
            <XCircle className="w-3.5 h-3.5" /> Unsatisfactory (Không đạt)
          </span>
        );
      default:
        return <span>{rating}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-6 rounded-2xl border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Phương pháp luận KTNB Lộc Phát
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Sheet 03_Audit_Rating</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-500" />
            Audit Rating Engine (Xếp Hạng Cuộc Kiểm Toán)
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
            Kết luận xếp hạng tổng thể dựa trên 5 cấu phần có trọng số và 6 quy tắc cứng (Hard Decision Rules)
          </p>
        </div>
      </div>

      {/* 4 Tiers Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold mb-1">
            <span>Satisfactory (Tốt)</span>
            <span className="font-mono">1.00 - 1.75</span>
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.satisfactory}</div>
          <div className="text-[11px] text-slate-400 mt-1">KSNB vận hành hiệu quả cao</div>
        </div>

        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-400 font-semibold mb-1">
            <span>Generally Satisfactory (Khá)</span>
            <span className="font-mono">1.76 - 2.50</span>
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.generallySatisfactory}</div>
          <div className="text-[11px] text-slate-400 mt-1">KSNB cơ bản đạt yêu cầu</div>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-400 font-semibold mb-1">
            <span>Needs Improvement (Cần Cải Thiện)</span>
            <span className="font-mono">2.51 - 3.25</span>
          </div>
          <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.needsImprovement}</div>
          <div className="text-[11px] text-slate-400 mt-1">Có tồn tại rủi ro đáng kể</div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-50/30 dark:bg-rose-950/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-semibold mb-1">
            <span>Unsatisfactory (Không Đạt)</span>
            <span className="font-mono">&gt; 3.25</span>
          </div>
          <div className="text-3xl font-bold text-rose-600 dark:text-rose-400">{stats.unsatisfactory}</div>
          <div className="text-[11px] text-slate-400 mt-1">Yếu kém hệ thống hoặc Critical issue</div>
        </div>
      </div>

      {/* Simulator Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Bộ Mô Phỏng Tính Toán Xếp Hạng & Kiểm Tra Quy Tắc Cứng
            </h2>
          </div>
          <span className="text-xs text-slate-400">Tự động kích hoạt các Hard Decision Rules</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form inputs */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between">
                <span>Rủi ro còn lại (Residual Risk) [30%]</span>
                <span className="text-amber-500 font-mono font-bold">{simResidual} / 4.0</span>
              </label>
              <input
                type="range"
                min="1"
                max="4"
                step="0.1"
                value={simResidual}
                onChange={(e) => setSimResidual(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between">
                <span>Hiệu lực kiểm soát (Control Effect.) [25%]</span>
                <span className="text-amber-500 font-mono font-bold">{simControl} / 4.0</span>
              </label>
              <input
                type="range"
                min="1"
                max="4"
                step="0.1"
                value={simControl}
                onChange={(e) => setSimControl(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Số phát hiện Critical (Nghiêm trọng)
              </label>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSimCritical(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      simCritical === val
                        ? 'bg-rose-500 text-white border-rose-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Số phát hiện High (Cao)
              </label>
              <div className="flex items-center gap-2">
                {[0, 1, 2, 3, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setSimHigh(val)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      simHigh === val
                        ? 'bg-amber-500 text-slate-950 border-amber-600'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between">
                <span>Khoảng trống phạm vi (Coverage Gap) [10%]</span>
                <span className="text-amber-500 font-mono font-bold">{(simGap * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={simGap}
                onChange={(e) => setSimGap(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex justify-between">
                <span>Giới hạn phạm vi (Scope Limitation)</span>
              </label>
              <select
                value={simScope}
                onChange={(e) => setSimScope(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-amber-500"
              >
                <option value="None">None (Không có giới hạn)</option>
                <option value="Minor">Minor (Hạn chế nhỏ)</option>
                <option value="Severe">Severe (Giới hạn nghiêm trọng - Override Rule 3)</option>
              </select>
            </div>
          </div>

          {/* Live Result Card */}
          {simResult && (
            <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Kết Quả Đánh Giá Tự Động
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Điểm cơ sở (Base Score):</span>
                  <span className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                    {simResult.baseWeightedScore}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-600 dark:text-slate-300">Xếp hạng tính toán:</span>
                  <span className="text-sm font-semibold">{simResult.calculatedRating}</span>
                </div>

                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2">
                  <div className="text-xs text-slate-400 font-medium">Kết luận sau Decision Rules:</div>
                  <div>{getTierBadge(simResult.finalRating)}</div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 italic pt-1">
                    {simResult.decisionRuleRationale}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Tuân thủ phương pháp luận KTNB</span>
                <span className="text-emerald-500 font-semibold">100% Khớp Excel</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating Records Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">
            Hồ Sơ Xếp Hạng Cuộc Kiểm Toán Đã Phê Duyệt ({items.length})
          </h3>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500"
          >
            <option value="">-- Tất cả mức xếp hạng --</option>
            <option value="Satisfactory">Satisfactory</option>
            <option value="Generally Satisfactory">Generally Satisfactory</option>
            <option value="Needs Improvement">Needs Improvement</option>
            <option value="Unsatisfactory">Unsatisfactory</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-4">Mã Xếp Hạng</th>
                <th className="py-3 px-4">Cuộc kiểm toán / ĐVKD</th>
                <th className="py-3 px-4 text-center">Điểm RR [30%]</th>
                <th className="py-3 px-4 text-center">Điểm CE [25%]</th>
                <th className="py-3 px-4 text-center">Phát hiện (Crit/High)</th>
                <th className="py-3 px-4 text-center">Điểm Cơ sở</th>
                <th className="py-3 px-4">Kết Luận Xếp Hạng</th>
                <th className="py-3 px-4">Giải Trình Quy Tắc Cứng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Đang tải danh sách xếp hạng cuộc kiểm toán...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    Chưa có hồ sơ xếp hạng nào.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap">
                      {item.ratingCode}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {item.engagementTitle}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">{item.auditObjectId}</span>
                        <span>•</span>
                        <span>{item.auditType}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs">{item.residualRiskScore}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs">{item.controlEffectivenessScore}</td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="font-semibold text-rose-600">{item.criticalIssuesCount}</span>
                      <span className="text-slate-400"> / </span>
                      <span className="font-semibold text-amber-600">{item.highIssuesCount}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                      {item.baseWeightedScore}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">{getTierBadge(item.finalRating)}</td>
                    <td className="py-3.5 px-4 max-w-[280px] text-xs text-slate-600 dark:text-slate-300">
                      {item.decisionRuleRationale || 'Theo điểm cơ sở'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
