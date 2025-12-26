# AI Development Prompts

Complete prompts for working with Claude Code / Copilot on the Personal Finance Tracker.

---

## Table of Contents

1. [Initial Onboarding](#1-initial-onboarding-prompt)
2. [Verify Existing Code](#2-verify-existing-implementation)
3. [Story Prompts (All 21)](#3-story-prompts)
4. [Utility Prompts](#4-utility-prompts)

---

## 1. Initial Onboarding Prompt

**Use this ONCE at the start of each session:**

```
Read the project documentation and examine existing code before we start.

**Step 1: Read Documentation**
1. Read `.github/CLAUDE.md` for coding guidelines and patterns
2. Read `docs/index.md` for documentation overview
3. Read `docs/spec.md` for requirements and user stories
4. Read `docs/architecture.md` for technical decisions
5. Read `docs/data-model.md` for database schema
6. Read `PROGRESS.md` for current implementation status

**Step 2: Examine Existing Code**
These docs were created from a brainstorming session, but I've already implemented some code. Check what currently exists:

1. Check `src/lib/auth.ts` — NextAuth configuration
2. Check `src/middleware.ts` — Route protection
3. Check `src/lib/supabase.ts` — Supabase client
4. Check `src/components/ui/` — shadcn/ui components installed
5. Check `src/components/` — Any custom components I've built
6. Check `src/app/` — Existing pages and API routes
7. Check `package.json` — Installed dependencies

**Step 3: Confirm Understanding**
After reading docs and examining code, confirm you understand:
- The tech stack (Next.js 15, NextAuth.js, Supabase, AI SDK, shadcn/ui)
- The two database schemas (next_auth vs public)
- The signed amount convention (negative = expense)
- The RLS security model
- What code already exists vs. what needs to be built

**Step 4: Report Findings**
Tell me:
1. What's already implemented
2. What's partially done
3. What's missing
4. Any discrepancies between docs and existing code

Don't write any new code yet. Just report your findings.
```

---

## 2. Verify Existing Implementation

**Use this to audit what you've already built:**

```
Audit my existing implementation against the documentation.

**Check these areas:**

1. **Authentication (Story 1)**
   - src/lib/auth.ts — NextAuth config with Google provider
   - src/middleware.ts — Protects /dashboard/* routes
   - src/app/api/auth/[...nextauth]/route.ts — Auth API route
   - src/app/login/page.tsx — Login page
   - src/components/google-signin-button.tsx — Sign-in button
   - src/components/logout-button.tsx — Sign-out button
   - src/types/next-auth.d.ts — Session type with user.id

2. **Database Setup**
   - Check Supabase for next_auth schema tables (users, accounts, sessions)
   - Check if any public schema tables exist yet

3. **UI Components**
   - List all shadcn/ui components in src/components/ui/
   - List any custom components already created

4. **Project Structure**
   - Compare actual structure to docs/architecture.md
   - Note any differences

**For each item, report:**
- ✅ Exists and matches docs
- ⚠️ Exists but differs from docs (explain how)
- ❌ Missing

**Then update PROGRESS.md** to reflect the actual state.
```

---

## 3. Story Prompts

### Epic 1: Onboarding & Setup

---

#### Story 1: Google OAuth Sign-In

```
Verify Story 1: Google OAuth Sign-In

**This should already be implemented. Verify it works correctly.**

**From docs/spec.md Story 1:**
- User clicks "Sign in with Google"
- Redirected to Google OAuth
- On success, redirected to /dashboard
- Session persisted in Supabase (next_auth schema)
- session.user.id available for database queries

**Check these files:**
- src/lib/auth.ts
- src/middleware.ts
- src/app/api/auth/[...nextauth]/route.ts
- src/app/login/page.tsx
- src/components/google-signin-button.tsx
- src/types/next-auth.d.ts

**Acceptance Criteria:**
- [ ] Google sign-in button renders on /login
- [ ] Clicking initiates Google OAuth flow
- [ ] Successful auth redirects to /dashboard
- [ ] Session includes user.id, email, name, image
- [ ] Unauthenticated users redirected from /dashboard to /login
- [ ] Sign-out clears session and redirects to /login

**Verify each criterion. Mark ✅ or ❌.**
If all pass, mark Story 1 complete in PROGRESS.md.
If issues found, list what needs fixing.
```

---

#### Story 2: Create Financial Accounts

```
Implement Story 2: Create Financial Accounts

**Read First:**
- docs/spec.md (Story 2)
- docs/data-model.md (accounts table)
- .github/CLAUDE.md (code patterns)

**Requirements:**
- User can create accounts with name and type
- Types: Checking, Savings, Credit, Cash, Investment, Other
- Accounts start from zero balance (no opening balance field)
- Name is required, type is required
- User can have multiple accounts

**Database (public.accounts):**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL |
| name | TEXT | NOT NULL |
| type | TEXT | NOT NULL |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**RLS Policies (all 4: SELECT, INSERT, UPDATE, DELETE)**
- User can only access own accounts (user_id = auth.uid())

**Files to Create:**
1. `supabase/migrations/001_accounts.sql` — Table + RLS
2. `src/lib/validators/account.ts` — Zod schema
3. `src/app/api/accounts/route.ts` — GET (list), POST (create)
4. `src/app/api/accounts/[id]/route.ts` — GET, PUT, DELETE
5. `src/app/dashboard/accounts/page.tsx` — Accounts list page
6. `src/components/forms/account-form.tsx` — Create/edit form

**UI Components to Use:**
- Dialog (for create/edit modal)
- Form, FormField, FormItem, FormLabel, FormMessage
- Input (for name)
- Select (for type)
- Button
- Card (for account display)

**Acceptance Criteria:**
- [ ] User can create "Main Checking" as Checking account
- [ ] Account appears in list after creation
- [ ] Validation error if name is empty
- [ ] Cannot see other users' accounts (RLS)
- [ ] Can edit account name/type
- [ ] Can delete account

**Plan first. Show me:**
1. The SQL migration
2. The Zod schema
3. The API route structure
4. The component structure

Wait for my approval before implementing.
```

---

#### Story 3: Default Categories

```
Implement Story 3: Default Categories

**Read First:**
- docs/spec.md (Story 3)
- docs/data-model.md (categories table)

**Requirements:**
- Seed default categories on first login/dashboard visit
- User can add custom categories
- User can edit/delete categories (except system defaults?)
- Categories have name and optional icon/color

**Default Categories to Seed:**
- Housing
- Transportation
- Food & Dining
- Utilities
- Healthcare
- Entertainment
- Shopping
- Personal Care
- Education
- Savings
- Income
- Other

**Database (public.categories):**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL |
| name | TEXT | NOT NULL |
| icon | TEXT | Optional (emoji or icon name) |
| color | TEXT | Optional (hex color) |
| is_default | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**RLS Policies:** All 4 (SELECT, INSERT, UPDATE, DELETE) filtered by user_id

**Files to Create:**
1. `supabase/migrations/002_categories.sql` — Table + RLS
2. `src/lib/validators/category.ts` — Zod schema
3. `src/lib/seed-categories.ts` — Function to seed defaults
4. `src/app/api/categories/route.ts` — GET, POST
5. `src/app/api/categories/[id]/route.ts` — GET, PUT, DELETE
6. `src/app/dashboard/categories/page.tsx` — Category management (optional for MVP)
7. `src/components/forms/category-form.tsx` — Create/edit form

**Seeding Logic:**
- On dashboard load, check if user has any categories
- If not, insert the default set with is_default = true
- Could be a server action or API call

**Acceptance Criteria:**
- [ ] First-time user sees default categories
- [ ] User can add "Pet Expenses" category
- [ ] Categories appear in transaction form dropdown
- [ ] User can edit category name
- [ ] User can delete custom category
- [ ] Cannot see other users' categories (RLS)

**Plan first, then implement after approval.**
```

---

### Epic 2: Transaction Management

---

#### Story 4: Manual Transaction Entry

```
Implement Story 4: Manual Transaction Entry

**Read First:**
- docs/spec.md (Story 4)
- docs/data-model.md (transactions table)
- docs/decision-log.md (ADR-004: Amount convention)

**Requirements:**
- Quick-add form with: date, amount, category, account, description
- Amount stored as SIGNED: negative = expense, positive = income
- Date defaults to today
- Category and account are dropdowns (from user's data)
- Description is optional
- Form validation with clear error messages

**CRITICAL: Amount Convention**
- User enters positive number
- Form has expense/income toggle
- If expense: store as -amount
- If income: store as +amount
- Display: always show positive with label

**Database (public.transactions):**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL |
| account_id | UUID | FK → accounts(id), NOT NULL |
| category_id | UUID | FK → categories(id) |
| date | DATE | NOT NULL |
| amount | NUMERIC(12,2) | NOT NULL |
| description | TEXT | |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Indexes:**
- (user_id)
- (user_id, date)
- (user_id, category_id, date)

**RLS Policies:** All 4 filtered by user_id

**Files to Create:**
1. `supabase/migrations/003_transactions.sql` — Table + RLS + indexes
2. `src/lib/validators/transaction.ts` — Zod schema
3. `src/app/api/transactions/route.ts` — GET, POST
4. `src/app/api/transactions/[id]/route.ts` — GET, PUT, DELETE
5. `src/app/dashboard/transactions/page.tsx` — Main transactions page
6. `src/components/forms/transaction-form.tsx` — Quick-add form

**UI Components:**
- Form with React Hook Form + Zod
- DatePicker (from shadcn)
- Input (amount, description)
- Select (category, account)
- Toggle or RadioGroup (expense/income)
- Button

**Acceptance Criteria:**
- [ ] Can add "$50 groceries" expense to Checking account
- [ ] Date defaults to today
- [ ] Amount stored as -50.00 for expense
- [ ] Validation error for empty amount
- [ ] Transaction appears in list after adding
- [ ] Cannot see other users' transactions (RLS)

**Plan first, then implement after approval.**
```

---

#### Story 5: CSV Import

```
Implement Story 5: CSV Import

**Read First:**
- docs/spec.md (Story 5)
- docs/decision-log.md (ADR-012: All-or-nothing import)

**Requirements:**
- Upload CSV file with transactions
- Preview before confirming import
- Map CSV columns to: date, amount, description
- Auto-suggest category (or let user pick)
- All-or-nothing: if any row fails, rollback entire import
- Support common bank CSV formats

**Expected CSV Format:**
```csv
Date,Description,Amount
2024-01-15,Grocery Store,-45.99
2024-01-16,Paycheck,2500.00
```

**Files to Create:**
1. `src/lib/validators/csv-import.ts` — Zod schema for CSV rows
2. `src/lib/parse-csv.ts` — CSV parsing utility
3. `src/app/api/import/route.ts` — POST (process CSV)
4. `src/app/dashboard/import/page.tsx` — Import page
5. `src/components/import/csv-uploader.tsx` — File upload
6. `src/components/import/csv-preview.tsx` — Preview table
7. `src/components/import/column-mapper.tsx` — Column mapping UI

**Import Flow:**
1. User uploads CSV file
2. Parse and display preview (first 10 rows)
3. User maps columns (date, amount, description)
4. User selects target account
5. User reviews and confirms
6. API processes in single transaction
7. Success: show count imported
8. Failure: show error, nothing imported

**Acceptance Criteria:**
- [ ] Can upload bank_export.csv
- [ ] Preview shows first 10 rows
- [ ] Can map "Transaction Date" → date field
- [ ] Import 50 transactions successfully
- [ ] If row 25 fails, all 50 are rolled back
- [ ] Error message shows which row failed
- [ ] Cannot import to other users' accounts (RLS)

**Plan first, then implement after approval.**
```

---

#### Story 6: Transaction History

```
Implement Story 6: Transaction History

**Read First:**
- docs/spec.md (Story 6)

**Requirements:**
- List all transactions with date, amount, category, description
- Filter by: date range, category, account
- Sort by date (newest first default)
- Pagination or infinite scroll for large lists
- Click to edit/delete transaction

**UI Layout:**
- Filter bar at top (date range picker, category select, account select)
- Table or card list of transactions
- Each row: date, description, category badge, amount (red/green)
- Edit/delete actions per row

**Files to Create/Modify:**
1. Modify `src/app/api/transactions/route.ts` — Add query params for filtering
2. `src/app/dashboard/transactions/page.tsx` — Full transactions page
3. `src/components/transactions/transaction-list.tsx` — List component
4. `src/components/transactions/transaction-filters.tsx` — Filter bar
5. `src/components/transactions/transaction-row.tsx` — Single row/card

**Query Parameters:**
- `?from=2024-01-01&to=2024-01-31` — Date range
- `?category=uuid` — Filter by category
- `?account=uuid` — Filter by account
- `?limit=50&offset=0` — Pagination

**UI Components:**
- Table (for list view)
- DatePickerWithRange (for date filter)
- Select (for category/account filter)
- Badge (for category display)
- DropdownMenu (for row actions)
- AlertDialog (for delete confirmation)

**Acceptance Criteria:**
- [ ] See list of all transactions
- [ ] Filter to show only January transactions
- [ ] Filter to show only "Food" category
- [ ] Click transaction to edit
- [ ] Delete transaction with confirmation
- [ ] Sorted by date, newest first
- [ ] Pagination works for 100+ transactions

**Plan first, then implement after approval.**
```

---

### Epic 3: Budgeting & Goals

---

#### Story 7: Monthly Budgets

```
Implement Story 7: Monthly Budgets

**Read First:**
- docs/spec.md (Story 7)
- docs/data-model.md (budgets table)
- docs/decision-log.md (ADR-007: Monthly only)

**Requirements:**
- Set budget amount per category for monthly period
- See budget vs. spent (progress bar)
- Visual indicator when over budget (red)
- One budget per category per period

**Budget Calculation:**
- spent = SUM(transactions.amount) WHERE amount < 0 AND category_id = X AND date in current month
- remaining = budget.amount - ABS(spent)
- percentage = ABS(spent) / budget.amount * 100

**Database (public.budgets):**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL |
| category_id | UUID | FK → categories(id), NOT NULL |
| amount | NUMERIC(12,2) | NOT NULL |
| period | TEXT | DEFAULT 'MONTHLY' |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Unique Constraint:** (user_id, category_id, period)

**Files to Create:**
1. `supabase/migrations/004_budgets.sql` — Table + RLS
2. `src/lib/validators/budget.ts` — Zod schema
3. `src/app/api/budgets/route.ts` — GET, POST
4. `src/app/api/budgets/[id]/route.ts` — PUT, DELETE
5. `src/app/api/budgets/status/route.ts` — GET budget status with spent amounts
6. `src/app/dashboard/budgets/page.tsx` — Budget overview page
7. `src/components/budgets/budget-card.tsx` — Single budget with progress
8. `src/components/forms/budget-form.tsx` — Set/edit budget

**UI Components:**
- Progress (for budget bar)
- Card (for budget display)
- Form, Input, Select
- Color coding: green < 80%, yellow 80-100%, red > 100%

**Acceptance Criteria:**
- [ ] Set $500 budget for "Food" category
- [ ] Progress bar shows $200/$500 spent (40%)
- [ ] Over-budget category shows red bar
- [ ] Can edit budget amount
- [ ] Can delete budget
- [ ] Budget resets each month (same budget, fresh spending)

**Plan first, then implement after approval.**
```

---

#### Story 8: Budget Alerts

```
Implement Story 8: Budget Alerts

**Read First:**
- docs/spec.md (Story 8)

**Requirements:**
- Alert when spending reaches 80% of budget
- Alert when spending exceeds 100% of budget
- Display alerts on dashboard
- Optional: in-app notification toast

**Alert Logic:**
- Calculate percentage for each budget
- 80-99%: Warning alert (yellow)
- 100%+: Over budget alert (red)

**Implementation Options:**
1. **Real-time calculation** — Check on every transaction add
2. **Dashboard load** — Calculate when dashboard renders
3. **Background job** — Periodic check (overkill for MVP)

**Recommended: Dashboard load + transaction add**

**Files to Create/Modify:**
1. `src/lib/budget-alerts.ts` — Alert calculation logic
2. `src/components/dashboard/budget-alerts.tsx` — Alert display component
3. Modify `src/app/dashboard/page.tsx` — Include alerts
4. Modify transaction creation — Trigger toast if budget affected

**UI Components:**
- Alert (shadcn) with variant="warning" or variant="destructive"
- Toast (sonner) for real-time notifications

**Acceptance Criteria:**
- [ ] Dashboard shows "Food budget at 85%" warning
- [ ] Dashboard shows "Entertainment over budget!" error
- [ ] Adding expense that exceeds budget shows toast
- [ ] Alert links to budget detail

**Plan first, then implement after approval.**
```

---

#### Story 9: Savings Goals

```
Implement Story 9: Savings Goals

**Read First:**
- docs/spec.md (Story 9)
- docs/data-model.md (goals table)

**Requirements:**
- Create goal with: name, target amount, target date (optional)
- Track progress toward goal
- Visual progress bar
- Mark goal as complete when reached

**Database (public.goals):**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL |
| name | TEXT | NOT NULL |
| target_amount | NUMERIC(12,2) | NOT NULL |
| current_amount | NUMERIC(12,2) | DEFAULT 0 |
| target_date | DATE | Optional |
| is_completed | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Files to Create:**
1. `supabase/migrations/005_goals.sql` — Table + RLS
2. `src/lib/validators/goal.ts` — Zod schema
3. `src/app/api/goals/route.ts` — GET, POST
4. `src/app/api/goals/[id]/route.ts` — GET, PUT, DELETE
5. `src/app/dashboard/goals/page.tsx` — Goals list page
6. `src/components/goals/goal-card.tsx` — Single goal display
7. `src/components/forms/goal-form.tsx` — Create/edit goal

**UI Components:**
- Card, Progress
- Form, Input, DatePicker
- Badge (for "Completed" status)

**Acceptance Criteria:**
- [ ] Create "Emergency Fund" goal for $10,000
- [ ] Goal shows $0 / $10,000 (0%)
- [ ] Can set target date of Dec 2025
- [ ] Progress bar updates with contributions
- [ ] Goal marked complete at 100%

**Plan first, then implement after approval.**
```

---

#### Story 10: Goal Contributions

```
Implement Story 10: Goal Contributions

**Read First:**
- docs/spec.md (Story 10)
- docs/data-model.md (goal_contributions table)

**Requirements:**
- Add contribution to a goal
- Contribution updates goal's current_amount
- Track contribution history
- Optional: Link contribution to a transaction

**Database (public.goal_contributions):**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL |
| goal_id | UUID | FK → goals(id) ON DELETE CASCADE, NOT NULL |
| amount | NUMERIC(12,2) | NOT NULL |
| note | TEXT | Optional |
| contributed_at | TIMESTAMPTZ | DEFAULT now() |

**Files to Create:**
1. `supabase/migrations/006_goal_contributions.sql` — Table + RLS
2. `src/lib/validators/goal-contribution.ts` — Zod schema
3. `src/app/api/goals/[id]/contributions/route.ts` — GET, POST
4. `src/components/goals/contribution-form.tsx` — Add contribution
5. `src/components/goals/contribution-history.tsx` — List contributions

**Logic:**
- POST contribution → Insert into goal_contributions → UPDATE goals SET current_amount = current_amount + amount
- Check if current_amount >= target_amount → Set is_completed = true

**Acceptance Criteria:**
- [ ] Add $500 contribution to "Emergency Fund"
- [ ] Goal current_amount updates to $500
- [ ] Contribution appears in history
- [ ] Adding $10,000 to a $10,000 goal marks it complete
- [ ] Can add note "Tax refund" to contribution

**Plan first, then implement after approval.**
```

---

### Epic 4: Bills & Reminders

---

#### Story 11: Recurring Bills

```
Implement Story 11: Recurring Bills

**Read First:**
- docs/spec.md (Story 11)
- docs/data-model.md (bills table)

**Requirements:**
- Create bill with: name, amount, frequency, next due date
- Frequencies: weekly, biweekly, monthly, yearly
- Amount can be null for variable bills
- Link to category for when paid

**Database (public.bills):**
| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() |
| user_id | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL |
| name | TEXT | NOT NULL |
| amount | NUMERIC(12,2) | Nullable (variable bills) |
| frequency | TEXT | NOT NULL |
| next_due_date | DATE | NOT NULL |
| category_id | UUID | FK → categories(id) |
| auto_pay | BOOLEAN | DEFAULT false |
| last_paid_date | DATE | Nullable |
| created_at | TIMESTAMPTZ | DEFAULT now() |

**Files to Create:**
1. `supabase/migrations/007_bills.sql` — Table + RLS
2. `src/lib/validators/bill.ts` — Zod schema
3. `src/app/api/bills/route.ts` — GET, POST
4. `src/app/api/bills/[id]/route.ts` — GET, PUT, DELETE
5. `src/app/dashboard/bills/page.tsx` — Bills list page
6. `src/components/bills/bill-card.tsx` — Single bill display
7. `src/components/forms/bill-form.tsx` — Create/edit bill

**UI Components:**
- Card with due date badge
- Form, Input, Select (frequency), DatePicker
- Badge for "Due in X days"

**Acceptance Criteria:**
- [ ] Create "Rent" bill for $1500/month due on 1st
- [ ] Create "Netflix" bill for $15.99/month
- [ ] Bills list shows next due date
- [ ] Can edit bill amount
- [ ] Can delete bill

**Plan first, then implement after approval.**
```

---

#### Story 12: Bill Due Alerts

```
Implement Story 12: Bill Due Alerts

**Read First:**
- docs/spec.md (Story 12)

**Requirements:**
- Show bills due within next 7 days on dashboard
- Visual indicator for overdue bills
- Sort by due date (soonest first)

**Alert Logic:**
- Due within 7 days: Show in upcoming list
- Due today: Highlight yellow
- Overdue (past due date): Highlight red

**Files to Create/Modify:**
1. `src/lib/bill-alerts.ts` — Alert logic
2. `src/app/api/bills/upcoming/route.ts` — GET upcoming bills
3. `src/components/dashboard/upcoming-bills.tsx` — Dashboard widget
4. Modify `src/app/dashboard/page.tsx` — Include widget

**Query:**
```sql
SELECT * FROM bills 
WHERE user_id = auth.uid() 
  AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY next_due_date ASC;
```

**UI Components:**
- Card for widget
- List of bills with due date badges
- Color coding: normal, yellow (today), red (overdue)

**Acceptance Criteria:**
- [ ] Dashboard shows "Rent due in 3 days"
- [ ] Overdue bill shows red "Overdue" badge
- [ ] Bills sorted by due date
- [ ] Click bill to view details

**Plan first, then implement after approval.**
```

---

#### Story 13: Mark Bill Paid

```
Implement Story 13: Mark Bill Paid

**Read First:**
- docs/spec.md (Story 13)

**Requirements:**
- Mark bill as paid for current period
- Optionally create transaction for the payment
- Advance next_due_date based on frequency
- Track last_paid_date

**Mark Paid Flow:**
1. User clicks "Mark Paid" on bill
2. Optional: Enter actual amount (for variable bills)
3. Optional: Create transaction in selected account
4. Update bill: last_paid_date = today, next_due_date = calculated

**Next Due Date Calculation:**
```sql
next_due_date = CASE frequency
  WHEN 'weekly' THEN next_due_date + INTERVAL '1 week'
  WHEN 'biweekly' THEN next_due_date + INTERVAL '2 weeks'
  WHEN 'monthly' THEN next_due_date + INTERVAL '1 month'
  WHEN 'yearly' THEN next_due_date + INTERVAL '1 year'
END
```

**Files to Create/Modify:**
1. `src/app/api/bills/[id]/pay/route.ts` — POST mark paid
2. `src/components/bills/mark-paid-dialog.tsx` — Confirm dialog
3. Modify `src/components/bills/bill-card.tsx` — Add pay button

**UI Components:**
- Dialog for confirmation
- Optional: Checkbox to create transaction
- Input for actual amount (if variable)

**Acceptance Criteria:**
- [ ] Mark "Rent" as paid
- [ ] next_due_date advances to next month
- [ ] last_paid_date set to today
- [ ] Optionally creates -$1500 transaction
- [ ] Bill moves out of "due soon" list

**Plan first, then implement after approval.**
```

---

### Epic 5: AI Assistant

---

#### Story 14: Spending Analysis

```
Implement Story 14: AI Spending Analysis

**Read First:**
- docs/spec.md (Story 14)
- docs/architecture.md (AI Integration)

**Requirements:**
- User asks "How much did I spend on food this month?"
- AI queries transactions and responds with total
- Uses AI SDK tools/functions to access data
- Only accesses current user's data

**AI Tool: get_spending**
```typescript
get_spending: tool({
  description: 'Get total spending for a category in a time period',
  parameters: z.object({
    category: z.string().describe('Category name'),
    period: z.enum(['this_week', 'this_month', 'last_month', 'this_year']),
  }),
  execute: async ({ category, period }) => {
    // Query transactions filtered by user_id from session
    // Return { total: number, count: number }
  },
}),
```

**Files to Create:**
1. `supabase/migrations/008_chat_messages.sql` — Chat history table
2. `src/lib/ai/tools/get-spending.ts` — Spending tool
3. `src/lib/ai/system-prompt.ts` — AI system prompt
4. `src/app/api/chat/route.ts` — Chat endpoint using AI SDK
5. `src/app/dashboard/assistant/page.tsx` — Chat interface
6. `src/components/chat/chat-interface.tsx` — Chat UI
7. `src/components/chat/message.tsx` — Single message component

**System Prompt Guidelines:**
- Role: Personal finance assistant
- Tone: Friendly, supportive, professional
- Only use data from tool results
- Include disclaimers for financial advice
- Express uncertainty when appropriate

**UI Components:**
- Card for chat container
- Input for message
- ScrollArea for message history
- Skeleton for loading states

**Acceptance Criteria:**
- [ ] Ask "How much did I spend on food this month?"
- [ ] AI responds with actual total from database
- [ ] Response includes transaction count
- [ ] Only accesses current user's data
- [ ] Chat history persists

**Plan first, then implement after approval.**
```

---

#### Story 15: Budget Advice

```
Implement Story 15: AI Budget Advice

**Read First:**
- docs/spec.md (Story 15)

**Requirements:**
- User asks "How am I doing on my budget?"
- AI shows budget status and offers suggestions
- Compares spending to budget limits

**AI Tool: get_budget_status**
```typescript
get_budget_status: tool({
  description: 'Get budget status for all categories or a specific one',
  parameters: z.object({
    category: z.string().optional().describe('Category name, or omit for all'),
  }),
  execute: async ({ category }) => {
    // Return array of { category, budget, spent, remaining, percentage }
  },
}),
```

**Files to Create/Modify:**
1. `src/lib/ai/tools/get-budget-status.ts` — Budget status tool
2. Modify `src/app/api/chat/route.ts` — Add tool

**Acceptance Criteria:**
- [ ] Ask "How am I doing on my entertainment budget?"
- [ ] AI responds with budget vs. spent
- [ ] AI offers advice if over/near limit
- [ ] AI includes disclaimer for financial advice

**Plan first, then implement after approval.**
```

---

#### Story 16: Affordability Check

```
Implement Story 16: AI Affordability Check

**Read First:**
- docs/spec.md (Story 16)

**Requirements:**
- User asks "Can I afford a $200 dinner?"
- AI checks remaining budget and accounts
- Provides honest assessment with context

**AI Tools Needed:**
- get_budget_status (existing)
- get_account_balances (new)

**AI Tool: get_account_balances**
```typescript
get_account_balances: tool({
  description: 'Get current balance for all accounts or a specific one',
  parameters: z.object({
    account: z.string().optional().describe('Account name, or omit for all'),
  }),
  execute: async ({ account }) => {
    // Return array of { name, type, balance }
  },
}),
```

**Files to Create/Modify:**
1. `src/lib/ai/tools/get-account-balances.ts` — Account balance tool
2. Modify `src/app/api/chat/route.ts` — Add tool

**Acceptance Criteria:**
- [ ] Ask "Can I afford a $200 dinner?"
- [ ] AI checks Food budget remaining
- [ ] AI checks account balances
- [ ] AI gives honest answer with reasoning
- [ ] AI doesn't make the decision for user

**Plan first, then implement after approval.**
```

---

#### Story 17: Chat Commands (Quick Add)

```
Implement Story 17: Chat Commands

**Read First:**
- docs/spec.md (Story 17)

**Requirements:**
- User says "Add $50 groceries yesterday"
- AI creates transaction via tool
- Confirms what was added
- Handles ambiguity by asking clarifying questions

**AI Tool: add_transaction**
```typescript
add_transaction: tool({
  description: 'Add a new transaction',
  parameters: z.object({
    amount: z.number().describe('Positive number'),
    is_expense: z.boolean().describe('true for expense, false for income'),
    category: z.string().describe('Category name'),
    account: z.string().describe('Account name'),
    description: z.string().describe('Transaction description'),
    date: z.string().describe('Date in YYYY-MM-DD format'),
  }),
  execute: async (params) => {
    // Create transaction
    // Return { success: true, transaction: {...} }
  },
}),
```

**AI Tool: add_transfer**
```typescript
add_transfer: tool({
  description: 'Transfer money between accounts',
  parameters: z.object({
    from_account: z.string(),
    to_account: z.string(),
    amount: z.number(),
    description: z.string().optional(),
  }),
  execute: async (params) => {
    // Create two transactions (out and in)
    // Return { success: true, ... }
  },
}),
```

**Files to Create/Modify:**
1. `src/lib/ai/tools/add-transaction.ts`
2. `src/lib/ai/tools/add-transfer.ts`
3. Modify `src/app/api/chat/route.ts` — Add tools

**Acceptance Criteria:**
- [ ] "Add $50 groceries" creates expense
- [ ] "Got paid $2000" creates income
- [ ] "Transfer $500 from Checking to Savings" creates transfer
- [ ] AI asks for account if ambiguous
- [ ] AI confirms what was added

**Plan first, then implement after approval.**
```

---

#### Story 18: AI Guardrails

```
Implement Story 18: AI Guardrails

**Read First:**
- docs/spec.md (Story 18)
- docs/decision-log.md (ADR-010: Disclaimer Strategy)

**Requirements:**
- AI refuses inappropriate requests
- AI includes disclaimers for financial/tax advice
- AI stays focused on personal finance
- AI doesn't hallucinate data

**System Prompt Updates:**
```
You are a personal finance assistant for [User Name].

RULES:
1. Only reference data from tool results - never make up numbers
2. Include disclaimer when giving financial advice: "I'm not a certified financial advisor..."
3. Include disclaimer for tax questions: "I'm not a tax professional..."
4. Refuse illegal requests: "I can't help with that."
5. Stay focused on personal finance - redirect off-topic questions
6. Express uncertainty when appropriate
7. Don't make decisions for the user - present information and options

REFUSALS:
- "How do I hide money from taxes?" → Refuse, suggest legal tax planning
- Investment advice → Disclaimer + general info only
- Off-topic questions → Politely redirect to finance focus
```

**Files to Create/Modify:**
1. Modify `src/lib/ai/system-prompt.ts` — Add guardrails
2. Add refusal patterns and disclaimers

**Acceptance Criteria:**
- [ ] "How do I hide money from taxes?" → Refuses politely
- [ ] "Should I buy Bitcoin?" → Disclaimer, no specific advice
- [ ] Tax questions include "not a tax advisor" disclaimer
- [ ] Off-topic questions redirected
- [ ] AI never makes up transaction data

**Plan first, then implement after approval.**
```

---

### Epic 6: Reporting & Tax Summaries

---

#### Story 19: Monthly Summary Report

```
Implement Story 19: Monthly Summary Report

**Read First:**
- docs/spec.md (Story 19)

**Requirements:**
- Display total income, expenses, and net for the month
- Breakdown by category (chart or list)
- Budget status per category
- Goal progress for the month

**Calculations:**
- Income: SUM(amount) WHERE amount > 0 AND date in month
- Expenses: SUM(ABS(amount)) WHERE amount < 0 AND date in month
- Net: Income - Expenses
- By category: GROUP BY category_id

**Files to Create:**
1. `src/app/api/reports/monthly/route.ts` — Monthly summary data
2. `src/app/dashboard/reports/page.tsx` — Reports page
3. `src/components/reports/monthly-summary.tsx` — Summary display
4. `src/components/reports/spending-chart.tsx` — Category breakdown chart
5. `src/components/reports/budget-summary.tsx` — Budget status list

**UI Components:**
- Card for summary stats
- Recharts PieChart or BarChart for breakdown
- Progress bars for budgets
- Month picker to select period

**Acceptance Criteria:**
- [ ] Shows "Income: $5000, Expenses: $4800, Net: $200"
- [ ] Pie chart shows spending by category
- [ ] Over-budget categories highlighted red
- [ ] Goal contributions for month displayed
- [ ] Can switch between months

**Plan first, then implement after approval.**
```

---

#### Story 20: Annual Tax Summary (Canada/Ontario)

```
Implement Story 20: Annual Tax Summary

**Read First:**
- docs/spec.md (Story 20)
- docs/decision-log.md (ADR-010: Disclaimer Strategy)

**Requirements:**
- Show yearly totals for tax-relevant categories
- Prominent disclaimer: "Not tax advice"
- Canada/Ontario context

**Tax-Relevant Categories:**
- Charitable Donations
- Medical Expenses
- Childcare
- RRSP Contributions
- Business Expenses
- Education/Tuition

**CRITICAL: Disclaimers**
- Banner at top: "This summary is for informational purposes only. It is not tax advice. Consult a qualified tax professional."
- Note: "Capital gains and investment income are not calculated."

**Files to Create:**
1. `src/app/api/reports/tax/route.ts` — Tax summary data
2. `src/app/dashboard/reports/tax/page.tsx` — Tax summary page
3. `src/components/reports/tax-summary.tsx` — Summary display
4. `src/components/reports/tax-disclaimer.tsx` — Disclaimer banner

**Query:**
```sql
SELECT c.name, SUM(ABS(t.amount)) as total
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id = auth.uid()
  AND t.amount < 0
  AND t.date >= '2024-01-01'
  AND t.date <= '2024-12-31'
  AND c.name IN ('Charitable Donations', 'Medical Expenses', ...)
GROUP BY c.id;
```

**UI Components:**
- Alert with variant="warning" for disclaimer
- Table or Card list for category totals
- Year picker

**Acceptance Criteria:**
- [ ] Shows "Charitable Donations: $500"
- [ ] Disclaimer visible without scrolling
- [ ] States capital gains are not calculated
- [ ] Can select different years
- [ ] Only shows tax-relevant categories

**Plan first, then implement after approval.**
```

---

#### Story 21: Clear Disclaimers

```
Implement Story 21: Clear Disclaimers

**Read First:**
- docs/spec.md (Story 21)
- docs/decision-log.md (ADR-010: Disclaimer Strategy)

**Requirements:**
- Contextual disclaimers where relevant (not on every page)
- AI assistant includes disclaimer in introduction
- Tax summary has prominent disclaimer
- No specific investment advice given

**Disclaimer Locations:**
1. Tax Summary page — Banner at top
2. AI Assistant — First message includes intro with disclaimer
3. AI responses — Contextual when giving financial advice

**Files to Create/Modify:**
1. `src/components/disclaimers/financial-disclaimer.tsx`
2. `src/components/disclaimers/tax-disclaimer.tsx`
3. Modify AI system prompt — Include self-disclaimer
4. Modify tax summary page — Add banner

**Acceptance Criteria:**
- [ ] Tax page shows "Not tax advice" banner
- [ ] AI first message: "I'm a finance assistant, not a certified advisor..."
- [ ] AI tax responses include disclaimer
- [ ] Disclaimers are visible but not overwhelming

**Plan first, then implement after approval.**
```

---

## 4. Utility Prompts

### Database Migration Prompt

```
Create database migration for [TABLE_NAME]

Reference docs/data-model.md for the schema.

Generate a single .sql file with:
1. CREATE TABLE statement with all columns and constraints
2. ALTER TABLE to enable RLS
3. All 4 RLS policies (SELECT, INSERT, UPDATE, DELETE)
4. Indexes as specified
5. Any seed data if needed

Ensure:
- user_id references next_auth.users(id) ON DELETE CASCADE
- Use gen_random_uuid() for id defaults
- Use NUMERIC(12,2) for money fields
- Policies use auth.uid() for user filtering

Output the complete SQL I can run in Supabase SQL editor.
```

---

### Bug Fix Prompt

```
Fix: [DESCRIBE THE ISSUE]

**What's happening:**
[Describe the bug]

**Expected behavior:**
[What should happen]

**Steps to reproduce:**
[How to trigger the bug]

**Files likely involved:**
[List files if known]

Investigate the issue:
1. Identify the root cause
2. Explain why it's happening
3. Propose a fix
4. Wait for my approval before implementing
```

---

### Code Review Prompt

```
Review this implementation for [FEATURE]:

**Files to review:**
[List files]

Check for:
1. Matches requirements from docs/spec.md
2. Follows patterns from .github/CLAUDE.md
3. Proper TypeScript types
4. Zod validation on inputs
5. RLS policies correct
6. Error handling
7. Loading states
8. Accessibility
9. Mobile responsiveness

List any issues found with severity (critical/medium/low).
```

---

### Session Wrap-Up Prompt

```
Session wrap-up:

1. What did we complete today?
2. What's partially done?
3. What should I work on next?
4. Any issues or blockers?
5. What docs need updating?

Update PROGRESS.md to reflect current state.
Format summary so I can paste it into my notes.
```

---

### Context Recovery Prompt

```
Context recovery - I'm working on Personal Finance Tracker.

**Quick facts:**
- Next.js 15 + NextAuth.js + Supabase + AI SDK + shadcn/ui
- Two schemas: next_auth (auth) and public (app data)
- All tables need RLS with user_id = auth.uid()
- Amounts: negative = expense, positive = income
- CAD only, single user, no bank sync

**We were working on:**
[WHAT YOU WERE DOING]

**Current state:**
[WHERE YOU LEFT OFF]

Read .github/CLAUDE.md and PROGRESS.md, then continue where we left off.
```

---

## Implementation Order (Recommended)

Follow this order based on dependencies:

| Order | Story | Dependencies |
|-------|-------|--------------|
| 1 | Story 1: Google OAuth | None (DONE) |
| 2 | Story 2: Accounts | Auth |
| 3 | Story 3: Categories | Auth |
| 4 | Story 4: Transactions | Accounts, Categories |
| 5 | Story 6: Transaction History | Transactions |
| 6 | Story 7: Budgets | Categories, Transactions |
| 7 | Story 8: Budget Alerts | Budgets |
| 8 | Story 9: Goals | Auth |
| 9 | Story 10: Goal Contributions | Goals |
| 10 | Story 11: Bills | Categories |
| 11 | Story 12: Bill Alerts | Bills |
| 12 | Story 13: Mark Bill Paid | Bills, Transactions |
| 13 | Story 5: CSV Import | Transactions, Categories, Accounts |
| 14 | Story 19: Monthly Summary | Transactions, Budgets, Goals |
| 15 | Story 20: Tax Summary | Transactions, Categories |
| 16 | Story 14: AI Spending Analysis | Transactions |
| 17 | Story 15: AI Budget Advice | Budgets |
| 18 | Story 16: AI Affordability | Budgets, Accounts |
| 19 | Story 17: AI Quick Add | Transactions |
| 20 | Story 18: AI Guardrails | All AI stories |
| 21 | Story 21: Disclaimers | Tax Summary, AI |
