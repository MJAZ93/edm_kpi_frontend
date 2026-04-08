import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ShieldAlert, Clock, Building2, ListTodo, AlertOctagon,
  ChevronRight, UserX, ArrowUpFromLine, TrendingUp,
  Plus, CheckCircle2, Circle, Trophy,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import { milestonesService } from '../../services/milestones.service'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/domain/StatCard'
import MemberDashboardPage from './MemberDashboardPage'
import PerformanceMap from '../../components/map/PerformanceMap'
import ProgressBar from '../../components/ui/ProgressBar'

// ── Colour helpers ────────────────────────────────────────────────────────────

type TL = 'GREEN' | 'YELLOW' | 'RED'

const TL_COLORS: Record<TL, { bg: string; border: string; text: string }> = {
  GREEN:  { bg: 'var(--color-traffic-green-bg)',  border: 'var(--color-traffic-green)',  text: 'var(--color-traffic-green)'  },
  YELLOW: { bg: 'var(--color-traffic-yellow-bg)', border: 'var(--color-traffic-yellow)', text: 'var(--color-traffic-yellow)' },
  RED:    { bg: 'var(--color-traffic-red-bg)',    border: 'var(--color-traffic-red)',    text: 'var(--color-traffic-red)'    },
}

const BLOCKER_LABEL: Record<string, string> = {
  LOGISTIC: 'Logístico', FINANCIAL: 'Financeiro', TECHNICAL: 'Técnico', LEGAL: 'Legal',
}

const BLOCKER_COLORS: Record<string, string> = {
  LOGISTIC: '#4a6fa5', FINANCIAL: '#ca8a04', TECHNICAL: '#7c3aed', LEGAL: '#dc2626',
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, tl, size = 100 }: { score: number; tl: string; size?: number }) {
  const c = TL_COLORS[(tl as TL) in TL_COLORS ? (tl as TL) : 'RED']
  const r = size / 2 - 8
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={8} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={c.border} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 800ms cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.24, fontWeight: 900, color: c.text, lineHeight: 1 }}>{score.toFixed(1)}</span>
        <span style={{ fontSize: size * 0.11, color: 'var(--color-text-muted)', fontWeight: 600 }}>/100</span>
      </div>
    </div>
  )
}

// ── Filter type ───────────────────────────────────────────────────────────────

