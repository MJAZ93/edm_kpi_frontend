import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2, Clock, ShieldAlert, Building2, Briefcase,
  TrendingUp, ChevronRight, Pencil, MapPin, Map,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts'
import { dashboardService } from '../../services/dashboard.service'
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

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  DONE:    { label: 'Concluído', variant: 'success'  },
  PENDING: { label: 'Pendente',  variant: 'warning' },
  BLOCKED: { label: 'Bloqueado', variant: 'danger'    },
}

const SCOPE_LABEL: Record<string, string> = { ASC: 'ASC', REGIONAL: 'Região' }

// ── Month labels ──────────────────────────────────────────────────────────────

const MONTH_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const fmtMonth = (ym: string) => MONTH_PT[parseInt(ym.split('-')[1], 10) - 1] ?? ym

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

  // Derive ascIds from data (safe when undefined — empty array)
  const ascIds: number[] = data?.asc_ids ?? []

  // Map — only fetch when we have ASC IDs from the member's indicadores
  // Must be declared BEFORE any conditional returns (Rules of Hooks)
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
  const stats        = data?.stats        ?? { total: 0, done: 0, pending: 0, blocked: 0 }
  const indicadores: any[] = data?.indicadores   ?? []
  const monthly: any[]    = data?.monthly      ?? []
  const projects: any[]   = data?.projects     ?? []
  const departments: any[] = data?.departments ?? []

  // Group indicadores by task
  const taskGroups = Object.values(
    indicadores.reduce((acc: Record<number, any>, ms: any) => {
      if (!acc[ms.task_id]) acc[ms.task_id] = { taskId: ms.task_id, taskTitle: ms.task_title, goalLabel: ms.goal_label, projectTitle: ms.project_title, items: [] }
      acc[ms.task_id].items.push(ms)
      return acc
    }, {} as Record<number, any>)
  ) as any[]

  const chartData = monthly.map((m: any) => ({ name: fmtMonth(m.month), done: m.done, total: m.total }))
  const tl = tlKey(score.traffic_light)
  const c  = TL_COLORS[tl]

  const handleProgressDone = () => {
    setUpdateMs(null)
    refetch()
    qc.invalidateQueries({ queryKey: ['dashboard', 'member-overview'] })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Hero: score + info + stats all in one row ──────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 20,
        padding: '18px 24px',
        background: `linear-gradient(135deg, ${c.bg} 0%, var(--color-surface) 100%)`,
        borderRadius: 'var(--radius-lg)', border: `1.5px solid ${c.border}33`, boxShadow: 'var(--shadow-soft)',
      }}>
        {/* Score ring */}
        <ScoreRing score={score.total_score} tl={score.traffic_light} size={100} />

        {/* Identity + metrics */}
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
              { label: 'Execução',  val: score.execution_score.toFixed(1) },
              { label: 'Objectivo', val: score.goal_score.toFixed(1) },
              { label: 'Ms Feitos', val: `${score.ms_done}/${score.ms_total}` },
            ].map(item => (
              <div key={item.label}>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                <p style={{ fontSize: 14, fontWeight: 900, color: c.text }}>{item.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 4 stat mini-chips — fills the empty right space */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { icon: <TrendingUp size={13} />,   label: 'Total',      val: stats.total,   bg: 'var(--color-primary)' },
            { icon: <CheckCircle2 size={13} />, label: 'Concluídos', val: stats.done,    bg: 'var(--color-traffic-green)' },
            { icon: <Clock size={13} />,        label: 'Pendentes',  val: stats.pending, bg: 'var(--color-traffic-yellow)' },
            { icon: <ShieldAlert size={13} />,  label: 'Bloqueados', val: stats.blocked, bg: 'var(--color-traffic-red)' },
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

      {/* ── Chart + Projects ──────────────────────────────────────────────── */}
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
              Pilares Estratégicos Envolvidos
            </p>
            {projects.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, color: 'var(--color-text-muted)', fontSize: 13 }}>
                <Briefcase size={22} style={{ opacity: 0.2, marginBottom: 8 }} />
                Sem pilares estratégicos atribuídos.
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

      {/* ── Indicadores by task ────────────────────────────────────────────── */}
      <Card padding={0}>
        <div style={{ padding: '14px 16px' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 14 }}>
            <CheckCircle2 size={13} style={{ marginRight: 5, verticalAlign: 'middle', color: 'var(--color-primary)' }} />
            Os Meus Indicadores
          </p>

          {taskGroups.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 0', color: 'var(--color-text-muted)' }}>
              <CheckCircle2 size={30} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ fontSize: 13, fontWeight: 600 }}>Nenhum indicador atribuído ainda.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {taskGroups.map((group: any) => (
                <div key={group.taskId}>
                  {/* Task header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, padding: '8px 12px', background: 'var(--color-bg-strong)', borderRadius: 10, border: '1px solid var(--color-border)', cursor: 'pointer' }}
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

                  {/* Indicador rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 10 }}>
                    {group.items.map((ms: any) => {
                      const sb  = STATUS_BADGE[ms.status] ?? { label: ms.status, variant: 'default' as const }
                      const pct = ms.planned_value > 0 ? Math.min(100, ((ms.achieved_value ?? 0) / ms.planned_value) * 100) : 0

                      return (
                        <div key={ms.id} style={{ padding: '10px 12px', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                          {/* Row 1: title + badge + button */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.title}</p>
                            </div>
                            <Badge variant={sb.variant}>{sb.label}</Badge>
                            {ms.status !== 'DONE' && (
                              <button onClick={() => setUpdateMs({ ...ms, goalLabel: group.goalLabel })}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'var(--color-primary)', border: 'none', color: '#fff', flexShrink: 0 }}
                              >
                                <Pencil size={10} /> Actualizar
                              </button>
                            )}
                          </div>

                          {/* Row 2: meta info */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                            {ms.planned_date && (
                              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>📅 {ms.planned_date}</span>
                            )}
                            {ms.scope_name && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                <MapPin size={10} /> {SCOPE_LABEL[ms.scope_type] ?? ms.scope_type}: <b style={{ color: 'var(--color-text-soft)' }}>{ms.scope_name}</b>
                              </span>
                            )}
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                              {group.goalLabel || 'Realizado'}: <b style={{ color: 'var(--color-text)' }}>{(ms.achieved_value ?? 0).toLocaleString()}</b> / {ms.planned_value?.toLocaleString()}
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div style={{ height: 5, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--color-traffic-green)' : 'var(--color-primary)', borderRadius: 3, transition: 'width 600ms' }} />
                          </div>
                          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2, textAlign: 'right' }}>{pct.toFixed(1)}%</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── Mapa ASCs (last) ──────────────────────────────────────────────── */}
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
                // Indicadores in this ASC
                const ascIndicadores = indicadores.filter(
                  (ms: any) => ms.scope_type === 'ASC' && Number(ms.scope_id) === asc.id
                )
                if (ascIndicadores.length === 0) return null
                return (
                  <div>
                    <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0 10px' }} />
                    <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      Os meus indicadores aqui
                    </p>
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                                {(ms.achieved_value ?? 0).toLocaleString()} / {ms.planned_value?.toLocaleString()}
                              </span>
                              <span style={{ fontSize: 10, fontWeight: 800, color: pct >= 100 ? 'var(--color-traffic-green)' : 'var(--color-text-muted)' }}>{pct.toFixed(0)}%</span>
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
