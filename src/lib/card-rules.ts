/**
 * Structured card terms engine.
 *
 * The household's real pain point is that reward value is buried in fine print:
 * accelerated categories that only apply through one booking portal, monthly caps
 * that silently halve a headline rate, and exclusion lists that zero out a
 * category entirely. A naive "which card has the highest advertised rate" lookup
 * gets those cases wrong.
 *
 * So each card's terms are encoded as explicit, individually-labelled rules, and
 * evaluating a purchase produces a full decision trace: which rules were tested,
 * which one fired, and what the fine print says. That trace is what makes the
 * recommendation auditable rather than a black box, and it is computed here in
 * code — never by the language model.
 */

export type SpendCategory =
  | 'Flights' | 'Hotels' | 'Dining' | 'Groceries' | 'Fuel'
  | 'Online Shopping' | 'International' | 'Utilities'
  | 'EMI/Loan Payment' | 'Government Payment' | 'School Fees'
  | 'Rent' | 'Insurance';

export const SPEND_CATEGORIES: SpendCategory[] = [
  'Flights', 'Hotels', 'Dining', 'Groceries', 'Fuel',
  'Online Shopping', 'International', 'Utilities',
  'EMI/Loan Payment', 'Government Payment', 'School Fees',
  'Rent', 'Insurance',
];

/**
 * How the transaction is made. This matters more than most cardholders realise:
 * the same flight booked through an issuer's rewards portal versus directly with
 * the airline can differ by 5x in earn rate. A dropdown cannot capture it, which
 * is precisely why purchases are parsed from natural language.
 */
export type Channel = 'portal' | 'direct' | 'online' | 'offline' | 'unknown';

type Rule = {
  id: string;
  label: string;
  /** Categories this rule applies to. Omitted = applies to every category. */
  categories?: SpendCategory[];
  /** Substrings matched against the merchant name. Omitted = any merchant. */
  merchants?: string[];
  /** Channels this rule requires. Omitted = any channel. */
  channels?: Channel[];
  /** Earn rate as a fraction of spend. 0 for exclusions. */
  rate: number;
  /** Verbatim-style fine print this rule encodes. Shown to the user. */
  note: string;
};

type CardTerms = {
  /** Substring matched against the household card's display name. */
  key: string;
  displayName: string;
  issuer: string;
  baseRate: number;
  baseNote: string;
  /** Zero-earn categories, checked before anything else. */
  exclusions: Rule[];
  /** Higher-earn rules, best match wins. */
  accelerated: Rule[];
  /** Monthly ceiling on rewards earned, in rupees. */
  monthlyRewardCapINR?: number;
  monthlyRewardCapNote?: string;
  /** Markup charged on international transactions, as a fraction. */
  forexMarkup: number;
  annualFeeINR: number;
  feeWaiverSpendINR: number;
  /** Spend categories that do NOT count toward the fee-waiver milestone. */
  milestoneExcludedCategories: SpendCategory[];
};

