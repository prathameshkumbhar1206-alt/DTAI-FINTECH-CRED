'use client';

import React, { useState } from 'react';
import { useFamily } from '@/components/FamilyContext';
import { Loader2, FileText, ScanText, AlertOctagon, CheckCircle2, ChevronRight, HardDrive } from 'lucide-react';

const SAMPLE_DOCS = [
  {
    id: 'doc1',
    label: 'Sample 1: Life Insurance Policy',
    text: `POLICY SUMMARY: HDFC Life Click 2 Protect 3D Plus
Policy Number: 18029348
Policyholder: Deepak Sharma
Date of Commencement: 12-Oct-2018
Sum Assured: Rs. 2,00,00,000
Annual Premium: Rs. 24,500
Next Renewal Date: 12-Oct-2027
Nominee Registered: Yes
Nominee Name: Shanti Devi (Grandmother - deceased)`
  },
  {
    id: 'doc2',
    label: 'Sample 2: Mutual Fund Statement',
    text: `Axis Bluechip Fund - Direct Plan - Growth
Folio Number: 9912038472
Primary Unitholder: Priya Sharma
Joint Unitholder: None
Current NAV: 52.41
Total Units: 14,500.00
Current Value: Rs. 7,59,945
Bank Account Linked: HDFC Bank ending in 4421
No nominee registration found on record. Please update via CAMS online.`
  },
  {
    id: 'doc3',
    label: 'Sample 3: Property Document',
    text: `INDEX II - SALE DEED EXTRACT
Registration Date: 05-March-2022
Property: Flat 402, Tower B, Prestige Raintree, Whitefield, Bangalore.
Buyers: 1. Deepak Sharma 2. Priya Sharma
Consideration Amount: Rs. 1,45,00,000
Status: Registered.
Note: Client file notes indicate this asset was purchased after the 2019 Family Will was drafted and has not yet been appended to the registered estate plan.`
  }
];

type ExtractedResult = {
  documentType: string;
  extractedFields: { label: string; value: string }[];
  legacyFlag: string | null;
  flagSeverity: 'high' | 'medium' | 'none';
};

type VaultRecord = {
  id: string;
  type: string;
  flag: string | null;
  severity: 'high' | 'medium' | 'none';
};

