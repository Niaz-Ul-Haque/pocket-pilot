# Product Specification

## Purpose

This is the **single source of truth** for all product requirements. Every feature, constraint, and acceptance criterion for the Personal Finance Tracker MVP is defined here.

## How to Use This Doc

- **Before implementing**: Check the relevant user story and acceptance criteria
- **During code review**: Verify implementation matches acceptance criteria
- **When unsure**: Consult the scope section to determine if something is in/out of MVP
- **Cross-reference**: See [architecture.md](./architecture.md) for technical implementation details

---

## Problem Statement

Users are frustrated with existing personal finance tools due to:

1. **Broken bank sync** — Apps like Mint and Monarch have frequent connection failures, forcing manual updates anyway
2. **Complexity and learning curves** — Tools like YNAB confuse users with zero-based budgeting concepts
3. **Privacy concerns** — Free apps monetize via ads and data selling, eroding trust
4. **Platform lock-in** — Apps like Copilot are Apple-only with subscription fees
5. **Lack of intelligent guidance** — Most apps show data but don't provide actionable advice

### Target User

The **overwhelmed spreadsheet user or ex-Mint user** who wants:
- Control over their finances without complexity
- Manual tracking that feels fast, not tedious
- Privacy-first approach (no third-party data sharing)
- Intelligent, personalized financial coaching

### Success Metrics

| Metric | Target |
|--------|--------|
| User-reported financial stress reduction | 80%+ report improvement after 2 months |
| Daily/weekly active usage | High retention indicating integral tool |
| Time spent managing finances | < 5 minutes per day |
| Budget adherence | ≤ 5% overspend variance |

---

## Value Promises

### Primary Promise

**"Financial Clarity & Control for the Everyday User"**

The user will feel in control and informed about their money at all times—no more end-of-month surprises. They can confidently answer "Can I afford this?" or "How am I doing?" at a glance.

### Supporting Promises

| Promise | Outcome | Key Features |
|---------|---------|--------------|
| **Your Personal Finance Coach (AI-Assisted)** | Personalized advice and timely nudges for better decisions | AI assistant with Coach/Analyst/Planner modes, spending pattern analysis, goal progress check-ins |
| **Effortless Budgeting – No Spreadsheets** | Maintain a budget with minimal effort | Budget frameworks (50/30/20, envelope), quick transaction entry, real-time feedback |
| **Privacy & Trust – Your Data Stays with You** | Peace of mind about sensitive financial data | Google OAuth only, RLS isolation, no third-party trackers, optional AI privacy mode |

---

## Scope

### MVP (Must Ship)

| Feature Area | Included |
|--------------|----------|
| **Accounts & Transactions** | Create accounts (Checking, Credit, Cash, Investment), manual transaction entry, CSV import |
| **Budgeting** | Monthly budgets per category, framework selection (Basic/50-30-20/Tracking only), alerts near/over limit |
| **Goals** | Create savings goals with target amount/date, track contributions, progress visualization |
| **Investments (Manual)** | Track investment account values manually, net worth calculation |
| **Bills & Alerts** | Input recurring bills, due date reminders, mark-paid workflow |
| **AI Assistant** | Chat interface, spending analysis, budget advice, "Can I afford X?", chat-based transaction entry |
| **Tax Summary** | Annual summary of tax-relevant categories (Charity, Medical, RRSP), disclaimers |
| **Auth & Security** | Google OAuth only, Supabase RLS, no password storage |
| **Platform** | Responsive web app (mobile-friendly), single user, CAD only |

### Non-Goals (Explicitly Out of MVP)

| Feature | Reason Deferred |
|---------|-----------------|
| Bank account sync (Plaid/Flinks) | Reliability issues, privacy concerns—embrace manual-first |
| Multi-user/household sharing | Adds complexity; single-user proves value first |
| Multi-currency support | CAD-only simplifies MVP |
| Receipt scanning/OCR | Nice-to-have, not core value |
| Push notifications/emails | In-app alerts sufficient for alpha |
| Data export UI | Can be added in v1.1 |
| Capital gains calculation | Too complex for MVP tax summary |
| Native mobile app | Responsive web first |

### V1.1 (Post-MVP)

- Data export/backup (CSV, JSON)
- Recurring transaction automation
- Enhanced AI tools (trends, forecasts)
- Investment detail enhancements
- UI themes/customization
- Limited household sharing

### V2+ (Future Vision)

- Open banking integration (opt-in)
- Multi-currency & internationalization
- Multi-user & shared budgets
- Receipts & OCR
- Advanced investments & capital gains
- Local AI model option