export const CARD_TERMS: CardTerms[] = [
  {
    key: 'infinia',
    displayName: 'HDFC Infinia Metal',
    issuer: 'HDFC Bank',
    baseRate: 0.033,
    baseNote: '5 Reward Points per ₹150 spent, valued at ₹1/point — an effective 3.3% on retail spend.',
    exclusions: [
      { id: 'inf-x-emi', label: 'EMI conversions excluded', categories: ['EMI/Loan Payment'], rate: 0, note: 'No reward points accrue on EMI conversions, and EMI spend does not count toward the annual milestone.' },
      { id: 'inf-x-govt', label: 'Government payments excluded', categories: ['Government Payment'], rate: 0, note: 'Government-related transactions (MCC 9399, 9311) earn no reward points.' },
      { id: 'inf-x-rent', label: 'Rent excluded', categories: ['Rent'], rate: 0, note: 'Rent payments earn no reward points and are excluded from milestone spend.' },
      { id: 'inf-x-fuel', label: 'Fuel excluded', categories: ['Fuel'], rate: 0, note: 'Fuel transactions do not earn reward points on this card.' },
    ],
    accelerated: [
      { id: 'inf-a-smartbuy', label: '5X via SmartBuy portal', categories: ['Flights', 'Hotels'], channels: ['portal'], rate: 0.165, note: '5X reward points apply only to travel booked through the HDFC SmartBuy portal — the same booking made directly with the airline earns the base rate instead.' },
      { id: 'inf-a-dining', label: 'Dining accelerator', categories: ['Dining'], rate: 0.033, note: 'Dining multipliers were revised down from 10X; dining now earns at the base rate.' },
    ],
    forexMarkup: 0.02,
    annualFeeINR: 12500,
    feeWaiverSpendINR: 1000000,
    milestoneExcludedCategories: ['EMI/Loan Payment', 'Rent', 'Government Payment'],
  },
  {
    key: 'atlas',
    displayName: 'Axis Atlas',
    issuer: 'Axis Bank',
    baseRate: 0.02,
    baseNote: '2 EDGE Miles per ₹100 spent — an effective 2% on general spend.',
    exclusions: [
      { id: 'atl-x-rent', label: 'Rent excluded', categories: ['Rent'], rate: 0, note: 'Rent payments earn zero EDGE Miles and are excluded from milestone spend.' },
      { id: 'atl-x-govt', label: 'Government payments excluded', categories: ['Government Payment'], rate: 0, note: 'Government and tax payments earn no EDGE Miles.' },
      { id: 'atl-x-fuel', label: 'Fuel excluded', categories: ['Fuel'], rate: 0, note: 'Fuel spend is excluded from EDGE Miles accrual.' },
      { id: 'atl-x-emi', label: 'EMI excluded', categories: ['EMI/Loan Payment'], rate: 0, note: 'EMI conversions do not earn EDGE Miles.' },
      { id: 'atl-x-ins', label: 'Insurance excluded', categories: ['Insurance'], rate: 0, note: 'Insurance premium payments are excluded from accrual on this card.' },
    ],
    accelerated: [
      { id: 'atl-a-travel', label: '5X on direct travel bookings', categories: ['Flights', 'Hotels'], rate: 0.05, note: '5X EDGE Miles apply to direct airline and hotel bookings — this is one of the few cards that does not require a portal booking to earn accelerated travel rewards.' },
    ],
    forexMarkup: 0.035,
    annualFeeINR: 5000,
    feeWaiverSpendINR: 750000,
    milestoneExcludedCategories: ['Rent', 'Government Payment', 'EMI/Loan Payment'],
  },
  {
    key: 'cashback',
    displayName: 'SBI Cashback',
    issuer: 'SBI Card',
    baseRate: 0.01,
    baseNote: '1% cashback on offline and non-qualifying spend.',
    exclusions: [
      { id: 'sbi-x-util', label: 'Utilities excluded', categories: ['Utilities'], rate: 0, note: 'Utility bill payments are explicitly excluded from the 5% online category and earn 0%.' },
      { id: 'sbi-x-rent', label: 'Rent excluded', categories: ['Rent'], rate: 0, note: 'Rent payments earn exactly 0% cashback on this card.' },
      { id: 'sbi-x-ins', label: 'Insurance excluded', categories: ['Insurance'], rate: 0, note: 'Insurance premiums are excluded from cashback accrual.' },
      { id: 'sbi-x-edu', label: 'Education fees excluded', categories: ['School Fees'], rate: 0, note: 'Education and school fee payments yield 0% cashback.' },
      { id: 'sbi-x-emi', label: 'EMI excluded', categories: ['EMI/Loan Payment'], rate: 0, note: 'Any transaction converted to EMI post-purchase yields exactly 0% cashback.' },
      { id: 'sbi-x-fuel', label: 'Fuel excluded', categories: ['Fuel'], rate: 0, note: 'Fuel spend earns no cashback.' },
    ],
    accelerated: [
      { id: 'sbi-a-online', label: '5% on all online spend', categories: ['Online Shopping', 'Flights', 'Hotels', 'Dining', 'International'], rate: 0.05, note: '5% cashback on online spends with no merchant restriction — unusually broad, but subject to a hard monthly cap.' },
    ],
    monthlyRewardCapINR: 5000,
    monthlyRewardCapNote: 'The 5% online cashback is capped at ₹5,000 per billing cycle — large single transactions breach this cap and earn a much lower effective rate.',
    forexMarkup: 0.035,
    annualFeeINR: 999,
    feeWaiverSpendINR: 200000,
    milestoneExcludedCategories: ['EMI/Loan Payment'],
  },
  {
    key: 'amazon pay',
    displayName: 'Amazon Pay ICICI',
    issuer: 'ICICI Bank',
    baseRate: 0.01,
    baseNote: '1% cashback on all off-platform spend.',
    exclusions: [
      { id: 'apay-x-fuel', label: 'Fuel excluded', categories: ['Fuel'], rate: 0, note: 'Fuel purchases are strictly excluded from cashback.' },
      { id: 'apay-x-emi', label: 'EMI excluded', categories: ['EMI/Loan Payment'], rate: 0, note: 'EMI conversions earn no cashback whatsoever.' },
      { id: 'apay-x-rent', label: 'Rent excluded', categories: ['Rent'], rate: 0, note: 'Rent payments are excluded from cashback accrual.' },
    ],
    accelerated: [
      { id: 'apay-a-amazon', label: '5% on Amazon.in (Prime)', merchants: ['amazon'], rate: 0.05, note: 'Prime members earn 5% on Amazon.in purchases; non-Prime members earn 3%.' },
      { id: 'apay-a-partner', label: '2% at partner merchants', merchants: ['swiggy', 'bookmyshow', 'zomato'], rate: 0.02, note: 'Partner merchants paid via Amazon Pay checkout earn 2%.' },
      { id: 'apay-a-utility', label: '2% on Amazon digital payments', categories: ['Utilities'], merchants: ['amazon'], rate: 0.02, note: 'Bill payments and recharges made through Amazon Pay earn a fixed 2%.' },
    ],
    forexMarkup: 0.035,
    annualFeeINR: 0,
    feeWaiverSpendINR: 0,
    milestoneExcludedCategories: [],
  },
  {
    key: 'amex',
    displayName: 'Amex MRCC',
    issuer: 'American Express',
    baseRate: 0.01,
    baseNote: '1 Membership Rewards Point per ₹50 spent, valued at roughly ₹0.50/point — an effective 1%.',
    exclusions: [
      { id: 'amex-x-fuel', label: 'Fuel excluded', categories: ['Fuel'], rate: 0, note: 'Fuel spend earns no Membership Rewards Points.' },
      { id: 'amex-x-util', label: 'Utilities excluded', categories: ['Utilities'], rate: 0, note: 'Utility payments do not earn Membership Rewards Points.' },
      { id: 'amex-x-ins', label: 'Insurance excluded', categories: ['Insurance'], rate: 0, note: 'Insurance premiums earn no points on this card.' },
      { id: 'amex-x-emi', label: 'EMI excluded', categories: ['EMI/Loan Payment'], rate: 0, note: 'EMI conversions are excluded from points accrual.' },
      { id: 'amex-x-rent', label: 'Rent excluded', categories: ['Rent'], rate: 0, note: 'Rent payments earn no Membership Rewards Points.' },
    ],
    accelerated: [],
    forexMarkup: 0.035,
    annualFeeINR: 5000,
    feeWaiverSpendINR: 400000,
    milestoneExcludedCategories: ['EMI/Loan Payment', 'Rent', 'Utilities'],
  },
];

