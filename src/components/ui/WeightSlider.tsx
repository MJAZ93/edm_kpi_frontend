import React, { useId } from 'react'

interface WeightSliderProps {
  label?: string
  value: number
  onChange: (value: number) => void
  max?: number
  usedByOthers?: number
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
  const safeVal = Math.max(0, Math.min(value, 100))
  const pct = safeVal

  const totalUsed = (usedByOthers ?? 0) + safeVal
  const remaining = 100 - totalUsed
  const overBudget = remaining < 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label htmlFor={uid} style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </label>
      )}

      {/* Slider + numeric input */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Track background */}
          <div style={{
            position: 'absolute', top: '50%', left: 0, right: 0,
            height: 6, borderRadius: 999, transform: 'translateY(-50%)',
            background: 'var(--color-border-strong)', pointerEvents: 'none',
          }} />
          {/* Filled track */}
          <div style={{
            position: 'absolute', top: '50%', left: 0,
            width: `${pct}%`, height: 6, borderRadius: 999,
            transform: 'translateY(-50%)',
            background: overBudget ? 'var(--color-traffic-red)' : 'var(--color-primary)',
            transition: 'width 100ms ease',
            pointerEvents: 'none',
          }} />
          <input
            id={uid}
            type="range"
            min={0}
            max={100}
            step={1}
            value={safeVal}
            onChange={e => onChange(Number(e.target.value))}
            style={{
              width: '100%', height: 28,
              appearance: 'none', WebkitAppearance: 'none',
              background: 'transparent', cursor: 'pointer',
              outline: 'none', margin: 0,
              position: 'relative', zIndex: 2,
            }}
          />
        </div>

        {/* Editable numeric input */}
        <input
          type="number"
          min={0}
          max={100}
          value={safeVal}
          onChange={e => {
            const v = Math.max(0, Math.min(100, Number(e.target.value) || 0))
            onChange(v)
          }}
          style={{
            width: 56, height: 34,
            textAlign: 'center',
            background: overBudget ? 'var(--color-traffic-red-bg)' : 'var(--color-bg-strong)',
            border: `2px solid ${overBudget ? 'var(--color-traffic-red)' : 'var(--color-border)'}`,
            borderRadius: 10,
            color: overBudget ? 'var(--color-traffic-red)' : 'var(--color-text)',
            fontSize: 14, fontWeight: 800,
            outline: 'none', flexShrink: 0,
          }}
        />
      </div>

      {/* Hint row */}
      {usedByOthers !== undefined && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>0%</span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: overBudget ? 'var(--color-traffic-red)' : 'var(--color-text-muted)',
          }}>
            {overBudget
              ? `Excede em ${Math.abs(remaining)}%`
              : remaining === 0
                ? `100% distribuído`
                : `${remaining}% disponível`}
          </span>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>100%</span>
        </div>
      )}

      {/* Progress bar showing all tasks */}
      {usedByOthers !== undefined && usedByOthers > 0 && (
        <div style={{ display: 'flex', height: 4, borderRadius: 999, overflow: 'hidden', background: 'var(--color-border-strong)', gap: 1 }}>
          <div style={{
            width: `${Math.min(usedByOthers, 100)}%`,
            background: 'var(--color-text-muted)',
            borderRadius: '999px 0 0 999px',
            transition: 'width 150ms',
          }} />
          <div style={{
            width: `${Math.min(safeVal, Math.max(0, 100 - usedByOthers))}%`,
            background: overBudget ? 'var(--color-traffic-red)' : 'var(--color-primary)',
            transition: 'width 150ms',
            borderRadius: totalUsed >= 100 ? 999 : '0 999px 999px 0',
          }} />
        </div>
      )}

      {error && <span style={{ fontSize: 12, color: 'var(--color-traffic-red)', fontWeight: 600 }}>{error}</span>}

      <style>{`
        #${CSS.escape(uid)}::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-primary);
          border: none;
          box-shadow: 0 0 0 3px rgba(232,103,10,0.15);
          cursor: pointer;
          transition: transform 120ms, box-shadow 120ms;
        }
        #${CSS.escape(uid)}::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 5px rgba(232,103,10,0.15);
        }
        #${CSS.escape(uid)}::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--color-primary);
          border: none;
          box-shadow: 0 0 0 3px rgba(232,103,10,0.15);
          cursor: pointer;
        }
        #${CSS.escape(uid)}:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 5px rgba(232,103,10,0.2);
        }
        /* Hide number input spinners */
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
