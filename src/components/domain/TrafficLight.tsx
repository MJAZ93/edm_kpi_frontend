import React from 'react'

type TL = 'GREEN' | 'YELLOW' | 'RED'

interface TrafficLightProps {
  status: TL
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}

const config: Record<TL, { color: string; bg: string; label: string; emoji: string }> = {
  GREEN:  { color: 'var(--color-traffic-green)',  bg: 'var(--color-traffic-green-bg)',  label: 'Verde',    emoji: '🟢' },
  YELLOW: { color: 'var(--color-traffic-yellow)', bg: 'var(--color-traffic-yellow-bg)', label: 'Amarelo',  emoji: '🟡' },
  RED:    { color: 'var(--color-traffic-red)',    bg: 'var(--color-traffic-red-bg)',    label: 'Vermelho', emoji: '🔴' },
}

const dotSize = { sm: 8, md: 11, lg: 14 }

export default function TrafficLight({ status, showLabel = true, size = 'md', style }: TrafficLightProps) {
  const { color, bg, label } = config[status] ?? config['RED']
  const ds = dotSize[size]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: showLabel ? '4px 10px' : 4, borderRadius: 999, background: bg, ...style }}>
      <span style={{ width: ds, height: ds, borderRadius: '50%', background: color, boxShadow: `0 0 0 3px ${bg}`, flexShrink: 0 }} />
      {showLabel && <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>}
    </span>
  )
}
