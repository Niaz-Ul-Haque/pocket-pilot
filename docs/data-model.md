# Data Model

## Purpose

This document defines the **complete database schema** for the Personal Finance Tracker. All tables, fields, relationships, indexes, and RLS policies are specified here.

## How to Use This Doc

- **Before creating tables**: Verify schema matches this document
- **Adding new fields**: Update this document FIRST, then implement
- **Writing queries**: Reference field names and types here
- **Cross-reference**: See [architecture.md](./architecture.md) for security model, [spec.md](./spec.md) for requirements

---

## Schema Overview

The application uses **two schemas**:

1. **`next_auth` schema** — Managed by NextAuth.js for authentication
2. **`public` schema** — Application data (transactions, budgets, etc.)

```
next_auth schema (managed by NextAuth.js):
├── users          # User profiles from Google OAuth
├── accounts       # OAuth provider connections
├── sessions       # Active sessions
└── verification_tokens

public schema (application data):
├── accounts       # Financial accounts (checking, savings, etc.)
├── categories     # Transaction categories
├── transactions   # Financial transactions
├── budgets        # Monthly budget limits
├── goals          # Savings goals
├── goal_contributions
├── bills          # Recurring bills
├── chat_messages  # AI conversation history
├── tags           # Optional: freeform tags
└── transaction_tags
```

**All `public` tables reference `next_auth.users(id)` via `user_id` foreign key.**

---

## Tables

### next_auth.users (Managed by NextAuth.js)

User profile from Google OAuth. **Do not modify directly** — managed by NextAuth.js.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (used as user_id in public tables) |
| `email` | TEXT | Email from Google |
| `name` | TEXT | Display name from Google |
| `image` | TEXT | Profile image URL |
| `emailVerified` | TIMESTAMPTZ | Email verification timestamp |

---

### public.accounts

### public.accounts

Financial accounts (bank, credit, cash, investment). **Starts from zero balance.**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Account ID |
| `user_id` | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL | Owner |
| `name` | TEXT | NOT NULL | Display name (e.g., "Main Checking") |
| `type` | TEXT | NOT NULL | One of: Checking, Savings, Credit, Cash, Investment, Other |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`

**RLS Policies:**
```sql
CREATE POLICY "accounts_select_own" ON accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "accounts_insert_own" ON accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "accounts_update_own" ON accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "accounts_delete_own" ON accounts FOR DELETE USING (user_id = auth.uid());
```

**Notes:**
- Balance is calculated from SUM(transactions) rather than stored
- Type values are not enforced at DB level; validated in application

---

### categories

Transaction categories for budgeting.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Category ID |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner |
| `name` | TEXT | NOT NULL | Display name (e.g., "Groceries") |
| `type` | TEXT | NOT NULL | One of: expense, income, transfer |
| `is_tax_related` | BOOLEAN | DEFAULT false | Flag for tax summary inclusion |
| `tax_tag` | TEXT | | Tax category (Charity, Medical, RRSP, Business, etc.) |
| `is_archived` | BOOLEAN | DEFAULT false | Hidden from active use |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Unique index on `(user_id, name)` — no duplicate category names per user

**RLS Policies:**
```sql
CREATE POLICY "categories_select_own" ON categories FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "categories_insert_own" ON categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories_update_own" ON categories FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "categories_delete_own" ON categories FOR DELETE USING (user_id = auth.uid());
```

**Default Categories by Framework:**

*50/30/20 Framework:*
- Needs (50%): Housing, Utilities, Groceries, Transportation, Insurance, Healthcare
- Wants (30%): Dining Out, Entertainment, Shopping, Subscriptions, Personal Care
- Savings (20%): Emergency Fund, Investments, Debt Payoff

*Basic Budget:*
- Housing, Utilities, Groceries, Transportation, Dining, Entertainment, Shopping, Healthcare, Personal, Other

*Tracking Only:*
- Same as Basic Budget but no budgets attached

---

### transactions

Financial transaction ledger.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Transaction ID |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner |
| `account_id` | UUID | FK → accounts(id), NOT NULL | Associated account |
| `category_id` | UUID | FK → categories(id) | Category (nullable = uncategorized) |
| `date` | DATE | NOT NULL | Transaction date |
| `amount` | NUMERIC(12,2) | NOT NULL | Amount: positive = inflow, negative = outflow |
| `description` | TEXT | | Merchant/note |
| `is_transfer` | BOOLEAN | DEFAULT false | Part of a transfer pair |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `(user_id, date)` — for chronological queries
- Index on `(user_id, account_id, date)` — for account statements
- Index on `(user_id, category_id, date)` — for budget calculations

**RLS Policies:**
```sql
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE USING (user_id = auth.uid());
```

**Amount Convention:**
- Money IN to account (income, deposits) = **positive**
- Money OUT of account (expenses, withdrawals) = **negative**
- Account balance = SUM(amount) for that account

---

### budgets

Monthly budget limits per category.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Budget ID |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner |
| `category_id` | UUID | FK → categories(id), NOT NULL | Category to budget |
| `amount` | NUMERIC(12,2) | NOT NULL | Monthly limit |
| `period` | TEXT | DEFAULT 'MONTHLY' | Budget period (MVP: MONTHLY only) |
| `rollover` | BOOLEAN | DEFAULT false | Future: carry unused budget |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Unique index on `(user_id, category_id)` — one budget per category

**RLS Policies:**
```sql
CREATE POLICY "budgets_select_own" ON budgets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "budgets_insert_own" ON budgets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "budgets_update_own" ON budgets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "budgets_delete_own" ON budgets FOR DELETE USING (user_id = auth.uid());
```

**Budget Calculation Query:**
```sql
SELECT 
  b.category_id,
  c.name as category_name,
  b.amount as budget,
  COALESCE(SUM(ABS(t.amount)), 0) as spent,
  b.amount - COALESCE(SUM(ABS(t.amount)), 0) as remaining
