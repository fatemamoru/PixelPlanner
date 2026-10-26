import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TemplateRecommendationEngine, IDEAS_MIN, IDEAS_MAX, MAX_CAPTIONS_PER_IDEA } from './engine';
import type { ContentIdea, GenerationInput } from '../domain/types';

const labelArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length >= 1);

const inputArb: fc.Arbitrary<GenerationInput> = fc.record({
  businessType: fc.record({ id: fc.uuid(), label: labelArb, isCustom: fc.boolean() }),
  targetAudience: fc.record({ id: fc.uuid(), label: labelArb, isCustom: fc.boolean() }),
  contentGoal: fc.option(fc.record({ id: fc.uuid(), label: labelArb }), { nil: null }),
});

function ideaSig(i: ContentIdea) {
  return `${i.title}\u0000${i.description}`;
}

describe('TemplateRecommendationEngine', () => {
  // Feature: pixel-planner, Property 1: Generated ideas reference the selected business type and audience
  it('Property 1: every idea references the selected business type and audience', () => {
    fc.assert(
      fc.asyncProperty(inputArb, async (input) => {
        const engine = new TemplateRecommendationEngine({ seed: 42 });
        const ideas = await engine.generateIdeas(input, []);
        return ideas.every(
          (i) =>
            i.businessTypeLabel === input.businessType.label &&
            i.targetAudienceLabel === input.targetAudience.label,
        );
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pixel-planner, Property 2: Generated ideas align with the content goal when present
  it('Property 2: idea goal label matches the input goal (or null)', () => {
    fc.assert(
      fc.asyncProperty(inputArb, async (input) => {
        const engine = new TemplateRecommendationEngine({ seed: 7 });
        const ideas = await engine.generateIdeas(input, []);
        const expected = input.contentGoal ? input.contentGoal.label : null;
        return ideas.every((i) => i.contentGoalLabel === expected);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pixel-planner, Property 3: Each request yields 5-15 distinct ideas
  it('Property 3: 5..15 distinct ideas per request', () => {
    fc.assert(
      fc.asyncProperty(inputArb, async (input) => {
        const engine = new TemplateRecommendationEngine({ seed: 11 });
        const ideas = await engine.generateIdeas(input, []);
        const sigs = new Set(ideas.map(ideaSig));
        return (
          ideas.length >= IDEAS_MIN &&
          ideas.length <= IDEAS_MAX &&
          sigs.size === ideas.length
        );
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pixel-planner, Property 4: Additional idea sets never duplicate earlier ideas in the session
  it('Property 4: new ideas are disjoint from previously issued ideas', () => {
    fc.assert(
      fc.asyncProperty(inputArb, async (input) => {
        const engine = new TemplateRecommendationEngine({ seed: 99 });
        const first = await engine.generateIdeas(input, []);
        const second = await engine.generateIdeas(input, first);
        const firstSigs = new Set(first.map(ideaSig));
        const disjoint = second.every((i) => !firstSigs.has(ideaSig(i)));
        return (
          second.length >= IDEAS_MIN &&
          second.length <= IDEAS_MAX &&
          new Set(second.map(ideaSig)).size === second.length &&
          disjoint
        );
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pixel-planner, Property 5: Initial captions are 1-3 in number and each 1-2200 characters
  it('Property 5: initial captions are 1..3 and each 1..2200 chars', () => {
    fc.assert(
      fc.asyncProperty(inputArb, async (input) => {
        const engine = new TemplateRecommendationEngine({ seed: 3 });
        const [idea] = await engine.generateIdeas(input, []);
        const caps = await engine.generateCaptions(idea, []);
        return (
          caps.length >= 1 &&
          caps.length <= 3 &&
          caps.every((c) => c.text.length >= 1 && c.text.length <= 2200)
        );
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pixel-planner, Property 6: Additional captions add at least one and never exceed 10 total
  it('Property 6: additional captions add >=1 and total never exceeds 10', () => {
    fc.assert(
      fc.asyncProperty(inputArb, fc.integer({ min: 0, max: 9 }), async (input, existingCount) => {
        const engine = new TemplateRecommendationEngine({ seed: 5 });
        const [idea] = await engine.generateIdeas(input, []);
        const existing = Array.from({ length: existingCount }, (_, i) => ({
          id: `c${i}`,
          ideaId: idea.id,
          text: 'x',
          edited: false,
        }));
        const added = await engine.generateCaptions(idea, existing);
        return (
          added.length >= 1 &&
          existing.length + added.length <= MAX_CAPTIONS_PER_IDEA &&
          added.every((c) => c.text.length >= 1 && c.text.length <= 2200)
        );
      }),
      { numRuns: 100 },
    );
  });

  it('returns no captions once 10 exist (Req 5.3)', async () => {
    const engine = new TemplateRecommendationEngine({ seed: 1 });
    const [idea] = await engine.generateIdeas(
      {
        businessType: { id: 'b', label: 'Cafe', isCustom: false },
        targetAudience: { id: 'a', label: 'Locals', isCustom: false },
        contentGoal: null,
      },
      [],
    );
    const ten = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      ideaId: idea.id,
      text: 'x',
      edited: false,
    }));
    expect(await engine.generateCaptions(idea, ten)).toEqual([]);
  });
});
