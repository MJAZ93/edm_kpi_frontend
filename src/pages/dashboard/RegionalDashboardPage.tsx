import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Map, FolderKanban, ChevronRight, CheckCircle2, Clock,
  ShieldAlert, TrendingUp, MapPin, BarChart3, ListChecks,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import { useAuth } from '../../hooks/useAuth'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import ProgressBar from '../../components/ui/ProgressBar'
import PerformanceMap from '../../components/map/PerformanceMap'
import type { MapFeatureProps } from '../../components/map/PerformanceMap'

// ── Traffic light helpers ─────────────────────────────────────────────────────

type TL = 'GREEN' | 'YELLOW' | 'RED'
const TL_COLORS: Record<TL, { bg: string; border: string; text: string }> = {
  GREEN:  { bg: 'var(--color-traffic-green-bg)',  border: 'var(--color-traffic-green)',  text: 'var(--color-traffic-green)'  },
  YELLOW: { bg: 'var(--color-traffic-yellow-bg)', border: 'var(--color-traffic-yellow)', text: 'var(--color-traffic-yellow)' },
  RED:    { bg: 'var(--color-traffic-red-bg)',    border: 'var(--color-traffic-red)',    text: 'var(--color-traffic-red)'    },
}
const TL_FILL: Record<TL, string> = {
  GREEN: '#16a34a', YELLOW: '#ca8a04', RED: '#dc2626',
}
const tlKey = (v: string): TL => (v in TL_COLORS ? v as TL : 'RED')

function ScoreRing({ score, tl, size = 100 }: { score: number; tl: string; size?: number }) {
  const c = TL_COLORS[tlKey(tl)]
  const r = size / 2 - 8
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c.border} strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
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

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado',
}
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'muted' | 'default'> = {
  ACTIVE: 'warning', COMPLETED: 'success', CANCELLED: 'muted',
}

