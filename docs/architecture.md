# Architecture

## Purpose

This document defines the **technical architecture, stack decisions, and implementation patterns** for the Personal Finance Tracker. Use this as the reference for all technical decisions.

## How to Use This Doc

- **Before implementing**: Verify your approach aligns with these patterns
- **Making tech decisions**: Check if a decision exists here before creating a new one
- **Onboarding**: Read this to understand the system structure
- **Cross-reference**: See [data-model.md](./data-model.md) for schema details, [spec.md](./spec.md) for requirements

---

## Tech Stack

### Core Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 15 (App Router) | Unified server/client framework; React Server Components |
| **Language** | TypeScript | Type safety reduces bugs in financial calculations |
| **Styling** | Tailwind CSS | Utility-first; fast development; consistent design |
| **UI Components** | shadcn/ui | 40+ Radix primitives + Tailwind + CVA (pre-installed) |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with RLS for data isolation |
| **Authentication** | NextAuth.js v4 + Google OAuth | Database sessions stored in Supabase `next_auth` schema |
| **AI** | Vercel AI SDK | Model-agnostic; can switch providers (OpenAI, Anthropic, etc.) |
| **Deployment** | Vercel | Optimized for Next.js; easy CI/CD |

### Supporting Libraries

| Library | Purpose |
|---------|---------|
| **React Hook Form + Zod** | Form handling and validation (client & server) |
| **Recharts** | Data visualization (spending breakdowns, trends) |
| **@supabase/supabase-js** | Database client for queries |
| **@auth/supabase-adapter** | Store NextAuth sessions in Supabase |
| **date-fns + react-day-picker** | Date utilities and calendar picker |
| **lucide-react** | Icon library |
| **Jest + React Testing Library** | Unit and component tests |
| **Playwright** | End-to-end tests |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    Next.js 15 App (React)                    ││
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐││
│  │  │Dashboard │ │Transactions│ │ Budgets │ │   AI Chat       │││
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘││
│  │                    shadcn/ui Components                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │/api/auth/*   │ │ /api/data/*  │ │    /api/chat             │ │
│  │(NextAuth.js) │ │ (CRUD ops)   │ │  (AI SDK + Functions)    │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│   SUPABASE      │ │   AI PROVIDERS  │ │   (Future services)     │
│  ┌───────────┐  │ │ (via AI SDK)    │ │                         │
│  │ Postgres  │  │ │ ┌─────────────┐ │ │                         │
│  │  + RLS    │  │ │ │ OpenAI      │ │ │                         │
│  │ (public   │  │ │ │ Anthropic   │ │ │                         │
│  │  schema)  │  │ │ │ Google      │ │ │                         │
│  └───────────┘  │ │ │ etc.        │ │ │                         │
│  ┌───────────┐  │ │ └─────────────┘ │ │                         │
│  │ next_auth │  │ │                 │ │                         │
│  │  schema   │  │ │                 │ │                         │
│  └───────────┘  │ │                 │ │                         │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘
```

---

## Component Boundaries

### Frontend Components (Existing Structure)

```
src/
├── app/                      # Next.js App Router pages
│   ├── api/
│   │   ├── auth/            # NextAuth API route (re-exports from lib/auth.ts)
│   │   ├── chat/            # AI chat endpoint (AI SDK)
│   │   └── [resource]/      # CRUD API routes
│   ├── dashboard/           # Protected pages (requires authentication)
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── goals/
│   │   ├── bills/
│   │   ├── reports/
│   │   └── assistant/
│   ├── login/               # Public login page with Google sign-in
│   ├── layout.tsx           # Root layout with Providers and Toaster
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui primitives (40+ pre-installed)
│   ├── providers.tsx        # SessionProvider wrapper for client components
│   ├── google-signin-button.tsx
│   ├── logout-button.tsx
│   ├── forms/               # Transaction, budget, goal forms
│   ├── charts/              # Recharts wrappers
│   └── layout/              # Navigation, header, sidebar
├── lib/
│   ├── auth.ts              # NextAuth config + auth() helper
│   ├── supabase.ts          # Supabase client (anon key)
│   ├── ai.ts                # AI SDK configuration
│   ├── utils.ts             # cn() helper for Tailwind classes
│   └── validators/          # Zod schemas
├── hooks/                   # Custom React hooks
└── types/
    └── next-auth.d.ts       # Extended Session type with user.id
```

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/auth/[...nextauth]` | NextAuth.js handlers (Google OAuth) |
| `/api/transactions` | CRUD for transactions |
| `/api/accounts` | CRUD for accounts |
| `/api/categories` | CRUD for categories |
| `/api/budgets` | CRUD for budgets |
| `/api/goals` | CRUD for goals |
| `/api/bills` | CRUD for bills |
| `/api/chat` | AI chat endpoint (AI SDK with tools) |
| `/api/import` | CSV import processing |
| `/api/reports` | Summary data aggregation |

---

## Security Model

### Authentication Flow (NextAuth.js)

```
1. User clicks "Sign in with Google"
2. NextAuth redirects to Google OAuth
3. Google returns to /api/auth/callback/google with code
4. NextAuth exchanges code for tokens
5. Supabase Adapter stores user in next_auth.users
6. Session stored in next_auth.sessions (database strategy)
7. Session cookie set (HTTP-only)
8. Middleware (src/middleware.ts) protects /dashboard/* routes
9. Server components use auth() from src/lib/auth.ts
```

### Database Schemas

**`next_auth` schema** (managed by NextAuth.js):
- `next_auth.users` — User profiles (id, email, name, image)
- `next_auth.accounts` — OAuth provider connections
- `next_auth.sessions` — Active sessions with tokens
- `next_auth.verification_tokens` — Email verification (future)

**`public` schema** (application data):
- All feature tables (accounts, transactions, budgets, etc.)
- Must include `user_id` referencing `next_auth.users(id)`

### Row-Level Security (RLS)

Every table in `public` schema has RLS enabled:

```sql
-- Example for transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  -- ... other columns
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can view own transactions"
ON public.transactions FOR SELECT
USING (user_id = auth.uid());

-- INSERT policy
CREATE POLICY "Users can insert own transactions"
ON public.transactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE policy
CREATE POLICY "Users can update own transactions"
ON public.transactions FOR UPDATE
USING (user_id = auth.uid());

-- DELETE policy
CREATE POLICY "Users can delete own transactions"
ON public.transactions FOR DELETE
USING (user_id = auth.uid());
```

### Session Access Patterns

**Server Components / API Routes:**
```tsx
import { auth } from "@/lib/auth"

export default async function ProtectedPage() {
  const session = await auth()
  if (!session) redirect("/login")
  
  // session.user.id available for database queries
  const userId = session.user.id
}
```

**Client Components:**
```tsx
"use client"
import { useSession } from "next-auth/react"

export function UserProfile() {
  const { data: session, status } = useSession()
  if (status === "loading") return <Skeleton />
  if (!session) return null
  
  return <p>Welcome, {session.user.name}</p>
}
```

### Security Checklist

- [ ] RLS enabled on ALL `public` schema tables
- [ ] `user_id` required on all records (FK to `next_auth.users`)
- [ ] Middleware protects `/dashboard/*` routes
- [ ] API routes verify session via `auth()` before processing
- [ ] AI tools filter by current user context
- [ ] No raw SQL without parameterization
- [ ] Environment variables for all secrets
- [ ] HTTPS only in production

---

## AI Integration

### Architecture Pattern (Vercel AI SDK)

```
┌──────────────────────────────────────────────────────────────────┐
│                    VERCEL AI SDK                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │              /api/chat route handler                        │  │
│  │  - Uses streamText() or generateText()                     │  │
│  │  - Defines tools for data access                           │  │
│  │  - Stores conversation in database                         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│          ┌───────────────────┼───────────────────┐               │
│          ▼                   ▼                   ▼               │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐         │
│  │   OpenAI     │   │  Anthropic   │   │   Google     │         │
│  │  (gpt-4o)    │   │  (claude)    │   │  (gemini)    │         │
│  └──────────────┘   └──────────────┘   └──────────────┘         │
└──────────────────────────────────────────────────────────────────┘
```

### Chat History Storage

Conversations are persisted per user:

```sql
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES next_auth.users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL,
  role TEXT NOT NULL, -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_user ON public.chat_messages(user_id);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
```

### AI SDK Tool Definitions

The AI assistant has access to these tools:

| Tool | Purpose | Parameters |
|------|---------|------------|
| `get_spending` | Sum spending by category/period | category, period (this_month, last_month, etc.) |
| `get_budget_status` | Current budget vs. spent | category (optional) |
| `get_goal_status` | Goal progress | goal_name (optional) |
| `get_account_balance` | Account balance | account_name |
| `get_upcoming_bills` | Bills due soon | days_ahead |
| `add_transaction` | Create transaction | date, amount, category, account, description |
| `add_transfer` | Create transfer | from_account, to_account, amount, description |
| `set_budget` | Create/update budget | category, amount, period |
| `add_goal_contribution` | Add to goal | goal_name, amount |

### Example Implementation

```tsx
// app/api/chat/route.ts
import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai'; // or anthropic, google, etc.
import { z } from 'zod';
import { auth } from '@/lib/auth';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'), // Swappable: anthropic('claude-3-5-sonnet'), etc.
    system: `You are a personal finance assistant...`,
    messages,
    tools: {
      get_spending: tool({
        description: 'Get spending for a category in a time period',
        parameters: z.object({
          category: z.string(),
          period: z.enum(['this_month', 'last_month', 'this_year']),
        }),
        execute: async ({ category, period }) => {
          // Query database filtered by session.user.id
        },
      }),
      // ... more tools
    },
  });

  return result.toDataStreamResponse();
}
```

### System Prompt Guidelines

The AI system prompt must include:

1. **Role**: Personal finance assistant for the user
2. **Data access**: Only user's own data via tools
3. **Tone**: Friendly, supportive, professional (not sassy)
4. **Disclaimers**: Always include for tax/investment advice
5. **Refusals**: Refuse illegal requests, out-of-scope requests
6. **Uncertainty**: Express when unsure; ask for clarification
7. **No hallucination**: Only reference data from tool results
8. **Canada context**: Use CAD, mention RRSP/TFSA when relevant

### AI Privacy Mode

When enabled:
- AI chat is disabled
- No data sent to any AI provider
- User sees message: "AI assistant is disabled in privacy mode"

---

## Data Flow Patterns

### Transaction Creation Flow

```
1. User submits transaction form
2. Client validates with Zod schema
3. Optimistic UI update (show immediately)
4. POST /api/transactions
5. Server validates again
6. Supabase INSERT with user_id from session
7. RLS ensures user owns the record
8. Return success/error
9. Refresh budget calculations
10. Update dashboard totals
```

### AI Query Flow

```
1. User sends message in chat
2. POST /api/assistant with message + history
3. Build system prompt with user context
4. Send to OpenAI with function definitions
5. If OpenAI returns function_call:
   a. Execute function (DB query via Supabase)
   b. Ensure RLS filters by user
   c. Send result back to OpenAI
   d. Repeat until final response
6. Return final text response
7. Display in chat UI
```

### CSV Import Flow

```
1. User uploads CSV file
2. Client parses with Papaparse
3. Show column mapping UI
4. User maps columns to fields
5. Show preview (first 5 rows)
6. User confirms
7. POST /api/import with mapped data
8. Server validates each row
9. Duplicate detection (date+amount+description+account hash)
10. Bulk INSERT with user_id
11. Return count imported, skipped
12. Refresh transaction list
```

---

## Deployment

### Environment Variables

| Variable | Description | Where |
|----------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Vercel + local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Vercel + local |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin key (server only) | Vercel only |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Vercel + local |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Vercel + local |
| `NEXTAUTH_SECRET` | NextAuth.js secret | Vercel + local |
| `NEXTAUTH_URL` | App URL (http://localhost:3000 for dev) | Vercel + local |
| `OPENAI_API_KEY` | OpenAI API key (optional) | Vercel only |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) | Vercel only |

### Vercel Configuration

- **Build command**: `next build`
- **Output directory**: `.next`
- **Node version**: 18.x
- **Region**: US East (close to Supabase)
- **Serverless timeout**: 10s (default)

### Supabase Configuration

- **Region**: North America (US East or Canada if available)
- **RLS**: Enabled on all tables
- **Auth**: Google OAuth provider configured
- **Extensions**: pg_cron (for future background jobs)

---

## Testing Strategy

### Unit Tests (Jest)

- Utility functions (date parsing, amount formatting)
- Zod schema validation
- Budget calculation logic
- CSV parsing logic

### Component Tests (React Testing Library)

- Form submissions
- Data display components
- Error states

### E2E Tests (Playwright)

- Full login flow
- Add transaction and verify in list
- Set budget and check alert
- AI chat interaction (mocked)

### Test Environment

- Separate Supabase project for tests
- Mock OpenAI responses
- Seed data for consistent tests

---

## Performance Considerations

### Database

- Indexes on `user_id` for all tables (RLS performance)
- Composite index on `(user_id, date)` for transactions
- Composite index on `(user_id, category_id, date)` for budget queries

### Frontend

- Optimistic UI for transaction creation
- Pagination for transaction list (> 100 items)
- Chart.js lazy loading

### API

- Response caching for summary calculations (optional)
- Rate limiting for AI endpoint (100 requests/day/user)

---

## Open Questions

1. Should we use Supabase Edge Functions for any operations?
2. What's the strategy for database migrations in production?
3. Do we need real-time subscriptions for any features?
4. Should we implement request queuing for OpenAI rate limits?

---

## Traceability

| Section | Source MD Location |
|---------|-------------------|
| Tech Stack | "Recommended Tech Stack & Architecture" |
| Security Model | "Row-Level Security Strategy" |
| AI Integration | "AI Assistant Integration" - Stories 15-18, "AI Privacy / Runtime" |
| Deployment | "Deployment" section, Vercel + Supabase notes |
| Testing | "Testing" section |
