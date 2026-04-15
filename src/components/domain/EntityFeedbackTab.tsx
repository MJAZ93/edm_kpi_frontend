import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, Reply, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { feedbackService } from '../../services/feedback.service'
import { useAuthStore } from '../../stores/auth.store'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Spinner from '../ui/Spinner'
import type { Feedback, FeedbackCategory } from '../../types'

const PAGE_SIZE = 10

const CATEGORY_CONFIG: Record<string, { label: string; variant: 'muted' | 'info' | 'warning' | 'success' }> = {
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

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function InitialsAvatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--color-primary)', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 800,
    }}>
      {initials}
    </div>
  )
}

interface FeedbackItemProps {
  item: Feedback
  onReply: (id: number, message: string) => void
  replyLoading: boolean
}

function FeedbackItem({ item, onReply, replyLoading }: FeedbackItemProps) {
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const currentUser = useAuthStore(s => s.user)

  const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.GENERAL

  const handleReply = () => {
    if (!replyText.trim()) return
    onReply(item.id, replyText.trim())
    setReplyText('')
    setShowReply(false)
  }

  return (
    <div style={{
      background: 'var(--color-surface)',
      borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--color-border)',
      padding: '14px 18px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <InitialsAvatar name={item.sender?.name ?? '?'} size={32} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              {item.sender?.name ?? 'Utilizador'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>→</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
              {item.receiver?.name ?? 'Utilizador'}
            </span>
            <Badge variant={cat.variant}>{cat.label}</Badge>
          </div>
          <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            {fmtDate(item.created_at)} ({timeAgo(item.created_at)})
          </span>
        </div>
      </div>

      {/* Message */}
      <div style={{ fontSize: 14, color: 'var(--color-text)', lineHeight: 1.6, fontWeight: 500, marginBottom: 8 }}>
        {item.message}
      </div>

      {/* Replies */}
      {item.replies && item.replies.length > 0 && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: '1px solid var(--color-border)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {item.replies.map(reply => (
            <div key={reply.id} style={{
              display: 'flex', gap: 8, paddingLeft: 14,
              borderLeft: '2px solid var(--color-border)',
            }}>
              <InitialsAvatar name={reply.sender?.name ?? '?'} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                    {reply.sender?.name ?? 'Utilizador'}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>
                    {fmtDate(reply.created_at)}
                  </span>
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
      {currentUser && (
        <div style={{ marginTop: 10 }}>
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-primary)', fontWeight: 700, fontSize: 12,
                padding: 0,
              }}
            >
              <Reply size={13} />
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
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
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
      )}
    </div>
  )
}

// ── Main Component ──────────────────────────────────────────────────────────

interface EntityFeedbackTabProps {
  targetType: 'PROJECT' | 'TASK' | 'MILESTONE'
  targetId: number
}

export default function EntityFeedbackTab({ targetType, targetId }: EntityFeedbackTabProps) {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['feedback', 'by-target', targetType, targetId, page],
    queryFn: () => feedbackService.listByTarget(targetType, targetId, { page, limit: PAGE_SIZE }),
    enabled: !!targetId,
  })

  const items = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const replyMutation = useMutation({
    mutationFn: ({ id, message }: { id: number; message: string }) =>
      feedbackService.reply(id, { message }),
    onSuccess: () => {
      toast.success('Resposta enviada.')
      qc.invalidateQueries({ queryKey: ['feedback', 'by-target', targetType, targetId] })
    },
    onError: () => toast.error('Erro ao enviar resposta.'),
  })

  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner size="md" /></div>
  }

  if (items.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: 40 }}>
        <MessageSquare size={28} style={{ color: 'var(--color-text-muted)', margin: '0 auto 10px' }} />
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
          Nenhum feedback associado.
        </p>
      </Card>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item: Feedback) => (
          <FeedbackItem
            key={item.id}
            item={item}
            onReply={(id, message) => replyMutation.mutate({ id, message })}
            replyLoading={replyMutation.isPending}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          marginTop: 20, padding: '12px 0',
          borderTop: '1px solid var(--color-border)',
        }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              color: page <= 1 ? 'var(--color-text-muted)' : 'var(--color-primary)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            <ChevronLeft size={13} /> Anterior
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              color: page >= totalPages ? 'var(--color-text-muted)' : 'var(--color-primary)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            Seguinte <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
