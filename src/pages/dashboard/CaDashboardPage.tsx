import React, { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban, BarChart3, ShieldAlert, TrendingUp,
  Building2, Trophy, ChevronRight, CheckCircle2, FolderOpen,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import { projectsService } from '../../services/projects.service'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import StatCard from '../../components/domain/StatCard'
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function CaDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<DrillDownItem | null>(null)

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
    queryKey: ['dashboard', 'map', 'ASC', selected?.id],
    queryFn: () => dashboardService.getMap({ level: 'ASC', direcao_id: selected?.id }),
  })

  const { data: dirProjectsData } = useQuery({
    queryKey: ['projects', { direcao_id: selected?.id }],
    queryFn: () => projectsService.list({ direcao_id: selected!.id, limit: 50 }),
    enabled: !!selected?.id,
  })

  const { data: topDirecoes } = useQuery({
    queryKey: ['dashboard', 'top-performers', { entity_type: 'DIRECAO', limit: 5 }],
    queryFn: () => dashboardService.getTopPerformers({ entity_type: 'DIRECAO', limit: 5 }),
  })

  // ── Derived data ────────────────────────────────────────────────────────────
  const perf        = summary?.performance
  const dirList     = direcoes?.items ?? []
  const mapFeatures = useMemo(() => mapData?.features ?? [], [mapData])
  const topList     = topDirecoes?.ranking ?? []
  const dirProjects = dirProjectsData?.data ?? []

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
            Bom dia, {user?.name?.split(' ')[0] ?? 'utilizador'}
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

      {/* ── KPI stat cards ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard
          label="Total Projectos"
          value={summary?.total_projects ?? 0}
          icon={<FolderKanban size={17} />}
        />
        <StatCard
          label="Score Empresa"
          value={perf ? perf.total_score.toFixed(1) : '—'}
          icon={<BarChart3 size={17} />}
          color="var(--color-traffic-yellow-bg)"
        />
        <StatCard
          label="Milestones Concluídos"
          value={summary?.milestones_done ?? 0}
          icon={<CheckCircle2 size={17} />}
          color="var(--color-traffic-green-bg)"
        />
        <StatCard
          label="Impedimentos"
          value={summary?.milestones_blocked ?? 0}
          icon={<ShieldAlert size={17} />}
          color="var(--color-traffic-red-bg)"
        />
      </div>

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
              style={{ fontSize: 12, color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              ✕ Limpar filtro
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

      {/* ── Projectos da Direcção seleccionada ───────────────────────────────── */}
      {selected && (
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <FolderOpen size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Projectos — {selected.name}
            </p>
            <Badge variant="default" style={{ marginLeft: 4 }}>{dirProjects.length}</Badge>
          </div>
          {dirProjects.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0' }}>
              Sem projectos atribuídos a esta direcção.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
              {dirProjects.map(p => {
                const tl = (p.performance?.traffic_light ?? 'RED') as TL
                const c  = TL_COLORS[tl]
                const statusLabel: Record<string, string> = { ACTIVE: 'Activo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' }
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    style={{
                      padding: '16px',
                      background: 'var(--color-bg-strong)',
                      borderRadius: 14,
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      transition: 'border-color 150ms, box-shadow 150ms',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = c.border
                      el.style.boxShadow = `0 0 0 3px ${c.border}22`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = 'transparent'
                      el.style.boxShadow = 'none'
                    }}
                  >
                    {/* Header row: dot + status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.border, flexShrink: 0 }} />
                      <span style={{
                        fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: 6, padding: '2px 7px',
                      }}>
                        {statusLabel[p.status] ?? p.status}
                      </span>
                    </div>

                    {/* Title */}
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.35, flex: 1 }}>
                      {p.title}
                    </p>

                    {/* Score block */}
                    {p.performance ? (
                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                        <p style={{ fontSize: 26, fontWeight: 900, color: c.text, lineHeight: 1, marginBottom: 5 }}>
                          {p.performance.total_score.toFixed(1)}
                        </p>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            Exec {p.performance.execution_score.toFixed(0)}%
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            Obj {p.performance.goal_score.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem dados de performance</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </Card>
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
            onSelect={() => navigate('/analytics/map')}
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
                  { label: 'Milestones concluídos',    value: summary?.milestones_done ?? 0,     warn: false },
                  { label: 'Milestones pendentes',     value: summary?.milestones_pending ?? 0,  warn: false },
                  { label: 'Milestones bloqueados',    value: summary?.milestones_blocked ?? 0,  warn: true  },
                  { label: 'Total tarefas',            value: summary?.total_tasks ?? 0,         warn: false },
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
    </div>
  )
}