---

## Functional Requirements

### Epic 1: Onboarding & Setup

#### Story 1: First-Time User Onboarding

**As a** new user who just signed in with Google,
**I want to** quickly set up my finance tracker,
**So that** I can start logging finances right away.

**Functional Requirements:**
- After Google OAuth login, present onboarding flow if user has no data
- Create default profile using Google name/email
- Prompt user to select budgeting framework:
  - "Basic Budget" (custom category limits)
  - "50/30/20" (needs/wants/savings split)
  - "Just Track Spending" (no enforced budgets)
- Create default categories based on framework selection
- Create at least one default account (e.g., "Main Account")

**Acceptance Criteria:**
- [ ] Fresh login triggers onboarding flow
- [ ] Onboarding completes in under 2 minutes
- [ ] Dashboard shows default accounts and budgets after completion
- [ ] User is greeted by first name from Google
- [ ] Data is secured with correct user_id for RLS

**Edge Cases:**
- Google doesn't provide name → Use email or prompt for input
- User closes onboarding midway → Treat as "tracking only" mode
- Non-Canadian user → MVP assumes CAD; no blocking

---

#### Story 2: Account Creation

**As a** user setting up my accounts,
**I want to** add accounts (bank, credit card, cash, investment),
**So that** I can track transactions separately.

**Functional Requirements:**
- Form to create account: name, type (Checking/Savings/Credit/Cash/Investment/Other), starting balance (optional)
- Account tied to user_id for RLS
- Account appears in account list immediately after creation

**Acceptance Criteria:**
- [ ] Creating "Visa Card" as Credit Card type shows it in account list
- [ ] Starting balance displayed correctly (can be negative for credit cards)
- [ ] Cannot access another user's accounts via API manipulation

**Edge Cases:**
- Duplicate account names → Allow but display clearly (append type if needed)
- Negative starting balance → Allow for liability accounts

---

#### Story 3: Category Management

**As a** user,
**I want to** view and edit expense categories,
**So that** categorization fits my life.

**Functional Requirements:**
- Display list of categories (pre-loaded based on framework)
- Allow renaming categories
- Allow creating new categories (with type: expense/income)
- Support tax-related flag for categories

**Acceptance Criteria:**
- [ ] Renaming "Groceries" to "Food" updates all references
- [ ] Adding "Pet Care" makes it available for transactions
- [ ] Cannot delete categories with existing transactions (deactivate/hide instead)

---

### Epic 2: Accounts & Transactions

#### Story 4: Add Expense Transaction (Manual)

**As a** user,
**I want to** log an expense quickly,
**So that** my records stay up-to-date.

**Functional Requirements:**
- Input form: Date (default today), Amount, Category, Account, Description (optional)
- Transaction reflected in account balance and budget usage immediately
- Store amounts as numeric(12,2) in CAD

**Acceptance Criteria:**
- [ ] Transaction "2025-12-01, $45.20, Groceries, Main, Walmart" appears in ledger
- [ ] Groceries budget shows $45.20 spent
- [ ] Main account balance reduced by $45.20

**Edge Cases:**
- Future date → Disallow (except bills, handled separately)
- Missing required field → Validation error with highlight
- Negative amount for expense → Interpret as refund or prompt correction

---

#### Story 5: Add Transaction via Chat

**As a** user,
**I want to** add transactions by typing commands like "Add $30 Uber yesterday",
**So that** I can log expenses conversationally.

**Functional Requirements:**
- Parse natural language: amount, category/merchant, date
- Common merchant mapping (Uber → Transportation)
- Confirm addition or ask for clarification if uncertain

**Acceptance Criteria:**
- [ ] "Add 15.50 for lunch today" creates $15.50 transaction in Dining/Restaurants
- [ ] Assistant responds: "Added: $15.50 to Restaurants (Today)"
- [ ] If category unclear, assistant asks for clarification

**Edge Cases:**
- No amount given → Ask for clarification
- Unknown merchant → Add as Uncategorized or ask
- Slang ("ten bucks") → MVP may not parse; scope to numerical

---

#### Story 6: Import Transactions from CSV

**As a** user migrating from my bank,
**I want to** import a CSV of transactions,
**So that** I don't manually re-enter history.

**Functional Requirements:**
- Upload CSV file
- Column mapping interface (auto-detect or manual)
- Support common formats (RBC, generic single-column amount, separate debit/credit)
- Preview first 5 transactions before confirming
- Duplicate detection (same date+amount+description+account)

