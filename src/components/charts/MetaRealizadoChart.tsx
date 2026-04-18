import React, { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface Props {
  data: Array<{ period: string; planned_value: number; achieved_value: number }>
  /** Chart height in px. Defaults to 280. */
  height?: number
  /** Optional unit suffix appended to tooltip values. */
  unit?: string
  /** Empty-state message when data is empty. */
  emptyHint?: string
  /**
   * Show projected bars for future months based on average monthly achievement.
   * A summary chip is shown below the chart indicating if the target will be met.
   * Default: true.
   */
  showProjection?: boolean
  /**
   * Task aggregation type. Changes how the projection chip is computed:
   * - SUM_UP / SUM_DOWN: cumulative projection (default behaviour)
   * - AVG / MANUAL: monthly-average projection — projectedFinal = avgMonthly,
   *   compared against taskTargetValue (not the sum of monthly planned values).
   */
  aggregationType?: string
  /** Task-level target value — used for projection comparison on AVG/MANUAL tasks. */
  taskTargetValue?: number
  /** Task-level start value — used to detect reduction direction on AVG/MANUAL tasks. */
  taskStartValue?: number
  /**
   * Explicit reduction flag — when true, lower projected values are considered
   * "reaching the target". Takes precedence over the taskStartValue inference.
   */
  isReduction?: boolean
}

function periodLabel(p: string): string {
  if (!p || p.length < 7) return p
  const date = new Date(`${p}-01`)
  if (isNaN(date.getTime())) return p
  return date.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' })
}

const ChartTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null
  const planned   = payload.find((p: any) => p.dataKey === 'planned_value')
  const achieved  = payload.find((p: any) => p.dataKey === 'achieved_value')
  const projected = payload.find((p: any) => p.dataKey === 'projected_value')
  const p  = Number(planned?.value   ?? 0)
  const a  = Number(achieved?.value  ?? 0)
  const pr = Number(projected?.value ?? 0)
  const pct = p > 0 ? Math.round((a / p) * 1000) / 10 : 0
  return (
    <div style={{
      background: 'var(--color-surface-strong)',
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: 'var(--shadow-soft)',
      minWidth: 160,
    }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>{label}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#cbd5e1', display: 'inline-block' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flex: 1 }}>Meta</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
          {p.toLocaleString('pt-PT')}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: pr > 0 ? 4 : 0 }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: '#e8670a', display: 'inline-block' }} />
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flex: 1 }}>Realizado</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#e8670a' }}>
          {a.toLocaleString('pt-PT')}{unit ? ` ${unit}` : ''}
        </span>
      </div>
      {pr > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#e8670a', opacity: 0.35, display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flex: 1 }}>Projecção</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: '#e8670a', opacity: 0.6 }}>
            {Math.round(pr).toLocaleString('pt-PT')}{unit ? ` ${unit}` : ''}
          </span>
        </div>
      )}
      {p > 0 && (
        <div style={{ fontSize: 11, fontWeight: 700, color: pct >= 90 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626', marginTop: 6, borderTop: '1px solid var(--color-border)', paddingTop: 6 }}>
          Execução: {pct.toFixed(1)}%
        </div>
      )}
    </div>
  )
}

