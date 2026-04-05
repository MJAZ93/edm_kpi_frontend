import React from 'react'
import { Truck, DollarSign, Wrench, Scale, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'

type BlockerType = 'LOGISTIC' | 'FINANCIAL' | 'TECHNICAL' | 'LEGAL'
type BlockerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED'

interface BlockerCardProps {
  blockerType: BlockerType
  description: string
  status: BlockerStatus
  slaDays: number
  daysRemaining?: number
  rejectionReason?: string
  onApprove?: () => void
  onReject?: () => void
}

const typeConfig: Record<BlockerType, { icon: React.ReactNode; label: string; color: string }> = {
  LOGISTIC:  { icon: <Truck size={16} />,       label: 'Logístico',  color: '#4a6fa5' },
  FINANCIAL: { icon: <DollarSign size={16} />,  label: 'Financeiro', color: 'var(--color-traffic-yellow)' },
  TECHNICAL: { icon: <Wrench size={16} />,      label: 'Técnico',    color: 'var(--color-green)' },
  LEGAL:     { icon: <Scale size={16} />,       label: 'Legal',      color: 'var(--color-text-soft)' },
}

const statusConfig: Record<BlockerStatus, { variant: 'warning'|'success'|'danger'|'muted'; label: string }> = {
  PENDING:       { variant: 'warning', label: 'Pendente' },
  APPROVED:      { variant: 'success', label: 'Aprovado' },
  REJECTED:      { variant: 'danger',  label: 'Rejeitado' },
  AUTO_APPROVED: { variant: 'muted',   label: 'Auto-Aprovado' },
}

export default function BlockerCard({ blockerType, description, status, slaDays, daysRemaining, rejectionReason, onApprove, onReject }: BlockerCardProps) {
  const { icon, label: typeLabel, color } = typeConfig[blockerType]
  const { variant, label: statusLabel } = statusConfig[status]

  return (
    <Card variant="bordered" padding={18} style={{ borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
            {icon}
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{typeLabel}</p>
          </div>
        </div>
        <Badge variant={variant} dot>{statusLabel}</Badge>
      </div>

      <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5, marginBottom: 12 }}>{description}</p>

      {rejectionReason && (
        <div style={{ background: 'var(--color-traffic-red-bg)', borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
          <p style={{ fontSize: 12, color: 'var(--color-traffic-red)', fontWeight: 600 }}>Motivo: {rejectionReason}</p>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-muted)' }}>
          <Clock size={12} />
          <span>SLA: {slaDays}d{daysRemaining !== undefined ? ` • ${daysRemaining}d restantes` : ''}</span>
        </div>
        {status === 'PENDING' && (
          <div style={{ display: 'flex', gap: 8 }}>
            {onApprove && <Button variant="secondary" size="sm" icon={<CheckCircle size={13} />} onClick={onApprove}>Aprovar</Button>}
            {onReject  && <Button variant="danger"    size="sm" icon={<XCircle size={13} />}    onClick={onReject}>Rejeitar</Button>}
          </div>
        )}
      </div>
    </Card>
  )
}
