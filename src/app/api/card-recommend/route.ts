import { NextResponse } from 'next/server';
import { generateJson } from '@/lib/gemini';
import { getFullHousehold } from '@/lib/db-helper';
import { evaluateCard, TOTAL_RULE_COUNT, type SpendCategory, type Channel } from '@/lib/card-rules';

// The model explains the decision — it does not make it. Every card's value is
// computed by the deterministic rules engine, the winner is chosen by comparing
// those numbers in code, and Gemini only turns the resulting decision trace into
// language a household manager can act on. Keeping the arithmetic out of the
// model is what makes the output auditable and reproducible.
const SYSTEM_PROMPT = `You are the explanation layer of the CRED Legacy Household Card Recommender.

The winning card, every card's value, and the exact rules that fired have ALREADY
been determined by a deterministic rules engine. You do not choose the winner,
and you must never contradict or recalculate the numbers you are given.

You will receive: the purchase, the pre-determined winner and its value, the
other cards and their values, and — for each card — the specific terms-and-
conditions rules that fired or were skipped.

Your job:
1. Explain in plain, non-jargon language why the winning card earns the most for
   this specific purchase, quoting the rule that fired.
2. Where a card was excluded or capped, name the exact clause responsible. This
   is the insight the household cannot easily get themselves — be specific.
3. Note in one sentence how this purchase affects the winner's fee-waiver
   progress.
4. Set confidence to "low" when the merchant is unspecified but materially
   changes which rule applies, "medium" when the category maps cleanly but the
   merchant could shift the outcome, "high" when the rules apply unambiguously.
5. Use ambiguityNote ONLY for genuine ambiguity — for example, a booking that
   could be made either directly or through a rewards portal at very different
   rates. Return null when there is none. Never manufacture uncertainty.

Write for a non-technical family member deciding which card to tap. Be concrete
and brief.

Return ONLY valid JSON in this exact shape, with no markdown formatting, no code
fences, and no additional text:

{
  "reasons": ["string", "string", "string"],
  "milestoneNote": "string, one sentence",
  "confidence": "high" | "medium" | "low",
  "ambiguityNote": "string or null"
}`;

/**
 * Deterministic explanation used when the model is unavailable (quota, network,
 * malformed JSON). The recommendation itself never depends on the model, so a
 * failed call degrades the wording — not the answer.
 */
function fallbackExplanation(winner: any, ranked: any[]) {
  const reasons: string[] = [];
  const fired = winner.evaluation.trace.find((t: any) => t.outcome === 'fired');
  reasons.push(
    `${winner.card.name} earns ₹${Math.round(winner.evaluation.netValueINR).toLocaleString('en-IN')} on this purchase — ${fired ? fired.note : winner.evaluation.firedRuleLabel}`
  );
  for (const r of ranked.slice(1, 3)) {
    if (r.evaluation.excluded) {
      reasons.push(`${r.card.name} earns nothing here: ${r.evaluation.firedRuleLabel.toLowerCase()}.`);
    } else if (r.evaluation.capLostINR > 0) {
      reasons.push(`${r.card.name} would earn more on paper, but its monthly cap forfeits ₹${Math.round(r.evaluation.capLostINR).toLocaleString('en-IN')}.`);
    } else {
      reasons.push(`${r.card.name} earns ₹${Math.round(r.evaluation.netValueINR).toLocaleString('en-IN')} — ${r.evaluation.firedRuleLabel.toLowerCase()}.`);
    }
  }
  return {
    reasons,
    milestoneNote: winner.evaluation.milestoneNote || 'No fee-waiver milestone applies to this card.',
    confidence: 'medium' as const,
    ambiguityNote: null,
  };
}

