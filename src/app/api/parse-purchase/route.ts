import { NextResponse } from 'next/server';
import { generateJson } from '@/lib/gemini';
import { SPEND_CATEGORIES } from '@/lib/card-rules';
import { fallbackParse } from '@/lib/fallback-parser';

/**
 * Natural-language intake.
 *
 * This is the half of the problem a rules engine genuinely cannot solve. Reward
 * outcomes hinge on details that structured dropdowns cannot express — whether a
 * flight was booked through an issuer portal or direct with the airline, whether
 * a payment was converted to EMI, whether a merchant is a partner. People know
 * those details and say them naturally; extracting them is language work.
 *
 * The model classifies and extracts. It does not price anything — the parsed
 * result is handed back to the user for confirmation before the deterministic
 * engine values it.
 */
const SYSTEM_PROMPT = `You extract structured purchase details from a sentence a person types about
something they are about to buy in India.

Return these fields:
- amountINR: the rupee amount as a plain number. Understand Indian numbering:
  "80k" = 80000, "1.2 lakh"/"1.2L" = 120000, "2 cr" = 20000000, "₹45,000" = 45000.
- category: EXACTLY one of these strings — ${SPEND_CATEGORIES.join(', ')}.
  Map sensibly: a flight is "Flights", a hotel/resort is "Hotels", a restaurant or
  food delivery is "Dining", supermarket or Blinkit/Zepto is "Groceries", petrol or
  diesel is "Fuel", an e-commerce order is "Online Shopping", anything billed
  abroad or in foreign currency is "International", electricity/water/gas/mobile
  bills are "Utilities", loan or EMI payments are "EMI/Loan Payment", tax or
  challan payments are "Government Payment", tuition or school payments are
  "School Fees", house rent is "Rent", and premiums are "Insurance".
- merchant: the merchant or brand named, or null if none is mentioned.
- channel: one of "portal" (booked through a bank/card rewards portal such as
  SmartBuy, EDGE, or a bank's own travel site), "direct" (booked straight with the
  airline, hotel or merchant), "online", "offline" (in person, swiped or tapped),
  or "unknown" when the sentence genuinely does not say.
- confidence: "high", "medium" or "low" — how sure you are of the category and
  channel together.
- assumptions: an array of short strings naming anything you inferred rather than
  read directly. Be honest here; if the user never said how they are booking,
  say so. Empty array if you inferred nothing.

Rules:
- Never invent an amount. If no amount is present, set amountINR to null.
- "International" wins over the underlying category when the spend is clearly
  billed in a foreign currency abroad — the forex treatment dominates.
- Do not guess "portal" unless a portal is actually named or clearly implied.

Return ONLY valid JSON, no markdown, no code fences:
{
  "amountINR": number | null,
  "category": "string",
  "merchant": "string" | null,
  "channel": "portal" | "direct" | "online" | "offline" | "unknown",
  "confidence": "high" | "medium" | "low",
  "assumptions": ["string"]
}`;

export async function POST(req: Request) {
  const { text } = await req.json().catch(() => ({ text: '' }));
  if (!text || !text.trim()) {
    return NextResponse.json({ error: 'Describe the purchase first.' }, { status: 400 });
  }

  try {
    const { text: raw, model, usedFallback } = await generateJson({
      systemInstruction: SYSTEM_PROMPT,
      prompt: text,
    });
    const parsed = JSON.parse(raw);

    // The model's category is constrained to the engine's vocabulary — anything
    // outside it would silently skip every rule, so it is rejected rather than
    // passed through.
    if (!SPEND_CATEGORIES.includes(parsed.category)) {
      throw new Error(`Model returned unmapped category: ${parsed.category}`);
    }

    return NextResponse.json({
      amountINR: typeof parsed.amountINR === 'number' ? parsed.amountINR : null,
      category: parsed.category,
      merchant: parsed.merchant || '',
      channel: parsed.channel || 'unknown',
      confidence: parsed.confidence || 'medium',
      assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
      parsedBy: 'model',
      model,
      usedFallback,
    });
  } catch (error: any) {
    // Degrade to keyword parsing rather than dead-ending the user. The result is
    // explicitly marked so nobody mistakes it for the model's reading.
    console.error('Intake model unavailable, falling back to keyword parser:', error?.message);
    return NextResponse.json({ ...fallbackParse(text), parsedBy: 'keyword-fallback' });
  }
}
