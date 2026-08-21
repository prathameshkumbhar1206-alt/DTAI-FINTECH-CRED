import { NextResponse } from 'next/server';
import { generateJson } from '@/lib/gemini';
import { getFullHousehold } from '@/lib/db-helper';
import { toUserMessage } from '@/lib/api-error';


const SYSTEM_PROMPT = `You are the CRED Legacy Portfolio Assistant. You answer a household
manager's questions about their asset allocation and financial
concentration, using their actual portfolio breakdown.

You will be given: a full breakdown of the household's assets by category
and amount, their liabilities by category and amount, and the user's
specific question.

Your job:
1. Calculate relevant proportions from the data given (e.g. what share of
   total assets is in a given category) before answering — do not
   estimate when you can calculate exactly from the numbers provided.
2. Answer the user's specific question directly, referencing actual
   figures and percentages from their portfolio.
3. If the question implies a judgment about whether an allocation is
   risky or unbalanced, give a reasoned view — but note this is a
   general observation, not licensed investment advice, and do not
   recommend specific instruments, funds, or products.
4. Keep the answer to 3-5 sentences. This is a quick portfolio check, not
   a financial plan.

Return ONLY valid JSON, no markdown, no code fences:

{
  "answer": "string, 3-5 sentences, referencing actual figures",
  "relevantFigure": "string, one key percentage or number used in the answer"
}`;

export async function POST(req: Request) {
  try {
    const { question , familyId} = await req.json();
    const householdData = getFullHousehold(familyId);
    if (!householdData) throw new Error("Household not found in DB");

    const assetsText = householdData.portfolioBreakdown.assets.map((a: any) => `- ${a.category} (${a.owner}): ₹${a.amount}`).join('\n');
    const liabilitiesText = householdData.portfolioBreakdown.liabilities.map((l: any) => `- ${l.category} (${l.owner}): ₹${l.amount}`).join('\n');

    const userMessage = `
Household Assets:
${assetsText}

Household Liabilities:
${liabilitiesText}

User's Question:
"${question}"
    `;

    const { text: rawOutput } = await generateJson({
      systemInstruction: SYSTEM_PROMPT,
      prompt: userMessage,
      temperature: 0,
    });
    const parsedResult = JSON.parse(rawOutput);

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: toUserMessage(error) }, { status: 500 });
  }
}
