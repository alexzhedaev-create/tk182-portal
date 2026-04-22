import type { SubcommitteeSummary } from "./committee";

export interface PageSummary {
  slug: string;
  title: string;
  visibility: "public" | "participant" | "secretariat";
}

export type ContentPublicationStatus = "draft" | "published";
export type ContentMigrationStatus = "NOT_IMPORTED" | "IMPORTED" | "VERIFIED";
export type LegacyContentInventoryStatus =
  | "FOUND"
  | "CREATED_IN_PORTAL"
  | "VERIFIED"
  | "SKIPPED";

export type LegacyContentSection =
  | "NEWS"
  | "MAIN_DOCUMENTS"
  | "WORK_REPORTS"
  | "WORK_PLANS"
  | "NATIONAL_STANDARDS_PROGRAM"
  | "MEETING_MINUTES"
  | "MEETING_AGENDA"
  | "APPROVED_STANDARDS";

export type LinkedPortalEntityType =
  | "NEWS_ITEM"
  | "PUBLIC_DOCUMENT"
  | "MEETING_RECORD"
  | "APPROVED_STANDARD";

export type PublicDocumentCategory =
  | "MAIN_DOCUMENTS"
  | "WORK_REPORTS"
  | "WORK_PLANS"
  | "NATIONAL_STANDARDS_PROGRAM";

export type MeetingRecordCategory = "MEETING_MINUTES" | "MEETING_AGENDA";

export interface ContentFileAttachment {
  description: string | null;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  uploadedAt: string;
  uploadedByDisplayName: string | null;
}

export interface ContentMigrationInfo {
  legacySection: LegacyContentSection;
  legacySourceUrl: string | null;
  migrationNote: string | null;
  migrationStatus: ContentMigrationStatus;
}

export interface BackofficeContentListFilters {
  legacySection?: LegacyContentSection;
  migrationStatus?: ContentMigrationStatus;
}

export interface LegacyContentInventoryFilters {
  legacySection?: LegacyContentSection;
  migrationStatus?: LegacyContentInventoryStatus;
}

export interface LinkedPortalEntityReference {
  entityId: string;
  entityType: LinkedPortalEntityType;
  title: string;
}

export interface LegacyContentInventoryRecord {
  id: string;
  legacySection: LegacyContentSection;
  legacyTitle: string;
  legacyUrl: string | null;
  legacyDate: string | null;
  legacyType: string | null;
  migrationStatus: LegacyContentInventoryStatus;
  migrationNote: string | null;
  linkedPortalRecord: LinkedPortalEntityReference | null;
}

export interface NewsArticleSummary {
  id: string;
  title: string;
  publishedAt: string;
  excerpt: string;
}

export interface NewsItemRecord {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  status: ContentPublicationStatus;
  publicationDate: string;
  publishedAt: string | null;
}

export interface BackofficeNewsItemRecord extends NewsItemRecord {
  migration: ContentMigrationInfo;
}

export interface DocumentSummary {
  id: string;
  title: string;
  category: string;
  visibility: "public" | "participant" | "secretariat";
  summary: string;
  publishedAt: string;
}

export interface PublicDocumentRecord {
  id: string;
  title: string;
  category: PublicDocumentCategory;
  summary: string;
  status: ContentPublicationStatus;
  publicationDate: string;
  publishedAt: string | null;
  attachment: ContentFileAttachment | null;
}

export interface BackofficePublicDocumentRecord extends PublicDocumentRecord {
  migration: ContentMigrationInfo;
}

export interface PublicDocumentSection {
  category: PublicDocumentCategory;
  documents: PublicDocumentRecord[];
}

export interface PublicDocumentsPageData {
  sections: PublicDocumentSection[];
}

export interface StandardSummary {
  id: string;
  code: string;
  title: string;
  summary: string;
  stage: string;
  responsibleSubcommittee: SubcommitteeSummary | null;
}

export interface ApprovedStandardRecord {
  id: string;
  code: string;
  title: string;
  summary: string;
  status: ContentPublicationStatus;
  approvalDate: string;
  publicationDate: string;
  publishedAt: string | null;
  attachment: ContentFileAttachment | null;
  responsibleSubcommittee: SubcommitteeSummary | null;
}

export interface BackofficeApprovedStandardRecord extends ApprovedStandardRecord {
  migration: ContentMigrationInfo;
}

export interface StandardsPageData {
  approvedStandards: ApprovedStandardRecord[];
  draftStandards: StandardSummary[];
  nationalStandardsProgramDocuments: PublicDocumentRecord[];
}

export interface MeetingSummary {
  id: string;
  title: string;
  scheduledAt: string;
  location: string;
}

