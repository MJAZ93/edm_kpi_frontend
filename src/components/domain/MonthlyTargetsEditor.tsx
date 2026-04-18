import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Calendar, Save, Check, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { milestonesService } from '../../services/milestones.service'
import MetaRealizadoChart from '../charts/MetaRealizadoChart'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import type { MilestoneMonthlyTarget } from '../../types'

interface Props {
  milestoneId: number
  /** Optional unit suffix shown in the chart tooltip. */
  unit?: string
  /** Whether the current user can edit. Read-only mode hides inputs. */
  canEdit?: boolean
  /** Keys to invalidate after a save (e.g. task/project monthly chart). */
  invalidateKeys?: any[][]
  /** Milestone's global planned_value — used to cap the sum of monthly metas (SUM tasks only). */
  plannedGlobal?: number
  /**
   * When true the editable table is wrapped in a collapsible section so the
   * chart is always visible but the table can be toggled by the user.
   */
  collapsibleTable?: boolean
  /**
   * Task aggregation type — changes how the monthly summary is presented.
   * For AVG / MANUAL, each month is an independent rate; sum validation is hidden.
   */
  aggregationType?: string
  /**
   * Whether the indicator measures a reduction (lower = better). Passed to the
   * chart so the projection chip can correctly judge whether the target is reached
   * for AVG/MANUAL tasks.
   */
  isReduction?: boolean
}

function periodLabel(p: string): string {
  if (!p || p.length < 7) return p
  const d = new Date(`${p}-01`)
  return isNaN(d.getTime()) ? p : d.toLocaleDateString('pt-MZ', { month: 'long', year: 'numeric' })
}

type Row = { period: string; planned: string; achieved: string }

