'use client';

import React, { useState } from 'react';
import { useFamily } from '@/components/FamilyContext';
import { Loader2, ArrowRight, MessageSquareText, FileText, CheckCircle2, Clock } from 'lucide-react';

const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

type AiResponse = {
  answer: "yes" | "no" | "conditional";
  explanation: string;
};

export function SharedPayments() {
  const { activeFamilyId, householdData } = useFamily();

  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const householdObligations = householdData?.obligations?.monthlyFixed || [];
  const totalObligations = householdObligations.reduce((sum: number, o: any) => sum + o.amount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/cashflow-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, familyId: activeFamilyId })
      });

      if (!res.ok) throw new Error('Failed to analyze cash flow.');

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  const getAnswerStyle = (answer: string) => {
    if (answer === 'yes') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (answer === 'conditional') return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  return (
    <div className="animate-fade-up duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Shared Payments</h2>
        <p className="text-zinc-400 leading-relaxed text-sm">
          Manage your household's monthly obligations and ask questions about your cash flow.
        </p>
      </div>

      <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">
                <th className="py-4 px-6">Obligation</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-right">Auto-Debit Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {householdObligations.map((o: any) => (
                <tr key={o.id} className="hover:bg-white/[0.03] transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-amber-500">
                        <FileText size={14} />
                      </div>
                      <span className="font-medium text-white text-sm">{o.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 font-black tabular-nums text-white text-right text-sm">
                    ₹{o.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 px-6 text-sm text-zinc-400 font-medium text-right">
                    {o.autoDebitDate}{[11,12,13].includes(o.autoDebitDate % 100) ? 'th' : ['th','st','nd','rd'][o.autoDebitDate % 10 < 4 ? o.autoDebitDate % 10 : 0] || 'th'}
                  </td>
                </tr>
              ))}
              {householdObligations.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 px-6 text-center text-zinc-500 text-sm">
                    No obligations found.
                  </td>
                </tr>
              )}
            </tbody>
            {householdObligations.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/[0.06] bg-black/20">
                  <td className="py-4 px-6 font-bold uppercase tracking-[0.15em] text-[10px] text-zinc-600">Total Obligations</td>
                  <td className="py-4 px-6 font-black tabular-nums text-amber-400 text-right text-lg">
                    ₹{totalObligations.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="relative bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-6 overflow-hidden animate-fade-up delay-100">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-3xl pointer-events-none rounded-full translate-x-1/2 -translate-y-1/2" />
        
        <h3 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
          <MessageSquareText size={14} className="text-amber-500" />
          Ask about this month's finances
        </h3>
        
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 relative z-10">
          <input 
            type="text" 
            className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm placeholder-zinc-700 font-medium transition-all"
            placeholder="e.g. Can we afford an extra ₹15,000 this month for a family trip?"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            required
          />
          <button 
            type="submit" 
            disabled={isLoading || !question.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl px-6 py-3 flex justify-center items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin" /> Checking flow...</>
            ) : (
              <><ArrowRight size={16} /> Ask</>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium relative z-10">
            {error}
          </div>
        )}

        {result && (
          <div className={cn("mt-6 p-5 rounded-xl border relative z-10 animate-fade-up", getAnswerStyle(result.answer))}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">Verdict:</span>
              <span className="text-sm font-black uppercase tracking-widest">{result.answer}</span>
            </div>
            <p className="text-sm font-medium leading-relaxed opacity-90">
              {result.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
