export enum RecommendationStatus {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Overdue = 'Overdue',
  Verified = 'Verified',
}

export enum RecommendationClosureStatus {
  Open = 'Open',
  PendingKTNBReview = 'PendingKTNBReview',
  PendingTeamLeadOpinion = 'PendingTeamLeadOpinion',
  Closed = 'Closed',
}

export enum RecommendationSlaStatus {
  ChuaDenHan = 'ChuaDenHan',
  QuaHan = 'QuaHan',
  GiaHan = 'GiaHan',
}

export enum RiskAcceptanceStatus {
  NotRequested = 'NotRequested',
  Requested = 'Requested',
  PendingCAE = 'PendingCAE',
  PendingBKS = 'PendingBKS',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
}
