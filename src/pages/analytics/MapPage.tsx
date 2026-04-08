import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, MapPin, FolderKanban,
  Building2, ListChecks, X,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import PageHeader from '../../components/layout/PageHeader'
import Select from '../../components/ui/Select'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import TrafficLight from '../../components/domain/TrafficLight'
import PerformanceMap from '../../components/map/PerformanceMap'
import ProgressBar from '../../components/ui/ProgressBar'

// ── helpers ───────────────────────────────────────────────────────────────────

type TL = 'GREEN' | 'YELLOW' | 'RED'

const TL_COLORS: Record<TL, { bg: string; border: string; text: string }> = {
  GREEN:  { bg: 'var(--color-traffic-green-bg)',  border: 'var(--color-traffic-green)',  text: 'var(--color-traffic-green)'  },
  YELLOW: { bg: 'var(--color-traffic-yellow-bg)', border: 'var(--color-traffic-yellow)', text: 'var(--color-traffic-yellow)' },
  RED:    { bg: 'var(--color-traffic-red-bg)',    border: 'var(--color-traffic-red)',    text: 'var(--color-traffic-red)'    },
}

function ScoreRing({ score, tl }: { score: number; tl: string }) {
  const c = TL_COLORS[(tl as TL) in TL_COLORS ? (tl as TL) : 'RED']
  const pct = Math.min(100, Math.max(0, score))
  return (
    <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
      <svg width={80} height={80} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={40} cy={40} r={32} fill="none" stroke="var(--color-border)" strokeWidth={8} />
        <circle
          cx={40} cy={40} r={32} fill="none"
          stroke={c.border} strokeWidth={8}
          strokeDasharray={`${(pct / 100) * 201.06} 201.06`}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: c.text, lineHeight: 1 }}>{score.toFixed(0)}</span>
        <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 600 }}>/100</span>
      </div>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--color-bg-strong)', borderRadius: 10, textAlign: 'center', flex: 1 }}>
      <p style={{ fontSize: 18, fontWeight: 900, color: color ?? 'var(--color-text)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
    </div>
  )
}

function SectionHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <span style={{ color: 'var(--color-primary)' }}>{icon}</span>
      <p style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  )
}

function getPeriodOptions() {
  return Array.from({ length: 12 }, (_, i) => {
    const val = `2026-${String(i + 1).padStart(2, '0')}`
    return { value: val, label: val }
  })
}

