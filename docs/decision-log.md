# Decision Log

## Purpose

This document records **Architecture Decision Records (ADRs)** for the Personal Finance Tracker. Each decision includes context, options considered, decision made, and rationale.

## How to Use This Doc

- **Before making a significant decision**: Check if a prior decision applies
- **When changing approach**: Add a new ADR that supersedes the old one
- **For context**: Understand why things are built a certain way
- **Cross-reference**: See [architecture.md](./architecture.md) for technical implementation

---

## ADR Format

```
### ADR-XXX: Title

**Status**: Proposed | Accepted | Superseded by ADR-XXX | Deprecated

**Context**: What is the issue or situation that motivates this decision?

**Options Considered**:
1. Option A — description
2. Option B — description
3. Option C — description

**Decision**: What is the decision made?

**Rationale**: Why was this decision made?

**Consequences**: What are the positive and negative outcomes?

**Source**: Reference to Source MD section
```

---

## Decisions

### ADR-001: Manual-First Data Entry

**Status**: Accepted

**Context**: Competitor apps like Mint and Monarch suffer from frequent bank sync failures, frustrating users who end up manually updating anyway. Users are searching for reliable alternatives.

**Options Considered**:
1. Bank sync via Plaid/Flinks — automatic transaction import
2. Manual entry only — user enters all transactions
3. Hybrid — manual entry with optional bank sync later

**Decision**: Manual-first approach for MVP. No bank sync integration.

**Rationale**:
- Eliminates reliability issues (broken connections are top user complaint)
- Addresses privacy concerns (no third-party access to bank credentials)
- Reduces MVP scope and development time
- Many savvy budgeters prefer manual entry for mindfulness
- Bank sync can be added as optional feature in V2

**Consequences**:
- (+) No sync-related bugs or user frustration
- (+) Simpler architecture
- (+) Stronger privacy positioning
- (-) Higher friction for initial data entry
- (-) Users must manually update or use CSV import

**Source**: "Competitive Scan" (Mint, Monarch complaints), "Where We Can Win" (Manual-First, Mindful Tracking)

---

### ADR-002: NextAuth.js with Google OAuth

**Status**: Accepted

**Context**: Need to implement authentication. Options include email/password, social logins, or passwordless.

**Options Considered**:
1. Supabase Auth — built-in with database
2. NextAuth.js with Google — flexible, database sessions
3. Multiple social providers — Google, Apple, Facebook
4. Passwordless (magic link) — email-based

**Decision**: NextAuth.js v4 with Google OAuth and Supabase Adapter for database sessions.

**Rationale**:
- No password storage (security)
- Leverages trusted Google OAuth
- Database sessions in Supabase via adapter
- Session includes `user.id` for database queries
- Middleware support for route protection
- Works with both server and client components

**Consequences**:
- (+) No password management complexity
- (+) Strong security via Google
- (+) Database sessions for reliability
- (+) `session.user.id` available everywhere
- (-) Excludes users without Google accounts
- (-) Two schemas (next_auth + public)

**Source**: "Value Promises" (Privacy & Trust), existing project setup

---

### ADR-003: Supabase for Database and Auth

**Status**: Accepted

**Context**: Need to choose backend infrastructure for database and authentication.

**Options Considered**:
1. Custom Postgres + NextAuth — separate database and auth
2. Supabase — integrated Postgres, auth, and RLS
3. Firebase — NoSQL with auth
4. PlanetScale + Auth0 — MySQL with separate auth

**Decision**: Supabase for both database (Postgres) and authentication.

**Rationale**:
- Built-in Row-Level Security integrates auth with data isolation
- Postgres is reliable for financial data (NUMERIC types, transactions)
- Google OAuth support out of the box
- Managed service reduces ops burden
- Good TypeScript support with generated types
- Real-time and storage available for future features

**Consequences**:
- (+) Single platform for auth + data
- (+) RLS enforces security at database level
- (+) Managed Postgres with backups
- (-) Vendor lock-in to Supabase
- (-) Less control than self-hosted Postgres

**Source**: "Recommended Tech Stack & Architecture" (Supabase section)

---

### ADR-004: Amount Storage Convention

**Status**: Accepted

**Context**: Need to decide how to store transaction amounts—as positive/negative, separate debit/credit fields, or with a type indicator.