**Acceptance Criteria:**
- [ ] RBC CSV with "Transaction Date, Description1, Description2, Withdrawals, Deposits" maps correctly
- [ ] After import, transactions appear in selected account
- [ ] Second import of same file warns/skips duplicates

**Edge Cases:**
- Malformed CSV → Clear error message
- Large file (>1000 rows) → Limit for MVP
- Unknown date format → Allow user to specify

---

#### Story 7: View Transaction History

**As a** user,
**I want to** browse and search past transactions,
**So that** I can review spending and verify entries.

**Functional Requirements:**
- Transaction list with Date, Description, Amount, Category, Account
- Sort by date (newest first default)
- Text search (description, category)
- Filter by category or account
- Edit/delete transactions (with confirmation for delete)

**Acceptance Criteria:**
- [ ] Transactions display in correct date order
- [ ] Search "Uber" filters to matching entries
- [ ] Editing transaction updates budget calculations
- [ ] Deleting transaction frees budget amount

---

### Epic 3: Budgeting & Goals

#### Story 8: Set Up Budget for Category

**As a** user,
**I want to** set a monthly budget limit for a category,
**So that** I can track spending against a target.

**Functional Requirements:**
- Input budget amount per category (monthly)
- Display: Budget - Spent = Remaining
- Allow editing budget amount mid-month

**Acceptance Criteria:**
- [ ] $100 Entertainment budget with $30 spent shows "$30 / $100 used" or "$70 remaining"
- [ ] Exceeding budget shows "OVER by $X" with visual indicator
- [ ] Changing budget to $150 recalculates remaining correctly

---

#### Story 9: Budget Alerts (Near Limit)

**As a** user,
**I want to** be warned when near or over budget,
**So that** I can adjust spending.

**Functional Requirements:**
- At 90% utilization: orange/warning indicator
- At 100%+: red/over indicator
- Dashboard banner for over-budget categories

**Acceptance Criteria:**
- [ ] $400 grocery budget at $370 (92.5%) shows warning state
- [ ] At $420 (105%) shows overspent state
- [ ] New month clears warnings

---

#### Story 10: Create Savings Goal

**As a** user,
**I want to** set a financial goal with target and deadline,
**So that** I can track progress.

**Functional Requirements:**
- Goal: name, target amount, target date (optional), initial amount
- Display progress bar and percentage
- If target date set, show required monthly amount
- Mark goal completed when current >= target

**Acceptance Criteria:**
- [ ] "Vacation $1000 by June 2026" creates goal with 0% progress
- [ ] Adding $100 contribution shows 10%
- [ ] Monthly required calculation displayed

**Edge Cases:**
- Target date in past → Treat as overdue
- Contributions exceed target → Mark completed

---

#### Story 11: Goal Contribution via Assistant

**As a** user,
**I want to** tell the AI "put $50/week toward vacation goal",
**So that** the system records my plan.

**Functional Requirements:**
- Parse contribution command with amount and frequency
- Add immediate contribution
- Provide projection ("$200/month gets you there in 5 months")

**Acceptance Criteria:**
- [ ] Command adds $50 to goal immediately
- [ ] Assistant confirms and projects timeline

---

### Epic 4: Bills & Recurring Alerts

#### Story 12: Add Recurring Bill

**As a** user,
**I want to** input recurring bills with due dates,
**So that** the app reminds me.

**Functional Requirements:**
- Bill: name, amount (or variable), frequency (monthly/weekly/yearly), next due date
- Display upcoming bills list
- Support biweekly via interval calculation

**Acceptance Criteria:**
- [ ] "Hydro $60 every 2 months, next due Mar 15" displays correctly
- [ ] Bills page shows upcoming obligations

---

#### Story 13: Bill Due Alert

**As a** user,
**I want to** be alerted when a bill is due soon,
**So that** I don't miss payments.

**Functional Requirements:**
- Alert 3 days before and on due date
- Dashboard banner for due/overdue bills
- Rate limit: once per session for unpaid bill

**Acceptance Criteria:**
- [ ] Bill due in 2 days shows "due in 2 days" notice
- [ ] Bill due today shows "due today" notice

---

#### Story 14: Mark Bill Paid

**As a** user,
**I want to** record bill payment,
**So that** tracking is complete and next due updates.

**Functional Requirements:**
- "Mark Paid" button advances next_due_date by interval
- Prompts to add transaction (pre-filled amount, suggested category)
- Transaction optional but encouraged

**Acceptance Criteria:**
- [ ] Marking Rent ($1000, Jan 1) paid opens pre-filled transaction form
- [ ] After confirmation, transaction in ledger and Rent shows Feb 1 as next due

---

