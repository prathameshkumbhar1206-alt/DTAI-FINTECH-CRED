import { evaluateCard, type SpendCategory } from './card-rules';

/**
 * Net rupee value of putting this purchase on this card, after exclusions,
 * monthly caps and forex markup. Thin wrapper over the rules engine, kept for
 * the callers that only need the number rather than the full decision trace.
 */
export function calculateCardValue(
  card: { name: string },
  amount: number,
  category: string,
  merchant: string
): number {
  return evaluateCard(card.name, amount, category as SpendCategory, merchant || '').netValueINR;
}
