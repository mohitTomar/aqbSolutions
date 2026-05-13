# FinTrack Pro — Senior Engineer Technical Assessment

A production-oriented reconciliation audit and remediation exercise for a B2B fintech platform.

This repository contains:
- Requirements clarification analysis
- Security and architecture audit
- Corrected reconciliation implementation
- Secure API improvements
- Dashboard fixes and enhancements
- AI usage journal documenting reasoning and verification

---

# Tech Stack

- TypeScript
- Next.js 15 (App Router)
- Drizzle ORM
- Tailwind CSS
- Zod

---

# Assessment Objectives

The goal of this assessment was not only to implement functionality, but to demonstrate:

- Senior-level engineering judgment
- Security awareness
- Financial systems correctness
- Compliance-oriented thinking
- Concurrency-safe backend design
- Critical evaluation of AI-generated output

---

# Repository Structure

```txt
.
├── AI_JOURNAL.md
├── AUDIT.md
├── CLARIFICATIONS.md
├── README.md
├── app
│   └── api
│       └── v1
│           └── reconcile
│               └── route.ts
├── components
│   └── reconciliation
│       └── ReconciliationDashboard.tsx
└── lib
    └── services
        └── reconciliation
            └── reconciler.ts