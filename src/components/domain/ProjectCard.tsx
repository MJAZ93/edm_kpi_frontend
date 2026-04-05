import React from 'react'
import { Calendar, ChevronRight } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'
import TrafficLight from './TrafficLight'

interface ProjectCardProps {
  title: string
  description?: string
  ownerLabel: string
  startDate: string
  endDate: string
  totalScore: number
  executionScore: number
  trafficLight: 'GREEN' | 'YELLOW' | 'RED'
  weight?: number
  status?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  onClick?: () => void
}

const statusBadge: Record<string, 'success' | 'muted' | 'danger' | 'orange'> = {
  ACTIVE: 'orange', COMPLETED: 'success', CANCELLED: 'muted',
}
const statusLabel: Record<string, string> = { ACTIVE: 'Activo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado' }

export default function ProjectCard({ title, description, ownerLabel, startDate, endDate, totalScore, executionScore, trafficLight, weight, status = 'ACTIVE', onClick }: ProjectCardProps) {
  return (
    <Card variant="default" onClick={onClick} style={{ borderLeft: `3px solid var(--color-primary)` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <Badge variant={statusBadge[status]}>{statusLabel[status]}</Badge>
            {weight !== undefined && <Badge variant="default">Peso {weight}%</Badge>}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4, lineHeight: 1.3 }}>{title}</h3>
          {description && <p style={{ fontSize: 13, color: 'var(--color-text-soft)', lineHeight: 1.4 }}>{description}</p>}
        </div>
        <TrafficLight status={trafficLight} showLabel={false} size="md" style={{ marginLeft: 12, flexShrink: 0 }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <ProgressBar value={executionScore} label="Execução" showLabel height={7} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{ownerLabel}</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} />{startDate} → {endDate}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>{totalScore.toFixed(1)}</span>
          <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
        </div>
      </div>
    </Card>
  )
}
