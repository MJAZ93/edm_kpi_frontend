import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersService } from '../../services/org.service'
import { useAuthStore } from '../../stores/auth.store'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

const ROLE_BADGE: Record<string, 'orange' | 'default' | 'muted' | 'warning'> = {
  CA: 'orange',
  PELOURO: 'default',
  DIRECAO: 'default',
  DEPARTAMENTO: 'muted',
  TECNICO: 'muted',
}

export default function ProfilePage() {
  const qc = useQueryClient()
  const { user: storeUser, setAuth, token } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')

  const { data: user, isLoading } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: usersService.me,
  })

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  const updateProfile = useMutation({
    mutationFn: () => usersService.update(user!.id, { name, email }),
    onSuccess: (updated) => {
      toast.success('Perfil actualizado.')
      qc.invalidateQueries({ queryKey: ['users', 'me'] })
      if (token) setAuth(token, updated)
    },
    onError: () => toast.error('Erro ao actualizar perfil.'),
  })

  const changePassword = useMutation({
    mutationFn: () => {
      if (newPwd !== confirmPwd) throw new Error('Passwords não coincidem.')
      if (newPwd.length < 8) throw new Error('Password demasiado curta.')
      return api.put('/private/auth/change-password', { current_password: currentPwd, new_password: newPwd })
    },
    onSuccess: () => {
      toast.success('Password alterada com sucesso.')
      setCurrentPwd('')
      setNewPwd('')
      setConfirmPwd('')
    },
    onError: (err: any) => toast.error(err.message ?? 'Erro ao alterar password.'),
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>

  return (
    <div>
      <PageHeader eyebrow="Conta" title="O meu perfil" subtitle="Gerir informações da conta" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, maxWidth: 900 }}>
        {/* Avatar card */}
        <Card variant="elevated">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 8 }}>
            <Avatar name={user?.name ?? ''} size="lg" />
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text)' }}>{user?.name}</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 8 }}>{user?.email}</p>
              <Badge variant={ROLE_BADGE[user?.role ?? ''] ?? 'default'}>{user?.role}</Badge>
            </div>
            <div style={{ width: '100%', borderTop: '1px solid var(--color-border)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--color-text-muted)' }}>ID</span>
                <span style={{ color: 'var(--color-text-soft)', fontWeight: 600 }}>#{user?.id}</span>
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Profile info */}
          <Card variant="elevated">
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 16 }}>Informações pessoais</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Nome completo" value={name} onChange={e => setName(e.target.value)} />
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="primary"
                  icon={<Save size={14} />}
                  onClick={() => updateProfile.mutate()}
                  loading={updateProfile.isPending}
                >
                  Guardar alterações
                </Button>
              </div>
            </div>
          </Card>

          {/* Password change */}
          <Card variant="elevated">
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Lock size={14} /> Alterar password
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input label="Password actual" type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} />
              <Input label="Nova password" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} />
              <Input label="Confirmar nova password" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} />
              {newPwd && confirmPwd && newPwd !== confirmPwd && (
                <p style={{ fontSize: 12, color: 'var(--color-traffic-red)' }}>As passwords não coincidem.</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="secondary"
                  icon={<Lock size={14} />}
                  onClick={() => changePassword.mutate()}
                  loading={changePassword.isPending}
                  disabled={!currentPwd || !newPwd || !confirmPwd || newPwd !== confirmPwd}
                >
                  Alterar password
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
