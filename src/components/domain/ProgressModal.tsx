import React, { useState, useRef, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { X, Check, Plus, ArrowRight, Paperclip, Trash2, FileText, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { milestonesService } from '../../services/milestones.service'
import type { Frequency } from '../../types'
import Spinner from '../ui/Spinner'

// ── Period helpers ──────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const QUARTER_NAMES = ['1º Trimestre', '2º Trimestre', '3º Trimestre', '4º Trimestre']
const SEMESTER_NAMES = ['1º Semestre', '2º Semestre']

/** Generate period options based on frequency, bounded by startDate → endDate */
export function buildPeriodOptions(
  frequency: Frequency | string | undefined,
  startDate?: string,  // YYYY-MM-DD or ISO
  endDate?: string,    // YYYY-MM-DD or ISO (milestone planned_date)
): { value: string; label: string }[] {
  const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), 0, 1)
  const end = endDate ? new Date(endDate) : new Date(new Date().getFullYear(), 11, 31)

  switch (frequency) {
    case 'MONTHLY': {
      const opts: { value: string; label: string }[] = []
      const d = new Date(start.getFullYear(), start.getMonth(), 1)
      while (d <= end) {
        const y = d.getFullYear()
        const m = d.getMonth()
        opts.push({
          value: `${y}-${String(m + 1).padStart(2, '0')}`,
          label: `${MONTH_NAMES[m]} ${y}`,
        })
        d.setMonth(d.getMonth() + 1)
      }
      return opts
    }
    case 'QUARTERLY': {
      const opts: { value: string; label: string }[] = []
      const startQ = Math.floor(start.getMonth() / 3)
      const d = new Date(start.getFullYear(), startQ * 3, 1)
      while (d <= end) {
        const y = d.getFullYear()
        const q = Math.floor(d.getMonth() / 3) + 1
        opts.push({
          value: `${y}-Q${q}`,
          label: `${QUARTER_NAMES[q - 1]} ${y}`,
        })
        d.setMonth(d.getMonth() + 3)
      }
      return opts
    }
    case 'BIANNUAL': {
      const opts: { value: string; label: string }[] = []
      const startS = Math.floor(start.getMonth() / 6)
      const d = new Date(start.getFullYear(), startS * 6, 1)
      while (d <= end) {
        const y = d.getFullYear()
        const s = Math.floor(d.getMonth() / 6) + 1
        opts.push({
          value: `${y}-S${s}`,
          label: `${SEMESTER_NAMES[s - 1]} ${y}`,
        })
        d.setMonth(d.getMonth() + 6)
      }
      return opts
    }
    case 'ANNUAL': {
      const opts: { value: string; label: string }[] = []
      for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
        opts.push({ value: `${y}`, label: `${y}` })
      }
      return opts
    }
    case 'WEEKLY': {
      const opts: { value: string; label: string }[] = []
      const d = new Date(start)
      d.setDate(d.getDate() - d.getDay() + 1) // Monday
      while (d <= end) {
        const weekNum = getWeekNumber(d)
        opts.push({
          value: `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`,
          label: `Semana ${weekNum} (${d.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' })})`,
        })
        d.setDate(d.getDate() + 7)
      }
      return opts
    }
    case 'DAILY':
    default:
      return []
  }
}

function getWeekNumber(d: Date): number {
  const oneJan = new Date(d.getFullYear(), 0, 1)
  return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7)
}

