import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Plus, X, FileText, Users, Target, CalendarDays, MapPin } from 'lucide-react'
import Input from '../../components/ui/Input'
import SearchableSelect from '../../components/ui/SearchableSelect'
import WeightSlider from '../../components/ui/WeightSlider'
import Textarea from '../../components/ui/Textarea'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import DatePicker from '../../components/ui/DatePicker'
import { geoService } from '../../services/geo.service'
import { orgService } from '../../services/org.service'
import { tasksService } from '../../services/tasks.service'
import { useAuth } from '../../hooks/useAuth'
import type { CreateTaskPayload, ScopeType } from '../../types'

const schema = z.object({
  title:        z.string().min(3),
  description:  z.string().optional(),
  owner_type:   z.enum(['CA', 'PELOURO', 'DIRECAO', 'DEPARTAMENTO']),
  owner_id:     z.coerce.number().min(1),
  frequency:    z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']),
  goal_label:   z.string().min(2),
  start_value:  z.coerce.number(),
  target_value: z.coerce.number(),
  weight:       z.coerce.number().min(0).max(100),
  start_date:   z.string().min(1),
  end_date:     z.string().min(1),
})

type FormValues = z.infer<typeof schema>

interface Props {
  id: string
  projectId: number
  onSubmit: (payload: CreateTaskPayload) => void
  defaultValues?: Partial<FormValues>
}

const FREQ_OPTS = [
  { value: 'DAILY',     label: 'Diária'     },
  { value: 'WEEKLY',    label: 'Semanal'    },
  { value: 'MONTHLY',   label: 'Mensal'     },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'BIANNUAL',  label: 'Semestral'  },
  { value: 'ANNUAL',    label: 'Anual'      },
]
const ROLE_OPTS = [
  { value: 'DIRECAO',      label: 'Direcção'     },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
]
const SCOPE_TYPE_OPTS = [
  { value: 'ASC',     label: 'ASC'     },
  { value: 'REGIAO',  label: 'Região'  },
  { value: 'NACIONAL', label: 'Nacional' },
]

