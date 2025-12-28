# Pocket Pilot - Feature Roadmap v1.2+

This document outlines the comprehensive feature roadmap for Pocket Pilot, organized by priority tiers.

---

## Recently Completed (v1.2)

### TIER 1 AI Enhancements (21 features implemented)

**New API Endpoint: `/api/ai-insights`**
- [x] Financial Health Score (0-100) with grade and breakdown
- [x] Proactive Dashboard Insights with priority levels
- [x] Spending Alerts (Predictive) - warns before budget exceed
- [x] Anomaly Detection - flags unusual transactions
- [x] Spending Pattern Analysis - day-of-week/time-of-month patterns
- [x] Subscription Audit - recurring charges with annual cost estimates
- [x] Duplicate Transaction Detection
- [x] Expense Predictions - weekly/monthly projections
- [x] Cash Flow Forecasting - 30-day balance prediction
- [x] Goal Achievement Predictions - ETAs and required contributions
- [x] Bill Impact Analysis - upcoming bill effects on balance

**New AI Chat Tools (8 tools added):**
- [x] `smart_categorize` - suggests categories for transactions
- [x] `what_if_scenario` - financial projections ("What if I cut dining by 50%?")
- [x] `get_report` - natural language financial reports
- [x] `compare_periods` - period-over-period comparison
- [x] `find_savings_opportunities` - identifies areas to save
- [x] `get_bill_negotiation_tips` - bill reduction tips
- [x] `check_unused_budgets` - underutilized budget alerts
- [x] `track_financial_habits` - positive/negative habit tracking

**New Dashboard Widget:**
- [x] `AIInsightsWidget` - tabbed display (Overview, Predictions, Patterns, Alerts)

**Parked (for future implementation):**
- [ ] Weekly AI Summary
- [ ] Monthly AI Report

---

## Previously Completed (v1.1)

- [x] Data export (CSV/JSON) with download functionality
- [x] Enhanced AI Tools: `get_spending_trends`, `get_forecast`, `get_suggestions`
- [x] Recurring Transactions: Full CRUD with auto-generation endpoint
- [x] Voice Input: Speech-to-text for AI chat (Web Speech API)
- [x] Voice Output: Text-to-speech for AI responses with auto-speak toggle
- [x] Transactions Pagination: Server-side (25 items/page) with filtering
- [x] Tags System: User-defined tags with colors, filtering, management UI
- [x] Transfer Linking: Paired transactions between accounts
- [x] Budget Rollover: Unused budget carries to next month
- [x] Notification Bell: Aggregated alerts for bills + budgets
- [x] Custom Hooks: `useApiQuery`, `useApiMutation`, `useFormErrors`
- [x] Error Handling: Standardized API error responses

**v1.1 is COMPLETE!**

---

## TIER 0: DevOps & Automation (TOP PRIORITY)

### GitHub Actions CI/CD

| Feature | Description | Status |
|---------|-------------|--------|
| Build Workflow | Run `npm run build` on every PR and push to main | Complete |
| Lint Workflow | Run `npm run lint` on every PR | Complete |
| Type Check Workflow | Run `npx tsc --noEmit` for TypeScript validation | Complete |
| Test Workflow | Run Jest tests on every PR (ready for when tests exist) | Complete |
| Deploy Preview | Auto-deploy PR previews to Vercel for review | Complete |
| Production Deploy (Manual Trigger) | Deploy to production via comment `/deploy to production via master` | Complete |
| Dependabot | Automated dependency security PRs | Complete |
| Security Scanning | npm audit + CodeQL for vulnerability detection | Complete |
| Bundle Size Check | Track and report bundle size changes on PRs | Complete |
| Auto PR Labeling | Label PRs based on changed files (frontend, api, docs) | Complete |
| Release Automation | Auto-generate changelog and GitHub releases on version tags | Complete |

#### Production Deployment Flow

1. **PR Merged to Master** → CI/CD runs automatically (build, lint, type check, tests)
2. **CI/CD Passes** → All checks green, code is validated
3. **Manual Trigger** → Comment `/deploy to production via master` on the merge commit
4. **Deployment Workflow** → Triggered by comment, deploys to production

