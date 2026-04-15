import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { auditService } from '../../services/audit.service'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import DatePicker from '../../components/ui/DatePicker'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'

const ENTITY_OPTS = [
  { value: '', label: 'Todas as entidades' },
  { value: 'PROJECT', label: 'Pilar Estratégico' },
  { value: 'TASK', label: 'Acção' },
  { value: 'MILESTONE', label: 'Indicador' },
  { value: 'BLOCKER', label: 'Constrangimento' },
  { value: 'USER', label: 'Utilizador' },
  { value: 'PELOURO', label: 'Pelouro' },
  { value: 'DIRECAO', label: 'Direcção' },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
  { value: 'REGIAO', label: 'Região' },
  { value: 'ASC', label: 'ASC' },
]

const ACTION_BADGE: Record<string, 'success' | 'warning' | 'danger'> = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
}

const ACTION_LABEL: Record<string, string> = {
  CREATE: 'Criado',
  UPDATE: 'Actualizado',
  DELETE: 'Eliminado',
}

function DiffView({ old_data, new_data }: { old_data?: Record<string, unknown>; new_data?: Record<string, unknown> }) {
  if (!old_data && !new_data) return null

  const keys = new Set([...Object.keys(old_data ?? {}), ...Object.keys(new_data ?? {})])
  const changed = [...keys].filter(k => JSON.stringify((old_data ?? {})[k]) !== JSON.stringify((new_data ?? {})[k]))

  if (changed.length === 0) return <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Sem alterações detectadas.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {changed.map(key => (
        <div key={key} style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 8px', background: 'var(--color-bg)', borderRadius: 4 }}>
          <span style={{ fontWeight: 700, color: 'var(--color-text-soft)', minWidth: 120, flexShrink: 0 }}>{key}</span>
          {old_data && (old_data)[key] !== undefined && (
            <span style={{ color: 'var(--color-traffic-red)', textDecoration: 'line-through', wordBreak: 'break-all' }}>
              {JSON.stringify((old_data)[key])}
            </span>
          )}
          {new_data && (new_data)[key] !== undefined && (
            <span style={{ color: 'var(--color-traffic-green)', wordBreak: 'break-all' }}>
              {JSON.stringify((new_data)[key])}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

const PAGE_SIZE = 20

export default function AuditPage() {
  const [entityType, setEntityType] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { entityType, fromDate, toDate, page }],
    queryFn: () => auditService.list({
      entity_type: entityType || undefined,
      from_date: fromDate || undefined,
      to_date: toDate || undefined,
      limit: PAGE_SIZE,
      page,
    }),
  })
  const items = data?.data ?? []
  const totalPages = data ? Math.ceil((data.total ?? 0) / PAGE_SIZE) : 1

  const toggle = (id: number) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'agora mesmo'
    if (mins < 60) return `há ${mins} min`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `há ${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 30) return `há ${days}d`
    return new Date(dateStr).toLocaleDateString('pt-MZ')
  }

  return (
    <div>
      <PageHeader
        eyebrow="Sistema"
        title="Auditoria"
        subtitle={`${data?.total ?? 0} entradas de auditoria`}
      />

      <Card variant="elevated" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Select label="Tipo de entidade" options={ENTITY_OPTS} value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1) }} />
          <DatePicker label="Data de início" value={fromDate} onChange={val => { setFromDate(val); setPage(1) }} />
          <DatePicker label="Data de fim" value={toDate} onChange={val => { setToDate(val); setPage(1) }} />
        </div>
      </Card>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Nenhum registo de auditoria encontrado.</p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {items.map(entry => (
              <div
                key={entry.id}
                style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', overflow: 'hidden' }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
                  onClick={() => toggle(entry.id)}
                >
                  {expanded[entry.id] ? <ChevronDown size={14} color="var(--color-text-muted)" /> : <ChevronRight size={14} color="var(--color-text-muted)" />}
                  <Badge variant={ACTION_BADGE[entry.action] ?? 'default'}>{ACTION_LABEL[entry.action] ?? entry.action}</Badge>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', minWidth: 100 }}>{entry.entity_type}</span>
                  <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>#{entry.entity_id}</span>
                  <div style={{ flex: 1 }} />
                  {entry.changer && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar name={entry.changer.name} size="sm" />
                      <span style={{ fontSize: 12, color: 'var(--color-text-soft)' }}>{entry.changer.name}</span>
                    </div>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 12 }}>{timeAgo(entry.created_at)}</span>
                </div>
                {expanded[entry.id] && (
                  <div style={{ padding: '0 16px 12px 42px' }}>
                    <DiffView old_data={entry.old_data} new_data={entry.new_data} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, color: 'var(--color-text)' }}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, color: 'var(--color-text)' }}
              >
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