export async function POST(req: Request) {
  try {
    const { amount, category, merchant, familyId, channel } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Enter a purchase amount greater than zero.' }, { status: 400 });
    }

    const householdData = getFullHousehold(familyId);
    if (!householdData) {
      return NextResponse.json({ error: 'Household not found.' }, { status: 404 });
    }

    const familyCards = householdData.cards;
    if (!familyCards?.length) {
      return NextResponse.json({ error: 'No cards on file for this household.' }, { status: 400 });
    }

    // ── Deterministic decision. The model never sees this comparison happen. ──
    const ranked = familyCards
      .map((c: any) => ({
        card: c,
        evaluation: evaluateCard(c.name, amount, category as SpendCategory, merchant || '', (channel as Channel) || 'unknown'),
      }))
      .sort((a: any, b: any) => b.evaluation.netValueINR - a.evaluation.netValueINR);

    const winner = ranked[0];
    const runnerUps = ranked.slice(1, 3).map((r: any) => ({
      cardId: r.card.id,
      ownerName: r.card.owner,
      estimatedValueINR: Math.round(r.evaluation.netValueINR),
      differenceFromWinner: Math.round(winner.evaluation.netValueINR - r.evaluation.netValueINR),
      excluded: r.evaluation.excluded,
      firedRuleLabel: r.evaluation.firedRuleLabel,
    }));

    // Cross-member routing is the household-level insight a single-user card app
    // cannot produce: the best card may belong to someone else, which creates a
    // settlement the family needs to be aware of.
    const winnerOwner = winner.card.owner;
    const ownerMismatch = ranked.some((r: any) => r.card.owner !== winnerOwner);

    const decisionTrace = ranked.map((r: any) => ({
      cardId: r.card.id,
      cardName: r.card.name,
      ownerName: r.card.owner,
      netValueINR: Math.round(r.evaluation.netValueINR),
      effectiveRatePct: Number((r.evaluation.effectiveRate * 100).toFixed(2)),
      excluded: r.evaluation.excluded,
      capLostINR: Math.round(r.evaluation.capLostINR),
      forexCostINR: Math.round(r.evaluation.forexCostINR),
      firedRuleLabel: r.evaluation.firedRuleLabel,
      rules: r.evaluation.trace,
    }));

    const modelContext = ranked
      .map(({ card, evaluation }: any) => {
        const rules = evaluation.trace
          .map((t: any) => `  [${t.outcome.toUpperCase()}] ${t.label}: ${t.note}`)
          .join('\n');
        return `Card: ${card.name} (owner: ${card.owner})\nNet value: ₹${Math.round(evaluation.netValueINR)}${evaluation.excluded ? '  — EXCLUDED, earns nothing' : ''}${card.id === winner.card.id ? '  <-- PRE-DETERMINED WINNER' : ''}\nRules evaluated:\n${rules}`;
      })
      .join('\n---\n');

    const userMessage = `Purchase: ₹${amount} — ${category}${merchant ? ` at ${merchant}` : ' (merchant not specified)'}${channel && channel !== 'unknown' ? `, booked ${channel}` : ', booking channel not specified'}

Pre-determined winner: ${winner.card.name}, owned by ${winner.card.owner}, net value ₹${Math.round(winner.evaluation.netValueINR)}

${modelContext}`;

    let explanation;
    let explanationSource: 'model' | 'deterministic-fallback' = 'model';
    let modelUsed: string | null = null;

    try {
      const { text: raw, model } = await generateJson({
        systemInstruction: SYSTEM_PROMPT,
        prompt: userMessage,
      });
      modelUsed = model;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.reasons) || !parsed.reasons.length) {
        throw new Error('Model returned no reasons');
      }
      // Models sometimes answer "None"/"N/A" as a string where the schema asks
      // for null, which would render an empty warning banner.
      const emptyish = ['none', 'null', 'n/a', 'na', '-', ''];
      if (typeof parsed.ambiguityNote !== 'string' || emptyish.includes(parsed.ambiguityNote.trim().toLowerCase())) {
        parsed.ambiguityNote = null;
      }
      explanation = parsed;
    } catch (modelError: any) {
      // The recommendation stands on the rules engine alone; only the narration
      // is lost. Surfacing this honestly beats failing the whole request.
      console.error('Explanation layer unavailable, using deterministic fallback:', modelError?.message);
      explanation = fallbackExplanation(winner, ranked);
      explanationSource = 'deterministic-fallback';
    }

    return NextResponse.json({
      recommendedCardId: winner.card.id,
      ownerName: winner.card.owner,
      estimatedValueINR: Math.round(winner.evaluation.netValueINR),
      effectiveRatePct: Number((winner.evaluation.effectiveRate * 100).toFixed(2)),
      excluded: winner.evaluation.excluded,
      runnerUps,
      decisionTrace,
      rulesEvaluated: TOTAL_RULE_COUNT,
      explanationSource,
      modelUsed,
      crossMemberNote:
        ownerMismatch
          ? `This card belongs to ${winnerOwner}. Using it for a household purchase creates an internal settlement to track.`
          : null,
      ...explanation,
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || 'Processing failed' }, { status: 500 });
  }
}