This ensures production deployments are intentional and only happen after explicit approval.

### Git Hooks (Husky + lint-staged)

| Feature | Description | Status |
|---------|-------------|--------|
| Pre-commit Hook | Run lint-staged (lint + format only staged files) | Complete |
| Commit-msg Hook | Enforce Conventional Commits format (feat:, fix:, chore:) | Complete |
| Pre-push Hook | Run build and type check before pushing | Complete |
| Post-merge Hook | Auto-run `npm install` when package.json changes | Complete |
| Prepare-commit-msg | Auto-add issue number from branch name to commit | Complete |

### Additional DevOps

- [x] Install and configure Husky
- [x] Configure lint-staged for faster pre-commit checks
- [x] Set up commitlint for commit message validation
- [x] Create GitHub issue templates (bug report, feature request)
- [x] Create GitHub PR template with review checklist

---

## TIER 1: AI Enhancements (23 Features)

**v1.2 Status: 21/23 Complete (2 Parked)**

### Proactive Intelligence

| Feature | Description | Status |
|---------|-------------|--------|
| Financial Health Score | AI-calculated score (0-100) based on budget adherence, savings rate, bill payment timeliness, goal progress | ✅ Complete |
| Weekly AI Summary | Dashboard widget with AI-generated weekly financial summary | 🔒 Parked |
| Monthly AI Report | Comprehensive month-end analysis with insights and recommendations | 🔒 Parked |
| Proactive Dashboard Insights | AI-generated tips that update based on real-time data | ✅ Complete |
| Spending Alerts (Predictive) | AI warns when you're on track to overspend before hitting the limit | ✅ Complete |

### Anomaly & Pattern Detection

| Feature | Description | Status |
|---------|-------------|--------|
| Anomaly Detection | Flag transactions significantly higher than normal for a category | ✅ Complete |
| Spending Pattern Analysis | Identify day-of-week and time-of-month patterns | ✅ Complete |
| Subscription Audit | AI identifies all recurring charges, estimates annual cost, suggests cancellations | ✅ Complete |
| Duplicate Transaction Detection | AI identifies potential duplicate entries | ✅ Complete |

### Predictions & Forecasting

| Feature | Description | Status |
|---------|-------------|--------|
| Expense Predictions | "Based on patterns, you'll spend ~$X on groceries this week" | ✅ Complete |
| Cash Flow Forecasting | Predict future balance based on recurring transactions, bills, patterns | ✅ Complete |
| Goal Achievement Predictions | ETA for each goal based on contribution patterns | ✅ Complete |
| Bill Impact Analysis | Show how upcoming bills will affect your balance | ✅ Complete |

### Smart Assistance

| Feature | Description | Status |
|---------|-------------|--------|
| Smart Categorization | AI suggests categories for uncategorized/new transactions | ✅ Complete |
| Merchant Recognition & Learning | AI learns merchant → category mappings from user behavior | ✅ Complete (via smart_categorize) |
| Category Recommendations | AI suggests new categories based on spending patterns | ✅ Complete (via smart_categorize) |
| Savings Opportunity Finder | AI identifies specific areas where you could save | ✅ Complete |

### Interactive AI Features

| Feature | Description | Status |
|---------|-------------|--------|
| "What If" Scenarios | Ask "What if I cut dining out by 50%?" and get projections | ✅ Complete |
| Natural Language Reports | Ask "Show me my spending for December" and get formatted response | ✅ Complete |
| Comparative Insights | "How does this month compare to last month?" with detailed breakdown | ✅ Complete |
| Bill Negotiation Tips | Based on bill amounts, suggest which ones might be negotiable | ✅ Complete |
| Unused Budget Alerts | Notice when consistently under-utilizing a budget (reallocation opportunity) | ✅ Complete |
| Financial Habit Tracker | Track positive behaviors (saved money, stayed under budget) vs negative | ✅ Complete |

---

## TIER 2: Data Visualization (15 Features)

**Status: 15/15 Complete**

### Dashboard Charts

