# Application Brief — CRED Legacy Household Card Router

**Team industry:** Fintech / BFSI · **Use case #1 from the AI Opportunity Matrix (Priority Initiatives quadrant)**

---

## Use case

**This application determines which credit card in a household earns the most on a given
purchase — across every family member — so the family captures reward value it currently
loses to fine print it never reads at the point of payment.**

Indian households increasingly hold four or five cards spread across members, but reward
outcomes are governed by terms nobody consults while standing at a checkout:

- The same flight earns **16.5% booked through a card's rewards portal and 3.3% booked
  direct with the airline.**
- A headline "5% on all online spend" carries a ₹5,000 monthly cap, so a large purchase
  silently earns half its advertised rate.
- Rent, fuel, utilities and EMI conversions are excluded outright on most cards.
- On international spend a 3.5% forex markup can exceed the reward earned, so the
  "best rewards card" actively loses money.

Existing tools optimise for one person holding one card. The household is the unit that
actually spends, and no consumer product routes across members.

## AI capability used

Google Gemini, in two distinct roles, with deterministic code deliberately placed between
them:

**1. Natural-language intake (drives the core output).** The user describes a purchase in
plain English; the model extracts amount, spend category, merchant and — critically —
**booking channel**. Channel is language-only information: "through SmartBuy" versus
"direct with the airline" cannot be expressed in a dropdown, yet it swings the
recommendation. On a ₹80,000 flight it changes both the winning card and ₹9,200 of value.

**2. Explanation layer.** After the decision is made, the model turns the engine's decision
trace into plain language, naming the specific clause that decided the outcome.

**What the AI deliberately does not do:** it never computes a rupee value and never picks
the winning card. All pricing runs through a deterministic engine over **36 encoded
terms-and-conditions rules** covering exclusions, accelerated categories, monthly caps,
forex markup and fee-waiver milestones. This keeps every number reproducible and auditable —
a language model cannot hallucinate the arithmetic that decides where money goes.

**Human-in-the-loop:** the model's reading of the purchase is displayed for confirmation
and correction *before* anything is priced. The application suggests; the person taps their
own card. No payment is ever initiated.

## Data inputs

| Input | Source in prototype | Production requirement |
|---|---|---|
| Household members, incomes, cards held | Synthetic households compiled into the app | Consented data via the Account Aggregator framework |
| Card terms and conditions | 36 rules hand-encoded from published schedules | Ingestion pipeline with version tracking as issuers revise terms |
| Purchase details | Typed by the user in natural language | Same, plus card-on-file tokenisation for in-flow routing |
| Monthly spend basket | Representative synthetic basket per household | Derived from actual consented transaction history |

## Key output

For any purchase, the application returns:

- The **winning card and its owner**, with net rupee value after exclusions, caps and forex
- **Runner-up cards** and the exact value forgone by choosing them
- A **decision trace** — every rule evaluated, whether it fired, and the fine print behind it
- **Confidence rating** and any assumptions the model made while reading the purchase
- **Fee-waiver milestone impact**, and a **cross-member settlement note** when the best card
  belongs to a different family member
- An honest **"no card earns rewards here"** verdict when every card excludes the category,
  rather than inventing a winner

## Business KPI it addresses

**Rewards leakage — reward value forgone through suboptimal card selection.**

For the demo household the application computes **₹33,036 per year** of leakage: routing
every purchase optimally yields ₹11,328/month against ₹8,575/month from defaulting to the
household's primary card. The figure is computed live from the household's spend basket,
not asserted, and the per-category breakdown and all five assumptions are exposed in the
interface for inspection.

At portfolio level this KPI maps to **engagement and share-of-wallet**: a household that
routes through the platform reveals its full card footprint and returns at each purchase
decision, which is the acquisition surface for card issuance and lending revenue.

**Cost to serve:** two short model calls per recommendation — under ₹1 at current
flash-tier pricing. The pricing engine is deterministic code and costs nothing per call, so
cost scales with usage frequency, not with the number of cards or rules supported.

## Known limitations

- Card terms are encoded from published schedules and **simplified**; issuers revise them
  without notice and this prototype has no ingestion pipeline to track revisions.
- Reward-point valuations are estimates; transfer-partner and promotional bonuses are
  excluded.
- Monthly caps assume no prior spend in the current billing cycle. The prototype has no
  visibility into spend already made.
- Households are **synthetic**. No live bank or card data is connected.
- The natural-language parser can misread ambiguous phrasing — which is why its
  interpretation is shown for human confirmation before any recommendation is produced.
- If the language model is unavailable, intake degrades to keyword parsing and the
  explanation degrades to rules-only prose. Both states are **labelled in the interface**;
  the recommendation itself is unaffected because it never depended on the model.
- This is a spending suggestion, **not financial advice**, and not a regulated
  recommendation.

---

*All figures are illustrative and derived from synthetic household data. AI-generated code
was used throughout, in line with the capstone's vibe-coding brief.*
