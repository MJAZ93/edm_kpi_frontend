import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Shield, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { usersService } from '../../services/org.service'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import type { User } from '../../types'

const PAGE_SIZE = 20

const ROLE_TABS = [
  { key: '', label: 'Todos os papéis' },
  { key: 'ADMIN', label: 'Admin' },
  { key: 'CA', label: 'CA' },
  { key: 'PELOURO', label: 'Pelouro' },
  { key: 'DIRECAO', label: 'Direcção' },
  { key: 'DEPARTAMENTO', label: 'Departamento' },
]

const ROLE_CREATE_OPTS = [
  { value: 'CA', label: 'CA' },
  { value: 'PELOURO', label: 'Pelouro' },
  { value: 'DIRECAO', label: 'Direcção' },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
]

const ROLE_BADGE: Record<string, 'orange' | 'default' | 'muted' | 'warning'> = {
  ADMIN: 'orange',
  CA: 'orange',
  PELOURO: 'default',
  DIRECAO: 'default',
  DEPARTAMENTO: 'muted',
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | null>(null)
  const [selected, setSelected] = useState<User | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('CA')

  const { data, isLoading } = useQuery({
    queryKey: ['users', { roleFilter, page }],
    queryFn: () => usersService.list({ role: roleFilter || undefined, page: page - 1, limit: PAGE_SIZE }),
  })
  const items = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = data?.pages ?? 1

  const open = (mode: typeof modal, item?: User) => {
    setSelected(item ?? null)
    setName(item?.name ?? '')
    setEmail(item?.email ?? '')
    setPassword('')
    setRole(item?.role ?? 'CA')
    setModal(mode)
  }

  const createMut = useMutation({
    mutationFn: () => usersService.create({ name, email, password, role }),
    onSuccess: () => { toast.success('Utilizador criado.'); qc.invalidateQueries({ queryKey: ['users'] }); setModal(null) },
    onError: () => toast.error('Erro ao criar utilizador.'),
  })

  const updateMut = useMutation({
    mutationFn: () => usersService.update(selected!.id, { name, email, role }),
    onSuccess: () => { toast.success('Utilizador actualizado.'); qc.invalidateQueries({ queryKey: ['users'] }); setModal(null) },
    onError: () => toast.error('Erro ao actualizar.'),
  })

  const deleteMut = useMutation({
    mutationFn: () => usersService.remove(selected!.id),
    onSuccess: () => { toast.success('Utilizador removido.'); qc.invalidateQueries({ queryKey: ['users'] }); setModal(null) },
    onError: () => toast.error('Erro ao remover.'),
  })

  const isEdit = modal === 'edit'

  const pwdRules = useMemo(() => [
    { label: 'Mínimo 8 caracteres',          ok: password.length >= 8 },
    { label: 'Letra maiúscula',               ok: /[A-Z]/.test(password) },
    { label: 'Letra minúscula',               ok: /[a-z]/.test(password) },
    { label: 'Número',                        ok: /[0-9]/.test(password) },
    { label: 'Carácter especial (!@#$…)',     ok: /[^A-Za-z0-9]/.test(password) },
  ], [password])

  const pwdStrong = pwdRules.every(r => r.ok)

  return (
    <div>
      <PageHeader
        eyebrow="Administração"
        title="Utilizadores"
        subtitle={`${total} utilizadores`}
        actions={<Button variant="primary" icon={<Plus size={14} />} onClick={() => open('create')}>Novo Utilizador</Button>}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Tabs
          tabs={ROLE_TABS}
          activeKey={roleFilter}
          onChange={k => { setRoleFilter(k); setPage(1) }}
        >{() => null}</Tabs>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
              <Avatar name={item.name} size="md" />
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{item.name}</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.email}</p>
              </div>
              <Badge variant={ROLE_BADGE[item.role] ?? 'default'}>
                <Shield size={10} style={{ marginRight: 3 }} />{item.role}
              </Badge>
              <Button variant="secondary" size="sm" icon={<Edit size={13} />} onClick={() => open('edit', item)}>Editar</Button>
              <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => open('delete', item)}>Remover</Button>
            </div>
          ))}
          {!items.length && <p style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Nenhum utilizador encontrado.</p>}
        </div>
      )}

      {!isLoading && total > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 20 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.4 : 1, color: 'var(--color-text)' }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
            Página {page} de {totalPages} · {total} utilizadores
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontSize: 13, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.4 : 1, color: 'var(--color-text)' }}
          >
            Próxima →
          </button>
        </div>
      )}

      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={isEdit ? 'Editar Utilizador' : 'Novo Utilizador'}
        width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => isEdit ? updateMut.mutate() : createMut.mutate()}
              loading={createMut.isPending || updateMut.isPending}
              disabled={!isEdit && !pwdStrong}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nome completo" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João Silva" />
          <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@edm.co.mz" />
          {!isEdit && (
            <div>
              <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
              {password.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {pwdRules.map(rule => (
                    <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      {rule.ok
                        ? <Check size={12} color="var(--color-traffic-green)" />
                        : <X size={12} color="var(--color-traffic-red)" />}
                      <span style={{ color: rule.ok ? 'var(--color-traffic-green)' : 'var(--color-text-muted)' }}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <Select
            label="Papel"
            options={ROLE_CREATE_OPTS}
            value={role}
            onChange={e => setRole(e.target.value)}
          />
        </div>
      </Modal>

      <Modal
        open={modal === 'delete'}
        onClose={() => setModal(null)}
        title="Remover utilizador"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}>Remover</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--color-text)' }}>
          Tem a certeza que pretende remover o utilizador <b>{selected?.name}</b>? Esta acção não pode ser desfeita.
        </p>
      </Modal>
    </div>
  )
}
