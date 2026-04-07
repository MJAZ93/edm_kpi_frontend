import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Search, X } from 'lucide-react'
import { usersService } from '../../services/org.service'
import Avatar from './Avatar'

interface UserComboboxProps {
  label?: string
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  optional?: boolean
  roles?: string[]
}

export default function UserCombobox({ label, value, onChange, placeholder = 'Pesquisar utilizador…', optional, roles }: UserComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 })

  const { data } = useQuery({
    queryKey: ['users', { limit: 200 }],
    queryFn: () => usersService.list({ limit: 200 }),
  })
  const allUsers = data?.data ?? []
  const users = roles ? allUsers.filter(u => roles.includes(u.role)) : allUsers

  const selected = users.find(u => u.id === value) ?? null

  const filtered = search
    ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const dropH = 280
    const top = spaceBelow >= dropH ? rect.bottom + 4 : rect.top - dropH - 4
    setDropPos({ top, left: rect.left, width: rect.width })
  }, [])

  const openDropdown = useCallback(() => {
    calcPos()
    setOpen(true)
  }, [calcPos])

  // Close on outside click
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

  // Reposition on scroll/resize
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

  const select = (id: number) => {
    onChange(id)
    setOpen(false)
    setSearch('')
  }

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {label}{optional && <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 4 }}>(opcional)</span>}
        </label>
      )}

      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={openDropdown}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, height: 42, padding: '0 12px',
          background: 'var(--color-surface-strong)',
          border: `1.5px solid ${open ? 'var(--color-primary)' : 'var(--color-border-strong)'}`,
          boxShadow: open ? '0 0 0 3px rgba(232,103,10,0.15)' : 'none',
          borderRadius: 14, fontSize: 14, color: selected ? 'var(--color-text)' : 'var(--color-text-muted)',
          cursor: 'pointer', userSelect: 'none', transition: 'border-color 150ms, box-shadow 150ms',
        }}
      >
        {selected ? (
          <>
            <Avatar name={selected.name} size="sm" />
            <span style={{ flex: 1, fontWeight: 600 }}>{selected.name}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{selected.role}</span>
            {optional && (
              <span onClick={clear} style={{ marginLeft: 4, display: 'flex', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                <X size={14} />
              </span>
            )}
          </>
        ) : (
          <span style={{ flex: 1 }}>{placeholder}</span>
        )}
        <ChevronDown size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </div>

      {/* Dropdown via portal so it escapes Modal overflow */}
      {open && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropPos.top,
            left: dropPos.left,
            width: dropPos.width,
            zIndex: 9999,
            background: 'var(--color-surface-strong)',
            border: '1.5px solid var(--color-border-strong)',
            borderRadius: 14,
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            overflow: 'hidden',
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
                placeholder="Pesquisar por nome ou email…"
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: 'var(--color-text)' }}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>Nenhum utilizador encontrado.</div>
            ) : filtered.map(u => (
              <div
                key={u.id}
                onClick={() => select(u.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  cursor: 'pointer', background: u.id === value ? 'var(--color-surface-muted)' : 'transparent',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-strong)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = u.id === value ? 'var(--color-surface-muted)' : 'transparent' }}
              >
                <Avatar name={u.name} size="sm" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{u.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-bg-strong)', padding: '2px 6px', borderRadius: 6 }}>{u.role}</span>
              </div>
            ))}
          </div>
        </div>
      , document.body)}
    </div>
  )
}
