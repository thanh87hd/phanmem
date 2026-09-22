import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ListOrdered,
  Grid,
  Info,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';

interface AuditProcess {
  id: number;
  processId: string;
  processName: string;
  processType: string;
  objective: string;
  scope: string;
  processOwner: string;
  executiveOwner: string;
  criticality: string;
  version: string;
}

interface RaciMatrixData {
  process: AuditProcess;
  roles: { roleId: string; roleName: string }[];
  matrix: {
    activityId: string;
    stepNo: number;
    activityName: string;
    activityType: string;
    decisionAuthority: string;
    sla: string;
    assignments: Record<string, string>;
  }[];
}

interface QaRaciResult {
  processId: string;
  totalActivities: number;
  compliantCount: number;
  complianceRate: number;
  violationsCount: number;
  violations: {
    activityId: string;
    activityName: string;
    ruleCode: string;
    severity: 'Critical' | 'Warning';
    message: string;
  }[];
  status: 'Compliant' | 'Warning' | 'Non-Compliant';
}

export const RaciGovernanceView: React.FC = () => {
  const [processes, setProcesses] = useState<AuditProcess[]>([]);
  const [activeProcessId, setActiveProcessId] = useState<string>('PROC-IA-001');
  const [matrixData, setMatrixData] = useState<RaciMatrixData | null>(null);
  const [qaResult, setQaResult] = useState<QaRaciResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProcesses = async () => {
    try {
      const res = await api.get('/raci-governance/processes');
      setProcesses(res.data || []);
      if (res.data.length > 0 && !activeProcessId) {
        setActiveProcessId(res.data[0].processId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProcessDetails = async (processId: string) => {
    setLoading(true);
    try {
      const [resMatrix, resQa] = await Promise.all([
        api.get(`/raci-governance/processes/${processId}/matrix`),
        api.get(`/raci-governance/processes/${processId}/qa-checks`),
      ]);
      setMatrixData(resMatrix.data);
      setQaResult(resQa.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, []);

  useEffect(() => {
    if (activeProcessId) {
      fetchProcessDetails(activeProcessId);
    }
  }, [activeProcessId]);

  const renderRaciBadge = (code?: string) => {
    if (!code) return <span className="text-slate-300 dark:text-slate-700 font-mono">—</span>;

    switch (code) {
      case 'R':
        return (
          <span
            className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-emerald-500 text-white shadow-sm"
            title="Responsible: Người trực tiếp thực hiện"
          >
            R
          </span>
        );
      case 'A':
        return (
          <span
            className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-amber-500 text-slate-950 shadow-sm"
            title="Accountable: Người chịu trách nhiệm phê duyệt cuối cùng (Duy nhất 1 'A')"
          >
            A
          </span>
        );
      case 'C':
        return (
          <span
            className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-blue-500 text-white shadow-sm"
            title="Consulted: Người được tham vấn ý kiến chuyên môn"
          >
            C
          </span>
        );
      case 'I':
        return (
          <span
            className="w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center bg-purple-500 text-white shadow-sm"
            title="Informed: Người nhận báo cáo và thông tin kết quả"
          >
            I
          </span>
        );
      default:
        return <span className="font-bold">{code}</span>;
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
            <span className="text-xs text-slate-500 dark:text-slate-400">Sheet 02_Process & 05_RACI</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Grid className="w-8 h-8 text-amber-500" />
            Quy Trình & Ma Trận Phân Công RACI (RACI Governance)
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-1">
            Thiết kế 10 quy trình KTNB chuẩn ngân hàng, phân công trách nhiệm 2D và kiểm soát xung đột Segregation of Duties (SoD)
          </p>
        </div>
      </div>

      {/* Process Selection Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Chọn Quy trình:</span>
        <select
          value={activeProcessId}
          onChange={(e) => setActiveProcessId(e.target.value)}
          className="flex-1 text-sm font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500"
        >
          {processes.map((p) => (
            <option key={p.processId} value={p.processId}>
              {p.processId}: {p.processName} ({p.processType})
            </option>
          ))}
        </select>
      </div>

      {/* QA RACI Check Banner & Process Info */}
      {matrixData?.process && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-500">
                {matrixData.process.processId} • Phiên bản {matrixData.process.version}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 font-semibold">
                Mức độ quan trọng: {matrixData.process.criticality}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {matrixData.process.processName}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              <strong>Mục tiêu:</strong> {matrixData.process.objective}
            </p>
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
              <span>Đơn vị chủ trì: <strong>{matrixData.process.processOwner}</strong></span>
              <span>Cấp phê duyệt: <strong>{matrixData.process.executiveOwner}</strong></span>
            </div>
          </div>

          {/* QA RACI Status Card */}
          {qaResult && (
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    RACI QA Check Engine
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                      qaResult.status === 'Compliant'
                        ? 'bg-emerald-500/20 text-emerald-600'
                        : 'bg-rose-500/20 text-rose-600'
                    }`}
                  >
                    {qaResult.status}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">
                  {qaResult.complianceRate}% Tuân Thủ
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {qaResult.compliantCount} / {qaResult.totalActivities} hoạt động đạt chuẩn
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                {qaResult.violationsCount > 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Có {qaResult.violationsCount} cảnh báo RACI
                  </span>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Duy nhất 1 'A', đủ 'R', 0 xung đột SoD
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RACI Legend Bar */}
      <div className="flex flex-wrap items-center gap-6 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
        <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Chú giải mã RACI:</span>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-emerald-500 text-white font-bold flex items-center justify-center text-[10px]">R</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Responsible (Người thực hiện)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-[10px]">A</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Accountable (Người chịu trách nhiệm chính/Duy nhất)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-blue-500 text-white font-bold flex items-center justify-center text-[10px]">C</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Consulted (Người được tham vấn)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-purple-500 text-white font-bold flex items-center justify-center text-[10px]">I</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Informed (Người được thông báo)</span>
        </div>
      </div>

      {/* Main RACI 2D Matrix Table */}
      {matrixData && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">Bước</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Tên Hoạt Động & Loại</th>
                  <th className="py-3.5 px-4 min-w-[160px]">SLA / Thẩm quyền</th>
                  {matrixData.roles.map((role) => (
                    <th key={role.roleId} className="py-3.5 px-4 text-center min-w-[120px] whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">{role.roleName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{role.roleId}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {matrixData.matrix.map((row) => (
                  <tr key={row.activityId} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-400 text-xs">
                      #{row.stepNo}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{row.activityName}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-amber-500">{row.activityId}</span>
                        <span>•</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-[10px]">
                          {row.activityType}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-300">
                      <div>SLA: <strong>{row.sla || 'Theo quy trình'}</strong></div>
                      <div className="text-slate-400 mt-0.5">Thẩm quyền: {row.decisionAuthority || 'KTV'}</div>
                    </td>
                    {matrixData.roles.map((role) => (
                      <td key={role.roleId} className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {renderRaciBadge(row.assignments[role.roleId])}
                        </div>
                      </td>
                    ))}
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
