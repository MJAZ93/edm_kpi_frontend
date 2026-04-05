import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import TrafficLight from './TrafficLight'
import Card from '../ui/Card'

interface RankItem {
  rank: number
  name: string
  total_score: number
  traffic_light: 'GREEN' | 'YELLOW' | 'RED'
  trend?: number
}

interface Props { items: RankItem[]; title?: string }

const medals = ['🥇', '🥈', '🥉']

export default function Leaderboard({ items, title }: Props) {
  return (
    <div>
      {title && <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>{title}</h4>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => (
          <div key={item.rank} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 14px', background: item.rank <= 3 ? 'var(--color-primary-soft)' : 'var(--color-surface-muted)',
            borderRadius: 10, border: item.rank <= 3 ? '1px solid rgba(232,103,10,0.18)' : '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: item.rank <= 3 ? 18 : 13, fontWeight: 800, color: item.rank <= 3 ? 'var(--color-primary)' : 'var(--color-text-muted)', minWidth: 28, textAlign: 'center' }}>
              {item.rank <= 3 ? medals[item.rank - 1] : `#${item.rank}`}
            </span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
            {item.trend !== undefined && (
              <span style={{ fontSize: 12, fontWeight: 700, color: item.trend > 0 ? 'var(--color-traffic-green)' : item.trend < 0 ? 'var(--color-traffic-red)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 2 }}>
                {item.trend > 0 ? <TrendingUp size={13} /> : item.trend < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                {item.trend > 0 ? '+' : ''}{item.trend}%
              </span>
            )}
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', minWidth: 44, textAlign: 'right' }}>{item.total_score.toFixed(1)}</span>
            <TrafficLight status={item.traffic_light} showLabel={false} size="sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
