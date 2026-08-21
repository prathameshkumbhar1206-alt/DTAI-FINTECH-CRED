/**
 * Turns provider exceptions into something a non-technical person can act on.
 *
 * Raw SDK errors carry quota metric names, endpoint URLs and stack detail. Those
 * belong in the server log, not in front of someone using the app — so the
 * original is logged and only a plain sentence is returned.
 */
export function toUserMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('429') || lower.includes('quota') || lower.includes('rate limit')) {
    return 'The AI service has hit its request limit for now. Wait a moment and try again.';
  }
  if (lower.includes('api key') || lower.includes('permission') || lower.includes('401') || lower.includes('403')) {
    return 'The AI service is not configured correctly. Check that the API key is set.';
  }
  if (lower.includes('json') || lower.includes('unexpected token')) {
    return 'The AI returned a response we could not read. Try rephrasing and running it again.';
  }
  if (lower.includes('fetch') || lower.includes('network') || lower.includes('timeout') || lower.includes('econn')) {
    return 'Could not reach the AI service. Check your connection and try again.';
  }
  return fallback;
}
