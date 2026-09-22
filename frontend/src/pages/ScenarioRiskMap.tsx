import React, { useState, useEffect } from 'react';
import {
  Compass,
  Zap,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Flame,
  Activity,
  Layers,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import api from '../services/api';

interface Scenario {
  id: number;
  scenarioId: string;
  scenarioName: string;
  scenarioType: string;
  horizon: string;
  description: string;
  keyAssumptions: string;
  triggerIndicators: string;
  probabilityPct: number;
  severity: number;
  affectedDomains: string;
  scenarioOwner: string;
}

interface RiskPoint {
  id: string;
  riskId: string;
  riskName: string;
  riskDomain: string;
  materialityExposure: number;
  baseX: number;
  baseY: number;
  baseScore: number;
  x: number;
  y: number;
  score: number;
  delta: number;
  trajectory: string;
  isAboveAppetite: boolean;
  band: string;
  response: string;
  impactOnPlan: string;
}

export const ScenarioRiskMap: React.FC = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string>('SCN-BASE');
  const [riskMapData, setRiskMapData] = useState<{
    scenario: Scenario | null;
    statistics: any;
    points: RiskPoint[];
  }>({
    scenario: null,
    statistics: { totalRisks: 0, aboveAppetiteCount: 0, criticalCount: 0, highCount: 0, breachRate: 0 },
    points: [],
  });
  const [loading, setLoading] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<RiskPoint | null>(null);

  const fetchScenarios = async () => {
    try {
      const res = await api.get('/scenario-analysis/scenarios');
      setScenarios(res.data || []);
      if (res.data.length > 0 && !activeScenarioId) {
        setActiveScenarioId(res.data[0].scenarioId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRiskMap = async (scenarioId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/scenario-analysis/risk-map/${scenarioId}`);
      setRiskMapData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  useEffect(() => {
    if (activeScenarioId) {
      fetchRiskMap(activeScenarioId);
    }
  }, [activeScenarioId]);

  const getBandBadge = (band: string) => {
    switch (band) {
      case 'Critical':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-500 text-white">Critical</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-slate-950">High</span>;
      case 'Medium':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-yellow-400/30 text-yellow-800 dark:text-yellow-300">Medium</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-600">Low</span>;
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
            <span className="text-xs text-slate-500 dark:text-slate-400">Sheet 04_Risk_Scenario & Bubble Map</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Compass className="w-8 h-8 text-amber-500" />
            Phân Tích Kịch Bản & Bản Đồ Rủi Ro Động (Scenario Risk Map)
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
            Đánh giá tác động của các kịch bản căng thẳng (Stress Testing), đo lường độ lệch rủi ro (Delta Residual) và nhận diện vượt khẩu vị
          </p>
        </div>
      </div>

      {/* Scenario Pills Selector */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
        {scenarios.map((s) => {
          const isActive = s.scenarioId === activeScenarioId;
          return (
            <button
              key={s.scenarioId}
              onClick={() => setActiveScenarioId(s.scenarioId)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-500'}`} />
              <span>{s.scenarioName}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-black/10 dark:bg-white/10">
                {(s.probabilityPct * 100).toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>

      {/* Scenario Details & Stats */}
      {riskMapData.scenario && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-500">
                {riskMapData.scenario.scenarioId} • {riskMapData.scenario.scenarioType}
              </span>
              <span className="text-xs text-slate-400">Thời gian: {riskMapData.scenario.horizon}</span>
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {riskMapData.scenario.description}
            </p>
            <div className="text-xs text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-700/60">
              <strong>Giả định chính:</strong> {riskMapData.scenario.keyAssumptions}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-xs text-slate-400 font-medium">Vượt khẩu vị rủi ro</div>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
              {riskMapData.statistics.aboveAppetiteCount} / {riskMapData.statistics.totalRisks}
            </div>
            <div className="text-xs text-rose-500 font-semibold mt-1">
              Tỷ lệ vi phạm: {riskMapData.statistics.breachRate}%
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="text-xs text-slate-400 font-medium">Rủi ro Critical / High</div>
            <div className="text-2xl font-bold text-amber-500 mt-1">
              {riskMapData.statistics.criticalCount} / {riskMapData.statistics.highCount}
            </div>
            <div className="text-xs text-slate-400 mt-1">Yêu cầu Immediate Assurance</div>
          </div>
        </div>
      )}

      {/* 2D Heatmap & Bubble Map Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heatmap Area */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-slate-900 dark:text-white text-sm">
                Bản Đồ Ma Trận Rủi Ro (5x5 Matrix & Chuyển Dịch Kịch Bản)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">Chấm tròn: Vị trí Kịch bản • Đường kẻ: Độ lệch Delta</span>
          </div>

          {/* 5x5 Matrix Visualizer */}
          <div className="relative aspect-square max-w-[480px] mx-auto p-4 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-900">
            {/* Grid Cells (5x5) */}
            <div className="grid grid-cols-5 grid-rows-5 gap-1.5 w-full h-full">
              {[5, 4, 3, 2, 1].map((impact) =>
                [1, 2, 3, 4, 5].map((likelihood) => {
                  const score = impact * likelihood;
                  let bg = 'bg-emerald-950/40 border-emerald-800/40 text-emerald-500';
                  if (score >= 20) bg = 'bg-rose-950/70 border-rose-700/60 text-rose-400';
                  else if (score >= 12) bg = 'bg-amber-950/60 border-amber-700/50 text-amber-400';
                  else if (score >= 6) bg = 'bg-yellow-950/50 border-yellow-800/40 text-yellow-500';

                  return (
                    <div
                      key={`${impact}-${likelihood}`}
                      className={`rounded border flex flex-col items-center justify-center relative ${bg} p-1 text-[10px] font-mono`}
                    >
                      <span className="opacity-40">{score}</span>
                    </div>
                  );
                }),
              )}
            </div>

            {/* Render Risk Points & Trajectory Vectors */}
            {riskMapData.points.map((p) => {
              // Convert 1-5 coordinates to percentage (1 -> 10%, 5 -> 90%)
              const leftPercent = ((p.x - 0.5) / 5) * 100;
              const bottomPercent = ((p.y - 0.5) / 5) * 100;
              const baseLeft = ((p.baseX - 0.5) / 5) * 100;
              const baseBottom = ((p.baseY - 0.5) / 5) * 100;

              return (
                <div key={p.id}>
                  {/* Trajectory Vector line if delta > 0 */}
                  {p.delta > 0 && (
                    <div
                      className="absolute border-t-2 border-dashed border-rose-400 z-10 pointer-events-none opacity-60"
                      style={{
                        left: `${baseLeft}%`,
                        bottom: `${baseBottom}%`,
                        width: `${Math.hypot(leftPercent - baseLeft, bottomPercent - baseBottom)}%`,
                        transformOrigin: '0 0',
                        transform: `rotate(${Math.atan2(
                          -(bottomPercent - baseBottom),
                          leftPercent - baseLeft,
                        )}rad)`,
                      }}
                    />
                  )}

                  {/* Scenario Bubble */}
                  <div
                    onClick={() => setSelectedPoint(p)}
                    className={`absolute z-20 cursor-pointer -translate-x-1/2 translate-y-1/2 rounded-full flex items-center justify-center font-bold text-[10px] shadow-lg transition-transform hover:scale-125 border-2 ${
                      p.isAboveAppetite
                        ? 'bg-rose-500 text-white border-white animate-pulse'
                        : p.band === 'High'
                        ? 'bg-amber-500 text-slate-950 border-slate-900'
                        : 'bg-blue-500 text-white border-white'
                    }`}
                    style={{
                      left: `${leftPercent}%`,
                      bottom: `${bottomPercent}%`,
                      width: `${Math.max(26, Math.min(48, 24 + p.materialityExposure / 1e10))}px`,
                      height: `${Math.max(26, Math.min(48, 24 + p.materialityExposure / 1e10))}px`,
                    }}
                    title={`${p.riskName} (Điểm: ${p.score})`}
                  >
                    {p.score}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-6 text-xs text-slate-400 pt-2">
            <span>Trục hoành: Khả năng xảy ra (Likelihood 1-5)</span>
            <span>•</span>
            <span>Trục tung: Mức độ tác động (Impact 1-5)</span>
          </div>
        </div>

        {/* Selected Risk Point Inspector */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              Chi Tiết Đánh Giá Rủi Ro Trong Kịch Bản
            </h3>

            {selectedPoint ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-amber-500 font-bold">{selectedPoint.riskId}</span>
                    <span className="text-xs font-semibold text-slate-500">{selectedPoint.riskDomain}</span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{selectedPoint.riskName}</h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="text-[11px] text-slate-400">Điểm cơ sở (Base)</div>
                    <div className="text-lg font-bold text-slate-700 dark:text-slate-300">
                      {selectedPoint.baseScore} ({selectedPoint.baseX} × {selectedPoint.baseY})
                    </div>
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="text-[11px] text-slate-400">Điểm kịch bản (Stress)</div>
                    <div className="text-lg font-bold text-rose-600 dark:text-rose-400">
                      {selectedPoint.score} ({selectedPoint.x} × {selectedPoint.y})
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span>Độ lệch chuyển dịch (&Delta; Residual):</span>
                    <span className="font-mono font-bold text-rose-600">+{selectedPoint.delta}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Khẩu vị rủi ro:</span>
                    <span>{selectedPoint.isAboveAppetite ? '⚠️ VƯỢT KHẨU VỊ' : '✅ Trong khẩu vị'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Phản ứng kiểm toán:</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400">{selectedPoint.response}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    Tác động kế hoạch kiểm toán năm:
                  </div>
                  <p className="text-slate-600 dark:text-slate-400">{selectedPoint.impactOnPlan}</p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                Nhấp vào một bong bóng rủi ro trên bản đồ ma trận để kiểm tra thông số chi tiết và đề xuất kế hoạch kiểm toán.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk Scenario Analyses Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
          Danh Mục Rủi Ro Trong Kịch Bản "{riskMapData.scenario?.scenarioName}"
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="py-3 px-4">Mã Rủi Ro</th>
                <th className="py-3 px-4">Tên Rủi Ro</th>
                <th className="py-3 px-4">Lĩnh vực</th>
                <th className="py-3 px-4 text-center">Base Score</th>
                <th className="py-3 px-4 text-center">Stress Score</th>
                <th className="py-3 px-4 text-center">&Delta; Residual</th>
                <th className="py-3 px-4 text-center">Khẩu vị</th>
                <th className="py-3 px-4 text-center">Băng rủi ro</th>
                <th className="py-3 px-4">Phản ứng kiểm toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {riskMapData.points.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPoint(p)}
                  className="hover:bg-amber-500/5 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-medium text-amber-600 whitespace-nowrap">{p.riskId}</td>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white max-w-[280px]">
                    {p.riskName}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500 whitespace-nowrap">{p.riskDomain}</td>
                  <td className="py-3 px-4 text-center font-mono text-xs">{p.baseScore}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-rose-600 text-xs">{p.score}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-xs">
                    <span className={p.delta > 0 ? 'text-rose-600' : 'text-slate-500'}>
                      {p.delta > 0 ? `+${p.delta}` : p.delta}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap text-xs font-semibold">
                    {p.isAboveAppetite ? (
                      <span className="text-rose-600 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Vượt ngưỡng
                      </span>
                    ) : (
                      <span className="text-emerald-600">Trong ngưỡng</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center whitespace-nowrap">{getBandBadge(p.band)}</td>
                  <td className="py-3 px-4 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {p.response}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
