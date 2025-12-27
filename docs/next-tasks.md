# Pocket Pilot - Next Tasks & Roadmap

This document tracks upcoming improvements, features, and technical debt for Pocket Pilot.

---

## Recently Completed

- [x] **CRITICAL**: Fixed bill creation via AI chat (field name mismatch)
- [x] Fixed chat modal sidebar overflow with proper height constraints
- [x] Improved AI confirmation handling with explicit confirmation word detection
- [x] Updated README.md with full setup documentation
- [x] Notification bell in navbar with badge count for bills + budgets
- [x] Data export (CSV/JSON) with download functionality
- [x] Budget rollover toggle and calculation logic
- [x] Transfer linking between accounts with paired transactions
- [x] Tags system with full API (migrations, validators, routes)
- [x] **Tags System UI**: Tag management modal, tag picker, colored badges, tag filtering
- [x] **Transfer Linking UI**: Linked account display, paired delete for transfers
- [x] **Budget Rollover Display**: Rollover badge, effective budget calculation
- [x] **Enhanced AI Tools (v1.1)**: get_spending_trends, get_forecast, get_suggestions tools
- [x] **Recurring Transactions (v1.1)**: Full CRUD, dashboard page, generate endpoint, AI tool
- [x] **Custom Hooks + Error Handling**: useApiQuery, useApiMutation, useFormErrors, src/lib/errors.ts
- [x] **Voice Input (v1.1)**: Speech-to-text for AI chat using Web Speech API
- [x] **Voice Output (v1.1)**: TTS for AI responses with auto-speak toggle, per-message playback
- [x] **Transactions Pagination**: Server-side pagination with 25 items/page, filter integration

---

## Pending UI Enhancements

All UI enhancements completed! See "Recently Completed" section above.

---

## v1.1 Features (In Scope)

| Feature | Description | Status |
|---------|-------------|--------|
| Data Export | Export transactions to CSV/JSON | Done |
| Enhanced AI Tools | Spending trends, forecasts, suggestions | Done |
| Recurring Transactions | Auto-create transactions on schedule | Done |
| Voice Input | Speech-to-text for AI chat | Done |
| Voice Output | "Let AI talk" setting for TTS | Done |

**v1.1 is now complete!**

### Removed from v1.1
- ~~Email Notifications~~ - Out of scope
- ~~Dark Mode~~ - Out of scope

---

## v2+ Roadmap (Adjusted Scope)

| Feature | Description | Status |
|---------|-------------|--------|
| Receipt OCR | Scan receipts to auto-fill transactions | Document Only (see docs/receipt-ocr-spec.md) |
| Investment Tracking | Minimal - use tags for categorization | Minimal |

### Removed from v2+
- ~~Open Banking / Plaid / Flinks~~ - Not interested in sync features
- ~~Multi-Currency~~ - CAD only
- ~~Multi-User~~ - On hold
- ~~Mobile App~~ - Parked

---

## Technical Debt

| Item | Description | Priority |
|------|-------------|----------|
| Custom Hooks | Create reusable hooks in `src/hooks/` | ✅ Done |
| Error Handling | Standardize API error responses | ✅ Done |
| Pagination | Add pagination to transactions list | ✅ Done |
| Rate Limiting | Add rate limiting to chat/import | Low - Backlog |
| Test Coverage | Add unit tests for validators and utilities | Low - Backlog |
| E2E Tests | Add Playwright tests for critical flows | Low - Backlog |

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
4. Only proceed to next task after build + lint pass

---

## Contributing

When implementing new features:

1. Follow patterns in existing code
2. Use Zod for all validation
3. Add RLS policies for new tables
4. Update relevant docs
5. Test with multiple user scenarios
6. Run build + lint before marking complete
