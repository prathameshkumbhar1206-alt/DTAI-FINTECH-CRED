// Static household data — replaces the SQLite-backed store from scripts/seed.js.
//
// Why: better-sqlite3 writes to a local file, which does not work on Vercel/Netlify
// serverless functions (read-only, ephemeral filesystem, fresh container per
// invocation). Since illustrative/synthetic data is acceptable for this prototype,
// the two demo households are baked in here instead of read from disk.

import type { SpendLine } from './savings-model';

export type Household = {
  id: string;
  familyName: string;
  netWorth: number;
  assets: number;
  liabilities: number;
  yoyGrowth: number;
  emergencyFundMonths: number;
  primaryGoal: string;
  lostRewardsValue: number;
  /** Representative monthly spend, used to compute rewards leakage. */
  monthlySpendBasket: SpendLine[];
  /** The card this household habitually defaults to — the leakage baseline. */
  habitCardName: string;
  members: {
    id: string;
    householdId: string;
    name: string;
    age: number;
    relation: string;
    monthlyIncome: number;
    isDependent: number;
  }[];
  cards: {
    id: string;
    householdId: string;
    owner: string;
    name: string;
    network: string;
    last4: string;
    outstanding: number;
    limit_amt: number;
    rewardPoints: number;
    cardColorTheme: string;
    milestoneThreshold: number;
    milestoneProgress: number;
  }[];
  portfolioBreakdown: {
    assets: { type: string; category: string; amount: number; owner: string }[];
    liabilities: { type: string; category: string; amount: number; owner: string }[];
  };
  obligations: {
    monthlyFixed: { id: string; householdId: string; name: string; amount: number; autoDebitDate: number }[];
    upcomingAdHoc: { id: string; householdId: string; name: string; amount: number; dueDate: string }[];
  };
};

