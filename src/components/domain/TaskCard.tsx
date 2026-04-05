import React from 'react'
import { Clock, Target, ChevronRight } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'
import TrafficLight from './TrafficLight'

interface TaskCardProps {
  title: string
  frequency: string
  goalLabel: string
  startValue: number
  currentValue: number
  targetValue: number
  milestonesTotal: number
  milesDone: number
  trafficLight: 'GREEN' | 'YELLOW' | 'RED'
  ownerLabel: string
  onClick?: () => void
}

const freqLabel: Record<string, string> = {
  DAILY: 'Diária', WEEKLY: 'Semanal', MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral', BIANNUAL: 'Semestral', ANNUAL: 'Anual',
}

export default function TaskCard({ title, frequency, goalLabel, startValue, currentValue, targetValue, milestonesTotal, milesDone, trafficLight, ownerLabel, onClick }: TaskCardProps) {
  const pct = targetValue > 0 ? Math.min(100, ((currentValue - startValue) / (targetValue - startValue)) * 100) : 0

  return (
    <Card variant="default" onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <Badge variant="default"><Clock size={10} style={{ marginRight: 3 }} />{freqLabel[frequency] || frequency}</Badge>
          </div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.3 }}>{title}</h3>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{ownerLabel}</p>
        </div>
        <TrafficLight status={trafficLight} showLabel={false} style={{ marginLeft: 10 }} />
      </div>

      {/* Goal tracker */}
      <div style={{ background: 'var(--color-surface-muted)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{goalLabel}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-soft)' }}>Início: <b>{startValue.toLocaleString('pt-PT')}</b></span>
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-primary)' }}>{currentValue.toLocaleString('pt-PT')}</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-soft)', display: 'flex', alignItems: 'center', gap: 4 }}><Target size={11} />{targetValue.toLocaleString('pt-PT')}</span>
        </div>
        <ProgressBar value={pct} height={6} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {milesDone}/{milestonesTotal} milestones
        </span>
        <ChevronRight size={15} style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </Card>
  )
}
