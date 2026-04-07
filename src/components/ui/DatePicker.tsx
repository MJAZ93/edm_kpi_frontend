import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths, isSameDay, isToday,
  parseISO, isValid, isBefore, isAfter,
} from 'date-fns'
import { pt } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DatePickerProps {
  label?: string
  value?: string          // YYYY-MM-DD
  onChange?: (value: string) => void
  error?: string
  hint?: string
  placeholder?: string
  disabled?: boolean
  min?: string            // YYYY-MM-DD
  max?: string            // YYYY-MM-DD
  name?: string
  onBlur?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function parseValue(v?: string): Date | null {
  if (!v) return null
  const d = parseISO(v)
  return isValid(d) ? d : null
}

function toISO(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function displayDate(v?: string): string {
  const d = parseValue(v)
  return d ? format(d, 'dd/MM/yyyy') : ''
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DatePicker({
  label, value, onChange, error, hint,
  placeholder = 'DD/MM/AAAA', disabled, min, max, name, onBlur,
}: DatePickerProps) {
  const selectedDate = parseValue(value)
  const [open, setOpen]           = useState(false)
  const [viewMonth, setViewMonth] = useState<Date>(selectedDate ?? new Date())
  const [focused, setFocused]     = useState(false)
  const [popupPos, setPopupPos]   = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const popupRef   = useRef<HTMLDivElement>(null)
  const inputId    = label?.toLowerCase().replace(/\s+/g, '-')

  // Compute popup position from trigger's bounding rect
  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const popupH = 340 // approx height
    const top = spaceBelow >= popupH
      ? rect.bottom + 6
      : rect.top - popupH - 6
    setPopupPos({ top, left: rect.left, width: rect.width })
  }, [])

  const openPicker = useCallback(() => {
    if (disabled) return
    calcPos()
    setOpen(o => !o)
  }, [disabled, calcPos])

  // Close on outside click (both trigger and popup)
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        popupRef.current?.contains(target)
      ) return
      setOpen(false)
      onBlur?.()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onBlur])

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!open) return
    const update = () => calcPos()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, calcPos])

  // Keep viewMonth in sync when value changes externally
  useEffect(() => {
    if (selectedDate) setViewMonth(selectedDate)
  }, [value])

  const select = useCallback((day: Date) => {
    onChange?.(toISO(day))
    setOpen(false)
    onBlur?.()
  }, [onChange, onBlur])

  const clear = useCallback(() => {
    onChange?.('')
    setOpen(false)
    onBlur?.()
  }, [onChange, onBlur])

  // Build day grid for current view month
  const monthStart  = startOfMonth(viewMonth)
  const monthEnd    = endOfMonth(viewMonth)
  const days        = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPad    = getDay(monthStart)           // 0=Sun … 6=Sat
  const minDate     = parseValue(min)
  const maxDate     = parseValue(max)

  const isDisabledDay = (d: Date) =>
    (minDate ? isBefore(d, minDate) : false) ||
    (maxDate ? isAfter(d, maxDate)  : false)

  // Input appearance
  const borderColor = focused ? 'var(--color-primary)' : error ? 'var(--color-traffic-red)' : 'var(--color-border-strong)'
  const boxShadow   = focused ? '0 0 0 3px rgba(232,103,10,0.15)' : 'none'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          {label}
        </label>
      )}

      {/* Input trigger */}
      <div
        ref={triggerRef}
        id={inputId}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker() } if (e.key === 'Escape') { setOpen(false); onBlur?.() } }}
        onClick={openPicker}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 42,
          padding: '0 14px',
          background: disabled ? 'var(--color-bg-strong)' : 'var(--color-surface-strong)',
          border: `1.5px solid ${borderColor}`,
          borderRadius: 14,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 150ms, box-shadow 150ms',
          boxShadow,
          userSelect: 'none',
        }}
      >
        <span style={{ flex: 1, fontSize: 14, color: value ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: value ? 600 : 400 }}>
          {value ? displayDate(value) : placeholder}
        </span>
        <CalendarDays size={15} style={{ color: open ? 'var(--color-primary)' : 'var(--color-text-muted)', flexShrink: 0, transition: 'color 150ms' }} />
      </div>

      {/* Hidden input for form libs that need a real input element */}
      <input type="hidden" name={name} value={value ?? ''} readOnly />

      {error && <span style={{ fontSize: 12, color: 'var(--color-traffic-red)', fontWeight: 600 }}>{error}</span>}
      {!error && hint && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{hint}</span>}

      {/* Calendar popup — rendered via portal so it escapes any overflow:hidden container */}
      {open && ReactDOM.createPortal(
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            top: popupPos.top,
            left: popupPos.left,
            minWidth: Math.max(popupPos.width, 280),
            zIndex: 9999,
            background: 'var(--color-surface-strong)',
            border: '1.5px solid var(--color-border-strong)',
            borderRadius: 16,
            boxShadow: 'var(--shadow-medium)',
            padding: '16px',
            animation: 'dp-in 120ms ease',
          }}
        >
          <style>{`
            @keyframes dp-in {
              from { opacity: 0; transform: translateY(-6px) scale(0.98); }
              to   { opacity: 1; transform: translateY(0)    scale(1);    }
            }
          `}</style>

          {/* Month / year header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setViewMonth(m => subMonths(m, 1))}
              style={{ background: 'none', border: 'none', padding: '4px 6px', borderRadius: 8, color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 120ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <ChevronLeft size={16} />
            </button>

            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', textTransform: 'capitalize' }}>
              {format(viewMonth, 'MMMM yyyy', { locale: pt })}
            </span>

            <button
              type="button"
              onClick={() => setViewMonth(m => addMonths(m, 1))}
              style={{ background: 'none', border: 'none', padding: '4px 6px', borderRadius: 8, color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'background 120ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Week day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {WEEK_DAYS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.04em', padding: '2px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {/* Leading empty cells */}
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}

            {days.map(day => {
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false
              const isTodayDay = isToday(day)
              const isOff      = isDisabledDay(day)

              let bg     = 'transparent'
              let color  = isOff ? 'var(--color-text-muted)' : 'var(--color-text)'
              let border = 'none'
              let fw     = 500

              if (isSelected) {
                bg    = 'var(--color-primary)'
                color = '#fff'
                fw    = 800
              } else if (isTodayDay) {
                border = `1.5px solid var(--color-primary)`
                color  = 'var(--color-primary)'
                fw     = 700
              }

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isOff}
                  onClick={() => !isOff && select(day)}
                  style={{
                    background: bg,
                    border,
                    borderRadius: 8,
                    color,
                    fontSize: 13,
                    fontWeight: fw,
                    padding: '7px 0',
                    textAlign: 'center',
                    cursor: isOff ? 'not-allowed' : 'pointer',
                    opacity: isOff ? 0.35 : 1,
                    transition: 'background 100ms, color 100ms',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (!isSelected && !isOff) (e.currentTarget.style.background = 'var(--color-primary-soft)') }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget.style.background = bg) }}
                >
                  {format(day, 'd')}
                </button>
              )
            })}
          </div>

          {/* Footer actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-border)' }}>
            <button
              type="button"
              onClick={clear}
              style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => select(new Date())}
              style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Hoje
            </button>
          </div>
        </div>
      , document.body)}
    </div>
  )
}