export const staticHouseholds: Record<string, Household> = {
  sharma: {
    id: 'sharma',
    familyName: 'The Sharma Household',
    netWorth: 87200000,
    assets: 102100000,
    liabilities: 14900000,
    yoyGrowth: 11.4,
    emergencyFundMonths: 4,
    primaryGoal: "Children's higher education in 4 years",
    lostRewardsValue: 14200,
    habitCardName: 'HDFC Infinia Metal',
    monthlySpendBasket: [
      { category: 'Online Shopping', monthlyAmountINR: 62000 },
      { category: 'Dining', monthlyAmountINR: 34000 },
      { category: 'Groceries', monthlyAmountINR: 28000 },
      { category: 'Flights', monthlyAmountINR: 41000 },
      { category: 'Hotels', monthlyAmountINR: 22000 },
      { category: 'Fuel', monthlyAmountINR: 14000 },
      { category: 'Utilities', monthlyAmountINR: 18000 },
      { category: 'School Fees', monthlyAmountINR: 45000 },
      { category: 'International', monthlyAmountINR: 25000 },
    ],
    members: [
      { id: 'm1', householdId: 'sharma', name: 'Deepak Sharma', age: 42, relation: 'Self', monthlyIncome: 450000, isDependent: 0 },
      { id: 'm2', householdId: 'sharma', name: 'Priya Sharma', age: 39, relation: 'Spouse', monthlyIncome: 280000, isDependent: 0 },
      { id: 'm3', householdId: 'sharma', name: 'Rohan Sharma', age: 14, relation: 'Child', monthlyIncome: 0, isDependent: 1 },
      { id: 'm4', householdId: 'sharma', name: 'Ananya Sharma', age: 9, relation: 'Child', monthlyIncome: 0, isDependent: 1 },
      { id: 'm5', householdId: 'sharma', name: 'Shanti Devi', age: 68, relation: 'Parent', monthlyIncome: 0, isDependent: 1 },
    ],
    cards: [
      { id: 'c1', householdId: 'sharma', owner: 'Deepak Sharma', name: 'HDFC Infinia Metal', network: 'Visa', last4: '8812', outstanding: 45000, limit_amt: 1200000, rewardPoints: 142500, cardColorTheme: 'from-slate-800 to-slate-900 border-slate-700', milestoneThreshold: 1000000, milestoneProgress: 850000 },
      { id: 'c2', householdId: 'sharma', owner: 'Deepak Sharma', name: 'Axis Atlas', network: 'Visa', last4: '9011', outstanding: 12000, limit_amt: 800000, rewardPoints: 42000, cardColorTheme: 'from-red-900 to-red-950 border-red-800', milestoneThreshold: 750000, milestoneProgress: 410000 },
      { id: 'c3', householdId: 'sharma', owner: 'Priya Sharma', name: 'SBI Cashback', network: 'Visa', last4: '4421', outstanding: 8500, limit_amt: 400000, rewardPoints: 18500, cardColorTheme: 'from-blue-600 to-blue-800 border-blue-500', milestoneThreshold: 200000, milestoneProgress: 180000 },
    ],
    portfolioBreakdown: {
      assets: [
        { type: 'asset', category: 'Bank & FDs', amount: 18500000, owner: 'Household' },
        { type: 'asset', category: 'Mutual Funds', amount: 24000000, owner: 'Deepak + Priya' },
        { type: 'asset', category: 'Direct Equities', amount: 12600000, owner: 'Deepak' },
        { type: 'asset', category: 'Real Estate', amount: 38000000, owner: 'Household' },
        { type: 'asset', category: 'Gold (Digital + SGB)', amount: 4200000, owner: 'Priya' },
        { type: 'asset', category: 'PPF / NPS', amount: 4800000, owner: 'Household' },
      ],
      liabilities: [
        { type: 'liability', category: 'Home Loan', amount: 11200000, owner: 'Deepak' },
        { type: 'liability', category: 'Vehicle Loan', amount: 1800000, owner: 'Priya' },
        { type: 'liability', category: 'Credit Card Outstanding', amount: 1900000, owner: 'Household' },
      ],
    },
    obligations: {
      monthlyFixed: [
        { id: 'o1', householdId: 'sharma', name: 'Home Loan EMI (HDFC)', amount: 115000, autoDebitDate: 5 },
        { id: 'o2', householdId: 'sharma', name: 'Car Loan EMI (SBI)', amount: 32000, autoDebitDate: 10 },
        { id: 'o3', householdId: 'sharma', name: 'Kids School Fees', amount: 45000, autoDebitDate: 1 },
        { id: 'o4', householdId: 'sharma', name: 'Utility Bills & Maintenance', amount: 18000, autoDebitDate: 15 },
        { id: 'o5', householdId: 'sharma', name: 'Mutual Fund SIPs', amount: 150000, autoDebitDate: 7 },
      ],
      upcomingAdHoc: [
        { id: 'a1', householdId: 'sharma', name: 'Annual Life Insurance Premium', amount: 125000, dueDate: '2023-11-15' },
        { id: 'a2', householdId: 'sharma', name: 'Property Tax', amount: 42000, dueDate: '2023-12-01' },
      ],
    },
  },

  gupta: {
    id: 'gupta',
    familyName: 'The Gupta Household',
    netWorth: 8400000,
    assets: 14200000,
    liabilities: 5800000,
    yoyGrowth: 22.1,
    emergencyFundMonths: 2,
    primaryGoal: 'Buying a first home in 2 years',
    lostRewardsValue: 3150,
    habitCardName: 'Amex MRCC',
    monthlySpendBasket: [
      { category: 'Online Shopping', monthlyAmountINR: 34000 },
      { category: 'Dining', monthlyAmountINR: 18000 },
      { category: 'Groceries', monthlyAmountINR: 14000 },
      { category: 'Flights', monthlyAmountINR: 12000 },
      { category: 'Fuel', monthlyAmountINR: 8000 },
      { category: 'Utilities', monthlyAmountINR: 8000 },
      { category: 'Rent', monthlyAmountINR: 45000 },
    ],
    members: [
      { id: 'g1', householdId: 'gupta', name: 'Aditi Gupta', age: 29, relation: 'Self', monthlyIncome: 180000, isDependent: 0 },
      { id: 'g2', householdId: 'gupta', name: 'Rahul Gupta', age: 30, relation: 'Spouse', monthlyIncome: 140000, isDependent: 0 },
    ],
    cards: [
      { id: 'g_c1', householdId: 'gupta', owner: 'Aditi Gupta', name: 'Amazon Pay ICICI', network: 'Visa', last4: '3341', outstanding: 25000, limit_amt: 300000, rewardPoints: 4500, cardColorTheme: 'from-amber-600 to-amber-800 border-amber-500', milestoneThreshold: 0, milestoneProgress: 0 },
      { id: 'g_c2', householdId: 'gupta', owner: 'Rahul Gupta', name: 'Amex MRCC', network: 'Amex', last4: '1004', outstanding: 18000, limit_amt: 250000, rewardPoints: 21000, cardColorTheme: 'from-gray-300 to-gray-400 border-gray-200 text-gray-900', milestoneThreshold: 400000, milestoneProgress: 210000 },
    ],
    portfolioBreakdown: {
      assets: [
        { type: 'asset', category: 'Bank & FDs', amount: 1200000, owner: 'Household' },
        { type: 'asset', category: 'Mutual Funds', amount: 3500000, owner: 'Aditi + Rahul' },
        { type: 'asset', category: 'Direct Equities', amount: 800000, owner: 'Rahul' },
        { type: 'asset', category: 'EPF', amount: 8700000, owner: 'Household' },
      ],
      liabilities: [
        { type: 'liability', category: 'Personal Loan', amount: 550000, owner: 'Aditi' },
        { type: 'liability', category: 'Education Loan', amount: 4800000, owner: 'Rahul' },
        { type: 'liability', category: 'Credit Card Outstanding', amount: 450000, owner: 'Household' },
      ],
    },
    obligations: {
      monthlyFixed: [
        { id: 'go1', householdId: 'gupta', name: 'Rent', amount: 45000, autoDebitDate: 1 },
        { id: 'go2', householdId: 'gupta', name: 'Personal Loan EMI', amount: 22000, autoDebitDate: 5 },
        { id: 'go3', householdId: 'gupta', name: 'Utility Bills', amount: 8000, autoDebitDate: 10 },
        { id: 'go4', householdId: 'gupta', name: 'Mutual Fund SIPs', amount: 40000, autoDebitDate: 7 },
      ],
      upcomingAdHoc: [
        { id: 'ga1', householdId: 'gupta', name: 'Vacation Booking', amount: 85000, dueDate: '2023-11-20' },
      ],
    },
  },
};