**Options Considered**:
1. Always positive with type field (expense/income)
2. Signed amounts (negative = outflow, positive = inflow)
3. Separate debit and credit columns

**Decision**: Signed amounts — negative for outflows (expenses), positive for inflows (income).

**Rationale**:
- Account balance = SUM(amount) is simple and intuitive
- Aligns with standard accounting (money in/out relative to account)
- Single column simplifies queries
- No ambiguity about which field to use
- Works naturally with transfers (one negative, one positive)

**Consequences**:
- (+) Simple balance calculation
- (+) Clear semantics
- (+) Easy budget queries (SUM WHERE amount < 0)
- (-) UI must handle display formatting
- (-) "Amount" can be confusing (expense of $50 stored as -50)

**Source**: "Data Model" section (transactions table design discussion)

---

### ADR-005: Vercel AI SDK (Model-Agnostic)

**Status**: Accepted

**Context**: Need to integrate an AI assistant for insights and commands. Must consider cost, quality, privacy, and future flexibility.

**Options Considered**:
1. OpenAI SDK directly — provider-specific
2. Anthropic SDK directly — provider-specific
3. LangChain — heavyweight abstraction
4. Vercel AI SDK — lightweight, model-agnostic, streaming support

**Decision**: Vercel AI SDK for model-agnostic AI integration.

**Rationale**:
- Supports multiple providers (OpenAI, Anthropic, Google, etc.)
- Simple tool/function calling with Zod schemas
- Built-in streaming support for chat UX
- Works seamlessly with Next.js
- Can switch providers by changing one line
- User consent required before AI use

**Consequences**:
- (+) Provider flexibility — switch models easily
- (+) Consistent API across providers
- (+) Streaming out of the box
- (+) Zod integration for type-safe tools
- (-) Abstraction layer adds slight overhead
- (-) API costs (mitigated by rate limiting)

**Source**: "AI Privacy / Runtime (MVP) specifics", project setup with AI SDK

---

### ADR-006: CAD Currency Only

**Status**: Accepted

**Context**: Need to decide on currency support for MVP.

**Options Considered**:
1. Multi-currency from start — store currency per account/transaction
2. Single currency (CAD) — all amounts in CAD
3. Default CAD with optional override

**Decision**: CAD only for MVP. Multi-currency deferred to V2.

**Rationale**:
- Target user is in Ontario, Canada
- Simplifies data model and calculations
- Avoids currency conversion complexity
- Tax summary features are Canada-specific anyway
- Can be expanded later without breaking existing data

**Consequences**:
- (+) Simpler implementation
- (+) Consistent calculations
- (-) Excludes international users
- (-) Migration needed when adding multi-currency

**Source**: "Scope and MVP Definition" (single currency CAD)

---

### ADR-007: Budget Period (Monthly Only)

**Status**: Accepted

**Context**: Need to decide on budget period granularity.

**Options Considered**:
1. Monthly only — reset each calendar month
2. Custom periods — weekly, biweekly, monthly, yearly
3. Pay-period aligned — match user's pay schedule

**Decision**: Monthly budgets only for MVP.

**Rationale**:
- Aligns with most users' mental model (monthly bills, monthly income)
- Simplifies calculation (first/last of month boundaries)
- 50/30/20 framework assumes monthly income
- More complex periods can be added later

**Consequences**:
- (+) Simple implementation
- (+) Clear period boundaries
- (-) Doesn't fit weekly budgeters
- (-) Mid-month start users see partial first month

**Source**: Story 8: Set Up Budget (period discussion)

---

### ADR-008: Hard Delete for Transactions

**Status**: Accepted

**Context**: Need to decide on deletion behavior for user data.

**Options Considered**:
1. Hard delete — actually remove from database
2. Soft delete — mark as deleted, filter in queries
3. Trash bin — soft delete with 30-day recovery

**Decision**: Hard delete for transactions and most data. No soft delete in MVP.

**Rationale**:
- Privacy posture: if user deletes, truly remove
- Simpler data model (no deleted_at columns)
- Personal app — user unlikely to accidentally delete
- Confirmation modal before delete provides protection
- Supports future GDPR-style data erasure requests

**Consequences**:
- (+) True deletion aligns with privacy promise
- (+) Simpler queries (no WHERE deleted_at IS NULL)
- (-) No undo for accidental deletes
- (-) Accounts/categories with transactions can't be deleted (must archive instead)

