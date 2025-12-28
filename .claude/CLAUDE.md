# CLAUDE-instructions.md — AI Assistant Instructions

## Purpose

This file provides **instructions for AI coding assistants** (CLAUDE, GitHub CLAUDE, etc.) when working on the Personal Finance Tracker codebase. Follow these rules to ensure consistent, correct, and well-documented implementations.

---

## Source of Truth Rules

### Reminder
If any SQL supabase needs to be udpated/amended/added/deleted, etc, please give add a new sql commands fuke under supabase/migrations so I can go and run them in SQL Editor in supabase web console when ready.

### 1. Always Consult Documentation First

Before implementing or modifying any feature:

1. **Check `docs/spec.md`** for requirements and acceptance criteria
2. **Check `docs/architecture.md`** for technical patterns
3. **Check `docs/data-model.md`** for database schema
4. **Check `docs/decision-log.md`** for prior decisions
5. **Check `docs/glossary.md`** for terminology

### 2. Single Source of Truth Priority

When information conflicts, use this priority order:

1. `docs/spec.md` — for product requirements
2. `docs/data-model.md` — for database schema
3. `docs/architecture.md` — for technical decisions
4. `docs/decision-log.md` — for rationale
5. Code comments — for implementation details

### 3. When Unsure, Ask

If something is ambiguous or missing from docs:
- Check `docs/spec.md` Open Questions section
- Check `docs/index.md` for navigation hints
- Add to Open Questions if discovery needed
- Ask the developer for clarification before guessing

---

## Do's and Don'ts

### DO ✅

| Rule | Rationale |
|------|-----------|
| Use TypeScript for all code | Type safety for financial calculations |
| Use Zod for validation (client and server) | Consistent validation, type inference |
| Use Tailwind CSS for styling | Project standard; no custom CSS files |
| Use shadcn/ui components from `@/components/ui/*` | 40+ pre-installed components |
| Use `cn()` from `@/lib/utils` for class merging | Consistent Tailwind class handling |
| Use `lucide-react` for icons | Project standard icon library |
| Use functional components with hooks | React best practice |
| Use `auth()` from `@/lib/auth` for server auth | NextAuth.js pattern |
| Use `useSession()` for client auth | NextAuth.js client pattern |
| Apply RLS policies to ALL `public` tables | Security requirement |
| Include `user_id` referencing `next_auth.users(id)` | Required for RLS |
| Use NUMERIC(12,2) for money fields | Precision for financial data |
| Store amounts as signed (negative = outflow) | See ADR-004 |
| Store chat messages in database | Conversation history requirement |
| Include disclaimers for tax/financial advice | Legal requirement |
| Write acceptance criteria tests | Verify feature completeness |
| Update docs when changing behavior | Documentation maintenance rule |

### DON'T ❌

| Rule | Rationale |
|------|-----------|
| Don't use `float` for money | Precision errors |
| Don't hardcode user IDs | Always use `session.user.id` |
| Don't skip RLS policies | Security vulnerability |
| Don't store passwords | Google OAuth only |
| Don't modify `next_auth` schema tables | Managed by NextAuth.js |
| Don't send unnecessary data to AI | Privacy principle |
| Don't give investment advice | Out of scope, liability |
| Don't calculate taxes | Only show totals with disclaimer |
| Don't assume multi-currency | CAD only in MVP |
| Don't implement bank sync | Explicitly out of scope |
| Don't create CSS files | Use Tailwind only |
| Don't use `any` type | Defeats TypeScript purpose |
| Don't use Chart.js | Use Recharts (already installed) |

---

## Architecture Boundaries

### Existing Project Structure

