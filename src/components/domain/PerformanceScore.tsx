import React from 'react'
import ProgressBar from '../ui/ProgressBar'
import TrafficLight from './TrafficLight'

interface PerformanceScoreProps {
  executionScore: number
  goalScore: number
  totalScore: number
  trafficLight: 'GREEN' | 'YELLOW' | 'RED'
  compact?: boolean
}

export default function PerformanceScore({ executionScore, goalScore, totalScore, trafficLight, compact }: PerformanceScoreProps) {
  if (compact) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>{totalScore.toFixed(1)}</span>
        <TrafficLight status={trafficLight} showLabel={false} size="sm" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Score Total</p>
          <p style={{ fontSize: 40, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{totalScore.toFixed(1)}<span style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-muted)' }}>/100</span></p>
        </div>
        <TrafficLight status={trafficLight} size="lg" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ProgressBar value={executionScore} showLabel label={`Execução (×0.6) — ${executionScore.toFixed(1)}%`} variant="orange" height={10} />
        <ProgressBar value={goalScore} showLabel label={`Objectivo (×0.4) — ${goalScore.toFixed(1)}%`} variant="green" height={10} />
      </div>
      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 500 }}>
        Score = (Execução × 0.6) + (Objectivo × 0.4)
      </p>
    </div>
  )
}
