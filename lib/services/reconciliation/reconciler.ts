import { and, eq, gte, lt, inArray, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { payments, reconciliations } from '@/lib/db/schema'

export interface BankRecord {
  transactionId: string
  amount: number
  currency: string
  valueDate: string
  description: string
  reference: string
}

export interface Payment {
  id: string
  externalRef: string
  amount: number
  currency: string
  createdAt: Date
  status: 'pending' | 'cleared' | 'reconciled' | 'disputed'
}

export interface ReconciliationResult {
  id: string
  matched: MatchedPair[]
  unmatched: {
    bankOnly: BankRecord[]
    systemOnly: Payment[]
  }
  discrepancies: Discrepancy[]
  summary: {
    totalBankAmount: number
    totalSystemAmount: number
    difference: number
  }
}

export interface MatchedPair {
  bankRecord: BankRecord
  payment: Payment
}

export interface Discrepancy {
  bankRecord: BankRecord
  payment?: Payment
  reason: string
  amountDelta: number
}

function toCents(amount: number): number {
  return Math.round(amount * 100)
}

function fromCents(cents: number): number {
  return cents / 100
}

/**
 * Normalize bank timestamps to UTC.
 * Reject invalid timestamps early.
 */
function parseBankDate(value: string): Date {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid bank date: ${value}`)
  }

  return parsed
}

/**
 * Inclusive start, exclusive end.
 */
function isInPeriod(
  date: Date,
  periodStart: Date,
  periodEnd: Date,
): boolean {
  return date >= periodStart && date < periodEnd
}

/**
 * Matching strategy:
 * 1. Exact reference match
 * 2. Exact amount match
 * 3. Exact currency match
 * 4. Date must fall inside reconciliation period
 *
 * We intentionally avoid amount-only matching because
 * multiple payments can legitimately share the same amount.
 */
function findMatch(
  bankRecord: BankRecord,
  candidates: Payment[],
): Payment | undefined {
  return candidates.find(payment => {
    return (
      payment.externalRef === bankRecord.reference &&
      payment.currency === bankRecord.currency &&
      toCents(payment.amount) === toCents(bankRecord.amount)
    )
  })
}

export async function reconcilePayments(
  bankData: BankRecord[],
  periodStart: Date,
  periodEnd: Date,
): Promise<ReconciliationResult> {
  return await db.transaction(async tx => {
    /**
     * Concurrency protection:
     * lock candidate rows during reconciliation.
     */
    await tx.execute(sql`
      SELECT id
      FROM payments
      WHERE created_at >= ${periodStart}
      AND created_at < ${periodEnd}
      FOR UPDATE
    `)

    const systemPayments = await tx
      .select()
      .from(payments)
      .where(
        and(
          gte(payments.createdAt, periodStart),
          lt(payments.createdAt, periodEnd),
        ),
      )

    const filteredBankRecords: BankRecord[] = []
    const matched: MatchedPair[] = []
    const discrepancies: Discrepancy[] = []

    const matchedPaymentIds = new Set<string>()
    const matchedBankIds = new Set<string>()
    const duplicateBankIds = new Set<string>()

    const seenBankIds = new Set<string>()

    /**
     * Validate duplicates and period.
     */
    for (const record of bankData) {
      const parsedDate = parseBankDate(record.valueDate)

      if (!isInPeriod(parsedDate, periodStart, periodEnd)) {
        continue
      }

      if (record.currency !== 'USD') {
        discrepancies.push({
          bankRecord: record,
          reason: 'Unsupported currency',
          amountDelta: 0,
        })

        continue
      }

      if (seenBankIds.has(record.transactionId)) {
        duplicateBankIds.add(record.transactionId)

        discrepancies.push({
          bankRecord: record,
          reason: 'Duplicate bank transaction',
          amountDelta: 0,
        })

        continue
      }

      seenBankIds.add(record.transactionId)
      filteredBankRecords.push(record)
    }

    for (const bankRecord of filteredBankRecords) {
      const availablePayments = systemPayments.filter(payment => {
        return (
          !matchedPaymentIds.has(payment.id) &&
          payment.status !== 'reconciled'
        )
      })

      const match = findMatch(bankRecord, availablePayments)

      if (!match) {
        discrepancies.push({
          bankRecord,
          reason: 'No matching payment found',
          amountDelta: bankRecord.amount,
        })

        continue
      }

      const amountDelta =
        toCents(bankRecord.amount) - toCents(match.amount)

      if (amountDelta !== 0) {
        discrepancies.push({
          bankRecord,
          payment: match,
          reason: 'Amount mismatch',
          amountDelta: fromCents(amountDelta),
        })

        continue
      }

      matched.push({
        bankRecord,
        payment: match,
      })

      matchedPaymentIds.add(match.id)
      matchedBankIds.add(bankRecord.transactionId)
    }

    /**
     * Batch reconcile matched payments.
     */
    if (matchedPaymentIds.size > 0) {
      await tx
        .update(payments)
        .set({
          status: 'reconciled',
        })
        .where(
          inArray(payments.id, Array.from(matchedPaymentIds)),
        )
    }

    const bankOnly = filteredBankRecords.filter(record => {
      return !matchedBankIds.has(record.transactionId)
    })

    const systemOnly = systemPayments.filter(payment => {
      return !matchedPaymentIds.has(payment.id)
    })

    const totalBankAmountCents = filteredBankRecords.reduce(
      (sum, record) => sum + toCents(record.amount),
      0,
    )

    const totalSystemAmountCents = systemPayments.reduce(
      (sum, payment) => sum + toCents(payment.amount),
      0,
    )

    const differenceCents =
      totalBankAmountCents - totalSystemAmountCents

    const [savedRun] = await tx
      .insert(reconciliations)
      .values({
        periodStart,
        periodEnd,
        matchedCount: matched.length,
        unmatchedCount: bankOnly.length + systemOnly.length,
        totalBankAmount: fromCents(totalBankAmountCents),
        totalSystemAmount: fromCents(totalSystemAmountCents),
        difference: fromCents(differenceCents),
        status: discrepancies.length > 0
          ? 'requires_review'
          : 'complete',
      })
      .returning()

    return {
      id: savedRun.id,
      matched,
      unmatched: {
        bankOnly,
        systemOnly,
      },
      discrepancies,
      summary: {
        totalBankAmount: fromCents(totalBankAmountCents),
        totalSystemAmount: fromCents(totalSystemAmountCents),
        difference: fromCents(differenceCents),
      },
    }
  })
}