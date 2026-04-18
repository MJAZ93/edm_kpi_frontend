import React, { useState, useMemo } from 'react'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban, ShieldAlert, TrendingUp, Trophy, ChevronRight,
  AlertOctagon, Users, Building2, Layers, Clock, Activity,
  ListChecks, CheckCircle2, Circle, MessageSquare, ArrowRight,
  BarChart3, AlertTriangle, User,
} from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ReferenceLine } from 'recharts'
import InfoPopover from '../../components/ui/InfoPopover'
import HoverReferenceLine from '../../components/charts/HoverReferenceLine'
import { dashboardService } from '../../services/dashboard.service'
import { projectsService } from '../../services/projects.service'
import { tasksService } from '../../services/tasks.service'
import { milestonesService } from '../../services/milestones.service'
import { feedbackService } from '../../services/feedback.service'
import TasksMetaPanel from '../../components/domain/TasksMetaPanel'
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

  // Pilares chart state
  const [selectedPilar, setSelectedPilar] = useState<any | null>(null)
  const [chartTab, setChartTab] = useState<'objectivos' | 'execucao'>('objectivos')

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

  // Full project data (with performance, values, dates) — fetched separately like CA dashboard
  const dir = overview?.direction
  const { data: dirProjectsData } = useQuery({
    queryKey: ['projects', { direcao_id: dir?.id }],
    queryFn: () => projectsService.list({ direcao_id: dir!.id, limit: 50 }),
    enabled: !!dir?.id,
  })

  // Pilar history for chart
  const { data: pilarHistoryData } = useQuery({
    queryKey: ['projects', 'history', selectedPilar?.id],
    queryFn: () => projectsService.listHistory(selectedPilar!.id),
    enabled: !!selectedPilar?.id,
  })

  // Execution history for chart
  const { data: execHistoryData } = useQuery({
    queryKey: ['projects', 'execution-history', selectedPilar?.id],
    queryFn: () => projectsService.listExecutionHistory(selectedPilar!.id),
    enabled: !!selectedPilar?.id && chartTab === 'execucao',
    staleTime: 0,
  })

  // ── Derived ──────────────────────────────────────────────────────────────────
  const dirProjects = dirProjectsData?.data ?? []
  const stalled    = (overview?.stalled_tasks ?? []) as any[]
  const blockers   = (overview?.pending_blockers ?? []) as any[]
  const deptScores = (overview?.dept_scores ?? []) as any[]
  const overdueMilestones = (overview?.overdue_milestones ?? []) as any[]
  const employees: EmployeeRankItem[] = empData?.ranking ?? []
  const mapFeatures = mapData?.features ?? []
  const pilarHistory = pilarHistoryData?.entries ?? []

  // ── Tasks for Acções panel (one query per project in dirProjects) ─────────
  const taskQueries = useQueries({
    queries: dirProjects.map((p: any) => ({
      queryKey: ['tasks', { project_id: p.id }],
      queryFn: () => tasksService.list(p.id, { limit: 200 }),
      enabled: !!p.id,
      staleTime: 30_000,
    })),
  })
  const allTasks = useMemo(
    () => taskQueries.flatMap(q => q.data?.data ?? []),
    [taskQueries],
  )

  const tl = (dir?.traffic_light ?? 'YELLOW') as TL
  const c  = TL_COLORS[tl]

  const filteredEmps = empCategory === 'ALL'
    ? employees
    : employees.filter((e: any) => e.category === empCategory)

  const today   = new Date()
  const dayName = today.toLocaleDateString('pt-MZ', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' })

  // Auto-select first pilar when projects load (or reset if list is empty).
  // Run once on mount + whenever dirProjects changes so navigation always
  // lands with the first pilar pre-selected.
  React.useEffect(() => {
    if (dirProjects.length > 0) {
      if (!selectedPilar || !dirProjects.find((p: any) => p.id === selectedPilar?.id)) {
        setSelectedPilar(dirProjects[0])
      }
    } else {
      setSelectedPilar(null)
    }
  }, [dirProjects]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* ── Pilares — Evolução de Valor (like CA dashboard) ──────────────────── */}
      {dirProjects.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height: 580 }}>
          {/* Pilar list */}
          <Card variant="elevated" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <BarChart3 size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pilares
              </p>
              <Badge variant="default">{dirProjects.length}</Badge>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dirProjects.map((p: any) => {
                const ptl = (p.performance?.traffic_light ?? 'RED') as TL
                const pc = TL_COLORS[ptl]
                const isActive = selectedPilar?.id === p.id
                const exec = p.performance?.execution_score ?? 0
                const goal = p.performance?.goal_score ?? 0
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPilar(p)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: isActive ? pc.bg : 'var(--color-bg-strong)',
                      border: `1.5px solid ${isActive ? pc.border : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'all 120ms',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: pc.border, flexShrink: 0 }} />
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.25, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {p.goal_label || 'Objectivo'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: pc.text }}>
                        {(p.target_value ?? 0).toLocaleString('pt-PT')}
                      </span>
                    </div>
                    {/* Dual progress bars: Execução + Objectivo */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Exec</span>
                          <span style={{ fontSize: 8, fontWeight: 800, color: exec >= 60 ? '#16a34a' : exec >= 30 ? '#d97706' : '#dc2626' }}>{Math.max(0, exec).toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, exec))}%`, borderRadius: 2, background: exec >= 60 ? '#16a34a' : exec >= 30 ? '#d97706' : '#dc2626', transition: 'width 300ms' }} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Obj</span>
                          <span style={{ fontSize: 8, fontWeight: 800, color: goal >= 60 ? '#16a34a' : goal >= 30 ? '#d97706' : '#dc2626' }}>{Math.max(0, goal).toFixed(0)}%</span>
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

          {/* Chart — project value history / execution */}
          <Card variant="elevated" style={{ height: '100%', overflow: 'auto' }}>
            {selectedPilar ? (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                      {selectedPilar.goal_label || selectedPilar.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Tab switcher */}
                      <div style={{ display: 'flex', gap: 0, background: 'var(--color-bg-strong)', borderRadius: 10, padding: 3 }}>
                        {(['objectivos', 'execucao'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => setChartTab(tab)}
                            style={{
                              padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              fontSize: 11, fontWeight: 700,
                              background: chartTab === tab ? 'var(--color-surface)' : 'transparent',
                              color: chartTab === tab ? 'var(--color-text)' : 'var(--color-text-muted)',
                              boxShadow: chartTab === tab ? 'var(--shadow-soft)' : 'none',
                              transition: 'all 150ms',
                            }}
                          >
                            {tab === 'objectivos' ? 'Objectivos' : 'Execução'}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={() => navigate(`/projects/${selectedPilar.id}`)}
                        style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        Ver pilar <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>

                  {selectedPilar.goal_label && (
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4 }}>
                      {selectedPilar.title}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Valor Inicial</p>
                      <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)' }}>{(selectedPilar.start_value ?? 0).toLocaleString('pt-PT')}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Valor Actual</p>
                      <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-primary)' }}>{(selectedPilar.current_value ?? 0).toLocaleString('pt-PT')}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Meta</p>
                      <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-traffic-green)' }}>{(selectedPilar.target_value ?? 0).toLocaleString('pt-PT')}</p>
                    </div>
                    {selectedPilar.performance && (
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>Score</p>
                        <p style={{ fontSize: 22, fontWeight: 900, color: TL_COLORS[(selectedPilar.performance.traffic_light ?? 'RED') as TL].text }}>
                          {selectedPilar.performance.total_score.toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {chartTab === 'execucao' ? (() => {
                  const periods = execHistoryData?.periods ?? []
                  if (periods.length === 0) return (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-strong)', borderRadius: 12, color: 'var(--color-text-muted)' }}>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>Este pilar ainda não tem indicadores com datas.</p>
                    </div>
                  )

                  const chartData = periods.map((p: any) => ({
                    period: new Date(p.period + '-01').toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }),
                    exec_pct: p.exec_pct,
                    cum_exec_pct: p.cum_exec_pct,
                    planned: p.planned,
                    achieved: p.achieved,
                  }))

                  return (
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', top: 0, right: 0, zIndex: 10 }}>
                        <InfoPopover title="Como ler este gráfico">
                          <p style={{ margin: '0 0 10px', fontWeight: 700, color: 'var(--color-primary)', fontSize: 12 }}>🟠 Execução do período</p>
                          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-text-muted)' }}>
                            Progresso médio das acções cujos indicadores têm data nesse mês específico. Reflecte o esforço registado naquele mês.
                          </p>
                          <p style={{ margin: '0 0 10px', fontWeight: 700, color: '#4a6fa5', fontSize: 12 }}>🔵 Execução acumulada</p>
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-muted)' }}>
                            Média corrida desde o início até ao mês em questão. Mostra a tendência geral de progresso ao longo do tempo.
                          </p>
                        </InfoPopover>
                      </div>
                    <ResponsiveContainer width="100%" height={370}>
                      <LineChart data={chartData} margin={{ top: 28, right: 60, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.06)" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--color-text)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} domain={[0, (max: number) => Math.max(100, Math.ceil(max * 1.1))]} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip
                          contentStyle={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: 'var(--shadow-soft)', fontSize: 13 }}
                          formatter={(value: any, name: any) => [`${Number(value).toFixed(1)}%`, name === 'exec_pct' ? 'Execução do período' : 'Execução acumulada']}
                        />
                        <Legend
                          iconType="circle"
                          iconSize={8}
                          wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 4 }}
                          formatter={(value: string) => value === 'exec_pct' ? 'Execução do período' : 'Execução acumulada'}
                        />
                        <ReferenceLine y={100} stroke="#16a34a" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: 'Meta: 100%', fill: '#16a34a', fontSize: 11, fontWeight: 700 }} />
                        <Line type="monotone" dataKey="exec_pct" name="exec_pct" stroke="#e8670a" strokeWidth={2.5} dot={{ r: 5, fill: '#e8670a', strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="cum_exec_pct" name="cum_exec_pct" stroke="#4a6fa5" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#4a6fa5', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                    </div>
                  )
                })() : (() => {
                  const sorted = [...pilarHistory]
                    .sort((a: any, b: any) => (a.period_reference ?? a.created_at).localeCompare(b.period_reference ?? b.created_at))

                  const currentYear = new Date().getFullYear()
                  const chartEntries: any[] = sorted.map((h: any) => {
                    const ref = h.period_reference ?? ''
                    const year = parseInt(ref.slice(0, 4), 10)
                    const isRecent = year >= currentYear
                    return {
                      period: ref.length === 7
                        ? new Date(ref + '-01').toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' })
                        : ref || new Date(h.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' }),
                      valor: h.value,
                      type: isRecent ? 'recent' : 'old',
                    }
                  })

                  // Compute forecast
                  const startVal = selectedPilar.start_value ?? 0
                  const targetVal = selectedPilar.target_value ?? 0
                  const currentVal = selectedPilar.current_value ?? startVal
                  const startDate = selectedPilar.start_date ? new Date(selectedPilar.start_date) : null
                  const endDate = selectedPilar.end_date ? new Date(selectedPilar.end_date) : null
                  let forecastVal: number | null = null

                  if (startDate && endDate && chartEntries.length >= 2) {
                    const now = new Date()
                    const daysElapsed = Math.max(1, (now.getTime() - startDate.getTime()) / 86400000)
                    const daysRemaining = Math.max(0, (endDate.getTime() - now.getTime()) / 86400000)
                    const velocity = (currentVal - startVal) / daysElapsed
                    forecastVal = Math.round((currentVal + velocity * daysRemaining) * 100) / 100
                    const endLabel = endDate.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' })
                    chartEntries.push({
                      period: `${endLabel} (prev.)`,
                      valor: forecastVal,
                      type: 'forecast',
                    })
                  }

                  if (chartEntries.length === 0) return (
                    <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-strong)', borderRadius: 12, color: 'var(--color-text-muted)' }}>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>Este pilar ainda não tem registos de valor.</p>
                    </div>
                  )

                  const isReduction = targetVal < startVal

                  // Custom bar shape
                  const CustomBar = (props: any) => {
                    const { x, y, width, height, index } = props
                    const entry = chartEntries[index]
                    if (!entry || height <= 0) return null
                    const isOld = entry.type === 'old'
                    const isForecast = entry.type === 'forecast'
                    const barW = isOld ? Math.min(width, 18) : Math.min(width, 40)
                    const barX = x + (width - barW) / 2
                    const r = isOld ? 4 : 8

                    if (isForecast) {
                      return (
                        <g>
                          <rect x={barX} y={y} width={barW} height={height} rx={r} ry={r}
                            fill="none" stroke="#e8670a" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.6} />
                          <rect x={barX} y={y} width={barW} height={height} rx={r} ry={r}
                            fill="#e8670a" opacity={0.08} />
                        </g>
                      )
                    }
                    return (
                      <rect x={barX} y={y} width={barW} height={height} rx={r} ry={r}
                        fill={isOld ? '#d4c4a0' : '#e8670a'}
                        stroke={isOld ? 'transparent' : '#c4530a'}
                        strokeWidth={isOld ? 0 : 1.5}
                      />
                    )
                  }

                  // Custom label
                  const CustomLabel = (props: any) => {
                    const { x, y, width, index } = props
                    const entry = chartEntries[index]
                    if (!entry) return null
                    const isOld = entry.type === 'old'
                    const isForecast = entry.type === 'forecast'
                    const val = entry.valor

                    let trendColor = isOld ? '#aaa' : '#1a1a1a'
                    if (!isForecast && index > 0) {
                      const prev = chartEntries[index - 1]
                      if (prev && prev.type !== 'forecast') {
                        const diff = val - prev.valor
                        if (diff !== 0) {
                          const isGood = isReduction ? diff < 0 : diff > 0
                          trendColor = isGood ? '#16a34a' : '#dc2626'
                        }
                      }
                    }
                    if (isForecast) trendColor = '#e8670a'

                    return (
                      <text
                        x={x + width / 2} y={y - 8}
                        textAnchor="middle"
                        fontSize={isForecast ? 13 : isOld ? 10 : 13}
                        fontWeight={isForecast ? 900 : isOld ? 700 : 900}
                        fill={trendColor}
                        fontStyle={isForecast ? 'italic' : 'normal'}
                      >
                        {val.toLocaleString('pt-PT')}
                      </text>
                    )
                  }
                  const willReach = forecastVal != null && (isReduction ? forecastVal <= targetVal : forecastVal >= targetVal)

                  return (
                    <>
                      {forecastVal != null && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
                          padding: '10px 16px', borderRadius: 10,
                          background: willReach ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.06)',
                          border: `1.5px solid ${willReach ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
                        }}>
                          <TrendingUp size={16} style={{ color: willReach ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                              Previsão de fecho:{' '}
                              <strong style={{ fontSize: 15, color: willReach ? '#16a34a' : '#dc2626' }}>
                                {forecastVal.toLocaleString('pt-PT')}
                              </strong>
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                              {willReach ? 'Meta será atingida ao ritmo actual' : 'Meta em risco ao ritmo actual'}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                            padding: '3px 10px', borderRadius: 6,
                            background: willReach ? '#16a34a' : '#dc2626', color: '#fff',
                          }}>
                            {willReach ? 'No caminho' : 'Em risco'}
                          </span>
                        </div>
                      )}
                      <ResponsiveContainer width="100%" height={370}>
                        <BarChart data={chartEntries} margin={{ top: 28, right: 60, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.06)" vertical={false} />
                          <XAxis
                            dataKey="period"
                            tick={({ x, y, payload, index }: any) => {
                              const entry = chartEntries[index]
                              const isOld = entry?.type === 'old'
                              const isForecast = entry?.type === 'forecast'
                              return (
                                <text x={x} y={y + 14} textAnchor="middle"
                                  fontSize={isOld ? 9 : 12}
                                  fontWeight={isForecast ? 700 : isOld ? 400 : 800}
                                  fill={isForecast ? '#e8670a' : isOld ? '#bbb' : '#1a1a1a'}
                                  fontStyle={isForecast ? 'italic' : 'normal'}
                                >
                                  {payload.value}
                                </text>
                              )
                            }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false}
                            domain={[(min: number) => {
                              const refs = [startVal, targetVal].filter((v): v is number => v != null && v !== 0)
                              const allMin = Math.min(min, ...refs)
                              const pad = Math.max((Math.max(min, ...refs.map(r => r)) - allMin) * 0.15, 1)
                              return Math.floor(allMin - pad)
                            }, (max: number) => {
                              const refs = [startVal, targetVal].filter((v): v is number => v != null && v !== 0)
                              const allMax = Math.max(max, ...refs)
                              const pad = Math.max((allMax - Math.min(max, ...refs.map(r => r))) * 0.15, 1)
                              return Math.ceil(allMax + pad)
                            }]}
                          />
                          <Tooltip
                            contentStyle={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: 'var(--shadow-soft)', fontSize: 13 }}
                            formatter={(value: any, _name: any, props: any) => {
                              const entry = chartEntries[props?.payload?.__index ?? 0]
                              const label = entry?.type === 'forecast' ? 'Previsão' : (selectedPilar.goal_label || 'Valor')
                              return [Number(value).toLocaleString('pt-PT'), label]
                            }}
                          />
                          {targetVal != null && targetVal !== 0 && (
                            <HoverReferenceLine y={targetVal} text={`Meta: ${targetVal.toLocaleString('pt-PT')}`} color="#16a34a" strokeWidth={2} strokeDasharray="8 4" fontSize={12} fontWeight={800} />
                          )}
                          {startVal != null && startVal !== 0 && (
                            <HoverReferenceLine y={startVal} text={`Início: ${startVal.toLocaleString('pt-PT')}`} color="#888" strokeWidth={1.5} strokeDasharray="5 5" fontSize={11} fontWeight={700} />
                          )}
                          <Bar dataKey="valor" shape={<CustomBar />}>
                            <LabelList content={<CustomLabel />} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  )
                })()}
              </>
            ) : (
              <div style={{
                height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-muted)',
              }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Seleccione um pilar para ver a evolução.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Acções — Metas Mensais ────────────────────────────────────────────── */}
      {selectedPilar && (() => {
        const pilarTasks = allTasks.filter((t: any) => t.project_id === selectedPilar.id)
        return pilarTasks.length > 0 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Acções · Metas Mensais
              </p>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
                — {selectedPilar.title}
              </span>
            </div>
            <TasksMetaPanel tasks={pilarTasks} height={580} />
          </div>
        ) : null
      })()}

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
              const deptBlockerCount = blockers.filter((bl: any) =>
                (bl.entity_title ?? '').toLowerCase().includes(dept.name?.toLowerCase() ?? '')
              ).length
              const deptStalledCount = stalled.filter((t: any) =>
                (t.dept_name ?? '').toLowerCase() === (dept.name?.toLowerCase() ?? '')
              ).length
              return (
                <div
                  key={dept.id}
                  onClick={() => navigate(`/org/departamentos/${dept.id}`)}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: dc.border, flexShrink: 0 }} />
                    <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 10, lineHeight: 1.3 }}>
                    {dept.name}
                  </p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: dc.text, lineHeight: 1, marginBottom: 8 }}>
                    {dept.total_score.toFixed(1)}
                  </p>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Exec {dept.execution_score.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Obj {dept.goal_score.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ height: 5, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, dept.execution_score)}%`, borderRadius: 999, background: dc.border, transition: 'width 500ms' }} />
                    </div>
                  </div>
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
            {/* Stalled tasks — now with dept name */}
            {stalled.map((task: any) => (
              <div
                key={`stalled-${task.id}`}
                onClick={() => navigate(`/tasks/${task.id}`)}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  {task.dept_name && (
                    <span
                      onClick={e => { e.stopPropagation(); navigate(`/org/departamentos/${task.dept_id}`) }}
                      style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text)', background: 'rgba(220,38,38,0.10)', borderRadius: 5, padding: '1px 7px', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 150ms' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecorationColor = 'var(--color-text)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecorationColor = 'transparent' }}
                    >
                      <Building2 size={9} /> {task.dept_name}
                    </span>
                  )}
                  {task.project_title && (
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                      {task.project_title}
                    </span>
                  )}
                </div>
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

      {/* ── Indicadores Atrasados ─────────────────────────────────────────────── */}
      {overdueMilestones.length > 0 && (
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={15} style={{ color: 'var(--color-traffic-red)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Indicadores Atrasados
            </p>
            <Badge variant="danger" style={{ marginLeft: 4 }}>{overdueMilestones.length}</Badge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {overdueMilestones.map((ms: any) => {
              const pct = ms.planned_value > 0 ? Math.min(100, Math.max(0, (ms.achieved_value / ms.planned_value) * 100)) : 0
              return (
                <div
                  key={ms.id}
                  onClick={() => navigate(`/tasks/${ms.task_id}`)}
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
                      {ms.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '2px 8px', borderRadius: 6, background: 'rgba(220,38,38,0.12)' }}>
                      <Clock size={10} style={{ color: 'var(--color-traffic-red)' }} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-traffic-red)' }}>
                        {ms.days_overdue}d atrasado
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                    {ms.assignee_name && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text)', background: 'rgba(232,103,10,0.10)', borderRadius: 5, padding: '1px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <User size={9} /> {ms.assignee_name}
                      </span>
                    )}
                    {ms.dept_name && (
                      <span
                        onClick={e => { e.stopPropagation(); navigate(`/org/departamentos/${ms.dept_id}`) }}
                        style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', background: 'rgba(220,38,38,0.08)', borderRadius: 5, padding: '1px 7px', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent', transition: 'text-decoration-color 150ms' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecorationColor = 'var(--color-text-muted)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecorationColor = 'transparent' }}
                      >
                        <Building2 size={9} /> {ms.dept_name}
                      </span>
                    )}
                    {ms.task_title && (
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                        {ms.task_title}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Progresso</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)' }}>
                      {ms.achieved_value.toLocaleString('pt-PT')}
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)' }}> / {ms.planned_value.toLocaleString('pt-PT')}</span>
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: 'var(--color-traffic-red)', transition: 'width 500ms' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Feedback Recente + Actividade Recente (side by side) ──────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Feedback Recente */}
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

        {/* Actividade Recente */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Actividade Recente
            </p>
          </div>

          {(() => {
            const activities: { id: string; type: string; title: string; subtitle: string; color: string; icon: 'stalled' | 'blocker' | 'task' | 'dept'; time?: string; link?: string }[] = []

            stalled.forEach((t: any) => {
              activities.push({
                id: `stalled-${t.id}`,
                type: 'Acção parada',
                title: t.title,
                subtitle: [t.dept_name, t.project_title, `${t.days_elapsed}d sem progresso`].filter(Boolean).join(' · '),
                color: 'var(--color-traffic-red)',
                icon: 'stalled',
                link: `/tasks/${t.id}`,
              })
            })

            blockers.forEach((bl: any) => {
              activities.push({
                id: `blocker-${bl.id}`,
                type: `Constrangimento ${BLOCKER_LABEL[bl.blocker_type] ?? bl.blocker_type}`,
                title: bl.entity_title || 'Sem titulo',
                subtitle: bl.description,
                color: BLOCKER_COLORS[bl.blocker_type] ?? '#4a6fa5',
                icon: 'blocker',
                time: bl.created_at,
                link: `/blockers`,
              })
            })

            overdueMilestones.forEach((ms: any) => {
              activities.push({
                id: `overdue-${ms.id}`,
                type: 'Indicador atrasado',
                title: ms.title,
                subtitle: [ms.assignee_name, ms.dept_name, `${ms.days_overdue}d atrasado`].filter(Boolean).join(' · '),
                color: 'var(--color-traffic-red)',
                icon: 'task',
                link: `/tasks/${ms.task_id}`,
              })
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
              <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activities.map((act, i, arr) => (
                  <div
                    key={act.id}
                    onClick={() => act.link && navigate(act.link)}
                    style={{
                      display: 'flex', gap: 12, padding: '10px 4px',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                      cursor: act.link ? 'pointer' : 'default',
                      borderRadius: 8,
                      transition: 'background 120ms',
                    }}
                    onMouseEnter={e => { if (act.link) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-strong)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: `${act.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {act.icon === 'stalled' && <AlertOctagon size={13} style={{ color: act.color }} />}
                      {act.icon === 'blocker' && <ShieldAlert size={13} style={{ color: act.color }} />}
                      {act.icon === 'task' && <ListChecks size={13} style={{ color: act.color }} />}
                      {act.icon === 'dept' && <Building2 size={13} style={{ color: act.color }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: act.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {act.type}
                        </span>
                        {act.time && (
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                            {timeAgo(act.time)}
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {act.title}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {act.subtitle}
                      </p>
                    </div>
                    {act.link && <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0, alignSelf: 'center' }} />}
                  </div>
                ))}
              </div>
            )
          })()}
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
                    onClick={() => navigate(`/users/${emp.id}`)}
                    style={{
                      padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
                      background: isTop ? `${ec.text}0d` : 'var(--color-bg-strong)',
                      border: `2px solid ${isTop ? `${ec.text}33` : 'transparent'}`,
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
