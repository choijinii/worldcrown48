/**
 * Claude model ids — single source of truth for the functions deploy package.
 *
 * 대표 결정 (2026-07-11, B-2): centralize the model strings so a future model
 * swap edits ONE file, not every callable. HAIKU is the cheap/fast tier used by
 * B-2's helper callables (keyword suggestion + meta translation); SONNET is the
 * heavier tier the 48-Contestant fill already uses.
 *
 * Deploy/verify is 대표's step — these strings are bound to real models at deploy
 * time (functions:secrets already set ANTHROPIC_API_KEY).
 */
export const HAIKU_MODEL = "claude-haiku-4-5";
export const SONNET_MODEL = "claude-sonnet-4-6";
