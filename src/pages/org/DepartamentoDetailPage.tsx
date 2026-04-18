import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Users, TrendingUp, AlertTriangle, ChevronRight,
  Clock, CheckCircle2, ListChecks, User, ArrowLeft,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import ProgressBar from '../../components/ui/ProgressBar'
import TrafficLight from '../../components/domain/TrafficLight'
import Button from '../../components/ui/Button'

const MEDALS = ['🥇', '🥈', '🥉']

type TL = 'GREEN' | 'YELLOW' | 'RED'
const TL_COLORS: Record<TL, { bg: string; border: string; text: string }> = {
  GREEN:  { bg: 'var(--color-traffic-green-bg)',  border: 'var(--color-traffic-green)',  text: 'var(--color-traffic-green)'  },
  YELLOW: { bg: 'var(--color-traffic-yellow-bg)', border: 'var(--color-traffic-yellow)', text: 'var(--color-traffic-yellow)' },
  RED:    { bg: 'var(--color-traffic-red-bg)',    border: 'var(--color-traffic-red)',    text: 'var(--color-traffic-red)'    },
}

export default function DepartamentoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'departamento-detail', id],
    queryFn: () => dashboardService.getDepartamentoDetail(Number(id)),
    enabled: !!id,
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  if (!data?.department) return <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>Departamento não encontrado.</div>

  const dept = data.department
  const tasks = data.tasks ?? []
  const overdueMs = data.overdue_milestones ?? []
  const workers = (data.workers ?? []) as any[]
  const stats = data.stats ?? {}

  const tl = (dept.traffic_light ?? 'RED') as TL
  const c = TL_COLORS[tl] ?? TL_COLORS.RED

  // Sort workers by total score descending for ranking
  const rankedWorkers = [...workers].sort((a: any, b: any) => (b.total_score ?? 0) - (a.total_score ?? 0))

  return (
    <div>
      <PageHeader
        eyebrow={<button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 12, fontWeight: 600, padding: 0 }}><ArrowLeft size={14} /> Voltar</button>}
        title={dept.name}
        subtitle={dept.description || undefined}
        actions={dept.responsible && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={dept.responsible.name} size="md" />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{dept.responsible.name}</p>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Chefe de Departamento</p>
            </div>
          </div>
        )}
      />

      {/* ── Performance Summary ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Score card */}
        <Card variant="elevated" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: c.bg, border: `3px solid ${c.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: c.text }}>{dept.total_score}</span>
          </div>
          <div>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>Score Global</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>EXEC <strong style={{ color: 'var(--color-text)' }}>{dept.execution_score}%</strong></span>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>OBJ <strong style={{ color: 'var(--color-text)' }}>{dept.goal_score}%</strong></span>
            </div>
          </div>
        </Card>

        {/* Stat cards */}
        <Card variant="elevated" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px' }}>
          <ListChecks size={24} style={{ color: 'var(--color-primary)' }} />
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)' }}>{stats.total ?? 0}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>Acções Total</p>
          </div>
        </Card>

        <Card variant="elevated" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px' }}>
          <CheckCircle2 size={24} style={{ color: 'var(--color-traffic-green)' }} />
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)' }}>{stats.done ?? 0}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>Concluídas</p>
          </div>
        </Card>

        <Card variant="elevated" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 24px' }}>
          <AlertTriangle size={24} style={{ color: 'var(--color-traffic-red)' }} />
          <div>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)' }}>{stats.overdue ?? 0}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>Atrasadas</p>
          </div>
        </Card>
      </div>

      {/* ── Two-column layout: Workers + Overdue ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Workers / Ranking */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Colaboradores
            </p>
            <Badge variant="default" style={{ marginLeft: 4 }}>{workers.length}</Badge>
          </div>

          {rankedWorkers.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>Sem colaboradores.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rankedWorkers.map((w: any, i: number) => {
              const wTl = (w.traffic_light ?? 'RED') as TL
              const wc = TL_COLORS[wTl] ?? TL_COLORS.RED
              return (
                <div
                  key={w.id}
                  onClick={() => navigate(`/users/${w.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    background: i < 3 ? 'var(--color-surface-muted)' : 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    transition: 'border-color 120ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = wc.text)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{i < 3 ? MEDALS[i] : `${i + 1}º`}</span>
                  <Avatar name={w.name} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                      Exec {w.execution_score}% · Obj {w.goal_score}% · {w.ms_done}/{w.ms_total} MS
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: wc.text }}>{w.total_score}</span>
                    <TrafficLight status={wTl} size="sm" />
                  </div>
                  <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </Card>

        {/* Overdue Milestones */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={15} style={{ color: 'var(--color-traffic-red)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Indicadores Atrasados
            </p>
            <Badge variant="danger" style={{ marginLeft: 4 }}>{overdueMs.length}</Badge>
          </div>

          {overdueMs.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>Nenhum indicador atrasado.</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overdueMs.map((ms: any) => {
              const pct = ms.planned_value > 0 ? Math.min(100, Math.max(0, (ms.achieved_value / ms.planned_value) * 100)) : 0
              return (
                <div
                  key={ms.id}
                  onClick={() => navigate(`/tasks/${ms.task_id}`)}
                  style={{
                    padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                    background: 'var(--color-traffic-red-bg)',
                    border: '1.5px solid rgba(220,38,38,0.18)',
                    transition: 'border-color 150ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-traffic-red)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.18)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', flex: 1, lineHeight: 1.35 }}>{ms.title}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, padding: '1px 6px', borderRadius: 5, background: 'rgba(220,38,38,0.12)' }}>
                      <Clock size={9} style={{ color: 'var(--color-traffic-red)' }} />
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-traffic-red)' }}>{ms.days_overdue}d</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                    {ms.assignee_name && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text)', background: 'rgba(232,103,10,0.10)', borderRadius: 5, padding: '1px 6px', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <User size={8} /> {ms.assignee_name}
                      </span>
                    )}
                    {ms.task_title && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{ms.task_title}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 600 }}>Progresso</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text)' }}>
                      {ms.achieved_value?.toLocaleString('pt-PT')}
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-muted)' }}> / {ms.planned_value?.toLocaleString('pt-PT')}</span>
                    </span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'var(--color-traffic-red)', transition: 'width 500ms' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ── Tasks List ──────────────────────────────────────────────────────── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ListChecks size={15} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acções do Departamento
          </p>
          <Badge variant="default" style={{ marginLeft: 4 }}>{tasks.length}</Badge>
        </div>

        {tasks.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>Sem acções.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tasks.map((t: any) => (
            <div
              key={t.id}
              onClick={() => navigate(`/tasks/${t.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                background: t.is_overdue ? 'var(--color-traffic-red-bg)' : 'var(--color-bg)',
                border: `1px solid ${t.is_overdue ? 'rgba(220,38,38,0.15)' : 'var(--color-border)'}`,
                transition: 'background 150ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = t.is_overdue ? 'rgba(220,38,38,0.08)' : 'var(--color-surface-muted)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = t.is_overdue ? 'var(--color-traffic-red-bg)' : 'var(--color-bg)' }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                {t.project_title && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{t.project_title}</p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {t.is_overdue && (
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-traffic-red)', background: 'rgba(220,38,38,0.12)', borderRadius: 5, padding: '2px 7px' }}>
                    {t.overdue_days}d atrasada
                  </span>
                )}
                <Badge variant={t.status === 'DONE' ? 'success' : t.status === 'ACTIVE' ? 'orange' : 'default'}>
                  {t.status === 'DONE' ? 'Concluída' : t.status === 'ACTIVE' ? 'Activa' : t.status}
                </Badge>
                <div style={{ width: 60 }}>
                  <ProgressBar value={Math.max(0, Math.min(100, t.progress_pct ?? 0))} max={100} height={4} variant={t.is_overdue ? 'red' : 'auto'} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', minWidth: 32, textAlign: 'right' }}>
                  {Math.max(0, Math.min(100, t.progress_pct ?? 0)).toFixed(0)}%
                </span>
                <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