**Source**: "Soft vs Hard Delete" section in Data Model

---

### ADR-009: Next.js API Routes (Not Edge Functions)

**Status**: Accepted

**Context**: Need to decide where to run server-side logic.

**Options Considered**:
1. Next.js API Routes — serverless functions via Vercel
2. Supabase Edge Functions — serverless at database edge
3. Dedicated backend service — separate Node.js server

**Decision**: Next.js API Route Handlers for all backend logic in MVP.

**Rationale**:
- Code stays in one project (monorepo simplicity)
- Easy Supabase client and OpenAI integration
- Vercel handles deployment and scaling
- Most operations are triggered by user HTTP requests
- Edge Functions add complexity without clear benefit for MVP

**Consequences**:
- (+) Single codebase
- (+) Simpler deployment
- (+) Good developer experience
- (-) 10-second timeout on Vercel (sufficient for MVP)
- (-) Cold starts on serverless

**Source**: "Backend" section in "Recommended Tech Stack & Architecture"

---

### ADR-010: Disclaimer Strategy

**Status**: Accepted

**Context**: App provides financial information that could be mistaken for professional advice.

**Options Considered**:
1. Disclaimer in Terms of Service only
2. Contextual disclaimers (when relevant)
3. Prominent disclaimers on every page
4. AI self-disclaimer in responses

**Decision**: Contextual disclaimers plus AI self-disclaimer.

**Rationale**:
- Tax Summary page: prominent banner disclaimer
- AI assistant: includes "I'm not a certified advisor" in first use intro
- AI responses: includes disclaimer when giving significant advice
- Balances legal protection with user experience (not overly intrusive)
- Following patterns from financial institutions

**Consequences**:
- (+) Legal protection
- (+) Clear user expectations
- (+) Not overwhelming UX
- (-) Some repetition for cautious users

**Source**: Story 21: Clear Disclaimers, "Tax Summaries" section

---

### ADR-011: Persistent Chat History

**Status**: Accepted

**Context**: Need to decide if AI chat sessions persist across sessions.

**Options Considered**:
1. No persistence — fresh chat each session
2. Session-only — persist during browser session
3. Full persistence — store all messages in database

**Decision**: Full persistence — chat messages stored per user in database.

**Rationale**:
- Users can reference past conversations
- Enables conversation continuity
- Supports future features (conversation search, context)
- Database storage is straightforward (chat_messages table)
- User owns their data and can delete conversations

**Consequences**:
- (+) Full conversation history
- (+) User can continue previous chats
- (+) Enables AI to reference past context
- (-) More storage required
- (-) Need UI for conversation management

**Source**: User requirement: "Chats will be stored under the user"

---

### ADR-012: CSV Import Atomicity

**Status**: Accepted

**Context**: Need to decide behavior when CSV import fails partway.

**Options Considered**:
1. Partial commit — keep successfully imported rows
2. All-or-nothing — rollback entire import on any error

**Decision**: All-or-nothing — rollback if any row fails.

**Rationale**:
- Prevents partial/inconsistent data
- Easier for user to understand (success or failure, not partial)
- Can fix CSV and retry entire import
- Uses database transaction for atomicity

**Consequences**:
- (+) Data consistency guaranteed
- (+) Clear success/failure state
- (+) User can fix and retry
- (-) One bad row blocks entire import
- (-) No partial progress for large files

**Source**: User requirement: "All or nothing"

---

### ADR-013: Accounts Start from Zero

**Status**: Accepted

**Context**: Need to decide if accounts support opening balances.

**Options Considered**:
1. Require opening balance
2. Optional opening balance
3. Always start from zero

**Decision**: Always start from zero — only track new transactions going forward.

**Rationale**:
- Simplifies data model (no initial balance field)
- Focuses on tracking going forward, not reconciling past
- Users manually entering don't need historical accuracy
- Can add opening balance as a transaction if needed

**Consequences**:
- (+) Simpler implementation
- (+) Clear mental model for users
- (-) Can't easily import historical balance
- (-) Account balance only reflects tracked transactions

**Source**: User requirement: "Start from zero"

---

## Open Questions (Pending Decisions)

*All major questions have been resolved.*

| Topic | Question | Status |
|-------|----------|--------|
| Transfer Linking | How to link paired transfer transactions? | Needs ADR |

---

## Traceability

All decisions are traced to Source MD sections as noted in each ADR.