FROM budgets b
JOIN categories c ON c.id = b.category_id
LEFT JOIN transactions t ON t.category_id = b.category_id 
  AND t.date >= date_trunc('month', CURRENT_DATE)
  AND t.date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  AND t.amount < 0  -- expenses only
WHERE b.user_id = auth.uid()
GROUP BY b.id, c.id;
```

---

### goals

Savings goals with target amounts and deadlines.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Goal ID |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner |
| `name` | TEXT | NOT NULL | Goal name (e.g., "Vacation Fund") |
| `target_amount` | NUMERIC(12,2) | NOT NULL | Target to save |
| `current_amount` | NUMERIC(12,2) | DEFAULT 0 | Amount saved so far |
| `target_date` | DATE | | Optional deadline |
| `is_completed` | BOOLEAN | DEFAULT false | Goal achieved |
| `completed_at` | DATE | | When goal was completed |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Partial index on `(user_id) WHERE is_completed = false` — active goals

**RLS Policies:**
```sql
CREATE POLICY "goals_select_own" ON goals FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "goals_insert_own" ON goals FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "goals_update_own" ON goals FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "goals_delete_own" ON goals FOR DELETE USING (user_id = auth.uid());
```

---

### goal_contributions

Audit log of contributions to goals.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Contribution ID |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner |
| `goal_id` | UUID | FK → goals(id), NOT NULL | Goal contributed to |
| `amount` | NUMERIC(12,2) | NOT NULL | Contribution amount |
| `date` | DATE | NOT NULL, DEFAULT CURRENT_DATE | Contribution date |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `goal_id`

**RLS Policies:**
```sql
CREATE POLICY "goal_contributions_select_own" ON goal_contributions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "goal_contributions_insert_own" ON goal_contributions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "goal_contributions_delete_own" ON goal_contributions FOR DELETE USING (user_id = auth.uid());
```

**Note:** `current_amount` in goals is updated on each contribution insert (trigger or application logic).

---

### bills

Recurring bills and subscriptions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Bill ID |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner |
| `name` | TEXT | NOT NULL | Bill name (e.g., "Rent", "Netflix") |
| `amount` | NUMERIC(12,2) | | Expected amount (null = variable) |
| `frequency` | TEXT | NOT NULL | One of: weekly, biweekly, monthly, yearly |
| `next_due_date` | DATE | NOT NULL | Next due date |
| `category_id` | UUID | FK → categories(id) | Default category for transaction |
| `auto_pay` | BOOLEAN | DEFAULT false | Future: auto-log transactions |
| `last_paid_date` | DATE | | When last marked paid |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `(user_id, next_due_date)` — for upcoming bills query

**RLS Policies:**
```sql
CREATE POLICY "bills_select_own" ON bills FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bills_insert_own" ON bills FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "bills_update_own" ON bills FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "bills_delete_own" ON bills FOR DELETE USING (user_id = auth.uid());
```

**Next Due Date Calculation:**
```sql
-- After marking paid, update next_due_date based on frequency
UPDATE bills
SET 
  next_due_date = CASE frequency
    WHEN 'weekly' THEN next_due_date + INTERVAL '1 week'
    WHEN 'biweekly' THEN next_due_date + INTERVAL '2 weeks'
    WHEN 'monthly' THEN next_due_date + INTERVAL '1 month'
    WHEN 'yearly' THEN next_due_date + INTERVAL '1 year'
  END,
  last_paid_date = CURRENT_DATE
