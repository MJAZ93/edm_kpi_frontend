import React from 'react'
import { Calendar, MapPin, Camera, AlertOctagon, User, Pencil, Eye, MessageSquare } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'

interface IndicadorCardProps {
  title: string
  scopeLabel?: string
  frequency?: string
  plannedValue: number
  achievedValue?: number
  plannedDate: string
  achievedDate?: string
  status: 'PENDING' | 'DONE' | 'BLOCKED'
  hasPhoto?: boolean
  hasBlocker?: boolean
  notes?: string
  assigneeName?: string
  /** When true, lower achieved vs planned = better (e.g. losses, defects) */
  isReduction?: boolean
  /** Task start value — used for reduction goal progress: ((start-achieved)/(start-planned))*100 */
  taskStartValue?: number
  /** Aggregation type (SUM_UP, AVG, LAST, MANUAL) — shown as badge */
  aggregationType?: string
  onViewDetails?: () => void
  onUpdate?: () => void
  onEdit?: () => void
  onFeedback?: () => void
}

function fmtDate(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const statusMap = {
  PENDING: { variant: 'warning' as const, label: 'Pendente' },
  DONE:    { variant: 'success' as const, label: 'Concluído' },
  BLOCKED: { variant: 'danger' as const, label: 'Bloqueado' },
}

const frequencyMap: Record<string, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  BIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
}

const AGG_LABELS: Record<string, string> = {
  SUM_UP: 'Somatório',
  SUM_DOWN: 'Decrescente',
  AVG: 'Média',
  LAST: 'Último Valor',
  MANUAL: 'Manual',
}

export default function IndicadorCard({ title, scopeLabel, frequency, plannedValue, achievedValue, plannedDate, achievedDate, status, hasPhoto, hasBlocker, notes, assigneeName, isReduction, taskStartValue, aggregationType, onViewDetails, onUpdate, onEdit, onFeedback }: IndicadorCardProps) {
  // Reduction goal: lower is better → achieved/planned when under target, negative when over.
  // Growth goal: higher is better → achieved/planned capped at 100%.
  let pct = 0
  if (achievedValue !== undefined && plannedValue > 0) {
    if (isReduction) {
      pct = achievedValue <= plannedValue
        ? Math.min(100, (achievedValue / plannedValue) * 100)
        : -((achievedValue - plannedValue) / plannedValue) * 100
    } else {
      pct = Math.min(100, (achievedValue / plannedValue) * 100)
    }
  }
  const { variant, label } = statusMap[status]

  const iconButtonStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 10,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }

  return (
    <Card variant="bordered" padding={18} onClick={onViewDetails} style={onViewDetails ? { cursor: 'pointer' } : undefined}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 6 }}>{title}</h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge variant={variant} dot>{label}</Badge>
            {scopeLabel && <Badge variant="info"><MapPin size={10} style={{ marginRight: 2 }} />{scopeLabel}</Badge>}
            {frequency && <Badge variant="default"><Calendar size={10} style={{ marginRight: 2 }} />{frequencyMap[frequency] ?? frequency}</Badge>}
            {aggregationType && aggregationType !== 'SUM_UP' && <Badge variant="info">{AGG_LABELS[aggregationType] ?? aggregationType}</Badge>}
            {hasBlocker && <Badge variant="danger"><AlertOctagon size={10} style={{ marginRight: 2 }} />Constrangimento</Badge>}
            {hasPhoto && <Badge variant="muted"><Camera size={10} style={{ marginRight: 2 }} />Foto</Badge>}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-soft)', marginBottom: 5 }}>
          <span>Planeado: <b>{plannedValue.toLocaleString('pt-PT')}</b></span>
          <span>Realizado: <b style={{ color: achievedValue !== undefined ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{achievedValue?.toLocaleString('pt-PT') ?? '—'}</b></span>
        </div>
        <ProgressBar value={pct} height={7} variant="auto" showLabel />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--color-text-muted)', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} />{fmtDate(plannedDate)}</span>
          {achievedDate && <span>→ {fmtDate(achievedDate)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {onViewDetails && (
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetails() }}
              title="Detalhes"
              aria-label="Detalhes"
              style={{ ...iconButtonStyle, color: 'var(--color-primary)', background: 'transparent', border: '1px solid var(--color-primary)33' }}
            >
              <Eye size={14} />
            </button>
          )}
          {onFeedback && (
            <button
              onClick={(e) => { e.stopPropagation(); onFeedback() }}
              title="Pedir Feedback"
              aria-label="Pedir Feedback"
              style={{ ...iconButtonStyle, color: 'var(--color-primary)', background: 'transparent', border: '1px solid var(--color-primary)33' }}
            >
              <MessageSquare size={14} />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              title="Editar"
              aria-label="Editar"
              style={{ ...iconButtonStyle, color: 'var(--color-text)', background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)' }}
            >
              <Pencil size={14} />
            </button>
          )}
          {onUpdate && status !== 'DONE' && (
            <button onClick={(e) => { e.stopPropagation(); onUpdate() }} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Progresso
            </button>
          )}
        </div>
      </div>

      {assigneeName && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <User size={12} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{assigneeName}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Técnico responsável</span>
        </div>
      )}

      {notes && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{notes}</p>}
    </Card>
  )
}
