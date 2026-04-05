import React from 'react'
import { Calendar, MapPin, Camera, AlertOctagon } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'

interface MilestoneCardProps {
  title: string
  scopeLabel?: string
  plannedValue: number
  achievedValue?: number
  plannedDate: string
  achievedDate?: string
  status: 'PENDING' | 'DONE' | 'BLOCKED'
  hasPhoto?: boolean
  hasBlocker?: boolean
  notes?: string
  onUpdate?: () => void
}

const statusMap = {
  PENDING: { variant: 'warning' as const, label: 'Pendente' },
  DONE:    { variant: 'success' as const, label: 'Concluído' },
  BLOCKED: { variant: 'danger' as const, label: 'Bloqueado' },
}

export default function MilestoneCard({ title, scopeLabel, plannedValue, achievedValue, plannedDate, achievedDate, status, hasPhoto, hasBlocker, notes, onUpdate }: MilestoneCardProps) {
  const pct = achievedValue !== undefined ? Math.min(100, (achievedValue / plannedValue) * 100) : 0
  const { variant, label } = statusMap[status]

  return (
    <Card variant="bordered" padding={18}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.3, marginBottom: 6 }}>{title}</h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Badge variant={variant} dot>{label}</Badge>
            {scopeLabel && <Badge variant="info"><MapPin size={10} style={{ marginRight: 2 }} />{scopeLabel}</Badge>}
            {hasBlocker && <Badge variant="danger"><AlertOctagon size={10} style={{ marginRight: 2 }} />Impedimento</Badge>}
            {hasPhoto && <Badge variant="muted"><Camera size={10} style={{ marginRight: 2 }} />Foto</Badge>}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-soft)', marginBottom: 5 }}>
          <span>Planeado: <b>{plannedValue.toLocaleString('pt-PT')}</b></span>
          <span>Realizado: <b style={{ color: achievedValue !== undefined ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{achievedValue?.toLocaleString('pt-PT') ?? '—'}</b></span>
        </div>
        <ProgressBar value={pct} height={5} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--color-text-muted)', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Calendar size={10} />{plannedDate}</span>
          {achievedDate && <span>→ {achievedDate}</span>}
        </div>
        {onUpdate && status !== 'DONE' && (
          <button onClick={onUpdate} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
            Actualizar
          </button>
        )}
      </div>

      {notes && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{notes}</p>}
    </Card>
  )
}
