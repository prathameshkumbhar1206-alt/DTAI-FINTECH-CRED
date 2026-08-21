'use client';

import React, { useState } from 'react';
import { useFamily } from '@/components/FamilyContext';
import { Loader2, Calculator, AlertTriangle, ShieldCheck, FileText, CheckCircle2 } from 'lucide-react';

type TaxResult = {
  flags: {
    category: string;
    detail: string;
    illustrativeHeadroom: string;
  }[];
  regimeComparison?: {
    oldRegimeLiability: string;
    newRegimeLiability: string;
    recommendation: string;
  };
  itrSuggestion?: string;
  itrReason?: string;
  harvestingInsights?: string | null;
  totalIllustrativeEstimate: string;
  disclaimer: string;
};

export function TaxCompliance() {
  const { activeFamilyId, householdData } = useFamily();

  const earningMembers = householdData.members.filter(m => m.monthlyIncome > 0);
  const hasSeniorDependents = householdData.members.some(m => m.relation === 'Parent' && m.age >= 60);

  const [section80C, setSection80C] = useState('100000');
  const [section80D, setSection80D] = useState('15000');
  const [stcg, setStcg] = useState('0');
  const [ltcg, setLtcg] = useState('0');
  const [additionalContext, setAdditionalContext] = useState('');
  
  const [docs, setDocs] = useState({ form16: false, form26as: false, ais: false });
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<TaxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError(null);

    const earners = earningMembers.map(m => ({ name: m.name, annualIncome: m.monthlyIncome * 12 }));

    try {
      const res = await fetch('/api/tax-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earners,
          section80C: Number(section80C),
          section80D: Number(section80D),
          stcg: Number(stcg),
          ltcg: Number(ltcg),
          hasSeniorDependents,
          additionalContext, familyId: activeFamilyId })
      });

      if (!res.ok) throw new Error('Failed to analyze tax data.');

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Tax & Compliance</h2>
      <p className="text-zinc-400 mb-8 leading-relaxed">Check for unutilized deduction headroom, compare tax regimes, and determine the right ITR form.</p>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form */}
        <div className="lg:col-span-5 bg-zinc-900/50 p-6 rounded-2xl border border-white/[0.06] h-fit">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em]">Earning Members (Auto-filled)</h3>
              {earningMembers.map(member => (
                <div key={member.id} className="flex justify-between items-center bg-zinc-950 p-4 rounded-xl border border-white/[0.06] hover:bg-white/[0.03] transition-colors">
                  <span className="text-sm font-medium text-zinc-200">{member.name}</span>
                  <span className="text-sm font-bold text-white tabular-nums">₹{(member.monthlyIncome * 12).toLocaleString('en-IN')}/yr</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">Section 80C Investments this year (₹)</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium transition-all"
                value={section80C}
                onChange={e => setSection80C(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">Section 80D Health Premium paid (₹)</label>
              <input 
                type="number" 
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium transition-all"
                value={section80D}
                onChange={e => setSection80D(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">STCG (₹)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium transition-all"
                  value={stcg}
                  onChange={e => setStcg(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">LTCG (₹)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium transition-all"
                  value={ltcg}
                  onChange={e => setLtcg(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-3">Document Tracker</h3>
              <div className="space-y-2">
                {[
                  { id: 'form16', label: 'Form 16' },
                  { id: 'form26as', label: 'Form 26AS' },
                  { id: 'ais', label: 'AIS (Annual Information Statement)' }
                ].map((doc) => (
                  <label key={doc.id} className="flex items-center gap-3 p-3 bg-zinc-950 border border-white/[0.06] rounded-xl cursor-pointer hover:bg-white/[0.03] transition-colors">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-zinc-700 text-amber-500 focus:ring-amber-500/50 focus:ring-offset-zinc-950 bg-zinc-900"
                      checked={docs[doc.id as keyof typeof docs]}
                      onChange={(e) => setDocs({ ...docs, [doc.id]: e.target.checked })}
                    />
                    <span className="text-sm font-medium text-zinc-300">{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} className="text-amber-500" />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-sm font-medium text-zinc-300 leading-relaxed">
                  Senior citizen dependents detected: <span className="font-bold text-white">{hasSeniorDependents ? 'Yes' : 'No'}</span>
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">Anything else relevant? (Optional)</label>
              <textarea 
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium transition-all resize-none"
                placeholder="e.g. Paid for father's medical treatment this year..."
                rows={3}
                value={additionalContext}
                onChange={e => setAdditionalContext(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-black py-4 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
            >
              {isLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Reviewing tax position...</>
              ) : (
                <><Calculator size={18} /> Check Tax Compliance</>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-7">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium mb-6 text-sm">
              {error}
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="h-full min-h-[400px] border border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900/50 border border-white/[0.06] flex items-center justify-center mb-4">
                <Calculator size={24} className="text-zinc-600" />
              </div>
              <p className="font-medium text-lg text-zinc-300">Run a tax check</p>
              <p className="text-sm max-w-sm mt-2 text-zinc-500">The AI will analyze the household's current investments, capital gains, and highlight any unutilized deduction limits.</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fade-up delay-100 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-amber-500/5 blur-3xl pointer-events-none rounded-full" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 border border-white/[0.06] p-6 rounded-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Calculator size={120} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">Unutilized Deductions</p>
                  <h3 className="text-3xl font-black tabular-nums text-white">{result.totalIllustrativeEstimate}</h3>
                </div>

                {result.itrSuggestion && (
                  <div className="bg-zinc-900/50 border border-white/[0.06] p-6 rounded-2xl relative">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-2">Recommended ITR Form</p>
                    <div className="flex items-center gap-3">
                      <h3 className="text-3xl font-black tabular-nums text-amber-500">{result.itrSuggestion}</h3>
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                    </div>
                    <p className="text-sm text-zinc-400 mt-2">{result.itrReason}</p>
                  </div>
                )}
              </div>

              {result.regimeComparison && (
                <div className="bg-zinc-900/50 border border-white/[0.06] p-6 rounded-2xl">
                  <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-4">Tax Regime Comparison</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.06]">
                      <p className="text-xs font-medium text-zinc-500 mb-1">Old Regime Liability</p>
                      <p className="text-xl font-bold text-white tabular-nums">{result.regimeComparison.oldRegimeLiability}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-950 border border-white/[0.06]">
                      <p className="text-xs font-medium text-zinc-500 mb-1">New Regime Liability</p>
                      <p className="text-xl font-bold text-white tabular-nums">{result.regimeComparison.newRegimeLiability}</p>
                    </div>
                  </div>
                  <div className="inline-block px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold">
                    Recommendation: {result.regimeComparison.recommendation}
                  </div>
                </div>
              )}

              {result.harvestingInsights && (
                <div className="bg-zinc-900/50 border border-white/[0.06] p-6 rounded-2xl border-l-2 border-l-amber-500">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-white mb-2">
                    <FileText size={16} className="text-amber-500" />
                    Tax Loss Harvesting Insights
                  </h4>
                  <p className="text-sm text-zinc-400 leading-relaxed">{result.harvestingInsights}</p>
                </div>
              )}

              <div className="space-y-4 relative z-10">
                <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em]">Deduction Headroom Details</h4>
                {result.flags.map((flag, idx) => (
                  <div key={idx} className="bg-zinc-900/50 border border-white/[0.06] p-6 rounded-2xl hover:bg-white/[0.03] transition-colors">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <h4 className="font-bold text-white text-sm">{flag.category}</h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 whitespace-nowrap">
                        {flag.illustrativeHeadroom}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">{flag.detail}</p>
                  </div>
                ))}
                {result.flags.length === 0 && (
                  <p className="text-sm text-zinc-500 italic">No significant deduction headroom flagged.</p>
                )}
              </div>

              <div className="bg-amber-500/5 p-4 rounded-xl flex items-start gap-3 border border-amber-500/10 relative z-10">
                <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-zinc-400 font-medium leading-relaxed">{result.disclaimer}</p>
              </div>
              
              <div className="pt-6 border-t border-white/[0.06] relative z-10">
                <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-4">Quick Actions</h4>
                <div className="flex flex-wrap gap-3">
                  <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm rounded-xl border border-white/[0.06] px-4 py-2 transition-colors">
                    Explore ELSS Funds
                  </button>
                  <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm rounded-xl border border-white/[0.06] px-4 py-2 transition-colors">
                    View Health Insurance
                  </button>
                  <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm rounded-xl border border-white/[0.06] px-4 py-2 transition-colors">
                    Consult Tax Advisor
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