export default function MonthlyTargetsEditor({
  milestoneId,
  unit,
  canEdit = true,
  invalidateKeys = [],
  plannedGlobal = 0,
  collapsibleTable = false,
  aggregationType,
  isReduction = false,
}: Props) {
  const isAveraging = aggregationType === 'AVG' || aggregationType === 'MANUAL'
  const [tableOpen, setTableOpen] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['milestone-monthly-targets', milestoneId],
    queryFn: () => milestonesService.listMonthlyTargets(milestoneId),
    enabled: !!milestoneId,
    staleTime: 0,
  })

  const [rows, setRows] = useState<Row[]>([])
  const [dirty, setDirty] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (data?.rows) {
      setRows(data.rows.map((r: MilestoneMonthlyTarget) => ({
        period: r.period,
        planned: String(r.planned_value ?? 0),
        achieved: String(r.achieved_value ?? 0),
      })))
      setDirty({})
    }
  }, [data])

  const handleChange = (period: string, field: 'planned' | 'achieved', value: string) => {
    setRows(rs => rs.map(r => (r.period === period ? { ...r, [field]: value } : r)))
    setDirty(d => ({ ...d, [period]: true }))
  }

  const bulkSave = useMutation({
    mutationFn: async () => {
      if (overGlobal) {
        throw new Error('A soma das metas mensais não pode ser maior que a meta total.')
      }
      // Only the META (planned_value) is user-editable. The REALIZADO column
      // is derived from the milestone's progress events (MilestoneProgress)
      // and kept in sync by the backend — we never send it.
      const dirtyRows = rows
        .filter(r => dirty[r.period])
        .map(r => ({
          period: r.period,
          planned_value: Number(r.planned) || 0,
        }))
      if (dirtyRows.length === 0) return null
      return milestonesService.bulkUpsertMonthlyTargets(milestoneId, dirtyRows)
    },
    onSuccess: () => {
      toast.success('Metas mensais actualizadas.')
      qc.invalidateQueries({ queryKey: ['milestone-monthly-targets', milestoneId] })
      qc.invalidateQueries({ queryKey: ['milestone-detail', milestoneId] })
      qc.invalidateQueries({ queryKey: ['indicadores'] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['projects'] })
      invalidateKeys.forEach(k => qc.invalidateQueries({ queryKey: k }))
      setDirty({})
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erro ao guardar metas mensais.')
    },
  })

  const chartData = useMemo(
    () => rows.map(r => ({
      period: r.period,
      planned_value: Number(r.planned) || 0,
      achieved_value: Number(r.achieved) || 0,
    })),
    [rows],
  )

  // Summary / validation: sum of monthly metas must never exceed the
  // milestone's global planned_value.
  const sumMonthly = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.planned) || 0), 0),
    [rows],
  )
  // For AVG/MANUAL tasks, monthly values are independent rates — no sum cap applies.
  const overGlobal = !isAveraging && plannedGlobal > 0 && sumMonthly > plannedGlobal + 0.001
  const fullyCovered = !isAveraging && plannedGlobal > 0 && Math.abs(sumMonthly - plannedGlobal) < 0.001

  // Average of non-zero planned rows — shown for AVG/MANUAL tasks instead of sum
  const avgMonthlyPlanned = useMemo(() => {
    if (!isAveraging) return 0
    const nonZero = rows.filter(r => Number(r.planned) > 0)
    if (nonZero.length === 0) return 0
    return nonZero.reduce((s, r) => s + (Number(r.planned) || 0), 0) / nonZero.length
  }, [rows, isAveraging])

  const hasDirty = Object.keys(dirty).length > 0

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spinner size="md" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div style={{
        padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)',
        background: 'var(--color-surface-muted)', borderRadius: 10, border: '1px dashed var(--color-border)',
      }}>
        Este indicador ainda não tem metas mensais.<br />
        Verifique se a acção tem data de início e fim definidas.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Chart preview */}
      <MetaRealizadoChart
        data={chartData}
        unit={unit}
        height={220}
        aggregationType={aggregationType}
        taskTargetValue={plannedGlobal > 0 ? plannedGlobal : undefined}
        isReduction={isReduction}
      />

      {/* Helpful hint */}
      <div style={{
        padding: '8px 12px', fontSize: 12, color: 'var(--color-text-muted)',
        background: 'var(--color-primary-soft)', borderRadius: 8,
        border: '1px solid var(--color-border)', lineHeight: 1.5,
      }}>
        {isAveraging ? (
          <>
            Preencha a <strong>Meta</strong> de cada mês — cada período é independente.
            O <strong>Realizado</strong> é calculado automaticamente a partir das actualizações
            de progresso registadas em cada mês.
          </>
        ) : (
          <>
            Preencha apenas a <strong>Meta</strong> mensal. O <strong>Realizado</strong> é
            calculado automaticamente a partir das actualizações de progresso registadas
            em cada mês.
          </>
        )}
      </div>

      {/* Monthly summary — sum-based for SUM tasks, average-based for AVG/MANUAL */}
      {isAveraging ? (
        avgMonthlyPlanned > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
          }}>
            <span>
              Média mensal planeada:{' '}
              <strong>{avgMonthlyPlanned.toLocaleString('pt-PT', { maximumFractionDigits: 1 })}</strong>
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                {' '}— cada mês é avaliado de forma independente
              </span>
            </span>
          </div>
        )
      ) : (
        plannedGlobal > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: overGlobal ? 'var(--color-traffic-red-bg)' : fullyCovered ? 'var(--color-traffic-green-bg)' : 'var(--color-surface-muted)',
            border: `1px solid ${overGlobal ? 'rgba(220,38,38,0.25)' : fullyCovered ? 'rgba(22,163,74,0.2)' : 'var(--color-border)'}`,
            color: overGlobal ? 'var(--color-traffic-red)' : fullyCovered ? 'var(--color-traffic-green)' : 'var(--color-text)',
          }}>
            <span>
              Soma mensal: {sumMonthly.toLocaleString('pt-PT')}
              <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>
                {' '}/ Meta total: {plannedGlobal.toLocaleString('pt-PT')}
                {overGlobal ? ` (+${(sumMonthly - plannedGlobal).toLocaleString('pt-PT')})` : ''}
              </span>
            </span>
            {overGlobal && <span>⚠ Ultrapassa a meta total</span>}
            {fullyCovered && <span>✓ Totalmente coberto</span>}
          </div>
        )
      )}

      {/* Collapsible toggle header (only when collapsibleTable=true) */}
      {collapsibleTable && (
        <button
          onClick={() => setTableOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)',
            color: 'var(--color-text-muted)', cursor: 'pointer', width: '100%',
          }}
        >
          <Calendar size={13} />
          <span style={{ flex: 1, textAlign: 'left' }}>Distribuição mensal</span>
          {tableOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}

      {/* Editable table */}
      {(!collapsibleTable || tableOpen) && (
      <>
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'var(--color-surface-strong)',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr 1fr auto',
          gap: 0,
          padding: '10px 14px',
          background: 'var(--color-surface-muted)',
          borderBottom: '1px solid var(--color-border)',
          fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={12} /> Período</div>
          <div>Meta</div>
          <div>Realizado</div>
          <div style={{ width: 52, textAlign: 'center' }}>%</div>
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {rows.map((r) => {
            const p = Number(r.planned) || 0
            const a = Number(r.achieved) || 0
            const pct = p > 0 ? Math.round((a / p) * 1000) / 10 : 0
            const pctColor = p === 0 ? 'var(--color-text-muted)' : pct >= 90 ? '#16a34a' : pct >= 60 ? '#ca8a04' : '#dc2626'
            return (
              <div
                key={r.period}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr auto',
                  gap: 0,
                  padding: '8px 14px',
                  borderBottom: '1px solid var(--color-border)',
                  alignItems: 'center',
                  background: dirty[r.period] ? 'rgba(232,103,10,0.04)' : 'transparent',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                  {periodLabel(r.period)}
                </div>
                <input
                  type="number"
                  step="any"
                  value={r.planned}
                  onChange={e => handleChange(r.period, 'planned', e.target.value)}
                  disabled={!canEdit}
                  style={{
                    padding: '6px 10px', fontSize: 13, fontWeight: 700,
                    border: '1.5px solid var(--color-border-strong)', borderRadius: 8,
                    background: 'var(--color-surface)', color: 'var(--color-text)',
                    outline: 'none', width: 'calc(100% - 8px)',
                  }}
                />
                <div style={{ padding: '0 4px', display: 'flex', alignItems: 'center' }}>
                  <span
                    title="Calculado automaticamente a partir das actualizações de progresso"
                    style={{
                      fontSize: 14, fontWeight: 800,
                      color: a > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    }}
                  >
                    {a.toLocaleString('pt-PT')}
                  </span>
                </div>
                <div style={{ width: 52, textAlign: 'center', fontSize: 12, fontWeight: 800, color: pctColor }}>
                  {p === 0 ? '—' : `${pct.toFixed(0)}%`}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {canEdit && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          {hasDirty && (
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              {Object.keys(dirty).length} mês/meses com alterações por guardar
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={bulkSave.isPending ? <Spinner size="sm" /> : hasDirty ? <Save size={13} /> : <Check size={13} />}
            onClick={() => bulkSave.mutate()}
            disabled={!hasDirty || bulkSave.isPending || overGlobal}
            title={overGlobal ? 'A soma das metas mensais não pode ser maior que a meta total' : undefined}
          >
            {hasDirty ? (overGlobal ? 'Reduzir soma mensal' : 'Guardar alterações') : 'Sem alterações'}
          </Button>
        </div>
      )}
      </>
      )}
    </div>
  )
}
