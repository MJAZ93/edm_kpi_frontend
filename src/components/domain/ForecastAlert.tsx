import React from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface ForecastAlertProps {
  willReachTarget: boolean
  targetValue: number
  velocityPerDay: number
  daysRemaining: number
  projectedFinalValue: number
  message?: string
  style?: React.CSSProperties
}

export default function ForecastAlert({ willReachTarget, targetValue, velocityPerDay, daysRemaining, projectedFinalValue, message, style }: ForecastAlertProps) {
  const pct = Math.round((projectedFinalValue / targetValue) * 100)

  if (willReachTarget) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-traffic-green-bg)', border: '1px solid rgba(22,163,74,0.20)', ...style }}>
        <CheckCircle2 size={20} style={{ color: 'var(--color-traffic-green)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-traffic-green)', marginBottom: 2 }}>No ritmo certo</p>
          <p style={{ fontSize: 12, color: 'var(--color-traffic-green)', opacity: 0.8 }}>
            Projecção: {projectedFinalValue.toLocaleString('pt-PT')} ({pct}% do objectivo) • {Math.round(velocityPerDay).toLocaleString('pt-PT')} / dia
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-traffic-red-bg)', border: '1px solid rgba(220,38,38,0.20)', ...style }}>
      <AlertTriangle size={20} style={{ color: 'var(--color-traffic-red)', flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-traffic-red)', marginBottom: 2 }}>Risco de não atingir objectivo</p>
        <p style={{ fontSize: 12, color: 'var(--color-traffic-red)', opacity: 0.85 }}>
          {message || `Ao ritmo actual irá atingir apenas ${pct}% do objectivo. Velocidade: ${Math.round(velocityPerDay).toLocaleString('pt-PT')}/dia • ${daysRemaining} dias restantes`}
        </p>
      </div>
    </div>
  )
}
