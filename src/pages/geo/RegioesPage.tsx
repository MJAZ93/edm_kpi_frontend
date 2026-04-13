import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Map } from 'lucide-react'
import toast from 'react-hot-toast'
import { geoService } from '../../services/geo.service'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import PolygonEditor from '../../components/map/PolygonEditor'
import UserCombobox from '../../components/ui/UserCombobox'
import type { Regiao } from '../../types'

export default function RegioesPage() {
  const { can } = useAuth()
  const qc = useQueryClient()

  const [modal, setModal] = useState<'create' | 'edit' | 'delete' | 'polygon' | null>(null)
  const [selected, setSelected] = useState<Regiao | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [respId, setRespId] = useState<number | null>(null)
  const [polygon, setPolygon] = useState<{ type: string; coordinates: any } | null>(null)

  // Read polygon data from cache (prefetched at login, persisted in IndexedDB)
  const { data, isLoading } = useQuery({
    queryKey: ['geo', 'regioes', 'polygon'],
    queryFn: () => geoService.listRegioes({ includePolygon: true }),
    staleTime: Infinity,
  })
  const items = data?.data ?? []

  const open = (mode: typeof modal, item?: Regiao) => {
    setSelected(item ?? null)
    setName(item?.name ?? '')
    setCode(item?.code ?? '')
    setRespId(item?.responsible_id ?? item?.responsible?.id ?? null)
    setPolygon(item?.polygon ?? null)
    setModal(mode)
  }

  const createMut = useMutation({
    mutationFn: () => geoService.createRegiao({
      name, code, responsible_id: respId!,
      polygon: polygon as any ?? undefined,
    }),
    onSuccess: () => { toast.success('Região criada.'); qc.invalidateQueries({ queryKey: ['geo', 'regioes'] }); setModal(null) },
    onError: () => toast.error('Erro ao criar.'),
  })

  const updateMut = useMutation({
    mutationFn: () => geoService.updateRegiao(selected!.id, {
      name, code, responsible_id: respId!,
      polygon: polygon as any ?? undefined,
    }),
    onSuccess: () => { toast.success('Região actualizada.'); qc.invalidateQueries({ queryKey: ['geo', 'regioes'] }); setModal(null) },
    onError: () => toast.error('Erro ao actualizar.'),
  })

  const deleteMut = useMutation({
    mutationFn: () => geoService.deleteRegiao(selected!.id),
    onSuccess: () => { toast.success('Região eliminada.'); qc.invalidateQueries({ queryKey: ['geo', 'regioes'] }); setModal(null) },
    onError: () => toast.error('Erro ao eliminar.'),
  })

  const isEdit = modal === 'edit'

  return (
    <div>
      <PageHeader
        eyebrow="Geografia"
        title="Regiões"
        subtitle={`${items.length} regiões`}
        actions={<Button variant="primary" icon={<Plus size={14} />} onClick={() => open('create')}>Nova Região</Button>}
      />

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', background: 'var(--color-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-soft)' }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>
                  {item.name}
                  <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-surface-muted)', padding: '2px 6px', borderRadius: 4 }}>{item.code}</span>
                </p>
              </div>
              {item.polygon && (
                <span style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Map size={12} /> Polígono definido
                </span>
              )}
              {item.responsible && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar name={item.responsible.name} size="sm" />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)' }}>{item.responsible.name}</span>
                </div>
              )}
              <Button variant="secondary" size="sm" icon={<Edit size={13} />} onClick={() => open('edit', item)}>Editar</Button>
              {can('manage:users') && (
                <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => open('delete', item)}>Eliminar</Button>
              )}
            </div>
          ))}
          {!items.length && <p style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>Nenhuma região encontrada.</p>}
        </div>
      )}

      <Modal
        open={modal === 'create' || modal === 'edit'}
        onClose={() => setModal(null)}
        title={isEdit ? 'Editar Região' : 'Nova Região'}
        width={600}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => isEdit ? updateMut.mutate() : createMut.mutate()}
              loading={createMut.isPending || updateMut.isPending}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Centro" />
            <Input label="Código" value={code} onChange={e => setCode(e.target.value)} placeholder="Ex: CEN" />
          </div>
          <UserCombobox label="Responsável" value={respId} onChange={setRespId} roles={['DIRECAO']} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-soft)', marginBottom: 6 }}>Polígono Geográfico</p>
            <PolygonEditor value={polygon} onChange={setPolygon} />
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === 'delete'}
        onClose={() => setModal(null)}
        title="Confirmar eliminação"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => deleteMut.mutate()} loading={deleteMut.isPending}>Eliminar</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--color-text)' }}>
          Tem a certeza que pretende eliminar a região <b>{selected?.name}</b>?
        </p>
      </Modal>
    </div>
  )
}
