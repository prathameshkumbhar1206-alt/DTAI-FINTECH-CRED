'use client';

import React, { useState } from 'react';
import { useFamily } from '@/components/FamilyContext';
import { Loader2, ArrowRight, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type AiResponse = {
  answer: string;
  relevantFigure: string;
};

const COLORS = ['#f59e0b', '#34d399', '#60a5fa', '#c084fc', '#fb7185', '#2dd4bf'];
const BG_CLASSES = ['bg-amber-400', 'bg-emerald-400', 'bg-blue-400', 'bg-purple-400', 'bg-rose-400', 'bg-teal-400'];

export function FamilyPortfolio() {
  const { activeFamilyId, householdData } = useFamily();

  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assets: any[] = householdData?.portfolioBreakdown?.assets || [];
  const liabilities: any[] = householdData?.portfolioBreakdown?.liabilities || [];

  const totalAssets = assets.reduce((sum: number, item: any) => sum + item.amount, 0);
  const totalLiabilities = liabilities.reduce((sum: number, item: any) => sum + item.amount, 0);
  const netWorth = totalAssets - totalLiabilities;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/portfolio-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, familyId: activeFamilyId }),
      });

      if (!res.ok) throw new Error('Failed to analyze portfolio.');
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
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-400 space-y-6">

      {/* Top KPI row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Assets', value: `₹${(totalAssets / 10000000).toFixed(2)} Cr`, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/10' },
          { label: 'Total Liabilities', value: `₹${(totalLiabilities / 10000000).toFixed(2)} Cr`, color: 'text-rose-400', bg: 'bg-rose-500/5 border-rose-500/10' },
          { label: 'Net Worth', value: `₹${(netWorth / 10000000).toFixed(2)} Cr`, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/10' },
        ].map(kpi => (
          <div key={kpi.label} className={`p-4 rounded-xl border ${kpi.bg}`}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{kpi.label}</p>
            <p className={`text-xl font-black ${kpi.color} tracking-tight`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Chart + breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Donut chart */}
        <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-4">Asset Allocation</h3>
          <div className="h-52 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assets}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={84}
                  paddingAngle={2}
                  stroke="none"
                >
                  {assets.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`}
                  contentStyle={{ borderRadius: '10px', border: '1px solid #27272a', background: '#18181b', color: '#fff', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
              <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Assets</span>
              <span className="text-lg font-black text-white">₹{(totalAssets / 10000000).toFixed(1)}Cr</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {assets.map((asset: any, idx: number) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${BG_CLASSES[idx % BG_CLASSES.length]}`} />
                {asset.category}
              </div>
            ))}
          </div>
        </div>

        {/* Tables side by side */}
        <div className="lg:col-span-3 grid grid-cols-1 gap-4">
          {/* Assets table */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Assets</h3>
              </div>
              <span className="text-sm font-bold text-emerald-400">₹{totalAssets.toLocaleString('en-IN')}</span>
            </div>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-zinc-800/50">
                {assets.map((a: any, i: number) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-5 font-semibold text-zinc-200">{a.category}</td>
                    <td className="py-2.5 px-5 text-zinc-500">{a.owner}</td>
                    <td className="py-2.5 px-5 text-right font-bold text-zinc-100 tabular-nums">₹{a.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Liabilities table */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown size={14} className="text-rose-400" />
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Liabilities</h3>
              </div>
              <span className="text-sm font-bold text-rose-400">₹{totalLiabilities.toLocaleString('en-IN')}</span>
            </div>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-zinc-800/50">
                {liabilities.map((l: any, i: number) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-2.5 px-5 font-semibold text-zinc-200">{l.category}</td>
                    <td className="py-2.5 px-5 text-zinc-500">{l.owner}</td>
                    <td className="py-2.5 px-5 text-right font-bold text-rose-400 tabular-nums">₹{l.amount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AI Q&A */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-amber-400" />
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">AI Portfolio Analyst</h3>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-700 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none font-medium text-sm placeholder-zinc-600"
              placeholder="e.g. Are we too concentrated in real estate?"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-900 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap shadow-lg shadow-amber-500/20"
            >
              {isLoading ? <><Loader2 size={14} className="animate-spin" /> Analysing...</> : <><ArrowRight size={14} /> Ask</>}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {result && (
            <div className="mt-4 p-5 rounded-xl border border-zinc-700/50 bg-zinc-950/60 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex items-start gap-4">
                <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg flex-shrink-0">
                  <span className="font-black text-amber-400 text-sm whitespace-nowrap">{result.relevantFigure}</span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300 font-medium">{result.answer}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
