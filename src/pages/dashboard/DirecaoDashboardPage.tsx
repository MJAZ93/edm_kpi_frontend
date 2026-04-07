import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban, ShieldAlert, TrendingUp, Trophy, ChevronRight,
  AlertOctagon, Users, Building2, Layers, Clock, Activity,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
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

const CATEGORY_LABELS: Record<string, string> = {
  DIR_DIRECAO:  'Dir. Direcção',
  CHEFE_DEPT:   'Chefe Dept.',
  DIR_REGIONAL: 'Dir. Regional',
  DIR_ASC:      'Dir. ASC',
  COLABORADOR:  'Colaborador',
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
  const [empCategory, setEmpCategory] = useState<string>('ALL')
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRankItem | null>(null)

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

  // ── Derived ──────────────────────────────────────────────────────────────────
  const dir        = overview?.direction
  const projects   = (overview?.projects ?? []) as any[]
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
            Bom dia, {user?.name ?? 'Director'}
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
          label="Projectos"
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
          label="Tarefas Paradas"
          value={stalled.length}
          icon={<AlertOctagon size={17} />}
          color={stalled.length > 0 ? 'var(--color-traffic-red-bg)' : 'var(--color-bg-strong)'}
        />
        <StatCard
          label="Impedimentos Pendentes"
          value={blockers.length}
          icon={<ShieldAlert size={17} />}
          color={blockers.length > 0 ? 'var(--color-traffic-red-bg)' : 'var(--color-bg-strong)'}
        />
      </div>

      {/* ── Departments performance ───────────────────────────────────────────── */}
      {deptScores.length > 0 && (
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Layers size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Departamentos
            </p>
            <Badge variant="default" style={{ marginLeft: 4 }}>{deptScores.length}</Badge>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {deptScores.map((dept: any) => {
              const dtl = (dept.traffic_light ?? 'YELLOW') as TL
              const dc  = TL_COLORS[dtl]
              return (
                <div
                  key={dept.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 12,
                    background: dc.bg,
                    border: `2px solid ${dc.border}44`,
                    transition: 'border-color 150ms',
                    cursor: 'default',
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: dc.border, marginBottom: 10 }} />
                  <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8, lineHeight: 1.3 }}>
                    {dept.name}
                  </p>
                  <p style={{ fontSize: 26, fontWeight: 900, color: dc.text, lineHeight: 1, marginBottom: 6 }}>
                    {dept.total_score.toFixed(1)}
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Exec {dept.execution_score.toFixed(0)}%
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                    <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      Obj {dept.goal_score.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ── Projects ─────────────────────────────────────────────────────────── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderKanban size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Projectos da Direcção
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
            Sem projectos atribuídos a esta direcção.
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

      {/* ── Stalled tasks + Blockers ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Stalled tasks */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertOctagon size={15} style={{ color: 'var(--color-traffic-red)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tarefas Paradas
            </p>
            {stalled.length > 0 && (
              <Badge variant="danger" style={{ marginLeft: 4 }}>{stalled.length}</Badge>
            )}
          </div>

          {stalled.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <TrendingUp size={28} style={{ color: 'var(--color-traffic-green)', marginBottom: 8, opacity: 0.7 }} />
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Sem tarefas paradas</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Todos os indicadores estão a progredir</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {stalled.map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => navigate(`/projects`)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: 'var(--color-traffic-red-bg)',
                    border: '1.5px solid rgba(220,38,38,0.18)',
                    cursor: 'pointer',
                    transition: 'border-color 150ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-traffic-red)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(220,38,38,0.18)' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', flex: 1, lineHeight: 1.35 }}>
                      {task.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, padding: '2px 8px', borderRadius: 6, background: 'rgba(220,38,38,0.12)' }}>
                      <Clock size={10} style={{ color: 'var(--color-traffic-red)' }} />
                      <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-traffic-red)' }}>
                        {task.days_elapsed}d
                      </span>
                    </div>
                  </div>
                  {task.project_title && (
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 5, fontStyle: 'italic' }}>
                      {task.project_title}
                    </p>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-traffic-red)', fontWeight: 700 }}>Sem progresso</span>
                      <span style={{ fontSize: 10, color: 'var(--color-traffic-red)', fontWeight: 700 }}>0%</span>
                    </div>
                    <ProgressBar value={0} max={100} height={4} variant="red" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Pending blockers */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <ShieldAlert size={15} style={{ color: 'var(--color-traffic-red)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Impedimentos Pendentes
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
            onSelect={() => navigate('/analytics/map')}
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

      {/* ── Employee ranking ─────────────────────────────────────────────────── */}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredEmps.slice(0, 10).map((emp: EmployeeRankItem, i: number) => {
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
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>Milestones</span>
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
        <Card variant="elevated">
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
  )
}
