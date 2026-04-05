import React from 'react'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts'

interface DataPoint { period: string; actual?: number; projected?: number }
interface Props { data: DataPoint[]; target: number; height?: number; willReach: boolean }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-soft)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {p.value?.toLocaleString('pt-PT')}
        </p>
      ))}
    </div>
  )
}

export default function ForecastChart({ data, target, height = 260, willReach }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#e8670a" stopOpacity={0.20} />
            <stop offset="95%" stopColor="#e8670a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.08)" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 8 }} />
        <ReferenceLine y={target} stroke={willReach ? '#16a34a' : '#dc2626'} strokeDasharray="6 3" strokeWidth={2}
          label={{ value: `Meta: ${target.toLocaleString('pt-PT')}`, fill: willReach ? '#16a34a' : '#dc2626', fontSize: 11, fontWeight: 700 }} />
        <Area type="monotone" dataKey="actual" name="Real" stroke="#e8670a" strokeWidth={2.5} fill="url(#gradActual)" dot={false} connectNulls />
        <Line type="monotone" dataKey="projected" name="Projecção" stroke={willReach ? '#16a34a' : '#dc2626'} strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
