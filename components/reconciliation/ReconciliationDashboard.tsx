'use client'

import { useEffect, useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { Button } from '@/components/ui/button'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ReconciliationRun {
  id: string
  periodStart: string
  periodEnd: string
  matchedCount: number
  unmatchedCount: number
  difference: number
  status: 'pending' | 'running' | 'complete' | 'failed' | 'requires_review'
  createdAt: string
}

export function ReconciliationDashboard() {
  const [runs, setRuns] = useState<ReconciliationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadRuns = async () => {
      try {
        const response = await fetch('/api/v1/reconcile')

        if (!response.ok) {
          throw new Error('Failed to fetch reconciliation runs')
        }

        const data = await response.json()

        if (mounted) {
          setRuns(data.runs ?? [])
          setError(null)
        }
      } catch (err) {
        console.error(err)

        if (mounted) {
          setError('Unable to load reconciliation runs')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadRuns()

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadRuns()
      }
    }, 3000)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))
  }

  const badgeClass: Record<
    ReconciliationRun['status'],
    string
  > = {
    pending: 'bg-yellow-100 text-yellow-800',
    running: 'bg-blue-100 text-blue-800',
    complete: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    requires_review: 'bg-orange-100 text-orange-800',
  }

  const summary = useMemo(() => {
    const now = new Date()

    const monthlyRuns = runs.filter(run => {
      const createdAt = new Date(run.createdAt)

      return (
        createdAt.getMonth() === now.getMonth() &&
        createdAt.getFullYear() === now.getFullYear()
      )
    })

    const totalDiscrepancy = runs.reduce((sum, run) => {
      return sum + run.difference
    }, 0)

    return {
      totalRunsThisMonth: monthlyRuns.length,
      totalDiscrepancy,
    }
  }, [runs])

  return (
    <div className="p-6 space-y-6">

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <Card>
          <CardHeader>
            <CardTitle>Total Runs This Month</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {summary.totalRunsThisMonth}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Discrepancy Amount</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold">
              {formatAmount(summary.totalDiscrepancy)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>

          <CardContent>
            <Button
              disabled
              title="Manual trigger UI not implemented in assessment scope"
              className="w-full"
            >
              Trigger New Reconciliation
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reconciliation Runs</CardTitle>
        </CardHeader>

        <CardContent>

          {error && (
            <div className="mb-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-gray-500">
              Loading reconciliation runs...
            </div>
          ) : (
            <Table>

              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Matched</TableHead>
                  <TableHead>Unmatched</TableHead>
                  <TableHead>Discrepancy</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>

                {runs.map(run => (
                  <TableRow key={run.id}>

                    <TableCell>
                      {formatDate(run.periodStart)} —{' '}
                      {formatDate(run.periodEnd)}
                    </TableCell>

                    <TableCell>
                      {run.matchedCount}
                    </TableCell>

                    <TableCell>
                      {run.unmatchedCount}
                    </TableCell>

                    <TableCell>
                      {formatAmount(run.difference)}
                    </TableCell>

                    <TableCell>
                      <Badge
                        className={badgeClass[run.status]}
                      >
                        {run.status}
                      </Badge>
                    </TableCell>

                  </TableRow>
                ))}

              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}