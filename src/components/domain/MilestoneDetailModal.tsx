import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { History, Paperclip, User, Pencil, Check, X, MessageSquare, Target, MapPin, Calendar, TrendingUp, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { milestonesService } from '../../services/milestones.service'
import { periodLabel } from './ProgressModal'
import EntityFeedbackTab from './EntityFeedbackTab'
import type { Milestone, MilestoneProgressEvent } from '../../types'
import Modal from '../ui/Modal'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ProgressBar from '../ui/ProgressBar'
import Spinner from '../ui/Spinner'

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  BIANNUAL: 'Semestral',
  ANNUAL: 'Anual',
}

function fmtDate(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime())
    ? d
    : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTime(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime())
    ? d
    : date.toLocaleString('pt-MZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
}

function getTrafficLight(score: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (score >= 90) return 'GREEN'
  if (score >= 60) return 'YELLOW'
  return 'RED'
}

const TL_COLORS = {
  GREEN:  { bg: 'var(--color-traffic-green-bg)', text: 'var(--color-traffic-green)', border: 'rgba(22,163,74,0.25)' },
  YELLOW: { bg: 'var(--color-traffic-yellow-bg)', text: 'var(--color-traffic-yellow)', border: 'rgba(202,138,4,0.25)' },
  RED:    { bg: 'var(--color-traffic-red-bg)', text: 'var(--color-traffic-red)', border: 'rgba(220,38,38,0.25)' },
}

const ProgressChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.[0]) return null
  return (
    <div style={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-soft)' }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>+{payload[0].value?.toLocaleString('pt-PT')}</p>
    </div>
  )
}

interface MilestoneDetailModalProps {
  milestoneId: number | null
  open: boolean
  onClose: () => void
  fallbackMilestone?: Partial<Milestone> | null
  goalLabel?: string
  onUpdateProgress?: () => void
  onEdit?: () => void
  onFeedback?: () => void
  isReduction?: boolean
  taskStartDate?: string
  taskEndDate?: string
}

