import type { ValidationResult } from '../domain/types';

export const CUSTOM_TEXT_MIN = 1;
export const CUSTOM_TEXT_MAX = 100;
export const CAPTION_MIN = 1;
export const CAPTION_MAX = 2200;
export const LEAD_TIME_MIN = 0;
export const LEAD_TIME_MAX = 1440;

/**
 * Validates a custom Business_Type / Target_Audience entry.
 * Valid iff the trimmed (non-whitespace) length is 1..100 inclusive.
 * (Req 1.5, 1.6, 2.4, 2.5 - Property 8)
 */
export function validateCustomText(value: string): ValidationResult {
  const trimmedLength = value.trim().length;
  if (trimmedLength >= CUSTOM_TEXT_MIN && trimmedLength <= CUSTOM_TEXT_MAX) {
    return { valid: true };
  }
  return {
    valid: false,
    message: `Please enter between ${CUSTOM_TEXT_MIN} and ${CUSTOM_TEXT_MAX} characters.`,
  };
}

/**
 * Validates caption text.
 * Valid iff the length is 1..2200 inclusive. (Req 5.4 - Property 7)
 */
export function validateCaption(text: string): ValidationResult {
  if (text.length >= CAPTION_MIN && text.length <= CAPTION_MAX) {
    return { valid: true };
  }
  return {
    valid: false,
    message: `Captions must be between ${CAPTION_MIN} and ${CAPTION_MAX} characters.`,
  };
}

/**
 * Validates a reminder lead time in minutes.
 * Valid iff the value is an integer in 0..1440 inclusive. (Req 8.1 - Property 9)
 */
export function validateLeadTime(minutes: number): ValidationResult {
  if (Number.isInteger(minutes) && minutes >= LEAD_TIME_MIN && minutes <= LEAD_TIME_MAX) {
    return { valid: true };
  }
  return {
    valid: false,
    message: `Reminder lead time must be a whole number of minutes between ${LEAD_TIME_MIN} and ${LEAD_TIME_MAX}.`,
  };
}
