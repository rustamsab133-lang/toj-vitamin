/**
 * Shared configuration constants for AI agents.
 */

/** AI model used by all chatbot agents */
export const AGENT_MODEL = process.env.GEMINI_AGENT_MODEL || 'gemini-3.1-flash-lite';

/** Maximum length of user message (characters) */
export const MAX_MESSAGE_LENGTH = 1000;

/** Maximum number of history messages to include in prompt */
export const MAX_HISTORY_MESSAGES = 6;

/** Maximum number of relevant products to include in prompt */
export const MAX_RELEVANT_PRODUCTS = 8;

/** Phone number validation regex (international format, 7-15 digits) */
export const PHONE_REGEX = /^\+?[\d\s\-()]{7,15}$/;

/**
 * Sanitize user message to prevent prompt injection and limit length.
 * Strips control characters and injection patterns while preserving
 * legitimate Cyrillic/Latin text.
 */
export function sanitizeUserMessage(message: string): string {
  if (!message) return '';
  return message
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH)
    // Remove backticks, template literal syntax, and escape chars that could break prompt structure
    .replace(/[`${}\\]/g, '')
    // Remove attempts to inject system/assistant role markers
    .replace(/\b(system|assistant|SYSTEM|ASSISTANT)\s*:/gi, '')
    .trim();
}

/**
 * Validate phone number format for order creation.
 */
export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return PHONE_REGEX.test(phone) && cleaned.length >= 7 && cleaned.length <= 15;
}

/**
 * Safe error message for client responses — never leak stack traces or internal details.
 */
export function safeErrorMessage(error: any, fallback = 'Произошла ошибка. Попробуйте позже.'): string {
  // Only expose error message in development
  if (process.env.NODE_ENV === 'development') {
    return error?.message || fallback;
  }
  return fallback;
}
