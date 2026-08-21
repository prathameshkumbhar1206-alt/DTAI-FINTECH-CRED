import { NextResponse } from 'next/server';
import { generateJson } from '@/lib/gemini';
import { getFullHousehold } from '@/lib/db-helper';
import { toUserMessage } from '@/lib/api-error';


const SYSTEM_PROMPT = `You are the CRED Legacy Vault Assistant. You read a pasted financial or
legal document and extract its key structured fields, then check whether
anything about it creates a legacy-planning gap — a missing or outdated
nominee, an approaching expiry, or an asset not reflected in a will.

You will be given the raw text of one document — this could be an
insurance policy, a mutual fund statement, a property document, or a
similar financial/legal record. The text may be messy or informally
copy-pasted.

Your job:
1. Identify what type of document this is.
2. Extract the key fields relevant to that document type — for example,
   for an insurance policy: policyholder, sum assured, nominee, premium,
   expiry/renewal date; for a fund statement: folio/account holder,
   value, nominee if mentioned; for a property document: owner(s),
   address, registration date.
3. Do not invent a field that is not present in the text — if a field
   (e.g. nominee) is genuinely absent, say so explicitly rather than
   guessing.
4. Determine if there is a legacy-readiness concern: no nominee listed,
   a nominee who appears outdated or deceased based on context, an
   expiry/renewal date within the next 6 months, or an asset that the
   text suggests is not yet reflected in a will.
5. If there is a concern, state it as one clear, specific sentence. If
   there is no concern, say so plainly rather than inventing one.

Return ONLY valid JSON, no markdown, no code fences:

{
  "documentType": "string, e.g. 'Life Insurance Policy'",
  "extractedFields": [
    { "label": "string", "value": "string" }
  ],
  "legacyFlag": "string describing the concern, or null if none",
  "flagSeverity": "high" | "medium" | "none"
}`;

export async function POST(req: Request) {
  try {
    const { documentText , familyId} = await req.json();
    const householdData = getFullHousehold(familyId);
    if (!householdData) throw new Error("Household not found in DB");

    const userMessage = `
Raw Document Text:
"""
${documentText}
"""
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