export default function MilestoneDetailModal({
  milestoneId,
  open,
  onClose,
  fallbackMilestone,
  goalLabel,
  onUpdateProgress,
  onEdit,
  onFeedback,
  isReduction,
  taskStartDate,
  taskEndDate,
}: MilestoneDetailModalProps) {
  const qc = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [msTab, setMsTab] = useState<'details' | 'feedback'>('details')

  const updateProgress = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { increment_value?: number; notes?: string } }) =>
      milestonesService.updateProgress(id, payload),
    onSuccess: () => {
      toast.success('Valor actualizado.')
      setEditingId(null)
      qc.invalidateQueries({ queryKey: ['milestone-progress', milestoneId] })
      qc.invalidateQueries({ queryKey: ['milestone-detail', milestoneId] })
      qc.invalidateQueries({ queryKey: ['indicadores'] })
    },
    onError: () => toast.error('Erro ao actualizar.'),
  })

  const { data: milestoneDetail, isLoading: isMilestoneDetailLoading } = useQuery({
    queryKey: ['milestone-detail', milestoneId],
    queryFn: () => milestonesService.get(milestoneId!),
    enabled: open && milestoneId !== null,
  })

  const { data: milestoneProgressData, isLoading: isMilestoneProgressLoading } = useQuery({
    queryKey: ['milestone-progress', milestoneId],
    queryFn: () => milestonesService.listProgress(milestoneId!),
    enabled: open && milestoneId !== null,
  })

  const selectedMilestone = useMemo(() => {
    const detail = milestoneDetail ?? fallbackMilestone ?? null
    if (!detail) return null
    // Merge scope_name from fallback if detail doesn't have it
    if (!detail.scope_name && fallbackMilestone?.scope_name) {
      return { ...detail, scope_name: fallbackMilestone.scope_name }
    }
    return detail
  }, [milestoneDetail, fallbackMilestone])
  const milestoneHistory = milestoneProgressData?.events ?? []

  // Compute projection
  const projection = useMemo(() => {
    if (!selectedMilestone) return null
    const planned = selectedMilestone.planned_value ?? 0
    const achieved = selectedMilestone.achieved_value ?? 0
    if (planned <= 0) return null

    const pct = Math.min(100, (achieved / planned) * 100)
    const tl = getTrafficLight(pct)

    // Days-based projection
    const createdAt = selectedMilestone.created_at ? new Date(selectedMilestone.created_at) : null
    const deadline = selectedMilestone.planned_date ? new Date(selectedMilestone.planned_date) : null
    const now = new Date()

    let daysElapsed = 0
    let daysTotal = 0
    let daysRemaining = 0
    let projectedFinal = 0
    let velocityPerDay = 0
    let willReach = false

    if (createdAt && deadline && !isNaN(createdAt.getTime()) && !isNaN(deadline.getTime())) {
      daysElapsed = Math.max(1, Math.floor((now.getTime() - createdAt.getTime()) / 86400000))
      daysTotal = Math.max(1, Math.floor((deadline.getTime() - createdAt.getTime()) / 86400000))
      daysRemaining = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 86400000))
      velocityPerDay = achieved / daysElapsed
      projectedFinal = achieved + (velocityPerDay * daysRemaining)
      willReach = projectedFinal >= planned
    }

    return { pct, tl, planned, achieved, daysElapsed, daysTotal, daysRemaining, projectedFinal, velocityPerDay, willReach }
  }, [selectedMilestone])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={selectedMilestone?.title ? `Indicador: ${selectedMilestone.title}` : 'Detalhes do Indicador'}
      width={720}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          {onUpdateProgress && (
            <Button variant="primary" size="sm" icon={<Target size={13} />} onClick={() => { onClose(); onUpdateProgress() }}>
              Actualizar Progresso
            </Button>
          )}
          {onEdit && (
            <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={() => { onClose(); onEdit() }}>
              Editar
            </Button>
          )}
          {onFeedback && (
            <Button variant="secondary" size="sm" icon={<MessageSquare size={13} />} onClick={() => { onClose(); onFeedback() }}>
              Feedback
            </Button>
          )}
          <div style={{ flex: 1 }} />
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      }
    >
      {(isMilestoneDetailLoading && !selectedMilestone) || isMilestoneProgressLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 36 }}>
          <Spinner size="md" />
        </div>
      ) : !selectedMilestone ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Não foi possível carregar o indicador.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ── Badges row ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Badge variant={selectedMilestone.status === 'DONE' ? 'success' : selectedMilestone.status === 'BLOCKED' ? 'danger' : 'warning'}>
              {selectedMilestone.status === 'DONE' ? 'Concluído' : selectedMilestone.status === 'BLOCKED' ? 'Bloqueado' : 'Pendente'}
            </Badge>
            {selectedMilestone.frequency && <Badge variant="default">{FREQ_LABEL[selectedMilestone.frequency] ?? selectedMilestone.frequency}</Badge>}
            {goalLabel && <Badge variant="orange">{goalLabel}</Badge>}
          </div>

          {/* ── Info cards row (Scope + Responsável + Prazo) ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {/* Scope / ASC */}
            {selectedMilestone.scope_type && (
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'var(--color-primary-soft)',
                border: '1px solid var(--color-primary)20',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--color-primary)18',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <MapPin size={15} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedMilestone.scope_type === 'ASC' ? 'ASC' : selectedMilestone.scope_type === 'REGIAO' ? 'Região' : selectedMilestone.scope_type === 'NACIONAL' ? 'Nacional' : 'Âmbito'}
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                    {selectedMilestone.scope_name || `#${selectedMilestone.scope_id}`}
                  </p>
                </div>
              </div>
            )}

            {/* Responsável */}
            {selectedMilestone.assignee?.name && (
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'var(--color-surface-muted)',
                border: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--color-primary)', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, flexShrink: 0,
                }}>
                  {selectedMilestone.assignee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Responsável</p>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>{selectedMilestone.assignee.name}</p>
                </div>
              </div>
            )}

            {/* Prazo */}
            <div style={{
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--color-surface-muted)',
              border: '1px solid var(--color-border)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--color-surface-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Calendar size={15} style={{ color: 'var(--color-text-muted)' }} />
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Prazo</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>{fmtDate(selectedMilestone.planned_date)}</p>
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-border)' }}>
            {([
              { key: 'details' as const, label: 'Detalhes', icon: <History size={13} /> },
              { key: 'feedback' as const, label: 'Feedback', icon: <MessageSquare size={13} /> },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setMsTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '8px 16px', fontSize: 13, fontWeight: msTab === t.key ? 700 : 500,
                  color: msTab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: msTab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom: -2,
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {msTab === 'feedback' && milestoneId ? (
            <EntityFeedbackTab targetType="MILESTONE" targetId={milestoneId} />
          ) : (
          <>
          {/* ── Visual Progress + Projection ── */}
          {projection && (
            <Card variant="bordered" padding={18}>
              {/* Big numbers row */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Realizado</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-primary)', lineHeight: 1 }}>
                    {projection.achieved.toLocaleString('pt-PT')}
                  </p>
                </div>
                <div style={{ flex: 1, minWidth: 100 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Meta</p>
                  <p style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
                    {projection.planned.toLocaleString('pt-PT')}
                  </p>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <div style={{
                    padding: '6px 16px', borderRadius: 20,
                    background: TL_COLORS[projection.tl].bg,
                    border: `1.5px solid ${TL_COLORS[projection.tl].border}`,
                  }}>
                    <p style={{ fontSize: 20, fontWeight: 900, color: TL_COLORS[projection.tl].text, lineHeight: 1 }}>
                      {projection.pct.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Visual progress track */}
              <div style={{ position: 'relative', marginBottom: 8 }}>
                {/* Track background */}
                <div style={{ height: 12, borderRadius: 6, background: 'var(--color-border)', overflow: 'hidden', position: 'relative' }}>
                  {/* Achieved bar */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${Math.max(0, Math.min(100, projection.pct))}%`,
                    borderRadius: 6,
                    background: `linear-gradient(90deg, ${TL_COLORS[projection.tl].text}, ${TL_COLORS[projection.tl].text}dd)`,
                    transition: 'width .5s ease',
                  }} />
                  {/* Projected marker (if we have projection data) */}
                  {projection.daysTotal > 0 && projection.projectedFinal > 0 && projection.pct < 100 && (
                    <div style={{
                      position: 'absolute', top: 0, height: '100%',
                      left: `${Math.max(0, Math.min(100, projection.pct))}%`,
                      width: `${Math.max(0, Math.min(100 - projection.pct, ((projection.projectedFinal - projection.achieved) / projection.planned) * 100))}%`,
                      background: `repeating-linear-gradient(90deg, ${TL_COLORS[projection.tl].text}30, ${TL_COLORS[projection.tl].text}30 4px, transparent 4px, transparent 8px)`,
                      borderRadius: '0 6px 6px 0',
                      transition: 'all .5s ease',
                    }} />
                  )}
                </div>
                {/* Labels */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)' }}>0</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)' }}>{projection.planned.toLocaleString('pt-PT')}</span>
                </div>
              </div>

              {/* Projection stats — compact cards */}
              {projection.daysTotal > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--color-surface-muted)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                      <TrendingUp size={11} style={{ color: 'var(--color-text-muted)' }} />
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vel./dia</p>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text)' }}>
                      {projection.velocityPerDay.toFixed(1)}
                    </p>
                  </div>
                  <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--color-surface-muted)', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                      <Clock size={11} style={{ color: 'var(--color-text-muted)' }} />
                      <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dias rest.</p>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text)' }}>
                      {projection.daysRemaining}
                    </p>
                  </div>
                  <div style={{
                    padding: '10px 12px', borderRadius: 10, textAlign: 'center',
                    background: projection.willReach ? 'var(--color-traffic-green-bg)' : 'var(--color-traffic-red-bg)',
                    border: `1px solid ${projection.willReach ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
                      <Target size={11} style={{ color: projection.willReach ? 'var(--color-traffic-green)' : 'var(--color-traffic-red)' }} />
                      <p style={{ fontSize: 9, fontWeight: 700, color: projection.willReach ? 'var(--color-traffic-green)' : 'var(--color-traffic-red)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Projecção</p>
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 900, color: projection.willReach ? 'var(--color-traffic-green)' : 'var(--color-traffic-red)' }}>
                      {Math.round(projection.projectedFinal).toLocaleString('pt-PT')}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Notes + attachment */}
          {(selectedMilestone.notes || selectedMilestone.photo_url) && (
            <Card variant="bordered" padding={14}>
              {selectedMilestone.notes && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>Notas</p>
                  <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>{selectedMilestone.notes}</p>
                </div>
              )}
              {selectedMilestone.photo_url && (
                <div style={{ marginTop: selectedMilestone.notes ? 12 : 0 }}>
                  <a
                    href={selectedMilestone.photo_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none', fontSize: 13 }}
                  >
                    <Paperclip size={14} />
                    Ver anexo actual
                  </a>
                </div>
              )}
            </Card>
          )}

          {/* ── Histórico de actualizações ── */}
          <Card variant="bordered" padding={18}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <History size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>Histórico de actualizações</p>
              <Badge variant="default">{milestoneHistory.length}</Badge>
            </div>

            {milestoneHistory.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart
                    data={[...milestoneHistory]
                      .sort((a, b) => {
                        const ka = a.period_reference || a.created_at || ''
                        const kb = b.period_reference || b.created_at || ''
                        return ka.localeCompare(kb)
                      })
                      .map(e => ({
                        date: e.period_reference ? periodLabel(e.period_reference) : fmtDate(e.created_at),
                        value: e.increment_value ?? 0,
                      }))}
                    margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.08)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ProgressChartTooltip />} cursor={{ fill: 'rgba(232,103,10,0.06)' }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24} fill="#e8670a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {milestoneHistory.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Este indicador ainda não tem actualizações registadas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {milestoneHistory.map((event: MilestoneProgressEvent) => (
                  <div key={event.id} style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)' }}>
                    {editingId === event.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>Valor:</label>
                          <input type="number" step="any" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus
                            style={{ flex: 1, padding: '6px 10px', fontSize: 14, fontWeight: 700, border: '2px solid var(--color-primary)', borderRadius: 8, background: 'var(--color-surface-strong)', color: 'var(--color-text)', outline: 'none' }}
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>Notas:</label>
                          <input type="text" value={editNotes} onChange={e => setEditNotes(e.target.value)}
                            style={{ flex: 1, padding: '6px 10px', fontSize: 13, border: '1.5px solid var(--color-border-strong)', borderRadius: 8, background: 'var(--color-surface-strong)', color: 'var(--color-text)', outline: 'none' }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingId(null)} style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <X size={12} /> Cancelar
                          </button>
                          <button
                            onClick={() => updateProgress.mutate({ id: event.id, payload: { increment_value: parseFloat(editValue) || 0, notes: editNotes } })}
                            style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'var(--color-primary)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}
                          >
                            <Check size={12} /> Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                          <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                            +{(event.increment_value ?? 0).toLocaleString('pt-PT')}{goalLabel ? ` ${goalLabel}` : ''}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>
                              {event.period_reference ? periodLabel(event.period_reference) : fmtDate(event.created_at)}
                            </span>
                            <button
                              onClick={() => { setEditingId(event.id); setEditValue(String(event.increment_value ?? 0)); setEditNotes(event.notes ?? '') }}
                              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}
                              title="Editar valor"
                            >
                              <Pencil size={10} /> Editar
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: event.notes ? 4 : 0 }}>
                          {event.user?.name ?? 'Utilizador'} registou esta actualização{event.created_at ? ` em ${fmtDateTime(event.created_at)}` : ''}
                        </p>
                        {event.notes && (
                          <p style={{ fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>
                            {event.notes}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
          </>
          )}
        </div>
      )}
    </Modal>
  )
}
