import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, ChevronRight, ChevronDown, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { orgService } from '../../services/org.service'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Select from '../../components/ui/Select'
import Avatar from '../../components/ui/Avatar'
import UserCombobox from '../../components/ui/UserCombobox'

export default function OrgPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [modal, setModal] = useState<'pelouro' | 'direcao' | 'departamento' | null>(null)
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [respId, setRespId] = useState<number | null>(null)
  const [parentId, setParentId] = useState('')

  const { data: tree, isLoading } = useQuery({ queryKey: ['org', 'tree'], queryFn: orgService.getTree })

  const createPelouro = useMutation({
    mutationFn: () => orgService.createPelouro({ name, description: desc, responsible_id: respId ?? 0 }),
    onSuccess: () => { toast.success('Pelouro criado.'); qc.invalidateQueries({ queryKey: ['org'] }); setModal(null); setRespId(null) },
    onError: () => toast.error('Erro.'),
  })

  const toggle = (key: string) => setExpanded(p => ({ ...p, [key]: !p[key] }))

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>

  return (
    <div>
      <PageHeader eyebrow="Organização" title="Árvore Organizacional" subtitle="Estrutura hierárquica completa da empresa"
        actions={can('create:pelouro') && <Button variant="primary" icon={<Plus size={14} />} onClick={() => { setModal('pelouro'); setName(''); setDesc(''); setRespId(null) }}>Novo Pelouro</Button>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tree?.pelouros?.map(p => (
          <div key={p.id} style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)', overflow: 'hidden' }}>
            {/* Pelouro */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'linear-gradient(135deg, var(--sidebar-bg) 0%, #1a3830 100%)', cursor: 'pointer' }} onClick={() => toggle(`p-${p.id}`)}>
              {expanded[`p-${p.id}`] ? <ChevronDown size={16} color="#fff" /> : <ChevronRight size={16} color="#fff" />}
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{p.name}</p>
                {p.description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{p.description}</p>}
              </div>
              <Badge variant="orange">Pelouro</Badge>
              {p.responsible && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={p.responsible.name} size="sm" />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)', fontWeight: 600 }}>{p.responsible.name}</span>
                </div>
              )}
            </div>

            {/* Direções */}
            {expanded[`p-${p.id}`] && (
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {p.direcoes?.map(d => (
                  <div key={d.id} style={{ border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--color-surface-muted)', cursor: 'pointer' }} onClick={() => toggle(`d-${d.id}`)}>
                      {expanded[`d-${d.id}`] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <p style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{d.name}</p>
                      <Badge variant="default">Direcção</Badge>
                      {d.responsible && <Avatar name={d.responsible.name} size="sm" />}
                    </div>
                    {/* Departamentos */}
                    {expanded[`d-${d.id}`] && (
                      <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {d.departamentos?.map(dep => (
                          <div key={dep.id} onClick={() => navigate(`/org/departamentos/${dep.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--color-bg)', borderRadius: 8, border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 150ms' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-muted)' }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)' }}>
                            <p style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{dep.name}</p>
                            <Badge variant="muted">Departamento</Badge>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
                              <Users size={12} />{dep.users?.length ?? 0}
                            </span>
                            {dep.responsible && <Avatar name={dep.responsible.name} size="sm" />}
                          </div>
                        ))}
                        {!d.departamentos?.length && <p style={{ fontSize: 12, color: 'var(--color-text-muted)', padding: 4 }}>Sem departamentos.</p>}
                      </div>
                    )}
                  </div>
                ))}
                {!p.direcoes?.length && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Sem direcções.</p>}
              </div>
            )}
          </div>
        ))}
        {!tree?.pelouros?.length && <p style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Nenhum pelouro criado.</p>}
      </div>

      <Modal open={modal === 'pelouro'} onClose={() => setModal(null)} title="Novo Pelouro" width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={() => createPelouro.mutate()} loading={createPelouro.isPending}>Criar</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Redução de Perdas" />
          <Textarea label="Descrição" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
          <UserCombobox label="Responsável" value={respId} onChange={setRespId} roles={['CA', 'ADMIN']} />
        </div>
      </Modal>
    </div>
  )
}
