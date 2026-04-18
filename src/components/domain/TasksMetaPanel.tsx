import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Activity, ExternalLink } from 'lucide-react'
import { milestonesService } from '../../services/milestones.service'
import MetaRealizadoChart from '../charts/MetaRealizadoChart'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'

// ── Colour helpers ─────────────────────────────────────────────────────────────

type TL = 'GREEN' | 'YELLOW' | 'RED'

const TL_COLORS: Record<TL, { bg: string; border: string; text: string }> = {
  GREEN:  { bg: 'var(--color-traffic-green-bg)',  border: 'var(--color-traffic-green)',  text: 'var(--color-traffic-green)'  },
  YELLOW: { bg: 'var(--color-traffic-yellow-bg)', border: 'var(--color-traffic-yellow)', text: 'var(--color-traffic-yellow)' },
  RED:    { bg: 'var(--color-traffic-red-bg)',    border: 'var(--color-traffic-red)',    text: 'var(--color-traffic-red)'    },
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface Props {
  /** Flat list of task objects (from API) to display in the left panel. */
  tasks: any[]
  /** Panel height in px. Default 580. */
  height?: number
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TasksMetaPanel({ tasks, height = 580 }: Props) {
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  // Auto-select first task whenever the task list changes
  useEffect(() => {
    if (tasks.length > 0 && (!selectedId || !tasks.find(t => t.id === selectedId))) {
      setSelectedId(tasks[0].id)
    }
  }, [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  const selectedTask = tasks.find(t => t.id === selectedId) ?? null

  // Fetch aggregated monthly chart for the selected task
  const { data: chartData, isLoading: loadingChart } = useQuery({
    queryKey: ['task-monthly-chart', selectedId],
    queryFn: () => milestonesService.taskMonthlyChart(selectedId!),
    enabled: !!selectedId,
    staleTime: 30_000,
  })

  const rows = chartData?.rows ?? []

  if (tasks.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 120, color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600,
        background: 'var(--color-surface-muted)', borderRadius: 12,
        border: '1px dashed var(--color-border)',
      }}>
        Sem acções associadas a este pilar.
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height }}>

      {/* ── Left: task list ──────────────────────────────────────────────────── */}
      <Card variant="elevated" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Activity size={15} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acções
          </p>
          <Badge variant="default">{tasks.length}</Badge>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {tasks.map((t: any) => {
            const tl = (t.performance?.traffic_light ?? 'RED') as TL
            const c = TL_COLORS[tl]
            const isActive = selectedId === t.id
            const exec = t.performance?.execution_score ?? 0
            const goal = t.performance?.goal_score ?? 0
            return (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: isActive ? c.bg : 'var(--color-bg-strong)',
                  border: `1.5px solid ${isActive ? c.border : 'transparent'}`,
                  cursor: 'pointer',
                  transition: 'all 120ms',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.border, flexShrink: 0 }} />
                  <p style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.25,
                    flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {t.title}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {t.goal_label || 'Objectivo'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 800, color: c.text }}>
                    {(t.target_value ?? 0).toLocaleString('pt-PT')}
                  </span>
                </div>

                {/* Dual progress bars: Exec + Obj */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Exec</span>
                      <span style={{ fontSize: 8, fontWeight: 800, color: exec >= 60 ? '#16a34a' : exec >= 30 ? '#d97706' : '#dc2626' }}>
                        {Math.max(0, exec).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, exec))}%`, borderRadius: 2, background: exec >= 60 ? '#16a34a' : exec >= 30 ? '#d97706' : '#dc2626', transition: 'width 300ms' }} />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Obj</span>
                      <span style={{ fontSize: 8, fontWeight: 800, color: goal >= 60 ? '#16a34a' : goal >= 30 ? '#d97706' : '#dc2626' }}>
                        {Math.max(0, goal).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, goal))}%`, borderRadius: 2, background: goal >= 60 ? '#16a34a' : goal >= 30 ? '#d97706' : '#dc2626', transition: 'width 300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      {/* ── Right: monthly chart ─────────────────────────────────────────────── */}
      <Card variant="elevated" style={{ height: '100%', overflow: 'auto' }}>
        {selectedTask ? (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.01em', marginBottom: 4 }}>
                  {selectedTask.title}
                </p>
                {selectedTask.goal_label && (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                    {selectedTask.goal_label}
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate(`/tasks/${selectedTask.id}`)}
                style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--color-primary)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 3,
                  flexShrink: 0,
                }}
              >
                Ver acção <ExternalLink size={12} />
              </button>
            </div>

            {/* KPI summary row */}
            <div style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Valor Inicial</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)' }}>
                  {(selectedTask.start_value ?? 0).toLocaleString('pt-PT')}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Valor Actual</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-primary)' }}>
                  {(selectedTask.current_value ?? 0).toLocaleString('pt-PT')}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Meta</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-traffic-green)' }}>
                  {(selectedTask.target_value ?? 0).toLocaleString('pt-PT')}
                </p>
              </div>
              {selectedTask.performance && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Score</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: TL_COLORS[(selectedTask.performance.traffic_light ?? 'RED') as TL].text }}>
                    {selectedTask.performance.total_score.toFixed(1)}
                  </p>
                </div>
              )}
            </div>

            {/* Chart */}
            {loadingChart ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                <Spinner size="md" />
              </div>
            ) : rows.length === 0 ? (
              <div style={{
                height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--color-bg-strong)', borderRadius: 12, color: 'var(--color-text-muted)',
              }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Esta acção ainda não tem metas mensais definidas.</p>
              </div>
            ) : (
              <MetaRealizadoChart
              data={rows}
              height={330}
              aggregationType={selectedTask.aggregation_type}
              taskTargetValue={selectedTask.target_value ?? undefined}
              taskStartValue={selectedTask.start_value ?? undefined}
            />
            )}
          </>
        ) : (
          <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Seleccione uma acção para ver o gráfico de metas.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