/** Total number of individually-encoded rules across the catalogue. */
export const TOTAL_RULE_COUNT = CARD_TERMS.reduce(
  (n, c) => n + c.exclusions.length + c.accelerated.length + 1 + (c.monthlyRewardCapINR ? 1 : 0),
  0
);

export function termsForCardName(cardName: string): CardTerms | null {
  const lower = (cardName || '').toLowerCase();
  return CARD_TERMS.find(t => lower.includes(t.key)) || null;
}

export type TraceEntry = {
  ruleId: string;
  label: string;
  outcome: 'fired' | 'skipped';
  note: string;
};

export type CardEvaluation = {
  cardName: string;
  /** Effective earn rate after caps, as a fraction of spend. */
  effectiveRate: number;
  /** Reward earned before forex costs and caps. */
  grossValueINR: number;
  /** Reward lost to the monthly cap, if any. */
  capLostINR: number;
  /** Forex markup charged on international spend. */
  forexCostINR: number;
  /** Gross reward, minus cap loss, minus forex cost. The number that decides. */
  netValueINR: number;
  excluded: boolean;
  firedRuleLabel: string;
  trace: TraceEntry[];
  capNote: string | null;
  milestoneCountsToward: boolean;
  milestoneNote: string | null;
};

function matches(rule: Rule, category: SpendCategory, merchant: string, channel: Channel): boolean {
  if (rule.categories && !rule.categories.includes(category)) return false;
  if (rule.merchants) {
    const m = merchant.toLowerCase();
    if (!m || !rule.merchants.some(x => m.includes(x))) return false;
  }
  if (rule.channels) {
    // An unspecified channel must not silently unlock a portal-only rate — the
    // conservative reading is what the cardholder actually gets if they guess wrong.
    const m = merchant.toLowerCase();
    const portalNamed = rule.channels.includes('portal') && m.includes('smartbuy');
    if (!portalNamed && !rule.channels.includes(channel)) return false;
  }
  return true;
}

/**
 * Evaluate one card against one purchase. Pure function, no model involved —
 * this is the computation the recommendation is actually decided on.
 */
