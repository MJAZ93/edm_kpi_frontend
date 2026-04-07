import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Users, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { orgService, usersService } from '../../services/org.service'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import UserCombobox from '../../components/ui/UserCombobox'

type EntityType = 'pelouro' | 'direcao' | 'departamento'

interface Props { type: EntityType }

const CONFIG = {
  pelouro:      { title: 'Pelouros',      eyebrow: 'Organização' },
  direcao:      { title: 'Direcções',     eyebrow: 'Organização' },
  departamento: { title: 'Departamentos', eyebrow: 'Organização' },
}

function useEntityData(type: EntityType) {
  const pelouros    = useQuery({ queryKey: ['pelouros'],     queryFn: orgService.listPelouros,     enabled: type === 'pelouro' })
  const direcoes    = useQuery({ queryKey: ['direcoes'],     queryFn: orgService.listDirecoes,     enabled: type === 'direcao' })
  const departamentos = useQuery({ queryKey: ['departamentos'], queryFn: orgService.listDepartamentos, enabled: type === 'departamento' })
  if (type === 'pelouro')      return { data: pelouros.data?.data ?? [], isLoading: pelouros.isLoading }
  if (type === 'direcao')      return { data: direcoes.data?.data ?? [], isLoading: direcoes.isLoading }
  return { data: departamentos.data?.data ?? [], isLoading: departamentos.isLoading }
}

