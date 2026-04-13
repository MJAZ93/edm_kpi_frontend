import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { authService } from '../../services/auth.service'
import { geoService } from '../../services/geo.service'
import { orgService } from '../../services/org.service'
import { useAuthStore } from '../../stores/auth.store'

export default function LoginPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setAuth = useAuthStore(s => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [preloading, setPreloading] = useState(false)

  const { mutate, isPending } = useMutation({
    mutationFn: () => authService.login(email, password),
    onSuccess: async ({ token, user }) => {
      setAuth(token, user)
      setPreloading(true)

      // Prefetch all geo & org data (light + polygons) — cached in IndexedDB for 24h
      try {
        await Promise.all([
          qc.fetchQuery({ queryKey: ['geo', 'ascs'],              queryFn: () => geoService.listAscs(),                            staleTime: Infinity }),
          qc.fetchQuery({ queryKey: ['geo', 'regioes'],           queryFn: () => geoService.listRegioes(),                         staleTime: Infinity }),
          qc.fetchQuery({ queryKey: ['departamentos'],             queryFn: () => orgService.listDepartamentos(),                   staleTime: Infinity }),
          qc.fetchQuery({ queryKey: ['direcoes'],                  queryFn: () => orgService.listDirecoes(),                        staleTime: Infinity }),
          qc.fetchQuery({ queryKey: ['geo', 'ascs', 'polygon'],   queryFn: () => geoService.listAscs({ includePolygon: true }),    staleTime: Infinity }),
          qc.fetchQuery({ queryKey: ['geo', 'regioes', 'polygon'],queryFn: () => geoService.listRegioes({ includePolygon: true }), staleTime: Infinity }),
        ])
      } catch {
        // Don't block login if prefetch fails — AppShell will retry
      }

      setPreloading(false)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.response?.data?.error
      if (msg === 'invalid_credentials') {
        setErrors({ password: 'Email ou password incorrectos' })
      } else {
        toast.error('Erro ao iniciar sessão. Tente novamente.')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: typeof errors = {}
    if (!email) errs.email = 'Campo obrigatório'
    if (!password) errs.password = 'Campo obrigatório'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    mutate()
  }

  // ── Preloading overlay ──────────────────────────────────────────────────
  if (preloading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 20,
      }}>
        <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 30%, rgba(232,103,10,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(15,118,110,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(232,103,10,0.35)' }}>
          <img src="/logo.png" alt="DPRP KPIs" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <Spinner size="lg" />
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', position: 'relative' }}>A preparar o ambiente…</p>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', position: 'relative' }}>A carregar dados geográficos e organizacionais</p>
      </div>
    )
  }

  // ── Login form ──────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      {/* Background pattern */}
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 30%, rgba(232,103,10,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(15,118,110,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, overflow: 'hidden', margin: '0 auto 14px', boxShadow: '0 8px 24px rgba(232,103,10,0.35)' }}>
            <img src="/logo.png" alt="DPRP KPIs" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>DPRP KPIs</h1>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 500 }}>Losses Action Plan</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--color-surface-strong)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-strong)', border: '1px solid var(--color-border)', padding: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6 }}>Iniciar sessão</h2>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 28 }}>Use o seu email institucional</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Input
              label="Email"
              type="email"
              placeholder="utilizador@edm.co.mz"
              value={email}
              onChange={e => setEmail(e.target.value)}
              error={errors.email}
              icon={<Mail size={14} />}
              autoComplete="email"
            />

            <div style={{ position: 'relative' }}>
              <Input
                label="Password"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                error={errors.password}
                icon={<Lock size={14} />}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 12, bottom: errors.password ? 30 : 11, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <div style={{ textAlign: 'right', marginTop: -8 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600 }}>
                Esqueci a password
              </Link>
            </div>

            <Button type="submit" variant="primary" size="lg" loading={isPending} style={{ width: '100%', marginTop: 4 }}>
              {isPending ? 'A entrar…' : 'Entrar'}
            </Button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: 'var(--color-text-muted)' }}>
          DPRP KPIs © {new Date().getFullYear()} — Acesso restrito
        </p>
      </div>
    </div>
  )
}