| Feature | Description | Status |
|---------|-------------|--------|
| Spending Trend Line Chart | Monthly/weekly spending over time (last 6-12 months) | ✅ Complete |
| Category Breakdown Donut Chart | Where money is going this month | ✅ Complete |
| Income vs Expense Bar Chart | Side-by-side monthly comparison | ✅ Complete |
| Net Worth Over Time | Historical line chart tracking total assets - liabilities | ✅ Complete |
| Daily Spending Sparklines | Mini charts showing daily spending in transaction list | ✅ Complete |

### Budget Visualizations

| Feature | Description | Status |
|---------|-------------|--------|
| Budget Gauge Charts | Circular gauges showing budget utilization percentage | ✅ Complete |
| Budget Comparison Chart | This month vs last month by category | ✅ Complete |
| Budget History Heatmap | Calendar showing which days had heavy spending | ✅ Complete |

### Goal Visualizations

| Feature | Description | Status |
|---------|-------------|--------|
| Goal Progress Timeline | Visual timeline showing projected completion date | ✅ Complete |
| Goal Contribution Chart | Bar chart of contributions over time | ✅ Complete |

### Bill Visualizations

| Feature | Description | Status |
|---------|-------------|--------|
| Bill Calendar View | Full calendar with bill due dates marked | ✅ Complete |
| Monthly Bills Summary | Pie chart of recurring costs breakdown | ✅ Complete |
| Bill Payment Timeline | Upcoming bills on a timeline | ✅ Complete |

### Advanced Charts

| Feature | Description | Status |
|---------|-------------|--------|
| Cash Flow Waterfall | Income → expenses → categories → net visualization | ✅ Complete |
| Category Trends Comparison | Multi-line chart comparing categories over time | ✅ Complete |

### Implementation Details

**New API Endpoint: `/api/chart-data`**
- Supports multiple chart types via `type` query parameter
- Available types: `spending-trend`, `category-breakdown`, `daily-spending`, `net-worth`, `budget-comparison`, `spending-heatmap`, `goal-timeline`, `goal-contributions`, `bill-calendar`, `bills-summary`, `cash-flow-waterfall`, `category-trends`

**New Components in `src/components/charts/`:**
- `SpendingTrendChart` - Line chart with income/expenses/net
- `CategoryBreakdownChart` - Donut chart with category distribution
- `IncomeVsExpenseChart` - Bar chart comparing income vs expenses
- `NetWorthChart` - Area chart showing net worth over time
- `DailySparkline` / `DailySpendingSparklineCard` - Mini sparkline charts
- `BudgetGaugeChart` - Radial bar charts for budget utilization
- `BudgetComparisonChart` - Horizontal bar chart comparing months
- `BudgetHeatmap` - Calendar heatmap of daily spending
- `GoalTimelineChart` - Timeline view with progress and projections
- `GoalContributionChart` - Bar chart of monthly contributions
- `BillCalendar` - Full calendar view with bill markers
- `MonthlyBillsChart` - Pie chart of recurring bills
- `BillTimeline` - Vertical timeline of upcoming bills
- `CashFlowWaterfall` - Waterfall chart from income to net
- `CategoryTrendsChart` - Multi-line chart comparing categories

**New Analytics Page: `/dashboard/analytics`**
- Tabbed interface with Overview, Spending, Budgets, Goals, Bills sections
- Comprehensive view of all visualizations

**Integration:**
- Main dashboard: SpendingTrendChart, CategoryBreakdownChart, IncomeVsExpenseChart, CashFlowWaterfall
- Budgets page: BudgetGaugeChart, BudgetComparisonChart, BudgetHeatmap
- Goals page: GoalTimelineChart, GoalContributionChart
- Bills page: BillCalendar, MonthlyBillsChart, BillTimeline

---

## TIER 3: UX Improvements (12 Features)

### Navigation & Speed

| Feature | Description | Status |
|---------|-------------|--------|
| Keyboard Shortcuts | Power user shortcuts (N=new transaction, G+T=go to transactions) | Pending |
| Command Palette | Cmd/Ctrl+K to search and execute any action | Pending |
| Quick Add FAB | Floating action button for instant transaction entry | Pending |
| Global Search | Search across all entities (transactions, bills, goals, categories) | Pending |

