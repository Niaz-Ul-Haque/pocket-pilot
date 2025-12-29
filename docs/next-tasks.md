# Pocket Pilot - Feature Roadmap v1.3+

This document outlines the comprehensive feature roadmap for Pocket Pilot, organized by priority tiers.

---

## Recently Completed

### v1.3 - Complete (TIER 9 AI Features)

**TIER 9: Advanced AI Capabilities** - 11/12 Complete (1 Parked)
- Weekly AI Summary widget with auto-generation
- Monthly AI Report with PDF export capability
- AI Chat Memory (Cross-Session) with persistent preferences
- Proactive AI Notifications (budget warnings, bill reminders, savings opportunities)
- Smart Merchant Recognition with pattern matching (AMZN = Amazon, etc.)
- AI-Powered Natural Language Search ("show me coffee last month")
- Spending Prediction Accuracy Tracking with learning from corrections
- AI Financial Calendar with optimal payment scheduling
- AI Voice Commands with speech synthesis integration
- AI Learning Mode (teach AI via conversation)
- AI Export/Import for preferences and data
- Parked: Receipt OCR

### v1.2 - Complete (100+ Features Across 8 Tiers)

**TIER 8: AI Core Improvements** - 8/8 Complete
- AI Confirmation Acknowledgement Fix
- AI Tool Error Recovery (better error messages with retry suggestions)
- AI Context Memory (within session - remembers preferences)
- Quick Reply Suggestions (Yes/No/Edit buttons after AI questions)
- AI Response Improvements (financial context included)
- AI Fallback Responses (graceful handling when unsure)
- AI Request Validation (confirms before destructive/large actions)
- AI Multi-Step Action Support (handles complex multi-tool requests)
- Bug Fix: Chat history title truncation
- Bug Fix: AI expense query responses

**TIER 0: DevOps & Automation** - 11/11 Complete
- GitHub Actions CI/CD (build, lint, type check, test)
- Security scanning (npm audit, CodeQL)
- Vercel preview/production deployments
- Dependabot automated updates
- Bundle size tracking
- PR auto-labeling
- Release automation
- Git hooks (Husky + lint-staged + commitlint)
- Issue/PR templates

**TIER 1: AI Enhancements** - 21/23 Complete (2 Parked)
- Financial Health Score (0-100)
- AI Insights Widget (4 tabs: Overview, Predictions, Patterns, Alerts)
- Anomaly Detection, Spending Pattern Analysis
- Cash Flow Forecasting, Goal Predictions
- 8 New AI Chat Tools (smart_categorize, what_if_scenario, get_report, compare_periods, find_savings_opportunities, get_bill_negotiation_tips, check_unused_budgets, track_financial_habits)
- Parked: Weekly AI Summary, Monthly AI Report

**TIER 2: Data Visualization** - 15/15 Complete
- All chart types: spending trends, category breakdown, income vs expense, net worth, daily sparklines
- Budget visualizations: gauges, comparison, heatmap
- Goal visualizations: timeline, contribution chart
- Bill visualizations: calendar, summary, timeline
- Advanced: cash flow waterfall, category trends

**TIER 3: UX Improvements** - 12/12 Complete
- Keyboard shortcuts, Command palette (Cmd+K)
- Quick Add FAB, Global search
- Dark mode, Dashboard customization
- Undo/redo, Recent actions history
- Onboarding tour, Mobile PWA improvements

**TIER 4: Transaction Power Features** - 10/10 Complete
- Multi-select, Bulk operations (delete, categorize, tag)
- Auto-categorization rules with management UI
- Split transactions, Transaction templates, Transaction linking

**TIER 5: Budgeting Enhancements** - 8/8 Complete
- Budget templates (50/30/20, Envelope, Zero-Based)
- Annual budgets, Budget copy forward
- Flexible periods, Budget notes, Custom alert thresholds

**TIER 6: Goals & Bills Enhancements** - 8/8 Complete
- Goal categories, milestones, auto-contribute, sharing
- Bill auto-detection, categories, annual cost calculator, payment streaks

**TIER 7: Reports & Analytics** - 8/8 Complete
- Custom date range, Year-over-year, Merchant spending
- Category deep dive, Savings rate dashboard
- Monthly summary, PDF export, Tax summary

---

## v1.1 Legacy (Complete)

