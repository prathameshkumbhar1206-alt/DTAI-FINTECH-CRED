# CRED Legacy — Household Card Router

A household financial operating system for Indian families. The live use case is the
**Card Router**: given a purchase described in plain English, it determines which credit
card *in the household* — across every family member — earns the most, and shows exactly
which terms-and-conditions clause drove that answer.

Built as the working prototype for a Digital Transformation & AI capstone. All data is
synthetic.

## The problem

A family holding four or five cards leaves real money on the table, because reward value
is buried in fine print no one reads at the point of payment:

- The same flight earns **16.5% through a card's rewards portal and 3.3% booked direct**.
- A headline "5% on everything online" is capped at ₹5,000/month, so a large purchase
  silently earns half the advertised rate.
- Rent, fuel, utilities and EMI conversions are excluded outright on most cards.
- On international spend, a 3.5% forex markup can exceed the reward earned — the
  "best rewards card" actively loses money.

For the demo household, routing every purchase optimally instead of defaulting to one
primary card is worth **₹33,036 a year**.

## How it works

```
Plain English  →  [ AI intake ]  →  Human confirms  →  [ Rules engine ]  →  [ AI explains ]
"₹80k flight       extracts amount,   corrects any       prices all cards      writes the
 through            category,          misreading         deterministically     reasoning
 SmartBuy"          merchant, channel                     — no model involved
```

The split is deliberate:

- **The model reads and explains.** Extracting "through SmartBuy" from a sentence is
  language work no rules engine can do, and it changes the answer.
- **Code decides.** Every rupee figure comes from a deterministic engine over 36 encoded
  rules, so results are reproducible and auditable — a language model never does the
  arithmetic that picks the winning card.
- **A human sits between them.** The parsed purchase is shown for confirmation before
  anything is priced. The app suggests; the person taps their own card.

Every recommendation exposes a **decision trace** listing each rule evaluated, whether it
fired, and the fine print behind it.

### Degradation

Failure is handled in two tiers, because a live demo does not get a second attempt.

**Tier 1 — automatic failover.** `GEMINI_API_KEY` and `GEMINI_MODEL` both accept
comma-separated lists. Every call walks that chain and uses the first candidate that
answers, so a rate-limited model or a spent key never reaches the user. Free-tier quota is
enforced per project *and* per model, so listing several models multiplies available
headroom. A per-attempt timeout means a hung model fails fast rather than stalling.

**Tier 2 — graceful degradation.** If every candidate fails, the app still works: intake
falls back to a keyword parser and the explanation falls back to rules-only prose, both
labelled in the interface so a fallback is never mistaken for the model's output. The
recommendation itself is unaffected, because it never depended on the model.

## Run locally

```bash
npm install
cp .env.example .env.local   # then add your Gemini API key
npm run dev
```

Open http://localhost:3000 and pick a household.

## Deploy to Vercel

1. Push this repository to GitHub.
2. In Vercel, **Add New Project** and import the repository.
3. Under **Environment Variables**, add `GEMINI_API_KEY` with your key.
4. **Deploy.**

No database setup is required — households are compiled into the bundle, so the app runs
on serverless with no persistent filesystem.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Google Gemini

## Known limitations

- Card terms are encoded from published schedules and simplified; issuers revise them
  without notice and this prototype has no ingestion pipeline to track those revisions.
- Reward-point valuations are estimates, and transfer-partner bonuses are ignored.
- Monthly caps assume no prior spend in the current billing cycle.
- Households are synthetic. Production would require consented transaction data through
  the Account Aggregator framework.
- This is a spending suggestion, not financial advice. No payment is ever initiated.