export default function OrgEntityPage({ type }: Props) {
  const { can } = useAuth()
  const qc = useQueryClient()
  const cfg = CONFIG[type]
  const { data: items, isLoading } = useEntityData(type)

  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | 'members' | null>(null)
  const [selected, setSelected] = useState<any>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [respId, setRespId] = useState<number | null>(null)
  const [parentId, setParentId] = useState('')
  const [addUserId, setAddUserId] = useState<number | null>(null)

  const { data: pelouros } = useQuery({ queryKey: ['pelouros'], queryFn: orgService.listPelouros, enabled: type === 'direcao' })
  const { data: direcoes } = useQuery({ queryKey: ['direcoes'], queryFn: orgService.listDirecoes, enabled: type === 'departamento' })

  // Pre-fetch users so UserCombobox has warm cache when modal opens
  useQuery({ queryKey: ['users', { limit: 200 }], queryFn: () => usersService.list({ limit: 200 }) })

  // Members modal: fetch full dept detail (includes users[]) when open
  const { data: deptDetail, isLoading: loadingMembers } = useQuery({
    queryKey: ['departamento', selected?.id],
    queryFn: () => orgService.getDepartamento(selected!.id),
    enabled: modal === 'members' && !!selected?.id,
  })
  const members: any[] = deptDetail?.users ?? []

  const addUserMut = useMutation({
    mutationFn: (userId: number) => orgService.addUser(selected!.id, userId),
    onSuccess: () => {
      toast.success('Utilizador adicionado.')
      qc.invalidateQueries({ queryKey: ['departamento', selected?.id] })
      qc.invalidateQueries({ queryKey: ['departamentos'] })
      setAddUserId(null)
    },
    onError: () => toast.error('Erro ao adicionar utilizador.'),
  })

  const removeUserMut = useMutation({
    mutationFn: (userId: number) => orgService.removeUser(selected!.id, userId),
    onSuccess: () => {
      toast.success('Utilizador removido.')
      qc.invalidateQueries({ queryKey: ['departamento', selected?.id] })
      qc.invalidateQueries({ queryKey: ['departamentos'] })
    },
    onError: () => toast.error('Erro ao remover utilizador.'),
  })

  const open = (mode: 'create' | 'edit' | 'delete', item?: any) => {
    setSelected(item ?? null)
    setName(item?.name ?? '')
    setDesc(item?.description ?? '')
    setRespId(item?.responsible_id ?? item?.responsible?.id ?? null)
    setParentId(String(item?.pelouro_id ?? item?.direcao_id ?? ''))
    setModal(mode)
  }

  const createMut = useMutation({
    mutationFn: () => {
      if (type === 'pelouro') return orgService.createPelouro({ name, description: desc, responsible_id: respId! })
      if (type === 'direcao') return orgService.createDirecao({ name, pelouro_id: Number(parentId), responsible_id: respId!, description: desc })
      return orgService.createDepartamento({ name, direcao_id: Number(parentId), responsible_id: respId!, description: desc })
    },
    onSuccess: () => { toast.success('Criado com sucesso.'); qc.invalidateQueries({ queryKey: [type === 'pelouro' ? 'pelouros' : type === 'direcao' ? 'direcoes' : 'departamentos'] }); setModal(null) },
    onError: () => toast.error('Erro.'),
  })

  const updateMut = useMutation({
    mutationFn: () => {
      if (type === 'pelouro') return orgService.updatePelouro(selected.id, { name, description: desc, responsible_id: respId ?? undefined })
      if (type === 'direcao') return orgService.updateDirecao(selected.id, { name, description: desc, pelouro_id: Number(parentId), responsible_id: respId ?? undefined })
      return orgService.updateDepartamento(selected.id, { name, description: desc, direcao_id: Number(parentId), responsible_id: respId ?? undefined })
    },
    onSuccess: () => { toast.success('Actualizado com sucesso.'); qc.invalidateQueries({ queryKey: [type === 'pelouro' ? 'pelouros' : type === 'direcao' ? 'direcoes' : 'departamentos'] }); setModal(null) },
    onError: () => toast.error('Erro.'),
  })

  const deleteMut = useMutation({
    mutationFn: () => {
      if (type === 'pelouro') return orgService.deletePelouro(selected.id)
      if (type === 'direcao') return orgService.deleteDirecao(selected.id)
      return orgService.deleteDepartamento(selected.id)
    },
    onSuccess: () => { toast.success('Eliminado.'); qc.invalidateQueries(); setModal(null) },
    onError: () => toast.error('Erro.'),
  })

  const parentOpts = type === 'direcao'
    ? [{ value: '', label: 'Seleccionar pelouro…' }, ...(pelouros?.data?.map(p => ({ value: String(p.id), label: p.name })) ?? [])]
    : type === 'departamento'
      ? [{ value: '', label: 'Seleccionar direcção…' }, ...(direcoes?.data?.map(d => ({ value: String(d.id), label: d.name })) ?? [])]
      : []

  return (
    <div>
      <PageHeader eyebrow={cfg.eyebrow} title={cfg.title} subtitle={`${items.length} entidades`}
        actions={<Button variant="primary" icon={<Plus size={14} />} onClick={() => open('create')}>Novo</Button>}
      />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item: any) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{item.name}</p>
                {item.description && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{item.description}</p>}
              </div>
              {item.responsible && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={item.responsible.name} size="sm" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)' }}>{item.responsible.name}</span>
                </div>
              )}
              {type === 'departamento' && can('manage:users') && (
                <Button
                  variant="secondary" size="sm" icon={<Users size={13} />}
                  onClick={() => { setSelected(item); setAddUserId(null); setModal('members') }}
                >
                  Membros {item.users?.length > 0 && <Badge variant="default" style={{ marginLeft: 4 }}>{item.users.length}</Badge>}
                </Button>
              )}
              <Button variant="secondary" size="sm" icon={<Edit size={13} />} onClick={() => open('edit', item)}>Editar</Button>
              {can('manage:users') && <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => open('delete', item)}>Eliminar</Button>}
            </div>
          ))}
          {!items.length && <p style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Nenhum registo encontrado.</p>}
        </div>
      )}

      <Modal open={modal === 'create' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'create' ? 'Novo' : 'Editar'} width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => modal === 'edit' ? updateMut.mutate() : createMut.mutate()}
              loading={createMut.isPending || updateMut.isPending}
            >Guardar</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} />
          <Textarea label="Descrição" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <UserCombobox label="Responsável" value={respId} onChange={setRespId} />
          {(type === 'direcao' || type === 'departamento') && (
            <Select label={type === 'direcao' ? 'Pelouro' : 'Direcção'} options={parentOpts} value={parentId} onChange={e => setParentId(e.target.value)} />
          )}
        </div>
      </Modal>

      {/* Members modal — DEPARTAMENTO only */}
      <Modal
        open={modal === 'members'}
        onClose={() => setModal(null)}
        title={`Membros — ${selected?.name ?? ''}`}
        width={520}
        footer={<Button variant="secondary" onClick={() => setModal(null)}>Fechar</Button>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Add user row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 16px', background: 'var(--color-bg-strong)', borderRadius: 12, border: '1px solid var(--color-border)' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
              Adicionar utilizador
            </p>
            <UserCombobox label="" value={addUserId} onChange={setAddUserId} roles={['DEPARTAMENTO']} />
            <Button
              variant="primary"
              icon={<UserPlus size={13} />}
              disabled={!addUserId || addUserMut.isPending}
              loading={addUserMut.isPending}
              onClick={() => addUserId && addUserMut.mutate(addUserId)}
            >
              Adicionar ao departamento
            </Button>
          </div>

          {/* Current members list */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Membros actuais ({members.length})
            </p>
            {loadingMembers ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spinner size="sm" /></div>
            ) : members.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <Users size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Nenhum membro neste departamento</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {members.map((u: any) => (
                  <div key={u.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    background: 'var(--color-surface)', borderRadius: 10,
                    border: '1px solid var(--color-border)',
                  }}>
                    <Avatar name={u.name} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</p>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{u.email} · {u.role}</p>
                    </div>
                    {/* Don't allow removing the responsible */}
                    {u.id !== selected?.responsible_id && u.id !== selected?.responsible?.id && (
                      <button
                        onClick={() => removeUserMut.mutate(u.id)}
                        disabled={removeUserMut.isPending}
                        title="Remover do departamento"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
                          borderRadius: 8, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-traffic-red)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                      >
                        <X size={15} />
                      </button>
                    )}
                    {(u.id === selected?.responsible_id || u.id === selected?.responsible?.id) && (
                      <Badge variant="orange">Responsável</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      <Modal open={modal === 'delete'} onClose={() => setModal(null)} title="Confirmar eliminação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}>Eliminar</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--color-text)' }}>Tem a certeza que pretende eliminar <b>{selected?.name}</b>?</p>
      </Modal>
    </div>
  )
}
