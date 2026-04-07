import React, { useId } from 'react'

interface WeightSliderProps {
  label?: string
  value: number
  onChange: (value: number) => void
  max?: number       // defaults to 100
  usedByOthers?: number  // total weight already used by other tasks
  error?: string
}

export default function WeightSlider({
  label = 'Peso (%)',
  value,
  onChange,
  max = 100,
  usedByOthers,
  error,
}: WeightSliderProps) {
  const uid = useId()
  const safeMax = Math.max(0, Math.min(100, max))
  const safeVal = Math.min(value, safeMax)
  const pct = safeMax > 0 ? (safeVal / safeMax) * 100 : 0

  const totalUsed = (usedByOthers ?? 0) + safeVal
  const remaining = 100 - totalUsed

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={uid} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}

      {/* Track + value */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Custom track background */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 6,
            borderRadius: 999,
            transform: 'translateY(-50%)',
            background: 'var(--color-border-strong)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: 0,
            width: `${pct}%`,
            height: 6,
            borderRadius: 999,
            transform: 'translateY(-50%)',
            background: safeVal > safeMax * 0.8
              ? 'var(--color-traffic-red)'
              : safeVal > safeMax * 0.5
                ? 'var(--color-primary)'
                : 'var(--color-primary)',
            transition: 'width 100ms ease',
            pointerEvents: 'none',
          }} />
          <input
            id={uid}
            type="range"
            min={0}
            max={safeMax}
            step={1}
            value={safeVal}
            onChange={e => onChange(Number(e.target.value))}
            style={{
              width: '100%',
              height: 28,
              appearance: 'none',
              WebkitAppearance: 'none',
              background: 'transparent',
              cursor: 'pointer',
              outline: 'none',
              margin: 0,
            }}
          />
        </div>

        {/* Numeric badge */}
        <div style={{
          minWidth: 52,
          height: 34,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-primary)',
          borderRadius: 10,
          color: '#fff',
          fontSize: 14,
          fontWeight: 800,
          flexShrink: 0,
        }}>
          {safeVal}%
        </div>
      </div>

      {/* Hint row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>0%</span>
        {usedByOthers !== undefined && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: remaining < 0 ? 'var(--color-traffic-red)' : remaining === 0 ? 'var(--color-text-muted)' : 'var(--color-text-muted)',
          }}>
            {remaining < 0
              ? `⚠ Excede em ${Math.abs(remaining)}%`
              : remaining === 0
                ? 'Sem peso disponível'
                : `${remaining}% disponível`}
          </span>
        )}
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{safeMax}%</span>
      </div>

      {/* Progress bar showing all tasks */}
      {usedByOthers !== undefined && usedByOthers > 0 && (
        <div style={{ display: 'flex', height: 4, borderRadius: 999, overflow: 'hidden', background: 'var(--color-border-strong)', gap: 1 }}>
          {/* Other tasks slice */}
          <div style={{
            width: `${Math.min(usedByOthers, 100)}%`,
            background: 'var(--color-text-muted)',
            borderRadius: '999px 0 0 999px',
            transition: 'width 150ms',
          }} />
          {/* This task slice */}
          <div style={{
            width: `${Math.min(safeVal, Math.max(0, 100 - usedByOthers))}%`,
            background: 'var(--color-primary)',
            transition: 'width 150ms',
            borderRadius: totalUsed >= 100 ? 999 : '0 999px 999px 0',
          }} />
        </div>
      )}

      {error && <span style={{ fontSize: 12, color: 'var(--color-traffic-red)', fontWeight: 600 }}>{error}</span>}

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-primary);
          border: 3px solid #fff;
          box-shadow: 0 1px 6px rgba(232,103,10,0.4);
          cursor: pointer;
          transition: transform 120ms, box-shadow 120ms;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 2px 10px rgba(232,103,10,0.5);
        }
        input[type=range]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--color-primary);
          border: 3px solid #fff;
          box-shadow: 0 1px 6px rgba(232,103,10,0.4);
          cursor: pointer;
        }
        input[type=range]:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 4px rgba(232,103,10,0.2);
        }
      `}</style>
    </div>
  )
}
