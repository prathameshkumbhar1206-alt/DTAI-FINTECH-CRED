import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini access with automatic failover.
 *
 * Free-tier request quota is enforced per project, per model, so a single
 * rate-limited model is not the same as having no capacity left. Rather than
 * surfacing a 429 to the user, each call walks a chain of candidates — every
 * configured API key crossed with every configured model — and returns the first
 * that answers.
 *
 * Configure with comma-separated lists (a single value works fine):
 *   GEMINI_API_KEY   one key, or several separated by commas
 *   GEMINI_MODEL     one model, or an ordered preference list
 *
 * Attempts are capped by a per-call timeout, because a model that hangs is worse
 * during a live demo than one that fails fast and lets the chain move on.
 */

const ATTEMPT_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS || 20000);

/** Verified-working defaults, ordered strongest first. */
const DEFAULT_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash-preview',
  'gemini-flash-lite-latest',
];

function split(value: string | undefined): string[] {
  return (value || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

export function configuredModels(): string[] {
  const fromEnv = split(process.env.GEMINI_MODEL);
  if (!fromEnv.length) return DEFAULT_MODELS;
  // Keep the explicit preference first, then the known-good models as backups.
  return [...fromEnv, ...DEFAULT_MODELS.filter(m => !fromEnv.includes(m))];
}

function configuredKeys(): string[] {
  const keys = split(process.env.GEMINI_API_KEY);
  return keys.length ? keys : [''];
}

function isWorthRetrying(error: unknown): boolean {
  const msg = String(error instanceof Error ? error.message : error).toLowerCase();
  // A malformed request is our bug and will fail identically on every model, so
  // it is the one case not worth walking the chain for.
  if (msg.includes('400') && !msg.includes('429')) return false;
  return true;
}

export type GenerateResult = {
  text: string;
  /** Which model actually answered — surfaced so the UI can show a fallback. */
  model: string;
  /** True when the first-choice candidate was not the one that answered. */
  usedFallback: boolean;
};

export async function generateJson(opts: {
  systemInstruction: string;
  prompt: string;
  temperature?: number;
}): Promise<GenerateResult> {
  const keys = configuredKeys();
  const models = configuredModels();
  let lastError: unknown = new Error('No Gemini candidates configured');
  let attempt = 0;

  for (const key of keys) {
    const client = new GoogleGenerativeAI(key);
    for (const modelName of models) {
      attempt++;
      try {
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: opts.systemInstruction,
        });

        const result = await Promise.race([
          model.generateContent({
            contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
            generationConfig: {
              temperature: opts.temperature ?? 0,
              responseMimeType: 'application/json',
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Timed out after ${ATTEMPT_TIMEOUT_MS}ms`)), ATTEMPT_TIMEOUT_MS)
          ),
        ]);

        const text = result.response.text().replace(/```json/gi, '').replace(/```/g, '').trim();
        if (!text) throw new Error('Empty response');

        if (attempt > 1) {
          console.warn(`[gemini] fell back to ${modelName} after ${attempt - 1} failed attempt(s)`);
        }
        return { text, model: modelName, usedFallback: attempt > 1 };
      } catch (error) {
        lastError = error;
        const reason = String(error instanceof Error ? error.message : error).slice(0, 100);
        console.warn(`[gemini] ${modelName} failed: ${reason}`);
        if (!isWorthRetrying(error)) throw error;
      }
    }
  }

  throw lastError;
}
