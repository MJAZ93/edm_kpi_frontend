import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { authService } from '../../services/auth.service'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: () => authService.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: () => toast.error('Erro ao enviar email. Tente novamente.'),
  })

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
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--color-traffic-green)', marginBottom: 16 }} />
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)', marginBottom: 8 }}>Email enviado!</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-soft)', marginBottom: 24 }}>
                Se <b>{email}</b> estiver registado, receberá instruções para redefinir a password.
              </p>
              <Link to="/login">
                <Button variant="secondary" icon={<ArrowLeft size={14} />} style={{ width: '100%' }}>
                  Voltar ao login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>Recuperar password</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
                Introduza o seu email institucional e enviaremos instruções de recuperação.
              </p>
              <form onSubmit={e => { e.preventDefault(); if (email) mutate() }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <Input label="Email" type="email" placeholder="utilizador@edm.co.mz" value={email} onChange={e => setEmail(e.target.value)} icon={<Mail size={14} />} />
                <Button type="submit" variant="primary" size="lg" loading={isPending} style={{ width: '100%' }}>
                  Enviar instruções
                </Button>
              </form>
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <Link to="/login" style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
                  <ArrowLeft size={13} /> Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
