'use client';

import React, { useState, useEffect } from 'react';
import { CardRecommender } from '@/components/modules/CardRecommender';
import { ProtectionScore } from '@/components/modules/ProtectionScore';
import { SharedPayments } from '@/components/modules/SharedPayments';
import { FamilyPortfolio } from '@/components/modules/FamilyPortfolio';
import { TaxCompliance } from '@/components/modules/TaxCompliance';
import { FamilyVault } from '@/components/modules/FamilyVault';
import { FamilyAnalytics } from '@/components/modules/FamilyAnalytics';
import {
  ShieldCheck, CreditCard, ArrowLeftRight, TrendingUp,
  PieChart, Calculator, FolderLock, Download, Loader2, CheckCircle2,
  Users, LogOut, Sparkles, ChevronRight, Zap, ArrowUpRight, Plus
} from 'lucide-react';
import { useFamily } from '@/components/FamilyContext';

type Tab = 'portfolio' | 'analytics' | 'protection' | 'cards' | 'payments' | 'tax' | 'vault';

const modules: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'portfolio', label: 'Portfolio', icon: PieChart, desc: 'Net Worth & Assets' },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp, desc: 'Wealth Trends' },
  { id: 'protection', label: 'Protect', icon: ShieldCheck, desc: 'Insurance Analysis' },
  { id: 'cards', label: 'Cards', icon: CreditCard, desc: 'Points Optimizer' },
  { id: 'payments', label: 'Payments', icon: ArrowLeftRight, desc: 'Shared Bills' },
  { id: 'tax', label: 'Tax', icon: Calculator, desc: 'Compliance Engine' },
  { id: 'vault', label: 'Vault', icon: FolderLock, desc: 'Secure Documents' },
];

