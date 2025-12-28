
# Roadmap

## Purpose

This document defines the **build milestones, backlog, and versioning plan** for the Personal Finance Tracker. Use this to plan sprints and understand what's in/out of scope.

## How to Use This Doc

- **Planning work**: Check milestone requirements and order
- **Prioritizing**: Refer to backlog for future features
- **Scoping discussions**: Use to distinguish MVP vs. later versions
- **Cross-reference**: See [spec.md](./spec.md) for detailed requirements per feature

---

## MVP Timeline Overview

**Target Duration**: 8-10 weeks (expandable to 6 months for alpha testing)

```
Week 0-1   │ Project Setup & Core Framework
Week 2-3   │ Vertical Slice – Transactions & Dashboard
Week 4     │ Budgeting Module
Week 5     │ Goals Module
Week 6     │ Bills & Alerts
Week 7-8   │ AI Assistant Integration
Week 9     │ Polish, CSV Import, Tax Summary
Week 10    │ MVP Review & Launch Prep
```

---

## Milestone Details

### Milestone 1: Project Setup & Core Framework (Week 0-1)

**Goal**: Foundation in place; developer can log in and verify RLS.

**Tasks**:
- [ ] Initialize Next.js project with TypeScript
- [ ] Configure Tailwind CSS
- [ ] Create Supabase project (dev environment)
- [ ] Implement Google Sign-In via Supabase Auth
- [ ] Define initial database schema (users, accounts, categories, transactions)
- [ ] Run migrations with RLS policies enabled
- [ ] Create protected test API route to verify auth + RLS

**Definition of Done**:
- Developer logs in with Google
- User record created in database
- Protected API route returns user-specific data
- RLS blocks access to other users' data
- Basic project structure (pages, components, lib folders) in place

---

### Milestone 2: Vertical Slice – Transactions & Dashboard (Week 2-3)

**Goal**: End-to-end flow working; user can add and view transactions.

**Tasks**:
- [ ] Build minimal Dashboard page
  - [ ] Accounts list with balances (calculated from transactions)
  - [ ] Total spending this month (placeholder for budget)
- [ ] Implement Add Transaction form
  - [ ] Fields: amount, date, category, account, description
  - [ ] Client-side validation with Zod
  - [ ] Optimistic UI update
- [ ] Build Transaction History page
  - [ ] List with date, description, amount, category
  - [ ] Basic sorting (newest first)
- [ ] Seed default categories

**Definition of Done**:
- User logs in, sees default account
- User adds expense (e.g., $50 Grocery), sees it in transaction list
- Account balance updates correctly
- Validation errors display for invalid input

---

### Milestone 3: Budgeting Module (Week 4)

**Goal**: User can set budgets and see usage.

**Tasks**:
- [ ] Create Budgets page
  - [ ] Display categories with optional budget input
  - [ ] Show spent vs. budget per category
- [ ] Implement budgets table and API routes
- [ ] Budget progress visualization (progress bar or text)
- [ ] Warning/over states for near-limit and exceeded
- [ ] Framework selection in onboarding (or later in settings)

**Definition of Done**:
- User sets $400 Groceries budget
- Adding $100 grocery transaction shows "$100 / $400 used"
- Exceeding budget shows red "OVER" indicator
- Budget status visible on Dashboard

---

### Milestone 4: Goals Module (Week 5)

**Goal**: User can create and track savings goals.

**Tasks**:
- [ ] Create Goals page
  - [ ] Add goal form: name, target, target date
  - [ ] Goal list with progress bars
- [ ] Implement goals and goal_contributions tables
- [ ] Add Contribution action
  - [ ] Updates current_amount
  - [ ] Logs contribution record
- [ ] Show monthly required amount if target date set
- [ ] Mark goal completed when target reached

**Definition of Done**:
- User creates "Vacation $1000 by Dec 2026"
- Adding $100 contribution shows 10% progress
- Projection text shows required monthly amount
- Completed goals marked with indicator

---

### Milestone 5: Bills & Alerts (Week 6)

**Goal**: User can track recurring bills and be reminded.

**Tasks**:
- [ ] Create Bills page
  - [ ] Add bill form: name, amount, frequency, next due date
  - [ ] Bills list showing upcoming due dates
- [ ] Implement bills table and API routes
- [ ] Dashboard "Upcoming Bills" widget (due within 7 days)
- [ ] "Mark Paid" workflow
  - [ ] Opens pre-filled transaction form
  - [ ] Advances next_due_date by interval
- [ ] Due/overdue visual indicators

**Definition of Done**:
- User adds "Internet $60, monthly, due Jan 15"
- Dashboard shows "Internet due in X days" when within 7 days
- Marking paid creates transaction and updates next due to Feb 15

---

### Milestone 6: AI Assistant Integration (Week 7-8)

**Goal**: User can chat with AI for insights and commands.

**Tasks**:
- [ ] Build Chat UI (page or slide-over panel)
  - [ ] Message history display
  - [ ] Input box
- [ ] Create /api/assistant route
  - [ ] OpenAI integration with function calling
  - [ ] System prompt with guardrails
- [ ] Implement AI functions:
  - [ ] get_spending(category, period)
  - [ ] get_budget_status(category?)
  - [ ] get_goal_status(goal?)
  - [ ] add_transaction(...)
  - [ ] set_budget(...)