export function FamilyVault() {
  const { activeFamilyId, householdData } = useFamily();

  const [documentText, setDocumentText] = useState(SAMPLE_DOCS[0].text);
  const [selectedSample, setSelectedSample] = useState(SAMPLE_DOCS[0].id);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<ExtractedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [vaultIndex, setVaultIndex] = useState<VaultRecord[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSampleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedSample(val);
    if (val === 'custom') {
      setDocumentText('');
    } else {
      const doc = SAMPLE_DOCS.find(d => d.id === val);
      if (doc) setDocumentText(doc.text);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a valid PDF file.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSelectedSample('custom');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Failed to parse PDF.');
      
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setDocumentText(data.text || '');
    } catch (err: any) {
      setError(err.message || 'Something went wrong while parsing the PDF.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentText.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/vault-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText, familyId: activeFamilyId })
      });

      if (!res.ok) throw new Error('Failed to extract document data.');

      const data: ExtractedResult = await res.json();
      if ((data as any).error) throw new Error((data as any).error);

      setResult(data);
      setVaultIndex(prev => [...prev, {
        id: Date.now().toString(),
        type: data.documentType,
        flag: data.legacyFlag,
        severity: data.flagSeverity
      }]);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-up duration-500 pb-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Family Vault</h2>
        <p className="text-zinc-400 text-sm leading-relaxed">Simulated OCR: Upload a PDF or paste text to extract structured data and flag legacy-planning gaps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Form & Ledger */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-3">Load a sample document</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none text-sm font-medium transition-all cursor-pointer"
                    value={selectedSample}
                    onChange={handleSampleChange}
                  >
                    {SAMPLE_DOCS.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.label}</option>
                    ))}
                    <option value="custom">Custom Text / Upload</option>
                  </select>
                </div>
                
                <div className="flex-1">
                   <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-3">Or Upload PDF</label>
                   <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileUpload} className="hidden" id="pdf-upload" />
                   <label htmlFor="pdf-upload" className="flex items-center justify-center w-full px-4 py-3 bg-zinc-950 border border-dashed border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-900 hover:text-zinc-300 transition-all cursor-pointer text-sm font-medium h-[46px]">
                     {isUploading ? <Loader2 size={16} className="animate-spin" /> : 'Choose File...'}
                   </label>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Document Text</label>
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-700">Raw Text</span>
                </div>
                <textarea 
                  className="w-full px-4 py-4 bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono text-[11px] leading-relaxed rounded-xl focus:ring-1 focus:ring-amber-500/50 focus:border-zinc-600 outline-none transition-all resize-none placeholder-zinc-700"
                  rows={12}
                  value={documentText}
                  onChange={e => setDocumentText(e.target.value)}
                  placeholder="Paste document text here..."
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={isLoading || !documentText.trim()}
                className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Analyzing...</>
                ) : (
                  <><ScanText size={16} /> Extract & File</>
                )}
              </button>
            </form>
          </div>

          {/* Ledger */}
          {vaultIndex.length > 0 && (
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-5 animate-fade-up delay-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 flex items-center gap-2">
                  <HardDrive size={14} /> Vault Index
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">{vaultIndex.length} FILED</span>
              </div>
              <ul className="divide-y divide-white/[0.04]">
                {vaultIndex.map(record => (
                  <li key={record.id} className="py-3 flex justify-between items-center gap-4 hover:bg-white/[0.03] -mx-2 px-2 rounded-lg transition-colors cursor-default">
                    <span className="text-sm font-medium text-zinc-300 truncate flex-1">{record.type}</span>
                    {record.severity === 'high' ? (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-400" title={record.flag || ''} />
                    ) : record.severity === 'medium' ? (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" title={record.flag || ''} />
                    ) : (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400" title="All good" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl animate-fade-up">
              <p className="text-rose-400 font-medium text-sm flex items-center gap-2">
                <AlertOctagon size={16} /> {error}
              </p>
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="h-full min-h-[400px] border border-white/[0.04] border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-600 p-8 text-center bg-zinc-900/20">
              <ScanText size={32} className="mb-4 opacity-50" />
              <p className="text-sm font-medium text-zinc-500">Awaiting document extraction...</p>
            </div>
          )}

          {isLoading && (
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl overflow-hidden min-h-[400px]">
              <div className="p-6 border-b border-white/[0.06] flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] animate-pulse"></div>
                <div className="h-5 bg-white/[0.04] rounded w-1/3 animate-pulse"></div>
              </div>
              <div className="p-6">
                <div className="h-3 w-32 bg-white/[0.04] rounded mb-6 animate-pulse"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i}>
                      <div className="h-2 w-20 bg-white/[0.04] rounded mb-2 animate-pulse"></div>
                      <div className="h-4 w-full bg-white/[0.04] rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl overflow-hidden animate-fade-up relative">
              <div className="absolute inset-0 bg-amber-500/5 blur-3xl pointer-events-none" />
              
              <div className="p-6 border-b border-white/[0.06] relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/15 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">{result.documentType}</h3>
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mt-1">Extracted Document</p>
                  </div>
                </div>
              </div>

              {result.legacyFlag && result.flagSeverity !== 'none' && (
                <div className={`p-5 border-b border-white/[0.06] relative z-10 flex gap-4 ${
                  result.flagSeverity === 'high' ? 'bg-rose-500/5' : 'bg-amber-500/5'
                }`}>
                  <div className="shrink-0 mt-0.5">
                    <AlertOctagon size={18} className={result.flagSeverity === 'high' ? 'text-rose-400' : 'text-amber-400'} />
                  </div>
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 ${
                      result.flagSeverity === 'high' ? 'text-rose-400' : 'text-amber-400'
                    }`}>Legacy Readiness Concern</p>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">{result.legacyFlag}</p>
                  </div>
                </div>
              )}
              
              {(!result.legacyFlag || result.flagSeverity === 'none') && (
                <div className="p-5 border-b border-white/[0.06] relative z-10 flex gap-4 bg-emerald-500/5">
                  <div className="shrink-0 mt-0.5">
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-1.5 text-emerald-400">Legacy Readiness Check</p>
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">No immediate concerns detected.</p>
                  </div>
                </div>
              )}

              <div className="p-6 relative z-10">
                <h4 className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-5">Extracted Fields</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                  {result.extractedFields.map((field, idx) => (
                    <div key={idx}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600 mb-1.5">{field.label}</p>
                      <p className="text-sm font-medium text-white break-words">{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {result.legacyFlag && result.flagSeverity !== 'none' && (
                <div className="p-5 border-t border-white/[0.06] bg-black/20 flex items-center justify-between relative z-10">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">Suggested Action</span>
                  <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm px-4 py-2 rounded-xl border border-white/[0.06] transition-all flex items-center gap-2">
                    {result.documentType.toLowerCase().includes('property') ? 'Draft Codicil' : 'Update Nominee via CAMS'}
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