// ── Section header helper ─────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, marginBottom: 4, borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ width: 26, height: 26, borderRadius: 8, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function TaskForm({ id, projectId, onSubmit, defaultValues }: Props) {
  const { user } = useAuth()
  const isDirecao     = user?.role === 'DIRECAO'
  const isDepartamento = user?.role === 'DEPARTAMENTO'
  const autoOwner     = isDirecao || isDepartamento

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      owner_type:  autoOwner ? 'DEPARTAMENTO' : 'DEPARTAMENTO',
      frequency:   'MONTHLY',
      weight:      60,
      start_value: 0,
      ...defaultValues,
    },
  })

  // Scopes
  const [scopes, setScopes] = useState<{ scope_type: ScopeType; scope_id: number; name: string }[]>([])
  const [scopeType, setScopeType] = useState<ScopeType>('ASC')
  const [scopeId, setScopeId] = useState('')

  // Department picker state (for DIRECAO/DEPARTAMENTO users)
  const [selectedDeptId, setSelectedDeptId] = useState('')

  // Existing tasks → compute used weight
  const { data: existingTasksData } = useQuery({
    queryKey: ['tasks', { project_id: projectId }],
    queryFn: () => tasksService.list(projectId, { limit: 100 }),
  })
  const usedWeight = (existingTasksData?.data ?? []).reduce((sum, t) => sum + (t.weight ?? 0), 0)
  const availableMax = Math.max(0, 100 - usedWeight)

  // Geo data
  const { data: ascs }    = useQuery({ queryKey: ['geo', 'ascs'],    queryFn: () => geoService.listAscs()    })
  const { data: regioes } = useQuery({ queryKey: ['geo', 'regioes'], queryFn: () => geoService.listRegioes() })

  // Departments (for owner picker when user is DIRECAO)
  const { data: deptsData } = useQuery({
    queryKey: ['departamentos'],
    queryFn:  () => orgService.listDepartamentos(),
    enabled:  autoOwner,
  })

  const depts = deptsData?.data ?? []
  const deptOptions = [
    { value: '', label: 'Seleccionar departamento…' },
    ...depts.map(d => ({ value: String(d.id), label: d.name })),
  ]

  const selectedDept = depts.find(d => String(d.id) === selectedDeptId) ?? null

  const handleDeptChange = (val: string) => {
    setSelectedDeptId(val)
    setValue('owner_id', Number(val))
  }

  // Scope options
  const scopeOptions = scopeType === 'NACIONAL'
    ? []
    : scopeType === 'ASC'
      ? ascs?.data?.map(a => ({ value: String(a.id), label: a.name })) ?? []
      : regioes?.data?.map(r => ({ value: String(r.id), label: r.name })) ?? []

  const addScope = () => {
    if (scopeType === 'NACIONAL') {
      if (!scopes.find(s => s.scope_type === 'NACIONAL')) {
        setScopes(s => [...s, { scope_type: 'NACIONAL', scope_id: 0, name: 'Nacional' }])
      }
      return
    }
    if (!scopeId) return
    const name = scopeOptions.find(o => o.value === scopeId)?.label ?? scopeId
    if (!scopes.find(s => s.scope_type === scopeType && String(s.scope_id) === scopeId)) {
      setScopes(s => [...s, { scope_type: scopeType, scope_id: Number(scopeId), name }])
    }
    setScopeId('')
  }

  const removeScope = (i: number) => setScopes(s => s.filter((_, idx) => idx !== i))

  const submit = (v: FormValues) => {
    onSubmit({ ...v, scopes: scopes.map(({ scope_type, scope_id }) => ({ scope_type, scope_id })) })
  }

  const ownerType = watch('owner_type')

  return (
    <form id={id} onSubmit={handleSubmit(submit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── 1. Identificação ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader icon={<FileText size={13} style={{ color: 'var(--color-primary)' }} />} label="Identificação" />
        <Input label="Título" placeholder="Ex: Efectuar 50.000 inspecções" error={errors.title?.message} {...register('title')} />
        <Textarea label="Descrição" placeholder="Detalhe o objectivo da tarefa…" rows={2} {...register('description')} />
      </div>

      {/* ── 2. Responsabilidade ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader icon={<Users size={13} style={{ color: 'var(--color-primary)' }} />} label="Responsabilidade" />

        {autoOwner ? (
          /* DIRECAO / DEPARTAMENTO — pick dept from list, show chief */
          <>
            <SearchableSelect
              label="Departamento responsável"
              options={deptOptions}
              value={selectedDeptId}
              onChange={handleDeptChange}
              error={errors.owner_id?.message}
            />
            {/* Hidden fields */}
            <input type="hidden" {...register('owner_type')} value="DEPARTAMENTO" />

            {/* Department chief info */}
            {selectedDept && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-primary-soft)', borderRadius: 12, border: '1px solid var(--color-primary)20' }}>
                {selectedDept.responsible ? (
                  <>
                    <Avatar name={selectedDept.responsible.name} size="sm" />
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Chefe do departamento</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{selectedDept.responsible.name}</p>
                    </div>
                  </>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Nenhum chefe atribuído a este departamento.</p>
                )}
              </div>
            )}
          </>
        ) : (
          /* ADMIN / outros — choose type + numeric ID */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Controller
              name="owner_type"
              control={control}
              render={({ field }) => (
                <SearchableSelect label="Tipo de dono" options={ROLE_OPTS} value={field.value} onChange={field.onChange} />
              )}
            />
            <Input label="ID do dono" type="number" error={errors.owner_id?.message} {...register('owner_id')} />
          </div>
        )}
      </div>

      {/* ── 3. Objectivo & Medição ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader icon={<Target size={13} style={{ color: 'var(--color-primary)' }} />} label="Objectivo & Medição" />
        <Input
          label="Label do objectivo"
          placeholder="Ex: inspecções realizadas"
          error={errors.goal_label?.message}
          {...register('goal_label')}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Valor inicial" type="number" {...register('start_value')} />
          <Input label="Valor alvo" type="number" error={errors.target_value?.message} {...register('target_value')} />
        </div>
        <Controller
          name="frequency"
          control={control}
          render={({ field }) => (
            <SearchableSelect label="Frequência" options={FREQ_OPTS} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="weight"
          control={control}
          render={({ field }) => (
            <WeightSlider
              value={Number(field.value) || 0}
              onChange={field.onChange}
              max={usedWeight > 0 ? availableMax : 100}
              usedByOthers={usedWeight > 0 ? usedWeight : undefined}
              error={errors.weight?.message}
            />
          )}
        />
      </div>

      {/* ── 4. Período ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader icon={<CalendarDays size={13} style={{ color: 'var(--color-primary)' }} />} label="Período" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Controller
            name="start_date"
            control={control}
            render={({ field }) => (
              <DatePicker label="Data Início" value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.start_date?.message} />
            )}
          />
          <Controller
            name="end_date"
            control={control}
            render={({ field }) => (
              <DatePicker label="Data Fim" value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={errors.end_date?.message} />
            )}
          />
        </div>
      </div>

      {/* ── 5. Âmbito geográfico ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader icon={<MapPin size={13} style={{ color: 'var(--color-primary)' }} />} label="Âmbito geográfico" />
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ width: 130 }}>
            <SearchableSelect
              options={SCOPE_TYPE_OPTS}
              value={scopeType}
              onChange={v => { setScopeType(v as ScopeType); setScopeId('') }}
            />
          </div>
          {scopeType !== 'NACIONAL' && (
            <div style={{ flex: 1 }}>
              <SearchableSelect
                options={[{ value: '', label: 'Seleccionar…' }, ...scopeOptions]}
                value={scopeId}
                onChange={setScopeId}
              />
            </div>
          )}
          <Button type="button" variant="secondary" icon={<Plus size={14} />} onClick={addScope}>
            Adicionar
          </Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {scopes.map((s, i) => (
            <Badge key={i} variant="orange">
              {s.scope_type === 'NACIONAL' ? 'Nacional' : `${s.scope_type}: ${s.name}`}
              <button type="button" onClick={() => removeScope(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 4, color: 'var(--color-primary)', display: 'inline-flex' }}>
                <X size={11} />
              </button>
            </Badge>
          ))}
          {scopes.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nenhum âmbito adicionado — será considerado âmbito nacional</p>
          )}
        </div>
      </div>

    </form>
  )
}
