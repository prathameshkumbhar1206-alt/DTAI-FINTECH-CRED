'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFamily } from '@/components/FamilyContext';
import {
  Loader2, Sparkles, AlertTriangle, CheckCircle2, Coins, TrendingUp,
  ChevronDown, ChevronRight, XCircle, Scale, Info, ArrowRightLeft, Gauge,
  Wand2, UserCheck, Database, ShieldAlert, CornerDownLeft,
} from 'lucide-react';
import { evaluateCard, SPEND_CATEGORIES, TOTAL_RULE_COUNT, type SpendCategory, type Channel } from '@/lib/card-rules';
import { computeLeakage } from '@/lib/savings-model';

type RunnerUp = {
  cardId: string;
  ownerName: string;
  estimatedValueINR: number;
  differenceFromWinner: number;
  excluded: boolean;
  firedRuleLabel: string;
};

type TraceRule = { ruleId: string; label: string; outcome: 'fired' | 'skipped'; note: string };

type TraceCard = {
  cardId: string;
  cardName: string;
  ownerName: string;
  netValueINR: number;
  effectiveRatePct: number;
  excluded: boolean;
  capLostINR: number;
  forexCostINR: number;
  firedRuleLabel: string;
  rules: TraceRule[];
};

type AiResponse = {
  recommendedCardId: string;
  ownerName: string;
  estimatedValueINR: number;
  effectiveRatePct: number;
  excluded: boolean;
  reasons: string[];
  milestoneNote: string;
  confidence: 'high' | 'medium' | 'low';
  ambiguityNote: string | null;
  runnerUps?: RunnerUp[];
  decisionTrace?: TraceCard[];
  rulesEvaluated?: number;
  explanationSource?: 'model' | 'deterministic-fallback';
  modelUsed?: string | null;
  crossMemberNote?: string | null;
};

type Card = {
  id: string;
  name: string;
  owner: string;
  network: string;
  last4: string;
  rewardPoints?: number;
  cardColorTheme?: string;
  milestoneProgress?: number;
  milestoneThreshold?: number;
  [key: string]: any;
};

/**
 * Preset purchases for the live Board demo. Each one is chosen to expose a
 * different failure mode of naive card selection, so the demo can show the
 * engine catching something a person reading a rewards table would miss.
 */
const DEMO_SCENARIOS: { label: string; teaches: string; sentence: string }[] = [
  {
    label: 'Flight, booked direct',
    teaches: 'Portal vs. direct changes the winner',
    sentence: 'Booking an ₹80,000 Emirates flight directly on the airline website',
  },
  {
    label: 'Big online order',
    teaches: 'A monthly cap silently halves the rate',
    sentence: 'Buying a ₹2 lakh home theatre system online',
  },
  {
    label: 'Monthly rent',
    teaches: 'Every card excludes it',
    sentence: 'Paying ₹45,000 house rent to my landlord',
  },
  {
    label: 'Spending abroad',
    teaches: 'Forex markup outweighs the rewards',
    sentence: 'Spending ₹1.2 lakh on hotels in Dubai next month',
  },
];

const CHANNEL_LABELS: Record<Channel, string> = {
  portal: 'via rewards portal',
  direct: 'booked direct',
  online: 'online',
  offline: 'in person',
  unknown: 'channel unknown',
};

const CONFIDENCE_STYLES: Record<string, { text: string; bg: string; border: string; label: string }> = {
  high: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'High confidence' },
  medium: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Medium confidence' },
  low: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Low confidence' },
};

