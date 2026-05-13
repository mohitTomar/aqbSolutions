# CLARIFICATIONS.md

## Task 1 — Requirements Clarification

Below is the list of ambiguities and unanswered questions I identified from the client brief before writing code.

---

### 1. What does “properly matched” mean in terms of business rules?

- **Exact quote from the brief**:  
  > "Payments need to be properly matched against the bank records"

- **Interpretation / assumed answer**:  
  I assume matching should not be based on amount alone. A valid match should primarily use a stable business identifier such as `reference` or `externalRef`, with `amount`, `currency`, and date/period used as validation signals. If reference matches but amount differs, that should likely be treated as a discrepancy, not a successful match.

- **Why I chose this interpretation over alternatives**:  
  In payment reconciliation, amount-only matching creates false positives very easily. Since the bank record and internal payment model both contain reference-like identifiers, using those as primary keys is the safer and more realistic assumption.

---

### 2. What exactly counts as a “discrepancy” versus an “unmatched item”?

- **Exact quote from the brief**:  
  > "Produce a reconciliation report: matched pairs, unmatched items, and discrepancies"

- **Interpretation / assumed answer**:  
  I assume:
  - **Matched** = one bank record confidently corresponds to one internal payment and all required validation fields agree
  - **Discrepancy** = there is a likely corresponding payment, but one or more important fields differ, such as amount, currency, or date tolerance
  - **Unmatched** = no credible counterpart exists on the other side

- **Why I chose this interpretation over alternatives**:  
  The brief separates unmatched items from discrepancies, which implies they are not the same outcome. In reconciliation systems, discrepancies usually represent partial alignment with a data mismatch, while unmatched means no usable correlation was found.

---

### 3. What is the required date matching rule?

- **Exact quote from the brief**:  
  > "Match them against internal payment records for a given period"

- **Interpretation / assumed answer**:  
  I assume the reporting period is used to limit the candidate set, but date equality is not necessarily required for the final match. A payment and a bank settlement may occur on nearby timestamps, so a match can still be valid if identifiers and amounts align even when timestamps are not identical.

- **Why I chose this interpretation over alternatives**:  
  In real payment systems, settlement date and internal creation date often differ. If strict timestamp equality were required, many valid matches would be incorrectly classified as unmatched or discrepant.

---

### 4. Is the period end inclusive or exclusive?

- **Exact quote from the brief**:  
  > "for a given period"

- **Interpretation / assumed answer**:  
  I assume the period should be treated as start inclusive and end exclusive, meaning:  
  `periodStart <= timestamp < periodEnd`

- **Why I chose this interpretation over alternatives**:  
  Exclusive end boundaries are safer for reporting windows and avoid double counting when periods are chained back to back. This is also a common engineering convention for time-range processing.

---

### 5. Should reconciliation be one-to-one only?

- **Exact quote from the brief**:  
  > "Match them against internal payment records"

- **Interpretation / assumed answer**:  
  I assume the feature expects **one bank record to match at most one internal payment**, and one payment should only be consumed once within a reconciliation run.

- **Why I chose this interpretation over alternatives**:  
  The brief describes basic batch reconciliation, not split settlement, aggregation, or many-to-one remittance logic. Since no advanced matching scenarios are mentioned, one-to-one matching is the safest assumption for the current scope.

---

### 6. Which payment statuses are eligible for reconciliation?

- **Exact quote from the brief**:  
  > "Match them against internal payment records"

- **Interpretation / assumed answer**:  
  I assume only payments that are not already reconciled should be eligible, and disputed records should either be excluded or surfaced separately based on business policy. Pending and cleared payments seem like likely candidates, while already reconciled records should not be matched again.

- **Why I chose this interpretation over alternatives**:  
  Re-reconciling previously reconciled payments would create data integrity issues. The presence of multiple statuses in the model strongly suggests that status should influence eligibility.

---

### 7. What level of historical persistence is required for past runs?

- **Exact quote from the brief**:  
  > "Persist the reconciliation run to the database"  
  > "Display past reconciliation runs in a dashboard"

- **Interpretation / assumed answer**:  
  I assume persisting only aggregate counts is not enough if users need to review past discrepancies. The system should persist both:
  - a **run header** with summary information
  - **run details** for matched items, unmatched items, and discrepancies

- **Why I chose this interpretation over alternatives**:  
  A dashboard that only shows counts is useful for monitoring, but not for finance review. Since the brief explicitly says discrepancies should be reviewable, historical detail persistence is the more reasonable expectation.

---

### 8. What does “real-time” mean operationally?

- **Exact quote from the brief**:  
  > "The system should do reconciliation in real-time — we can't wait for a nightly job"

- **Interpretation / assumed answer**:  
  I assume “real-time” here means **request-driven near-real-time execution**, where reconciliation happens immediately when a batch is uploaded, not asynchronous overnight processing. I do not assume streaming or event-by-event reconciliation unless explicitly requested.

