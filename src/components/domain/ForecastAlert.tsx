import React from 'react'
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'

interface ForecastAlertProps {
  willReachTarget: boolean
  targetValue: number
  startValue?: number
  velocityPerDay: number
  daysRemaining: number
  projectedFinalValue: number
  message?: string
  style?: React.CSSProperties
}

export default function ForecastAlert({ willReachTarget, targetValue, startValue, velocityPerDay, daysRemaining, projectedFinalValue, message, style }: ForecastAlertProps) {
  const diff = (startValue !== undefined && targetValue !== startValue) ? targetValue - startValue : targetValue
  const pct = diff !== 0
    ? Math.round(((projectedFinalValue - (startValue ?? 0)) / diff) * 100)
    : 100

  const velLabel = `${Math.round(velocityPerDay).toLocaleString('pt-PT')}/dia`
  const projLabel = projectedFinalValue.toLocaleString('pt-PT')

  // Green: will reach target
  if (willReachTarget) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--color-traffic-green-bg)', border: '1px solid rgba(22,163,74,0.20)', ...style }}>
        <CheckCircle2 size={20} style={{ color: 'var(--color-traffic-green)', flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-traffic-green)', marginBottom: 2 }}>No ritmo certo</p>
          <p style={{ fontSize: 12, color: 'var(--color-traffic-green)', opacity: 0.8 }}>
            Projecção: {projLabel} ({pct}% do objectivo) • {velLabel}
          </p>
        </div>
      </div>
    )
  }

  // Severity: >=90% = yellow (close), <90% = red (risk)
  const isClose = pct >= 90
  const colors = isClose
    ? { bg: 'var(--color-traffic-yellow-bg)', border: 'rgba(202,138,4,0.20)', text: 'var(--color-traffic-yellow)' }
    : { bg: 'var(--color-traffic-red-bg)', border: 'rgba(220,38,38,0.20)', text: 'var(--color-traffic-red)' }
  const Icon = isClose ? Info : AlertTriangle
  const title = isClose ? 'Ligeiramente abaixo do ritmo' : 'Risco de não atingir objectivo'
  const detail = message || `Ao ritmo actual irá atingir ${pct}% do objectivo. Velocidade: ${velLabel} • ${daysRemaining} dias restantes`

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderRadius: 'var(--radius-sm)', background: colors.bg, border: `1px solid ${colors.border}`, ...style }}>
      <Icon size={20} style={{ color: colors.text, flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 2 }}>{title}</p>
        <p style={{ fontSize: 12, color: colors.text, opacity: 0.85 }}>{detail}</p>
      </div>
    </div>
  )
}