- Data export (CSV/JSON)
- Enhanced AI Tools (get_spending_trends, get_forecast, get_suggestions)
- Recurring Transactions with auto-generation
- Voice I/O (speech-to-text, text-to-speech)
- Transactions pagination (server-side, 25/page)
- Tags system with colors and filtering
- Transfer linking, Budget rollover
- Notification bell, Custom hooks, Standardized errors

---

## v1.3+ Roadmap - AI-Focused Expansion

### Priority Focus
Based on user requirements, v1.3 focuses on **making AI more robust and beneficial**. All new tiers prioritize AI enhancements, reliability, and user experience.

---

## TIER 8: AI Core Improvements (Bug Fixes & Reliability)

**Priority: CRITICAL - Implement First**

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| AI Confirmation Acknowledgement Fix | Fix: AI should respond "Done!" after user confirms and action executes | Critical | ✅ Complete |
| AI Tool Error Recovery | Better error messages when tools fail, with retry suggestions | High | ✅ Complete |
| AI Context Memory (Within Session) | Remember user preferences mentioned in conversation | High | ✅ Complete |
| Quick Reply Suggestions | Contextual reply buttons (Yes/No/Edit details) after AI questions | High | ✅ Complete |
| AI Response Streaming Improvements | Faster, smoother response streaming | Medium | ✅ Complete (via financial context) |
| AI Fallback Responses | Graceful handling when AI is unsure or can't complete | Medium | ✅ Complete |
| AI Request Validation | Validate user intent before executing destructive actions (deletes) | Medium | ✅ Complete |
| AI Multi-Step Action Support | Handle complex requests requiring multiple tool calls | Low | ✅ Complete |

Bug Fixes (TIER 8) - ✅ All Complete:
1. ✅ Chat history title truncation - titles now show "..." after 20 characters, delete icon always visible
2. ✅ AI expense query responses - financial snapshot included in system prompt for context

### Implementation Details (Completed)

**AI Confirmation Bug Fix (✅ Complete):**
- Strengthened system prompt with explicit post-tool response requirements
- Added examples of correct vs wrong behavior
- AI now must respond with "Done!" after tool execution

**Quick Reply Suggestions (✅ Complete):**
- Added contextual buttons after AI questions
- "Yes, add it" / "No, cancel" / "Edit details" for confirmation questions
- "Yes" / "No" / "Tell me more" for general questions
- Visual styling with green/red colors for Yes/No actions

**Financial Context (✅ Complete):**
- AI now receives full financial snapshot in system prompt
- Includes: account balances, this month spending, last month comparison
- Budget status, goals progress, upcoming bills
- AI can answer "how are my expenses?" without tool calls

**Error Recovery & Fallback (✅ Complete):**
- Added explicit error handling instructions to system prompt
- Common error patterns with user-friendly responses
- Fallback responses when AI is unsure

**Request Validation (✅ Complete):**
- Large amounts over $500 trigger confirmation
- Destructive actions require explicit confirmation
- Recurring transactions get additional confirmation

**Multi-Step Actions (✅ Complete):**
- System prompt includes multi-step request handling
- AI breaks down complex requests step-by-step
- Progress reporting and summary at end

---

## TIER 9: Advanced AI Capabilities

**Priority: HIGH - Complete**

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| Weekly AI Summary | Auto-generated weekly financial digest widget (PARKED from v1.2) | High | ✅ Complete |
| Monthly AI Report | Comprehensive month-end analysis with PDF export (PARKED from v1.2) | High | ✅ Complete |
| Receipt OCR | Scan receipts to auto-fill transactions (spec at docs/receipt-ocr-spec.md) | High | 🔴 Parked |
| AI Chat Memory (Cross-Session) | Remember user context across conversations | Medium | ✅ Complete |
| Proactive AI Notifications | AI initiates alerts/suggestions without user prompting | Medium | ✅ Complete |
| Smart Merchant Recognition | AI learns merchant name variations (AMZN = Amazon, UBER* = Uber) | Medium | ✅ Complete |
| AI-Powered Natural Language Search | "Show me coffee purchases last month" in search bar | Medium | ✅ Complete |
| Spending Prediction Accuracy Tracking | AI learns from corrections to improve future predictions | Medium | ✅ Complete |
| AI Financial Calendar | AI suggests optimal payment timing for bills | Low | ✅ Complete |
| AI Voice Commands | Full voice-controlled transaction entry without typing | Low | ✅ Complete |
| AI Learning Mode | User can teach AI custom categorization rules via conversation | Low | ✅ Complete |
| AI Export/Import | Export conversation context, import preferences | Low | ✅ Complete |

### Implementation Details