```
src/
├── app/                      # Next.js 15 App Router pages
│   ├── api/
│   │   ├── auth/            # NextAuth API route (re-exports from lib/auth.ts)
│   │   ├── chat/            # AI chat endpoint (AI SDK)
│   │   └── [resource]/      # CRUD API routes
│   ├── dashboard/           # Protected pages (requires authentication)
│   ├── login/               # Public login page with Google sign-in
│   ├── layout.tsx           # Root layout with Providers and Toaster
│   └── page.tsx             # Landing page
├── components/
│   ├── ui/                  # shadcn/ui primitives (40+ pre-installed)
│   ├── providers.tsx        # SessionProvider wrapper
│   ├── google-signin-button.tsx
│   ├── logout-button.tsx
│   ├── forms/               # Transaction, budget, goal forms (to create)
│   ├── charts/              # Recharts wrappers (to create)
│   └── layout/              # Navigation, header, sidebar (to create)
├── lib/
│   ├── auth.ts              # NextAuth config + auth() helper
│   ├── supabase.ts          # Supabase client (anon key)
│   ├── utils.ts             # cn() helper for Tailwind classes
│   └── validators/          # Zod schemas (to create)
├── hooks/                   # Custom React hooks (to create)
└── types/
    └── next-auth.d.ts       # Extended Session type with user.id
```

### Database Schemas

- **`next_auth` schema**: Managed by NextAuth.js — DO NOT modify directly
- **`public` schema**: Application data — all new tables go here

### API Routes Pattern

```typescript
// app/api/[resource]/route.ts
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request) {
  const session = await auth()
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Query with user_id filter (RLS also enforces this)
  const { data, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('user_id', session.user.id)
    
  // Handle response...
}
```

### AI Chat Pattern (AI SDK)

```typescript
// app/api/chat/route.ts
import { streamText, tool } from 'ai'
import { openai } from '@ai-sdk/openai' // or anthropic, google, etc.
import { z } from 'zod'
import { auth } from '@/lib/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { messages } = await req.json()

  const result = await streamText({
    model: openai('gpt-4o'), // Swappable provider
    system: `You are a personal finance assistant...`,
    messages,
    tools: {
      get_spending: tool({
        description: 'Get spending for a category',
        parameters: z.object({
          category: z.string(),
          period: z.enum(['this_month', 'last_month']),
        }),
        execute: async ({ category, period }) => {
          // Query database filtered by session.user.id
        },
      }),
    },
  })

  return result.toDataStreamResponse()
}
```

---

## Documentation Maintenance Rule

**Whenever code changes add or alter ANY of the following, the relevant docs MUST be updated in the same change:**

- User-facing behavior
- API contracts or endpoints
- Database schema (tables, fields, indexes)
- Authentication or authorization
- AI assistant functions or prompts
- Validation rules or calculations
- Dependencies or tech stack
- Environment variables

---

## Doc Update Checklist

**Before finalizing ANY code change, verify:**

- [ ] **Behavior change?** → Did this change modify behavior, UI flow, API, schema, auth, validations, calculations, or dependencies?
- [ ] **Docs updated?** → If yes to above, did you update the relevant docs in `docs/` (spec, architecture, data model, decision log, etc.)?
- [ ] **Index updated?** → Did you update `docs/index.md` links/map if a doc was added or renamed?
- [ ] **Acceptance criteria?** → Did you add/refresh acceptance criteria or edge cases if behavior changed?
- [ ] **Open Questions?** → Did you add/refresh Open Questions if you discovered missing requirements?
- [ ] **Decision logged?** → If you made a significant architectural decision, did you add an ADR to `docs/decision-log.md`?

---

## Feature Completion Workflow

**CRITICAL: After implementing ANY feature, you MUST complete these steps before proceeding:**

### Step 1: Build Check
```bash
npm run build
```
- Must complete without errors
- Fix all TypeScript errors before proceeding
- Do NOT skip this step

### Step 2: Lint Check
```bash
npm run lint
```
- Must complete without errors
- Fix all linting issues before proceeding
- Warnings should be addressed if reasonable

### Step 3: Documentation Update
- Update relevant docs if behavior changed
- Update `docs/PROGRESS.md` if milestone item completed
- Update `next-tasks.md` to mark items complete

### Step 4: Proceed to Next Task
- Only move to the next task after build + lint pass
- If build/lint fails, fix issues first
- Never leave broken builds behind

---

## Code Patterns

### Authentication (Server Components / API Routes)

```typescript
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function ProtectedPage() {
  const session = await auth()
  if (!session) redirect("/login")
  
  // session.user.id available for database queries
  const userId = session.user.id
}
```

### Authentication (Client Components)