WHERE id = $1;
```

---

### tags (Optional)

Freeform tags for transactions (beyond single category).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Tag ID |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner |
| `name` | TEXT | NOT NULL | Tag name (e.g., "Vacation", "Reimbursable") |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Unique index on `(user_id, name)`

**RLS Policies:**
```sql
CREATE POLICY "tags_select_own" ON tags FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tags_insert_own" ON tags FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tags_update_own" ON tags FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "tags_delete_own" ON tags FOR DELETE USING (user_id = auth.uid());
```

---

### transaction_tags (Optional)

Many-to-many join for transaction tags.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `transaction_id` | UUID | FK → transactions(id), NOT NULL | Transaction |
| `tag_id` | UUID | FK → tags(id), NOT NULL | Tag |
| `user_id` | UUID | FK → users(id), NOT NULL | Owner (for RLS) |

**Indexes:**
- Primary key on `(transaction_id, tag_id)`
- Index on `user_id`

**RLS Policies:**
```sql
CREATE POLICY "transaction_tags_select_own" ON transaction_tags FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "transaction_tags_insert_own" ON transaction_tags FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "transaction_tags_delete_own" ON transaction_tags FOR DELETE USING (user_id = auth.uid());
```

**Note:** Tags feature is optional for MVP; may be deferred to v1.1.

---

### chat_messages

AI conversation history stored per user.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() | Message ID |
| `user_id` | UUID | FK → next_auth.users(id) ON DELETE CASCADE, NOT NULL | Owner |
| `conversation_id` | UUID | NOT NULL | Groups messages in a conversation |
| `role` | TEXT | NOT NULL | 'user', 'assistant', or 'system' |
| `content` | TEXT | NOT NULL | Message content |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | Creation time |

**Indexes:**
- Primary key on `id`
- Index on `user_id`
- Index on `(user_id, conversation_id)` — for loading conversations
- Index on `(conversation_id, created_at)` — for message ordering

**RLS Policies:**
```sql
CREATE POLICY "chat_messages_select_own" ON chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "chat_messages_insert_own" ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "chat_messages_delete_own" ON chat_messages FOR DELETE USING (user_id = auth.uid());
```

**Notes:**
- Conversations persist across sessions
- User can view full chat history
- No update policy — messages are immutable

---

## Common Queries

### Account Balance

```sql
SELECT 
  a.id,
  a.name,
  COALESCE(SUM(t.amount), 0) as balance
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
WHERE a.user_id = auth.uid()
GROUP BY a.id;
```

### Monthly Spending by Category

```sql
SELECT 
  c.name as category,
  SUM(ABS(t.amount)) as total
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id = auth.uid()
  AND t.amount < 0
  AND t.date >= date_trunc('month', CURRENT_DATE)
  AND t.date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY c.id
ORDER BY total DESC;
```

### Upcoming Bills (Next 7 Days)

```sql
SELECT *
FROM bills
WHERE user_id = auth.uid()
  AND next_due_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY next_due_date;
```

### Tax Summary (Annual)

```sql
SELECT 
  c.tax_tag,
  SUM(ABS(t.amount)) as total
FROM transactions t
JOIN categories c ON c.id = t.category_id
WHERE t.user_id = auth.uid()
  AND c.is_tax_related = true
  AND EXTRACT(YEAR FROM t.date) = 2025
GROUP BY c.tax_tag;
```

---

## Migration Strategy

1. Use Supabase CLI for migrations (`supabase migration new <name>`)
2. All migrations are SQL files in `supabase/migrations/`
3. Enable RLS immediately on table creation
4. Seed default categories per framework

**Initial Migration Order:**
1. users
2. accounts
3. categories
4. transactions
5. budgets
6. goals
7. goal_contributions
8. bills
9. tags (optional)
10. transaction_tags (optional)

---

## Open Questions

1. Should we store a computed `balance` field on accounts for performance?
2. How to handle soft delete for accounts with transactions?
3. Should budget history be tracked per month or just current?
4. How to link transfer transaction pairs (separate table or field)?

---

## Traceability

| Section | Source MD Location |
|---------|-------------------|
| Tables | "Data Model (Supabase/Postgres Design)" |
| RLS Policies | "Row-Level Security Strategy" |
| Transactions | Story 4: Add Expense Transaction |
| Budgets | Story 8: Set Up Budget |
| Goals | Story 10: Create Savings Goal |
| Bills | Story 12: Add Recurring Bill |
