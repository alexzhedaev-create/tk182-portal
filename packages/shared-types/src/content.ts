export interface PageSummary {
  slug: string;
  title: string;
  visibility: "public" | "participant" | "secretariat";
}

export interface NewsArticleSummary {
  id: string;
  title: string;
  publishedAt: string;
  excerpt: string;
}

export interface DocumentSummary {
  id: string;
  title: string;
  category: string;
  visibility: "public" | "participant" | "secretariat";
}

export interface StandardSummary {
  id: string;
  code: string;
  title: string;
  stage: string;
}

export interface MeetingSummary {
  id: string;
  title: string;
  scheduledAt: string;
  location: string;
}
