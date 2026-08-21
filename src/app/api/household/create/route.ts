import { NextResponse } from 'next/server';
import { generateJson } from '@/lib/gemini';
import { toUserMessage } from '@/lib/api-error';
import { registerHousehold } from '@/lib/db-helper';
import type { Household } from '@/lib/households-data';
import crypto from 'crypto';


const SYSTEM_PROMPT = `You are a financial parsing engine. The user will provide a natural language paragraph describing their household, income, debts, assets, and credit cards.

Extract this into a strictly typed JSON object representing a Household Profile.
If a detail is missing, make a plausible assumption (e.g. if they say "we own a house" without a value, assume 10000000).

Return ONLY valid JSON matching this schema:
{
  "household": {
    "familyName": "string (e.g. 'The Singh Household')",
    "netWorth": number (assets - liabilities),
    "assets": number (total value of all assets),
    "liabilities": number (total value of all loans/debts),
    "yoyGrowth": number (e.g. 15.5),
    "emergencyFundMonths": number (e.g. 3),
    "primaryGoal": "string"
  },
  "members": [
    { "name": "string", "age": number, "relation": "Self" | "Spouse" | "Child" | "Parent", "monthlyIncome": number, "isDependent": 0 | 1 }
  ],
  "cards": [
    { "owner": "string", "name": "string (e.g. 'HDFC Infinia')", "network": "Visa" | "Mastercard" | "Amex", "last4": "string (4 digits)", "outstanding": number, "limit_amt": number }
  ],
  "portfolio": [
    { "type": "asset" | "liability", "category": "string (e.g. 'Real Estate', 'Home Loan', 'Bank & FDs')", "amount": number, "owner": "Household" | "string (member name)" }
  ]
}

No markdown formatting, no code fences. Output valid JSON only.`;

export async function POST(req: Request) {
  try {
    const { text } = await req.json();

    const { text: rawOutput } = await generateJson({
      systemInstruction: SYSTEM_PROMPT,
      prompt: text,
      temperature: 0.2,
    });
    const data = JSON.parse(rawOutput);

    const familyId = crypto.randomBytes(4).toString('hex');

    const household: Household = {
      id: familyId,
      familyName: data.household.familyName,
      netWorth: data.household.netWorth,
      assets: data.household.assets,
      liabilities: data.household.liabilities,
      yoyGrowth: data.household.yoyGrowth,
      emergencyFundMonths: data.household.emergencyFundMonths,
      primaryGoal: data.household.primaryGoal,
      lostRewardsValue: 0,
      habitCardName: data.cards?.[0]?.name || '',
      monthlySpendBasket: [],
      members: (data.members || []).map((m: any, i: number) => ({
        id: `${familyId}_m${i}`,
        householdId: familyId,
        name: m.name,
        age: m.age,
        relation: m.relation,
        monthlyIncome: m.monthlyIncome || 0,
        isDependent: m.isDependent ?? 0,
      })),
      cards: (data.cards || []).map((c: any, i: number) => ({
        id: `${familyId}_c${i}`,
        householdId: familyId,
        owner: c.owner,
        name: c.name,
        network: c.network || 'Visa',
        last4: c.last4 || '1234',
        outstanding: c.outstanding || 0,
        limit_amt: c.limit_amt || 500000,
        rewardPoints: 0,
        cardColorTheme: 'from-zinc-800 to-zinc-900 border-zinc-700',
        milestoneThreshold: 0,
        milestoneProgress: 0,
      })),
      portfolioBreakdown: {
        assets: (data.portfolio || []).filter((p: any) => p.type === 'asset'),
        liabilities: (data.portfolio || []).filter((p: any) => p.type === 'liability'),
      },
      obligations: { monthlyFixed: [], upcomingAdHoc: [] },
    };

    registerHousehold(household);

    return NextResponse.json({ success: true, familyId, household });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: toUserMessage(error, 'Could not build a household from that description. Try adding names, incomes and cards.') },
      { status: 500 }
    );
  }
}
