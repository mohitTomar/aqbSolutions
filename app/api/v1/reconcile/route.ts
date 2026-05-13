import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { reconciliations } from '@/lib/db/schema'
import {
  reconcilePayments,
  BankRecord,
} from '@/lib/services/reconciliation/reconciler'

import { getSession } from '@/lib/auth'

const ReconcileRequestSchema = z.object({
  bankData: z.array(
    z.object({
      transactionId: z.string().min(1),
      amount: z.number().finite(),
      currency: z.literal('USD'),
      valueDate: z.string().datetime(),
      description: z.string(),
      reference: z.string(),
    }),
  ).min(1).max(5000),

  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  notes: z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const body = await req.json()

    const parsed = ReconcileRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request payload',
          details: parsed.error.flatten(),
        },
        { status: 400 },
      )
    }

    const result = await reconcilePayments(
      parsed.data.bankData as BankRecord[],
      new Date(parsed.data.periodStart),
      new Date(parsed.data.periodEnd),
    )

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Reconciliation failed', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(req.url)

    const id = searchParams.get('id')

    if (id) {
      const run = await db.query.reconciliations.findFirst({
        where: eq(reconciliations.id, id),
      })

      if (!run) {
        return NextResponse.json(
          { error: 'Reconciliation run not found' },
          { status: 404 },
        )
      }

      return NextResponse.json(
        {
          run,
        },
        { status: 200 },
      )
    }

    const runs = await db.query.reconciliations.findMany({
      orderBy: [desc(reconciliations.createdAt)],
      limit: 50,
    })

    return NextResponse.json(
      {
        runs,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Failed to fetch reconciliation runs', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    )
  }
}