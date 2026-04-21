export interface ReviewCycleSummary {
  id: string;
  title: string;
  status: "draft" | "open" | "closed";
  opensAt: string;
  closesAt: string;
}

export interface NotificationSummary {
  id: string;
  channel: "email" | "in-app";
  topic: string;
  enabled: boolean;
}

export interface AuditEntrySummary {
  id: string;
  action: string;
  actorId: string;
  createdAt: string;
}
