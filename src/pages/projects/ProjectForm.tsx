import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import DatePicker from '../../components/ui/DatePicker'
import SearchableSelect from '../../components/ui/SearchableSelect'
import { projectsService } from '../../services/projects.service'
import { useAuth } from '../../hooks/useAuth'
import type { CreateProjectPayload } from '../../types'

const schema = z.object({
  title: z.string().min(3, 'Mínimo 3 caracteres'),
  description: z.string().optional(),
  creator_type: z.enum(['CA', 'PELOURO', 'DIRECAO', 'DEPARTAMENTO']),
  creator_org_id: z.string().optional(),
  parent_id: z.string().optional(),
  weight: z.coerce.number().min(0).max(100),
  start_date: z.string().min(1, 'Campo obrigatório'),
  end_date: z.string().min(1, 'Campo obrigatório'),
  status: z.string().optional(),
  goal_label: z.string().optional(),
  frequency: z.string().optional(),
  start_value: z.coerce.number().optional(),
  target_value: z.coerce.number().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  id: string
  onSubmit: (payload: CreateProjectPayload) => void
  defaultValues?: Partial<FormValues>
  initialDirecaoIds?: number[]
  editMode?: boolean
}

const ROLE_OPTS = [
  { value: 'CA',           label: 'CA' },
  { value: 'PELOURO',      label: 'Pelouro' },
  { value: 'DIRECAO',      label: 'Direcção' },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
]

const STATUS_OPTS = [
  { value: 'ACTIVE',    label: 'Activo' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
]

export default function ProjectForm({ id, onSubmit, defaultValues, initialDirecaoIds = [], editMode = false }: Props) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { creator_type: user?.role as any, weight: 100, parent_id: '', ...defaultValues },
  })

  const creatorType = watch('creator_type')
  const parentIdVal = watch('parent_id')
  const creatorOrgIdVal = watch('creator_org_id')
  const showDirecoes = creatorType === 'CA' || creatorType === 'PELOURO'
  const showSingleDirecao = creatorType === 'DIRECAO'

  // Selected direcoes state
  const [selectedDirecoes, setSelectedDirecoes] = useState<{ id: number; name: string }[]>([])
  const [pendingDirecaoId, setPendingDirecaoId] = useState('')
  const [direcaoIdsInit, setDirecaoIdsInit] = useState(false)

  // Direcoes — read-only from cache (populated by AppShell)
  const qcRef = useQueryClient()
  const direoesData = qcRef.getQueryData<any>(['direcoes'])

  const { data: parentProjects } = useQuery({
    queryKey: ['projects', { status: 'ACTIVE' }],
    queryFn: () => projectsService.list({ status: 'ACTIVE', limit: 100 }),
  })

  // Initialize selectedDirecoes from initialDirecaoIds when direcoes data loads
  useEffect(() => {
    if (direcaoIdsInit || !direoesData?.data || initialDirecaoIds.length === 0) return
    const mapped = initialDirecaoIds
      .map(id => {
        const d = direoesData.data.find((x: any) => x.id === id)
        return d ? { id: d.id, name: d.name } : null
      })
      .filter(Boolean) as { id: number; name: string }[]
    if (mapped.length > 0) setSelectedDirecoes(mapped)
    setDirecaoIdsInit(true)
  }, [direoesData, initialDirecaoIds, direcaoIdsInit])

  const direcaoOptions = direoesData?.data?.map((d: any) => ({ value: String(d.id), label: d.name })) ?? []

  const parentOpts = [
    { value: '', label: 'Nenhum (pilar estratégico raiz)' },
    ...(parentProjects?.data?.map(p => ({ value: String(p.id), label: p.title })) ?? []),
  ]

  const addDirecao = () => {
    if (!pendingDirecaoId) return
    const id = Number(pendingDirecaoId)
    if (selectedDirecoes.find(d => d.id === id)) return
    const name = direoesData?.data?.find((d: any) => d.id === id)?.name ?? `Direcção #${id}`
    setSelectedDirecoes(prev => [...prev, { id, name }])
    setPendingDirecaoId('')
  }

  const removeDirecao = (id: number) =>
    setSelectedDirecoes(prev => prev.filter(d => d.id !== id))

  const submit = (v: FormValues) => {
    onSubmit({
      ...v,
      parent_id: v.parent_id ? Number(v.parent_id) : undefined,
      creator_org_id: v.creator_org_id ? Number(v.creator_org_id) : undefined,
      direcao_ids: showDirecoes && selectedDirecoes.length > 0
        ? selectedDirecoes.map(d => d.id)
        : showSingleDirecao && v.creator_org_id
          ? [Number(v.creator_org_id)]
          : undefined,
      status: v.status || undefined,
      goal_label: v.goal_label || undefined,
      frequency: v.frequency || undefined,
      start_value: v.start_value !== undefined && v.start_value !== null && !isNaN(v.start_value as number) ? v.start_value : undefined,
      target_value: v.target_value !== undefined && v.target_value !== null && !isNaN(v.target_value as number) ? v.target_value : undefined,
    })
  }

  return (
    <form id={id} onSubmit={handleSubmit(submit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Input label="Título" placeholder="Ex: Redução de Perdas 2026" error={errors.title?.message} {...register('title')} />
      <Textarea label="Descrição" placeholder="Descreva o objectivo…" rows={3} {...register('description')} />

      {/* Nível: visível só para ADMIN */}
      {isAdmin ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Controller
            name="creator_type"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Nível"
                options={ROLE_OPTS}
                value={field.value}
                onChange={field.onChange}
                error={errors.creator_type?.message}
              />
            )}
          />
          <Input label="Peso (%)" type="number" min={0} max={100} error={errors.weight?.message} {...register('weight')} />
        </div>
      ) : (
        <>
          <input type="hidden" {...register('creator_type')} />
          <Input label="Peso (%)" type="number" min={0} max={100} error={errors.weight?.message} {...register('weight')} />
        </>
      )}

      {/* Direcção dona — só para nível DIRECAO */}
      {showSingleDirecao && (
        <SearchableSelect
          label="Direcção"
          options={[
            { value: '', label: 'Seleccionar direcção…' },
            ...(direoesData?.data?.map((d: any) => ({ value: String(d.id), label: d.name })) ?? []),
          ]}
          value={creatorOrgIdVal ?? ''}
          onChange={val => setValue('creator_org_id', val)}
          placeholder="Seleccionar direcção…"
        />
      )}

      {/* Pilar Estratégico pai */}
      <SearchableSelect
        label="Pilar Estratégico pai"
        options={parentOpts}
        value={parentIdVal ?? ''}
        onChange={val => setValue('parent_id', val)}
        clearable
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Controller
          name="start_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Data Início"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.start_date?.message}
            />
          )}
        />
        <Controller
          name="end_date"
          control={control}
          render={({ field }) => (
            <DatePicker
              label="Data Fim"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={errors.end_date?.message}
            />
          )}
        />
      </div>

      {/* ── KPI / Objectivo numérico ────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          Objectivo KPI (opcional)
        </p>

        <Input
          label="Indicador"
          placeholder="Ex: Perdas comerciais, Nº de inspecções…"
          {...register('goal_label')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          <Input
            label="Valor Inicial (baseline)"
            type="number"
            step="any"
            placeholder="Ex: 15"
            {...register('start_value')}
          />
          <Input
            label="Objectivo (meta)"
            type="number"
            step="any"
            placeholder="Ex: 3"
            {...register('target_value')}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Frequência de actualização
          </label>
          <Controller
            name="frequency"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={[
                  { value: '',           label: 'Sem frequência definida' },
                  { value: 'DAILY',      label: 'Diária' },
                  { value: 'WEEKLY',     label: 'Semanal' },
                  { value: 'MONTHLY',    label: 'Mensal' },
                  { value: 'QUARTERLY',  label: 'Trimestral' },
                  { value: 'BIANNUAL',   label: 'Semestral' },
                  { value: 'ANNUAL',     label: 'Anual' },
                ]}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </div>

      {/* Status — só visível no modo edição */}
      {editMode && (
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Estado do Pilar Estratégico
          </label>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                options={STATUS_OPTS}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      )}

      {/* Direcções afectadas — só para CA / PELOURO */}
      {showDirecoes && (
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
            Direcções afectadas
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <SearchableSelect
                options={[{ value: '', label: 'Seleccionar direcção…' }, ...direcaoOptions]}
                value={pendingDirecaoId}
                onChange={setPendingDirecaoId}
                placeholder="Seleccionar direcção…"
              />
            </div>
            <Button type="button" variant="secondary" icon={<Plus size={14} />} onClick={addDirecao}>
              Adicionar
            </Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {selectedDirecoes.map(d => (
              <Badge key={d.id} variant="orange">
                {d.name}
                <button
                  type="button"
                  onClick={() => removeDirecao(d.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, color: 'var(--color-primary)', display: 'inline-flex' }}
                >
                  <X size={11} />
                </button>
              </Badge>
            ))}
            {selectedDirecoes.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Nenhuma direcção seleccionada</p>
            )}
          </div>
        </div>
      )}
    </form>
  )
}