export default function MetaRealizadoChart({ data, height = 280, unit, emptyHint, showProjection = true, aggregationType, taskTargetValue, taskStartValue, isReduction }: Props) {
  const now = new Date()
  const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const rows = useMemo(() => (data ?? []).map(r => ({
    label:          periodLabel(r.period),
    period:         r.period,
    planned_value:  Number(r.planned_value  ?? 0),
    achieved_value: Number(r.achieved_value ?? 0),
  })), [data])

  // Average monthly achieved from completed months that have data
  const pastWithData = useMemo(
    () => rows.filter(r => r.period < currentPeriod && r.achieved_value > 0),
    [rows, currentPeriod],
  )
  const avgMonthly = pastWithData.length > 0
    ? pastWithData.reduce((s, r) => s + r.achieved_value, 0) / pastWithData.length
    : 0

  // Enrich rows: future months with no data get a projected_value bar
  const enriched = useMemo(() => rows.map(r => ({
    ...r,
    projected_value:
      showProjection && r.period > currentPeriod && r.achieved_value === 0 && avgMonthly > 0
        ? avgMonthly
        : 0,
  })), [rows, showProjection, currentPeriod, avgMonthly])

  // Projection summary
  const totalPlanned    = rows.reduce((s, r) => s + r.planned_value,  0)
  const alreadyAchieved = rows.reduce((s, r) => s + r.achieved_value, 0)
  const futureMonths    = rows.filter(r => r.period > currentPeriod).length
  const hasProjection   = showProjection && avgMonthly > 0 && futureMonths > 0

  // For AVG / MANUAL tasks the monthly rows represent RATES (e.g. loss %) not
  // cumulative totals. The "final projection" is the expected average rate per
  // month (≈ avgMonthly), compared against the task-level target value.
  // For SUM_UP / SUM_DOWN the projection is the running cumulative total.
  const isAveraging = aggregationType === 'AVG' || aggregationType === 'MANUAL'

  const projectedFinal = isAveraging
    ? avgMonthly                                         // projected monthly RATE
    : alreadyAchieved + avgMonthly * futureMonths        // cumulative SUM

  // willReach: for averaging tasks use taskTargetValue + direction awareness
  const willReach = (() => {
    if (isAveraging && taskTargetValue != null && taskTargetValue > 0) {
      // isReduction can be supplied explicitly; fall back to inferring from start value
      const reducingDirection = isReduction ?? (taskStartValue != null && taskTargetValue < taskStartValue)
      return reducingDirection
        ? projectedFinal <= taskTargetValue   // lower is better
        : projectedFinal >= taskTargetValue   // higher is better
    }
    // Default SUM_UP / SUM_DOWN behaviour
    return totalPlanned > 0 && projectedFinal >= totalPlanned
  })()

  if (rows.length === 0) {
    return (
      <div style={{
        padding: 24,
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--color-text-muted)',
        background: 'var(--color-surface-muted)',
        borderRadius: 10,
        border: '1px dashed var(--color-border)',
      }}>
        {emptyHint ?? 'Sem metas mensais definidas para este período.'}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={enriched} margin={{ top: 14, right: 16, left: 0, bottom: 4 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--color-text)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip cursor={{ fill: 'rgba(232,103,10,0.05)' }} content={<ChartTooltip unit={unit} />} />
          <Legend
            iconType="circle"
            iconSize={9}
            wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 6 }}
            formatter={(value: string) => {
              if (value === 'planned_value')   return 'Meta'
              if (value === 'achieved_value')  return 'Realizado'
              if (value === 'projected_value') return 'Projecção'
              return value
            }}
          />
          <Bar dataKey="planned_value"   name="planned_value"   fill="#cbd5e1"  radius={[4, 4, 0, 0]} barSize={14} />
          <Bar dataKey="achieved_value"  name="achieved_value"  fill="#e8670a"  radius={[4, 4, 0, 0]} barSize={14} />
          {hasProjection && (
            <Bar dataKey="projected_value" name="projected_value" fill="#e8670a" fillOpacity={0.28} radius={[4, 4, 0, 0]} barSize={14} />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Projection summary chip */}
      {hasProjection && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: '7px 14px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          background: willReach ? 'var(--color-traffic-green-bg)' : 'var(--color-traffic-red-bg)',
          border: `1px solid ${willReach ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
          color: willReach ? 'var(--color-traffic-green)' : 'var(--color-traffic-red)',
        }}>
          <span style={{ fontSize: 14 }}>{willReach ? '✓' : '✗'}</span>
          <span>
            Projecção final: {projectedFinal.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}
            {isAveraging && taskTargetValue != null && taskTargetValue > 0
              ? ` / Meta: ${taskTargetValue.toLocaleString('pt-PT')}`
              : totalPlanned > 0 ? ` / Meta: ${totalPlanned.toLocaleString('pt-PT')}` : ''}
            {unit ? ` ${unit}` : ''}
          </span>
          <span style={{ fontWeight: 600, opacity: 0.85 }}>
            — {willReach ? 'Vai atingir a meta' : 'Não vai atingir a meta'}
          </span>
        </div>
      )}
    </div>
  )
}
