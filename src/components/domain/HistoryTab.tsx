import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, ArrowUp, ArrowDown, Plus, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { auditService } from '../../services/audit.service'
import type { AuditEntry } from '../../types'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'

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

function fmtDate(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: 'short' })
}

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Criação',
  UPDATE: 'Actualização',
  UPDATE_PROGRESS: 'Progresso',
  DELETE: 'Eliminação',
}

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'success',
  UPDATE: 'warning',
  UPDATE_PROGRESS: 'info',
  DELETE: 'danger',
}

const ACTION_ICON: Record<string, React.ReactNode> = {
  CREATE: <Plus size={12} />,
  UPDATE: <ArrowUp size={12} />,
  UPDATE_PROGRESS: <ArrowUp size={12} />,
  DELETE: <Trash2 size={12} />,
}

/** Fields to display in the change details */
const FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  status: 'Estado',
  start_date: 'Data início',
  end_date: 'Data fim',
  current_value: 'Valor actual',
  target_value: 'Meta',
  start_value: 'Valor inicial',
  planned_value: 'Valor planeado',
  achieved_value: 'Valor realizado',
  weight: 'Peso',
  traffic_light: 'Semáforo',
  aggregation_type: 'Tipo de agregação',
  frequency: 'Frequência',
  notes: 'Notas',
  owner_type: 'Tipo proprietário',
  owner_id: 'Proprietário',
}

/** Extract a numeric "value" from an audit entry for the chart */
function extractValue(entry: AuditEntry): number | null {
  const data = entry.new_data
  if (!data) return null
  // Try common value fields in priority order
  for (const key of ['current_value', 'achieved_value', 'target_value', 'planned_value']) {
    if (data[key] !== undefined && data[key] !== null && typeof data[key] === 'number') {
      return data[key] as number
    }
  }
  return null
}

/** Get meaningful changes between old and new data */
function getChanges(entry: AuditEntry): { field: string; from?: string; to?: string }[] {
  if (entry.action === 'CREATE' || entry.action === 'DELETE') return []
  const oldData = entry.old_data ?? {}
  const newData = entry.new_data ?? {}
  const changes: { field: string; from?: string; to?: string }[] = []

  const trackedFields = Object.keys(FIELD_LABELS)
  for (const field of trackedFields) {
    const oldVal = oldData[field]
    const newVal = newData[field]
    if (newVal !== undefined && JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: FIELD_LABELS[field] || field,
        from: oldVal !== undefined && oldVal !== null ? String(oldVal) : undefined,
        to: newVal !== undefined && newVal !== null ? String(newVal) : undefined,
      })
    }
  }
  return changes
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.[0]) return null
  return (
    <div style={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '10px 14px', boxShadow: 'var(--shadow-soft)' }}>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-primary)' }}>{payload[0].value?.toLocaleString('pt-PT')}</p>
    </div>
  )
}

interface HistoryTabProps {
  entityType: string
  entityId: number
  valueLabel?: string
}

export default function HistoryTab({ entityType, entityId, valueLabel = 'Valor' }: HistoryTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['audit-history', entityType, entityId],
    queryFn: () => auditService.list({ entity_type: entityType, entity_id: entityId, limit: 100 }),
    enabled: entityId > 0,
  })

  const entries = data?.data ?? []

  // Build chart data from entries that have a numeric value
  const chartData = entries
    .filter(e => extractValue(e) !== null)
    .reverse()
    .map(e => ({
      date: fmtDate(e.created_at),
      value: extractValue(e)!,
      action: e.action,
    }))

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Bar Chart */}
      {chartData.length > 1 && (
        <Card variant="bordered" padding={20}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 16 }}>
            Evolução de {valueLabel}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.08)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(232,103,10,0.06)' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={28} fill="#e8670a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Timeline */}
      <Card variant="bordered" padding={20}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <History size={16} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)' }}>Registo de alterações</p>
          <Badge variant="default">{entries.length}</Badge>
        </div>

        {entries.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem histórico de alterações registado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {entries.map((entry, idx) => {
              const changes = getChanges(entry)
              const isLast = idx === entries.length - 1
              return (
                <div key={entry.id} style={{ display: 'flex', gap: 14 }}>
                  {/* Timeline line + dot */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: entry.action === 'CREATE' ? 'var(--color-success)' :
                        entry.action === 'DELETE' ? 'var(--color-danger)' : 'var(--color-primary)',
                      border: '2px solid var(--color-surface)',
                      boxShadow: '0 0 0 2px ' + (entry.action === 'CREATE' ? 'var(--color-success)' :
                        entry.action === 'DELETE' ? 'var(--color-danger)' : 'var(--color-primary)'),
                    }} />
                    {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--color-border)', minHeight: 20 }} />}
                  </div>

                  {/* Content */}
                  <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Badge variant={ACTION_COLOR[entry.action] as any ?? 'default'}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {ACTION_ICON[entry.action]}
                          {ACTION_LABEL[entry.action] ?? entry.action}
                        </span>
                      </Badge>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {fmtDateTime(entry.created_at)}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600, marginBottom: changes.length > 0 ? 6 : 0 }}>
                      {entry.changer?.name ?? 'Sistema'}
                    </p>

                    {changes.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        {changes.map((ch, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', gap: 6, alignItems: 'baseline', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700 }}>{ch.field}:</span>
                            {ch.from && (
                              <>
                                <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{ch.from}</span>
                                <ArrowDown size={10} style={{ transform: 'rotate(-90deg)', opacity: 0.5 }} />
                              </>
                            )}
                            <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{ch.to ?? '—'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
