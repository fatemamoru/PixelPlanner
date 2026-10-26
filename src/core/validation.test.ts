import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validateCustomText, validateCaption, validateLeadTime } from './validation';

describe('validation', () => {
  // Feature: pixel-planner, Property 8: Custom text valid iff trimmed length 1..100
  it('Property 8: custom text valid iff trimmed length in 1..100', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const trimmed = s.trim().length;
        const expected = trimmed >= 1 && trimmed <= 100;
        return validateCustomText(s).valid === expected;
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pixel-planner, Property 7: Caption valid iff length 1..2200
  it('Property 7: caption valid iff length in 1..2200', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 2300 }), (s) => {
        const expected = s.length >= 1 && s.length <= 2200;
        return validateCaption(s).valid === expected;
      }),
      { numRuns: 100 },
    );
  });

  // Feature: pixel-planner, Property 9: Lead time valid iff integer in 0..1440
  it('Property 9: lead time valid iff integer in 0..1440', () => {
    fc.assert(
      fc.property(fc.integer({ min: -100, max: 2000 }), (n) => {
        const expected = n >= 0 && n <= 1440;
        return validateLeadTime(n).valid === expected;
      }),
      { numRuns: 100 },
    );
  });

  it('boundary cases', () => {
    expect(validateCustomText('').valid).toBe(false);
    expect(validateCustomText('   ').valid).toBe(false);
    expect(validateCustomText('a').valid).toBe(true);
    expect(validateCustomText('a'.repeat(100)).valid).toBe(true);
    expect(validateCustomText('a'.repeat(101)).valid).toBe(false);
    expect(validateCaption('').valid).toBe(false);
    expect(validateCaption('a'.repeat(2200)).valid).toBe(true);
    expect(validateCaption('a'.repeat(2201)).valid).toBe(false);
    expect(validateLeadTime(0).valid).toBe(true);
    expect(validateLeadTime(1440).valid).toBe(true);
    expect(validateLeadTime(1441).valid).toBe(false);
    expect(validateLeadTime(1.5).valid).toBe(false);
  });
});
