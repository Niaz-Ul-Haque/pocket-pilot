# Pocket Pilot - Personal Finance Tracker

A privacy-first personal finance management application with AI-powered insights, built for Canadians who want control over their money without complexity.

## Current Version: v1.2

**92+ features implemented across 7 tiers** including comprehensive AI insights, data visualization, advanced UX, and powerful automation tools.

---

## Features

### Core Financial Tracking
- **Multi-Account Management** - Track checking, savings, credit, cash, and investment accounts
- **Transaction Management** - Add, edit, delete with categories, tags, and descriptions
- **CSV Import** - Import from bank with flexible column mapping and duplicate detection
- **Budget Management** - Monthly/weekly/yearly budgets with templates and rollover
- **Savings Goals** - Track progress with milestones, auto-contribute, and sharing
- **Recurring Bills** - Manage bills with due dates, categories, and payment streaks
- **Recurring Transactions** - Auto-generate salary, subscriptions, etc.

### AI-Powered Features (16+ AI Tools)
- **AI Chat Assistant** - Natural language interface for all financial tasks
- **Financial Health Score** - AI-calculated score (0-100) with breakdown
- **AI Insights Widget** - 4-tab dashboard (Overview, Predictions, Patterns, Alerts)
- **Anomaly Detection** - Flags unusual transactions automatically
- **Cash Flow Forecasting** - 30-day balance predictions
- **Spending Pattern Analysis** - Day-of-week and time-of-month patterns
- **Smart Categorization** - AI suggests categories for transactions
- **What-If Scenarios** - "What if I cut dining by 50%?" projections
- **Bill Negotiation Tips** - AI suggests how to reduce bills
- **Voice I/O** - Speech-to-text input and text-to-speech responses

### Data Visualization (15 Chart Types)
- Spending trends, category breakdowns, income vs expense
- Net worth tracking, budget gauges, budget heatmaps
- Goal timelines, contribution charts
- Bill calendar, cash flow waterfall, category trends

### UX Enhancements
- **Keyboard Shortcuts** - Power user navigation (G+T, G+B, etc.)
- **Command Palette** - Cmd/Ctrl+K for quick actions
- **Dark Mode** - System preference or manual toggle
- **Quick Add FAB** - Floating action button for fast entry
- **Dashboard Customization** - Drag-and-drop widgets
- **Onboarding Tour** - Guided setup for new users

### Transaction Power Features
- **Bulk Operations** - Multi-select, bulk delete, categorize, tag
- **Auto-Categorization Rules** - Define rules like "UBER → Transportation"
- **Split Transactions** - Divide across multiple categories
- **Transaction Templates** - Save common transactions for one-click entry
- **Tags System** - Custom tags with colors for organization

### Reports & Analytics
- Custom date range reports
- Year-over-year comparisons
- Merchant spending analysis
- Category deep dives
- Savings rate dashboard
- Tax summary with deductions

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL with RLS) |
| Authentication | NextAuth.js + Google OAuth |
| AI Integration | Vercel AI SDK with Z.AI |
| UI | Tailwind CSS + shadcn/ui (40+ components) |
| Charts | Recharts |
| Validation | Zod |
| Forms | React Hook Form |

---

## Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm
- A Supabase account (free tier works)
- A Google Cloud Console account (for OAuth)
- A Z.AI API key (or OpenAI-compatible provider)

