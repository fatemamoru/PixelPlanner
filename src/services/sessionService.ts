import type {
  BusinessType,
  ContentGoal,
  PlanningSelection,
  TargetAudience,
} from '../domain/types';

export type MissingSelection = 'businessType' | 'targetAudience';

/**
 * Holds the current planning-session selections. Session-scoped (not required
 * to persist across sessions per the spec). (Req 1-3)
 */
export class SessionService {
  private selection: PlanningSelection = {
    businessType: null,
    targetAudience: null,
    contentGoal: null,
  };

  getSelection(): PlanningSelection {
    return { ...this.selection };
  }

  setBusinessType(value: BusinessType): void {
    // Replaces any prior selection (Req 1.2, 1.3).
    this.selection.businessType = value;
  }

  setTargetAudience(value: TargetAudience): void {
    this.selection.targetAudience = value; // Req 2.3
  }

  setContentGoal(value: ContentGoal | null): void {
    // Exactly one goal, replacing any prior; null means "no goal" (Req 3.3, 3.4).
    this.selection.contentGoal = value;
  }

  /** Reports whether content generation is allowed and what is missing. */
  canGenerate(): { ok: boolean; missing: MissingSelection[] } {
    const missing: MissingSelection[] = [];
    if (!this.selection.businessType) missing.push('businessType'); // Req 1.4
    if (!this.selection.targetAudience) missing.push('targetAudience'); // Req 2.6
    return { ok: missing.length === 0, missing };
  }
}