export function evaluateCard(
  cardName: string,
  amount: number,
  category: SpendCategory,
  merchant: string,
  channel: Channel = 'unknown'
): CardEvaluation {
  const terms = termsForCardName(cardName);
  const trace: TraceEntry[] = [];

  if (!terms) {
    const gross = amount * 0.01;
    return {
      cardName, effectiveRate: 0.01, grossValueINR: gross, capLostINR: 0,
      forexCostINR: 0, netValueINR: gross, excluded: false,
      firedRuleLabel: 'Assumed base rate',
      trace: [{ ruleId: 'unknown', label: 'Terms not on file', outcome: 'fired', note: 'No structured terms are on file for this card; a conservative 1% base rate is assumed. Treat this recommendation as low confidence.' }],
      capNote: null, milestoneCountsToward: false, milestoneNote: null,
    };
  }

  // 1. Exclusions are checked first — they override every accelerated rate.
  const hitExclusion = terms.exclusions.find(r => matches(r, category, merchant, channel));
  for (const r of terms.exclusions) {
    const fired = r.id === hitExclusion?.id;
    if (fired || r.categories?.includes(category)) {
      trace.push({ ruleId: r.id, label: r.label, outcome: fired ? 'fired' : 'skipped', note: r.note });
    }
  }

  const forexCost = category === 'International' ? amount * terms.forexMarkup : 0;

  if (hitExclusion) {
    return {
      cardName, effectiveRate: 0, grossValueINR: 0, capLostINR: 0,
      forexCostINR: forexCost, netValueINR: -forexCost, excluded: true,
      firedRuleLabel: hitExclusion.label, trace, capNote: null,
      milestoneCountsToward: false,
      milestoneNote: terms.milestoneExcludedCategories.includes(category)
        ? `${category} spend does not count toward this card's ₹${terms.feeWaiverSpendINR.toLocaleString('en-IN')} fee-waiver threshold.`
        : null,
    };
  }

  // 2. Best-matching accelerated rule, if any.
  let bestRule: Rule | null = null;
  for (const r of terms.accelerated) {
    const ok = matches(r, category, merchant, channel);
    trace.push({ ruleId: r.id, label: r.label, outcome: ok ? 'fired' : 'skipped', note: r.note });
    if (ok && (!bestRule || r.rate > bestRule.rate)) bestRule = r;
  }

  const rate = bestRule ? bestRule.rate : terms.baseRate;
  if (!bestRule) {
    trace.push({ ruleId: `${terms.key}-base`, label: 'Base earn rate', outcome: 'fired', note: terms.baseNote });
  }

  // 3. Monthly reward cap.
  const gross = amount * rate;
  let capLost = 0;
  let capNote: string | null = null;
  if (terms.monthlyRewardCapINR && gross > terms.monthlyRewardCapINR) {
    capLost = gross - terms.monthlyRewardCapINR;
    capNote = terms.monthlyRewardCapNote || null;
    trace.push({
      ruleId: `${terms.key}-cap`,
      label: `Monthly cap of ₹${terms.monthlyRewardCapINR.toLocaleString('en-IN')} breached`,
      outcome: 'fired',
      note: `${terms.monthlyRewardCapNote} This transaction alone would earn ₹${Math.round(gross).toLocaleString('en-IN')} before the cap, so ₹${Math.round(capLost).toLocaleString('en-IN')} is forfeited.`,
    });
  }

  const netValue = gross - capLost - forexCost;
  if (forexCost > 0) {
    trace.push({
      ruleId: `${terms.key}-forex`,
      label: `Forex markup of ${(terms.forexMarkup * 100).toFixed(1)}%`,
      outcome: 'fired',
      note: `International transactions carry a ${(terms.forexMarkup * 100).toFixed(1)}% forex markup — ₹${Math.round(forexCost).toLocaleString('en-IN')} on this purchase, which is netted off the reward earned.`,
    });
  }

  const countsToward =
    terms.feeWaiverSpendINR > 0 && !terms.milestoneExcludedCategories.includes(category);

  return {
    cardName,
    effectiveRate: amount > 0 ? (gross - capLost) / amount : 0,
    grossValueINR: gross,
    capLostINR: capLost,
    forexCostINR: forexCost,
    netValueINR: netValue,
    excluded: false,
    firedRuleLabel: bestRule ? bestRule.label : 'Base earn rate',
    trace,
    capNote,
    milestoneCountsToward: countsToward,
    milestoneNote:
      terms.feeWaiverSpendINR === 0
        ? 'This card is lifetime free — it has no fee-waiver threshold to work toward.'
        : countsToward
          ? `Counts toward the ₹${terms.feeWaiverSpendINR.toLocaleString('en-IN')} annual spend that waives this card's ₹${terms.annualFeeINR.toLocaleString('en-IN')} fee.`
          : `${category} spend is excluded from this card's ₹${terms.feeWaiverSpendINR.toLocaleString('en-IN')} fee-waiver threshold.`,
  };
}
