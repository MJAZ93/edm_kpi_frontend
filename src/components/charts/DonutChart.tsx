import React from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface DataItem { label: string; count: number; percentage: number; color?: string }
interface Props { data: DataItem[]; height?: number; centerLabel?: string; centerValue?: string }

const DEFAULT_COLORS = ['#e8670a', '#0f766e', '#ca8a04', '#dc2626', '#4a6fa5', '#5f8a57']

const TRAFFIC_COLORS: Record<string, string> = {
  GREEN: '#16a34a', YELLOW: '#ca8a04', RED: '#dc2626',
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div style={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-soft)' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{d.label}</p>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{d.count} ({d.percentage.toFixed(1)}%)</p>
    </div>
  )
}

export default function DonutChart({ data, height = 220, centerLabel, centerValue }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ position: 'relative', width: height, height, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius="58%" outerRadius="80%" dataKey="count" paddingAngle={2}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color || TRAFFIC_COLORS[entry.label] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {(centerLabel || centerValue) && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            {centerValue && <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1 }}>{centerValue}</p>}
            {centerLabel && <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>{centerLabel}</p>}
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((item, i) => {
          const color = item.color || TRAFFIC_COLORS[item.label] || DEFAULT_COLORS[i % DEFAULT_COLORS.length]
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{item.count}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 38, textAlign: 'right' }}>{item.percentage.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
