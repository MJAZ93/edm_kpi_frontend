import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, Paperclip, User } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { milestonesService } from '../../services/milestones.service'
import { periodLabel } from './ProgressModal'
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
}

export default function MilestoneDetailModal({
  milestoneId,
  open,
  onClose,
  fallbackMilestone,
  goalLabel,
}: MilestoneDetailModalProps) {
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

  const selectedMilestone = milestoneDetail ?? fallbackMilestone ?? null
  const milestoneHistory = milestoneProgressData?.events ?? []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={selectedMilestone?.title ? `Milestone: ${selectedMilestone.title}` : 'Detalhes do Milestone'}
      width={720}
      footer={<Button variant="secondary" onClick={onClose}>Fechar</Button>}
    >
      {(isMilestoneDetailLoading && !selectedMilestone) || isMilestoneProgressLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 36 }}>
          <Spinner size="md" />
        </div>
      ) : !selectedMilestone ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Não foi possível carregar o milestone.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Badge variant={selectedMilestone.status === 'DONE' ? 'success' : selectedMilestone.status === 'BLOCKED' ? 'danger' : 'warning'}>
              {selectedMilestone.status === 'DONE' ? 'Concluído' : selectedMilestone.status === 'BLOCKED' ? 'Bloqueado' : 'Pendente'}
            </Badge>
            {selectedMilestone.frequency && <Badge variant="default">{FREQ_LABEL[selectedMilestone.frequency] ?? selectedMilestone.frequency}</Badge>}
            {selectedMilestone.assignee?.name && <Badge variant="default"><User size={11} style={{ marginRight: 4 }} />{selectedMilestone.assignee.name}</Badge>}
          </div>

          <Card variant="bordered" padding={18}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Planeado</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>{(selectedMilestone.planned_value ?? 0).toLocaleString('pt-PT')}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Realizado</p>
                <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>{(selectedMilestone.achieved_value ?? 0).toLocaleString('pt-PT')}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Prazo</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{fmtDate(selectedMilestone.planned_date)}</p>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Última actualização</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>{fmtDateTime(selectedMilestone.updated_at)}</p>
              </div>
            </div>
            <div style={{ marginTop: 14 }}>
              <ProgressBar
                value={selectedMilestone.planned_value ? Math.min(100, ((selectedMilestone.achieved_value ?? 0) / selectedMilestone.planned_value) * 100) : 0}
                variant="auto"
                showLabel
              />
            </div>
            {selectedMilestone.notes && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Notas do milestone</p>
                <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>{selectedMilestone.notes}</p>
              </div>
            )}
            {selectedMilestone.photo_url && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--color-border)' }}>
                <a
                  href={selectedMilestone.photo_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontWeight: 700, textDecoration: 'none' }}
                >
                  <Paperclip size={14} />
                  Ver anexo actual
                </a>
              </div>
            )}
          </Card>

          <Card variant="bordered" padding={18}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <History size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>Histórico de actualizações</p>
              <Badge variant="default">{milestoneHistory.length}</Badge>
            </div>

            {milestoneHistory.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={[...milestoneHistory].reverse().map(e => ({
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
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Este milestone ainda não tem actualizações registadas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {milestoneHistory.map((event: MilestoneProgressEvent) => (
                  <div key={event.id} style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-muted)', border: '1px solid var(--color-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>
                          +{(event.increment_value ?? 0).toLocaleString('pt-PT')}{goalLabel ? ` ${goalLabel}` : ''}
                        </p>
                        {event.period_reference && (
                          <Badge variant="default">
                            {periodLabel(event.period_reference)}
                          </Badge>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700 }}>
                        {fmtDateTime(event.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: event.notes ? 6 : 0 }}>
                      {event.user?.name ?? 'Utilizador'} registou esta actualização
                    </p>
                    {event.notes && (
                      <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5 }}>
                        {event.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </Modal>
  )
}