### Epic 5: AI Assistant & Insights

#### Story 15: Ask AI for Spending Analysis

**As a** user,
**I want to** ask "How much did I spend on eating out last month?",
**So that** I get data without manual calculation.

**Functional Requirements:**
- Parse spending queries (category, period)
- Function call: get_spending(category, period)
- Response includes actual number and context (% of total, comparison to usual)

**Acceptance Criteria:**
- [ ] Query returns actual sum from transactions
- [ ] Response references real data, no hallucination
- [ ] Example: "You spent $200 on eating out in November. That's 15% of your total."

---

#### Story 16: Get Budget Advice from AI

**As a** user,
**I want to** ask "How can I save more?",
**So that** I get personalized suggestions.

**Functional Requirements:**
- Analyze budgets and spending patterns
- Identify 1-3 concrete suggestions based on data
- Tone: supportive, not judgmental

**Acceptance Criteria:**
- [ ] Suggestions reference actual spending ("You spend $300/month on restaurants...")
- [ ] Includes disclaimer for significant advice

---

#### Story 17: "Can I Afford X?" Decision Helper

**As a** user,
**I want to** ask "Can I afford a $2000 laptop?",
**So that** I get analysis factoring in my situation.

**Functional Requirements:**
- Interpret item cost and timeline
- Check savings, surplus, goals
- Present scenarios and trade-offs
- Conclude with recommendation (with caveat)

**Acceptance Criteria:**
- [ ] Response considers current savings amount
- [ ] Mentions impact on goals if applicable
- [ ] Suggests timeline if saving is needed

---

#### Story 18: AI Data Integrity & Privacy

**As a** system,
**I must** ensure AI only accesses user's data and doesn't hallucinate.

**Functional Requirements:**
- RLS enforced on all function calls
- AI cannot reveal internal instructions
- Refuse illegal/unethical requests
- Tax advice includes disclaimer
- Consent required before first AI use

**Acceptance Criteria:**
- [ ] AI refuses "How do I hide money from taxes?"
- [ ] Tax questions include "I'm not a tax advisor" disclaimer
- [ ] Off-topic queries redirected to finance focus

---

### Epic 6: Reporting & Tax Summaries

#### Story 19: Monthly Summary Report

**As a** user,
**I want to** see monthly summary (income, spending, savings),
**So that** I understand my financial picture.

**Functional Requirements:**
- Display: total income, total expenses, net (surplus/deficit)
- Breakdown by category (pie chart or list)
- Budget status per category
- Goal progress for month

**Acceptance Criteria:**
- [ ] December shows "Income: $5000, Expenses: $4800, Net: $200"
- [ ] Over-budget categories highlighted red
- [ ] Goal contributions for month displayed

---

#### Story 20: Annual Tax Summary (Canada/Ontario)

**As a** Canadian user,
**I want to** see yearly tax-relevant totals,
**So that** tax prep is easier.

**Functional Requirements:**
- Sum categories: Charity, Medical, RRSP, Business Expenses
- Display with category labels and amounts
- Prominent disclaimer: "Not tax advice"

**Tax-Relevant Categories:**
- Charitable Donations
- Medical Expenses
- Childcare
- RRSP Contributions
- Business Expenses
- Education/Tuition

**Acceptance Criteria:**
- [ ] $500 donations shows "Charitable Donations: $500"
- [ ] Disclaimer visible without scrolling
- [ ] States capital gains are not calculated

---

#### Story 21: Clear Disclaimers

**As a** product,
**I must** display disclaimers for tax/financial advice,
**So that** expectations are set correctly.

**Functional Requirements:**
- Tax Summary: banner disclaimer
- AI: intro message on first use ("I'm an AI, not a certified advisor")
- Serious questions (bankruptcy, etc.): encourage professional consultation

**Acceptance Criteria:**
- [ ] Tax Summary has visible disclaimer
- [ ] AI first message includes disclaimer
- [ ] About/Help section includes general disclaimer

---

## Non-Functional Requirements

### Security & Privacy

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Google OAuth only via Supabase Auth; no password storage |
| Data isolation | Row-Level Security (RLS) on all tables; user_id = auth.uid() |
| No third-party data sharing | Zero data sold to advertisers or partners |
| AI consent | Explicit consent before first AI query; privacy mode toggle |
| Data sent to AI | Minimal necessary info; no raw transaction dumps |
| Deletion | Hard delete for most data; user owns their data |

### Performance

| Requirement | Target |
|-------------|--------|
| Page load | < 2 seconds |
| Transaction add | < 1 second (optimistic UI) |
| AI response | < 5 seconds |
| CSV import (1000 rows) | < 10 seconds |
| Budget calculation | Real-time updates |