export function CardRecommender() {
  const { activeFamilyId, householdData } = useFamily();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<SpendCategory>('Flights');
  const [merchant, setMerchant] = useState('');
  const [channel, setChannel] = useState<Channel>('unknown');

  const [purchaseText, setPurchaseText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseNote, setParseNote] = useState<{ confidence: string; assumptions: string[]; parsedBy: string } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTrace, setShowTrace] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showLeak, setShowLeak] = useState(false);
  const [showReadiness, setShowReadiness] = useState(false);

  // The verdict is the point of the whole screen, so it is brought into view
  // rather than left below the fold — this runs live in front of an audience.
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  // Stable identity, so the memoised leakage and matrix below don't recompute
  // on every render when the household has no cards.
  const cards: Card[] = useMemo(() => householdData?.cards || [], [householdData]);

  // Rewards leakage is recomputed from the household's own spend basket rather
  // than read from a stored figure, so the headline KPI can be interrogated.
  const leakage = useMemo(() => {
    if (!householdData?.monthlySpendBasket?.length || !cards.length) return null;
    return computeLeakage(cards, householdData.monthlySpendBasket, householdData.habitCardName);
  }, [householdData, cards]);

  const totalPoints = cards.reduce((acc, c) => acc + (c.rewardPoints || 0), 0);
  const cashEquivalent = totalPoints * 0.35;

  const categoryMatrix = useMemo(() => {
    const refCats: SpendCategory[] = ['Dining', 'Flights', 'Groceries', 'Online Shopping'];
    return refCats.map(cat => {
      if (!cards.length) return { category: cat, bestCard: null as Card | null, value: 0 };
      let best = cards[0];
      let maxVal = -Infinity;
      cards.forEach(c => {
        const v = evaluateCard(c.name, 10000, cat, '').netValueINR;
        if (v > maxVal) { maxVal = v; best = c; }
      });
      return { category: cat, bestCard: best, value: maxVal };
    });
  }, [cards]);

  const handleParse = async (raw?: string) => {
    const text = (raw ?? purchaseText).trim();
    if (!text) return;

    setIsParsing(true);
    setParseError(null);
    setParseNote(null);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/parse-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Could not read that purchase.');

      if (data.amountINR) setAmount(String(data.amountINR));
      setCategory(data.category);
      setMerchant(data.merchant || '');
      setChannel(data.channel || 'unknown');
      setParseNote({
        confidence: data.confidence,
        assumptions: data.assumptions || [],
        parsedBy: data.parsedBy || 'model',
      });
    } catch (err: any) {
      setParseError(err.message || 'Could not read that purchase — fill the fields in manually.');
    } finally {
      setIsParsing(false);
    }
  };

  const runScenario = (s: typeof DEMO_SCENARIOS[number]) => {
    setPurchaseText(s.sentence);
    handleParse(s.sentence);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;

    setIsLoading(true);
    setResult(null);
    setError(null);
    setShowTrace(false);
    setExpandedCard(null);

    try {
      const res = await fetch('/api/card-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), category, merchant, channel, familyId: activeFamilyId }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'The routing engine could not be reached.');
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong while analysing terms.');
    } finally {
      setIsLoading(false);
    }
  };

  const recommendedCard = result ? cards.find(c => c.id === result.recommendedCardId) : null;
  const conf = result ? CONFIDENCE_STYLES[result.confidence] || CONFIDENCE_STYLES.medium : null;
  const parseConf = parseNote ? CONFIDENCE_STYLES[parseNote.confidence] || CONFIDENCE_STYLES.medium : null;

  return (
    <div className="animate-fade-up space-y-6">

      {/* ═══ The hook: one line, with the full derivation one click away ═══ */}
      {leakage && leakage.annualLeakINR > 0 && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] overflow-hidden">
          <button
            onClick={() => setShowLeak(v => !v)}
            className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-rose-500/[0.04] transition-colors"
          >
            <TrendingUp className="text-rose-400 shrink-0" size={16} />
            <p className="text-sm font-semibold text-rose-200 min-w-0">
              ₹{leakage.annualLeakINR.toLocaleString('en-IN')}
              <span className="font-medium text-rose-300/70"> of rewards leaking per year</span>
            </p>
            <span className="ml-auto shrink-0 flex items-center gap-1 text-[11px] font-semibold text-rose-300/60">
              <Scale size={11} /> How we get this
              <ChevronDown size={12} className={`transition-transform ${showLeak ? 'rotate-180' : ''}`} />
            </span>
          </button>

          {showLeak && (
            <div className="border-t border-rose-500/10 bg-black/25 p-5 animate-fade-in">
              <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                Routing every purchase to the best household card, instead of defaulting to{' '}
                <span className="text-zinc-200 font-semibold">{householdData.habitCardName}</span>, earns{' '}
                <span className="text-emerald-400 font-semibold tabular-nums">₹{leakage.monthlyOptimalINR.toLocaleString('en-IN')}</span>/month
                rather than <span className="text-rose-400 font-semibold tabular-nums">₹{leakage.monthlyHabitINR.toLocaleString('en-IN')}</span>/month.
              </p>
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-zinc-600">
                      <th className="text-left font-semibold pb-2 pr-4">Category</th>
                      <th className="text-right font-semibold pb-2 pr-4">Monthly spend</th>
                      <th className="text-left font-semibold pb-2 pr-4">Best card</th>
                      <th className="text-right font-semibold pb-2">Monthly leak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leakage.lines.map(l => (
                      <tr key={l.category} className="border-t border-white/[0.04]">
                        <td className="py-2 pr-4 text-zinc-300 font-medium">{l.category}</td>
                        <td className="py-2 pr-4 text-right text-zinc-400 tabular-nums">₹{l.monthlyAmountINR.toLocaleString('en-IN')}</td>
                        <td className="py-2 pr-4 text-zinc-400">{l.bestCardName}</td>
                        <td className={`py-2 text-right tabular-nums font-semibold ${l.monthlyLeakINR > 0 ? 'text-rose-400' : 'text-zinc-600'}`}>
                          {l.monthlyLeakINR > 0 ? `₹${l.monthlyLeakINR.toLocaleString('en-IN')}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">Assumptions</p>
              <ul className="space-y-1">
                {leakage.assumptions.map((a, i) => (
                  <li key={i} className="text-[11px] text-zinc-500 leading-relaxed flex gap-2">
                    <span className="text-zinc-700 shrink-0">·</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ═══ The workbench — one continuous surface, read → confirm → route ═══ */}
      <div className="rounded-2xl border border-white/[0.09] bg-zinc-900/40 overflow-hidden shadow-2xl shadow-black/40">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start gap-3 border-b border-white/[0.05]">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-amber-400" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white tracking-tight leading-tight">Which card should we use?</h2>
            <p className="text-zinc-500 text-xs font-medium mt-0.5">
              {TOTAL_RULE_COUNT} encoded terms across {cards.length} household cards, priced in code.
            </p>
          </div>
        </div>

        {/* ── Read ── */}
        <div className="px-6 py-5 border-b border-white/[0.05]">
          <label htmlFor="purchase-text" className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
            Describe the purchase
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="purchase-text"
                type="text"
                value={purchaseText}
                onChange={e => setPurchaseText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleParse(); } }}
                placeholder="Booking an ₹80,000 flight to Dubai through SmartBuy"
                className="w-full pl-4 pr-10 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium transition-all"
              />
              <CornerDownLeft size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none" />
            </div>
            <button
              onClick={() => handleParse()}
              disabled={isParsing || !purchaseText.trim()}
              className="bg-zinc-100 hover:bg-white disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 px-5 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shrink-0"
            >
              {isParsing ? <><Loader2 size={15} className="animate-spin" /> Reading</> : <><Wand2 size={15} /> Read it</>}
            </button>
          </div>
          <p className="text-zinc-600 text-[11px] font-medium mt-2.5 leading-relaxed">
            Phrases like <span className="text-zinc-400 font-semibold">&ldquo;booked direct&rdquo;</span> or{' '}
            <span className="text-zinc-400 font-semibold">&ldquo;through SmartBuy&rdquo;</span> change which card wins — a dropdown can&apos;t capture them.
          </p>

          {parseError && (
            <p className="mt-3 text-amber-400/90 text-xs font-medium bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 flex items-start gap-2">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              {parseError}
            </p>
          )}

          <div className="flex flex-wrap gap-2 mt-4">
            {DEMO_SCENARIOS.map(s => (
              <button
                key={s.label}
                onClick={() => runScenario(s)}
                title={s.teaches}
                className="text-left px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950/60 hover:border-amber-500/30 hover:bg-amber-500/[0.04] transition-all group"
              >
                <span className="text-zinc-300 group-hover:text-amber-400 font-semibold text-xs transition-colors">{s.label}</span>
                <span className="text-zinc-600 text-[10px] font-medium block leading-tight mt-0.5">{s.teaches}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Confirm: the human checkpoint between reading and deciding ── */}
        {parseNote && (
          <div className="px-6 py-4 border-b border-white/[0.05] bg-white/[0.015] animate-fade-in">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <UserCheck size={14} className="text-zinc-400 shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">Check before it decides</p>
              <div className="ml-auto flex items-center gap-1.5">
                {parseNote.parsedBy === 'keyword-fallback' && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400/90">
                    keyword fallback
                  </span>
                )}
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${parseConf!.bg} ${parseConf!.border} ${parseConf!.text}`}>
                  {parseNote.confidence}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {amount && <span className="text-xs font-semibold text-zinc-100 bg-zinc-800/80 px-2.5 py-1 rounded-md tabular-nums">₹{Number(amount).toLocaleString('en-IN')}</span>}
              <span className="text-xs font-semibold text-zinc-100 bg-zinc-800/80 px-2.5 py-1 rounded-md">{category}</span>
              {merchant && <span className="text-xs font-semibold text-zinc-100 bg-zinc-800/80 px-2.5 py-1 rounded-md">{merchant}</span>}
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                channel === 'unknown' ? 'text-amber-400/90 bg-amber-500/10' : 'text-zinc-100 bg-zinc-800/80'
              }`}>
                {CHANNEL_LABELS[channel]}
              </span>
            </div>

            {parseNote.assumptions.length > 0 && (
              <ul className="space-y-1 mt-3">
                {parseNote.assumptions.map((a, i) => (
                  <li key={i} className="text-[11px] text-zinc-500 leading-relaxed flex gap-2">
                    <span className="text-zinc-700 shrink-0">·</span>{a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Route ── */}
        <form onSubmit={handleSubmit} className="px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">Confirm and route</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label htmlFor="amt" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 font-medium text-sm">₹</span>
                <input
                  id="amt" type="number" required min="1"
                  className="w-full pl-7 pr-3 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium tabular-nums transition-all"
                  placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label htmlFor="cat" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">Category</label>
              <select
                id="cat"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm font-medium transition-all appearance-none"
                value={category} onChange={e => setCategory(e.target.value as SpendCategory)}
              >
                {SPEND_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="merch" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">
                Merchant <span className="text-zinc-700 normal-case tracking-normal font-normal">optional</span>
              </label>
              <input
                id="merch" type="text"
                className="w-full px-3 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-lg focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium transition-all"
                placeholder="Amazon, SmartBuy…" value={merchant} onChange={e => setMerchant(e.target.value)}
              />
            </div>
          </div>

          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-1.5">How it&apos;s being paid</p>
            <div className="flex flex-wrap gap-1.5">
              {(['portal', 'direct', 'online', 'offline', 'unknown'] as Channel[]).map(ch => (
                <button
                  key={ch} type="button" onClick={() => setChannel(ch)}
                  aria-pressed={channel === ch}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    channel === ch
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {CHANNEL_LABELS[ch]}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit" disabled={isLoading || !amount}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/10"
          >
            {isLoading
              ? <><Loader2 size={16} className="animate-spin" /> Evaluating {TOTAL_RULE_COUNT} rules…</>
              : <><Sparkles size={16} /> Find the best card</>}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
          <AlertTriangle className="text-rose-400" size={18} />
          <p className="text-rose-300 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* ═══ The verdict ═══ */}
      <div ref={resultRef} className="scroll-mt-20">
        {result && recommendedCard && (
          <div className="card card-glow animate-fade-up">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />

            <div className="p-6 border-b border-white/[0.06]">
              <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Recommendation</h3>
                </div>
                <div className="flex items-center gap-2">
                  {conf && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${conf.bg} ${conf.border} ${conf.text}`}>
                      {conf.label}
                    </span>
                  )}
                  {result.effectiveRatePct > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/[0.08] text-zinc-400 flex items-center gap-1">
                      <Gauge size={10} /> {result.effectiveRatePct}% effective
                    </span>
                  )}
                </div>
              </div>

              {/* Every card excluded — an honest "no good option" answer */}
              {result.excluded ? (
                <div className="bg-zinc-950 border border-rose-500/20 rounded-2xl p-6 mb-6">
                  <div className="flex items-start gap-3">
                    <XCircle className="text-rose-400 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-white font-bold mb-1">No card earns rewards on this purchase</p>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        Every card in this household excludes {category.toLowerCase()} spend. The engine is telling you
                        there is no optimisation available here rather than inventing a winner — use whichever card has
                        the most available limit.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col lg:flex-row gap-6 mb-6">
                  {/* Winner */}
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-amber-500 flex items-center gap-1">
                        <Sparkles size={12} /> Best option
                      </span>
                      <span className="text-xl font-black text-amber-400 tabular-nums">
                        ₹{result.estimatedValueINR.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className={`w-full h-48 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl bg-gradient-to-br ${recommendedCard.cardColorTheme || 'from-zinc-800 to-zinc-900 border-zinc-700'} border ring-2 ring-amber-500 ring-offset-4 ring-offset-[#09090b]`}>
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="relative z-10 flex justify-between items-start">
                        <div>
                          <p className="text-white text-[10px] font-bold uppercase tracking-widest">{recommendedCard.owner}&apos;s</p>
                          <p className="text-white font-bold text-xl leading-tight">{recommendedCard.name}</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-white font-black text-[10px] italic">{recommendedCard.network}</div>
                      </div>
                      <div className="relative z-10 font-mono text-white/90 tracking-widest text-lg">•••• {recommendedCard.last4}</div>
                    </div>
                  </div>

                  {/* Runner-ups */}
                  {result.runnerUps?.slice(0, 2).map((ru, i) => {
                    const ruCard = cards.find(c => c.id === ru.cardId);
                    if (!ruCard) return null;
                    return (
                      <div key={i} className="flex-1 opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                            {ru.excluded ? 'Excluded' : 'Runner up'}
                          </span>
                          <span className={`text-sm font-bold tabular-nums ${ru.excluded ? 'text-zinc-600' : 'text-rose-400'}`}>
                            {ru.excluded ? '₹0' : `-₹${ru.differenceFromWinner.toLocaleString('en-IN')}`}
                          </span>
                        </div>
                        <div className={`w-full h-48 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-lg bg-gradient-to-br ${ruCard.cardColorTheme || 'from-zinc-800 to-zinc-900 border-zinc-700'} border border-white/[0.06] ${ru.excluded ? 'grayscale opacity-60' : ''}`}>
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                          <div className="relative z-10 flex justify-between items-start">
                            <div>
                              <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">{ruCard.owner}&apos;s</p>
                              <p className="text-white font-bold text-xl leading-tight">{ruCard.name}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-white font-black text-[10px] italic">{ruCard.network}</div>
                          </div>
                          <div className="relative z-10">
                            <p className="text-white/50 text-[9px] font-semibold leading-tight mb-1">{ru.firedRuleLabel}</p>
                            <div className="font-mono text-white/70 tracking-widest text-lg">•••• {ruCard.last4}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Reasoning */}
              <div className="pt-6 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Why</p>
                  {result.explanationSource === 'deterministic-fallback' && (
                    <span className="text-[10px] font-semibold text-amber-400/80 bg-amber-500/5 border border-amber-500/15 px-2 py-0.5 rounded-full">
                      Rules-only explanation
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {result.reasons.map((reason, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-zinc-300 leading-snug">{reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cross-member settlement — the household-level insight */}
            {result.crossMemberNote && (
              <div className="px-6 py-4 bg-indigo-500/[0.06] border-b border-indigo-500/10 flex items-start gap-3">
                <ArrowRightLeft className="text-indigo-400 shrink-0 mt-0.5" size={16} />
                <p className="text-indigo-300/90 text-sm font-medium leading-relaxed">{result.crossMemberNote}</p>
              </div>
            )}

            {result.ambiguityNote && (
              <div className="px-6 py-4 bg-amber-500/5 border-b border-amber-500/10 flex items-start gap-3">
                <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                <p className="text-amber-300/90 text-sm font-medium leading-relaxed">{result.ambiguityNote}</p>
              </div>
            )}

            {/* Milestone */}
            {(recommendedCard.milestoneThreshold || 0) > 0 && !result.excluded && (
              <div className="p-6 bg-zinc-900/30 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Milestone progress</p>
                  <p className="text-xs font-bold text-white tabular-nums">
                    ₹{(recommendedCard.milestoneProgress || 0).toLocaleString('en-IN')} / ₹{(recommendedCard.milestoneThreshold || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden mb-2">
                  <div
                    className="bg-amber-400 h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(100, ((recommendedCard.milestoneProgress || 0) / (recommendedCard.milestoneThreshold || 1)) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 font-medium">{result.milestoneNote}</p>
              </div>
            )}

            {/* ── Decision trace: every rule the engine evaluated ── */}
            {result.decisionTrace && (
              <div className="bg-zinc-950/50">
                <button
                  onClick={() => setShowTrace(v => !v)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Scale size={14} className="text-zinc-500" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                      Decision trace — {result.rulesEvaluated} rules evaluated
                    </span>
                  </div>
                  <ChevronDown size={16} className={`text-zinc-500 transition-transform ${showTrace ? 'rotate-180' : ''}`} />
                </button>

                {showTrace && (
                  <div className="px-6 pb-6 space-y-2 animate-fade-in">
                    <p className="text-[11px] text-zinc-600 leading-relaxed mb-4 flex items-start gap-2">
                      <Info size={12} className="shrink-0 mt-0.5" />
                      Card values are computed in code from encoded terms, not generated by the language model.
                      The model only writes the explanation above. Every number below is reproducible.
                    </p>
                    {result.decisionTrace.map(tc => (
                      <div key={tc.cardId} className="border border-white/[0.06] rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedCard(expandedCard === tc.cardId ? null : tc.cardId)}
                          className="w-full px-4 py-3 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <ChevronRight size={13} className={`text-zinc-600 shrink-0 transition-transform ${expandedCard === tc.cardId ? 'rotate-90' : ''}`} />
                            <span className="text-sm font-semibold text-zinc-200 truncate">{tc.cardName}</span>
                            <span className="text-[10px] text-zinc-600 font-medium hidden sm:inline">{tc.ownerName}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {tc.capLostINR > 0 && (
                              <span className="text-[10px] font-semibold text-amber-400/80">−₹{tc.capLostINR.toLocaleString('en-IN')} capped</span>
                            )}
                            {tc.forexCostINR > 0 && (
                              <span className="text-[10px] font-semibold text-rose-400/80">−₹{tc.forexCostINR.toLocaleString('en-IN')} forex</span>
                            )}
                            <span className={`text-sm font-bold tabular-nums ${tc.excluded ? 'text-zinc-600' : tc.netValueINR > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              ₹{tc.netValueINR.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </button>

                        {expandedCard === tc.cardId && (
                          <div className="px-4 py-3 bg-black/30 space-y-2.5 animate-fade-in">
                            {tc.rules.map(r => (
                              <div key={r.ruleId} className="flex items-start gap-2.5">
                                {r.outcome === 'fired'
                                  ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                  : <XCircle size={13} className="text-zinc-700 shrink-0 mt-0.5" />}
                                <div className="min-w-0">
                                  <p className={`text-xs font-semibold ${r.outcome === 'fired' ? 'text-zinc-200' : 'text-zinc-600'}`}>
                                    {r.label}
                                    <span className="ml-2 text-[9px] font-bold uppercase tracking-wider text-zinc-700">
                                      {r.outcome === 'fired' ? 'applied' : 'not applicable'}
                                    </span>
                                  </p>
                                  <p className="text-[11px] text-zinc-500 leading-relaxed mt-0.5">{r.note}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Limitations — explicit, always shown */}
            <div className="px-6 py-4 border-t border-white/[0.06] bg-zinc-950/30">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">Known limitations</p>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Card terms are encoded from published schedules and simplified for this prototype; issuers revise them without notice.
                Reward-point valuations are estimates. Monthly caps assume no prior spend in the current cycle. This is a spending
                suggestion for a human to act on — not financial advice, and no payment is initiated.
                {result.modelUsed && <span className="text-zinc-700"> Explanation generated by {result.modelUsed}.</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Reference material — deliberately below the decision ═══ */}
      <div className="flex items-center gap-3 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-700 shrink-0">Household context</span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <Coins size={14} className="text-amber-400" />
            <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Household rewards</h3>
          </div>
          <p className="text-3xl font-black text-white tabular-nums tracking-tight leading-none">{totalPoints.toLocaleString('en-IN')}</p>
          <p className="text-[11px] text-zinc-600 font-medium mt-1">points across {cards.length} cards</p>
          <p className="text-sm font-bold text-emerald-400 tabular-nums mt-3">
            ≈ ₹{cashEquivalent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} <span className="text-zinc-600 font-medium text-[11px]">cash value</span>
          </p>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5 overflow-hidden">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-3">Active family cards</h3>
          <div className="flex overflow-x-auto gap-3 hide-scrollbar pb-1 pt-1 -mx-1 px-1">
            {cards.map(card => (
              <div
                key={card.id}
                className={`flex-shrink-0 w-64 h-36 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden shadow-xl transition-transform hover:-translate-y-1 bg-gradient-to-br ${card.cardColorTheme || 'from-zinc-800 to-zinc-900 border-zinc-700'} border`}
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                <div className="relative z-10 flex justify-between items-start">
                  <div className="min-w-0">
                    <p className="text-white/70 text-[9px] font-bold uppercase tracking-widest">{card.owner.split(' ')[0]}&apos;s</p>
                    <p className="text-white font-bold text-base leading-tight truncate">{card.name}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-1.5 py-0.5 rounded text-white font-black text-[9px] italic shrink-0 ml-2">{card.network}</div>
                </div>
                <div className="relative z-10 flex justify-between items-end">
                  <div className="font-mono text-white/80 tracking-widest text-sm">•••• {card.last4}</div>
                  <p className="text-white font-bold text-xs tabular-nums">{(card.rewardPoints || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/40 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">Best card by category</h3>
          <span className="text-[10px] font-semibold text-zinc-700">per ₹10,000 spent</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categoryMatrix.map(item => (
            <div key={item.category} className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-3">
              <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-[0.12em] mb-1.5">{item.category}</p>
              <p className="text-zinc-100 font-semibold text-sm leading-tight mb-0.5 truncate">{item.bestCard?.name || 'N/A'}</p>
              <p className={`text-xs font-semibold tabular-nums ${item.value > 0 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {item.value > 0 ? `₹${Math.round(item.value).toLocaleString('en-IN')} back` : 'No rewards'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Prototype → production: the questions a board asks after the demo ── */}
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900/30 overflow-hidden">
        <button
          onClick={() => setShowReadiness(v => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database size={13} className="text-zinc-500" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-400">
              What production would need that this prototype does not have
            </span>
          </div>
          <ChevronDown size={15} className={`text-zinc-500 transition-transform ${showReadiness ? 'rotate-180' : ''}`} />
        </button>

        {showReadiness && (
          <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fade-in">
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database size={12} className="text-zinc-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Data readiness</p>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                This prototype runs on synthetic households and hand-encoded card terms. Production needs consented
                transaction feeds through the Account Aggregator framework, issuer terms ingested and version-tracked as
                they change, and card-on-file tokenisation. None of that is wired up here.
              </p>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={12} className="text-zinc-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Human in the loop</p>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                The model never moves money and never picks the card. It reads the purchase, a person confirms that
                reading, deterministic code prices it, and the person taps their own card. A model error surfaces as a
                wrong suggestion a human can reject — not an executed transaction.
              </p>
            </div>
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={12} className="text-zinc-500" />
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Cost to run</p>
              </div>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Two short model calls per recommendation — well under ₹1 at current flash-tier pricing. The pricing
                engine itself is deterministic code and costs nothing per call, so cost scales with how often people
                ask, not with how many cards or rules are added.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
