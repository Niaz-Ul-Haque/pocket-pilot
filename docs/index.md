# Documentation Index

## Purpose

This is the **central navigation hub** for all project documentation. Use this file to find the right document for any task, whether you're implementing features, reviewing requirements, or updating the codebase.

## How to Use This Doc

1. **New to the project?** â†’ Start with `spec.md` for requirements, then `architecture.md` for technical context
2. **Implementing a feature?** â†’ Check `spec.md` for acceptance criteria, `data-model.md` for schema
3. **Making technical decisions?** â†’ Review `decision-log.md` for prior art, add new decisions there
4. **Unsure about terminology?** â†’ Consult `glossary.md`
5. **Planning work?** â†’ See `roadmap.md` for milestones and backlog

---

## Documentation Map

| Document | Description | When to Read |
|----------|-------------|--------------|
| [spec.md](./spec.md) | **Requirements & Acceptance Criteria** â€” Problem statement, scope, functional/non-functional requirements, user stories, constraints | Before implementing ANY feature |
| [architecture.md](./architecture.md) | **Technical Architecture** â€” Stack decisions, component boundaries, security model, AI integration | When making technical decisions or onboarding |
| [data-model.md](./data-model.md) | **Database Schema** â€” Tables, fields, relationships, RLS policies, indexes | When working with database or APIs |
| [roadmap.md](./roadmap.md) | **Build Plan & Backlog** â€” MVP milestones, future versions, deferred features | When planning sprints or prioritizing work |
| [decision-log.md](./decision-log.md) | **Architecture Decision Records** â€” Key decisions with context and rationale | Before making significant technical changes |
| [glossary.md](./glossary.md) | **Terminology Definitions** â€” Finance, tech, and product-specific terms | When encountering unfamiliar terms |
| [PROGRESS.md](./PROGRESS.md) | **Implementation Progress** â€” Story completion status, component audit, feature checklist | When checking what's done or auditing codebase |
| [next-tasks.md](./next-tasks.md) | **Next Tasks & Roadmap** â€” Upcoming features, technical debt, known limitations | When planning next work items |
| [devops.md](./devops.md) | **DevOps & Automation** ƒ?" Local hooks, CI/CD workflows, and deployment automation | When understanding automation behavior |
| [receipt-ocr-spec.md](./receipt-ocr-spec.md) | **Receipt OCR Specification** ƒ?" v2 feature design document (not implemented) | When planning v2 features |
| [../.claude/CLAUDE.md](../.claude/CLAUDE.md) | **AI Assistant Instructions** â€” Rules for Claude/Copilot when implementing | Always consult before code changes |

---

## Quick Reference: If You're Changing X, Update Y

| If you're changing... | Update these docs... |
|-----------------------|----------------------|
| Database schema (tables, fields, indexes) | `data-model.md`, possibly `spec.md` if requirements changed |
| API contracts or endpoints | `architecture.md` (API section), `spec.md` (if behavior changes) |
| Authentication or security | `architecture.md` (Security section), `spec.md` (Privacy requirements) |
| AI assistant behavior | `spec.md` (AI stories), `architecture.md` (AI section) |
| UI flows or user stories | `spec.md` (User Stories section) |
| Tech stack or dependencies | `architecture.md`, `decision-log.md` (add new ADR) |
| Build milestones or backlog | `roadmap.md` |
| New terminology or concepts | `glossary.md` |

---

## Reading Order for New Contributors

1. **`glossary.md`** â€” Get familiar with terminology (5 min)
2. **`spec.md`** â€” Understand what we're building and why (30 min)
3. **`architecture.md`** â€” Understand how it's built (20 min)
4. **`data-model.md`** â€” Understand the data structure (15 min)
5. **`roadmap.md`** â€” Understand the build plan (10 min)
6. **`decision-log.md`** â€” Understand key decisions (10 min)
7. **`PROGRESS.md`** â€” See current implementation status (10 min)
8. **`next-tasks.md`** â€” See upcoming work and known limitations (5 min)
9. **`.claude/CLAUDE.md`** â€” Rules for AI-assisted development (5 min)

---

## Resolved Questions

All initial open questions have been resolved. See `docs/spec.md` **Resolved Questions** section and `docs/decision-log.md` for the full list of decisions.

---

## Traceability

This document structure is derived from:
- **Source MD Section**: "Scope and MVP Definition" â€” defines what documentation is needed
- **Source MD Section**: "User Stories and Requirements" â€” informs spec.md structure
- **Source MD Section**: "Recommended Tech Stack & Architecture" â€” informs architecture.md
- **Source MD Section**: "Data Model" â€” informs data-model.md
- **Source MD Section**: "Build Plan" â€” informs roadmap.md

