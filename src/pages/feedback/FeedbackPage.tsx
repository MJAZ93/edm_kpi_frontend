import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, ChevronLeft, ChevronRight, Plus, Reply, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { feedbackService } from '../../services/feedback.service'
import { usersService, orgService } from '../../services/org.service'
import { useAuthStore } from '../../stores/auth.store'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import Modal from '../../components/ui/Modal'
import SearchableSelect from '../../components/ui/SearchableSelect'
import type { Feedback, FeedbackCategory, FeedbackTargetType, User } from '../../types'

const PAGE_SIZE = 15

const TARGET_LABELS: Record<string, string> = {
  DEPARTAMENTO: 'Departamento',
  DIRECAO: 'Direcção',
  PELOURO: 'Pelouro',
  USER: 'Utilizador',
  PROJECT: 'Pilar Estratégico',
  TASK: 'Acção',
  MILESTONE: 'Indicador',
}

const CATEGORY_CONFIG: Record<FeedbackCategory, { label: string; variant: 'muted' | 'info' | 'warning' | 'success' }> = {
  GENERAL: { label: 'Geral', variant: 'muted' },
  PERFORMANCE: { label: 'Desempenho', variant: 'info' },
  IMPROVEMENT: { label: 'Melhoria', variant: 'warning' },
  RECOGNITION: { label: 'Reconhecimento', variant: 'success' },
}

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

function InitialsAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--color-primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800, letterSpacing: '-0.02em',
    }}>
      {initials}
    </div>
  )
}

// ── Feedback Card ────────────────────────────────────────────────────────────

interface FeedbackCardProps {
  item: Feedback
  tab: 'received' | 'sent'
  onMarkRead: (id: number) => void
  onReply: (id: number, message: string) => void
  onDelete: (id: number) => void
  replyLoading: boolean
}

