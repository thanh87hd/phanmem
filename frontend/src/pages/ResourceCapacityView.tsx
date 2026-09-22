import React, { useState, useEffect } from 'react';
import {
  Users,
  Briefcase,
  BarChart3,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  BookOpen,
  PieChart,
  UserPlus,
  Plus,
} from 'lucide-react';
import api from '../services/api';

interface StaffItem {
  id: number;
  staffId: string;
  fullName: string;
  grade: string;
  department: string;
  manager: string;
  fte: number;
  primarySkill: string;
  secondarySkills: string;
  skillLevel: number;
  dataAnalyticsLevel: number;
  certifications: string;
  annualStandardHours: number;
  netAvailableHours: number;
  committedHours: number;
  remainingCapacity: number;
  utilizationPct: number;
  skillGapFlag: string;
}

interface QuarterlySummaryItem {
  quarter: string;
  demandedHours: number;
  allocatedHours: number;
  availableCapacity: number;
  remainingHours: number;
  utilization: number;
  demandCount: number;
}

interface SkillGapItem {
  skill: string;
  staffCount: number;
  totalCapacityHours: number;
  totalDemandHours: number;
  netBalanceHours: number;
  status: string;
}

export const ResourceCapacityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'roster' | 'quarterly' | 'skillgap'>('roster');
  const [staff, setStaff] = useState<StaffItem[]>([]);
  const [quarterly, setQuarterly] = useState<QuarterlySummaryItem[]>([]);
  const [skillGap, setSkillGap] = useState<SkillGapItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [skillFilter, setSkillFilter] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStaff, resQ, resGap] = await Promise.all([
        api.get('/resource-capacity/staff', { params: { skill: skillFilter || undefined } }),
        api.get('/resource-capacity/quarterly-summary'),
        api.get('/resource-capacity/skill-gap-matrix'),
      ]);
      setStaff(resStaff.data || []);
      setQuarterly(resQ.data || []);
      setSkillGap(resGap.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [skillFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent p-6 rounded-2xl border border-amber-500/20">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Phương pháp luận KTNB Lộc Phát
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Sheet 03_Staff_Roster & 04_Demand</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Users className="w-8 h-8 text-amber-500" />
            Quản Trị Nguồn Lực & Năng Lực KTV (Resource Capacity)
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
            Quản lý giờ công khả dụng ròng, tỷ lệ tận dụng KTV, hồ sơ kỹ năng kiểm toán & phân tích dữ liệu, cân đối Cung - Cầu Q1-Q4
          </p>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'roster'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Hồ Sơ Năng Lực KTV ({staff.length})
        </button>

        <button
          onClick={() => setActiveTab('quarterly')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'quarterly'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Cân Đối Cung - Cầu Q1-Q4
        </button>

        <button
          onClick={() => setActiveTab('skillgap')}
          className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'skillgap'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Ma Trận Khoảng Trống Kỹ Năng (Skill Gap)
        </button>
      </div>

      {/* Tab 1: Staff Roster */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Lọc theo chuyên môn:</span>
              <select
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-amber-500"
              >
                <option value="">-- Tất cả kỹ năng --</option>
                <option value="Credit">Tín dụng (Credit)</option>
                <option value="IT/Cyber">Công nghệ thông tin (IT/Cyber)</option>
                <option value="Operations">Vận hành (Operations)</option>
                <option value="Treasury">Nguồn vốn (Treasury)</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-4">Mã KTV</th>
                    <th className="py-3 px-4">Họ và Tên / Cấp bậc</th>
                    <th className="py-3 px-4">Phòng ban</th>
                    <th className="py-3 px-4">Chuyên môn chính</th>
                    <th className="py-3 px-4 text-center">Skill Level</th>
                    <th className="py-3 px-4 text-center">Data Analytics</th>
                    <th className="py-3 px-4">Chứng chỉ</th>
                    <th className="py-3 px-4 text-center">Giờ Khả Dụng</th>
                    <th className="py-3 px-4">Tỷ Lệ Sử Dụng (Utilization)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {staff.map((s) => {
                    const isHighUtil = s.utilizationPct >= 90;
                    return (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          {s.staffId}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{s.fullName}</div>
                          <div className="text-xs text-slate-400">{s.grade}</div>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">{s.department}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            {s.primarySkill}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-xs">
                            Level {s.skillLevel}/5
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap font-mono font-bold">
                          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs">
                            DA {s.dataAnalyticsLevel}/5
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                          {s.certifications || '—'}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap font-mono text-xs">
                          <span className="font-bold text-slate-800 dark:text-white">{s.committedHours}</span>
                          <span className="text-slate-400"> / {s.netAvailableHours}h</span>
                        </td>
                        <td className="py-3 px-4 min-w-[160px]">
                          <div className="flex items-center justify-between text-xs mb-1 font-mono">
                            <span className={isHighUtil ? 'text-rose-500 font-bold' : 'text-slate-600'}>
                              {s.utilizationPct}%
                            </span>
                            <span className="text-slate-400">Còn {s.remainingCapacity}h</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isHighUtil ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${Math.min(100, s.utilizationPct)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Quarterly Capacity vs Demand */}
      {activeTab === 'quarterly' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {quarterly.map((q) => (
            <div
              key={q.quarter}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3">
                <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  {q.quarter}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold">
                  {q.demandCount} đợt kiểm toán
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Công suất sẵn sàng:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{q.availableCapacity}h</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Nhu cầu kế hoạch:</span>
                  <span className="font-mono font-bold text-blue-600">{q.demandedHours}h</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Đã phân bổ thực tế:</span>
                  <span className="font-mono font-bold text-amber-600">{q.allocatedHours}h</span>
                </div>
                <div className="flex justify-between text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span>Công suất dự phòng:</span>
                  <span className="font-mono font-bold text-emerald-600">{q.remainingHours}h</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Tỷ lệ lấp đầy (Utilization):</span>
                  <span className="text-amber-600">{q.utilization}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, q.utilization)}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 3: Skill Gap Matrix */}
      {activeTab === 'skillgap' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
            Ma Trận Cân Đối Năng Lực Chuyên Môn & Nhu Cầu Kế Hoạch (Skill Gap Matrix)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-4">Lĩnh Vực Chuyên Môn</th>
                  <th className="py-3 px-4 text-center">Số Lượng KTV</th>
                  <th className="py-3 px-4 text-center">Tổng Công Suất (Giờ)</th>
                  <th className="py-3 px-4 text-center">Nhu Cầu Đợt KT (Giờ)</th>
                  <th className="py-3 px-4 text-center">Chênh Lệch Cân Đối</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {skillGap.map((item) => (
                  <tr key={item.skill} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">{item.skill}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-xs">{item.staffCount}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-slate-700 dark:text-slate-300">
                      {item.totalCapacityHours}h
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs text-blue-600 font-semibold">
                      {item.totalDemandHours}h
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-xs font-bold">
                      <span className={item.netBalanceHours >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {item.netBalanceHours >= 0 ? `+${item.netBalanceHours}` : item.netBalanceHours}h
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          item.netBalanceHours < 0
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-500/30'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border-emerald-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
