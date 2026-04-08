import React from 'react'
import { Calendar, ChevronRight, Target } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import TrafficLight from './TrafficLight'

interface ProjectCardProps {
  title: string
  description?: string
  ownerLabel: string
  startDate: string
  endDate: string
  totalScore: number
  executionScore: number
  goalScore?: number
  trafficLight: 'GREEN' | 'YELLOW' | 'RED'
  weight?: number
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  // KPI objective tracking
  goalLabel?: string
  startValue?: number
  targetValue?: number
  currentValue?: number
  onClick?: () => void
}

const TL_COLOR: Record<string, string> = {
  GREEN: 'var(--color-traffic-green)',
  YELLOW: 'var(--color-traffic-yellow)',
  RED: 'var(--color-traffic-red)',
}

const statusBadge: Record<string, 'success' | 'muted' | 'danger' | 'orange'> = {
  ACTIVE: 'orange', COMPLETED: 'success', CANCELLED: 'muted',
}
const statusLabel: Record<string, string> = { ACTIVE: 'Activo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' }

function fmtDate(d: string) {
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProjectCard({
  title, description, ownerLabel, startDate, endDate,
  totalScore, executionScore, goalScore,
  trafficLight, weight, status = 'ACTIVE',
  goalLabel, startValue, targetValue, currentValue,
  onClick,
}: ProjectCardProps) {

  const tlColor = TL_COLOR[trafficLight] ?? TL_COLOR.RED
  const hasKpi  = goalLabel != null && targetValue != null

  // KPI progress direction: decrease if target < start (e.g. losses 15% → 3%)
  const kpiStart    = startValue   ?? 0
  const kpiCurrent  = currentValue ?? kpiStart
  const kpiTarget   = targetValue  ?? 0
  const kpiRange    = Math.abs(kpiTarget - kpiStart)
  const kpiProgress = kpiRange > 0
    ? Math.min(100, Math.max(0, (Math.abs(kpiCurrent - kpiStart) / kpiRange) * 100))
    : 0
  const kpiReached  = kpiTarget <= kpiStart ? kpiCurrent <= kpiTarget : kpiCurrent >= kpiTarget

  return (
    <Card
      variant="default"
      onClick={onClick}
      style={{ borderLeft: `3px solid ${tlColor}`, cursor: 'pointer', transition: 'box-shadow 150ms' }}
    >
      {/* ── Header: badges + title + traffic light ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 7, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge variant={statusBadge[status]}>{statusLabel[status]}</Badge>
            {weight !== undefined && weight !== 100 && <Badge variant="default">Peso {weight}%</Badge>}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: description ? 4 : 0, lineHeight: 1.3 }}>{title}</h3>
          {description && <p style={{ fontSize: 12, color: 'var(--color-text-soft)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{description}</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginLeft: 14, flexShrink: 0 }}>
          <TrafficLight status={trafficLight} showLabel={false} size="md" />
          <span style={{ fontSize: 16, fontWeight: 900, color: tlColor, lineHeight: 1 }}>{totalScore.toFixed(1)}</span>
          <span style={{ fontSize: 9, color: 'var(--color-text-muted)', fontWeight: 600 }}>/100</span>
        </div>
      </div>

      {/* ── Progress bars: Execução + Objectivos ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 12 }}>
        {/* Execução */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Execução</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: executionScore >= 90 ? 'var(--color-traffic-green)' : executionScore >= 60 ? 'var(--color-traffic-yellow)' : 'var(--color-traffic-red)' }}>
              {executionScore.toFixed(1)}%
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, executionScore)}%`, borderRadius: 999, background: executionScore >= 90 ? 'var(--color-traffic-green)' : executionScore >= 60 ? 'var(--color-traffic-yellow)' : 'var(--color-traffic-red)', transition: 'width 500ms' }} />
          </div>
        </div>

        {/* Objectivos — only when data is available */}
        {goalScore != null && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Objectivos</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: goalScore >= 90 ? 'var(--color-traffic-green)' : goalScore >= 60 ? 'var(--color-traffic-yellow)' : 'var(--color-traffic-red)' }}>
                {goalScore.toFixed(1)}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, goalScore)}%`, borderRadius: 999, background: goalScore >= 90 ? 'var(--color-traffic-green)' : goalScore >= 60 ? 'var(--color-traffic-yellow)' : 'var(--color-traffic-red)', transition: 'width 500ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* ── KPI objective inline (if configured) ── */}
      {hasKpi && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '7px 10px', borderRadius: 8, marginBottom: 12,
          background: kpiReached ? 'var(--color-traffic-green-bg)' : 'var(--color-bg-strong)',
          border: `1px solid ${kpiReached ? 'var(--color-traffic-green)44' : 'var(--color-border)'}`,
        }}>
          <Target size={12} style={{ color: kpiReached ? 'var(--color-traffic-green)' : 'var(--color-primary)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{goalLabel}</span>
              {kpiReached && <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-traffic-green)', flexShrink: 0, marginLeft: 6 }}>✓ Atingido</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: kpiReached ? 'var(--color-traffic-green)' : 'var(--color-text)' }}>{kpiCurrent.toLocaleString('pt-MZ')}</span>
              <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>→ meta</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>{kpiTarget.toLocaleString('pt-MZ')}</span>
            </div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: `conic-gradient(${kpiReached ? 'var(--color-traffic-green)' : 'var(--color-primary)'} ${kpiProgress * 3.6}deg, var(--color-border) 0deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: kpiReached ? 'var(--color-traffic-green-bg)' : 'var(--color-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 8, fontWeight: 900, color: kpiReached ? 'var(--color-traffic-green)' : 'var(--color-primary)' }}>{kpiProgress.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer: owner + dates ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>{ownerLabel}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={10} />{fmtDate(startDate)} → {fmtDate(endDate)}
          </span>
        </div>
        <ChevronRight size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
      </div>
    </Card>
  )
}
