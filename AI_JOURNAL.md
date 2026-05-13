# AI Usage Journal

## Tool(s) used

- ChatGPT (GPT-5)
- GitHub Copilot
- TypeScript documentation
- Drizzle ORM documentation

---

# Interaction Log

| # | What I asked the AI | Quality of AI response (1-5) | Accepted? | My reasoning |
|---|---------------------|------------------------------|-----------|---------------|
| 1 | Identify security issues in the reconciliation API route | 5 | Partial | AI correctly identified SQL injection and error leakage, but I independently verified all exploit paths before documenting them. |
| 2 | Suggest improvements for financial reconciliation matching logic | 4 | Partial | AI suggested reference + amount matching, which was useful, but it initially ignored ambiguity handling and duplicate candidate detection. |
| 3 | Review monetary calculations for fintech correctness | 5 | Yes | AI correctly flagged floating-point arithmetic risk and recommended integer minor units (cents). This aligned with standard fintech engineering practices. |
| 4 | Suggest concurrency-safe reconciliation strategy | 4 | Partial | AI proposed transactions and row locking, but I refined the recommendation to include idempotency concerns and reconciliation period overlap protection. |
| 5 | Review React polling implementation for dashboard risks | 4 | Yes | AI correctly identified the missing `clearInterval()` cleanup and API contract mismatch. |
| 6 | Generate examples of PCI DSS and SOC 2 clarification questions | 3 | Partial | The initial questions were too generic. I refined them to focus on auditability, sensitive financial metadata, and retention policies. |
| 7 | Suggest discrepancy detection rules for reconciliation | 4 | Partial | AI suggested amount mismatches, but I expanded the scope to include duplicate records, ambiguous matches, unsupported currencies, and reference mismatches. |
| 8 | Review API HTTP status code correctness | 5 | Yes | AI correctly identified misuse of HTTP 500 responses for validation and authentication failures. |
| 9 | Suggest improvements to reconciliation algorithm performance | 3 | Partial | AI suggested maps/indexing for lookup optimization, but the implementation details needed refinement for deterministic matching behavior. |
| 10 | Draft examples for AI usage journal formatting | 5 | Partial | Useful structure and wording guidance, but all technical observations were independently verified before inclusion. |

---

# Reflection

## Bugs AI found correctly (that I then verified)

- SQL injection vulnerabilities in both API queries
- Floating-point precision risk in monetary calculations
- Missing authentication on financial endpoints
- Stack trace exposure in API responses
- Missing interval cleanup in React dashboard
- Incorrect API contract between frontend and backend
- Missing discrepancy population logic

---

## Bugs AI missed or got wrong

- AI initially underestimated the severity of reconciliation concurrency issues
- AI did not initially identify reconciliation idempotency concerns
- AI missed the inconsistency between exclusive date filtering in code and inclusive SQL `between()` semantics
- AI did not fully recognize auditability gaps for financial compliance
- AI initially treated duplicate transaction handling as optional instead of critical

---

## AI-generated code you rejected (with reason)

- Rejected AI suggestion to continue using floating-point numbers with rounding helpers because financial systems should avoid floating arithmetic entirely.
- Rejected AI suggestion to auto-match transactions using amount-only fallback logic because it increases false-positive reconciliation risk.
- Rejected AI suggestion to silently skip unsupported currencies because this could hide operational reconciliation issues.
- Rejected AI-generated generic `try/catch` wrappers that swallowed operational errors without structured logging.

---

## The moment you most doubted the AI output and how you verified it

I most doubted the AI recommendation around date filtering and SQL range behavior.  
The AI treated application-level date filtering and SQL `between()` semantics as equivalent. I independently verified that SQL `between` is typically inclusive on both boundaries, which could create reconciliation overlap bugs across adjacent reporting periods.

---

## What you know that the AI does not (domain/architecture insight the AI could not have)

Financial reconciliation systems prioritize deterministic and auditable behavior over aggressive automation.  
A technically “efficient” matching algorithm is not necessarily operationally safe if it increases false-positive reconciliation risk or weakens audit traceability.

Additionally, PCI DSS and SOC 2 concerns affect implementation details beyond code correctness, including logging, error handling, data retention, and operational accountability.