### Personalization

| Feature | Description | Status |
|---------|-------------|--------|
| Dark Mode Toggle | Manual light/dark theme switching with system preference option | Pending |
| Dashboard Customization | Drag-and-drop to rearrange, show/hide widgets | Pending |
| Default Account Setting | Set preferred default account for new transactions | Pending |

### Convenience

| Feature | Description | Status |
|---------|-------------|--------|
| Undo/Redo Actions | Undo accidental deletions with toast notification | Pending |
| Recent Actions History | View and potentially revert recent changes | Pending |
| Favorites/Pinned Items | Pin important transactions, goals, or bills for quick access | Pending |
| Mobile PWA Improvements | Better touch targets, swipe actions, offline support | Pending |
| Onboarding Improvements | Better first-time user flow with guided tour | Pending |

---

## TIER 4: Transaction Power Features (10 Features)

**Status: 10/10 Complete**

### Bulk Operations

| Feature | Description | Status |
|---------|-------------|--------|
| Multi-Select Transactions | Checkbox selection for multiple transactions | ✅ Complete |
| Bulk Delete | Delete multiple selected transactions at once | ✅ Complete |
| Bulk Edit Category | Change category for multiple transactions | ✅ Complete |
| Bulk Add Tags | Add tags to multiple transactions at once | ✅ Complete |

### Automation

| Feature | Description | Status |
|---------|-------------|--------|
| Auto-Categorization Rules | Define rules like "Description contains 'UBER' → Transportation" | ✅ Complete |
| Rule Management UI | Create, edit, delete categorization rules | ✅ Complete |
| Apply Rules to Existing | Run rules against historical transactions | ✅ Complete |

### Advanced Features

| Feature | Description | Status |
|---------|-------------|--------|
| Split Transactions | Divide one transaction across multiple categories | ✅ Complete |
| Transaction Templates | Save common transactions for one-click entry | ✅ Complete |
| Transaction Linking | Link related transactions beyond transfers (e.g., refunds) | ✅ Complete |

### Implementation Details

**Database Migration: `013_tier4_features.sql`**
- `categorization_rules` table for auto-categorization
- `transaction_templates` table with usage tracking
- `template_tags` junction table for template tag associations
- `transaction_links` table for linking related transactions
- Added `is_split_parent`, `split_parent_id`, `split_group_id` columns to transactions

**New Validators in `src/lib/validators/`:**
- `categorization-rule.ts` - Rule types: contains, starts_with, ends_with, exact, regex
- `transaction-template.ts` - Templates with tags support
- `transaction-link.ts` - Link types: refund, related, partial_refund, chargeback
- `split-transaction.ts` - Split validation with amount verification
- `bulk-operations.ts` - Bulk delete, update-category, add-tags schemas

**New API Endpoints:**
- `POST /api/transactions/bulk/delete` - Bulk delete transactions
- `POST /api/transactions/bulk/update-category` - Bulk update category
- `POST /api/transactions/bulk/add-tags` - Bulk add tags
- `GET|POST /api/categorization-rules` - List/create rules
- `GET|PUT|DELETE /api/categorization-rules/[id]` - Rule CRUD
- `POST /api/categorization-rules/apply` - Apply rules with dry_run option
- `POST /api/categorization-rules/reorder` - Reorder rules
- `GET|POST /api/transaction-templates` - List/create templates
- `GET|PUT|DELETE /api/transaction-templates/[id]` - Template CRUD
- `POST /api/transaction-templates/[id]/apply` - Create transaction from template
- `GET|POST /api/transaction-links` - List/create links
- `GET|PUT|DELETE /api/transaction-links/[id]` - Link CRUD
- `GET|POST /api/transactions/[id]/split` - Split transaction

**New Components:**
- `BulkActionsToolbar` - Toolbar with bulk action buttons and dialogs
- `CategorizationRuleForm` - Form for creating/editing rules
- `SplitTransactionDialog` - Dialog for splitting transactions
- `TransactionTemplateForm` - Form for creating/editing templates
- `TransactionLinkDialog` - Dialog for linking transactions