**Weekly AI Summary:**
- New API endpoint: `POST /api/ai-summary?type=weekly`
- Component: `WeeklyAISummaryCard` on dashboard
- Auto-generates on Monday mornings
- Content: spending recap, budget status, upcoming bills, goal progress, AI insights

**Monthly AI Report:**
- New API endpoint: `POST /api/ai-summary?type=monthly`
- Component: `MonthlyReportModal` with PDF generation
- Available first week of each month
- Content: comprehensive month analysis, charts, comparisons, recommendations

**Receipt OCR:**
- Use vision AI model (GPT-4V or Claude Vision)
- New API endpoint: `POST /api/receipts/scan`
- Component: `ReceiptScanner` with camera/file upload
- Extract: date, merchant, amount, items
- Auto-fill transaction form with extracted data

---

## TIER 10: AI-Assisted Automation

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| Smart Auto-Categorization V2 | AI learns from user corrections in real-time | High | Pending |
| Bill Detection Improvements | Better recurring pattern detection from transactions | High | Pending |
| Subscription Cancellation Helper | AI guides user through cancellation process for detected subscriptions | Medium | Pending |
| Bill Negotiation Assistant | AI provides customized scripts for negotiating specific bills | Medium | Pending |
| Budget Adjustment Recommendations | AI suggests budget changes based on spending patterns | Medium | Pending |
| Goal Auto-Adjust | AI recommends goal contribution adjustments based on cash flow | Low | Pending |
| Expense Prediction Alerts | Proactive AI warnings before big predicted expenses | Low | Pending |
| Financial Health Coaching | AI provides ongoing personalized financial guidance | Low | Pending |

### Implementation Details

**Smart Auto-Categorization V2:**
- Track user corrections to AI categorizations
- Store in `ai_learning` table: `{user_id, merchant_pattern, suggested_category, corrected_category, count}`
- After 3+ corrections, prioritize user's preference
- Integrate into `smart_categorize` tool

---

## TIER 11: AI Chat UX Enhancements

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| Conversation Templates | Pre-built prompts for common tasks (add expense, check budget, etc.) | High | Pending |
| AI Typing Indicator | Better visual feedback during AI response generation | Medium | Pending |
| Message Reactions | Thumbs up/down on AI messages for feedback | Medium | Pending |
| AI Response Formatting | Better markdown rendering with tables, charts inline | Medium | Pending |
| Conversation Search | Search through past AI conversations | Medium | Pending |
| AI Response Speed Setting | Fast (shorter) vs Detailed (longer) response toggle | Low | Pending |
| Multi-Language Support | AI responds in user's preferred language | Low | Pending |
| Conversation Pinning | Pin important conversations for quick access | Low | Pending |
| AI Personality Settings | Formal vs Casual AI communication style toggle | Low | Pending |
| Chat Export | Export conversation history as text/PDF | Low | Pending |

### Implementation Details

**Conversation Templates:**
- Floating template selector in chat
- Templates: "Add an expense", "Check my budget", "How much did I spend on X?", "Add to savings goal", "Upcoming bills"
- Clicking template pre-fills message input

---

## TIER 12: Smart Savings & AI Integration

| Feature | Description | Priority | Status |
|---------|-------------|----------|--------|
| Round-Up Savings with AI Tracking | AI tracks and reports round-up savings progress | Medium | Pending |
| AI Savings Challenges | AI generates personalized saving challenges ("No-spend weekend") | Medium | Pending |
| AI Savings Coach | Personalized savings tips based on spending analysis | Medium | Pending |
| Smart Goal Suggestions | AI suggests savings goals based on spending patterns | Low | Pending |
| AI Celebration Messages | AI celebrates milestones and achievements in chat | Low | Pending |
| Financial Streak Tracking | AI tracks consecutive days of positive financial behavior | Low | Pending |

---

## TIER 13: Security & Trust (Future - Freemium Potential)

| Feature | Description | Priority | Notes |
|---------|-------------|----------|-------|
| Two-Factor Authentication (2FA) | TOTP/Authenticator app support | Medium | User trust |
| Session Management | View and revoke active sessions | Medium | Security |
| Activity Audit Log | View all account actions with timestamps | Low | Transparency |
| Data Export & Deletion | GDPR-compliant data management | Low | Compliance |
| Privacy Dashboard | See exactly what data is stored | Low | Trust |
| API Rate Limiting | Prevent abuse of AI features | Low | Protection |

---

## TIER 14: Gamification & Engagement (Future)

