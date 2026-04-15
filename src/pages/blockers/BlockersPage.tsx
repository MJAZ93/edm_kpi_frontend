import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { blockersService } from '../../services/blockers.service'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import Tabs from '../../components/ui/Tabs'
import Select from '../../components/ui/Select'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Textarea from '../../components/ui/Textarea'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import BlockerCard from '../../components/domain/BlockerCard'
import type { BlockerStatus } from '../../types'

const STATUS_TABS = [
  { key: '', label: 'Todos' },
  { key: 'PENDING', label: 'Pendentes' },
  { key: 'APPROVED', label: 'Aprovados' },
  { key: 'REJECTED', label: 'Rejeitados' },
  { key: 'AUTO_APPROVED', label: 'Auto-Aprovados' },
]

const TYPE_OPTS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'LOGISTIC', label: 'Logístico' }, { value: 'FINANCIAL', label: 'Financeiro' },
  { value: 'TECHNICAL', label: 'Técnico' }, { value: 'LEGAL', label: 'Legal' },
]

export default function BlockersPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const [status, setStatus] = useState<BlockerStatus | ''>('')
  const [type, setType] = useState('')
  const [rejectId, setRejectId] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['blockers', { status, type }],
    queryFn: () => blockersService.list({ status: status || undefined, limit: 100 }),
  })

  const approve = useMutation({
    mutationFn: (id: number) => blockersService.approve(id),
    onSuccess: () => { toast.success('Aprovado.'); qc.invalidateQueries({ queryKey: ['blockers'] }) },
    onError: () => toast.error('Erro ao aprovar.'),
  })

  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => blockersService.reject(id, reason),
    onSuccess: () => { toast.success('Rejeitado.'); qc.invalidateQueries({ queryKey: ['blockers'] }); setRejectId(null) },
    onError: () => toast.error('Erro ao rejeitar.'),
  })

  const blockers = (data?.data ?? []).filter(b => !type || b.blocker_type === type)

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Constrangimentos"
        subtitle={`${data?.total ?? 0} constrangimentos registados`}
        badges={
          <Badge variant="warning" dot>
            {data?.data?.filter(b => b.status === 'PENDING').length ?? 0} pendentes
          </Badge>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Tabs tabs={STATUS_TABS} activeKey={status} onChange={k => setStatus(k as BlockerStatus | '')}>{() => null}</Tabs>
        <div style={{ width: 180 }}>
          <Select options={TYPE_OPTS} value={type} onChange={e => setType(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : blockers.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Sem constrangimentos para este filtro.</p>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {blockers.map(b => (
            <BlockerCard
              key={b.id}
              blockerType={b.blocker_type}
              description={b.description}
              status={b.status}
              slaDays={b.sla_days}
              rejectionReason={b.rejection_reason ?? undefined}
              onApprove={can('approve:blocker') && b.status === 'PENDING' ? () => approve.mutate(b.id) : undefined}
              onReject={can('approve:blocker') && b.status === 'PENDING' ? () => { setRejectId(b.id); setRejectReason('') } : undefined}
            />
          ))}
        </div>
      )}

      <Modal open={!!rejectId} onClose={() => setRejectId(null)} title="Rejeitar constrangimento" width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectId(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => rejectId && reject.mutate({ id: rejectId, reason: rejectReason })} loading={reject.isPending}>Rejeitar</Button>
          </>
        }
      >
        <Textarea label="Motivo da rejeição" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Indique o motivo…" />
      </Modal>
    </div>
  )
}
