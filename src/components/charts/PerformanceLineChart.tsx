import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DataPoint { period: string; execution_score?: number; goal_score?: number; total_score: number }

interface Props { data: DataPoint[]; height?: number }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '12px 16px', boxShadow: 'var(--shadow-soft)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{p.name}: <b>{p.value?.toFixed(1)}</b></span>
        </div>
      ))}
    </div>
  )
}

export default function PerformanceLineChart({ data, height = 280 }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#e8670a" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#e8670a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradExec" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0f766e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradGoal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#ca8a04" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ca8a04" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.08)" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-text-muted)', fontWeight: 600 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingTop: 8 }} />
        {data[0]?.execution_score !== undefined && (
          <Area type="monotone" dataKey="execution_score" name="Execução" stroke="#0f766e" strokeWidth={2} fill="url(#gradExec)" dot={false} />
        )}
        {data[0]?.goal_score !== undefined && (
          <Area type="monotone" dataKey="goal_score" name="Objectivo" stroke="#ca8a04" strokeWidth={2} fill="url(#gradGoal)" dot={false} />
        )}
        <Area type="monotone" dataKey="total_score" name="Score Total" stroke="#e8670a" strokeWidth={2.5} fill="url(#gradTotal)" dot={false} activeDot={{ r: 5, fill: '#e8670a' }} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
