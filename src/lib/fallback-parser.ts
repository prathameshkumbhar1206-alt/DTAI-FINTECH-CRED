import { SPEND_CATEGORIES, type SpendCategory, type Channel } from './card-rules';

/**
 * Keyword-and-regex purchase parser used only when the language model is
 * unreachable.
 *
 * It is deliberately much weaker than the model: it cannot resolve phrasing it
 * has no keyword for, and it says so rather than guessing. Its job is to keep
 * the demo alive on a dead quota, not to replace the intake layer — anything it
 * reads is returned at low confidence with its blind spots stated.
 */

const AMOUNT_PATTERNS: [RegExp, number][] = [
  [/(\d+(?:\.\d+)?)\s*(?:cr|crore)s?\b/i, 10000000],
  [/(\d+(?:\.\d+)?)\s*(?:l|lakh|lac)s?\b/i, 100000],
  [/(\d+(?:\.\d+)?)\s*k\b/i, 1000],
];

const CATEGORY_KEYWORDS: [SpendCategory, string[]][] = [
  ['Rent', ['rent', 'landlord']],
  ['Insurance', ['insurance', 'premium', 'policy']],
  ['School Fees', ['school fee', 'tuition', 'college fee', 'semester']],
  ['Government Payment', ['tax payment', 'challan', 'government', 'municipal']],
  ['EMI/Loan Payment', ['emi', 'loan payment', 'instalment', 'installment']],
  ['Utilities', ['electricity', 'water bill', 'gas bill', 'broadband', 'recharge', 'utility', 'utilities']],
  ['Fuel', ['petrol', 'diesel', 'fuel', 'gas station']],
  ['Flights', ['flight', 'airline', 'air ticket', 'indigo', 'emirates', 'vistara']],
  ['Hotels', ['hotel', 'resort', 'stay', 'airbnb', 'marriott', 'taj']],
  ['Dining', ['dinner', 'lunch', 'restaurant', 'dining', 'swiggy', 'zomato', 'cafe']],
  ['Groceries', ['grocer', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'dmart']],
  ['Online Shopping', ['amazon', 'flipkart', 'myntra', 'online', 'e-commerce', 'order']],
];

const FOREIGN_MARKERS = ['dubai', 'abroad', 'overseas', 'usd', 'euro', 'singapore', 'london', 'new york', 'international', 'foreign'];

/**
 * Whole-word match. Plain substring matching is unsafe here: "emi" sits inside
 * "Emirates", which silently reclassified a flight as a loan repayment.
 */
function hasWord(haystack: string, needle: string): boolean {
  return new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(haystack);
}

export type FallbackParse = {
  amountINR: number | null;
  category: SpendCategory;
  merchant: string;
  channel: Channel;
  confidence: 'low';
  assumptions: string[];
};

export function fallbackParse(text: string): FallbackParse {
  const lower = text.toLowerCase();
  const assumptions: string[] = [
    'Read without the language model — keyword matching only, so phrasing it does not recognise is missed.',
  ];

  // Amount: shorthand units first, then a plain rupee figure.
  let amount: number | null = null;
  for (const [pattern, multiplier] of AMOUNT_PATTERNS) {
    const m = lower.match(pattern);
    if (m) { amount = Math.round(parseFloat(m[1]) * multiplier); break; }
  }
  if (amount === null) {
    const plain = lower.replace(/[₹,]/g, '').match(/\b(\d{3,9})\b/);
    if (plain) amount = parseInt(plain[1], 10);
  }
  if (amount === null) assumptions.push('No amount recognised — enter it manually below.');

  // Foreign spend dominates, because the forex markup outweighs category rewards.
  let category: SpendCategory = 'Online Shopping';
  let matched = false;
  if (FOREIGN_MARKERS.some(f => hasWord(lower, f))) {
    category = 'International';
    matched = true;
    assumptions.push('Treated as international spend because a foreign location or currency was mentioned.');
  } else {
    for (const [cat, words] of CATEGORY_KEYWORDS) {
      if (words.some(w => hasWord(lower, w))) { category = cat; matched = true; break; }
    }
  }
  if (!matched) assumptions.push('No spend category recognised — defaulted to Online Shopping. Check this before routing.');

  let channel: Channel = 'unknown';
  if (/smartbuy|portal|edge ?miles|rewards site/i.test(lower)) channel = 'portal';
  else if (/direct|airline website|at the counter/i.test(lower)) channel = 'direct';
  else if (/online|website|app\b/i.test(lower)) channel = 'online';
  else if (/in store|in-store|swipe|tap|offline|shop/i.test(lower)) channel = 'offline';
  if (channel === 'unknown') assumptions.push('Booking channel not recognised — portal-only accelerated rates are withheld.');

  const merchantMatch = ['amazon', 'flipkart', 'myntra', 'swiggy', 'zomato', 'smartbuy', 'bookmyshow', 'emirates', 'indigo']
    .find(m => hasWord(lower, m));

  return {
    amountINR: amount,
    category: SPEND_CATEGORIES.includes(category) ? category : 'Online Shopping',
    merchant: merchantMatch ? merchantMatch.charAt(0).toUpperCase() + merchantMatch.slice(1) : '',
    channel,
    confidence: 'low',
    assumptions,
  };
}