```typescript
"use client"
import { useSession } from "next-auth/react"
import { Skeleton } from "@/components/ui/skeleton"

export function UserProfile() {
  const { data: session, status } = useSession()
  if (status === "loading") return <Skeleton className="h-8 w-32" />
  if (!session) return null
  
  return <p>Welcome, {session.user.name}</p>
}
```

### UI Components (shadcn/ui)

```tsx
// Always use cn() for conditional classes
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

<Button 
  variant="destructive" 
  className={cn("w-full", isLoading && "opacity-50")}
>
  Delete
</Button>
```

### Transaction Creation

```typescript
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"

// Always use negative for expenses, positive for income
const amount = isExpense ? -Math.abs(inputAmount) : Math.abs(inputAmount)

const session = await auth()
const { data, error } = await supabase
  .from('transactions')
  .insert({
    user_id: session.user.id,
    account_id,
    category_id,
    date,
    amount, // Signed amount
    description,
  })
```

### Budget Calculation

```typescript
// Sum expenses (negative amounts) for category in current month
const { data } = await supabase
  .from('transactions')
  .select('amount')
  .eq('user_id', session.user.id)
  .eq('category_id', categoryId)
  .lt('amount', 0) // Expenses only
  .gte('date', startOfMonth)
  .lt('date', startOfNextMonth)

const spent = data?.reduce((sum, t) => sum + Math.abs(t.amount), 0) ?? 0
const remaining = budget - spent
```

### Form Validation (Zod + React Hook Form)

```typescript
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

const transactionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive('Amount must be positive'),
  category_id: z.string().uuid().optional(),
  account_id: z.string().uuid(),
  description: z.string().max(255).optional(),
})

type TransactionForm = z.infer<typeof transactionSchema>

const form = useForm<TransactionForm>({
  resolver: zodResolver(transactionSchema),
  defaultValues: { date: new Date().toISOString().split('T')[0] },
})
```

### AI Tool Definition (AI SDK)

```typescript
import { tool } from 'ai'
import { z } from 'zod'

const tools = {
  get_spending: tool({
    description: 'Get total spending for a category in a time period',
    parameters: z.object({
      category: z.string().describe('Category name'),
      period: z.enum(['this_month', 'last_month', 'this_year']),
    }),
    execute: async ({ category, period }) => {
      // Query database filtered by session.user.id
      // Return spending total
    },
  }),
}
```

---

## Testing Requirements

### Unit Tests (Jest)

- Test all utility functions
- Test Zod schemas with valid and invalid inputs
- Test budget calculations

### Component Tests (React Testing Library)

- Test form submissions
- Test error states
- Test loading states

### E2E Tests (Playwright)

- Test login flow
- Test add transaction → verify in list
- Test budget alerts
- Test AI chat (mocked)

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin key for migrations |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `NEXTAUTH_SECRET` | Yes | NextAuth.js secret |
| `NEXTAUTH_URL` | Yes | App URL (http://localhost:3000 for dev) |
| `OPENAI_API_KEY` | Optional | OpenAI API key (if using OpenAI) |
| `ANTHROPIC_API_KEY` | Optional | Anthropic API key (if using CLAUDE) |

---

## Open Questions

See `docs/spec.md` Open Questions section for unresolved product questions.

If you discover a new open question during implementation:
1. Add it to the relevant doc's Open Questions section
2. Note where in code the question arose
3. Continue with a reasonable assumption
4. Document the assumption in code comments

---

## Quick Reference

| Task | Where to Look |
|------|---------------|
| Feature requirements | `docs/spec.md` |
| Acceptance criteria | `docs/spec.md` (per story) |
| Database schema | `docs/data-model.md` |
| Tech decisions | `docs/decision-log.md` |
| API patterns | `docs/architecture.md` |
| Terminology | `docs/glossary.md` |
| Build milestones | `docs/roadmap.md` |

---

## Traceability

This CLAUDE.md is derived from:
- Source MD "Row-Level Security Strategy"
- Source MD "Recommended Tech Stack & Architecture"
- Source MD "Data Model"
- Source MD "AI Assistant Integration" requirements
- Source MD "Build Plan" patterns
