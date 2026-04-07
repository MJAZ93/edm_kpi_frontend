import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { ChevronDown, Search, X } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SearchableSelectProps {
  label?: string
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  hint?: string
  clearable?: boolean
}

export default function SearchableSelect({
  label, options, value, onChange, placeholder = 'Seleccionar…',
  disabled, error, hint, clearable,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })

  const selected = options.find(o => o.value === value) ?? null

  const filtered = search
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropH = 280
    const top = spaceBelow >= dropH ? rect.bottom + 4 : rect.top - dropH - 4
    setDropPos({ top, left: rect.left, width: rect.width })
  }, [])

  const openDropdown = useCallback(() => {
    if (disabled) return
    calcPos()
    setOpen(true)
  }, [disabled, calcPos])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return
      setOpen(false)
      setSearch('')
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

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

  const select = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  const borderColor = open
    ? 'var(--color-primary)'
    : error
      ? 'var(--color-traffic-red)'
      : 'var(--color-border-strong)'
  const boxShadow = open ? '0 0 0 3px rgba(232,103,10,0.15)' : 'none'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}

      <div
        ref={triggerRef}
        onClick={openDropdown}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 14px',
          background: disabled ? 'var(--color-bg-strong)' : 'var(--color-surface-strong)',
          border: `1.5px solid ${borderColor}`,
          boxShadow,
          borderRadius: 14, fontSize: 14,
          color: selected ? 'var(--color-text)' : 'var(--color-text-muted)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          transition: 'border-color 150ms, box-shadow 150ms',
        }}
      >
        <span style={{ flex: 1, fontWeight: selected ? 600 : 400 }}>
          {selected ? selected.label : placeholder}
        </span>
        {clearable && selected && (
          <span onClick={clear} style={{ display: 'flex', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <X size={14} />
          </span>
        )}
        <ChevronDown size={15} style={{ color: open ? 'var(--color-primary)' : 'var(--color-text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms, color 150ms' }} />
      </div>

      {error && <span style={{ fontSize: 12, color: 'var(--color-traffic-red)', fontWeight: 600 }}>{error}</span>}
      {!error && hint && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{hint}</span>}

      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: Math.max(dropPos.width, 200),
            zIndex: 9999,
            background: 'var(--color-surface-strong)',
            border: '1.5px solid var(--color-border-strong)',
            borderRadius: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            animation: 'dp-in 120ms ease',
          }}
        >
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--color-bg-strong)', borderRadius: 10, padding: '0 10px', height: 34 }}>
              <Search size={13} color="var(--color-text-muted)" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Pesquisar…"
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--color-text)' }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options */}
          <div style={{ maxHeight: 230, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>Sem resultados.</div>
            ) : filtered.map(opt => (
              <div
                key={opt.value}
                onClick={() => select(opt.value)}
                style={{
                  padding: '9px 14px',
                  fontSize: 14,
                  fontWeight: opt.value === value ? 700 : 400,
                  color: opt.value === value ? 'var(--color-primary)' : 'var(--color-text)',
                  background: opt.value === value ? 'var(--color-primary-soft)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => {
                  if (opt.value !== value) (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-strong)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.background = opt.value === value ? 'var(--color-primary-soft)' : 'transparent'
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        </div>
      , document.body)}
    </div>
  )
}
