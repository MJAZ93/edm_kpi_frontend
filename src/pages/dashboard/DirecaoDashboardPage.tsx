import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban, ShieldAlert, TrendingUp, Trophy, ChevronRight,
  AlertOctagon, Users, Building2, Layers, Clock, Activity,
  ListChecks, CheckCircle2, Circle, MessageSquare, ArrowRight,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import { milestonesService } from '../../services/milestones.service'
import { feedbackService } from '../../services/feedback.service'
import type { Feedback } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/domain/StatCard'
import PerformanceMap from '../../components/map/PerformanceMap'
import ProgressBar from '../../components/ui/ProgressBar'
import TrafficLight from '../../components/domain/TrafficLight'
import RegionalDashboardPage from './RegionalDashboardPage'
import type { EmployeeRankItem } from '../../types'

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

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado',
}

const MEDALS = ['🥇', '🥈', '🥉']

const FEEDBACK_CATEGORY_LABEL: Record<string, string> = {
  GENERAL: 'Geral', PERFORMANCE: 'Desempenho', IMPROVEMENT: 'Melhoria', RECOGNITION: 'Reconhecimento',
}

const FEEDBACK_CATEGORY_COLOR: Record<string, { bg: string; text: string }> = {
  GENERAL: { bg: 'var(--color-bg-strong)', text: 'var(--color-text-muted)' },
  PERFORMANCE: { bg: 'var(--color-traffic-yellow-bg)', text: 'var(--color-traffic-yellow)' },
  IMPROVEMENT: { bg: 'rgba(122,58,237,0.10)', text: '#7c3aed' },
  RECOGNITION: { bg: 'var(--color-traffic-green-bg)', text: 'var(--color-traffic-green)' },
}

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
  if (days < 7) return `${days}d`
  return date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' })
}

