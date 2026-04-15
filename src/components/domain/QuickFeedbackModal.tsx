import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { feedbackService } from '../../services/feedback.service'
import { usersService } from '../../services/org.service'
import { useAuthStore } from '../../stores/auth.store'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import SearchableSelect from '../ui/SearchableSelect'
import type { FeedbackCategory, User } from '../../types'

const CATEGORY_OPTIONS = [
  { value: 'GENERAL', label: 'Geral' },
  { value: 'PERFORMANCE', label: 'Desempenho' },
  { value: 'IMPROVEMENT', label: 'Melhoria' },
  { value: 'RECOGNITION', label: 'Reconhecimento' },
]

interface QuickFeedbackModalProps {
  open: boolean
  onClose: () => void
  targetType: 'PROJECT' | 'TASK' | 'MILESTONE'
  targetId: number
  targetName: string
  /** If provided, pre-selects the receiver (e.g. the assignee / owner) */
  defaultReceiverId?: number
  defaultReceiverName?: string
}

export default function QuickFeedbackModal({
  open, onClose, targetType, targetId, targetName,
  defaultReceiverId, defaultReceiverName,
}: QuickFeedbackModalProps) {
  const qc = useQueryClient()
  const currentUser = useAuthStore(s => s.user)
  const [receiverId, setReceiverId] = useState<number | ''>(defaultReceiverId ?? '')
  const [receiverSearch, setReceiverSearch] = useState(defaultReceiverName ?? '')
  const [category, setCategory] = useState<FeedbackCategory>('GENERAL')
  const [message, setMessage] = useState('')

  // Reset when modal opens with new defaults
  React.useEffect(() => {
    if (open) {
      setReceiverId(defaultReceiverId ?? '')
      setReceiverSearch(defaultReceiverName ?? '')
      setCategory('GENERAL')
      setMessage('')
    }
  }, [open, defaultReceiverId, defaultReceiverName])

  const { data: usersData } = useQuery({
    queryKey: ['users', 'all-for-feedback'],
    queryFn: () => usersService.list({ limit: 500 }),
    enabled: open,
  })

  const users = (usersData?.data ?? []).filter((u: User) => u.id !== currentUser?.id)
  const filteredUsers = receiverSearch
    ? users.filter((u: User) => u.name.toLowerCase().includes(receiverSearch.toLowerCase()) || u.email.toLowerCase().includes(receiverSearch.toLowerCase()))
    : users

  const createMutation = useMutation({
    mutationFn: (payload: { receiver_id: number; message: string; category: string; target_type: string; target_id: number }) =>
      feedbackService.create(payload),
    onSuccess: () => {
      toast.success('Feedback enviado com sucesso.')
      qc.invalidateQueries({ queryKey: ['feedback'] })
      onClose()
    },
    onError: () => toast.error('Erro ao enviar feedback.'),
  })

  const TARGET_LABEL: Record<string, string> = {
    PROJECT: 'Pilar Estratégico',
    TASK: 'Acção',
    MILESTONE: 'Indicador',
  }

  const isValid = receiverId && message.trim()

  const handleSubmit = () => {
    if (!isValid) return
    createMutation.mutate({
      receiver_id: receiverId as number,
      message: message.trim(),
      category,
      target_type: targetType,
      target_id: targetId,
    })
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
      onClose={onClose}
      title="Pedir Feedback"
      width={500}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button
            icon={<Send size={14} />}
            onClick={handleSubmit}
            loading={createMutation.isPending}
            disabled={!isValid}
          >
            Enviar
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Context badge */}
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--color-surface-muted)',
          border: '1px solid var(--color-border)',
          fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
        }}>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
            {TARGET_LABEL[targetType]}:
          </span>{' '}
          {targetName}
        </div>

        {/* Receiver */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            Destinatário
          </label>
          <input
            type="text"
            value={receiverSearch}
            onChange={e => { setReceiverSearch(e.target.value); setReceiverId('') }}
            placeholder="Pesquisar utilizador..."
            style={inputStyle}
          />
          {receiverSearch && !receiverId && (
            <div style={{
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)', maxHeight: 160, overflowY: 'auto', marginTop: 4,
            }}>
              {filteredUsers.length === 0 ? (
                <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  Nenhum utilizador encontrado
                </div>
              ) : (
                filteredUsers.slice(0, 15).map((u: User) => (
                  <button
                    key={u.id}
                    onClick={() => { setReceiverId(u.id); setReceiverSearch(u.name) }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 14px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500,
                      color: 'var(--color-text)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-muted)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div>
                      <span style={{ fontWeight: 700 }}>{u.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 6 }}>{u.role}</span>
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
          options={CATEGORY_OPTIONS}
          value={category}
          onChange={v => setCategory(v as FeedbackCategory)}
          placeholder="Seleccionar categoria…"
        />

        {/* Message */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            Mensagem
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Ex: Porque é que este indicador está atrasado?"
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>
      </div>
    </Modal>
  )
}
