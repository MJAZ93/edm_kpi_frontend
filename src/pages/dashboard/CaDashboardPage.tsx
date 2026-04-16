import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3, TrendingUp,
  Building2, Trophy, ChevronRight, MessageSquare, ArrowRight, X,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import { projectsService } from '../../services/projects.service'
import { feedbackService } from '../../services/feedback.service'
import type { Feedback } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts'
import HoverReferenceLine from '../../components/charts/HoverReferenceLine'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import PerformanceMap from '../../components/map/PerformanceMap'
import type { DrillDownItem } from '../../types'

// ── Colour helpers ────────────────────────────────────────────────────────────

type TL = 'GREEN' | 'YELLOW' | 'RED'

const TL_COLORS: Record<TL, { bg: string; border: string; text: string }> = {
  GREEN:  { bg: 'var(--color-traffic-green-bg)',  border: 'var(--color-traffic-green)',  text: 'var(--color-traffic-green)'  },
  YELLOW: { bg: 'var(--color-traffic-yellow-bg)', border: 'var(--color-traffic-yellow)', text: 'var(--color-traffic-yellow)' },
  RED:    { bg: 'var(--color-traffic-red-bg)',    border: 'var(--color-traffic-red)',    text: 'var(--color-traffic-red)'    },
}

const MEDALS = ['🥇', '🥈', '🥉', '4.º', '5.º']

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function CaDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<DrillDownItem | null>(null)
  const [selectedPilar, setSelectedPilar] = useState<any | null>(null)
  const [chartTab, setChartTab] = useState<'objectivos' | 'execucao'>('objectivos')

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data: summary, isLoading } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: dashboardService.getSummary,
  })

  const { data: direcoes } = useQuery({
    queryKey: ['dashboard', 'drill-down', 'ALL_DIRECOES'],
    queryFn: () => dashboardService.getDrillDown({ level: 'ALL_DIRECOES' }),
  })

  const { data: mapData } = useQuery({
    queryKey: ['dashboard', 'map', 'ASC'],
    queryFn: () => dashboardService.getMap({ level: 'ASC' }),
  })

  const { data: dirProjectsData } = useQuery({
    queryKey: ['projects', { direcao_id: selected?.id }],
    queryFn: () => projectsService.list({ direcao_id: selected!.id, limit: 50 }),
    enabled: !!selected?.id,
  })

  const { data: pilarHistoryData } = useQuery({
    queryKey: ['projects', 'history', selectedPilar?.id],
    queryFn: () => projectsService.listHistory(selectedPilar!.id),
    enabled: !!selectedPilar?.id,
  })

  const { data: execHistoryData } = useQuery({
    queryKey: ['projects', 'execution-history', selectedPilar?.id],
    queryFn: () => projectsService.listExecutionHistory(selectedPilar!.id),
    enabled: !!selectedPilar?.id && chartTab === 'execucao',
  })

  const { data: topDirecoes } = useQuery({
    queryKey: ['dashboard', 'top-performers', { entity_type: 'DIRECAO', limit: 5 }],
    queryFn: () => dashboardService.getTopPerformers({ entity_type: 'DIRECAO', limit: 5 }),
  })

  const { data: feedbackData } = useQuery({
    queryKey: ['feedback', 'received', { page: 0, limit: 5 }],
    queryFn: () => feedbackService.listReceived({ page: 0, limit: 5 }),
  })

  const { data: unreadData } = useQuery({
    queryKey: ['feedback', 'unread-count'],
    queryFn: feedbackService.unreadCount,
  })

  // ── Derived data ────────────────────────────────────────────────────────────
  const perf        = summary?.performance
  const dirList     = direcoes?.items ?? []
  const mapFeatures = useMemo(() => mapData?.features ?? [], [mapData])
  const topList     = topDirecoes?.ranking ?? []
  const dirProjects = dirProjectsData?.data ?? []
  const pilarHistory = pilarHistoryData?.entries ?? []

  // Auto-select first direcao when list loads and nothing is selected
  React.useEffect(() => {
    if (dirList.length > 0 && !selected) {
      setSelected(dirList[0])
    }
  }, [dirList]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first pilar when projects load
  React.useEffect(() => {
    if (dirProjects.length > 0 && (!selectedPilar || !dirProjects.find((p: any) => p.id === selectedPilar?.id))) {
      setSelectedPilar(dirProjects[0])
    }
  }, [dirProjects]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clear selected pilar when direcao changes
  React.useEffect(() => {
    setSelectedPilar(null)
  }, [selected?.id])

  const today   = new Date()
  const dayName = today.toLocaleDateString('pt-MZ', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' })

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  }

  const tlPerf = (perf?.traffic_light ?? 'YELLOW') as TL
  const perfColors = TL_COLORS[tlPerf]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Hero header ──────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, #7a3a00 100%)',
        borderRadius: 16,
        padding: '28px 32px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 8px 32px rgba(232,103,10,0.22)',
      }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.70, marginBottom: 6, textTransform: 'capitalize', letterSpacing: '0.02em' }}>
            {dayName}, {dateStr}
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4, letterSpacing: '-0.02em' }}>
            {new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 19 ? 'Boa tarde' : 'Boa noite'}, {user?.name?.split(' ')[0] ?? 'utilizador'}
          </h1>
          <p style={{ fontSize: 14, opacity: 0.75, fontWeight: 500 }}>Painel executivo · Visão geral de performance</p>
        </div>
        {perf && (
          <div style={{
            textAlign: 'center',
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 16,
            padding: '16px 28px',
            backdropFilter: 'blur(8px)',
          }}>
            <p style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {perf.total_score.toFixed(1)}
            </p>
            <p style={{ fontSize: 11, opacity: 0.75, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>
              Score Geral
            </p>
          </div>
        )}
      </div>

      {/* KPI stat cards removed — info available in hero + detail panel */}

      {/* ── Direcções — filter cards ─────────────────────────────────────────── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Building2 size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Direcções
              {selected && (
                <span style={{ color: 'var(--color-primary)', fontWeight: 800 }}> · {selected.name}</span>
              )}
            </p>
          </div>
          {selected && (
            <button
              onClick={() => setSelected(null)}
              style={{
                fontSize: 12, color: 'var(--color-primary)', background: 'var(--color-primary-soft)',
                border: '1px solid var(--color-primary)33', borderRadius: 8, cursor: 'pointer',
                fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                transition: 'all 150ms',
              }}
            >
              <X size={12} /> Desselecionar
            </button>
          )}
        </div>

        {dirList.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '20px 0', textAlign: 'center' }}>
            Sem dados de direcções disponíveis.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
            {dirList.map(dir => {
              const tl = (dir.traffic_light ?? 'YELLOW') as TL
              const c  = TL_COLORS[tl]
              const isActive = selected?.id === dir.id
              return (
                <div
                  key={dir.id}
                  onClick={() => setSelected(isActive ? null : dir)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: isActive ? c.bg : 'var(--color-bg-strong)',
                    border: `2px solid ${isActive ? c.border : 'transparent'}`,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                    boxShadow: isActive ? `0 0 0 3px ${c.border}22` : 'none',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = c.bg }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-strong)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.border, marginTop: 2, flexShrink: 0 }} />
                    {isActive && (
                      <span style={{ fontSize: 8, fontWeight: 800, color: c.text, textTransform: 'uppercase', letterSpacing: '0.06em', background: c.bg, padding: '2px 5px', borderRadius: 4, border: `1px solid ${c.border}` }}>
                        Activo
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8, lineHeight: 1.3 }}>
                    {dir.name}
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: c.text, lineHeight: 1, marginBottom: 6 }}>
                    {dir.total_score.toFixed(1)}
                  </p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Exec {dir.execution_score.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Obj {dir.goal_score.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Pilares — Evolução de Valor ─────────────────────────────────────── */}
      {selected && dirProjects.length > 0 && (
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
                const tl = (p.performance?.traffic_light ?? 'RED') as TL
                const c = TL_COLORS[tl]
                const isActive = selectedPilar?.id === p.id
                const exec = p.performance?.execution_score ?? 0
                const goal = p.performance?.goal_score ?? 0
                const score = p.performance?.total_score ?? 0
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPilar(p)}
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
                      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.25, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.title}
                      </p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {p.goal_label || 'Objectivo'}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: c.text }}>
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

          {/* Chart — project value history */}
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
                    <ResponsiveContainer width="100%" height={370}>
                      <LineChart data={chartData} margin={{ top: 28, right: 60, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.06)" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11, fontWeight: 700, fill: 'var(--color-text)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} domain={[0, (max: number) => Math.max(100, Math.ceil(max * 1.1))]} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip
                          contentStyle={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: 'var(--shadow-soft)', fontSize: 13 }}
                          formatter={(value: any, name: string) => [`${Number(value).toFixed(1)}%`, name === 'exec_pct' ? 'Período' : 'Acumulado']}
                        />
                        <ReferenceLine y={100} stroke="#16a34a" strokeDasharray="8 4" strokeWidth={1.5} label={{ value: 'Meta: 100%', fill: '#16a34a', fontSize: 11, fontWeight: 700 }} />
                        <Line type="monotone" dataKey="exec_pct" name="Período" stroke="#e8670a" strokeWidth={2.5} dot={{ r: 5, fill: '#e8670a', strokeWidth: 0 }} />
                        <Line type="monotone" dataKey="cum_exec_pct" name="Acumulado" stroke="#4a6fa5" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4, fill: '#4a6fa5', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
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

                  // Custom bar shape: old bars thinner, recent wider, forecast dashed
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

                  // Forecast badge
                  const isReduction = targetVal < startVal

                  // Custom label: color-coded by trend (green=improved, red=worsened, black=same)
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
                <p style={{ fontSize: 13, fontWeight: 600 }}>Seleccione um pilar para ver a evolução do valor.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Map ──────────────────────────────────────────────────────────────── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 2 }}>
              Mapa de Performance — ASCs
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {mapFeatures.length} {mapFeatures.length === 1 ? 'área' : 'áreas'} de serviço ao cliente · clique para detalhes
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
            features={mapFeatures.map(f => ({
              geometry: f.geometry as any,
              properties: f.properties,
            }))}
            height={440}
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
            height: 280,
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
            <p style={{ fontSize: 13, fontWeight: 600 }}>Sem dados geográficos configurados.</p>
            <p style={{ fontSize: 12 }}>Adicione regiões e ASCs com polígonos em Geografia.</p>
          </div>
        )}
      </Card>

      {/* ── Top performers + detalhe ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Ranking */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Trophy size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ranking — Direcções
            </p>
          </div>

          {topList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0' }}>Sem dados de performance.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topList.map((item, i) => {
                const tl = (item.traffic_light ?? 'YELLOW') as TL
                const c  = TL_COLORS[tl]
                const isTop = i === 0
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      background: isTop ? c.bg : 'var(--color-bg-strong)',
                      borderRadius: 10,
                      border: `1.5px solid ${isTop ? c.border : 'transparent'}`,
                      cursor: 'pointer',
                      transition: 'border-color 150ms',
                    }}
                    onClick={() => setSelected(dirList.find(d => d.id === item.id) ?? null)}
                    onMouseEnter={e => { if (!isTop) (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
                    onMouseLeave={e => { if (!isTop) (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
                  >
                    <span style={{ fontSize: i < 3 ? 20 : 13, fontWeight: 800, minWidth: 28, textAlign: 'center' }}>
                      {MEDALS[i] ?? `${i + 1}.`}
                    </span>
                    <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.name}
                    </p>
                    <span style={{ fontSize: 15, fontWeight: 900, color: c.text, flexShrink: 0 }}>
                      {item.total_score.toFixed(1)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <button
            onClick={() => navigate('/analytics/top-performers')}
            style={{ width: '100%', marginTop: 14, padding: '8px 0', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            Ver top performers completo <ChevronRight size={13} />
          </button>
        </Card>

        {/* Detalhe direcção seleccionada / resumo geral */}
        <Card variant="elevated">
          {selected ? (
            /* ── Detalhe da direcção seleccionada ── */
            (() => {
              const tl = (selected.traffic_light ?? 'YELLOW') as TL
              const c  = TL_COLORS[tl]
              return (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Building2 size={15} style={{ color: 'var(--color-primary)' }} />
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Detalhe
                    </p>
                  </div>

                  <div style={{ textAlign: 'center', padding: '20px 16px', borderRadius: 14, background: c.bg, border: `2px solid ${c.border}`, marginBottom: 16 }}>
                    <p style={{ fontSize: 44, fontWeight: 900, color: c.text, lineHeight: 1, letterSpacing: '-0.02em' }}>
                      {selected.total_score.toFixed(1)}
                    </p>
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginTop: 8 }}>
                      {selected.name}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Execução',      value: `${selected.execution_score.toFixed(1)}%` },
                      { label: 'Objectivos',    value: `${selected.goal_score.toFixed(1)}%`      },
                      { label: 'Departamentos', value: selected.children_count                    },
                    ].map(row => (
                      <div key={row.label} style={{ padding: '12px 14px', background: 'var(--color-bg-strong)', borderRadius: 10, textAlign: 'center' }}>
                        <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-text)' }}>{row.value}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2 }}>{row.label}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setSelected(null)}
                    style={{ width: '100%', marginTop: 14, padding: '8px 0', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}
                  >
                    ✕ Fechar detalhe
                  </button>
                </>
              )
            })()
          ) : (
            /* ── Resumo geral ── */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <BarChart3 size={15} style={{ color: 'var(--color-primary)' }} />
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Resumo Geral
                </p>
              </div>

              {/* Company score pill */}
              {perf && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  background: perfColors.bg,
                  borderRadius: 12,
                  border: `1.5px solid ${perfColors.border}`,
                  marginBottom: 16,
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: perfColors.border, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                      Performance da empresa
                    </p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                      Exec: {perf.execution_score.toFixed(1)}% · Obj: {perf.goal_score.toFixed(1)}%
                    </p>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 900, color: perfColors.text }}>{perf.total_score.toFixed(1)}</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Direcções activas',       value: dirList.length,                    warn: false },
                  { label: 'Indicadores concluídos',    value: summary?.milestones_done ?? 0,     warn: false },
                  { label: 'Indicadores pendentes',     value: summary?.milestones_pending ?? 0,  warn: false },
                  { label: 'Indicadores bloqueados',    value: summary?.milestones_blocked ?? 0,  warn: true  },
                  { label: 'Total acções',            value: summary?.total_tasks ?? 0,         warn: false },
                ].map((row, i, arr) => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '11px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: row.warn ? 'var(--color-traffic-red)' : 'var(--color-text)' }}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 14, textAlign: 'center', fontStyle: 'italic' }}>
                Clique numa Direcção ou no ranking para ver o detalhe
              </p>
            </>
          )}
        </Card>
      </div>

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
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
    </div>
  )
}
