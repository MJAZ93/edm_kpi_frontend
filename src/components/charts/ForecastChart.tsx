import React from 'react'
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'

interface DataPoint { period: string; actual?: number; projected?: number }
interface Props { data: DataPoint[]; target: number; height?: number; willReach: boolean }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-soft)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6 }}>{label}</p>
      {payload.filter((p: any) => p.value != null).map((p: any) => (
        <p key={p.dataKey} style={{ fontSize: 13, fontWeight: 600, color: p.color }}>
          {p.name}: {p.value?.toLocaleString('pt-PT')}
        </p>
      ))}
    </div>
  )
}

export default function ForecastChart({ data, target, height = 260, willReach }: Props) {
  // Build a unified dataset where actual and projected overlap at the bridge point
  // Input: [{Início, actual}, {Actual, actual}, {Projecção, projected}, {Fim, projected}]
  // Output: [{Início, actual}, {Actual, actual+projected}, {Projecção, projected}, {Fim, projected}]
  const unified = data.map(d => {
    // At "Actual" point, also set projected to same value so lines connect
    if (d.actual != null && !d.projected) {
      return { ...d }
    }
    // At "Projecção" point (first projected), keep as is — connectNulls handles connection
    return { ...d }
  })

  // Find the bridge: last point with actual → set projected = actual there
  const lastActualIdx = [...unified].reverse().findIndex(d => d.actual != null)
  if (lastActualIdx >= 0) {
    const idx = unified.length - 1 - lastActualIdx
    unified[idx] = { ...unified[idx], projected: unified[idx].actual }
  }

  const projColor = willReach ? '#16a34a' : '#dc2626'

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={unified} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#e8670a" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#e8670a" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradProjected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor={projColor} stopOpacity={0.10} />
            <stop offset="95%" stopColor={projColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.08)" />
        <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={target} stroke={projColor} strokeDasharray="6 3" strokeWidth={1.5}
          label={{ value: `Meta: ${target.toLocaleString('pt-PT')}`, fill: projColor, fontSize: 11, fontWeight: 700 }} />

        {/* Real — solid orange line with fill */}
        <Area type="monotone" dataKey="actual" name="Real" stroke="#e8670a" strokeWidth={2.5} fill="url(#gradActual)" dot={{ r: 4, fill: '#e8670a', strokeWidth: 0 }} connectNulls />

        {/* Projecção — dashed green/red line with subtle fill */}
        <Area type="monotone" dataKey="projected" name="Projecção" stroke={projColor} strokeWidth={2} strokeDasharray="6 4" fill="url(#gradProjected)" dot={{ r: 3, fill: projColor, strokeWidth: 0 }} connectNulls />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
