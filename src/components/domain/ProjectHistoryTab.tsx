import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import HoverReferenceLine from '../charts/HoverReferenceLine'
import { projectsService, type ProjectHistoryEntry } from '../../services/projects.service'
import { buildPeriodOptions, periodLabel } from './ProgressModal'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'

function fmtDateTime(d?: string) {
  if (!d) return '\u2014'
  const date = new Date(d)
  return isNaN(date.getTime())
    ? d
    : date.toLocaleString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

interface ProjectHistoryTabProps {
  projectId: number
  project?: any // project object with start_value, target_value, frequency, start_date, end_date
}

export default function ProjectHistoryTab({ projectId, project }: ProjectHistoryTabProps) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['projects', 'history', projectId],
    queryFn: () => projectsService.listHistory(projectId),
    enabled: projectId > 0,
  })
  const entries = data?.entries ?? []

  // ── Add form state ──
  const [showAdd, setShowAdd] = useState(false)
  const [addValue, setAddValue] = useState('')
  const [addPeriod, setAddPeriod] = useState('')
  const [addNotes, setAddNotes] = useState('')

  // ── Edit state ──
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editNotes, setEditNotes] = useState('')

  // Used periods set
  const usedPeriods = useMemo(() => {
    const set = new Set<string>()
    entries.forEach(e => { if (e.period_reference) set.add(e.period_reference) })
    return set
  }, [entries])

  // Period options from project frequency
  const periodOptions = useMemo(() =>
    buildPeriodOptions(
      project?.frequency || 'MONTHLY',
      project?.start_date?.slice?.(0, 10),
      project?.end_date?.slice?.(0, 10),
    ), [project?.frequency, project?.start_date, project?.end_date])

  // ── Mutations ──
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['projects', 'history', projectId] })
    qc.invalidateQueries({ queryKey: ['projects', projectId] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const createMut = useMutation({
    mutationFn: (payload: { value: number; period_reference: string; notes?: string }) =>
      projectsService.createHistory(projectId, payload),
    onSuccess: () => {
      toast.success('Registo adicionado.')
      setShowAdd(false); setAddValue(''); setAddPeriod(''); setAddNotes('')
      invalidate()
    },
    onError: () => toast.error('Erro ao adicionar registo.'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { value?: number; notes?: string } }) =>
      projectsService.updateHistory(id, payload),
    onSuccess: () => { toast.success('Registo actualizado.'); setEditingId(null); invalidate() },
    onError: () => toast.error('Erro ao actualizar registo.'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: number) => projectsService.deleteHistory(id),
    onSuccess: () => { toast.success('Registo eliminado.'); invalidate() },
    onError: () => toast.error('Erro ao eliminar registo.'),
  })

  // ── Chart data sorted by period ──
  const sorted = useMemo(
    () => [...entries].sort((a, b) => (a.period_reference || a.created_at || '').localeCompare(b.period_reference || b.created_at || '')),
    [entries],
  )
  const chartData = useMemo(
    () => sorted.map(e => ({
      period: e.period_reference ? periodLabel(e.period_reference) : fmtDateTime(e.created_at),
      valor: e.value ?? 0,
    })),
    [sorted],
  )

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner size="md" /></div>

  const canSubmitAdd = addValue !== '' && !isNaN(parseFloat(addValue)) && addPeriod !== '' && !usedPeriods.has(addPeriod)
  const startVal = project?.start_value ?? null
  const targetVal = project?.target_value ?? null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Evolution chart ── */}
      <Card variant="bordered" padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>
              {project?.goal_label || 'Evolução de Valor'}
            </p>
          </div>
          {startVal != null && targetVal != null && (
            <div style={{ display: 'flex', gap: 16, fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
              <span>Início: <strong style={{ color: 'var(--color-text)' }}>{startVal.toLocaleString('pt-PT')}</strong></span>
              <span>Meta: <strong style={{ color: 'var(--color-traffic-green)' }}>{targetVal.toLocaleString('pt-PT')}</strong></span>
            </div>
          )}
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.08)" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: 'var(--shadow-soft)', fontSize: 13 }}
                formatter={(value: any) => [Number(value).toLocaleString('pt-PT'), project?.goal_label || 'Valor']}
              />
              {targetVal != null && (
                <HoverReferenceLine y={targetVal} text={`Meta: ${targetVal.toLocaleString('pt-PT')}`} color="#16a34a" strokeDasharray="6 3" fontSize={11} fontWeight={700} />
              )}
              {startVal != null && (
                <HoverReferenceLine y={startVal} text={`Início: ${startVal.toLocaleString('pt-PT')}`} color="#999" strokeDasharray="4 4" fontSize={10} />
              )}
              <Bar dataKey="valor" radius={[6, 6, 0, 0]} barSize={32} fill="#e8670a" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-strong)', borderRadius: 12, color: 'var(--color-text-muted)' }}>
            <p style={{ fontSize: 13, fontWeight: 600 }}>Sem registos de valor. Adicione o primeiro registo abaixo.</p>
          </div>
        )}
      </Card>

      {/* ── Data table + add form ── */}
      <Card variant="bordered" padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>Registos</p>
            <Badge variant="default">{entries.length}</Badge>
          </div>
          {!showAdd && (
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus size={14} style={{ marginRight: 4 }} /> Adicionar
            </Button>
          )}
        </div>

        {/* ── Inline add form ── */}
        {showAdd && (
          <div style={{ padding: 14, borderRadius: 10, background: 'var(--color-surface-muted)', border: '1.5px solid var(--color-border)', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <select
                value={addPeriod}
                onChange={e => setAddPeriod(e.target.value)}
                style={{ width: 200, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              >
                <option value="">Período</option>
                {periodOptions.filter(o => !usedPeriods.has(o.value)).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="number" step="any" value={addValue}
                onChange={e => setAddValue(e.target.value)}
                placeholder="Valor"
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14, fontWeight: 700, outline: 'none' }}
              />
              <button
                onClick={() => createMut.mutate({ value: parseFloat(addValue) || 0, period_reference: addPeriod, notes: addNotes || undefined })}
                disabled={!canSubmitAdd || createMut.isPending}
                style={{ padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: !canSubmitAdd ? 'not-allowed' : 'pointer', background: !canSubmitAdd ? 'var(--color-border)' : 'var(--color-primary)', border: 'none', color: !canSubmitAdd ? 'var(--color-text-muted)' : '#fff', flexShrink: 0 }}
              >
                {createMut.isPending ? '…' : 'Guardar'}
              </button>
              <button
                onClick={() => { setShowAdd(false); setAddValue(''); setAddPeriod(''); setAddNotes('') }}
                style={{ padding: '8px 10px', borderRadius: 8, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
              ><X size={14} /></button>
            </div>
            <input
              type="text" value={addNotes} onChange={e => setAddNotes(e.target.value)}
              placeholder="Notas (opcional)"
              style={{ width: '100%', padding: '7px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* ── Table ── */}
        {entries.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '16px 0' }}>
            Sem registos. Clique em "Adicionar" para registar o primeiro valor.
          </p>
        ) : (
          <div style={{ borderRadius: 10, border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr auto', gap: 0, padding: '8px 14px', background: 'var(--color-bg-strong)', borderBottom: '1px solid var(--color-border)' }}>
              {['Período', 'Valor', 'Notas', 'Registado por', ''].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</span>
              ))}
            </div>
            {/* Rows */}
            {sorted.map((entry: ProjectHistoryEntry) => (
              <div key={entry.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr 1fr auto', gap: 0, padding: '10px 14px', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
                {editingId === entry.id ? (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                      {entry.period_reference ? periodLabel(entry.period_reference) : '—'}
                    </span>
                    <input type="number" step="any" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                      style={{ padding: '5px 8px', fontSize: 13, fontWeight: 700, border: '2px solid var(--color-primary)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', width: '90%' }}
                    />
                    <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                      style={{ padding: '5px 8px', fontSize: 12, border: '1.5px solid var(--color-border)', borderRadius: 6, background: 'var(--color-bg)', color: 'var(--color-text)', outline: 'none', width: '95%' }}
                    />
                    <span />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => updateMut.mutate({ id: entry.id, payload: { value: parseFloat(editValue) || 0, notes: editNotes || undefined } })}
                        style={{ padding: '3px 8px', borderRadius: 5, background: 'var(--color-primary)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                      ><Check size={10} /></button>
                      <button onClick={() => setEditingId(null)}
                        style={{ padding: '3px 8px', borderRadius: 5, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center' }}
                      ><X size={10} /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                      {entry.period_reference ? periodLabel(entry.period_reference) : '—'}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--color-primary)' }}>
                      {(entry.value ?? 0).toLocaleString('pt-PT')}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.notes || '—'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      {entry.creator?.name ?? '—'}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={() => { setEditingId(entry.id); setEditValue(String(entry.value ?? 0)); setEditNotes(entry.notes ?? '') }}
                        style={{ padding: '3px 8px', borderRadius: 5, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                      ><Pencil size={10} /></button>
                      <button
                        onClick={() => { if (window.confirm('Eliminar este registo?')) deleteMut.mutate(entry.id) }}
                        style={{ padding: '3px 8px', borderRadius: 5, background: 'none', border: '1px solid var(--color-traffic-red)', color: 'var(--color-traffic-red)', cursor: 'pointer', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}
                      ><Trash2 size={10} /></button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