type Filter = 'ALL' | 'UNASSIGNED' | 'FROM_DIRECTOR'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DepartamentoDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeFilter, setActiveFilter] = useState<Filter>('ALL')
  const [selectedTask, setSelectedTask] = useState<any | null>(null)
  const [showMsForm, setShowMsForm]   = useState(false)
  const [msTitle, setMsTitle]         = useState('')
  const [msValue, setMsValue]         = useState('')
  const [msDate, setMsDate]           = useState('')
  const [msAssignee, setMsAssignee]   = useState('')
  const [editingMsId, setEditingMsId] = useState<number | null>(null)
  const [editingAssignee, setEditingAssignee] = useState('')

  // Data
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard', 'departamento-overview'],
    queryFn: dashboardService.getDepartamentoOverview,
  })

  // Map is now auth-aware on the backend: it auto-filters ASCs from this
  // department's tasks and scores them relative to the department's progress.
  const { data: mapData } = useQuery({
    queryKey: ['dashboard', 'map', 'ASC', 'dept'],
    queryFn: () => dashboardService.getMap({ level: 'ASC' }),
    enabled: !!overview,
  })

  const { data: msData, refetch: refetchMs } = useQuery({
    queryKey: ['indicadores', selectedTask?.id],
    queryFn: () => milestonesService.list(selectedTask!.id),
    enabled: !!selectedTask,
  })
  const indicadores = msData?.data ?? []

  const { data: empData } = useQuery({
    queryKey: ['dashboard', 'employee-ranking'],
    queryFn: dashboardService.getEmployeeRanking,
  })
  const employees: any[] = empData?.ranking ?? []

  const queryClient = useQueryClient()
  const createMs = useMutation({
    mutationFn: (payload: any) => milestonesService.create(selectedTask!.id, payload),
    onSuccess: () => {
      refetchMs()
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'departamento-overview'] })
      setShowMsForm(false)
      setMsTitle(''); setMsValue(''); setMsDate(''); setMsAssignee('')
    },
  })
  const updateMs = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => milestonesService.update(id, payload),
    onSuccess: () => {
      refetchMs()
      setEditingMsId(null)
      setEditingAssignee('')
    },
  })
  const deptUsers: any[] = overview?.users ?? []

  // ── Derived ──────────────────────────────────────────────────────────────────
  const dept        = overview?.department
  const allTasks    = (overview?.tasks ?? []) as any[]
  const blockers    = (overview?.pending_blockers ?? []) as any[]
  const stats       = overview?.stats ?? { total: 0, unassigned: 0, from_director: 0, active: 0 }
  const mapFeatures = mapData?.features ?? []

  const tl = (dept?.traffic_light ?? 'YELLOW') as TL
  const c  = TL_COLORS[tl]

  const today   = new Date()
  const dayName = today.toLocaleDateString('pt-MZ', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' })

  const filteredTasks = allTasks.filter(t => {
    if (activeFilter === 'UNASSIGNED') return t.is_unassigned
    if (activeFilter === 'FROM_DIRECTOR') return t.is_from_director
    return true
  })

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  }

  // Regular member (not dept head) — show personalised member dashboard
  if (!isLoading && !dept) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{
          borderRadius: 16, padding: '28px 32px',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #7a3a00 100%)',
          color: '#fff',
        }}>
          <p style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, textTransform: 'capitalize' }}>{dayName}, {dateStr}</p>
          <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>Bom dia, {user?.name ?? 'Colaborador'}</h1>
          <p style={{ fontSize: 13, opacity: 0.75 }}>Painel do Colaborador</p>
        </div>
        <MemberDashboardPage />
      </div>
    )
  }

  const filterPills: { label: string; value: Filter; count: number }[] = [
    { label: 'Todas', value: 'ALL', count: stats.total ?? 0 },
    { label: 'Sem Actividade', value: 'UNASSIGNED', count: stats.unassigned ?? 0 },
    { label: 'Da Direcção', value: 'FROM_DIRECTOR', count: stats.from_director ?? 0 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div style={{
        borderRadius: 16,
        padding: '28px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: c.bg,
        border: `2px solid ${c.border}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'capitalize' }}>
            {dayName}, {dateStr}
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: 'var(--color-text)', marginBottom: 8, letterSpacing: '-0.02em' }}>
            Bom dia, {user?.name ?? 'Chefe de Departamento'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={14} style={{ color: c.text, flexShrink: 0 }} />
            <p style={{ fontSize: 16, fontWeight: 800, color: c.text }}>
              {dept?.name ?? ''}
            </p>
          </div>
        </div>

        {dept && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <ScoreRing score={dept.total_score ?? 0} tl={tl} size={120} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ textAlign: 'center', padding: '6px 14px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-text)' }}>{(dept.execution_score ?? 0).toFixed(1)}%</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Execução</p>
              </div>
              <div style={{ textAlign: 'center', padding: '6px 14px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-text)' }}>{(dept.goal_score ?? 0).toFixed(1)}%</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Objectivos</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label="Total Acções"
          value={stats.total ?? 0}
          icon={<ListTodo size={17} />}
        />
        <StatCard
          label="Sem Actividade"
          value={stats.unassigned ?? 0}
          icon={<UserX size={17} />}
          color={(stats.unassigned ?? 0) > 0 ? 'var(--color-traffic-red-bg)' : 'var(--color-bg-strong)'}
        />
        <StatCard
          label="Da Direcção"
          value={stats.from_director ?? 0}
          icon={<ArrowUpFromLine size={17} />}
          color="var(--color-traffic-yellow-bg)"
        />
        <StatCard
          label="Impedimentos Pendentes"
          value={blockers.length}
          icon={<ShieldAlert size={17} />}
          color={blockers.length > 0 ? 'var(--color-traffic-red-bg)' : 'var(--color-bg-strong)'}
        />
      </div>

      {/* ── Tasks + sidebar ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: selectedTask ? '2fr 1fr' : '1fr', gap: 20 }}>

          {/* Tasks section */}
          <Card variant="elevated">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ListTodo size={15} style={{ color: 'var(--color-primary)' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Acções do Departamento
                </p>
                <Badge variant="default" style={{ marginLeft: 4 }}>{filteredTasks.length}</Badge>
              </div>
              <button
                onClick={() => navigate('/projects')}
                style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                Ver pilares estratégicos <ChevronRight size={13} />
              </button>
            </div>

            {/* Filter pills */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {filterPills.map(pill => {
                const isActive = activeFilter === pill.value
                return (
                  <button
                    key={pill.value}
                    onClick={() => { setActiveFilter(pill.value); setSelectedTask(null) }}
                    style={{
                      padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 11, transition: 'all 150ms',
                      background: isActive ? 'var(--color-primary)' : 'var(--color-bg-strong)',
                      color: isActive ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {pill.label}
                    <span style={{
                      marginLeft: 5, fontSize: 10,
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-border)',
                      borderRadius: 10, padding: '0 5px',
                    }}>{pill.count}</span>
                  </button>
                )
              })}
            </div>

            {/* Task list */}
            {filteredTasks.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <TrendingUp size={28} style={{ color: 'var(--color-primary)', opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Nenhuma acção encontrada</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredTasks.map((task: any) => {
                  const isSelected = selectedTask?.id === task.id
                  const statusColor = task.status === 'ACTIVE' ? 'var(--color-traffic-yellow)' : task.status === 'COMPLETED' ? 'var(--color-traffic-green)' : 'var(--color-text-muted)'
                  const statusBg    = task.status === 'ACTIVE' ? 'var(--color-traffic-yellow-bg)' : task.status === 'COMPLETED' ? 'var(--color-traffic-green-bg)' : 'var(--color-bg-strong)'
                  const statusLabel = task.status === 'ACTIVE' ? 'Activo' : task.status === 'COMPLETED' ? 'Concluído' : (task.status ?? '—')

                  return (
                    <div
                      key={task.id}
                      onClick={() => setSelectedTask(isSelected ? null : task)}
                      style={{
                        padding: '14px 16px',
                        borderRadius: 12,
                        background: 'var(--color-bg-strong)',
                        border: isSelected ? `2px solid var(--color-primary)` : '2px solid transparent',
                        cursor: 'pointer',
                        transition: 'border-color 150ms, box-shadow 150ms',
                        boxShadow: isSelected ? '0 2px 12px rgba(232,103,10,0.12)' : 'none',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = 'transparent'
                      }}
                    >
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3, flex: 1 }}>
                          {task.title ?? '—'}
                        </p>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                          color: statusColor, background: statusBg, flexShrink: 0,
                        }}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Project name */}
                      {task.project_title && (
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic', marginBottom: 8 }}>
                          {task.project_title}
                        </p>
                      )}

                      {/* Progress bar */}
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Progresso</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-soft)' }}>{(task.progress_pct ?? 0).toFixed(1)}%</span>
                        </div>
                        <ProgressBar value={task.progress_pct ?? 0} max={100} height={5} variant="auto" />
                      </div>

                      {/* Badges row */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                        {(task.days_elapsed ?? 0) > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                            <Clock size={10} style={{ color: 'var(--color-text-muted)' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>{task.days_elapsed}d decorridos</span>
                          </div>
                        )}
                        {(task.days_remaining ?? 0) > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6, background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}>
                            <Clock size={10} style={{ color: 'var(--color-primary)' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)' }}>{task.days_remaining}d restantes</span>
                          </div>
                        )}
                        {task.is_from_director && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(232,103,10,0.12)', color: 'var(--color-primary)', border: '1px solid rgba(232,103,10,0.25)' }}>
                            Da Direcção
                          </span>
                        )}
                        {task.is_unassigned && (
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--color-traffic-red-bg)', color: 'var(--color-traffic-red)', border: '1px solid rgba(220,38,38,0.2)' }}>
                            Sem actividade
                          </span>
                        )}
                      </div>

                      {/* Assignees */}
                      {task.is_unassigned ? (
                        <p style={{ fontSize: 11, color: 'var(--color-traffic-red)', fontStyle: 'italic' }}>
                          Nenhum técnico atribuído
                        </p>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(task.assignees ?? []).map((a: any) => (
                            <div key={a.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: '50%',
                                background: 'var(--color-primary)', color: '#fff',
                                fontSize: 11, fontWeight: 800,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                {(a.name ?? '?').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.2 }}>{a.name ?? '—'}</p>
                                <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{a.ms_done ?? 0}/{a.ms_total ?? 0} ms</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Right sidebar: indicadores panel or blockers */}
          {selectedTask ? (
            <Card variant="elevated" style={{ position: 'sticky', top: 20 }}>
              {/* Header */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                  {selectedTask.project_title || 'Acção'}
                </p>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 12 }}>
                  {selectedTask.title}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, background: 'var(--color-bg-strong)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-text)' }}>{(selectedTask.progress_pct ?? 0).toFixed(0)}%</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Progresso</p>
                  </div>
                  <div style={{ flex: 1, background: 'var(--color-bg-strong)', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-text)' }}>{selectedTask.days_remaining ?? 0}d</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Restantes</p>
                  </div>
                </div>
              </div>

              {/* Indicadores section */}
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Marcos ({indicadores.length})
                  </p>
                  <button
                    onClick={() => setShowMsForm(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                      background: showMsForm ? 'var(--color-bg-strong)' : 'var(--color-primary)',
                      color: showMsForm ? 'var(--color-text-muted)' : '#fff',
                      border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    }}
                  >
                    <Plus size={12} /> Novo
                  </button>
                </div>

                {/* New indicador form */}
                {showMsForm && (
                  <div style={{ background: 'var(--color-bg-strong)', borderRadius: 10, padding: 12, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      placeholder="Título do marco"
                      value={msTitle}
                      onChange={e => setMsTitle(e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 12, width: '100%', boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      <input
                        type="number"
                        placeholder={selectedTask?.goal_label || 'Valor planeado'}
                        value={msValue}
                        onChange={e => setMsValue(e.target.value)}
                        style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 12 }}
                      />
                      <input
                        type="date"
                        value={msDate}
                        onChange={e => setMsDate(e.target.value)}
                        style={{ padding: '7px 10px', borderRadius: 7, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 12 }}
                      />
                    </div>
                    <select
                      value={msAssignee}
                      onChange={e => setMsAssignee(e.target.value)}
                      style={{
                        padding: '7px 10px', borderRadius: 7,
                        border: `1px solid ${!msAssignee ? 'var(--color-traffic-red)' : 'var(--color-border)'}`,
                        background: 'var(--color-bg)',
                        color: msAssignee ? 'var(--color-text)' : 'var(--color-text-muted)',
                        fontSize: 12,
                      }}
                    >
                      <option value="">— Técnico responsável * —</option>
                      {deptUsers.map((u: any) => (
                        <option key={u.id} value={u.id}>
                          {u.id === user?.id ? `${u.name} (eu próprio)` : u.name}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        disabled={!msTitle || !msValue || !msDate || !msAssignee || createMs.isPending}
                        onClick={() => createMs.mutate({
                          title: msTitle,
                          planned_value: parseFloat(msValue),
                          planned_date: msDate,
                          assigned_to: parseInt(msAssignee),
                        })}
                        style={{
                          flex: 1, padding: '7px 0', borderRadius: 8,
                          background: (!msTitle || !msValue || !msDate || !msAssignee) ? 'var(--color-border)' : 'var(--color-primary)',
                          color: (!msTitle || !msValue || !msDate || !msAssignee) ? 'var(--color-text-muted)' : '#fff',
                          border: 'none', cursor: (!msTitle || !msValue || !msDate || !msAssignee) ? 'not-allowed' : 'pointer',
                          fontSize: 12, fontWeight: 700,
                        }}
                      >
                        {createMs.isPending ? 'A guardar…' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => { setShowMsForm(false); setMsTitle(''); setMsValue(''); setMsDate(''); setMsAssignee('') }}
                        style={{ padding: '7px 14px', borderRadius: 8, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Indicador list */}
                {indicadores.length === 0 && !showMsForm ? (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>Sem marcos definidos</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {indicadores.map((ms: any) => {
                      const isDone    = ms.status === 'DONE'
                      const isBlocked = ms.status === 'BLOCKED'
                      const iconColor = isDone ? 'var(--color-traffic-green)' : isBlocked ? 'var(--color-traffic-red)' : 'var(--color-text-muted)'
                      const isEditing = editingMsId === ms.id

                      const planned  = ms.planned_value  ?? 0
                      const achieved = ms.achieved_value ?? 0
                      const pct      = planned > 0 ? Math.min(100, Math.max(0, (achieved / planned) * 100)) : 0
                      const barColor = isDone
                        ? 'var(--color-traffic-green)'
                        : isBlocked
                          ? 'var(--color-traffic-red)'
                          : 'var(--color-primary)'

                      return (
                        <div key={ms.id} style={{ padding: '8px 10px', background: 'var(--color-bg-strong)', borderRadius: 8 }}>
                          {/* Title + date + status */}
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{ marginTop: 1, flexShrink: 0, color: iconColor }}>
                              {isDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: isDone ? 'line-through' : 'none', marginBottom: 4 }}>
                                {ms.title}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Clock size={9} /> {new Date(ms.planned_date).toLocaleDateString('pt-MZ', { day: 'numeric', month: 'short' })}
                                </span>
                                <span style={{ fontSize: 10, fontWeight: 700,
                                  color: isDone ? 'var(--color-traffic-green)' : isBlocked ? 'var(--color-traffic-red)' : 'var(--color-text-muted)'
                                }}>
                                  {ms.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Progress: achieved vs planned */}
                          <div style={{ margin: '8px 0 0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Realizado</span>
                              <span style={{ fontSize: 12, fontWeight: 800, color: isDone ? 'var(--color-traffic-green)' : 'var(--color-text)' }}>
                                {achieved.toLocaleString('pt-MZ')}
                                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                                  {' '}/ {planned.toLocaleString('pt-MZ')}
                                </span>
                              </span>
                            </div>
                            <div style={{ height: 5, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: barColor, transition: 'width 500ms' }} />
                            </div>
                          </div>

                          {/* Assignee row */}
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <select
                                  value={editingAssignee}
                                  onChange={e => setEditingAssignee(e.target.value)}
                                  style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 11 }}
                                >
                                  <option value="">— Escolher técnico —</option>
                                  {deptUsers.map((u: any) => (
                                    <option key={u.id} value={u.id}>
                                      {u.id === user?.id ? `${u.name} (eu)` : u.name}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  disabled={!editingAssignee || updateMs.isPending}
                                  onClick={() => updateMs.mutate({ id: ms.id, payload: { assigned_to: parseInt(editingAssignee) } })}
                                  style={{ padding: '5px 10px', borderRadius: 6, background: editingAssignee ? 'var(--color-primary)' : 'var(--color-border)', color: editingAssignee ? '#fff' : 'var(--color-text-muted)', border: 'none', cursor: editingAssignee ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 700 }}
                                >
                                  {updateMs.isPending ? '…' : 'OK'}
                                </button>
                                <button
                                  onClick={() => { setEditingMsId(null); setEditingAssignee('') }}
                                  style={{ padding: '5px 8px', borderRadius: 6, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11 }}
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 11, color: ms.assignee?.name ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 700 }}>
                                  👤 {ms.assignee?.name ?? 'Sem responsável'}
                                </span>
                                <button
                                  onClick={() => { setEditingMsId(ms.id); setEditingAssignee(ms.assigned_to ? String(ms.assigned_to) : '') }}
                                  style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 4 }}
                                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-primary)')}
                                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                                >
                                  Trocar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() => { setSelectedTask(null); setShowMsForm(false) }}
                style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                Fechar
              </button>
            </Card>
          ) : (
            /* Blockers panel */
            <Card variant="elevated" style={{ position: 'sticky', top: 24, alignSelf: 'start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <ShieldAlert size={15} style={{ color: 'var(--color-traffic-red)' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Impedimentos
                </p>
                {blockers.length > 0 && (
                  <Badge variant="danger" style={{ marginLeft: 4 }}>{blockers.length}</Badge>
                )}
              </div>

              {blockers.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center' }}>
                  <ShieldAlert size={28} style={{ color: 'var(--color-traffic-green)', marginBottom: 8, opacity: 0.7 }} />
                  <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Sem impedimentos pendentes</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {blockers.map((bl: any) => {
                    const color = BLOCKER_COLORS[bl.blocker_type] ?? '#4a6fa5'
                    return (
                      <div
                        key={bl.id}
                        onClick={() => navigate('/blockers')}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          background: 'var(--color-bg-strong)',
                          border: `1.5px solid ${color}33`,
                          cursor: 'pointer',
                          transition: 'border-color 150ms',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}88` }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}33` }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                            color: '#fff', background: color, borderRadius: 5, padding: '2px 7px',
                          }}>
                            {BLOCKER_LABEL[bl.blocker_type] ?? bl.blocker_type}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginLeft: 'auto' }}>
                            {bl.entity_type}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4, lineHeight: 1.3 }}>
                          {bl.entity_title || '—'}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {bl.description}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}

              {blockers.length > 0 && (
                <button
                  onClick={() => navigate('/blockers')}
                  style={{ width: '100%', marginTop: 12, padding: '8px 0', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  Ver todos os impedimentos <ChevronRight size={13} />
                </button>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* ── Blockers + Ranking ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Impedimentos */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ShieldAlert size={15} style={{ color: 'var(--color-traffic-red)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Impedimentos Pendentes
            </p>
            {blockers.length > 0 && <Badge variant="danger" style={{ marginLeft: 4 }}>{blockers.length}</Badge>}
          </div>

          {blockers.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <ShieldAlert size={28} style={{ color: 'var(--color-traffic-green)', opacity: 0.6, marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Sem impedimentos pendentes</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {blockers.map((bl: any) => {
                  const color = BLOCKER_COLORS[bl.blocker_type] ?? '#4a6fa5'
                  return (
                    <div
                      key={bl.id}
                      onClick={() => navigate('/blockers')}
                      style={{
                        padding: '12px 14px', borderRadius: 10, background: 'var(--color-bg-strong)',
                        border: `1.5px solid ${color}33`, cursor: 'pointer', transition: 'border-color 150ms',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}88` }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}33` }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff', background: color, borderRadius: 5, padding: '2px 7px' }}>
                          {BLOCKER_LABEL[bl.blocker_type] ?? bl.blocker_type}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginLeft: 'auto' }}>{bl.entity_type}</span>
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4, lineHeight: 1.3 }}>{bl.entity_title || '—'}</p>
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bl.description}</p>
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => navigate('/blockers')}
                style={{ width: '100%', marginTop: 12, padding: '8px 0', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                Ver todos <ChevronRight size={13} />
              </button>
            </>
          )}
        </Card>

        {/* Ranking de técnicos */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Trophy size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ranking de Técnicos
            </p>
            <Badge variant="default" style={{ marginLeft: 4 }}>{employees.length}</Badge>
          </div>

          {employees.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <Trophy size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Sem dados de desempenho</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {employees.map((emp: any, idx: number) => {
                const tl = (emp.traffic_light ?? 'RED') as TL
                const ec = TL_COLORS[tl in TL_COLORS ? tl : 'RED']
                const medal = ['🥇', '🥈', '🥉'][idx] ?? null
                return (
                  <div key={emp.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: idx === 0 ? 'var(--color-traffic-green-bg)' : 'var(--color-bg-strong)',
                    border: `1px solid ${idx === 0 ? 'var(--color-traffic-green)' : 'transparent'}`,
                  }}>
                    <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>
                      {medal ?? <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>#{emp.rank}</span>}
                    </span>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-primary)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, flexShrink: 0,
                    }}>
                      {(emp.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {emp.ms_done ?? 0}/{emp.ms_total ?? 0} marcos concluídos
                      </p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: 16, fontWeight: 900, color: ec.text, lineHeight: 1 }}>
                        {(emp.total_score ?? 0).toFixed(1)}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>/100</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ── Map ──────────────────────────────────────────────────────────────── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 2 }}>
              Mapa de Performance — ASCs da Direcção
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {mapFeatures.length} {mapFeatures.length === 1 ? 'área' : 'áreas'} de serviço ao cliente
            </p>
          </div>
          <button
            onClick={() => navigate('/analytics/map')}
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Mapa completo <ChevronRight size={13} />
          </button>
        </div>

        {mapFeatures.length > 0 ? (
          <PerformanceMap
            features={mapFeatures.map((f: any) => ({
              geometry: f.geometry,
              properties: f.properties,
            }))}
            height={400}
            renderPopupContent={(_props, _close) => (
              <button
                onClick={() => navigate('/analytics/map')}
                style={{ width: '100%', marginTop: 4, padding: '7px 0', borderRadius: 8, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
              >
                Ver no mapa completo →
              </button>
            )}
          />
        ) : (
          <div style={{
            height: 240,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'var(--color-bg-strong)',
            borderRadius: 12,
            color: 'var(--color-text-muted)',
          }}>
            <TrendingUp size={32} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>Sem dados geográficos disponíveis.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
