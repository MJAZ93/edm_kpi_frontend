import React, { useState, useRef } from 'react'
import ReactDOM from 'react-dom'
import { useMutation } from '@tanstack/react-query'
import { X, Check, Plus, ArrowRight, Image, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { milestonesService } from '../../services/milestones.service'
import Spinner from '../ui/Spinner'

interface ProgressModalProps {
  /** Full indicador object (or at minimum: id, title, achieved_value, planned_value, status) */
  ms: {
    id: number
    title: string
    achieved_value?: number
    planned_value?: number
    status?: string
  }
  /** Label for the unit (e.g. "Inspecções Realizadas") — shown next to value fields */
  goalLabel?: string
  onClose: () => void
  onSuccess: () => void
}

export default function ProgressModal({ ms, goalLabel, onClose, onSuccess }: ProgressModalProps) {
  const [increment, setIncrement] = useState('')
  const [status, setStatus]       = useState<string>(ms.status === 'DONE' ? 'DONE' : 'PENDING')
  const [notes, setNotes]         = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const incNum    = parseFloat(increment) || 0
  const current   = ms.achieved_value ?? 0
  const planned   = ms.planned_value  ?? 0
  const remaining = Math.max(0, planned - current)
  const newTotal  = current + incNum
  const pct       = planned > 0 ? Math.min(100, (newTotal / planned) * 100) : 0
  const labelUnit = goalLabel || 'Valor'

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    setPhotoFile(f)
    if (f) {
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
    onError:   () => { toast.error('Progresso guardado, mas falhou ao carregar imagem.'); onSuccess() },
  })

  // 2. Add progress event
  const progressMut = useMutation({
    mutationFn: () => milestonesService.addProgress(ms.id, {
      increment_value: incNum,
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
    onError: () => toast.error('Erro ao registar progresso.'),
  })

  const isPending = progressMut.isPending || uploadMut.isPending

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
              { label: 'Planeado',   val: planned,   color: 'var(--color-text-muted)' },
              { label: 'Em Falta',   val: remaining, color: remaining > 0 ? 'var(--color-traffic-yellow)' : 'var(--color-traffic-green)' },
            ].map(item => (
              <div key={item.label} style={{ padding: '10px 12px', background: 'var(--color-bg-strong)', borderRadius: 12, textAlign: 'center', border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{item.label}</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: item.color }}>{item.val.toLocaleString('pt-PT')}</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{labelUnit}</p>
              </div>
            ))}
          </div>

          {/* ── Increment input ───────────────────────────────────────────── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
              Quantidade a Adicionar <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>({labelUnit})</span>
            </label>
            <input
              type="number"
              min={0}
              value={increment}
              onChange={e => setIncrement(e.target.value)}
              placeholder="Ex: 3000"
              autoFocus
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
                <Plus size={12} color="var(--color-primary)" />
                <span style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-primary)' }}>{incNum.toLocaleString('pt-PT')}</span>
                <ArrowRight size={13} color="var(--color-text-muted)" />
              </div>
              <div style={{ textAlign: 'center', minWidth: 56 }}>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>Novo Total</p>
                <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-traffic-green)' }}>{newTotal.toLocaleString('pt-PT')}</p>
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
              Comprovativo <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', textTransform: 'none' }}>(opcional · JPG, PNG, WEBP · máx 5 MB)</span>
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
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ border: '2px dashed var(--color-border-strong)', borderRadius: 12, padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 150ms, background 150ms', background: 'var(--color-bg-strong)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary)'; (e.currentTarget as HTMLDivElement).style.background = 'color-mix(in srgb, var(--color-primary) 5%, transparent)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border-strong)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--color-bg-strong)' }}
              >
                <Image size={24} style={{ color: 'var(--color-text-muted)', opacity: 0.5, marginBottom: 8 }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-muted)' }}>Clique para seleccionar imagem</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>ou arraste e largue aqui</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
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
            disabled={incNum <= 0 || isPending}
            style={{ padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: incNum <= 0 ? 'not-allowed' : 'pointer', background: incNum <= 0 ? 'var(--color-border)' : 'var(--color-primary)', border: 'none', color: incNum <= 0 ? 'var(--color-text-muted)' : '#fff', display: 'flex', alignItems: 'center', gap: 6, opacity: isPending ? 0.7 : 1, transition: 'background 150ms' }}
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
