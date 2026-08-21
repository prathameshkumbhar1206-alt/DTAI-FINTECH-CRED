'use client';

import React, { useState } from 'react';
import { useFamily } from '@/components/FamilyContext';
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

type Gap = {
  category: string;
  severity: "critical" | "attention" | "adequate";
  detail: string;
};

type AiResponse = {
  protectionScore: number;
  verdict: string;
  gaps: Gap[];
  topRecommendation: string;
};

export function ProtectionScore() {
  const { activeFamilyId, householdData } = useFamily();

  const primaryEarner = householdData.members.find(m => m.relation === 'Self');
  const dependents = householdData.members.filter(m => m.relation === 'Child' || m.relation === 'Parent');
  const depCount = dependents.length;
  const depAges = dependents.map(d => d.age).join(', ');

  const [earnerAge, setEarnerAge] = useState(primaryEarner?.age.toString() || '35');
  const [monthlyIncome, setMonthlyIncome] = useState(primaryEarner?.monthlyIncome.toString() || '200000');
  const [dependentsCount, setDependentsCount] = useState(depCount.toString());
  const [dependentsAges, setDependentsAges] = useState(depAges);
  const [lifeCover, setLifeCover] = useState('20000000');
  const [healthCover, setHealthCover] = useState('2000000');
  const [homeLoan, setHomeLoan] = useState('12000000');
  const [otherLoans, setOtherLoans] = useState('1500000');
  const [additionalContext, setAdditionalContext] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/protection-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          earnerAge: Number(earnerAge),
          monthlyIncome: Number(monthlyIncome),
          dependentsCount: Number(dependentsCount),
          dependentsAges,
          lifeCover: Number(lifeCover),
          healthCover: Number(healthCover),
          homeLoan: Number(homeLoan),
          otherLoans: Number(otherLoans),
          additionalContext, 
          familyId: activeFamilyId 
        })
      });

      if (!res.ok) throw new Error('Failed to calculate protection score.');

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': 
        return (
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/15 flex items-center justify-center shrink-0">
            <ShieldAlert className="text-rose-400" size={16} />
          </div>
        );
      case 'attention': 
        return (
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="text-amber-400" size={16} />
          </div>
        );
      case 'adequate': 
        return (
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0">
            <CheckCircle2 className="text-emerald-400" size={16} />
          </div>
        );
      default: return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 50) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="animate-fade-up">
      <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Protection Score</h2>
      <p className="text-zinc-400 mb-8 leading-relaxed">Assess your household's financial safety net across life, health, and debt exposure.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-white/[0.06] p-6 rounded-2xl h-fit">
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Primary Earner Age</label>
                <input type="number" required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium" value={earnerAge} onChange={e => setEarnerAge(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Monthly Income (₹)</label>
                <input type="number" required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Dependents Count</label>
                <input type="number" required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium" value={dependentsCount} onChange={e => setDependentsCount(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Ages of Dependents</label>
                <input type="text" required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium" value={dependentsAges} onChange={e => setDependentsAges(e.target.value)} placeholder="e.g. 68, 9" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/[0.06]">
              <div className="space-y-1.5 mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Life Cover (₹)</label>
                <input type="number" required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium" value={lifeCover} onChange={e => setLifeCover(e.target.value)} />
              </div>
              <div className="space-y-1.5 mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Health Cover (₹)</label>
                <input type="number" required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium" value={healthCover} onChange={e => setHealthCover(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1 border-t border-white/[0.06]">
              <div className="space-y-1.5 mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Home Loan (₹)</label>
                <input type="number" required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium" value={homeLoan} onChange={e => setHomeLoan(e.target.value)} />
              </div>
              <div className="space-y-1.5 mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Other Loans (₹)</label>
                <input type="number" required className="w-full px-4 py-2.5 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium" value={otherLoans} onChange={e => setOtherLoans(e.target.value)} />
              </div>
            </div>

            <div className="pt-1 border-t border-white/[0.06]">
              <div className="space-y-1.5 mt-4">
                <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Additional Situation Context</label>
                <textarea 
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium resize-none"
                  rows={2}
                  placeholder="e.g. My father has a pre-existing heart condition..."
                  value={additionalContext}
                  onChange={e => setAdditionalContext(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-black py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Assessing household coverage...</>
              ) : (
                <><ShieldCheck size={16} /> Calculate Protection Score</>
              )}
            </button>
          </div>
        </form>

        <div className="flex flex-col h-full">
          {error && (
            <div className="bg-rose-500/10 text-rose-400 p-4 rounded-xl border border-rose-500/20 flex items-start gap-3 mb-6 animate-fade-up">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-zinc-900/50 border border-white/[0.06] border-dashed rounded-2xl min-h-[300px]">
              <div className="w-12 h-12 rounded-xl bg-zinc-800/50 border border-white/[0.06] flex items-center justify-center mb-4 text-zinc-500">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-white font-medium mb-2">No Assessment Yet</h3>
              <p className="text-sm text-zinc-400">Run the calculator to see your family's protection gaps.</p>
            </div>
          )}

          {result && (
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-6 relative overflow-hidden animate-fade-up flex-1">
              <div className="absolute inset-0 bg-amber-500/5 blur-3xl pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex flex-col mb-8">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">Score</span>
                  <div className="flex items-end gap-2">
                    <span className={cn("text-6xl font-black tabular-nums leading-none", getScoreColor(result.protectionScore))}>
                      {result.protectionScore}
                    </span>
                    <span className="text-zinc-600 font-black tabular-nums text-2xl leading-none mb-1">/100</span>
                  </div>
                </div>

                <div className="pb-6 mb-6 border-b border-white/[0.06]">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 block mb-2">Verdict</span>
                  <p className="text-base font-medium text-white">{result.verdict}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 block mb-3">Identified Gaps</span>
                  {result.gaps.map((gap, idx) => (
                    <div key={idx} className="bg-zinc-950/50 border border-white/[0.04] p-4 rounded-xl flex items-start gap-3 hover:bg-white/[0.03] transition-colors">
                      {getSeverityIcon(gap.severity)}
                      <div>
                        <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-300 mb-1">{gap.category}</h4>
                        <p className="text-sm text-zinc-400 leading-relaxed">{gap.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-white/[0.06]">
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-500 mb-3 flex items-center gap-2">
                    Top Recommendation <ArrowRight size={14} />
                  </h4>
                  <p className="text-sm text-zinc-300 leading-relaxed">
                    {result.topRecommendation}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
