import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { notificationsService } from '../../services/notifications.service'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'

const TABS = [
  { key: '', label: 'Todas' },
  { key: 'false', label: 'Não lidas' },
  { key: 'true', label: 'Lidas' },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora mesmo'
  if (mins < 60) return `há ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  return `há ${days}d`
}

export default function NotificationsPage() {
  const qc = useQueryClient()
  const [readFilter, setReadFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', { is_read: readFilter }],
    queryFn: () => notificationsService.list({
      is_read: readFilter === '' ? undefined : readFilter === 'true',
      limit: 50,
    }),
  })
  const items = data?.data ?? []
  const unreadCount = items.filter(n => !n.is_read).length

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
    onError: () => toast.error('Erro.'),
  })

  const markAll = useMutation({
    mutationFn: notificationsService.markAllRead,
    onSuccess: () => { toast.success('Todas marcadas como lidas.'); qc.invalidateQueries({ queryKey: ['notifications'] }) },
    onError: () => toast.error('Erro.'),
  })

  return (
    <div>
      <PageHeader
        eyebrow="Sistema"
        title="Notificações"
        subtitle={`${data?.total ?? 0} notificações`}
        badges={unreadCount > 0 ? <Badge variant="warning" dot>{unreadCount} não lidas</Badge> : undefined}
        actions={
          unreadCount > 0 && (
            <Button variant="secondary" icon={<CheckCheck size={14} />} onClick={() => markAll.mutate()} loading={markAll.isPending}>
              Marcar todas como lidas
            </Button>
          )
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Tabs tabs={TABS} activeKey={readFilter} onChange={setReadFilter}>{() => null}</Tabs>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <Bell size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>Sem notificações.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px',
                background: item.is_read ? 'var(--color-surface)' : 'var(--color-surface-muted)',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${item.is_read ? 'var(--color-border)' : 'var(--color-primary)'}`,
                boxShadow: 'var(--shadow-soft)',
                position: 'relative',
              }}
            >
              {!item.is_read && (
                <div style={{ position: 'absolute', top: 16, left: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)' }} />
              )}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: item.is_read ? 500 : 700, color: 'var(--color-text)', marginBottom: 3 }}>
                  {item.message}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.type && (
                    <Badge variant="muted">{item.type.replace(/_/g, ' ')}</Badge>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{timeAgo(item.created_at)}</span>
                </div>
              </div>
              {!item.is_read && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Check size={12} />}
                  onClick={() => markRead.mutate(item.id)}
                  loading={markRead.isPending}
                >
                  Lida
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