type SelItem = { id: number; name: string; total_score: number; traffic_light: string }

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('2026-04')
  const [drillRegion, setDrillRegion] = useState<SelItem | null>(null)
  const [selected, setSelected] = useState<SelItem | null>(null)

  // Map data
  const { data: regionalData, isLoading: loadingRegional } = useQuery({
    queryKey: ['dashboard', 'map', 'REGIONAL', period],
    queryFn: () => dashboardService.getMap({ level: 'REGIONAL', period }),
    enabled: !drillRegion,
  })

  const { data: ascData, isLoading: loadingASC } = useQuery({
    queryKey: ['dashboard', 'map', 'ASC', drillRegion?.id, period],
    queryFn: () => dashboardService.getMap({ level: 'ASC', regiao_id: drillRegion!.id, period }),
    enabled: !!drillRegion,
  })

  // Stats panel entity: selected ASC takes priority; fallback to the drilled region itself
  const statsEntity: SelItem | null = selected ?? drillRegion ?? null
  const statsType: 'ASC' | 'REGIAO' = selected ? 'ASC' : 'REGIAO'
  const { data: scopeStats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard', 'scope-stats', statsType, statsEntity?.id],
    queryFn: () => dashboardService.getScopeStats({ type: statsType, id: statsEntity!.id }),
    enabled: !!statsEntity?.id,
  })

  const activeData = drillRegion ? ascData : regionalData
  const isLoading  = drillRegion ? loadingASC : loadingRegional

  const features = activeData?.features?.map(f => ({
    geometry: f.geometry as any,
    properties: f.properties,
  })) ?? []

  const sorted = [...(activeData?.features ?? [])].sort(
    (a, b) => b.properties.total_score - a.properties.total_score
  )

  function handleMapSelect(props: SelItem) {
    if (!drillRegion) {
      setDrillRegion(props)
      setSelected(null)
    } else {
      setSelected(props)
    }
  }

  function handleSidebarClick(props: SelItem) {
    if (!drillRegion) {
      setDrillRegion(props)
      setSelected(null)
    } else {
      setSelected(props)
    }
  }

  function handleBack() {
    setDrillRegion(null)
    setSelected(null)
  }

  return (
    <div>
      <PageHeader eyebrow="Analytics" title="Mapa de Desempenho" subtitle="Performance geográfica por Região e ASC" />

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        {drillRegion ? (
          <button
            onClick={handleBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer',
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700,
              boxShadow: '0 2px 8px rgba(232,103,10,0.25)',
            }}
          >
            <ChevronLeft size={15} /> Regiões
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'var(--color-bg-strong)', border: '1.5px solid var(--color-border)', fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>
            <MapPin size={14} style={{ color: 'var(--color-primary)' }} /> Regiões
            <span style={{ fontSize: 11, fontWeight: 500, marginLeft: 2 }}>· clique para entrar</span>
          </div>
        )}

        {drillRegion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: 'var(--color-primary-soft)', border: '1.5px solid rgba(232,103,10,0.25)', fontSize: 13, fontWeight: 700, color: 'var(--color-primary)' }}>
            <MapPin size={14} /> {drillRegion.name}
          </div>
        )}

        <div style={{ marginLeft: 'auto', width: 160 }}>
          <Select options={getPeriodOptions()} value={period} onChange={e => setPeriod(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Map */}
        <div>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 120, background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <Spinner size="lg" />
            </div>
          ) : (
            <PerformanceMap
              features={features}
              height={520}
              onSelect={handleMapSelect}
            />
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ── Ranking list ── */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>
              {drillRegion ? 'ASCs' : 'Regiões'} — Ranking
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sorted.length === 0 && !isLoading && (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0', textAlign: 'center' }}>
                  Sem dados para esta {drillRegion ? 'região' : 'vista'}.
                </p>
              )}
              {sorted.map((f, i) => {
                const isActive = selected?.id === f.properties.id
                return (
                  <div
                    key={f.properties.id}
                    onClick={() => handleSidebarClick(f.properties)}
                    style={{
                      padding: '9px 13px', borderRadius: 10, cursor: 'pointer',
                      background: isActive ? 'var(--color-primary-soft)' : 'var(--color-surface)',
                      border: `1.5px solid ${isActive ? 'rgba(232,103,10,0.3)' : 'var(--color-border)'}`,
                      transition: 'all 120ms',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-bg-strong)' }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', minWidth: 18 }}>#{i + 1}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{f.properties.name}</span>
                      </div>
                      <TrafficLight status={f.properties.traffic_light} showLabel={false} size="sm" />
                    </div>
                    <ProgressBar value={f.properties.total_score} variant="auto" height={3} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Stats panel: shows as soon as a region is entered or an ASC is clicked ── */}
          {statsEntity ? (
            <Card variant="elevated" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{
                padding: '14px 16px 12px',
                background: (() => { const tl = (statsEntity.traffic_light as TL) in TL_COLORS ? (statsEntity.traffic_light as TL) : 'RED'; return TL_COLORS[tl].bg })(),
                borderBottom: '1px solid var(--color-border)',
                position: 'relative',
              }}>
                {/* Close button — only visible when an ASC is selected on top of a region */}
                {selected && (
                  <button
                    onClick={() => setSelected(null)}
                    style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 4, borderRadius: 6 }}
                  >
                    <X size={14} />
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <ScoreRing score={statsEntity.total_score} tl={statsEntity.traffic_light} />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>
                      {selected ? 'ASC' : 'Região'}
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>{statsEntity.name}</p>
                    <TrafficLight status={statsEntity.traffic_light as TL} size="sm" style={{ marginTop: 6 }} />
                  </div>
                </div>
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Score breakdown */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <StatPill label="Execução" value={scopeStats ? `${scopeStats.execution_score.toFixed(1)}%` : '—'} />
                  <StatPill label="Objectivos" value={scopeStats ? `${scopeStats.goal_score.toFixed(1)}%` : '—'} />
                </div>

                {loadingStats ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Spinner size="sm" /></div>
                ) : scopeStats ? (
                  <>
                    {/* Count pills */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <StatPill label="Acções" value={scopeStats.task_count} />
                      <StatPill label="Pilares Estratégicos" value={scopeStats.project_count} />
                      <StatPill label="Direcções" value={scopeStats.direction_count} />
                    </div>

                    {/* Projects */}
                    {scopeStats.projects.length > 0 && (
                      <div>
                        <SectionHead icon={<FolderKanban size={12} />} label="Pilares Estratégicos" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {scopeStats.projects.map(p => (
                            <div
                              key={p.id}
                              onClick={() => navigate(`/projects/${p.id}`)}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 10px', background: 'var(--color-bg-strong)', borderRadius: 8,
                                cursor: 'pointer', border: '1.5px solid transparent', transition: 'border-color 120ms',
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)'}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'transparent'}
                            >
                              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{p.title}</span>
                              <ChevronRight size={12} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Directions */}
                    {scopeStats.directions.length > 0 && (
                      <div>
                        <SectionHead icon={<Building2 size={12} />} label="Direcções envolvidas" />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {scopeStats.directions.map(d => (
                            <span
                              key={d.id}
                              style={{
                                fontSize: 11, fontWeight: 700,
                                padding: '4px 9px', borderRadius: 20,
                                background: 'var(--color-primary-soft)',
                                color: 'var(--color-primary)',
                                border: '1px solid rgba(232,103,10,0.2)',
                              }}
                            >
                              {d.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tasks */}
                    {scopeStats.tasks.length > 0 && (
                      <div>
                        <SectionHead icon={<ListChecks size={12} />} label="Acções" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {scopeStats.tasks.map(t => {
                            const pct = t.target_value > 0 ? Math.min(100, (t.current_value / t.target_value) * 100) : 0
                            return (
                              <div key={t.id} style={{ padding: '9px 10px', background: 'var(--color-bg-strong)', borderRadius: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, flex: 1, marginRight: 8 }}>{t.title}</span>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                                <ProgressBar value={pct} variant="auto" height={3} />
                                {t.project_title && (
                                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>{t.project_title}</p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {scopeStats.task_count === 0 && (
                      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
                        Sem acções atribuídas a {selected ? 'esta ASC' : 'esta região'}.
                      </p>
                    )}
                  </>
                ) : null}
              </div>
            </Card>
          ) : (
            /* Hint when nothing selected yet */
            <Card variant="elevated" style={{ textAlign: 'center', padding: '20px 16px' }}>
              <MapPin size={24} style={{ color: 'var(--color-primary)', opacity: 0.45, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Clique numa região para ver as ASCs e estatísticas
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