export interface MeetingRecord {
  id: string;
  title: string;
  category: MeetingRecordCategory;
  summary: string;
  body: string;
  location: string | null;
  meetingDate: string;
  status: ContentPublicationStatus;
  publicationDate: string;
  publishedAt: string | null;
  attachment: ContentFileAttachment | null;
}

export interface BackofficeMeetingRecord extends MeetingRecord {
  migration: ContentMigrationInfo;
}

export interface MeetingRecordSection {
  category: MeetingRecordCategory;
  meetings: MeetingRecord[];
}

export interface MeetingsPageData {
  sections: MeetingRecordSection[];
}

export interface ContentMigrationChecklistEntry {
  itemsTotal: number;
  legacySection: LegacyContentSection;
  migratedCount: number;
  notImportedCount: number;
  pendingTitles: string[];
  verifiedCount: number;
}

export interface CreateLegacyContentInventoryDto {
  legacyDate?: string | null;
  legacySection: LegacyContentSection;
  legacyTitle: string;
  legacyType?: string | null;
  legacyUrl?: string | null;
  linkedPortalEntityId?: string | null;
  linkedPortalEntityType?: LinkedPortalEntityType | null;
  migrationNote?: string | null;
  migrationStatus: LegacyContentInventoryStatus;
}

export interface UpdateLegacyContentInventoryDto {
  legacyDate?: string | null;
  legacySection: LegacyContentSection;
  legacyTitle: string;
  legacyType?: string | null;
  legacyUrl?: string | null;
  linkedPortalEntityId?: string | null;
  linkedPortalEntityType?: LinkedPortalEntityType | null;
  migrationNote?: string | null;
  migrationStatus: LegacyContentInventoryStatus;
}

export interface CreateNewsItemDto {
  body: string;
  excerpt: string;
  legacySection: LegacyContentSection;
  legacySourceUrl?: string | null;
  migrationNote?: string | null;
  migrationStatus: ContentMigrationStatus;
  publicationDate: string;
  title: string;
}

export interface UpdateNewsItemDto {
  body: string;
  excerpt: string;
  legacySection: LegacyContentSection;
  legacySourceUrl?: string | null;
  migrationNote?: string | null;
  migrationStatus: ContentMigrationStatus;
  publicationDate: string;
  title: string;
}

export interface CreatePublicDocumentDto {
  category: PublicDocumentCategory;
  fileDescription?: string | null;
  legacySection: LegacyContentSection;
  legacySourceUrl?: string | null;
  migrationNote?: string | null;
  migrationStatus: ContentMigrationStatus;
  publicationDate: string;
  summary: string;
  title: string;
}

export interface UpdatePublicDocumentDto {
  category: PublicDocumentCategory;
  fileDescription?: string | null;
  legacySection: LegacyContentSection;
  legacySourceUrl?: string | null;
  migrationNote?: string | null;
  migrationStatus: ContentMigrationStatus;
  publicationDate: string;
  summary: string;
  title: string;
}

export interface CreateMeetingRecordDto {
  body: string;
  category: MeetingRecordCategory;
  fileDescription?: string | null;
  legacySection: LegacyContentSection;
  legacySourceUrl?: string | null;
  location?: string | null;
  meetingDate: string;
  migrationNote?: string | null;
  migrationStatus: ContentMigrationStatus;
  publicationDate: string;
  summary: string;
  title: string;
}

export interface UpdateMeetingRecordDto {
  body: string;
  category: MeetingRecordCategory;
  fileDescription?: string | null;
  legacySection: LegacyContentSection;
  legacySourceUrl?: string | null;
  location?: string | null;
  meetingDate: string;
  migrationNote?: string | null;
  migrationStatus: ContentMigrationStatus;
  publicationDate: string;
  summary: string;
  title: string;
}

export interface CreateApprovedStandardDto {
  approvalDate: string;
  code: string;
  fileDescription?: string | null;
  legacySection: LegacyContentSection;
  legacySourceUrl?: string | null;
  migrationNote?: string | null;
  migrationStatus: ContentMigrationStatus;
  publicationDate: string;
  responsibleSubcommitteeId?: string | null;
  summary: string;
  title: string;
}

export interface UpdateApprovedStandardDto {
  approvalDate: string;
  code: string;
  fileDescription?: string | null;
  legacySection: LegacyContentSection;
  legacySourceUrl?: string | null;
  migrationNote?: string | null;
  migrationStatus: ContentMigrationStatus;
  publicationDate: string;
  responsibleSubcommitteeId?: string | null;
  summary: string;
  title: string;
}
