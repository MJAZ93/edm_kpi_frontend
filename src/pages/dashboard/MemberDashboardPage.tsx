import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, ShieldAlert, Building2, Briefcase,
  TrendingUp, ChevronRight, Pencil, MapPin, Map,
  MessageSquare, ArrowRight, AlertTriangle, Target, Calendar,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { dashboardService } from '../../services/dashboard.service'
import { feedbackService } from '../../services/feedback.service'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import ProgressModal from '../../components/domain/ProgressModal'
import PerformanceMap from '../../components/map/PerformanceMap'

// ── Traffic light helpers ─────────────────────────────────────────────────────

type TL = 'GREEN' | 'YELLOW' | 'RED'
const TL_COLORS: Record<TL, { border: string; text: string; bg: string }> = {
  GREEN:  { border: 'var(--color-traffic-green)',  text: 'var(--color-traffic-green)',  bg: 'var(--color-traffic-green-bg)'  },
  YELLOW: { border: 'var(--color-traffic-yellow)', text: 'var(--color-traffic-yellow)', bg: 'var(--color-traffic-yellow-bg)' },
  RED:    { border: 'var(--color-traffic-red)',    text: 'var(--color-traffic-red)',    bg: 'var(--color-traffic-red-bg)'    },
}
const tlKey = (v: string): TL => (v in TL_COLORS ? (v as TL) : 'RED')

function ScoreRing({ score, tl, size = 120 }: { score: number; tl: string; size?: number }) {
  const c = TL_COLORS[tlKey(tl)]
  const r = size / 2 - 10
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c.border} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 800ms cubic-bezier(.4,0,.2,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 900, color: c.text, lineHeight: 1 }}>{score.toFixed(1)}</span>
        <span style={{ fontSize: size * 0.1, color: 'var(--color-text-muted)', fontWeight: 600 }}>/100</span>
      </div>
    </div>
  )
}

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  DONE:        { label: 'Concluído', variant: 'success' },
  PENDING:     { label: 'Pendente',  variant: 'warning' },
  BLOCKED:     { label: 'Bloqueado', variant: 'danger'  },
  IN_PROGRESS: { label: 'Em curso',  variant: 'default' },
  ACTIVE:      { label: 'Activo',    variant: 'default' },
  COMPLETED:   { label: 'Concluído', variant: 'success' },
}

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diária', WEEKLY: 'Semanal', MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral', BIANNUAL: 'Semestral', ANNUAL: 'Anual',
}

const MONTH_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fmtMonth = (ym: string) => MONTH_PT[parseInt(ym.split('-')[1], 10) - 1] ?? ym

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return days < 7 ? `${days}d` : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' })
}

