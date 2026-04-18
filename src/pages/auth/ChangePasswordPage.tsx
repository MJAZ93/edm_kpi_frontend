import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../stores/auth.store'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { user, clearForcePasswordChange } = useAuthStore()
  const isForced = user?.force_password_change === true

  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => authService.changePassword(currentPwd, newPwd),
    onSuccess: () => {
      clearForcePasswordChange()
      toast.success('Password alterada com sucesso.')
      navigate('/dashboard', { replace: true })
    },
    onError: (err: any) => {
      const code = err?.response?.data?.error
      if (code === 'wrong_password') {
        setError('Password actual incorrecta.')
      } else {
        setError(err?.response?.data?.message ?? 'Erro ao alterar password.')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPwd.length < 8) { setError('A nova password deve ter pelo menos 8 caracteres.'); return }
    if (newPwd !== confirmPwd) { setError('As passwords não coincidem.'); return }
    if (!currentPwd) { setError('Introduza a password actual.'); return }
    setError('')
    mutate()
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 30%, rgba(232,103,10,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(15,118,110,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(232,103,10,0.35)' }}>
            <img src="/logo.png" alt="DPRP KPIs" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>DPRP KPIs</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Losses Action Plan</p>
        </div>

        <div style={{ background: 'var(--color-surface-strong)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-strong)', border: '1px solid var(--color-border)', padding: 36 }}>
          {/* Forced-change banner */}
          {isForced && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px',
              background: 'rgba(232,103,10,0.08)', border: '1px solid rgba(232,103,10,0.25)',
              borderRadius: 10, marginBottom: 24,
            }}>
              <ShieldAlert size={18} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 2 }}>
                  Primeiro acesso — altere a password
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-soft)', lineHeight: 1.5 }}>
                  Por segurança, deve alterar a password temporária antes de continuar. Use a password que recebeu por email como password actual.
                </p>
              </div>
            </div>
          )}

          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>
            {isForced ? 'Definir nova password' : 'Alterar password'}
          </h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
            {isForced
              ? 'Escolha uma password segura para a sua conta.'
              : 'Introduza a password actual e escolha uma nova.'}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ position: 'relative' }}>
              <Input
                label="Password actual"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={currentPwd}
                onChange={e => setCurrentPwd(e.target.value)}
                icon={<Lock size={14} />}
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 12, bottom: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <Input
              label="Nova password"
              type={showPwd ? 'text' : 'password'}
              placeholder="Mínimo 8 caracteres"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              icon={<Lock size={14} />}
              autoComplete="new-password"
            />

            <Input
              label="Confirmar nova password"
              type={showPwd ? 'text' : 'password'}
              placeholder="Repita a nova password"
              value={confirmPwd}
              onChange={e => setConfirmPwd(e.target.value)}
              icon={<Lock size={14} />}
              autoComplete="new-password"
              error={error || undefined}
            />

            {/* Password strength hint */}
            {newPwd.length > 0 && newPwd.length < 8 && (
              <p style={{ fontSize: 12, color: 'var(--color-traffic-yellow)', marginTop: -8 }}>
                Password demasiado curta — mínimo 8 caracteres.
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" loading={isPending} style={{ width: '100%', marginTop: 4 }}>
              {isPending ? 'A guardar…' : isForced ? 'Definir password e entrar' : 'Alterar password'}
            </Button>
          </form>

          {/* Skip not allowed when forced; show back link otherwise */}
          {!isForced && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={() => navigate(-1)}
                style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--color-text-muted)' }}>
          DPRP KPIs © {new Date().getFullYear()} — Acesso restrito
        </p>
      </div>
    </div>
  )
}