const MS_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente', DONE: 'Concluído', BLOCKED: 'Bloqueado',
}
const MS_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  PENDING: 'warning', DONE: 'success', BLOCKED: 'danger',
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegionalDashboardPage() {
  const { user }  = useAuth()
  const navigate  = useNavigate()

  const { data: overview, isLoading } = useQuery({
    queryKey: ['dashboard', 'regional-overview'],
    queryFn: dashboardService.getRegionalOverview,
  })

  const regiao  = overview?.regiao
  const regiaoId = regiao?.id

  // Map data for ASCs in this region
  const { data: mapData } = useQuery({
    queryKey: ['dashboard', 'map', 'ASC', 'regiao', regiaoId],
    queryFn: () => dashboardService.getMap({ level: 'ASC', regiao_id: regiaoId }),
    enabled: !!regiaoId,
  })
  const mapFeatures = mapData?.features ?? []

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  }

  if (!regiao) {
    return (
      <Card variant="elevated" style={{ padding: '40px 32px', textAlign: 'center' }}>
        <MapPin size={40} style={{ color: 'var(--color-primary)', opacity: 0.4, margin: '0 auto 16px' }} />
        <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>
          Sem região atribuída
        </p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', maxWidth: 420, margin: '0 auto' }}>
          O seu utilizador não está configurado como responsável de nenhuma direcção nem região.
        </p>
      </Card>
    )
  }

  const ascs: any[]        = overview?.ascs       ?? []
  const projects: any[]    = overview?.projects    ?? []
  const milestones: any[]  = overview?.milestones  ?? []
  const stats              = overview?.stats       ?? { total_milestones: 0, done: 0, pending: 0, blocked: 0 }

  const tl = tlKey(regiao.traffic_light)
  const c  = TL_COLORS[tl]

  const today   = new Date()
  const dayName = today.toLocaleDateString('pt-MZ', { weekday: 'long' })
  const dateStr = today.toLocaleDateString('pt-MZ', { day: 'numeric', month: 'long', year: 'numeric' })

  // Sort ASCs by score descending
  const ascsSorted = [...ascs].sort((a, b) => b.total_score - a.total_score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Hero banner ──────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 20,
        padding: '22px 28px',
        background: `linear-gradient(135deg, ${c.bg} 0%, var(--color-surface) 100%)`,
        borderRadius: 'var(--radius-lg)', border: `1.5px solid ${c.border}33`, boxShadow: 'var(--shadow-soft)',
      }}>
        {/* Score ring */}
        <ScoreRing score={regiao.total_score} tl={regiao.traffic_light} size={104} />

        {/* Identity */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
            Director Regional · Visibilidade
          </p>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-text)', marginBottom: 4 }}>
            {user?.name ?? 'Director Regional'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <MapPin size={11} color="var(--color-text-muted)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-soft)' }}>{regiao.name}</span>
          </div>
          <div style={{ display: 'flex', gap: 18 }}>
            {[
              { label: 'Execução',  val: regiao.execution_score.toFixed(1) },
              { label: 'Objectivo', val: regiao.goal_score.toFixed(1) },
              { label: 'ASCs',      val: ascs.length },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                <p style={{ fontSize: 15, fontWeight: 900, color: c.text }}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: <TrendingUp size={13} />,   label: 'Total',      val: stats.total_milestones, bg: 'var(--color-primary)' },
            { icon: <CheckCircle2 size={13} />, label: 'Concluídos', val: stats.done,              bg: 'var(--color-traffic-green)' },
            { icon: <Clock size={13} />,        label: 'Pendentes',  val: stats.pending,            bg: 'var(--color-traffic-yellow)' },
            { icon: <ShieldAlert size={13} />,  label: 'Bloqueados', val: stats.blocked,            bg: 'var(--color-traffic-red)' },
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

      {/* ── ASC Scores + Projects (2 col) ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* ASC ranking */}
        <Card padding={0}>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 12 }}>
              <BarChart3 size={13} style={{ marginRight: 5, verticalAlign: 'middle', color: 'var(--color-primary)' }} />
              Desempenho por ASC
            </p>
            {ascsSorted.length === 0 ? (
              <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
                Sem ASCs nesta região.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ascsSorted.map((asc: any, i: number) => {
                  const atl = tlKey(asc.traffic_light)
                  const color = TL_FILL[atl]
                  const pct = Math.min(100, Math.max(0, asc.total_score))
                  return (
                    <div key={asc.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* Rank */}
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', minWidth: 18, textAlign: 'right' }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </span>
                      {/* Name + bar */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{asc.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color, marginLeft: 8, flexShrink: 0 }}>{asc.total_score.toFixed(1)}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: color, transition: 'width 600ms' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        {/* Projects */}
        <Card padding={0}>
          <div style={{ padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 12 }}>
              <FolderKanban size={13} style={{ marginRight: 5, verticalAlign: 'middle', color: 'var(--color-primary)' }} />
              Projectos na Região
            </p>
            {projects.length === 0 ? (
              <div style={{ height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--color-text-muted)', fontSize: 13 }}>
                <FolderKanban size={24} style={{ opacity: 0.2 }} />
                Sem projectos associados.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {projects.map((p: any) => (
                  <div key={p.id} onClick={() => navigate(`/projects/${p.id}`)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 9, background: 'var(--color-bg-strong)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
                  >
                    <FolderKanban size={12} color="var(--color-primary)" style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                    <Badge variant={STATUS_VARIANT[p.status] ?? 'default'}>{STATUS_LABEL[p.status] ?? p.status}</Badge>
                    <ChevronRight size={11} color="var(--color-text-muted)" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Milestones da Região ─────────────────────────────────────────────── */}
      <Card padding={0}>
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ListChecks size={13} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)' }}>
              Milestones da Região
            </p>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginLeft: 4 }}>
              ({milestones.length})
            </span>
          </div>

          {milestones.length === 0 ? (
            <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
              Sem milestones associados a esta região.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {milestones.map((ms: any) => {
                const pct = ms.planned_value > 0
                  ? Math.min(100, Math.max(0, ((ms.achieved_value ?? 0) / ms.planned_value) * 100))
                  : 0
                const variant = MS_STATUS_VARIANT[ms.status] ?? 'default'
                return (
                  <div key={ms.id} style={{
                    padding: '9px 12px', borderRadius: 10,
                    background: 'var(--color-bg-strong)',
                    border: '1px solid var(--color-border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1 }}>
                          {ms.title}
                        </p>
                        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ms.project_title} · {ms.task_title}
                          {ms.scope_name ? ` · ${ms.scope_name}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <Badge variant={variant}>{MS_STATUS_LABEL[ms.status] ?? ms.status}</Badge>
                        <span style={{ fontSize: 10, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(ms.planned_date).toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`, borderRadius: 999,
                          background: ms.status === 'DONE'
                            ? 'var(--color-traffic-green)'
                            : ms.status === 'BLOCKED'
                              ? 'var(--color-traffic-red)'
                              : 'var(--color-primary)',
                          transition: 'width 600ms',
                        }} />
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {(ms.achieved_value ?? 0).toFixed(0)} / {ms.planned_value.toFixed(0)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ── Map of ASCs in the region ─────────────────────────────────────────── */}
      <Card padding={0}>
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Map size={13} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)' }}>
              Mapa da Região — {regiao.name}
            </p>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginLeft: 4 }}>
              ({ascs.length} ASC{ascs.length !== 1 ? 's' : ''})
            </span>
            <div style={{ marginLeft: 'auto', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--color-surface-muted)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              Só leitura
            </div>
          </div>
        </div>

        {mapFeatures.length > 0 ? (
          <PerformanceMap
            features={mapFeatures.map((f: any) => ({ geometry: f.geometry, properties: f.properties }))}
            height={420}
            renderPopupContent={(asc: MapFeatureProps) => {
              // Look up this ASC's score from overview
              const ascData = ascs.find((a: any) => a.id === asc.id)
              if (!ascData) return null
              return (
                <div>
                  <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0 10px' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {[
                      { label: 'Execução',  val: ascData.execution_score.toFixed(1) },
                      { label: 'Objectivo', val: ascData.goal_score.toFixed(1) },
                    ].map(item => (
                      <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: 'var(--color-surface-muted)', borderRadius: 7 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>{item.val}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
                    Modo de leitura — sem acções disponíveis
                  </p>
                </div>
              )
            }}
          />
        ) : (
          <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
            <Map size={32} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 13, fontWeight: 600 }}>Sem polígonos disponíveis para esta região.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
