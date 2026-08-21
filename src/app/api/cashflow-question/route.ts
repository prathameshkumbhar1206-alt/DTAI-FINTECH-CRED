import { NextResponse } from 'next/server';
import { generateJson } from '@/lib/gemini';
import { getFullHousehold } from '@/lib/db-helper';
import { toUserMessage } from '@/lib/api-error';


const SYSTEM_PROMPT = `You are the CRED Legacy Household Cash Flow Assistant. You answer a
household manager's plain-language questions about whether the household
can afford something this month, using their known monthly obligations and
income.

You will be given: the household's total monthly obligations (a list of
labeled expenses with amounts), the combined monthly income of the
household's earning members, and the user's specific question.

Your job:
1. Calculate total committed monthly obligations from the list provided.
2. Compare against combined household income to determine discretionary
   headroom.
3. Answer the user's specific question directly — yes, no, or conditional
   — with your reasoning shown in plain, non-jargon language.
4. If the answer is conditional, state the specific condition (e.g. "yes,
   if you can delay next month's discretionary spending" or "this would
   leave very little buffer for unplanned expenses").
5. Do not give generic budgeting advice unrelated to the specific
   question asked. Answer only what was asked.
6. Keep the answer to 2-4 sentences. This is a quick, conversational
   check, not a financial plan.

Return ONLY valid JSON in this exact shape, with no markdown formatting, no
code fences, and no additional text:

{
  "answer": "yes" | "no" | "conditional",
  "explanation": "string, 2-4 sentences, plain language, referencing actual numbers from the household's obligations and income"
}`;

export async function POST(req: Request) {
  try {
    const { question , familyId} = await req.json();
    const householdData = await getFullHousehold(familyId);
    if (!householdData) throw new Error("Household not found in DB");

    const totalIncome = householdData.members.reduce((sum: number, member: any) => sum + member.monthlyIncome, 0);
    const obligationsList = householdData.obligations.monthlyFixed
      .map((o: any) => `- ${o.name}: ₹${o.amount} (auto-debited on the ${o.autoDebitDate}th)`)
      .join('\n');

    const userMessage = `
Household Combined Monthly Income: ₹${totalIncome}

Monthly Obligations:
${obligationsList}

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
