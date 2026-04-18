import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FolderKanban, CheckCircle2, BarChart3, ShieldAlert, AlertTriangle, Bell, Search, ArrowRight, Calendar, TrendingUp, MessageSquare } from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import { projectsService } from '../../services/projects.service'
import { feedbackService } from '../../services/feedback.service'
import type { Feedback } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import StatCard from '../../components/domain/StatCard'
import PerformanceScore from '../../components/domain/PerformanceScore'
import Leaderboard from '../../components/domain/Leaderboard'
import PerformanceLineChart from '../../components/charts/PerformanceLineChart'
import DonutChart from '../../components/charts/DonutChart'
import Button from '../../components/ui/Button'
import ProgressBar from '../../components/ui/ProgressBar'
import CaDashboardPage from './CaDashboardPage'
import DirecaoDashboardPage from './DirecaoDashboardPage'
import DepartamentoDashboardPage from './DepartamentoDashboardPage'
import MemberDashboardPage from './MemberDashboardPage'
import type { Role } from '../../types'

function fmtDate(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const TRAFFIC_DOT: Record<string, string> = {
  GREEN: 'var(--color-traffic-green)',
  YELLOW: 'var(--color-traffic-yellow)',
  RED: 'var(--color-traffic-red)',
}

const STATUS_BADGE: Record<string, 'orange' | 'success' | 'muted'> = {
  ACTIVE: 'orange',
  COMPLETED: 'success',
  CANCELLED: 'muted',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
}

const FEEDBACK_CATEGORY_LABEL: Record<string, string> = {
  GENERAL: 'Geral',
  PERFORMANCE: 'Desempenho',
  IMPROVEMENT: 'Melhoria',
  RECOGNITION: 'Reconhecimento',
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

const CREATOR_TYPE_LABEL: Record<string, string> = {
  CA: 'CA',
  PELOURO: 'Pelouro',
  DIRECAO: 'Direcção',
  DEPARTAMENTO: 'Departamento',
}

type CreatorTypeFilter = 'Todos' | Role

const FILTER_TABS: { label: string; value: CreatorTypeFilter }[] = [
  { label: 'Todos', value: 'Todos' },
  { label: 'CA', value: 'CA' },
  { label: 'Pelouro', value: 'PELOURO' },
  { label: 'Direcção', value: 'DIRECAO' },
  { label: 'Departamento', value: 'DEPARTAMENTO' },
]

// Detect if DEPARTAMENTO user is a dept head or a regular member.
// Uses member-overview which returns is_dept_head.
// userId is included in the key so different users never share this cache entry.
function DepartamentoRouter() {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'member-overview', user?.id],
    queryFn: dashboardService.getMemberOverview,
    staleTime: 0,
  })
  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  }
  if (data?.is_dept_head) return <DepartamentoDashboardPage />
  return <MemberDashboardPage />
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Executive roles (CA, PELOURO) get the PowerBI-style dashboard
  if (user?.role === 'CA' || user?.role === 'PELOURO') {
    return <CaDashboardPage />
  }

  // Director gets their own scoped dashboard
  if (user?.role === 'DIRECAO') {
    return <DirecaoDashboardPage />
  }

  // Department role: detect head vs regular member
  if (user?.role === 'DEPARTAMENTO') {
    return <DepartamentoRouter />
  }
  const [creatorFilter, setCreatorFilter] = useState<CreatorTypeFilter>('Todos')
  const [search, setSearch] = useState('')

  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardService.getSummary,
  })

  const { data: timeline } = useQuery({
    queryKey: ['dashboard', 'timeline', { entity_type: 'CA' }],
    queryFn: () => dashboardService.getTimeline({ entity_type: 'CA', from: '2026-01', to: '2026-12' }),
  })

  const { data: distribution } = useQuery({
    queryKey: ['dashboard', 'distribution', { dimension: 'BY_TRAFFIC_LIGHT' }],
    queryFn: () => dashboardService.getDistribution({ dimension: 'BY_TRAFFIC_LIGHT' }),
  })

  const { data: topAsc } = useQuery({
    queryKey: ['dashboard', 'top-performers', { entity_type: 'ASC' }],
    queryFn: () => dashboardService.getTopPerformers({ entity_type: 'ASC', limit: 5 }),
  })

  const { data: topDirecao } = useQuery({
    queryKey: ['dashboard', 'top-performers', { entity_type: 'DIRECAO' }],
    queryFn: () => dashboardService.getTopPerformers({ entity_type: 'DIRECAO', limit: 5 }),
  })

  const { data: activeProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', { status: 'ACTIVE', limit: 50 }],
    queryFn: () => projectsService.list({ status: 'ACTIVE', limit: 50 }),
  })

  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', 'received', { page: 0, limit: 5 }],
    queryFn: () => feedbackService.listReceived({ page: 0, limit: 5 }),
  })

  const { data: unreadData } = useQuery({
    queryKey: ['feedback', 'unread-count'],
    queryFn: feedbackService.unreadCount,
  })

  const allProjects = activeProjects?.data ?? []

  const filteredProjects = useMemo(() => {
    return allProjects.filter(p => {
      const matchesType = creatorFilter === 'Todos' || p.creator_type === creatorFilter
      const matchesSearch = !search || p.title.toLowerCase().includes(search.toLowerCase())
      return matchesType && matchesSearch
    })
  }, [allProjects, creatorFilter, search])

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  }

  const perf = summary?.performance
  const timelineData = timeline?.periods?.map(p => ({
    period: p.period.slice(5),
    total_score: p.total_score,
    execution_score: p.execution_score,
    goal_score: p.goal_score,
  })) ?? []

  const donutData = distribution?.data?.map(d => ({
    label: d.label === 'GREEN' ? 'Verde' : d.label === 'YELLOW' ? 'Amarelo' : 'Vermelho',
    count: d.count,
    percentage: d.percentage,
    color: d.label === 'GREEN' ? '#16a34a' : d.label === 'YELLOW' ? '#ca8a04' : '#dc2626',
  })) ?? []

  const ascRanking = topAsc?.ranking?.map(r => ({
    rank: r.rank, name: r.name, total_score: r.total_score,
    traffic_light: r.traffic_light as 'GREEN' | 'YELLOW' | 'RED',
  })) ?? []

  const direcaoRanking = topDirecao?.ranking?.map(r => ({
    rank: r.rank, name: r.name, total_score: r.total_score,
    traffic_light: r.traffic_light as 'GREEN' | 'YELLOW' | 'RED',
  })) ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Visão Geral"
        title={`${new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 19 ? 'Boa tarde' : 'Boa noite'}, ${user?.name?.split(' ')[0] ?? 'utilizador'}`}
        subtitle="Acompanhamento de performance e KPIs da empresa"
        badges={<Badge variant="orange">{user?.role}</Badge>}
        actions={<Button variant="primary" icon={<FolderKanban size={15} />} onClick={() => navigate('/projects')}>Ver Pilares Estratégicos</Button>}
      />

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Total Pilares Estratégicos"    value={summary?.total_projects ?? 0}     icon={<FolderKanban size={17} />} />
        <StatCard label="Indicadores Feitos"  value={summary?.milestones_done ?? 0}    icon={<CheckCircle2 size={17} />}  color="var(--color-green-soft)" />
        <StatCard label="Score Empresa"      value={perf ? `${perf.total_score.toFixed(1)}` : '—'} icon={<BarChart3 size={17} />} color="var(--color-traffic-yellow-bg)" />
        <StatCard label="Constrangimentos"       value={summary?.milestones_blocked ?? 0} icon={<ShieldAlert size={17} />}   color="var(--color-traffic-red-bg)" />
      </div>

      {/* Performance score + alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {perf && (
          <Card variant="elevated">
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Performance da Empresa</p>
            <PerformanceScore
              executionScore={perf.execution_score}
              goalScore={perf.goal_score}
              totalScore={perf.total_score}
              trafficLight={perf.traffic_light as 'GREEN' | 'YELLOW' | 'RED'}
            />
          </Card>
        )}

        <Card variant="elevated">
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Alertas Activos</p>
          {!summary?.alerts?.length ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
              <CheckCircle2 size={32} style={{ color: 'var(--color-traffic-green)', marginBottom: 8 }} />
              <p>Sem alertas activos</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {summary.alerts.slice(0, 4).map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--color-traffic-red-bg)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.15)' }}>
                  <AlertTriangle size={15} style={{ color: 'var(--color-traffic-red)', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 12, color: 'var(--color-traffic-red)', fontWeight: 600 }}>{a.message}</p>
                </div>
              ))}
              {summary.alerts.length > 4 && (
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', textAlign: 'center' }}>+{summary.alerts.length - 4} mais alertas</p>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card variant="elevated">
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>Tendência de Performance</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Evolução mensal dos scores</p>
          {timelineData.length > 0
            ? <PerformanceLineChart data={timelineData} height={240} />
            : <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Sem dados de histórico</div>
          }
        </Card>

        <Card variant="elevated">
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>Distribuição</p>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Por semáforo de performance</p>
          {donutData.length > 0
            ? <DonutChart data={donutData} height={180} centerValue={String(summary?.total_tasks ?? '')} centerLabel="Acções" />
            : <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>Sem dados</div>
          }
        </Card>
      </div>

      {/* Leaderboards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card variant="elevated">
          {ascRanking.length > 0
            ? <Leaderboard title="Top ASC" items={ascRanking} />
            : <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados de ASC</p>
          }
          <Button variant="ghost" size="sm" onClick={() => navigate('/analytics/top-performers')} style={{ marginTop: 12, width: '100%' }}>
            Ver todos
          </Button>
        </Card>
        <Card variant="elevated">
          {direcaoRanking.length > 0
            ? <Leaderboard title="Top Direcções" items={direcaoRanking} />
            : <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados de Direcções</p>
          }
          <Button variant="ghost" size="sm" onClick={() => navigate('/analytics/top-performers')} style={{ marginTop: 12, width: '100%' }}>
            Ver todos
          </Button>
        </Card>
      </div>

      {/* Pending indicadores summary */}
      <Card style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>Indicadores Pendentes</p>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
              {summary?.milestones_pending ?? 0} pendentes · {summary?.milestones_blocked ?? 0} bloqueados
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" icon={<Bell size={14} />} onClick={() => navigate('/notifications')}>Notificações</Button>
            <Button variant="primary" icon={<ShieldAlert size={14} />} onClick={() => navigate('/blockers')}>Constrangimentos</Button>
          </div>
        </div>
      </Card>

      {/* ── Feedback Recente ──────────────────────────────────────────────────── */}
      <Card variant="elevated" style={{ marginBottom: 24 }}>
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

      {/* ── Pilares Estratégicos Activos ─────────────────────────────────────────────────── */}
      <div>
        {/* Section header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginBottom: 2 }}>Pilares Estratégicos Activos</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{allProjects.length} pilar estratégico{allProjects.length !== 1 ? 's' : ''} activo{allProjects.length !== 1 ? 's' : ''}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<ArrowRight size={13} />}
            onClick={() => navigate('/projects')}
          >
            Ver todos os pilares estratégicos
          </Button>
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          {/* Tab group */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--color-bg-strong)', borderRadius: 10, padding: 4 }}>
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setCreatorFilter(tab.value)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  background: creatorFilter === tab.value ? 'var(--color-bg)' : 'transparent',
                  color: creatorFilter === tab.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  boxShadow: creatorFilter === tab.value ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 150ms ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Pesquisar pilar estratégico..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 30,
                paddingRight: 12,
                paddingTop: 7,
                paddingBottom: 7,
                border: '1.5px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 13,
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Projects grid */}
        {projectsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Spinner size="md" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
            Nenhum pilar estratégico encontrado.
          </div>
        ) : (
          <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 280px)',
              gap: 16,
              minWidth: 'max-content',
            }}>
              {filteredProjects.map(project => {
                const execScore = project.performance?.execution_score ?? 0
                const totalScore = project.performance?.total_score
                const trafficLight = project.performance?.traffic_light ?? 'YELLOW'
                const dotColor = TRAFFIC_DOT[trafficLight] ?? 'var(--color-text-muted)'

                return (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`)}
                    style={{
                      background: 'var(--color-bg)',
                      border: '1.5px solid var(--color-border)',
                      borderRadius: 14,
                      padding: 16,
                      cursor: 'pointer',
                      transition: 'box-shadow 150ms ease, border-color 150ms ease',
                      width: 280,
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
                      ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                    }}
                  >
                    {/* Title */}
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.title}
                    </p>

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      <Badge variant="default" style={{ fontSize: 10, padding: '2px 6px' }}>
                        {CREATOR_TYPE_LABEL[project.creator_type] ?? project.creator_type}
                      </Badge>
                      <Badge variant={STATUS_BADGE[project.status]} style={{ fontSize: 10, padding: '2px 6px' }}>
                        {STATUS_LABEL[project.status]}
                      </Badge>
                    </div>

                    {/* Date range */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
                      <Calendar size={11} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                        {fmtDate(project.start_date)} → {fmtDate(project.end_date)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Execução</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-soft)' }}>{Math.round(execScore)}%</span>
                      </div>
                      <ProgressBar value={execScore} max={100} height={5} variant="auto" />
                    </div>

                    {/* Score + traffic light */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Score total</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: dotColor }}>
                        {totalScore != null ? totalScore.toFixed(1) : '—'}
                      </span>
                    </div>

                    {/* Parent project tag */}
                    {project.parent && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          Sub-pilar de: {project.parent.title}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Ver todos link */}
        {filteredProjects.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button
              onClick={() => navigate('/projects')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-primary)',
                fontSize: 13,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              Ver todos os pilares estratégicos <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
