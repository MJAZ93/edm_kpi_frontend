import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts'

interface RankItem { name: string; total_score: number; traffic_light?: 'GREEN' | 'YELLOW' | 'RED' }
interface Props { data: RankItem[]; height?: number }

const TL_COLORS: Record<string, string> = { GREEN: '#16a34a', YELLOW: '#ca8a04', RED: '#dc2626' }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.[0]) return null
  return (
    <div style={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-soft)' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{payload[0].payload.name}</p>
      <p style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 700 }}>Score: {payload[0].value?.toFixed(1)}</p>
    </div>
  )
}

export default function BarRankingChart({ data, height = 260 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 20, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.08)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: 'var(--color-text)', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(232,103,10,0.06)' }} />
        <Bar dataKey="total_score" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.traffic_light ? TL_COLORS[entry.traffic_light] : '#e8670a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