### Reliability

| Requirement | Implementation |
|-------------|----------------|
| Data accuracy | NUMERIC(12,2) for amounts; no floating-point |
| Concurrency | Single-user MVP; optimistic UI for responsiveness |
| Error handling | Clear error messages; no silent failures |

### Maintainability

| Requirement | Implementation |
|-------------|----------------|
| Type safety | TypeScript throughout |
| Testing | Jest + React Testing Library + Playwright |
| Code structure | Feature-based or atomic component organization |

---

## Constraints & Invariants

### Business Constraints

1. **Single user only** — No multi-user features in MVP
2. **CAD currency only** — All amounts in Canadian dollars
3. **Manual-first** — No bank sync; embrace manual/CSV entry
4. **Canada/Ontario context** — Tax summary uses Canadian tax categories
5. **No investment advice** — AI provides budgeting help, not investment recommendations

### Technical Constraints

1. **Next.js 13+ with App Router** — Required framework
2. **Supabase** — Required for database and auth
3. **Google OAuth only** — No email/password
4. **OpenAI GPT-4** — Primary AI provider (swappable architecture)
5. **Vercel deployment** — 10-second serverless timeout

### Data Invariants

1. **user_id on all rows** — Required for RLS
2. **Amounts stored as negative for outflows** — Account balance = SUM(transactions)
3. **One budget per category** — No overlapping budgets
4. **Category required for transactions** — Can be "Uncategorized" default

---

## Definition of Done (MVP)

MVP is complete when a single user can:

- [ ] Log in with Google and complete onboarding in < 2 minutes
- [ ] Manually log all transactions (expenses, income) via form or chat
- [ ] Import transactions from CSV with mapping
- [ ] Set budgets and see real-time remaining/over status
- [ ] Define savings goals and track contributions
- [ ] Record recurring bills and be reminded of due dates
- [ ] Query AI assistant for insights and data-driven advice
- [ ] Add transactions via chat commands
- [ ] View monthly summary report
- [ ] View annual tax summary with disclaimers
- [ ] All above in secure, performant manner (< 2s most actions, < 5s AI)
- [ ] No critical bugs (wrong calculations, crashes, data leaks)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI hallucination | User makes bad decisions on false data | Function calling for data retrieval; system prompt guardrails; "I don't know" responses |
| OpenAI API unavailable | Assistant feature broken | Error messaging; queue retry; swappable provider architecture |
| User data breach | Loss of trust | RLS enforcement; minimal data to AI; no third-party sharing |
| Tax summary misuse | Legal liability | Prominent disclaimers; no calculations, only totals |
| CSV parsing failures | User frustration | Clear error messages; preview before import; common format support |
| User abandons manual entry | Low engagement | Chat commands; quick-add UX; AI reminders |

---

## Resolved Questions

| Question | Resolution |
|----------|------------|
| How should income be logged? | Manual entry or CSV import. Transactions have category/tags the user selects. |
| Should accounts have opening balances? | **Start from zero**. Only track new transactions going forward. |
| How are RRSP contributions detected? | User creates categories (e.g., "Savings" → "RRSP"). App is for budgeting, not tracking holdings. |
| What if AI provider is unavailable? | Using **AI SDK** (Vercel) for model-agnostic calls. Can switch providers freely. |
| How long do chat sessions persist? | **Chat history stored per user** in database for full conversation history. |
| Email notifications for bills? | **Deferred** — not in MVP. |
| Mobile breakpoints? | Standard responsive design. No specific breakpoints required. |
| Google account deactivation? | Handled by NextAuth.js cascade delete. |
| Currency display format? | **CAD** with "$" symbol. |
| CSV import on failure? | **All-or-nothing** — rollback if any row fails. |

## Open Questions

*None remaining — all questions resolved.*

---

## Traceability

| Section | Source MD Location |
|---------|-------------------|
| Problem Statement | "Competitive Scan", "Where We Can Win" |
| Value Promises | "Value Promises (Why This App?)", "MVP Value Proposition Selection" |
| Scope | "Scope and MVP Definition" |
| User Stories | "User Stories and Requirements (MVP)" - Epics 1-6 |
| Non-Functional Requirements | Story NFRs, "Row-Level Security Strategy" |
| Constraints | "Scope and MVP Definition", "Recommended Tech Stack" |
| Definition of Done | "Definition of Done for MVP" |
| Risks | "Safety and Refusals", "AI Privacy / Runtime (MVP) specifics" |