function FeedbackCard({ item, tab, onMarkRead, onReply, onDelete, replyLoading }: FeedbackCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')

  const person = tab === 'received' ? item.sender : item.receiver
  const personLabel = tab === 'received' ? 'De' : 'Para'
  const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.GENERAL
  const isLong = item.message.length > 200

  const handleReply = () => {
    if (!replyText.trim()) return
    onReply(item.id, replyText.trim())
    setReplyText('')
    setShowReply(false)
  }

  // Mark as read when viewing received unread feedback
  React.useEffect(() => {
    if (tab === 'received' && !item.is_read) {
      onMarkRead(item.id)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      background: item.is_read || tab === 'sent' ? 'var(--color-surface)' : 'var(--color-surface-muted)',
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${!item.is_read && tab === 'received' ? 'var(--color-primary)' : 'var(--color-border)'}`,
      boxShadow: 'var(--shadow-soft)',
      position: 'relative',
      padding: '16px 20px',
    }}>
      {/* Unread dot */}
      {!item.is_read && tab === 'received' && (
        <div style={{
          position: 'absolute', top: 18, left: -4,
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--color-primary)',
        }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <InitialsAvatar name={person?.name ?? '?'} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {personLabel}
            </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
              {person?.name ?? 'Utilizador'}
            </span>
            {person?.role && (
              <Badge variant="muted">{person.role}</Badge>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
            <Badge variant={cat.variant}>{cat.label}</Badge>
            {item.target_type && item.target_name && (
              <Badge variant="info">{TARGET_LABELS[item.target_type] ?? item.target_type}: {item.target_name}</Badge>
            )}
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{timeAgo(item.created_at)}</span>
          </div>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          title="Eliminar"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', display: 'flex', padding: 4, borderRadius: 6,
            transition: 'color 150ms',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-danger, #dc3545)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Message */}
      <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6, fontWeight: 500 }}>
        {isLong && !expanded ? (
          <>
            {item.message.slice(0, 200)}...
            <button
              onClick={() => setExpanded(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-primary)', fontWeight: 700, fontSize: 13,
                marginLeft: 4,
              }}
            >
              Ver mais
            </button>
          </>
        ) : (
          <>
            {item.message}
            {isLong && (
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-primary)', fontWeight: 700, fontSize: 13,
                  marginLeft: 4,
                }}
              >
                Ver menos
              </button>
            )}
          </>
        )}
      </div>

      {/* Replies thread */}
      {item.replies && item.replies.length > 0 && (
        <div style={{
          marginTop: 14, paddingTop: 12,
          borderTop: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {item.replies.map(reply => (
            <div key={reply.id} style={{
              display: 'flex', gap: 10, paddingLeft: 16,
              borderLeft: '2px solid var(--color-border)',
            }}>
              <InitialsAvatar name={reply.sender?.name ?? '?'} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    {reply.sender?.name ?? 'Utilizador'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{timeAgo(reply.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
                  {reply.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply action */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {!showReply ? (
          <button
            onClick={() => setShowReply(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-primary)', fontWeight: 700, fontSize: 13,
              padding: 0,
            }}
          >
            <Reply size={14} />
            Responder
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Escreva a sua resposta..."
              rows={2}
              style={{
                flex: 1, resize: 'vertical', fontSize: 13, fontWeight: 500,
                padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
                color: 'var(--color-text)',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Button
                size="sm"
                icon={<Send size={12} />}
                onClick={handleReply}
                loading={replyLoading}
                disabled={!replyText.trim()}
              >
                Enviar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowReply(false); setReplyText('') }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── New Feedback Modal ───────────────────────────────────────────────────────

interface NewFeedbackModalProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: { receiver_id: number; message: string; category: string; target_type?: string; target_id?: number }) => void
  loading: boolean
}

function NewFeedbackModal({ open, onClose, onSubmit, loading }: NewFeedbackModalProps) {
  const [receiverId, setReceiverId] = useState<number | ''>('')
  const [category, setCategory] = useState<FeedbackCategory>('GENERAL')
  const [message, setMessage] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [targetType, setTargetType] = useState<FeedbackTargetType | ''>('')
  const [targetId, setTargetId] = useState<number | ''>('')
  const currentUser = useAuthStore(s => s.user)

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all-for-feedback'],
    queryFn: () => usersService.list({ limit: 500 }),
    enabled: open,
  })

  const { data: deptsData } = useQuery({
    queryKey: ['departamentos'],
    queryFn: () => orgService.listDepartamentos(),
    enabled: open && targetType === 'DEPARTAMENTO',
  })
  const { data: dirsData } = useQuery({
    queryKey: ['direcoes'],
    queryFn: () => orgService.listDirecoes(),
    enabled: open && targetType === 'DIRECAO',
  })
  const { data: pelData } = useQuery({
    queryKey: ['pelouros'],
    queryFn: () => orgService.listPelouros(),
    enabled: open && targetType === 'PELOURO',
  })
  const users = (usersData?.data ?? []).filter((u: User) => u.id !== currentUser?.id)
  const filteredUsers = userSearch
    ? users.filter((u: User) => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
    : users

  const targetEntityOptions: { value: string; label: string }[] =
    targetType === 'DEPARTAMENTO' ? (deptsData?.data ?? []).map((d: { id: number; name: string }) => ({ value: String(d.id), label: d.name })) :
    targetType === 'DIRECAO' ? (dirsData?.data ?? []).map((d: { id: number; name: string }) => ({ value: String(d.id), label: d.name })) :
    targetType === 'PELOURO' ? (pelData?.data ?? []).map((d: { id: number; name: string }) => ({ value: String(d.id), label: d.name })) :
    targetType === 'USER' ? users.map((u: User) => ({ value: String(u.id), label: u.name })) :
    []

  const categoryOptions = (Object.keys(CATEGORY_CONFIG) as FeedbackCategory[]).map(key => ({
    value: key,
    label: CATEGORY_CONFIG[key].label,
  }))

  const targetTypeOptions: { value: string; label: string }[] = [
    { value: 'DEPARTAMENTO', label: 'Departamento' },
    { value: 'DIRECAO', label: 'Direcção' },
    { value: 'PELOURO', label: 'Pelouro' },
    { value: 'USER', label: 'Utilizador' },
  ]

  const isValid = receiverId && message.trim() && targetType && targetId

  const handleSubmit = () => {
    if (!isValid) return
    onSubmit({
      receiver_id: receiverId as number,
      message: message.trim(),
      category,
      target_type: targetType || undefined,
      target_id: targetId ? Number(targetId) : undefined,
    })
  }

  const handleClose = () => {
    setReceiverId('')
    setCategory('GENERAL')
    setMessage('')
    setUserSearch('')
    setTargetType('')
    setTargetId('')
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', fontSize: 14, fontWeight: 500,
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)',
    background: 'var(--color-surface)', color: 'var(--color-text)',
    fontFamily: 'inherit',
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Novo Feedback"
      width={560}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
          <Button
            icon={<Send size={14} />}
            onClick={handleSubmit}
            loading={loading}
            disabled={!isValid}
          >
            Enviar Feedback
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* User selector */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            Destinatário
          </label>
          <input
            type="text"
            value={userSearch}
            onChange={e => { setUserSearch(e.target.value); setReceiverId('') }}
            placeholder="Pesquisar utilizador..."
            style={inputStyle}
          />
          {userSearch && !receiverId && (
            <div style={{
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)', maxHeight: 180, overflowY: 'auto', marginTop: 4,
            }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Nenhum utilizador encontrado
                </div>
              ) : (
                filteredUsers.slice(0, 20).map((u: User) => (
                  <button
                    key={u.id}
                    onClick={() => { setReceiverId(u.id); setUserSearch(u.name) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 14px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500,
                      color: 'var(--color-text)', transition: 'background 100ms',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <InitialsAvatar name={u.name} size={28} />
                    <div>
                      <div style={{ fontWeight: 700 }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{u.email} — {u.role}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
          {receiverId && (
            <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600, marginTop: 4 }}>
              Utilizador selecionado
            </div>
          )}
        </div>

        {/* Category */}
        <SearchableSelect
          label="Categoria"
          options={categoryOptions}
          value={category}
          onChange={v => setCategory(v as FeedbackCategory)}
          placeholder="Seleccionar categoria…"
        />

        {/* Target (required) */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            Associar a
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <SearchableSelect
              options={targetTypeOptions}
              value={targetType}
              onChange={v => { setTargetType(v as FeedbackTargetType); setTargetId('') }}
              placeholder="Tipo de entidade…"
            />
            <SearchableSelect
              options={targetEntityOptions}
              value={targetId ? String(targetId) : ''}
              onChange={v => setTargetId(v ? Number(v) : '')}
              placeholder={targetType ? 'Seleccionar…' : 'Escolha o tipo primeiro'}
              disabled={!targetType}
            />
          </div>
        </div>

        {/* Message */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            Mensagem
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Escreva o seu feedback..."
            rows={5}
            style={{
              ...inputStyle,
              resize: 'vertical',
            }}
          />
        </div>
      </div>
    </Modal>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'received', label: 'Recebidos' },
  { key: 'sent', label: 'Enviados' },
]

export default function FeedbackPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('received')
  const [page, setPage] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)

  const handleTabChange = (key: string) => {
    setTab(key)
    setPage(0)
  }

  // Unread count for badge
  const { data: unreadData } = useQuery({
    queryKey: ['feedback', 'unread-count'],
    queryFn: () => feedbackService.unreadCount(),
  })
  const unreadCount = unreadData?.count ?? 0

  // Feedback list
  const { data, isLoading } = useQuery({
    queryKey: ['feedback', tab, page],
    queryFn: () =>
      tab === 'received'
        ? feedbackService.listReceived({ page, limit: PAGE_SIZE })
        : feedbackService.listSent({ page, limit: PAGE_SIZE }),
  })
  const items = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: { receiver_id: number; message: string; category: string; target_type?: string; target_id?: number }) =>
      feedbackService.create(payload),
    onSuccess: () => {
      toast.success('Feedback enviado com sucesso.')
      setModalOpen(false)
      qc.invalidateQueries({ queryKey: ['feedback'] })
    },
    onError: () => toast.error('Erro ao enviar feedback.'),
  })

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      feedbackService.reply(id, { message }),
    onSuccess: () => {
      toast.success('Resposta enviada.')
      qc.invalidateQueries({ queryKey: ['feedback'] })
    },
    onError: () => toast.error('Erro ao enviar resposta.'),
  })

  const markReadMutation = useMutation({
    mutationFn: (id: number) => feedbackService.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => feedbackService.remove(id),
    onSuccess: () => {
      toast.success('Feedback eliminado.')
      qc.invalidateQueries({ queryKey: ['feedback'] })
    },
    onError: () => toast.error('Erro ao eliminar.'),
  })

  // Dynamic tabs with unread badge
  const tabsWithBadge = TABS.map(t =>
    t.key === 'received' && unreadCount > 0
      ? { ...t, label: `Recebidos (${unreadCount})` }
      : t
  )

  return (
    <div>
      <PageHeader
        eyebrow="Comunicação"
        title="Feedback"
        subtitle={`${total} feedback${total !== 1 ? 's' : ''} no total`}
        badges={unreadCount > 0 ? <Badge variant="warning" dot>{unreadCount} não lido{unreadCount > 1 ? 's' : ''}</Badge> : undefined}
        actions={
          <Button icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
            Novo Feedback
          </Button>
        }
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Tabs tabs={tabsWithBadge} activeKey={tab} onChange={handleTabChange}>{() => null}</Tabs>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : items.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: 60 }}>
          <MessageSquare size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
            {tab === 'received' ? 'Nenhum feedback recebido.' : 'Nenhum feedback enviado.'}
          </p>
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item: Feedback) => (
              <FeedbackCard
                key={item.id}
                item={item}
                tab={tab as 'received' | 'sent'}
                onMarkRead={id => markReadMutation.mutate(id)}
                onReply={(id, message) => replyMutation.mutate({ id, message })}
                onDelete={id => deleteMutation.mutate(id)}
                replyLoading={replyMutation.isPending}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              marginTop: 24, padding: '14px 0',
              borderTop: '1px solid var(--color-border)',
            }}>
              <button
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  color: page === 0 ? 'var(--color-text-muted)' : 'var(--color-primary)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  opacity: page === 0 ? 0.5 : 1,
                  transition: 'all 150ms',
                }}
              >
                <ChevronLeft size={14} />
                Anterior
              </button>

              <span style={{
                fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)',
                padding: '0 8px',
              }}>
                Página {page + 1} de {totalPages}
              </span>

              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600,
                  color: page >= totalPages - 1 ? 'var(--color-text-muted)' : 'var(--color-primary)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages - 1 ? 0.5 : 1,
                  transition: 'all 150ms',
                }}
              >
                Seguinte
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}

      {/* New Feedback Modal */}
      <NewFeedbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={data => createMutation.mutate(data)}
        loading={createMutation.isPending}
      />
    </div>
  )
}