- **Why I chose this interpretation over alternatives**:  
  The core workflow still starts from a batch upload, so synchronous or near-synchronous execution fits the scenario better than full streaming architecture.

---

### 9. How should multi-currency support be treated if current scope is USD only?

- **Exact quote from the brief**:  
  > "We handle multiple currencies but for now just focus on USD"

- **Interpretation / assumed answer**:  
  I assume the implementation should enforce strict currency equality and behave correctly for USD now, while keeping the code structure extensible so that other currencies can be introduced later without major redesign.

- **Why I chose this interpretation over alternatives**:  
  Ignoring currency entirely would be unsafe, while building full FX conversion logic would exceed stated scope. USD-first with currency-aware design is the most balanced interpretation.

---

### 10. What should happen if two reconciliation requests run for the same period at the same time?

- **Exact quote from the brief**:  
  > "The system should do reconciliation in real-time"

- **Interpretation / assumed answer**:  
  I assume concurrent reconciliation of the same eligible records must not allow the same payment to be marked reconciled twice or produce inconsistent run results. The implementation should therefore be concurrency-safe, likely via transactional updates or conditional state transitions.

- **Why I chose this interpretation over alternatives**:  
  Real-time systems frequently encounter overlapping user actions. Since this is a fintech workflow affecting financial state, concurrency safety is a business-critical engineering requirement even if not spelled out directly.

---

### 11. What should the dashboard show: list of all runs, only recent runs, or drill-down details?

- **Exact quote from the brief**:  
  > "Display past reconciliation runs in a dashboard"

- **Interpretation / assumed answer**:  
  I assume the minimum requirement is a list of historical runs with summary metrics and status, but that useful finance workflows would also need a way to inspect the details of a specific run, especially discrepancies.

- **Why I chose this interpretation over alternatives**:  
  A dashboard usually implies historical visibility, but “display past runs” is vague on whether summary-only is sufficient. Given the review requirement for discrepancies, I assume summary listing is minimum viable behavior and detail inspection is likely expected next.

---

### 12. What should be returned to the caller when the request is invalid or unauthorized?

- **Exact quote from the brief**:  
  > "Fix all security and correctness issues"  
  > "Authenticate the request"

- **Interpretation / assumed answer**:  
  I assume the API should return:
  - `401` for unauthenticated requests
  - `400` for malformed request payloads
  - `200` or `201` for successful processing depending on whether the route is treated as creation of a run resource
  - `500` only for unexpected server failures, without leaking internal details

- **Why I chose this interpretation over alternatives**:  
  These semantics align with standard HTTP behavior and are important for security, observability, and client correctness.

---

## Compliance-related question

### 13. What data from bank records is allowed to be stored long term under PCI DSS Level 1 and SOC 2 constraints?

- **Exact quote from the brief**:  
  > "Compliance is critical — we're PCI DSS Level 1 and SOC 2 certified"

- **Interpretation / assumed answer**:  
  I assume we should minimize persisted sensitive data, avoid storing anything unnecessary from raw bank payloads, and treat fields like `description` and `reference` as potentially sensitive until classified. Auditability is required, but it should be balanced with least-privilege data retention.

- **Why I chose this interpretation over alternatives**:  
  PCI DSS and SOC 2 do not just affect infrastructure, they also affect what data is retained, how it is accessed, and how much detail is exposed in logs, APIs, and dashboards. Because the brief emphasizes compliance, this is a question I would explicitly raise early.

---

## One question I would NOT ask the client

### 14. “Should the polling interval on the dashboard be 3 seconds, 5 seconds, or 10 seconds?”

- **Why I would not ask this**:  
  This is an engineering decision, not a product decision. The product need is that the dashboard reflects recent reconciliation activity. The exact polling interval should be chosen based on system load, expected update frequency, UX needs, and whether push-based updates exist. I would make a reasonable default choice, document it, and adjust if real usage or performance data suggests otherwise.

- **Why this is not a product decision**:  
  The client cares that the dashboard feels current and reliable. The transport mechanism and refresh cadence are implementation details unless they directly affect user-visible requirements or operating cost constraints.

---

## Final assumptions I would proceed with if no clarification is available

1. Matching is one-to-one.
2. Matching uses reference first, then validates amount, currency, and date/period.
3. Amount-only matching is not acceptable.
4. Discrepancies are partial matches with conflicting fields.
5. Reporting period is start inclusive and end exclusive.
6. USD is the only supported currency for current implementation, but currency must still be validated.
7. Reconciled payments must not be matched again.
8. Reconciliation runs must be safe under concurrent requests.
9. API responses must not expose internal stack traces or raw SQL errors.
10. Historical runs should persist enough information to support dashboard review, especially for discrepancies.
