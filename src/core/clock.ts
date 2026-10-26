/**
 * Clock abstraction so all "now"-dependent logic (past-date rejection,
 * reminder trigger math) is deterministic and testable. (Spec: injected Clock)
 */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

/** A fixed clock, primarily for tests. */
export function fixedClock(at: Date): Clock {
  return { now: () => new Date(at.getTime()) };
}
