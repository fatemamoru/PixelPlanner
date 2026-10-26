// Domain data models for Pixel Planner.
// These mirror the entities defined in the spec design document.

export type Id = string;

export interface BusinessType {
  id: Id;
  label: string; // 1..100 chars
  isCustom: boolean; // Req 1.5
}

export interface TargetAudience {
  id: Id;
  label: string; // 1..100 chars
  isCustom: boolean; // Req 2.4
}

export interface ContentGoal {
  id: Id;
  label: string; // from available options only (Req 3.5)
}

export interface PlanningSelection {
  businessType: BusinessType | null;
  targetAudience: TargetAudience | null;
  contentGoal: ContentGoal | null;
}

export interface ContentIdea {
  id: Id;
  title: string;
  description: string;
  businessTypeLabel: string; // must reference selection (Req 4.1)
  targetAudienceLabel: string; // must reference selection (Req 4.1)
  contentGoalLabel: string | null; // aligned when present (Req 4.2)
}

export interface CaptionSuggestion {
  id: Id;
  ideaId: Id;
  text: string; // 1..2200 chars (Req 5.1, 5.4)
  edited: boolean; // Req 5.4
}

export interface SavedPost {
  id: Id;
  idea: ContentIdea;
  caption: CaptionSuggestion | null; // includes edited text (Req 6.3)
  savedAt: string; // ISO; ordering key (Req 6.4)
}

export type PostStatus = 'pending' | 'completed';

export interface ScheduledPost {
  id: Id;
  savedPostId: Id; // underlying SavedPost retained on remove (Req 7.7)
  idea: ContentIdea;
  caption: CaptionSuggestion | null;
  scheduledFor: string; // ISO date+time
  status: PostStatus; // drives calendar indicator (Req 9.3)
  publishedAt: string | null; // set when completed (Req 9.1), cleared on revert (Req 9.4)
}

export type DeliveryState = 'pending' | 'delivered' | 'undelivered' | 'missed';

export interface PostingReminder {
  id: Id;
  scheduledPostId: Id;
  leadMinutes: number; // 0..1440, default 15 (Req 8.1)
  triggerAt: string; // scheduledFor - leadMinutes (Req 8.4)
  enabled: boolean; // Req 8.6
  deliveryState: DeliveryState; // Req 8.3, 8.5
  attempts: number; // up to 3 (Req 8.3)
}

export type CompletedPostLike = ScheduledPost & {
  status: 'completed';
  publishedAt: string;
};

export interface MarketingService {
  id: Id;
  name: string;
  description: string;
  howToEngage: string;
}

export type CalendarViewMode = 'weekly' | 'monthly';

export interface CalendarRange {
  mode: CalendarViewMode;
  anchorDate: string;
}

export interface GenerationInput {
  businessType: BusinessType;
  targetAudience: TargetAudience;
  contentGoal: ContentGoal | null;
}

export type ValidationResult = { valid: true } | { valid: false; message: string };
