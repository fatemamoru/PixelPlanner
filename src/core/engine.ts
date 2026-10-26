import type {
  CaptionSuggestion,
  ContentIdea,
  GenerationInput,
} from '../domain/types';
import { newId } from './id';

/**
 * Content_Recommendation_Engine (pluggable interface). The default
 * implementation is a deterministic, seedable template/combination generator.
 * A future AI-backed implementation can replace it without touching the UI.
 */
export interface ContentRecommendationEngine {
  // Req 4.1-4.4: 5..15 distinct ideas, none duplicating earlier ideas this session
  generateIdeas(
    input: GenerationInput,
    alreadyIssued: ReadonlyArray<ContentIdea>,
  ): Promise<ContentIdea[]>;
  // Req 5.1-5.2: 1..3 captions (1..2200 chars), extra captions up to 10 total
  generateCaptions(
    idea: ContentIdea,
    existing: ReadonlyArray<CaptionSuggestion>,
  ): Promise<CaptionSuggestion[]>;
}

export const MAX_CAPTIONS_PER_IDEA = 10;
export const IDEAS_MIN = 5;
export const IDEAS_MAX = 15;

/** Idea theme templates. Combined with angles to yield a large distinct space. */
const IDEA_THEMES: ReadonlyArray<{ title: string; description: string }> = [
  { title: 'Behind the scenes', description: 'Show how the work really happens' },
  { title: 'Customer spotlight', description: 'Celebrate a happy customer story' },
  { title: 'Quick tip', description: 'Share one practical tip people can use today' },
  { title: 'Myth vs fact', description: 'Bust a common misconception in your field' },
  { title: 'Before and after', description: 'Highlight a visible transformation' },
  { title: 'Meet the team', description: 'Introduce a person behind the business' },
  { title: 'Frequently asked', description: 'Answer a question customers keep asking' },
  { title: 'Product deep dive', description: 'Explain what makes an offering special' },
  { title: 'Weekly roundup', description: 'Recap the highlights of the week' },
  { title: 'Poll the audience', description: 'Ask a quick question to spark replies' },
  { title: 'How it is made', description: 'Walk through your process step by step' },
  { title: 'Seasonal feature', description: 'Tie your offering to the current season' },
  { title: 'Testimonial feature', description: 'Let a review tell the story' },
  { title: 'Limited offer', description: 'Announce a time-bound promotion' },
  { title: 'Community shoutout', description: 'Thank a partner or local supporter' },
];

const ANGLES: ReadonlyArray<string> = [
  'reel',
  'carousel',
  'story',
  'photo',
  'live session',
  'short video',
];

/**
 * A small, fast, deterministic PRNG (mulberry32). Seeding makes generation
 * repeatable, which is what the property/component tests rely on.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A unique signature for an idea so duplicates can be detected across requests. */
function ideaSignature(idea: Pick<ContentIdea, 'title' | 'description'>): string {
  return `${idea.title}\u0000${idea.description}`;
}

export interface EngineOptions {
  seed?: number;
  /** When true, generateIdeas/generateCaptions reject (simulate failure). */
  failNext?: boolean;
}

export class TemplateRecommendationEngine implements ContentRecommendationEngine {
  private seedCounter: number;
  private failNext: boolean;

  constructor(options: EngineOptions = {}) {
    this.seedCounter = options.seed ?? 1;
    this.failNext = options.failNext ?? false;
  }

  /** Test/host hook to force the next generation call to fail (Req 4.5, 5.5). */
  setFailNext(value: boolean): void {
    this.failNext = value;
  }

  async generateIdeas(
    input: GenerationInput,
    alreadyIssued: ReadonlyArray<ContentIdea>,
  ): Promise<ContentIdea[]> {
    if (this.consumeFailure()) {
      throw new Error('Idea generation failed');
    }

    const used = new Set(alreadyIssued.map(ideaSignature));
    const goalLabel = input.contentGoal ? input.contentGoal.label : null;

    // Seed from inputs + a per-call counter so repeated requests differ but
    // remain deterministic for a given sequence.
    const seedBase =
      hashString(input.businessType.label) ^
      hashString(input.targetAudience.label) ^
      hashString(goalLabel ?? '') ^
      (this.seedCounter++ * 2654435761);
    const rand = mulberry32(seedBase >>> 0);

    // Build the full combination space, then pick distinct, unused entries.
    const combos: Array<{ title: string; description: string }> = [];
    for (const theme of IDEA_THEMES) {
      for (const angle of ANGLES) {
        combos.push({
          title: `${theme.title} (${angle})`,
          description: `${theme.description} for ${input.businessType.label}, aimed at ${input.targetAudience.label}${
            goalLabel ? ` to ${goalLabel.toLowerCase()}` : ''
          }.`,
        });
      }
    }

    // Fisher-Yates shuffle driven by the seeded PRNG.
    for (let i = combos.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [combos[i], combos[j]] = [combos[j], combos[i]];
    }

    const target = IDEAS_MIN + Math.floor(rand() * (IDEAS_MAX - IDEAS_MIN + 1)); // 5..15
    const result: ContentIdea[] = [];
    const seenThisRequest = new Set<string>();

    for (const combo of combos) {
      if (result.length >= target) break;
      const sig = ideaSignature(combo);
      if (used.has(sig) || seenThisRequest.has(sig)) continue;
      seenThisRequest.add(sig);
      result.push({
        id: newId(),
        title: combo.title,
        description: combo.description,
        businessTypeLabel: input.businessType.label,
        targetAudienceLabel: input.targetAudience.label,
        contentGoalLabel: goalLabel,
      });
    }

    // The combination space (15 themes x 6 angles = 90) is far larger than the
    // 15-idea max, so we always satisfy the 5..15 distinct requirement.
    return result;
  }

  async generateCaptions(
    idea: ContentIdea,
    existing: ReadonlyArray<CaptionSuggestion>,
  ): Promise<CaptionSuggestion[]> {
    if (this.consumeFailure()) {
      throw new Error('Caption generation failed');
    }

    const remaining = MAX_CAPTIONS_PER_IDEA - existing.length;
    if (remaining <= 0) {
      return [];
    }

    const seed = hashString(idea.id) ^ (this.seedCounter++ * 40503);
    const rand = mulberry32(seed >>> 0);

    // First request: 1..3 captions. Later requests: at least 1, capped at the
    // remaining budget up to 10 total.
    const desired = existing.length === 0 ? 1 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 2);
    const count = Math.max(1, Math.min(desired, remaining));

    const openers = [
      'Ready to level up?',
      'Here is something for you',
      'We love this one',
      'Save this for later',
      'Tag someone who needs this',
      'Your next favorite',
      'Fresh off the press',
      'Let us talk about',
      'A little reminder',
      'Big news',
    ];

    const captions: CaptionSuggestion[] = [];
    const baseIndex = existing.length;
    for (let i = 0; i < count; i++) {
      const opener = openers[(baseIndex + i + Math.floor(rand() * openers.length)) % openers.length];
      const text = `${opener}: ${idea.title}. ${idea.description} #${slug(
        idea.businessTypeLabel,
      )} #${slug(idea.targetAudienceLabel)}`.slice(0, 2200);
      captions.push({
        id: newId(),
        ideaId: idea.id,
        text: text.length === 0 ? idea.title : text,
        edited: false,
      });
    }
    return captions;
  }

  private consumeFailure(): boolean {
    if (this.failNext) {
      this.failNext = false;
      return true;
    }
    return false;
  }
}

function slug(label: string): string {
  return label.replace(/[^a-zA-Z0-9]+/g, '').slice(0, 30) || 'post';
}