/** Human-readable period label from reference like "2026-03", "2026-Q1", etc. */
export function periodLabel(ref: string): string {
  if (!ref) return ''
  // Monthly: "2026-03" → "Março 2026"
  const monthly = ref.match(/^(\d{4})-(\d{2})$/)
  if (monthly) {
    const [, y, m] = monthly
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`
  }
  // Quarterly: "2026-Q2"
  const quarterly = ref.match(/^(\d{4})-Q(\d)$/)
  if (quarterly) {
    const [, y, q] = quarterly
    return `${QUARTER_NAMES[parseInt(q, 10) - 1]} ${y}`
  }
  // Biannual: "2026-S1"
  const biannual = ref.match(/^(\d{4})-S(\d)$/)
  if (biannual) {
    const [, y, s] = biannual
    return `${SEMESTER_NAMES[parseInt(s, 10) - 1]} ${y}`
  }
  // Weekly: "2026-W12"
  const weekly = ref.match(/^(\d{4})-W(\d{2})$/)
  if (weekly) {
    const [, y, w] = weekly
    return `Semana ${parseInt(w, 10)} de ${y}`
  }
  // Annual or fallback
  return ref
}

// ── Component ───────────────────────────────────────────────────────────────

interface ProgressModalProps {
  /** Full indicador object (or at minimum: id, title, achieved_value, planned_value, status, frequency) */
  ms: {
    id: number
    title: string
    achieved_value?: number
    planned_value?: number
    status?: string
    frequency?: string
    planned_date?: string
    aggregation_type?: string
  }
  /** Label for the unit (e.g. "Inspecções Realizadas") — shown next to value fields */
  goalLabel?: string
  /** When true, lower values = better (e.g. losses, defects) */
  isReduction?: boolean
  /** Task start date (YYYY-MM-DD) to bound period options */
  taskStartDate?: string
  /** Parent task's aggregation_type — used as fallback when milestone has none */
  taskAggType?: string
  onClose: () => void
  onSuccess: () => void
}

export default function ProgressModal({ ms, goalLabel, isReduction, taskStartDate, taskAggType, onClose, onSuccess }: ProgressModalProps) {
  const [increment, setIncrement] = useState('')
  const [period, setPeriod]       = useState('')
  const [status, setStatus]       = useState<string>(ms.status === 'DONE' ? 'DONE' : 'PENDING')
  const [notes, setNotes]         = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Fetch existing progress events to know which periods are already recorded
  const { data: existingProgress } = useQuery({
    queryKey: ['milestone-progress', ms.id],
    queryFn: () => milestonesService.listProgress(ms.id),
    enabled: ms.id > 0,
  })

  const usedPeriods = useMemo(() => {
    const set = new Set<string>()
    existingProgress?.events?.forEach(e => {
      if (e.period_reference) set.add(e.period_reference)
    })
    return set
  }, [existingProgress])

  const periodOptions = useMemo(
    () => buildPeriodOptions(ms.frequency, taskStartDate, ms.planned_date),
    [ms.frequency, taskStartDate, ms.planned_date],
  )
  const hasPeriodSelector = periodOptions.length > 0

  const msAgg     = ms.aggregation_type || taskAggType || 'SUM_UP'
  const incNum    = parseFloat(increment) || 0
  const current   = ms.achieved_value ?? 0
  const planned   = ms.planned_value  ?? 0
  const eventCount = existingProgress?.events?.length ?? 0

  // Compute projected newTotal based on aggregation type
  const newTotal = useMemo(() => {
    if (incNum <= 0) return current
    switch (msAgg) {
      case 'AVG': {
        // Average of all existing values + new one
        const existingSum = (existingProgress?.events ?? []).reduce((s, e) => s + (e.increment_value ?? 0), 0)
        return (existingSum + incNum) / (eventCount + 1)
      }
      case 'LAST':
        return incNum  // last value replaces everything
      default: // SUM_UP
        return current + incNum
    }
  }, [msAgg, incNum, current, existingProgress, eventCount])

  // Reduction: achieved/planned when under target, negative when over.
  // Growth: achieved/planned capped at 100%.
  const remaining = Math.abs(planned - current)
  const pct       = planned > 0
    ? isReduction
      ? (newTotal || 0) <= planned
        ? Math.min(100, ((newTotal || 0) / planned) * 100)
        : -(((newTotal || 0) - planned) / planned) * 100
      : Math.min(100, ((newTotal || 0) / planned) * 100)
    : 0
  const labelUnit = goalLabel || 'Valor'
  const remainingLabel = isReduction ? 'Excesso' : 'Diferença'
  const incrementLabel = msAgg === 'LAST' ? 'Novo Valor' : msAgg === 'AVG' ? 'Valor do Período' : 'Quantidade a Adicionar'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    if (f && f.size > 5 * 1024 * 1024) {
      toast.error('Ficheiro demasiado grande. Máximo 5 MB.')
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setPhotoFile(f)
    if (f && f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = ev => setPhotoPreview(ev.target?.result as string)
      reader.readAsDataURL(f)
    } else {
      setPhotoPreview(null)
    }
  }

  const clearPhoto = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // 1. Upload photo if present
  const uploadMut = useMutation({
    mutationFn: (file: File) => milestonesService.uploadPhoto(ms.id, file),
    onSuccess: () => { toast.success('Comprovativo anexado.'); onSuccess() },
    onError:   () => { toast.error('Progresso guardado, mas falhou ao carregar ficheiro.'); onSuccess() },
  })

  // 2. Add progress event
  const progressMut = useMutation({
    mutationFn: () => milestonesService.addProgress(ms.id, {
      increment_value: incNum,
      period_reference: period || undefined,
      notes,
      status,
    }),
    onSuccess: () => {
      if (photoFile) {
        uploadMut.mutate(photoFile)
      } else {
        toast.success('Progresso registado!')
        onSuccess()
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
      if (msg) {
        toast.error(msg)
      } else {
        toast.error('Erro ao registar progresso.')
      }
    },
  })

  const isPending = progressMut.isPending || uploadMut.isPending
  const canSubmit = incNum > 0 && (!hasPeriodSelector || period !== '')

  return ReactDOM.createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: 500, maxHeight: '90vh', overflowY: 'auto', background: 'var(--color-surface)', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: '1px solid var(--color-border)' }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, position: 'sticky', top: 0, background: 'var(--color-surface)', zIndex: 1 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Actualizar Progresso</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ms.title}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2, display: 'flex', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Current / Planned / Remaining ──────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Realizado',  val: current,   color: 'var(--color-primary)' },
              { label: isReduction ? 'Alvo' : 'Planeado',   val: planned,   color: 'var(--color-text-muted)' },
              { label: remainingLabel,   val: remaining, color: remaining > 0 ? 'var(--color-traffic-yellow)' : 'var(--color-traffic-green)' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 12px', background: 'var(--color-bg-strong)', borderRadius: 12, textAlign: 'center', border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.val.toLocaleString('pt-PT')}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{labelUnit}</p>
              </div>
            ))}
          </div>

          {/* ── Period selector ───────────────────────────────────────────── */}
          {hasPeriodSelector && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                <Calendar size={12} />
                Período de Referência
              </label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '1.5px solid var(--color-border-strong)', borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  background: 'var(--color-surface-strong)', color: period ? 'var(--color-text)' : 'var(--color-text-muted)',
                  outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
              >
                <option value="">Seleccione o período…</option>
                {periodOptions.map(opt => {
                  const used = usedPeriods.has(opt.value)
                  return (
                    <option key={opt.value} value={opt.value} disabled={used}>
                      {opt.label}{used ? ' ✓ (já registado)' : ''}
                    </option>
                  )
                })}
              </select>
              {period && usedPeriods.has(period) && (
                <p style={{ fontSize: 11, color: 'var(--color-traffic-red)', fontWeight: 600, marginTop: 4 }}>
                  Este período já tem registo. Seleccione outro.
                </p>
              )}
            </div>
          )}

          {/* ── Increment input ───────────────────────────────────────────── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              {incrementLabel} <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>({labelUnit})</span>
            </label>
            <input
              type="number"
              min={0}
              step="any"
              value={increment}
              onChange={e => setIncrement(e.target.value)}
              placeholder="Ex: 3000"
              autoFocus={!hasPeriodSelector}
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--color-border-strong)', borderRadius: 12, fontSize: 16, fontWeight: 700, background: 'var(--color-surface-strong)', color: 'var(--color-text)', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
            />
          </div>

          {/* ── Live projection ─────────────────────────────────────────── */}
          {incNum > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', borderRadius: 12, border: '1.5px solid color-mix(in srgb, var(--color-primary) 25%, transparent)' }}>
              <div style={{ textAlign: 'center', minWidth: 56 }}>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Actual</p>
                <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-text)' }}>{current.toLocaleString('pt-PT')}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}>
                {msAgg === 'LAST' ? (
                  <ArrowRight size={13} color="var(--color-primary)" />
                ) : msAgg === 'AVG' ? (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)' }}>AVG</span>
                ) : (
                  <Plus size={12} color="var(--color-primary)" />
                )}
                <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-primary)' }}>{incNum.toLocaleString('pt-PT')}</span>
                <ArrowRight size={13} color="var(--color-text-muted)" />
              </div>
              <div style={{ textAlign: 'center', minWidth: 56 }}>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>{msAgg === 'LAST' ? 'Novo Valor' : msAgg === 'AVG' ? 'Nova Média' : 'Novo Total'}</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-traffic-green)' }}>{newTotal.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}</p>
              </div>
              <div style={{ flex: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Progresso</p>
                  <p style={{ fontSize: 10, fontWeight: 700, color: pct >= 100 ? 'var(--color-traffic-green)' : 'var(--color-primary)' }}>{pct.toFixed(1)}%</p>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? 'var(--color-traffic-green)' : 'var(--color-primary)', borderRadius: 4, transition: 'width 300ms' }} />
                </div>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 2 }}>de {planned.toLocaleString('pt-PT')} {labelUnit}</p>
              </div>
            </div>
          )}

          {/* ── Status selector ──────────────────────────────────────────── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Estado</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['PENDING', 'DONE', 'BLOCKED'] as const).map(s => {
                const LABELS: Record<string, string> = { PENDING: 'Pendente', DONE: 'Concluído', BLOCKED: 'Bloqueado' }
                const COLORS: Record<string, string> = { PENDING: 'var(--color-traffic-yellow)', DONE: 'var(--color-traffic-green)', BLOCKED: 'var(--color-traffic-red)' }
                const active = status === s
                return (
                  <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${active ? COLORS[s] : 'var(--color-border)'}`, background: active ? `color-mix(in srgb, ${COLORS[s]} 15%, transparent)` : 'var(--color-surface-strong)', color: active ? COLORS[s] : 'var(--color-text-muted)', transition: 'all 150ms' }}>
                    {LABELS[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Notes ────────────────────────────────────────────────────── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Notas <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', textTransform: 'none' }}>(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Contexto sobre este progresso…"
              style={{ width: '100%', padding: '10px 14px', border: '1.5px solid var(--color-border-strong)', borderRadius: 12, fontSize: 13, background: 'var(--color-surface-strong)', color: 'var(--color-text)', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--color-border-strong)')}
            />
          </div>

          {/* ── Comprovativo (photo) ──────────────────────────────────────── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 8 }}>
              Comprovativo <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', textTransform: 'none' }}>(opcional · JPG, PNG, WEBP, PDF, TXT, CSV, DOC, DOCX, XLS, XLSX, ZIP · máx 5 MB)</span>
            </label>

            {photoPreview ? (
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1.5px solid var(--color-border)', background: 'var(--color-bg-strong)' }}>
                <img src={photoPreview} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                    {photoFile?.name} ({((photoFile?.size ?? 0) / 1024 / 1024).toFixed(1)} MB)
                  </span>
                  <button onClick={clearPhoto} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'var(--color-traffic-red-bg)', border: '1px solid var(--color-traffic-red)', color: 'var(--color-traffic-red)' }}>
                    <Trash2 size={11} /> Remover
                  </button>
                </div>
              </div>
            ) : photoFile ? (
              <div style={{ borderRadius: 12, border: '1.5px solid var(--color-border)', background: 'var(--color-bg-strong)', padding: '16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={18} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photoFile.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{(photoFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                <button onClick={clearPhoto} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'var(--color-traffic-red-bg)', border: '1px solid var(--color-traffic-red)', color: 'var(--color-traffic-red)', flexShrink: 0 }}>
                  <Trash2 size={11} /> Remover
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--color-border-strong)', borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 150ms, background 150ms', background: 'var(--color-bg-strong)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLDivElement).style.background = 'color-mix(in srgb, var(--color-primary) 5%, transparent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-strong)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-strong)' }}
              >
                <Paperclip size={24} style={{ color: 'var(--color-text-muted)', opacity: 0.5, marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>Clique para seleccionar ficheiro</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>imagem ou documento até 5 MB</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip,image/jpeg,image/png,image/webp,application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'var(--color-surface)' }}>
          <button onClick={onClose} disabled={isPending} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
            Cancelar
          </button>
          <button
            onClick={() => progressMut.mutate()}
            disabled={!canSubmit || isPending}
            style={{ padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: !canSubmit ? 'not-allowed' : 'pointer', background: !canSubmit ? 'var(--color-border)' : 'var(--color-primary)', border: 'none', color: !canSubmit ? 'var(--color-text-muted)' : '#fff', display: 'flex', alignItems: 'center', gap: 6, opacity: isPending ? 0.7 : 1, transition: 'background 150ms' }}
          >
            {isPending ? <Spinner size="sm" /> : <Check size={14} />}
            {photoFile ? 'Guardar com Comprovativo' : 'Registar Progresso'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