---

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# ===========================================
# Google OAuth (Google Cloud Console)
# ===========================================
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ===========================================
# NextAuth.js
# ===========================================
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# ===========================================
# Supabase
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ===========================================
# AI Chat (Z.AI / OpenAI-compatible)
# ===========================================
OPENAI_API_KEY=your_zai_api_key
```

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/pocket-pilot.git
cd pocket-pilot
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and fill in your credentials.

### 3. Database Setup

Run migrations via Supabase CLI or manually in SQL Editor:

```bash
supabase db push
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
pocket-pilot/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # 50+ API routes
│   │   │   ├── auth/          # NextAuth.js
│   │   │   ├── chat/          # AI chat endpoints
│   │   │   ├── ai-insights/   # AI analytics endpoint
│   │   │   └── ...            # CRUD for all entities
│   │   ├── dashboard/         # Protected app pages
│   │   │   ├── accounts/      # Account management
│   │   │   ├── transactions/  # Transaction list + import
│   │   │   ├── budgets/       # Budget tracking + templates
│   │   │   ├── goals/         # Savings goals + milestones
│   │   │   ├── bills/         # Bill management
│   │   │   ├── analytics/     # Charts dashboard
│   │   │   ├── reports/       # Financial reports
│   │   │   └── recurring/     # Recurring transactions
│   │   └── onboarding/        # New user setup
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (40+)
│   │   ├── forms/             # Form components (15+)
│   │   ├── charts/            # Recharts wrappers (15)
│   │   └── ...                # Feature components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── supabase.ts        # Supabase clients
│   │   ├── errors.ts          # Standardized error handling
│   │   └── validators/        # Zod schemas (15+)
│   └── hooks/                 # Custom React hooks
├── supabase/
│   └── migrations/            # Database migrations (15+)
└── docs/                      # Project documentation
```

---

## AI Chat Commands

The AI assistant (Pocket Pilot) can help you:

**Add Transactions:**
- "Add $50 for groceries today"
- "I spent $120 on gas yesterday"
- "Add my paycheck of $2000"

**Manage Bills:**
- "Add my $100 phone bill due on the 15th"
- "What bills are due this week?"

**Check Spending:**
- "How much did I spend on food this month?"
- "Show me my spending trends"
- "Compare this month to last month"

**Budget Status:**
- "Am I over budget on entertainment?"
- "What budgets have room left?"

**Goals:**
- "Add $200 to my vacation fund"
- "How close am I to my emergency fund goal?"

**Analysis:**
- "What if I cut dining by 50%?"
- "Find savings opportunities"
- "Give me financial suggestions"

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + K` | Open command palette |
| `/` | Open search |
| `?` | Show shortcuts help |
| `n` | New transaction |
| `g + h` | Go to dashboard |
| `g + t` | Go to transactions |
| `g + b` | Go to budgets |
| `g + g` | Go to goals |
| `g + i` | Go to bills |
| `g + r` | Go to reports |
| `g + y` | Go to analytics |

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript checks |

---

## DevOps & CI/CD

- **GitHub Actions** - Build, lint, type check on every PR
- **Security Scanning** - npm audit + CodeQL analysis
- **Vercel Deployments** - Preview on PR, production on merge
- **Dependabot** - Automated dependency updates
- **Git Hooks** - Husky + lint-staged + commitlint

---

## Documentation

See the `/docs` folder for detailed documentation:

| Document | Description |
|----------|-------------|
| `docs/spec.md` | Product requirements and acceptance criteria |
| `docs/architecture.md` | Technical architecture and patterns |
| `docs/data-model.md` | Database schema and relationships |
| `docs/decision-log.md` | Architectural Decision Records (ADRs) |
| `docs/next-tasks.md` | Feature roadmap and upcoming work |
| `docs/PROGRESS.md` | Implementation progress tracking |
| `docs/devops.md` | CI/CD and deployment documentation |

---

## Key Conventions

- **Currency:** CAD only (Canadian dollars)
- **Amounts:** Stored as signed values (negative = expense, positive = income)
- **Authentication:** Google OAuth only, no password storage
- **Privacy:** All data is user-scoped with Row Level Security (RLS)
- **Manual-First:** No bank sync; user-driven entry

---

## Roadmap (v1.3+)

The next phase focuses on AI enhancements:

1. **AI Confirmation Fix** - Ensure AI responds after executing actions
2. **Quick Reply Buttons** - Yes/No suggestions in chat
3. **Weekly AI Summary** - Auto-generated financial digest
4. **Monthly AI Report** - Comprehensive month-end analysis
5. **Receipt OCR** - Scan receipts to auto-fill transactions
6. **Smart Merchant Recognition** - AI learns merchant variations

See `docs/next-tasks.md` for the full roadmap.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT
