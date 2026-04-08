import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, Filter } from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsService } from '../../services/projects.service'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import ProjectCard from '../../components/domain/ProjectCard'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import ProjectForm from './ProjectForm'
import type { CreateProjectPayload, ProjectStatus } from '../../types'

const STATUS_OPTS = [
  { value: '', label: 'Todos os estados' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export default function ProjectsPage() {
  const navigate = useNavigate()
  const { can } = useAuth()
  const qc = useQueryClient()
  const [status, setStatus] = useState<ProjectStatus | ''>('')
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['projects', { status }],
    queryFn: () => projectsService.list({ status: status || undefined, limit: 50 }),
  })

  const create = useMutation({
    mutationFn: (payload: CreateProjectPayload) => projectsService.create(payload),
    onSuccess: () => {
      toast.success('Pilar Estratégico criado com sucesso.')
      qc.invalidateQueries({ queryKey: ['projects'] })
      setModalOpen(false)
    },
    onError: () => toast.error('Erro ao criar pilar estratégico.'),
  })

  const projects = data?.data ?? []

  return (
    <div>
      <PageHeader
        eyebrow="Gestão"
        title="Pilares Estratégicos"
        subtitle={`${data?.total ?? 0} pilares estratégicos encontrados`}
        actions={can('create:project') && (
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setModalOpen(true)}>
            Novo Pilar Estratégico
          </Button>
        )}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center' }}>
        <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
        <div style={{ width: 200 }}>
          <Select
            options={STATUS_OPTS}
            value={status}
            onChange={e => setStatus(e.target.value as ProjectStatus | '')}
          />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Nenhum pilar estratégico encontrado.</p>
          {can('create:project') && (
            <Button variant="primary" icon={<Plus size={14} />} onClick={() => setModalOpen(true)} style={{ marginTop: 16 }}>
              Criar primeiro pilar estratégico
            </Button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              title={p.title}
              description={p.description}
              ownerLabel={p.creator_type}
              startDate={p.start_date}
              endDate={p.end_date}
              totalScore={p.performance?.total_score ?? 0}
              executionScore={p.performance?.execution_score ?? 0}
              goalScore={p.performance?.goal_score}
              trafficLight={(p.performance?.traffic_light ?? 'YELLOW') as 'GREEN' | 'YELLOW' | 'RED'}
              weight={p.weight}
              status={p.status}
              goalLabel={p.goal_label}
              startValue={p.start_value}
              targetValue={p.target_value}
              currentValue={p.current_value}
              onClick={() => navigate(`/projects/${p.id}`)}
            />
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Novo Pilar Estratégico" width={580}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button variant="primary" icon={<Plus size={14} />} form="project-form" type="submit" loading={create.isPending}>
              Criar Pilar Estratégico
            </Button>
          </>
        }
      >
        <ProjectForm id="project-form" onSubmit={payload => create.mutate(payload)} />
      </Modal>
    </div>
  )
}
