import React, { useRef, useState } from 'react'
import {
  format,
  differenceInDays,
  parseISO,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  min,
  max,
  isValid,
} from 'date-fns'
import { pt } from 'date-fns/locale'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GanttIndicador {
  id: number
  title: string
  planned_date: string
  achieved_date?: string
  status: 'PENDING' | 'DONE' | 'BLOCKED'
}

export interface GanttTask {
  id: number
  title: string
  start_date: string
  end_date: string
  traffic_light?: 'GREEN' | 'YELLOW' | 'RED'
  owner_label?: string
  indicadores?: GanttIndicador[]
}

interface GanttChartProps {
  tasks: GanttTask[]
  projectStart: string
  projectEnd: string
  onTaskClick?: (taskId: number) => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 48
const HEADER_HEIGHT = 44
const LABEL_WIDTH = 220
const BAR_HEIGHT = 26

const TRAFFIC = {
  GREEN:   { bar: 'var(--color-traffic-green)',  bg: 'var(--color-traffic-green-bg)',  text: 'var(--color-traffic-green)' },
  YELLOW:  { bar: 'var(--color-traffic-yellow)', bg: 'var(--color-traffic-yellow-bg)', text: 'var(--color-traffic-yellow)' },
  RED:     { bar: 'var(--color-traffic-red)',    bg: 'var(--color-traffic-red-bg)',    text: 'var(--color-traffic-red)' },
  DEFAULT: { bar: 'var(--color-primary)',        bg: 'var(--color-primary-subtle)',    text: 'var(--color-primary)' },
}

const MILESTONE_STATUS_COLOR: Record<string, string> = {
  DONE:    '#22c55e',
  PENDING: '#f59e0b',
  BLOCKED: '#ef4444',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeParse(d: string): Date | null {
  try {
    const p = parseISO(d)
    return isValid(p) ? p : null
  } catch {
    return null
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GanttChart({ tasks, projectStart, projectEnd, onTaskClick }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null)

  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
        Nenhuma acção com datas definidas para mostrar no cronograma.
      </div>
    )
  }

  // ── Build time range ────────────────────────────────────────────────────────
  const validDates: Date[] = [
    safeParse(projectStart),
    safeParse(projectEnd),
    ...tasks.flatMap(t => [safeParse(t.start_date), safeParse(t.end_date)]),
  ].filter(Boolean) as Date[]

  if (validDates.length === 0) return null

  const rangeStart = startOfMonth(min(validDates))
  const rangeEnd = endOfMonth(max(validDates))
  const totalDays = differenceInDays(rangeEnd, rangeStart) || 1

  function toPercent(date: Date): number {
    const days = differenceInDays(date, rangeStart)
    return Math.max(0, Math.min(100, (days / totalDays) * 100))
  }

  const today = new Date()
  const todayPct = toPercent(today)
  const showToday = todayPct >= 0 && todayPct <= 100

  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })

  // ── Render ──────────────────────────────────────────────────────────────────
  const chartHeight = HEADER_HEIGHT + ROW_HEIGHT * tasks.length

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {/* Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          left: tooltip.x + 12,
          top: tooltip.y - 8,
          background: 'var(--color-text)',
          color: 'var(--color-bg)',
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 6,
          pointerEvents: 'none',
          zIndex: 1000,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        }}>
          {tooltip.text}
        </div>
      )}

      <div style={{ display: 'flex', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>

        {/* ── Left label column ─────────────────────────────────────────────── */}
        <div style={{ width: LABEL_WIDTH, flexShrink: 0, borderRight: '1.5px solid var(--color-border)' }}>
          {/* Header */}
          <div style={{
            height: HEADER_HEIGHT,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 14,
            background: 'var(--color-bg-strong)',
            borderBottom: '1.5px solid var(--color-border)',
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Acção
            </span>
          </div>
          {/* Rows */}
          {tasks.map((task, i) => (
            <div
              key={task.id}
              style={{
                height: ROW_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 14,
                paddingRight: 10,
                background: i % 2 === 0 ? 'var(--color-bg)' : 'var(--color-bg-strong)',
                borderBottom: i < tasks.length - 1 ? '1px solid var(--color-border)' : 'none',
                cursor: onTaskClick ? 'pointer' : 'default',
                transition: 'background 120ms',
              }}
              onClick={() => onTaskClick?.(task.id)}
              onMouseEnter={e => { if (onTaskClick) (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-subtle)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = i % 2 === 0 ? 'var(--color-bg)' : 'var(--color-bg-strong)' }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--color-text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: LABEL_WIDTH - 24,
                  marginBottom: task.owner_label ? 2 : 0,
                }}>
                  {task.title}
                </p>
                {task.owner_label && (
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: LABEL_WIDTH - 24 }}>
                    {task.owner_label}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Right scrollable chart area ───────────────────────────────────── */}
        <div ref={scrollRef} style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', position: 'relative' }}>
          <div style={{ position: 'relative', height: chartHeight, minWidth: Math.max(600, months.length * 80) }}>

            {/* Month header row */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: HEADER_HEIGHT,
              background: 'var(--color-bg-strong)',
              borderBottom: '1.5px solid var(--color-border)',
              display: 'flex',
            }}>
              {months.map((month, mi) => {
                const left = toPercent(month)
                const nextLeft = mi < months.length - 1 ? toPercent(months[mi + 1]) : 100
                const width = nextLeft - left
                return (
                  <div
                    key={mi}
                    style={{
                      position: 'absolute',
                      left: `${left}%`,
                      width: `${width}%`,
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 8,
                      borderLeft: mi > 0 ? '1px solid var(--color-border)' : 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {format(month, 'MMM yy', { locale: pt })}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Task rows */}
            {tasks.map((task, i) => {
              const tStart = safeParse(task.start_date)
              const tEnd = safeParse(task.end_date)
              if (!tStart || !tEnd) return null

              const colors = TRAFFIC[task.traffic_light ?? 'DEFAULT'] ?? TRAFFIC.DEFAULT
              const leftPct = toPercent(tStart)
              const rightPct = toPercent(tEnd)
              const widthPct = Math.max(rightPct - leftPct, 0.4)

              const rowTop = HEADER_HEIGHT + i * ROW_HEIGHT

              return (
                <div
                  key={task.id}
                  style={{
                    position: 'absolute',
                    top: rowTop,
                    left: 0,
                    right: 0,
                    height: ROW_HEIGHT,
                    background: i % 2 === 0 ? 'var(--color-bg)' : 'var(--color-bg-strong)',
                    borderBottom: i < tasks.length - 1 ? '1px solid var(--color-border)' : 'none',
                  }}
                >
                  {/* Month grid lines */}
                  {months.map((month, mi) => mi > 0 && (
                    <div
                      key={mi}
                      style={{
                        position: 'absolute',
                        left: `${toPercent(month)}%`,
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: 'var(--color-border)',
                        opacity: 0.5,
                      }}
                    />
                  ))}

                  {/* Task bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: (ROW_HEIGHT - BAR_HEIGHT) / 2,
                      height: BAR_HEIGHT,
                      background: colors.bg,
                      border: `1.5px solid ${colors.bar}`,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 8,
                      paddingRight: 4,
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      cursor: onTaskClick ? 'pointer' : 'default',
                    }}
                    title={`${task.title}\n${format(tStart, 'dd/MM/yyyy')} → ${format(tEnd, 'dd/MM/yyyy')}`}
                    onClick={() => onTaskClick?.(task.id)}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {format(tStart, 'dd/MM')} – {format(tEnd, 'dd/MM')}
                    </span>
                  </div>

                  {/* Indicador diamonds */}
                  {task.indicadores?.map(ms => {
                    const msDate = safeParse(ms.planned_date)
                    if (!msDate) return null
                    const msPct = toPercent(msDate)
                    const msColor = MILESTONE_STATUS_COLOR[ms.status] ?? '#6b7280'
                    const DIAMOND = 10
                    return (
                      <div
                        key={ms.id}
                        style={{
                          position: 'absolute',
                          left: `${msPct}%`,
                          top: (ROW_HEIGHT - DIAMOND * 1.5) / 2,
                          width: DIAMOND,
                          height: DIAMOND,
                          background: msColor,
                          transform: 'rotate(45deg) translateX(-50%)',
                          borderRadius: 2,
                          zIndex: 5,
                          cursor: 'default',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                        }}
                        onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, text: `${ms.title} — ${format(msDate, 'dd/MM/yyyy')}` })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    )
                  })}
                </div>
              )
            })}

            {/* Today vertical line */}
            {showToday && (
              <div
                style={{
                  position: 'absolute',
                  left: `${todayPct}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: '#ef4444',
                  zIndex: 20,
                  pointerEvents: 'none',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 6,
                  left: 4,
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 4,
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.03em',
                }}>
                  Hoje
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {([['GREEN', 'No prazo'], ['YELLOW', 'Em risco'], ['RED', 'Atrasado']] as const).map(([tl, label]) => (
          <div key={tl} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 28, height: 10, background: TRAFFIC[tl].bg, border: `1.5px solid ${TRAFFIC[tl].bar}`, borderRadius: 3 }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, background: MILESTONE_STATUS_COLOR.DONE, transform: 'rotate(45deg)', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>Marco concluído</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, background: MILESTONE_STATUS_COLOR.PENDING, transform: 'rotate(45deg)', borderRadius: 2 }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>Marco pendente</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 2, height: 14, background: '#ef4444' }} />
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>Hoje</span>
        </div>
      </div>
    </div>
  )
}
