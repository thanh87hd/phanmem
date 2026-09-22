/**
 * Core business helpers and calculations across Frontend (Single Source of Truth)
 */

/**
 * Calculates display color based on score (0-100)
 * < 40: Red (#ff4d4f)
 * 40 - 59: Orange (#fa8c16)
 * 60 - 74: Gold (#faad14)
 * 75 - 89: Lime (#a0d911)
 * >= 90: Green (#52c41a)
 */
export const getProgressColor = (score: number): string => {
  if (score < 40) return '#ff4d4f';
  if (score < 60) return '#fa8c16';
  if (score < 75) return '#faad14';
  if (score < 90) return '#a0d911';
  return '#52c41a';
};

/**
 * Checks whether an audit plan risk level is considered "Low"
 * (Requires justification when low-risk units are excluded or prioritized)
 */
export const isLowRisk = (level?: string | null): boolean => {
  if (!level || level === 'Unassessed' || level === 'Chưa đánh giá') return false;
  const lvl = level.toLowerCase();
  return (
    lvl === 'low' ||
    lvl.includes('thấp') ||
    lvl.includes('hạng 2') ||
    lvl.includes('hạng 1')
  );
};

/**
 * Extracts numeric sample amount from varying backend payload structures
 */
export const getSampleAmount = (s: any): number => {
  if (!s) return 0;
  const raw =
    s.loanAmount ??
    s.sampleData?.outstandingBalance ??
    s.sampleData?.transactionAmount ??
    s.sampleData?.amount ??
    s.amount ??
    0;
  const num = Number(raw);
  return isNaN(num) ? 0 : num;
};

/**
 * Common Audit Status Colors mapping
 */
export const AUDIT_STATUS_COLORS: Record<string, string> = {
  Draft: 'default',
  PendingApproval: 'processing',
  Approved: 'success',
  Rejected: 'error',
  InProgress: 'blue',
  Completed: 'green',
  Archived: 'purple',
};

/**
 * Common Recommendation Status Configuration
 */
export const RECOMMENDATION_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  NotStarted: { label: 'Chưa thực hiện', color: 'default' },
  InProgress: { label: 'Đang thực hiện', color: 'processing' },
  Completed: { label: 'Đã hoàn thành', color: 'success' },
  Overdue: { label: 'Quá hạn', color: 'error' },
  PendingReview: { label: 'Chờ phúc tra', color: 'warning' },
};