const FEEDBACK_CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  GENERAL:     { bg: 'var(--color-bg-strong)',          text: 'var(--color-text-muted)'     },
  PERFORMANCE: { bg: 'var(--color-traffic-yellow-bg)', text: 'var(--color-traffic-yellow)' },
  IMPROVEMENT: { bg: 'rgba(122,58,237,0.10)',           text: '#7c3aed'                     },
  RECOGNITION: { bg: 'var(--color-traffic-green-bg)',  text: 'var(--color-traffic-green)'  },
}
const FEEDBACK_CATEGORY_LABEL: Record<string, string> = {
  GENERAL: 'Geral', PERFORMANCE: 'Desempenho', IMPROVEMENT: 'Melhoria', RECOGNITION: 'Reconhecimento',
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MemberDashboardPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()
  const qc        = useQueryClient()
  const [updateMs, setUpdateMs] = useState<any | null>(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard', 'member-overview'],
    queryFn: dashboardService.getMemberOverview,
  })

  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', 'received', { page: 0, limit: 5 }],
    queryFn: () => feedbackService.listReceived({ page: 0, limit: 5 }),
  })

  const { data: unreadData } = useQuery({
    queryKey: ['feedback', 'unread-count'],
    queryFn: feedbackService.unreadCount,
  })

  const ascIds: number[] = data?.asc_ids ?? []
  const { data: mapData } = useQuery({
    queryKey: ['dashboard', 'map', 'ASC', 'member', ascIds],
    queryFn: () => dashboardService.getMap({ level: 'ASC', asc_ids: ascIds.join(',') }),
    enabled: ascIds.length > 0,
  })
  const mapFeatures = mapData?.features ?? []

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  }

  const score        = data?.score        ?? { total_score: 0, execution_score: 0, goal_score: 0, traffic_light: 'RED', ms_total: 0, ms_done: 0 }
  const stats        = data?.stats        ?? { total: 0, done: 0, pending: 0, blocked: 0, overdue: 0 }
  const milestones: any[] = data?.milestones ?? []
  const monthly: any[]    = data?.monthly    ?? []
  const projects: any[]   = data?.projects   ?? []
  const departments: any[] = data?.departments ?? []
  const myTasks: any[]    = data?.my_tasks    ?? []
  const deptRanking: any[] = data?.dept_ranking ?? []
  const myRank: number    = data?.my_rank ?? 0

  const tl = tlKey(score.traffic_light)
  const c  = TL_COLORS[tl]

  // Group milestones by task
  const taskGroups = Object.values(
    milestones.reduce((acc: Record<number, any>, ms: any) => {
      if (!acc[ms.task_id]) acc[ms.task_id] = { taskId: ms.task_id, taskTitle: ms.task_title, goalLabel: ms.goal_label, projectTitle: ms.project_title, items: [] }
      acc[ms.task_id].items.push(ms)
      return acc
    }, {} as Record<number, any>)
  ) as any[]

  const chartData = monthly.map((m: any) => ({ name: fmtMonth(m.month), done: m.done, total: m.total }))

  const handleProgressDone = () => {
    setUpdateMs(null)
    refetch()
    qc.invalidateQueries({ queryKey: ['dashboard', 'member-overview'] })
  }

  // Overdue milestones
  const overdueMilestones = milestones.filter((m: any) => {
    if (m.status === 'DONE') return false
    if (!m.planned_date) return false
    return new Date(m.planned_date) < new Date()
  })

  const unreadCount = unreadData?.count ?? 0

  // ── Feedback panel (reusable inline) ───────────────────────────────────────
  const FeedbackPanel = (
    <Card padding={0} style={{ height: '100%' }}>
      <div style={{ padding: '14px 16px', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={13} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)' }}>Feedback</p>
            {unreadCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'var(--color-traffic-red)', borderRadius: 10, padding: '2px 8px' }}>
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/feedback')}
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Ver todos <ArrowRight size={13} />
          </button>
        </div>
        {!feedbackData?.data?.length ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', gap: 6 }}>
            <MessageSquare size={28} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 12, fontWeight: 600 }}>Sem feedback</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            {feedbackData.data.slice(0, 6).map((fb: any) => {
              const catColor = FEEDBACK_CATEGORY_COLOR[fb.category] ?? FEEDBACK_CATEGORY_COLOR.GENERAL
              return (
                <div
                  key={fb.id}
                  onClick={() => navigate('/feedback')}
                  style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: 'var(--color-bg-strong)',
                    cursor: 'pointer',
                    borderLeft: !fb.is_read ? '3px solid var(--color-primary)' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--color-primary)', color: '#fff', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {(fb.sender?.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fb.sender?.name ?? 'Utilizador'}</p>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: catColor.bg, color: catColor.text }}>
                          {FEEDBACK_CATEGORY_LABEL[fb.category] ?? fb.category}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--color-text-muted)', flexShrink: 0, fontWeight: 600 }}>{timeAgo(fb.created_at)}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: fb.is_read ? 400 : 600 }}>
                    {fb.message}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )

  // ── Indicadores panel ─────────────────────────────────────────────────────
  const IndicadoresPanel = (
    <Card padding={0} style={{ height: '100%' }}>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <CheckCircle2 size={14} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>Os Meus Indicadores</p>
          <span style={{ marginLeft: 4, fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', background: 'var(--color-bg-strong)', padding: '2px 7px', borderRadius: 6 }}>
            {stats.done}/{stats.total} concluídos
          </span>
          {stats.overdue > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, background: 'var(--color-traffic-red-bg)', color: 'var(--color-traffic-red)', padding: '2px 8px', borderRadius: 6 }}>
              {stats.overdue} atrasado{stats.overdue !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {taskGroups.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 0', color: 'var(--color-text-muted)' }}>
            <CheckCircle2 size={30} style={{ opacity: 0.2, marginBottom: 10 }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>Nenhum indicador atribuído ainda.</p>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 520, paddingRight: 2 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {taskGroups.map((group: any) => (
              <div key={group.taskId}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '8px 12px', background: 'var(--color-bg-strong)', borderRadius: 10, border: '1px solid var(--color-border)', cursor: 'pointer' }}
                  onClick={() => navigate(`/tasks/${group.taskId}`)}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.taskTitle}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 1 }}>
                      {group.projectTitle}{group.projectTitle && group.goalLabel ? ' · ' : ''}{group.goalLabel}
                    </p>
                  </div>
                  <Badge variant="default">{group.items.length} ms</Badge>
                  <ChevronRight size={11} color="var(--color-text-muted)" />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 10 }}>
                  {group.items.map((ms: any) => {
                    const sb = STATUS_BADGE[ms.status] ?? { label: ms.status, variant: 'default' as const }
                    const pct = ms.planned_value > 0 ? Math.min(100, ((ms.achieved_value ?? 0) / ms.planned_value) * 100) : 0
                    const isOverdue = ms.status !== 'DONE' && ms.planned_date && new Date(ms.planned_date) < new Date()
                    return (
                      <div key={ms.id} style={{ padding: '10px 12px', background: 'var(--color-surface)', borderRadius: 10, border: `1px solid ${isOverdue ? 'rgba(220,38,38,0.25)' : 'var(--color-border)'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.title}</p>
                          </div>
                          {isOverdue && <span style={{ fontSize: 10, color: 'var(--color-traffic-red)', fontWeight: 800 }}>ATRASADO</span>}
                          <Badge variant={sb.variant}>{sb.label}</Badge>
                          {ms.status !== 'DONE' && (
                            <button onClick={() => setUpdateMs({ ...ms, goalLabel: group.goalLabel })}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'var(--color-primary)', border: 'none', color: '#fff', flexShrink: 0 }}
                            >
                              <Pencil size={10} /> Actualizar
                            </button>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                          {ms.planned_date && (
                            <span style={{ fontSize: 11, color: isOverdue ? 'var(--color-traffic-red)' : 'var(--color-text-muted)', fontWeight: 600 }}>
                              <Calendar size={10} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                              {ms.planned_date}
                            </span>
                          )}
                          {ms.frequency && (
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                              ⟳ {FREQ_LABEL[ms.frequency] ?? ms.frequency}
                            </span>
                          )}
                          {ms.scope_name && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                              <MapPin size={10} /> {ms.scope_name}
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            {group.goalLabel || 'Realizado'}: <b style={{ color: 'var(--color-text)' }}>{(ms.achieved_value ?? 0).toLocaleString()}</b> / {ms.planned_value?.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--color-traffic-green)' : isOverdue ? 'var(--color-traffic-red)' : 'var(--color-primary)', borderRadius: 3, transition: 'width 600ms' }} />
                        </div>
                        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, textAlign: 'right' }}>{pct.toFixed(1)}%</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          </div>
        )}
      </div>
    </Card>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Hero: score + info + stats ────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 20,
        padding: '18px 24px',
        background: `linear-gradient(135deg, ${c.bg} 0%, var(--color-surface) 100%)`,
        borderRadius: 'var(--radius-lg)', border: `1.5px solid ${c.border}33`, boxShadow: 'var(--shadow-soft)',
      }}>
        <ScoreRing score={score.total_score} tl={score.traffic_light} size={100} />

        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Desempenho pessoal</p>
          <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', marginBottom: 5 }}>{user?.name ?? 'Colaborador'}</h2>
          {departments.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {departments.map((d: any) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={10} color="var(--color-text-muted)" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-soft)' }}>{d.name}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { label: 'Execução',  val: score.execution_score.toFixed(1) + '%' },
              { label: 'Objectivo', val: score.goal_score.toFixed(1) + '%' },
              { label: 'Marcos Feitos', val: `${score.ms_done}/${score.ms_total}` },
              { label: 'Posição no Dept', val: myRank > 0 ? `${RANK_MEDAL[myRank] ?? ''}  #${myRank}` : '—' },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                <p style={{ fontSize: 14, fontWeight: 900, color: c.text }}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 4 mini stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: <Target size={13} />,       label: 'Total',     val: stats.total,   bg: 'var(--color-primary)' },
            { icon: <CheckCircle2 size={13} />, label: 'Feitos',    val: stats.done,    bg: 'var(--color-traffic-green)' },
            { icon: <AlertTriangle size={13} />,label: 'Atrasados', val: stats.overdue, bg: 'var(--color-traffic-red)' },
            { icon: <ShieldAlert size={13} />,  label: 'Bloqueados',val: stats.blocked, bg: '#6b7280' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)', minWidth: 110 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                {s.icon}
              </div>
              <div>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
                <p style={{ fontSize: 17, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>{s.val}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Indicadores (dominant) + Feedback side by side ───────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12, alignItems: 'stretch' }}>
        <div style={{ minWidth: 0 }}>{IndicadoresPanel}</div>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>{FeedbackPanel}</div>
      </div>

      {/* ── Acções + Ranking side by side ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* As Minhas Acções */}
        <Card padding={0}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Briefcase size={13} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)' }}>As Minhas Acções</p>
            </div>
            {myTasks.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', color: 'var(--color-text-muted)', gap: 6 }}>
                <Briefcase size={22} style={{ opacity: 0.2 }} />
                <p style={{ fontSize: 12, fontWeight: 600 }}>Sem acções atribuídas</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {myTasks.map((t: any) => {
                  const sb = STATUS_BADGE[t.status] ?? { label: t.status, variant: 'default' as const }
                  return (
                    <div key={t.id}
                      onClick={() => navigate(`/tasks/${t.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--color-bg-strong)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 150ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: sb.variant === 'success' ? 'var(--color-traffic-green)' : sb.variant === 'danger' ? 'var(--color-traffic-red)' : 'var(--color-traffic-yellow)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                        {t.project_title && <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{t.project_title}</p>}
                      </div>
                      <Badge variant={sb.variant}>{sb.label}</Badge>
                      <ChevronRight size={11} color="var(--color-text-muted)" />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Ranking do Departamento */}
        <Card padding={0}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <TrendingUp size={13} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)' }}>Ranking</p>
              {myRank > 0 && (
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', background: 'var(--color-primary)15', padding: '2px 8px', borderRadius: 6 }}>
                  #{myRank}
                </span>
              )}
            </div>
            {deptRanking.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>Sem dados</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {deptRanking.map((r: any) => {
                  const rtl = tlKey(r.traffic_light)
                  const dotColor = TL_COLORS[rtl].text
                  const isMe = r.is_me
                  return (
                    <div key={r.user_id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 9,
                      background: isMe ? 'var(--color-primary)12' : 'var(--color-bg-strong)',
                      border: isMe ? '1.5px solid var(--color-primary)' : '1px solid var(--color-border)',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 900, color: isMe ? 'var(--color-primary)' : 'var(--color-text-muted)', minWidth: 20, textAlign: 'center' }}>
                        {RANK_MEDAL[r.rank] ?? `#${r.rank}`}
                      </span>
                      <span style={{ flex: 1, fontSize: 11, fontWeight: isMe ? 800 : 600, color: isMe ? 'var(--color-text)' : 'var(--color-text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.name}{isMe ? ' (eu)' : ''}
                      </span>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 800, color: dotColor, minWidth: 32, textAlign: 'right' }}>
                        {r.total_score.toFixed(1)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Evolução Mensal + Pilares ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Card padding={0}>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10 }}>
              <TrendingUp size={13} style={{ marginRight: 5, verticalAlign: 'middle', color: 'var(--color-primary)' }} />
              Evolução Mensal (6 meses)
            </p>
            {chartData.length === 0 ? (
              <div style={{ height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Sem dados ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={chartData} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, name: any) => [v, name === 'done' ? 'Concluídos' : 'Total']} />
                  <Bar dataKey="total" fill="var(--color-border)" radius={[4,4,0,0]} name="Total" />
                  <Bar dataKey="done"  fill="var(--color-traffic-green)" radius={[4,4,0,0]} name="done" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card padding={0}>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10 }}>
              <Briefcase size={13} style={{ marginRight: 5, verticalAlign: 'middle', color: 'var(--color-primary)' }} />
              Pilares Estratégicos
            </p>
            {projects.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, color: 'var(--color-text-muted)', fontSize: 13 }}>
                <Briefcase size={22} style={{ opacity: 0.2, marginBottom: 8 }} />
                Sem pilares atribuídos.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {projects.map((p: any) => (
                  <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'var(--color-bg-strong)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
                  >
                    <Briefcase size={12} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                    <Badge variant="default">{p.ms_count} ms</Badge>
                    <ChevronRight size={11} color="var(--color-text-muted)" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Mapa ASCs ────────────────────────────────────────────────────── */}
      {ascIds.length > 0 && (
        <Card padding={0}>
          <div style={{ padding: '14px 16px 0' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10 }}>
              <Map size={13} style={{ marginRight: 5, verticalAlign: 'middle', color: 'var(--color-primary)' }} />
              Mapa das Minhas ASCs
            </p>
          </div>
          {mapFeatures.length > 0 ? (
            <PerformanceMap
              features={mapFeatures.map((f: any) => ({ geometry: f.geometry, properties: f.properties }))}
              height={360}
              renderPopupContent={(asc) => {
                const ascIndicadores = milestones.filter(
                  (ms: any) => ms.scope_type === 'ASC' && Number(ms.scope_id) === asc.id
                )
                if (ascIndicadores.length === 0) return null
                return (
                  <div>
                    <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0 10px' }} />
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Os meus indicadores aqui</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {ascIndicadores.map((ms: any) => {
                        const sb  = STATUS_BADGE[ms.status] ?? { label: ms.status, variant: 'default' as const }
                        const pct = ms.planned_value > 0 ? Math.min(100, ((ms.achieved_value ?? 0) / ms.planned_value) * 100) : 0
                        const dotColor = sb.variant === 'success' ? 'var(--color-traffic-green)' : sb.variant === 'danger' ? 'var(--color-traffic-red)' : 'var(--color-traffic-yellow)'
                        return (
                          <div key={ms.id} style={{ padding: '8px 10px', background: 'var(--color-surface-muted)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.title}</p>
                            </div>
                            <div style={{ height: 4, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 999, background: pct >= 100 ? 'var(--color-traffic-green)' : 'var(--color-primary)' }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              }}
            />
          ) : (
            <div style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
              <Map size={28} style={{ opacity: 0.2 }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>Sem polígonos geográficos disponíveis.</p>
            </div>
          )}
        </Card>
      )}

      {/* ── Progress modal ─────────────────────────────────────────────────── */}
      {updateMs && (
        <ProgressModal
          ms={updateMs}
          goalLabel={updateMs.goalLabel ?? ''}
          onClose={() => setUpdateMs(null)}
          onSuccess={handleProgressDone}
        />
      )}
    </div>
  )
}