const CATEGORY_LABELS: Record<string, string> = {
  DIR_DIRECAO:  'Dir. Direcção',
  CHEFE_DEPT:   'Chefe Dept.',
  DIR_REGIONAL: 'Dir. Regional',
  DIR_ASC:      'Dir. ASC',
  COLABORADOR:  'Colaborador',
}
const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  BIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DirecaoDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // Employee ranking state
  const [empCategory, setEmpCategory] = useState<string>('ALL')
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRankItem | null>(null)

  // Task accordion: which task's indicadores are expanded
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null)
  // Per-indicador editing: msId → input value string
  const [editingValues, setEditingValues] = useState<Record<number, string>>({})

  // Update indicador achieved_value + auto-set status
  const updateMs = useMutation({
    mutationFn: ({ id, achieved_value, planned_value }: { id: number; achieved_value: number; planned_value: number }) =>
      milestonesService.update(id, {
        achieved_value,
        achieved_date: new Date().toISOString().split('T')[0],
        status: achieved_value >= planned_value ? 'DONE' : 'PENDING',
      } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'direcao-overview'] })
      setEditingValues({})
    },
  })

  // Data
  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard', 'direcao-overview'],
    queryFn: dashboardService.getDirecaoOverview,
  })

  // Map is now auth-aware on the backend: it auto-filters ASCs from this
  // direction's tasks and scores them relative to the direction's progress.
  const { data: mapData } = useQuery({
    queryKey: ['dashboard', 'map', 'ASC', 'direcao'],
    queryFn: () => dashboardService.getMap({ level: 'ASC' }),
    enabled: !!overview,
  })

  const { data: empData } = useQuery({
    queryKey: ['dashboard', 'employee-ranking'],
    queryFn: dashboardService.getEmployeeRanking,
  })

  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', 'received', { page: 0, limit: 5 }],
    queryFn: () => feedbackService.listReceived({ page: 0, limit: 5 }),
  })

  const { data: unreadData } = useQuery({
    queryKey: ['feedback', 'unread-count'],
    queryFn: feedbackService.unreadCount,
  })

  // ── Derived ──────────────────────────────────────────────────────────────────
  const dir        = overview?.direction
  const projects   = (overview?.projects ?? []) as any[]
  const dirTasks   = (overview?.dir_tasks ?? []) as any[]
  const stalled    = (overview?.stalled_tasks ?? []) as any[]
  const blockers   = (overview?.pending_blockers ?? []) as any[]
  const deptScores = (overview?.dept_scores ?? []) as any[]
  const employees: EmployeeRankItem[] = empData?.ranking ?? []
  const mapFeatures = mapData?.features ?? []


  const tl = (dir?.traffic_light ?? 'YELLOW') as TL
  const c  = TL_COLORS[tl]

  const filteredEmps = empCategory === 'ALL'
    ? employees
    : employees.filter((e: any) => e.category === empCategory)

  const today   = new Date()
  const dayName = today.toLocaleDateString('pt-MZ', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' })

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  }

  // ── Direction not configured — check if regional director instead ───────────
  if (!isLoading && !dir) {
    return <RegionalDashboardPage />
  }

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
            {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 19 ? 'Boa tarde' : 'Boa noite'}, {user?.name ?? 'Director'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={14} style={{ color: c.text, flexShrink: 0 }} />
            <p style={{ fontSize: 16, fontWeight: 800, color: c.text }}>
              {dir?.name}
            </p>
          </div>
        </div>

        {/* Score da direcção = score do director */}
        {dir && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <ScoreRing score={dir.total_score} tl={tl} size={120} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ textAlign: 'center', padding: '6px 14px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-text)' }}>{dir.execution_score.toFixed(1)}%</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Execução</p>
              </div>
              <div style={{ textAlign: 'center', padding: '6px 14px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-text)' }}>{dir.goal_score.toFixed(1)}%</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Objectivos</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI stat cards ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label="Pilares Estratégicos"
          value={projects.length}
          icon={<FolderKanban size={17} />}
        />
        <StatCard
          label="Score da Direcção"
          value={dir ? dir.total_score.toFixed(1) : '—'}
          icon={<Activity size={17} />}
          color="var(--color-traffic-yellow-bg)"
        />
        <StatCard
          label="Acções Paradas"
          value={stalled.length}
          icon={<AlertOctagon size={17} />}
          color={stalled.length > 0 ? 'var(--color-traffic-red-bg)' : 'var(--color-bg-strong)'}
        />
        <StatCard
          label="Constrangimentos Pendentes"
          value={blockers.length}
          icon={<ShieldAlert size={17} />}
          color={blockers.length > 0 ? 'var(--color-traffic-red-bg)' : 'var(--color-bg-strong)'}
        />
      </div>

      {/* ── Direction Tasks Accordion ────────────────────────────────────────── */}
      {dirTasks.length > 0 && (
        <Card variant="elevated" padding={0}>
          <div style={{ padding: '14px 18px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <ListChecks size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Acções da Direcção
              </p>
              <Badge variant="default" style={{ marginLeft: 4 }}>{dirTasks.length}</Badge>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>
                Clique numa acção para ver e actualizar os marcos
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dirTasks.map((task: any, taskIdx: number) => {
              const isExpanded = expandedTaskId === task.id
              const pct = Math.min(100, Math.max(0, task.progress_pct ?? 0))
              const indicadores: any[] = task.indicadores ?? []
              const pendingCount = indicadores.filter((m: any) => m.status === 'PENDING').length
              const doneCount    = indicadores.filter((m: any) => m.status === 'DONE').length

              return (
                <div key={task.id} style={{ borderTop: taskIdx > 0 ? '1px solid var(--color-border)' : undefined }}>
                  {/* Task header row – clickable */}
                  <div
                    onClick={() => {
                      setExpandedTaskId(isExpanded ? null : task.id)
                      setEditingValues({})
                    }}
                    style={{
                      padding: '12px 18px',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--color-primary-bg)' : 'transparent',
                      transition: 'background 150ms',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                    onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-strong)' }}
                    onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {/* Progress ring mini */}
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                      background: `conic-gradient(var(--color-primary) ${pct * 3.6}deg, var(--color-border) 0deg)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: isExpanded ? 'var(--color-primary-bg)' : 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 9, fontWeight: 900, color: 'var(--color-primary)' }}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                        {task.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {task.project_title && (
                          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                            {task.project_title}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                          {doneCount}/{indicadores.length} marcos concluídos
                        </span>
                        {pendingCount > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-bg)', borderRadius: 6, padding: '1px 7px', flexShrink: 0 }}>
                            {pendingCount} por actualizar
                          </span>
                        )}
                      </div>
                    </div>

                    <span style={{ fontSize: 12, color: isExpanded ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 700, flexShrink: 0 }}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {/* Expanded indicadores */}
                  {isExpanded && (
                    <div style={{ padding: '0 18px 16px', background: 'var(--color-primary-bg)' }}>
                      {indicadores.length === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>
                          Sem marcos definidos para esta acção.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {indicadores.map((ms: any) => {
                            const isDone    = ms.status === 'DONE'
                            const isBlocked = ms.status === 'BLOCKED'
                            const planned   = ms.planned_value ?? 0
                            const achieved  = ms.achieved_value ?? 0
                            const msPct     = planned > 0 ? Math.min(100, Math.max(0, (achieved / planned) * 100)) : 0
                            const barColor  = isDone ? 'var(--color-traffic-green)' : isBlocked ? 'var(--color-traffic-red)' : 'var(--color-primary)'
                            const editVal   = editingValues[ms.id] ?? ''
                            const isEditing = ms.id in editingValues

                            return (
                              <div
                                key={ms.id}
                                style={{
                                  padding: '10px 13px',
                                  borderRadius: 10,
                                  background: 'var(--color-bg)',
                                  border: isDone
                                    ? '1px solid var(--color-traffic-green)44'
                                    : isBlocked
                                      ? '1px solid var(--color-traffic-red)44'
                                      : '1px solid var(--color-primary)44',
                                }}
                              >
                                {/* Title row */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                                  <div style={{ marginTop: 1, flexShrink: 0, color: isDone ? 'var(--color-traffic-green)' : isBlocked ? 'var(--color-traffic-red)' : 'var(--color-primary)' }}>
                                    {isDone ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontSize: 12, fontWeight: 700, color: isDone ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: isDone ? 'line-through' : 'none', marginBottom: 2 }}>
                                      {ms.title}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                      {ms.scope_name && (
                                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', background: 'var(--color-bg-strong)', borderRadius: 5, padding: '1px 6px' }}>
                                          {ms.scope_name}
                                        </span>
                                      )}
                                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                        <Clock size={9} />
                                        {ms.planned_date ? new Date(ms.planned_date).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                      </span>
                                      {ms.frequency && (
                                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                                          {FREQ_LABEL[ms.frequency] ?? ms.frequency}
                                        </span>
                                      )}
                                      <span style={{
                                        fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 6,
                                        background: isDone ? 'var(--color-traffic-green-bg)' : isBlocked ? 'var(--color-traffic-red-bg)' : 'var(--color-primary-bg)',
                                        color: isDone ? 'var(--color-traffic-green)' : isBlocked ? 'var(--color-traffic-red)' : 'var(--color-primary)',
                                      }}>
                                        {isDone ? 'Concluído' : isBlocked ? 'Bloqueado' : 'Pendente'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Progress row */}
                                <div style={{ marginBottom: !isDone && !isBlocked ? 8 : 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Realizado</span>
                                    <span style={{ fontSize: 14, fontWeight: 900, color: isDone ? 'var(--color-traffic-green)' : 'var(--color-text)' }}>
                                      {achieved.toLocaleString('pt-MZ')}
                                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}> / {planned.toLocaleString('pt-MZ')}</span>
                                    </span>
                                  </div>
                                  <div style={{ height: 6, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${msPct}%`, borderRadius: 999, background: barColor, transition: 'width 500ms' }} />
                                  </div>
                                </div>

                                {/* Inline numeric update — PENDING only */}
                                {!isDone && !isBlocked && (
                                  <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 8 }}>
                                    {isEditing ? (
                                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <input
                                          type="number"
                                          min={0}
                                          step="any"
                                          value={editVal}
                                          onChange={e => setEditingValues(v => ({ ...v, [ms.id]: e.target.value }))}
                                          placeholder={`Novo valor (máx ${planned})`}
                                          style={{ flex: 1, padding: '6px 10px', borderRadius: 7, border: '1.5px solid var(--color-primary)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13, outline: 'none', fontWeight: 700 }}
                                          autoFocus
                                        />
                                        <button
                                          disabled={editVal === '' || updateMs.isPending}
                                          onClick={() => updateMs.mutate({ id: ms.id, achieved_value: parseFloat(editVal), planned_value: planned })}
                                          style={{ padding: '6px 16px', borderRadius: 7, background: editVal !== '' ? 'var(--color-primary)' : 'var(--color-border)', color: editVal !== '' ? '#fff' : 'var(--color-text-muted)', border: 'none', cursor: editVal !== '' ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 800, flexShrink: 0 }}
                                        >
                                          {updateMs.isPending ? '…' : 'Guardar'}
                                        </button>
                                        <button
                                          onClick={() => setEditingValues(v => { const n = { ...v }; delete n[ms.id]; return n })}
                                          style={{ padding: '6px 10px', borderRadius: 7, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12 }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={e => { e.stopPropagation(); setEditingValues(v => ({ ...v, [ms.id]: String(achieved) })) }}
                                        style={{ width: '100%', padding: '7px 0', borderRadius: 7, background: 'var(--color-primary-bg)', border: '1.5px solid var(--color-primary)44', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 12, fontWeight: 800 }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary)', (e.currentTarget.style.color = '#fff'))}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary-bg)', (e.currentTarget.style.color = 'var(--color-primary)'))}
                                      >
                                        ✏ Actualizar progresso
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Department Overview Cards ────────────────────────────────────────── */}
      {deptScores.length > 0 && (
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Layers size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Departamentos
              </p>
              <Badge variant="default" style={{ marginLeft: 4 }}>{deptScores.length}</Badge>
            </div>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Clique para ver as acções do departamento</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {deptScores.map((dept: any) => {
              const dtl = (dept.traffic_light ?? 'YELLOW') as TL
              const dc  = TL_COLORS[dtl]
              // Count blockers for this department (matching entity from blockers array)
              const deptBlockerCount = blockers.filter((bl: any) =>
                (bl.entity_title ?? '').toLowerCase().includes(dept.name?.toLowerCase() ?? '')
              ).length
              // Count stalled tasks potentially from this department
              const deptStalledCount = stalled.filter((t: any) =>
                (t.project_title ?? '').toLowerCase().includes(dept.name?.toLowerCase() ?? '')
              ).length
              return (
                <div
                  key={dept.id}
                  onClick={() => navigate(`/projects?dept=${dept.id}`)}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 14,
                    background: dc.bg,
                    border: `2px solid ${dc.border}44`,
                    transition: 'all 150ms ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = dc.border; el.style.boxShadow = `0 4px 16px ${dc.border}22` }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${dc.border}44`; el.style.boxShadow = 'none' }}
                >
                  {/* Header: dot + traffic light */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: dc.border, flexShrink: 0 }} />
                    <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                  </div>

                  {/* Name */}
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10, lineHeight: 1.3 }}>
                    {dept.name}
                  </p>

                  {/* Score */}
                  <p style={{ fontSize: 28, fontWeight: 900, color: dc.text, lineHeight: 1, marginBottom: 8 }}>
                    {dept.total_score.toFixed(1)}
                  </p>

                  {/* Execution + Goal */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Exec {dept.execution_score.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Obj {dept.goal_score.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ height: 5, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, dept.execution_score)}%`, borderRadius: 999, background: dc.border, transition: 'width 500ms' }} />
                    </div>
                  </div>

                  {/* Alert badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {deptStalledCount > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: 'var(--color-traffic-red-bg)', color: 'var(--color-traffic-red)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <AlertOctagon size={9} /> {deptStalledCount} parada{deptStalledCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {deptBlockerCount > 0 && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: 'var(--color-traffic-red-bg)', color: 'var(--color-traffic-red)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <ShieldAlert size={9} /> {deptBlockerCount} constrang.
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Tasks que Precisam de Atenção ─────────────────────────────────────── */}
      {(stalled.length > 0 || blockers.length > 0) && (
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertOctagon size={15} style={{ color: 'var(--color-traffic-red)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Acções que Precisam de Atenção
            </p>
            <Badge variant="danger" style={{ marginLeft: 4 }}>{stalled.length + blockers.length}</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {/* Stalled tasks */}
            {stalled.map((task: any) => (
              <div
                key={`stalled-${task.id}`}
                onClick={() => navigate('/projects')}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-traffic-red-bg)',
                  border: '1.5px solid rgba(220,38,38,0.18)',
                  cursor: 'pointer',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-traffic-red)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.18)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', flex: 1, lineHeight: 1.35 }}>
                    {task.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '2px 8px', borderRadius: 6, background: 'rgba(220,38,38,0.12)' }}>
                    <Clock size={10} style={{ color: 'var(--color-traffic-red)' }} />
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-traffic-red)' }}>
                      {task.days_elapsed}d sem progresso
                    </span>
                  </div>
                </div>
                {task.project_title && (
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, fontStyle: 'italic' }}>
                    {task.project_title}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: 'rgba(220,38,38,0.12)', color: 'var(--color-traffic-red)',
                  }}>
                    Parada
                  </span>
                  <ProgressBar value={task.progress_pct ?? 0} max={100} height={4} variant="red" />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-traffic-red)', flexShrink: 0 }}>
                    {(task.progress_pct ?? 0).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}

            {/* Tasks with active blockers */}
            {blockers.map((bl: any) => (
              <div
                key={`blocker-${bl.id}`}
                onClick={() => navigate('/blockers')}
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'var(--color-bg-strong)',
                  border: `1.5px solid ${BLOCKER_COLORS[bl.blocker_type] ?? '#4a6fa5'}33`,
                  cursor: 'pointer',
                  transition: 'border-color 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${BLOCKER_COLORS[bl.blocker_type] ?? '#4a6fa5'}88` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${BLOCKER_COLORS[bl.blocker_type] ?? '#4a6fa5'}33` }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', flex: 1, lineHeight: 1.35 }}>
                    {bl.entity_title || '—'}
                  </p>
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: '#fff', background: BLOCKER_COLORS[bl.blocker_type] ?? '#4a6fa5', borderRadius: 5, padding: '2px 7px', flexShrink: 0,
                  }}>
                    {BLOCKER_LABEL[bl.blocker_type] ?? bl.blocker_type}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
                  {bl.description}
                </p>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: 'var(--color-traffic-yellow-bg)', color: 'var(--color-traffic-yellow)',
                  }}>
                    Constrangimento Pendente
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {bl.entity_type === 'TASK' ? 'Acção' : 'Indicador'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {(stalled.length + blockers.length) > 0 && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {stalled.length > 0 && (
                <button
                  onClick={() => navigate('/projects')}
                  style={{ flex: 1, padding: '8px 0', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                >
                  Ver acções paradas <ChevronRight size={13} />
                </button>
              )}
              {blockers.length > 0 && (
                <button
                  onClick={() => navigate('/blockers')}
                  style={{ flex: 1, padding: '8px 0', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                >
                  Ver constrangimentos <ChevronRight size={13} />
                </button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ── Projects ─────────────────────────────────────────────────────────── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderKanban size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pilares Estratégicos da Direcção
            </p>
            <Badge variant="default" style={{ marginLeft: 4 }}>{projects.length}</Badge>
          </div>
          <button
            onClick={() => navigate('/projects')}
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Ver todos <ChevronRight size={13} />
          </button>
        </div>

        {projects.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0', textAlign: 'center' }}>
            Sem pilares estratégicos atribuídos a esta direcção.
          </p>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
              {projects.map((p: any) => (
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  style={{
                    width: 200,
                    padding: '14px 16px',
                    background: 'var(--color-bg-strong)',
                    borderRadius: 14,
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    transition: 'border-color 150ms, box-shadow 150ms',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'var(--color-primary)'
                    el.style.boxShadow = '0 4px 16px rgba(232,103,10,0.12)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = 'transparent'
                    el.style.boxShadow = 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{
                      fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: p.status === 'ACTIVE' ? 'var(--color-primary)' : 'var(--color-text-muted)',
                      background: p.status === 'ACTIVE' ? 'var(--color-primary-soft)' : 'var(--color-bg)',
                      borderRadius: 5, padding: '2px 7px',
                    }}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.35 }}>
                    {p.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>


      {/* ── Feedback Recente ──────────────────────────────────────────────────── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageSquare size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Feedback Recente
            </p>
            {(unreadData?.count ?? 0) > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 800, color: '#fff', background: 'var(--color-primary)',
                borderRadius: 10, padding: '2px 8px', minWidth: 18, textAlign: 'center',
              }}>
                {unreadData!.count}
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
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            <MessageSquare size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
            <p>Sem feedback recente</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {feedbackData.data.slice(0, 5).map((fb: Feedback) => {
              const catColor = FEEDBACK_CATEGORY_COLOR[fb.category] ?? FEEDBACK_CATEGORY_COLOR.GENERAL
              return (
                <div
                  key={fb.id}
                  onClick={() => navigate('/feedback')}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--color-bg-strong)',
                    cursor: 'pointer',
                    transition: 'border-color 150ms',
                    border: '1.5px solid transparent',
                    borderLeft: !fb.is_read ? '3px solid var(--color-primary)' : '3px solid transparent',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; if (!fb.is_read) (e.currentTarget as HTMLElement).style.borderLeftColor = 'var(--color-primary)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'var(--color-primary)', color: '#fff',
                        fontSize: 11, fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {(fb.sender?.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{fb.sender?.name ?? 'Utilizador'}</p>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5,
                          background: catColor.bg, color: catColor.text,
                        }}>
                          {FEEDBACK_CATEGORY_LABEL[fb.category] ?? fb.category}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', flexShrink: 0, fontWeight: 600 }}>
                      {timeAgo(fb.created_at)}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.4,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: fb.is_read ? 400 : 600,
                  }}>
                    {fb.message}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Recent Activity ──────────────────────────────────────────────────── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Activity size={15} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Actividade Recente
          </p>
        </div>

        {(() => {
          // Build a unified activity feed from available data
          const activities: { id: string; type: string; title: string; subtitle: string; color: string; icon: 'stalled' | 'blocker' | 'task' | 'dept'; time?: string }[] = []

          // Stalled tasks as activity items
          stalled.forEach((t: any) => {
            activities.push({
              id: `stalled-${t.id}`,
              type: 'Acção parada',
              title: t.title,
              subtitle: t.project_title ? `${t.project_title} · ${t.days_elapsed}d sem progresso` : `${t.days_elapsed}d sem progresso`,
              color: 'var(--color-traffic-red)',
              icon: 'stalled',
            })
          })

          // Blockers as activity items
          blockers.forEach((bl: any) => {
            activities.push({
              id: `blocker-${bl.id}`,
              type: `Constrangimento ${BLOCKER_LABEL[bl.blocker_type] ?? bl.blocker_type}`,
              title: bl.entity_title || 'Sem titulo',
              subtitle: bl.description,
              color: BLOCKER_COLORS[bl.blocker_type] ?? '#4a6fa5',
              icon: 'blocker',
              time: bl.created_at,
            })
          })

          // Dir tasks with pending milestones
          dirTasks.forEach((t: any) => {
            const pending = (t.indicadores ?? t.milestones ?? []).filter((m: any) => m.status === 'PENDING').length
            if (pending > 0) {
              activities.push({
                id: `task-${t.id}`,
                type: 'Marcos pendentes',
                title: t.title,
                subtitle: `${pending} marco${pending !== 1 ? 's' : ''} por actualizar`,
                color: 'var(--color-primary)',
                icon: 'task',
              })
            }
          })

          if (activities.length === 0) {
            return (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                <Activity size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p>Sem actividade recente registada</p>
              </div>
            )
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {activities.slice(0, 8).map((act, i, arr) => (
                <div
                  key={act.id}
                  style={{
                    display: 'flex', gap: 12, padding: '12px 0',
                    borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: `${act.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {act.icon === 'stalled' && <AlertOctagon size={14} style={{ color: act.color }} />}
                    {act.icon === 'blocker' && <ShieldAlert size={14} style={{ color: act.color }} />}
                    {act.icon === 'task' && <ListChecks size={14} style={{ color: act.color }} />}
                    {act.icon === 'dept' && <Building2 size={14} style={{ color: act.color }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: act.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {act.type}
                      </span>
                      {act.time && (
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                          {timeAgo(act.time)}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {act.title}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {act.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </Card>

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
            <p style={{ fontSize: 13, fontWeight: 600 }}>Sem dados geográficos para esta direcção.</p>
          </div>
        )}
      </Card>

      {/* ── Employee ranking + Top dept ranking (side by side) ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: deptScores.length > 1 ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
      <Card variant="elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ranking de Técnicos
            </p>
            <Badge variant="default" style={{ marginLeft: 4 }}>{employees.length}</Badge>
          </div>
          <button
            onClick={() => navigate('/analytics/top-performers')}
            style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            Ver ranking completo <ChevronRight size={13} />
          </button>
        </div>

        {/* Category filter pills */}
        {employees.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {(['ALL', 'DIR_DIRECAO', 'CHEFE_DEPT', 'DIR_REGIONAL', 'DIR_ASC', 'COLABORADOR'] as const).map(cat => {
              const count = cat === 'ALL'
                ? employees.length
                : employees.filter((e: any) => e.category === cat).length
              if (cat !== 'ALL' && count === 0) return null
              const isActive = empCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => { setEmpCategory(cat); setSelectedEmp(null) }}
                  style={{
                    padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontWeight: 700, fontSize: 11, transition: 'all 150ms',
                    background: isActive ? 'var(--color-primary)' : 'var(--color-bg-strong)',
                    color: isActive ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {cat === 'ALL' ? 'Todos' : CATEGORY_LABELS[cat] ?? cat}
                  <span style={{
                    marginLeft: 5, fontSize: 10,
                    background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-border)',
                    borderRadius: 10, padding: '0 5px',
                  }}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {employees.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <Users size={28} style={{ color: 'var(--color-primary)', opacity: 0.3, marginBottom: 8 }} />
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem técnicos registados nesta direcção.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selectedEmp ? '1fr 300px' : '1fr', gap: 20 }}>
            {/* Ranking list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 480, overflowY: 'auto' }}>
              {filteredEmps.slice(0, 6).map((emp: EmployeeRankItem, i: number) => {
                const etl = ((emp.traffic_light ?? 'RED') in TL_COLORS ? emp.traffic_light : 'RED') as TL
                const ec  = TL_COLORS[etl]
                const isTop = i < 3
                const isSelected = selectedEmp?.id === emp.id
                const msPct = emp.ms_total > 0 ? (emp.ms_done / emp.ms_total) * 100 : 0

                return (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmp(isSelected ? null : emp)}
                    style={{
                      padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
                      background: isSelected ? ec.bg : isTop ? `${ec.text}0d` : 'var(--color-bg-strong)',
                      border: `2px solid ${isSelected ? ec.text : isTop ? `${ec.text}33` : 'transparent'}`,
                      transition: 'all 150ms',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = `${ec.text}55` }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = isTop ? `${ec.text}33` : 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                      <span style={{ fontSize: isTop ? 20 : 12, fontWeight: 800, minWidth: 28, textAlign: 'center', color: isTop ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                        {isTop ? MEDALS[i] : `#${i + 1}`}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emp.name}
                        </p>
                        <div style={{ display: 'flex', gap: 5, marginTop: 2, alignItems: 'center' }}>
                          {emp.dept_name && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: 4, padding: '1px 5px' }}>
                              {emp.dept_name}
                            </span>
                          )}
                          {emp.category && CATEGORY_LABELS[emp.category] && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', borderRadius: 4, padding: '1px 5px' }}>
                              {CATEGORY_LABELS[emp.category]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: ec.text }}>{emp.total_score.toFixed(1)}</span>
                      </div>
                      <TrafficLight status={etl} showLabel={false} size="sm" />
                    </div>
                    <div style={{ paddingLeft: 40 }}>
                      <ProgressBar value={emp.total_score} variant="auto" height={4} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            Exec {(emp.execution_score ?? 0).toFixed(1)}%
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            Obj {(emp.goal_score ?? 0).toFixed(1)}%
                          </span>
                        </div>
                        {emp.ms_total > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>
                            {emp.ms_done}/{emp.ms_total} MS ({msPct.toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Detail sidebar */}
            {selectedEmp && (() => {
              const etl = ((selectedEmp.traffic_light ?? 'RED') in TL_COLORS ? selectedEmp.traffic_light : 'RED') as TL
              const ec  = TL_COLORS[etl]
              const msPct = selectedEmp.ms_total > 0 ? (selectedEmp.ms_done / selectedEmp.ms_total) * 100 : 0
              return (
                <div style={{ position: 'sticky', top: 80, alignSelf: 'start' }}>
                  <Card style={{ padding: 0, overflow: 'hidden', border: `2px solid ${ec.border}` }}>
                    {/* Coloured header */}
                    <div style={{ padding: '16px', background: ec.bg, borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          background: 'var(--color-primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 17, fontWeight: 900, flexShrink: 0,
                        }}>
                          {selectedEmp.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>{selectedEmp.name}</p>
                          {selectedEmp.dept_name && (
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 3 }}>{selectedEmp.dept_name}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 38, fontWeight: 900, color: ec.text, lineHeight: 1 }}>{selectedEmp.total_score.toFixed(1)}</span>
                        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>/100</span>
                      </div>
                      <TrafficLight status={etl} size="sm" style={{ marginTop: 6 }} />
                    </div>

                    {/* Stats */}
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { label: 'Execução', value: `${(selectedEmp.execution_score ?? 0).toFixed(1)}%` },
                          { label: 'Objectivos', value: `${(selectedEmp.goal_score ?? 0).toFixed(1)}%` },
                        ].map(row => (
                          <div key={row.label} style={{ padding: '10px', background: 'var(--color-bg-strong)', borderRadius: 8, textAlign: 'center' }}>
                            <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text)' }}>{row.value}</p>
                            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>{row.label}</p>
                          </div>
                        ))}
                      </div>

                      {selectedEmp.ms_total > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>Indicadores</span>
                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text)' }}>
                              {selectedEmp.ms_done}/{selectedEmp.ms_total} ({msPct.toFixed(0)}%)
                            </span>
                          </div>
                          <ProgressBar value={msPct} max={100} height={6} variant="auto" />
                        </div>
                      )}

                      {selectedEmp.category && CATEGORY_LABELS[selectedEmp.category] && (
                        <div style={{ padding: '8px 12px', background: 'var(--color-primary-soft)', borderRadius: 8, textAlign: 'center' }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)' }}>
                            {CATEGORY_LABELS[selectedEmp.category]}
                          </p>
                        </div>
                      )}

                      <button
                        onClick={() => setSelectedEmp(null)}
                        style={{ width: '100%', padding: '8px 0', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}
                      >
                        ✕ Fechar
                      </button>
                    </div>
                  </Card>
                </div>
              )
            })()}
          </div>
        )}
      </Card>

      {/* ── Top dept ranking ─────────────────────────────────────────────────── */}
      {deptScores.length > 1 && (
        <Card variant="elevated" style={{ alignSelf: 'start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Trophy size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ranking de Departamentos
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...deptScores]
              .sort((a: any, b: any) => b.total_score - a.total_score)
              .map((dept: any, i: number) => {
                const dtl = (dept.traffic_light ?? 'YELLOW') as TL
                const dc  = TL_COLORS[dtl]
                const isTop = i === 0
                return (
                  <div
                    key={dept.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: isTop ? dc.bg : 'var(--color-bg-strong)',
                      borderRadius: 10,
                      border: `1.5px solid ${isTop ? dc.border : 'transparent'}`,
                    }}
                  >
                    <span style={{ fontSize: i < 3 ? 18 : 12, fontWeight: 800, minWidth: 26, textAlign: 'center' }}>
                      {i < 3 ? MEDALS[i] : `${i + 1}.`}
                    </span>
                    <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {dept.name}
                    </p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {dept.execution_score.toFixed(0)}% exec
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: dc.text }}>{dept.total_score.toFixed(1)}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </Card>
      )}
      </div>
    </div>
  )
}