| Feature | Description | Priority | Notes |
|---------|-------------|----------|-------|
| Achievement Badges | Unlock badges for financial milestones | Low | Engagement |
| Financial Streaks | Track consecutive on-budget days | Low | Motivation |
| Weekly Challenges | Personal challenges from AI | Low | Gamification |
| Progress Levels | Level up your financial health | Low | Fun |
| Milestone Celebrations | Confetti/animations for achievements | Low | Delight |
| Year in Review | Annual financial recap summary | Low | Engagement |
| Points System | Earn points for good financial behavior | Low | Incentive |
| Daily Check-in | Incentivize daily app usage | Low | Retention |

---

## TIER 15: Mobile & PWA Enhancements (Future)

| Feature | Description | Priority | Notes |
|---------|-------------|----------|-------|
| Offline Mode | Full offline functionality with sync | Medium | PWA |
| Push Notifications | Bill reminders, budget alerts via browser | Medium | Engagement |
| Quick Actions Widget | iOS/Android home screen widget | Low | Convenience |
| Swipe Actions | Swipe to delete, categorize transactions | Low | Mobile UX |
| Share Sheet Integration | Add transactions from other apps | Low | Integration |

---

## Bug Fixes & Technical Improvements

| Issue | Description | Priority | Status |
|-------|-------------|----------|--------|
| AI Confirmation Bug | AI doesn't acknowledge after user confirms action | Critical | ✅ Complete |
| Long Conversation Memory | AI loses context in very long conversations | Medium | Pending |
| Chart Performance | Memory leaks in charts with large data | Low | Pending |
| Mobile Chat UX | Chat modal hard to use on small screens | Low | Pending |
| Accessibility | Add ARIA labels to AI chat components | Low | Pending |

---

## Implementation Priority Order

### Phase 1: Critical Fixes (Do First)
1. AI Confirmation Acknowledgement Fix
2. Quick Reply Suggestions (Yes/No buttons)
3. AI Tool Error Recovery

### Phase 2: Complete Parked Features
4. Weekly AI Summary widget
5. Monthly AI Report

### Phase 3: AI Reliability
6. AI Context Memory (Within Session)
7. AI Fallback Responses
8. AI Request Validation
9. Conversation Templates

### Phase 4: Advanced AI
10. Receipt OCR
11. Smart Merchant Recognition
12. Proactive AI Notifications
13. AI-Powered Natural Language Search

### Phase 5: AI UX Polish
14. AI Response Formatting
15. Message Reactions
16. Conversation Search

### Future Phases
- Security & Trust features (potential freemium)
- Gamification features
- Mobile PWA enhancements

---

## Freemium Consideration (Future)

User mentioned potential Stripe integration with AI features behind subscription:

**Free Tier:**
- Basic AI chat (limited messages/day)
- Basic categorization
- Core financial tracking (accounts, transactions, budgets, goals, bills)
- Basic charts and reports

**Premium Tier (Future):**
- Unlimited AI chat
- Receipt OCR scanning
- Advanced AI insights and predictions
- Proactive AI notifications
- AI summaries and reports
- Cross-session AI memory
- Priority support

---

## Known Limitations (Current)

- **Currency:** CAD only (no multi-currency support)
- **Users:** Single user only (no household sharing)
- **Bank Sync:** Manual entry only (no Plaid/Flinks integration)
- **Notifications:** In-app only (no email/push)
- **Investments:** No dedicated tracking (use transactions with investment category)

---

## Development Workflow

**IMPORTANT:** After implementing any feature:

1. Run `npm run build` - must pass without errors
2. Run `npm run lint` - must pass without errors
3. Update relevant documentation
4. Mark feature as complete in this file
5. Only proceed to next task after build + lint pass

---

## Documentation Updates Required

When implementing new features, update:
- `docs/spec.md` - If new requirements
- `docs/architecture.md` - If new patterns/endpoints
- `docs/data-model.md` - If new database tables
- `docs/decision-log.md` - If architectural decisions
- `docs/PROGRESS.md` - Mark completion status
- `README.md` - If user-facing changes

---

## Notes

- Focus on making AI genuinely useful, not gimmicky
- Equal priority for mobile and desktop
- No investment tracking (users can use transactions)
- Personal/free project for now
- Keep freemium structure in mind for future monetization
- If any SQL supabe needs to be udpated/amended/added/deleted, etc, please give em the sql commans under supabase/migrations so I can go and run them in SQL Editor in supabase web console.