export default function Dashboard() {
  const { activeFamilyId, setActiveFamilyId, householdData, setHouseholdData } = useFamily();
  const [activeTab, setActiveTab] = useState<Tab>('portfolio');
  const [exportState, setExportState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [isLoadingHousehold, setIsLoadingHousehold] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [magicText, setMagicText] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (activeFamilyId) {
      // Skip the refetch if we already have this household in hand (e.g. just
      // returned directly from the AI onboarding flow) — avoids a round trip
      // that, on serverless, could land on a different instance than the one
      // that registered an AI-created household.
      if (householdData && householdData.id === activeFamilyId) return;
      setIsLoadingHousehold(true);
      fetch(`/api/household/${activeFamilyId}`)
        .then(r => r.json())
        .then(d => { if (d.error) throw new Error(d.error); setHouseholdData(d); })
        .catch(e => { console.error(e); setActiveFamilyId(null); })
        .finally(() => setIsLoadingHousehold(false));
    } else { setHouseholdData(null); }
  }, [activeFamilyId, householdData, setActiveFamilyId, setHouseholdData]);

  const handleExport = () => {
    setExportState('loading');
    try {
      const h = householdData;
      const members = (h.members || []).map((m: any) => `<tr><td>${m.name}</td><td>${m.relation}</td><td>${m.age}</td><td>₹${m.monthlyIncome.toLocaleString('en-IN')}</td></tr>`).join('');
      const assets = (h.portfolioBreakdown?.assets || []).map((a: any) => `<tr><td>${a.category}</td><td>${a.owner}</td><td style="text-align:right;color:#34d399">₹${a.amount.toLocaleString('en-IN')}</td></tr>`).join('');
      const liabilities = (h.portfolioBreakdown?.liabilities || []).map((l: any) => `<tr><td>${l.category}</td><td>${l.owner}</td><td style="text-align:right;color:#fb7185">₹${l.amount.toLocaleString('en-IN')}</td></tr>`).join('');
      const cards = (h.cards || []).map((c: any) => `<tr><td>${c.name}</td><td>${c.owner}</td><td>${c.network}</td><td>****${c.last4}</td><td style="text-align:right">₹${c.outstanding.toLocaleString('en-IN')}</td></tr>`).join('');
      const obligations = (h.obligations?.monthlyFixed || []).map((o: any) => `<tr><td>${o.name}</td><td style="text-align:right">₹${o.amount.toLocaleString('en-IN')}</td><td>${o.autoDebitDate}th</td></tr>`).join('');

      const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${h.familyName} — Wealth Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#09090b;color:#fafafa;padding:40px 60px;max-width:900px;margin:auto}
h1{font-size:28px;font-weight:900;margin-bottom:4px;letter-spacing:-0.02em}
h2{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#a1a1aa;margin:40px 0 16px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.06)}
.subtitle{color:#71717a;font-size:13px;margin-bottom:32px}
.kpi-row{display:flex;gap:24px;margin-bottom:32px}
.kpi{flex:1;background:rgba(24,24,27,0.6);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px}
.kpi-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;color:#71717a;margin-bottom:4px}
.kpi-value{font-size:22px;font-weight:900;font-variant-numeric:tabular-nums}
.green{color:#34d399}.red{color:#fb7185}.amber{color:#fbbf24}
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:8px}
th{text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#52525b;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.06)}
td{padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.03);color:#d4d4d8}
.footer{margin-top:48px;font-size:11px;color:#3f3f46;text-align:center;padding-top:24px;border-top:1px solid rgba(255,255,255,0.04)}
.logo{display:flex;align-items:center;gap:8px;margin-bottom:32px}
.logo-icon{width:24px;height:24px;background:linear-gradient(135deg,#fbbf24,#d97706);border-radius:6px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:900}
.logo-text{font-weight:900;font-size:15px}
@media print{body{background:#fff;color:#000}td{color:#333}th{color:#666}.kpi{background:#f9fafb;border-color:#e4e4e7}.kpi-label{color:#666}}
</style></head><body>
<div class="logo"><div class="logo-icon">⚡</div><div class="logo-text">CRED Legacy</div></div>
<h1>${h.familyName}</h1>
<div class="subtitle">Household Wealth Report · Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>

<div class="kpi-row">
<div class="kpi"><div class="kpi-label">Net Worth</div><div class="kpi-value">₹${h.netWorth.toLocaleString('en-IN')}</div></div>
<div class="kpi"><div class="kpi-label">Total Assets</div><div class="kpi-value green">₹${h.assets.toLocaleString('en-IN')}</div></div>
<div class="kpi"><div class="kpi-label">Total Liabilities</div><div class="kpi-value red">₹${h.liabilities.toLocaleString('en-IN')}</div></div>
<div class="kpi"><div class="kpi-label">YoY Growth</div><div class="kpi-value amber">+${h.yoyGrowth}%</div></div>
</div>

<h2>Family Members</h2>
<table><thead><tr><th>Name</th><th>Relation</th><th>Age</th><th>Monthly Income</th></tr></thead><tbody>${members}</tbody></table>

<h2>Assets</h2>
<table><thead><tr><th>Category</th><th>Owner</th><th style="text-align:right">Value</th></tr></thead><tbody>${assets}</tbody></table>

<h2>Liabilities</h2>
<table><thead><tr><th>Category</th><th>Owner</th><th style="text-align:right">Value</th></tr></thead><tbody>${liabilities}</tbody></table>

<h2>Credit Cards</h2>
<table><thead><tr><th>Card</th><th>Owner</th><th>Network</th><th>Number</th><th style="text-align:right">Outstanding</th></tr></thead><tbody>${cards}</tbody></table>

<h2>Monthly Obligations</h2>
<table><thead><tr><th>Obligation</th><th style="text-align:right">Amount</th><th>Due Date</th></tr></thead><tbody>${obligations}</tbody></table>

<div class="footer">
This report is generated from CRED Legacy's demo household data for illustrative purposes only.<br>
All data shown is simulated. Not financial advice. © ${new Date().getFullYear()} CRED Legacy Household OS.
</div>
</body></html>`;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${h.familyName.replace(/\s+/g, '_')}_Report_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportState('idle');
    }
  };

  const handleMagicCreate = async () => {
    if (!magicText.trim()) return;
    setIsCreating(true); setCreateError('');
    try {
      const res = await fetch('/api/household/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: magicText }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHouseholdData(data.household);
      setActiveFamilyId(data.familyId); setShowCreate(false); setMagicText('');
    } catch (err: any) { setCreateError(err.message || 'Failed to generate household.'); }
    finally { setIsCreating(false); }
  };

  /* ════════════════════════════════════════════════════════════════════════
     LOGIN SCREEN
     ════════════════════════════════════════════════════════════════════════ */
  if (!activeFamilyId) {
    return (
      <div className="min-h-screen bg-[#09090b] relative overflow-hidden">
        {/* Ambient lighting */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-radial from-amber-500/8 via-transparent to-transparent blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-indigo-500/5 via-transparent to-transparent blur-3xl" />

        {/* Navbar */}
        <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
              <Zap size={14} className="text-white" />
            </div>
            <span className="font-black text-white tracking-tight">CRED Legacy</span>
          </div>
          <div className="flex items-center gap-1">
            {['AA Framework', 'UPI Circle', 'DigiLocker', 'CKYC'].map(t => (
              <span key={t} className="text-[10px] font-semibold text-zinc-600 px-2.5 py-1 rounded-full border border-zinc-800/80 hidden sm:inline-block">{t}</span>
            ))}
          </div>
        </nav>

        <div className="relative z-10 flex flex-col items-center px-6 pt-12 pb-20 max-w-5xl mx-auto">
          {!showCreate ? (
            <>
              {/* Hero */}
              <div className="text-center mb-16 animate-fade-up">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-500/80 mb-6 bg-amber-500/5 border border-amber-500/10 px-4 py-1.5 rounded-full">
                  <span className="status-dot bg-amber-500" />
                  Household Financial Operating System
                </div>
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-[-0.03em] leading-[1.05] mb-5">
                  Your family&apos;s<br />
                  <span className="text-gradient">complete wealth view.</span>
                </h1>
                <p className="text-zinc-500 text-lg font-medium max-w-lg mx-auto leading-relaxed">
                  Six modules. One household. Every rupee, asset, policy, and card—consolidated and AI-analysed.
                </p>
              </div>

              {/* Profile cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mb-8 animate-fade-up delay-200">
                {([
                  { id: 'sharma' as const, name: 'Sharma Household', type: 'Established · HNI', worth: '₹8.72 Cr', growth: '+11.4%', members: 5, cards: 3, color: 'amber' },
                  { id: 'gupta' as const, name: 'Gupta Household', type: 'Young Professionals', worth: '₹84 L', growth: '+22.1%', members: 2, cards: 2, color: 'emerald' },
                ] as const).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveFamilyId(p.id)}
                    className="group card card-glow text-left p-6 hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${p.color === 'amber' ? 'text-amber-500' : 'text-emerald-500'} mb-1.5`}>{p.type}</p>
                        <h3 className="text-lg font-bold text-white">{p.name}</h3>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                        <ArrowUpRight size={14} className="text-zinc-500 group-hover:text-white transition-colors" />
                      </div>
                    </div>

                    <div className="flex items-baseline gap-3 mb-5">
                      <span className="text-2xl font-black text-white tabular-nums">{p.worth}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${p.color === 'amber' ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>{p.growth}</span>
                    </div>

                    <div className="flex gap-6 text-[11px] text-zinc-500 font-medium">
                      <span>{p.members} members</span>
                      <span>{p.cards} cards</span>
                      <span className="flex items-center gap-1"><span className={`w-1 h-1 rounded-full ${p.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} />Demo data</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Create button */}
              <button
                onClick={() => setShowCreate(true)}
                className="animate-fade-up delay-400 flex items-center gap-2 text-zinc-500 hover:text-amber-400 text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-500/5 border border-transparent hover:border-amber-500/10 transition-all"
              >
                <Plus size={14} />
                Create custom household with AI
              </button>
            </>
          ) : (
            /* ── MAGIC CREATE ── */
            <div className="w-full max-w-xl animate-scale-in">
              <button onClick={() => setShowCreate(false)} className="text-zinc-500 hover:text-zinc-300 text-sm font-medium mb-6 flex items-center gap-1 transition-colors">← Back</button>
              <div className="card p-7">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Sparkles size={14} className="text-amber-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">AI Onboarding</h2>
                </div>
                <p className="text-zinc-500 text-sm mb-5 leading-relaxed">Describe your family in plain English. Gemini will parse it into a full relational database schema.</p>
                <textarea
                  value={magicText} onChange={e => setMagicText(e.target.value)}
                  placeholder="e.g. We are the Singh family. I am Arjun (35) earning ₹2L/mo, my wife Neha earns ₹1.5L. We have an HDFC Infinia card. We own a ₹2Cr house with a ₹1.2Cr loan and ₹50L in mutual funds."
                  className="w-full h-32 p-4 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none resize-none text-sm placeholder-zinc-700 font-medium leading-relaxed transition-all"
                />
                {createError && <p className="text-red-400 text-xs font-medium mt-2 bg-red-500/5 border border-red-500/10 rounded-lg px-3 py-2">{createError}</p>}
                <div className="flex gap-2.5 mt-4">
                  <button onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-zinc-500 hover:text-zinc-300 font-semibold text-sm rounded-xl hover:bg-zinc-800 transition-all">Cancel</button>
                  <button
                    onClick={handleMagicCreate} disabled={isCreating || !magicText.trim()}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-black py-2.5 rounded-xl font-bold text-sm flex justify-center items-center gap-2 transition-all"
                  >
                    {isCreating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : <><Sparkles size={14} /> Generate Household</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════════════
     LOADING
     ════════════════════════════════════════════════════════════════════════ */
  if (isLoadingHousehold || !householdData) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-amber-500" size={24} />
        <p className="text-zinc-500 text-sm font-medium">Loading household...</p>
      </div>
    );
  }

  const fmt = (n: number) => {
    if (n >= 10000000) return `${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `${(n / 100000).toFixed(1)} L`;
    return n.toLocaleString('en-IN');
  };

  const activeModule = modules.find(m => m.id === activeTab)!;
  const ActiveIcon = activeModule.icon;

  /* ════════════════════════════════════════════════════════════════════════
     MAIN DASHBOARD
     ════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#09090b]">

      {/* ── HEADER ── */}
      <header className="glass border-b border-white/[0.06] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-5 h-14 flex items-center justify-between gap-4">
          {/* Left: brand */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Zap size={12} className="text-white" />
              </div>
              <span className="font-bold text-white text-sm hidden sm:inline">Legacy</span>
            </div>

            {/* Nav tabs */}
            {/* lg: not md: — seven tabs plus the action buttons overflow a
                768px header, so tablets use the bottom nav instead. */}
            <nav className="hidden lg:flex items-center">
              {modules.map(m => {
                const Icon = m.icon;
                const isActive = activeTab === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveTab(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'text-white bg-white/[0.08]'
                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon size={13} className={isActive ? 'text-amber-400' : ''} />
                    {m.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Center: KPIs */}
          {/* Inline KPIs need xl: — at lg the nav tabs, KPIs and both action
              buttons together overflow the header on ~1024-1280px screens. */}
          <div className="hidden xl:flex items-center gap-6">
            {[
              { label: 'Net Worth', value: `₹${fmt(householdData.netWorth)}`, color: 'text-white' },
              { label: 'Assets', value: `₹${fmt(householdData.assets)}`, color: 'text-emerald-400' },
              { label: 'Liabilities', value: `₹${fmt(householdData.liabilities)}`, color: 'text-rose-400' },
            ].map((kpi, i) => (
              <React.Fragment key={kpi.label}>
                {i > 0 && <div className="w-px h-4 bg-white/[0.06]" />}
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{kpi.label}</p>
                  <p className={`text-xs font-bold ${kpi.color} tabular-nums`}>{kpi.value}</p>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport} disabled={exportState !== 'idle'}
              className="hidden sm:flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] border border-white/[0.06] transition-all disabled:opacity-50"
            >
              {exportState === 'idle' && <><Download size={12} /> Export</>}
              {exportState === 'loading' && <><Loader2 size={12} className="animate-spin" /> ...</>}
              {exportState === 'done' && <><CheckCircle2 size={12} className="text-emerald-400" /> Done</>}
            </button>
            <button
              onClick={() => setActiveFamilyId(null)}
              className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] border border-white/[0.06] transition-all"
            >
              <Users size={11} />
              <span className="hidden sm:inline max-w-[80px] truncate">{householdData.familyName.replace('The ', '').replace(' Household', '')}</span>
              <LogOut size={11} />
            </button>
          </div>
        </div>

        {/* Mobile KPIs */}
        <div className="xl:hidden flex items-center justify-around px-4 pb-2.5 text-center gap-3">
          <div><p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Net Worth</p><p className="text-[11px] font-bold text-white tabular-nums">₹{fmt(householdData.netWorth)}</p></div>
          <div className="w-px h-5 bg-white/[0.06]" />
          <div><p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Assets</p><p className="text-[11px] font-bold text-emerald-400 tabular-nums">₹{fmt(householdData.assets)}</p></div>
          <div className="w-px h-5 bg-white/[0.06]" />
          <div><p className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">Growth</p><p className="text-[11px] font-bold text-amber-400">+{householdData.yoyGrowth}%</p></div>
        </div>
      </header>

      {/* ── MAIN ── */}
      <main className="max-w-[1100px] mx-auto px-5 py-8 pb-24 lg:pb-8">
        {/* Module title bar */}
        <div className="flex items-center justify-between mb-8 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
              <ActiveIcon size={16} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">{activeModule.label}</h1>
              <p className="text-[11px] font-medium text-zinc-600">{activeModule.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-zinc-700">
            <TrendingUp size={11} className="text-emerald-500" />
            <span>+{householdData.yoyGrowth}% YoY</span>
          </div>
        </div>

        {/* Content */}
        <div className="animate-fade-up delay-100">
          {activeTab === 'portfolio' && <FamilyPortfolio />}
          {activeTab === 'analytics' && <FamilyAnalytics />}
          {activeTab === 'protection' && <ProtectionScore />}
          {activeTab === 'cards' && <CardRecommender />}
          {activeTab === 'payments' && <SharedPayments />}
          {activeTab === 'tax' && <TaxCompliance />}
          {activeTab === 'vault' && <FamilyVault />}
        </div>
      </main>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/[0.06] flex">
        {modules.map(m => {
          const Icon = m.icon;
          const isActive = activeTab === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.id)}
              className={`flex flex-col items-center gap-0.5 flex-1 py-2.5 transition-colors ${isActive ? 'text-amber-400' : 'text-zinc-600'}`}
            >
              <Icon size={16} />
              <span className="text-[9px] font-bold">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