**New Pages:**
- `/dashboard/settings/auto-categorization` - Manage categorization rules
- `/dashboard/templates` - Manage transaction templates

**Updated Pages:**
- `/dashboard/transactions` - Added multi-select, bulk actions toolbar, split/link menu items

---

## TIER 5: Budgeting Enhancements (8 Features)

| Feature | Description | Status |
|---------|-------------|--------|
| Budget Templates | Pre-built configurations (50/30/20, envelope method, zero-based) | Pending |
| Apply Template | One-click apply a budget template | Pending |
| Annual Budgets | Set yearly budgets alongside monthly | Pending |
| Budget vs Actual Report | Historical comparison of budgeted vs spent | Pending |
| Budget Copy Forward | Clone last month's budgets with one click | Pending |
| Flexible Budget Periods | Weekly or bi-weekly budgets option | Pending |
| Budget Notes | Add notes/reminders to budget categories | Pending |
| Budget Alerts Customization | Custom threshold percentages for alerts | Pending |

---

## TIER 6: Goals & Bills Enhancements (8 Features)

### Goals

| Feature | Description | Status |
|---------|-------------|--------|
| Goal Categories | Organize goals into types (Emergency, Vacation, Education) | Pending |
| Goal Milestones | Sub-goals within a larger goal with mini-celebrations | Pending |
| Goal Auto-Contribute | Set automatic monthly contribution amounts | Pending |
| Goal Sharing | Generate shareable progress link (read-only) | Pending |

### Bills

| Feature | Description | Status |
|---------|-------------|--------|
| Bill Auto-Detection | AI suggests new bills based on transaction patterns | Pending |
| Bill Categories | Organize bills (Utilities, Subscriptions, Insurance) | Pending |
| Annual Bill Cost Calculator | Show total yearly cost of all bills | Pending |
| Bill Payment Streak | Track consecutive on-time payments | Pending |

---

## TIER 7: Reports & Analytics (8 Features)

| Feature | Description | Status |
|---------|-------------|--------|
| Custom Date Range Reports | Select any start/end date for analysis | Pending |
| Year-Over-Year Report | Compare any two years side by side | Pending |
| Merchant Spending Report | Transactions grouped by merchant name | Pending |
| Category Deep Dive | Single category analysis with trends, averages, anomalies | Pending |
| Savings Rate Dashboard | (Income - Expenses) / Income visualization | Pending |
| Monthly Summary Page | Dedicated page for comprehensive monthly view | Pending |
| PDF Report Export | Generate downloadable PDF reports | Pending |
| Tax Summary Enhancements | Better formatting, more tax categories, export | Pending |

---

## Future Considerations (v2+)

| Feature | Description | Notes |
|---------|-------------|-------|
| Receipt OCR | Scan receipts to auto-fill transactions | Spec exists at docs/receipt-ocr-spec.md |
| Multi-Currency | Support for multiple currencies | Currently CAD only |
| Multi-User/Household | Share finances with family members | Out of MVP scope |
| Investment Tracking | Advanced portfolio tracking | Beyond basic tags |
| Open Banking | Opt-in Plaid/Flinks integration | Manual-first philosophy |
| Mobile PWA | Optimized PWA with offline support | Progressive enhancement |
| Email Notifications | Bill reminders via email | Out of current scope |

---

## Known Limitations

- **Currency**: CAD only (no multi-currency support)
- **Users**: Single user only (no household sharing)
- **Bank Sync**: Manual entry only (no Plaid/Flinks integration)
- **Notifications**: In-app only (no email/push)
- **Investments**: Tag-based tracking only (no advanced features)

---

## Development Workflow

**IMPORTANT**: After implementing any feature:

1. Run `npm run build` - must pass without errors
2. Run `npm run lint` - must pass without errors
3. Update relevant documentation
4. Mark feature as complete in this file
5. Only proceed to next task after build + lint pass

---

## Implementation Notes

- All charts use **Recharts** (already installed)
- AI features use existing **AI SDK** infrastructure
- Follow existing patterns in codebase
- Each feature should be a discrete, shippable unit
- Use Zod for all validation (client + server)
- Apply RLS policies to any new tables
