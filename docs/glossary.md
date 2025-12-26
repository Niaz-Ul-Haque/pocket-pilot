# Glossary

## Purpose

This document defines **terminology** used throughout the Personal Finance Tracker project. Use this to ensure consistent understanding across documentation and code.

## How to Use This Doc

- **When encountering unfamiliar terms**: Look them up here
- **When writing code or docs**: Use these exact terms for consistency
- **When onboarding**: Review to understand domain language
- **Cross-reference**: See [spec.md](./spec.md) for how these concepts are used

---

## Finance Terms

### Account

A container for tracking money. Types include:
- **Checking**: Bank checking/chequing account
- **Savings**: Bank savings account
- **Credit**: Credit card (balance typically negative = owed)
- **Cash**: Physical cash or petty cash
- **Investment**: Brokerage, TFSA, RRSP, etc.
- **Other**: Catch-all for non-standard accounts

### Transaction

A single financial event—money in (income) or money out (expense).
- **Expense**: Money leaving an account (stored as negative amount)
- **Income**: Money entering an account (stored as positive amount)
- **Transfer**: Moving money between accounts (two linked transactions)

### Category

A classification for transactions (e.g., "Groceries", "Entertainment"). Used for budgeting and reporting.

### Budget

A spending limit for a category over a period (monthly in MVP). Shows planned vs. actual spending.

### Goal

A savings target with optional deadline. User tracks contributions toward the goal amount.

### Bill

A recurring expense with a due date (e.g., rent, utilities). Generates reminders when due.

### Net Worth

Total assets minus total liabilities. Sum of all account balances.

---

## Budgeting Frameworks

### 50/30/20 Rule

A budgeting framework that allocates after-tax income:
- **50% Needs**: Essential expenses (housing, utilities, groceries, transportation)
- **30% Wants**: Discretionary spending (dining, entertainment, shopping)
- **20% Savings**: Financial goals (emergency fund, investments, debt payoff)

### Envelope Budgeting

A method where each category has a fixed "envelope" of money. When the envelope is empty, spending in that category stops until next period.

### Zero-Based Budgeting

A method where every dollar is assigned a purpose. Income minus all planned spending/saving equals zero. (YNAB uses this approach.)

### Tracking Only

No enforced budgets; user simply records transactions to see where money goes.

---

## Canada-Specific Terms

### CAD

Canadian Dollar. The only currency supported in MVP.

### RRSP (Registered Retirement Savings Plan)

Tax-advantaged retirement account. Contributions are tax-deductible (up to annual limit). Tracked for tax summary.

### TFSA (Tax-Free Savings Account)

Tax-advantaged savings/investment account. Withdrawals are tax-free. Contributions NOT deductible. Not relevant for tax summary deductions.

### CRA (Canada Revenue Agency)

Federal tax authority. Equivalent to IRS in the US.

### T4

Canadian tax slip showing employment income and deductions. Received from employer.

### GST/HST

Goods and Services Tax / Harmonized Sales Tax. Canadian federal/provincial sales tax.

---

## Technical Terms

### RLS (Row-Level Security)

A Postgres feature that restricts data access at the row level based on user identity. Ensures users can only access their own data.

### Supabase

Backend-as-a-Service platform providing managed Postgres database. Used for data storage (not auth in this project).

### NextAuth.js

Authentication library for Next.js. Handles OAuth flows, session management, and database session storage via adapters.

### Supabase Adapter

NextAuth.js adapter that stores users, accounts, and sessions in Supabase PostgreSQL under the `next_auth` schema.

### Next.js

React-based web framework with server-side rendering capabilities. Used for the application frontend and API routes.

### App Router

Next.js 13+ routing system using file-system based routes in the `app/` directory. Supports React Server Components.

### API Route

Server-side endpoint in Next.js that handles HTTP requests. Located in `app/api/`.

### OAuth

Open standard for authentication. Allows users to log in via third-party providers (Google) without sharing passwords.

### Session

User authentication state stored in database (via NextAuth.js). Contains `user.id` for database queries.

### AI SDK (Vercel AI SDK)

Model-agnostic library for AI integration. Supports OpenAI, Anthropic, Google, and other providers with consistent API.

### Tool (AI SDK)

A function the AI can call to retrieve data or perform actions. Defined with Zod schemas for type safety.

### Streaming

Real-time delivery of AI responses as they're generated, providing better UX than waiting for complete response.

### Zod

TypeScript schema validation library. Used for form validation on both client and server.

### React Hook Form

Form state management library. Integrates with Zod via `@hookform/resolvers`.

### shadcn/ui

Component library built on Radix primitives with Tailwind CSS styling. 40+ components pre-installed.

### Tailwind CSS

Utility-first CSS framework. Classes like `bg-blue-500` applied directly in HTML/JSX.

### Recharts

React charting library for data visualization. Used for spending charts and trends.

### lucide-react

Icon library. Standard for all icons in the project.

---

## Product Terms

### MVP (Minimum Viable Product)

The first launchable version with core features only. Defined in [spec.md](./spec.md).

### Alpha

Early testing phase with limited users (initially the developer). Used to validate core functionality.

### Privacy Mode

User setting that disables AI assistant to prevent any data being sent to OpenAI.

### Tax Summary

Annual report showing totals for tax-relevant categories. Comes with disclaimers.

### Quick Add

Simplified transaction entry via chat command (e.g., "Add $30 Uber").

### Vertical Slice

A complete feature flow from UI to database. Term used in milestone planning.

---

## UI Terms

### Dashboard

The main overview screen showing accounts, budgets, goals, and bills at a glance.

### Onboarding

The initial setup flow for new users. Includes framework selection and default account creation.

### Progress Bar

Visual indicator showing completion percentage (used for budgets and goals).

### Alert/Warning

Visual indicator for near-limit (orange) or over-limit (red) budget status.

### Confirmation Modal

Dialog requiring user confirmation before destructive actions (delete).

---

## Acronyms

| Acronym | Meaning |
|---------|---------|
| ADR | Architecture Decision Record |
| API | Application Programming Interface |
| CRUD | Create, Read, Update, Delete |
| CSV | Comma-Separated Values |
| DB | Database |
| E2E | End-to-End (testing) |
| FK | Foreign Key |
| PK | Primary Key |
| PRD | Product Requirements Document |
| SSR | Server-Side Rendering |
| UI | User Interface |
| UX | User Experience |
| UUID | Universally Unique Identifier |

---

## Traceability

| Term Category | Source MD Location |
|---------------|-------------------|
| Finance Terms | "Value Promises", "User Stories" |
| Budgeting Frameworks | "Framework Selection (Budgeting)" in Scope |
| Canada-Specific | "Tax Summaries (Canada/Ontario)" |
| Technical Terms | "Recommended Tech Stack & Architecture" |
| Product Terms | "Scope and MVP Definition" |
