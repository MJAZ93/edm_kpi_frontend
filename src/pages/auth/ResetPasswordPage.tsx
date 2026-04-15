import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Zap, Lock, Eye, EyeOff } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { authService } from '../../services/auth.service'

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => authService.resetPassword(token!, password),
    onSuccess: () => {
      toast.success('Password alterada com sucesso.')
      navigate('/login')
    },
    onError: (err: any) => {
      const code = err?.response?.data?.error
      setError(code === 'invalid_or_expired_token' ? 'Link inválido ou expirado. Solicite um novo.' : 'Erro ao redefinir password.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('A password deve ter pelo menos 8 caracteres.'); return }
    if (password !== confirm) { setError('As passwords não coincidem.'); return }
    setError('')
    mutate()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-deep) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(232,103,10,0.35)' }}>
            <Zap size={24} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)' }}>DPRP KPIs</h1>
        </div>
        <div style={{ background: 'var(--color-surface-strong)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-strong)', border: '1px solid var(--color-border)', padding: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>Nova password</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>Escolha uma nova password para a sua conta.</p>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ position: 'relative' }}>
              <Input label="Nova password" type={show ? 'text' : 'password'} placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} icon={<Lock size={14} />} />
              <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: 12, bottom: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <Input label="Confirmar password" type={show ? 'text' : 'password'} placeholder="Repita a password" value={confirm} onChange={e => setConfirm(e.target.value)} icon={<Lock size={14} />} error={error} />
            <Button type="submit" variant="primary" size="lg" loading={isPending} style={{ width: '100%' }}>
              Redefinir password
            </Button>
          </form>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Voltar ao login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
