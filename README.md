# Pocket Pilot - Personal Finance Tracker

A privacy-first personal finance management application with AI-powered insights, built for Canadians who want control over their money without complexity.

## Features

- **Google OAuth Authentication** - Secure sign-in with Google, no passwords stored
- **Transaction Management** - Track income and expenses with categories
- **CSV Import** - Import transactions from your bank with flexible column mapping
- **Budget Management** - Set monthly budgets with 50/30/20 framework support
- **Savings Goals** - Track progress toward financial goals with contributions
- **Recurring Bills** - Manage bills with due date alerts (overdue, due soon)
- **AI Chat Assistant** - Natural language interface to add transactions, check spending, and get budget status
- **Tax Summary** - Canadian tax category support (Charity, Medical, Business, etc.)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL with RLS) |
| Authentication | NextAuth.js + Google OAuth |
| AI Integration | Vercel AI SDK with Z.AI |
| UI | Tailwind CSS + shadcn/ui |
| Validation | Zod |
| Charts | Recharts |

## Prerequisites

- Node.js 18.x or higher
- npm, yarn, or pnpm
- A Supabase account (free tier works)
- A Google Cloud Console account (for OAuth)
- A Z.AI API key (or OpenAI-compatible provider)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# ===========================================
# Google OAuth (Google Cloud Console)
# ===========================================
# Create at: https://console.cloud.google.com/apis/credentials
# 1. Create a new OAuth 2.0 Client ID
# 2. Add authorized redirect URI: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# ===========================================
# NextAuth.js
# ===========================================
# Generate secret: openssl rand -base64 32
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# ===========================================
# Supabase
# ===========================================
# Get from: https://supabase.com/dashboard/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# ===========================================
# AI Chat (Z.AI / OpenAI-compatible)
# ===========================================
OPENAI_API_KEY=your_zai_api_key
```

## Setup Guide

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. Set Application type to **Web application**
7. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
8. Copy the Client ID and Client Secret to your `.env.local`

### 2. Supabase Setup

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project
3. Go to **Settings > API** to get your keys
4. Copy the Project URL, anon key, and service_role key to `.env.local`
5. Run the database migrations (see below)

### 3. Database Migrations

The migrations are located in `supabase/migrations/`. Run them in order:

```bash
# Using Supabase CLI
supabase db push

# Or manually run each migration file in order via Supabase SQL Editor:
# 001_auth_schema.sql
# 002_accounts.sql
# 003_categories.sql
# 004_transactions.sql
# 005_budgets.sql
# 006_bills.sql
# 007_goals.sql
# 008_chat.sql
# 009_user_profiles.sql
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
simple-tracker/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # NextAuth.js
│   │   │   ├── chat/          # AI chat endpoints
│   │   │   ├── accounts/      # Account CRUD
│   │   │   ├── categories/    # Category CRUD
│   │   │   ├── transactions/  # Transaction CRUD + import
│   │   │   ├── budgets/       # Budget CRUD
│   │   │   ├── bills/         # Bill CRUD
│   │   │   ├── goals/         # Goal CRUD + contributions
│   │   │   └── profile/       # User profile
│   │   ├── dashboard/         # Protected app pages
│   │   │   ├── accounts/
│   │   │   ├── transactions/
│   │   │   ├── budgets/
│   │   │   ├── bills/
│   │   │   ├── goals/
│   │   │   └── categories/
│   │   ├── login/             # Login page
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   ├── ui/                # shadcn/ui components (40+)
│   │   ├── forms/             # Form components
│   │   └── ...                # Feature components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── supabase.ts        # Supabase clients
│   │   ├── utils.ts           # Utility functions
│   │   └── validators/        # Zod schemas
│   └── types/
│       └── next-auth.d.ts     # Extended session types
├── supabase/
│   └── migrations/            # Database migrations
├── docs/                      # Project documentation
│   ├── spec.md               # Product requirements
│   ├── architecture.md       # Technical architecture
│   ├── data-model.md         # Database schema
│   └── decision-log.md       # ADRs
└── public/                    # Static assets
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Key Conventions

- **Currency**: CAD only (Canadian dollars)
- **Amounts**: Stored as signed values (negative = expense, positive = income)
- **Budgets**: Monthly periods only
- **Authentication**: Google OAuth only, no password storage
- **Privacy**: All data is user-scoped with Row Level Security (RLS)

## AI Chat Commands

The AI assistant (Pocket Pilot) can help you:

- **Add transactions**: "Add $50 for groceries today"
- **Add bills**: "Add my $100 phone bill due on the 15th"
- **Check spending**: "How much did I spend on food this month?"
- **Budget status**: "Am I over budget on entertainment?"
- **Goal contributions**: "Add $200 to my vacation fund"

## Documentation

See the `/docs` folder for detailed documentation:

- `docs/spec.md` - Product requirements and acceptance criteria
- `docs/architecture.md` - Technical architecture and patterns
- `docs/data-model.md` - Database schema and relationships
- `docs/decision-log.md` - Architectural Decision Records (ADRs)
- `docs/glossary.md` - Terminology definitions

## License

MIT