- [ ] Test key queries:
  - [ ] "How much did I spend on groceries?"
  - [ ] "Add $20 coffee today"
  - [ ] "How can I save more?"
  - [ ] "Can I afford a $500 phone?"
- [ ] Privacy consent modal on first use
- [ ] AI disclaimers for tax/advice questions
- [ ] Refusal handling for inappropriate requests

**Definition of Done**:
- User asks "What did I spend on groceries last month?" → Correct figure returned
- User says "Add $20 coffee today" → Transaction created, confirmation shown
- User asks "How can I save more?" → Personalized tip referencing actual data
- Tax question includes disclaimer
- Illegal advice request refused appropriately

---

### Milestone 7: Polish, CSV Import, Tax Summary (Week 9)

**Goal**: Feature-complete MVP with refined UX.

**Tasks**:
- [ ] CSV Import feature
  - [ ] File upload
  - [ ] Column mapping UI
  - [ ] Preview before import
  - [ ] Duplicate detection
  - [ ] RBC format support
- [ ] Tax Summary page
  - [ ] Annual view by tax-relevant categories
  - [ ] Charity, Medical, RRSP, Business totals
  - [ ] Prominent disclaimer
- [ ] UI polish
  - [ ] Loading spinners
  - [ ] Error states
  - [ ] Mobile responsiveness check
  - [ ] Consistent styling
- [ ] Validation audit (all forms)
- [ ] Security audit
  - [ ] Verify RLS on all tables
  - [ ] Test API route protections
  - [ ] Try unauthorized requests
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Basic automated tests (Jest, Playwright)

**Definition of Done**:
- CSV import works with sample RBC file
- Tax Summary shows correct totals with disclaimer
- App feels polished and bug-free
- All core features accessible and working

---

### Milestone 8: MVP Review & Launch Prep (Week 10)

**Goal**: Production-ready deployment.

**Tasks**:
- [ ] End-to-end testing with realistic data
- [ ] README with setup instructions
- [ ] Environment variables documented
- [ ] Vercel production deployment
- [ ] Supabase production project
- [ ] Monitoring setup (optional: Sentry)
- [ ] Final security review

**Definition of Done**:
- MVP deployed to production URL
- Google login works in production
- All core scenarios pass in production environment
- Ready for alpha usage with real data

---

## Definition of Done (MVP Complete)

MVP is complete when ALL of the following are true:

- [ ] Single user can log in with Google
- [ ] Onboarding completes in < 2 minutes
- [ ] Transactions can be added via form, chat, and CSV import
- [ ] Budgets can be set with real-time progress tracking
- [ ] Goals can be created and tracked with contributions
- [ ] Bills can be added with due date reminders
- [ ] AI assistant answers spending questions and takes commands
- [ ] Monthly summary report available
- [ ] Annual tax summary available with disclaimers
- [ ] Performance: < 2s for most actions, < 5s for AI
- [ ] Security: RLS on all tables, session verification
- [ ] No critical bugs or data leaks
- [ ] Deployed to production

---

## Backlog (Explicitly NOT in MVP)

The following features are **intentionally deferred**:

| Feature | Priority | Notes |
|---------|----------|-------|
| Multi-currency support | High | CAD only in MVP |
| Data export (CSV/JSON) | High | V1.1 |
| Recurring transaction automation | Medium | V1.1 |
| Email/push notifications | Medium | V1.1 |
| Investment price tracking | Medium | V1.1 |
| Multi-user/household sharing | Medium | V2 |
| Bank sync (Plaid/Flinks) | Medium | V2 |
| Receipt scanning/OCR | Low | V2 |
| Capital gains calculation | Low | V2+ |
| Native mobile app | Low | V2+ |
| Local AI model option | Low | V2+ |
| Dark mode / UI themes | Low | V1.1 |
| Custom budget rules (rollover, etc.) | Low | V1.1 |
| Advanced analytics/forecasting | Low | V2 |
| Audit log / change history | Low | V2 |
| Soft delete with undo | Low | V1.1 |

---

## Version Roadmap

### V1.0 (MVP)

As defined above.

### V1.1 (Quality of Life)

Estimated: 4-6 weeks post-MVP

- Data export/backup (CSV, JSON)
- Recurring transaction automation
- Enhanced AI (trends, forecasts)
- Email notifications for bills
- UI themes / dark mode
- Basic investment detail improvements
- Custom category icons/colors
- Limited household sharing (read-only)

### V2.0 (Major Expansion)

Estimated: 3-6 months post-MVP

- Open banking integration (opt-in)
- Multi-currency support
- Multi-user accounts with roles
- Receipts & OCR
- Advanced investment tracking
- Capital gains reports
- Mobile app (React Native)
- Local AI model option

---

## Open Questions

1. Should we do alpha testing during Week 10 or extend timeline?
2. What's the priority order within V1.1 features?
3. Should we build mobile-responsive first or parallel native app?

---

## Traceability

| Section | Source MD Location |
|---------|-------------------|
| Milestone Details | "Build Plan (Milestones & Backlog)" |
| Definition of Done | "Definition of Done for MVP" |
| Backlog | "Backlog (Not in MVP)" |
| Version Roadmap | "V1.1" and "V2+" sections in "Scope and MVP Definition" |
