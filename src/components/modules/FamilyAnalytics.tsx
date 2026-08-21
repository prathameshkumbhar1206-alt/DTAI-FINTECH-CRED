'use client';

import React, { useMemo } from 'react';
import { useFamily } from '@/components/FamilyContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Activity, CreditCard, PieChart as PieChartIcon } from 'lucide-react';

export function FamilyAnalytics() {
  const { householdData } = useFamily();
  
  // Section A: Net Worth Over Time (Mock data based on netWorth)
  const netWorthData = useMemo(() => {
    if (!householdData?.netWorth) return [];
    const base = householdData.netWorth;
    const data: { month: string; value: number }[] = [];
    const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    // Generate trailing data ending at current net worth
    let current = base * 0.85; // Start 15% lower
    const step = (base - current) / 11;
    for (let i = 0; i < 12; i++) {
      const noise = (Math.random() - 0.5) * (step * 0.5);
      const val = i === 11 ? base : current + noise;
      data.push({
        month: months[i],
        value: val
      });
      current += step;
    }
    return data;
  }, [householdData?.netWorth]);

  // Section B: Spend by Category (Pie Chart)
  const spendData = useMemo(() => {
    if (!householdData?.obligations) return [];
    
    const fixed = householdData.obligations.monthlyFixed || [];
    const adhoc = householdData.obligations.upcomingAdHoc || [];
    
    let totalFixed = 0;
    fixed.forEach((f: any) => { totalFixed += f.amount || 0; });
    
    let totalAdHoc = 0;
    adhoc.forEach((a: any) => { totalAdHoc += a.amount || 0; });
    
    return [
      { name: 'Fixed Obligations', value: totalFixed, color: '#f59e0b' }, // amber-500
      { name: 'Ad-hoc Spend', value: totalAdHoc, color: '#10b981' }, // emerald-500
    ].filter(d => d.value > 0);
  }, [householdData?.obligations]);

  const cards = householdData?.cards || [];

  const fmt = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-3 shadow-xl">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{label || payload[0].name}</p>
          <p className="text-sm font-bold text-white tabular-nums">{fmt(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  if (!householdData) return null;

  return (
    <div className="space-y-6 animate-fade-up">
      
      {/* Net Worth Trend */}
      <div className="card p-6 relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/5 blur-3xl pointer-events-none" />
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
            <Activity size={14} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-bold">Net Worth Over Time</h3>
            <p className="text-xs text-zinc-500 font-medium">12-month trailing performance</p>
          </div>
        </div>
        <div className="h-[250px] w-full relative z-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={netWorthData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis 
                dataKey="month" 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke="#52525b" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(val) => fmt(val).replace('₹', '')}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#09090b', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Spend by Category */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
             <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
               <PieChartIcon size={14} className="text-emerald-400" />
             </div>
             <div>
               <h3 className="text-white font-bold">Spend by Category</h3>
               <p className="text-xs text-zinc-500 font-medium">Fixed vs Ad-hoc</p>
             </div>
          </div>
          <div className="h-[200px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spendData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {spendData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-1">Total</span>
              <span className="text-sm font-black text-white tabular-nums">
                {fmt(spendData.reduce((acc, curr) => acc + curr.value, 0))}
              </span>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-6">
            {spendData.map(d => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-widest">{d.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card Utilization Heatmap */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/15 flex items-center justify-center">
              <CreditCard size={14} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Card Utilization</h3>
              <p className="text-xs text-zinc-500 font-medium">Heatmap of outstanding vs limits</p>
            </div>
          </div>
          <div className="space-y-5">
            {cards.map((card: any) => {
              const util = card.limit_amt ? (card.outstanding / card.limit_amt) * 100 : 0;
              const isHigh = util > 30;
              return (
                <div key={card.id || card.last4} className="group relative">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        {card.name} <span className="text-zinc-600 font-medium ml-1">••••{card.last4}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums ${isHigh ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                        {util.toFixed(1)}% utilized
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(util, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-500">₹{card.outstanding.toLocaleString('en-IN')} USED</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-600">₹{card.limit_amt?.toLocaleString('en-IN') || 'N/A'} LIMIT</span>
                  </div>
                </div>
              );
            })}
            {cards.length === 0 && (
              <div className="text-center text-zinc-500 text-[11px] font-bold uppercase tracking-[0.15em] py-8 border border-dashed border-white/[0.06] rounded-xl">
                No active cards
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
