import React, { useEffect, useMemo, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X, FileText, Users, Target, CalendarDays, MapPin } from 'lucide-react'
import Input from '../../components/ui/Input'
import SearchableSelect from '../../components/ui/SearchableSelect'
import WeightSlider from '../../components/ui/WeightSlider'
import Textarea from '../../components/ui/Textarea'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import DatePicker from '../../components/ui/DatePicker'
import { orgService } from '../../services/org.service'
import { tasksService } from '../../services/tasks.service'
import { useAuth } from '../../hooks/useAuth'
import type { CreateTaskPayload, ScopeType, AggregationType } from '../../types'

const schema = z.object({
  title:            z.string().min(3),
  description:      z.string().optional(),
  owner_type:       z.enum(['CA', 'PELOURO', 'DIRECAO', 'DEPARTAMENTO']),
  owner_id:         z.coerce.number().min(1),
  frequency:        z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL']),
  goal_label:       z.string().min(2),
  start_value:      z.coerce.number(),
  target_value:     z.coerce.number(),
  aggregation_type: z.enum(['SUM_UP', 'SUM_DOWN', 'AVG', 'LAST', 'MANUAL']).default('SUM_UP'),
  weight:           z.coerce.number().min(0).max(100),
  start_date:       z.string().min(1),
  end_date:         z.string().min(1),
})

type FormValues = z.infer<typeof schema>

interface Props {
  id: string
  projectId: number
  onSubmit: (payload: CreateTaskPayload) => void
  defaultValues?: Partial<FormValues & { assigned_to?: number }>
  initialScopes?: { scope_type: ScopeType; scope_id: number; name: string }[]
  existingTaskId?: number
  onValidityChange?: (valid: boolean) => void
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
const AGG_TYPE_OPTS = [
  { value: 'SUM_UP',   label: 'Crescente acumulativo',   hint: 'Indicadores somam para atingir a meta' },
  { value: 'SUM_DOWN', label: 'Decrescente acumulativo', hint: 'Indicadores reduzem a partir do valor inicial' },
  { value: 'AVG',      label: 'Média',                   hint: 'Média dos indicadores = valor da acção' },
  { value: 'LAST',     label: 'Último valor',            hint: 'Último indicador actualizado define o valor da acção' },
  { value: 'MANUAL',   label: 'Manual',                  hint: 'Valor definido manualmente pelo utilizador' },
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
export default function TaskForm({ id, projectId, onSubmit, defaultValues, initialScopes = [], existingTaskId, onValidityChange }: Props) {
  const { user } = useAuth()
  const isAdmin       = user?.role === 'ADMIN'
  const isDirecao     = user?.role === 'DIRECAO'
  const isDepartamento = user?.role === 'DEPARTAMENTO'
  const autoOwner     = isDirecao || isDepartamento
  const initialOwnerId = defaultValues?.owner_id ? String(defaultValues.owner_id) : ''
  const initialAssignedTo = defaultValues?.assigned_to ? String(defaultValues.assigned_to) : ''

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      owner_type:       autoOwner ? 'DEPARTAMENTO' : 'DEPARTAMENTO',
      frequency:        'MONTHLY',
      aggregation_type: 'SUM_UP',
      weight:           60,
      start_value:      0,
      ...defaultValues,
    },
  })

  // Scopes
  const [scopes, setScopes] = useState<{ scope_type: ScopeType; scope_id: number; name: string }[]>(initialScopes)
  const [scopeType, setScopeType] = useState<ScopeType>('ASC')
  const [scopeId, setScopeId] = useState('')

  // Department picker state (for DIRECAO/DEPARTAMENTO users)
  const [selectedDeptId, setSelectedDeptId] = useState(autoOwner ? initialOwnerId : '')

  // Owner picker state (for ADMIN / CA / PELOURO users)
  const [selectedOwnerId, setSelectedOwnerId] = useState(autoOwner ? '' : initialOwnerId)

  // Task responsible user (for ADMIN / DIRECAO when the owner is a department)
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(initialAssignedTo)

  // Existing tasks → compute used weight
  const { data: existingTasksData } = useQuery({
    queryKey: ['tasks', { project_id: projectId }],
    queryFn: () => tasksService.list(projectId, { limit: 100 }),
  })
  const usedWeight = (existingTasksData?.data ?? []).reduce((sum, t) => {
    if (existingTaskId && t.id === existingTaskId) return sum
    return sum + (t.weight ?? 0)
  }, 0)
  const availableMax = Math.max(0, 100 - usedWeight)

  // Geo & org data — read-only from cache (populated by AppShell)
  const qcRef = useQueryClient()
  const ascs       = qcRef.getQueryData<any>(['geo', 'ascs'])
  const regioes    = qcRef.getQueryData<any>(['geo', 'regioes'])
  const deptsData  = qcRef.getQueryData<any>(['departamentos'])
  const direoesData = qcRef.getQueryData<any>(['direcoes'])

  const depts   = deptsData?.data   ?? []
  const direcoes = direoesData?.data ?? []
  const ownerType = watch('owner_type')
  const selectedDepartmentId = autoOwner ? selectedDeptId : ownerType === 'DEPARTAMENTO' ? selectedOwnerId : ''

  const deptOptions = [
    { value: '', label: 'Seleccionar departamento…' },
    ...depts.map((d: any) => ({ value: String(d.id), label: d.name })),
  ]

  const selectedDept = depts.find((d: any) => String(d.id) === selectedDepartmentId) ?? null

  const { data: selectedDeptData, isFetching: isDeptUsersLoading } = useQuery({
    queryKey: ['departamentos', selectedDepartmentId, 'detail'],
    queryFn: () => orgService.getDepartamento(Number(selectedDepartmentId)),
    enabled: !!selectedDepartmentId,
  })

  const departmentUsers = useMemo(() => {
    const users = selectedDeptData?.users ?? []
    const responsible = selectedDeptData?.responsible
    const seen = new Set<number>()
    const result: { id: number; name: string }[] = []

    if (responsible && !seen.has(responsible.id)) {
      seen.add(responsible.id)
      result.push({ id: responsible.id, name: responsible.name })
    }
    users.forEach((u) => {
      if (!seen.has(u.id)) {
        seen.add(u.id)
        result.push({ id: u.id, name: u.name })
      }
    })

    return result
  }, [selectedDeptData])

  const canPickTaskResponsible = (isAdmin || isDirecao) && !!selectedDepartmentId
  const assigneeOptions = [
    { value: '', label: isDeptUsersLoading ? 'A carregar utilizadores…' : 'Seleccionar responsável…' },
    ...departmentUsers.map((u) => ({ value: String(u.id), label: u.name })),
  ]

  useEffect(() => {
    if (!selectedDepartmentId) {
      setSelectedAssigneeId('')
      return
    }
    if (selectedAssigneeId && !departmentUsers.some((u) => String(u.id) === selectedAssigneeId)) {
      setSelectedAssigneeId('')
    }
  }, [departmentUsers, selectedAssigneeId, selectedDepartmentId])

  useEffect(() => {
    if (!canPickTaskResponsible || ownerType !== 'DEPARTAMENTO') {
      setSelectedAssigneeId('')
    }
  }, [canPickTaskResponsible, ownerType])

  const handleDeptChange = (val: string) => {
    setSelectedDeptId(val)
    setValue('owner_id', Number(val))
    setSelectedAssigneeId('')
  }

  // Owner options for admin — changes with owner_type
  const ownerOptions = (type: string) => {
    if (type === 'DIRECAO') {
      return [
        { value: '', label: 'Seleccionar direcção…' },
        ...direcoes.map((d: any) => ({ value: String(d.id), label: d.name })),
      ]
    }
    return [
      { value: '', label: 'Seleccionar departamento…' },
      ...depts.map((d: any) => ({ value: String(d.id), label: d.name })),
    ]
  }

  const handleOwnerTypeChange = (val: string) => {
    setValue('owner_type', val as any)
    setSelectedOwnerId('')
    setValue('owner_id', 0)
    setSelectedAssigneeId('')
  }

  const handleOwnerIdChange = (val: string) => {
    setSelectedOwnerId(val)
    setValue('owner_id', Number(val))
    setSelectedAssigneeId('')
  }

  // Scope options
  const scopeOptions = scopeType === 'NACIONAL'
    ? []
    : scopeType === 'ASC'
      ? ascs?.data?.map((a: any) => ({ value: String(a.id), label: a.name })) ?? []
      : regioes?.data?.map((r: any) => ({ value: String(r.id), label: r.name })) ?? []

  const addScope = () => {
    if (scopeType === 'NACIONAL') {
      if (!scopes.find(s => s.scope_type === 'NACIONAL')) {
        setScopes(s => [...s, { scope_type: 'NACIONAL', scope_id: 0, name: 'Nacional' }])
      }
      return
    }
    if (!scopeId) return
    const name = scopeOptions.find((o: any) => o.value === scopeId)?.label ?? scopeId
    if (!scopes.find(s => s.scope_type === scopeType && String(s.scope_id) === scopeId)) {
      setScopes(s => [...s, { scope_type: scopeType, scope_id: Number(scopeId), name }])
    }
    setScopeId('')
  }

  const removeScope = (i: number) => setScopes(s => s.filter((_, idx) => idx !== i))

  const weightValue = watch('weight')
  const overBudget = usedWeight + (Number(weightValue) || 0) > 100

  const submit = (v: FormValues) => {
    onSubmit({
      ...v,
      aggregation_type: (v.aggregation_type ?? 'SUM_UP') as AggregationType,
      assigned_to: selectedAssigneeId ? Number(selectedAssigneeId) : undefined,
      scopes: scopes.map(({ scope_type, scope_id }) => ({ scope_type, scope_id })),
    })
  }

  return (
    <form id={id} onSubmit={handleSubmit(submit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── 1. Identificação ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <SectionHeader icon={<FileText size={13} style={{ color: 'var(--color-primary)' }} />} label="Identificação" />
        <Input label="Título" placeholder="Ex: Efectuar 50.000 inspecções" error={errors.title?.message} {...register('title')} />
        <Textarea label="Descrição" placeholder="Detalhe o objectivo da acção…" rows={2} {...register('description')} />
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

            {canPickTaskResponsible && (
              <SearchableSelect
                label="Utilizador responsável"
                options={assigneeOptions}
                value={selectedAssigneeId}
                onChange={setSelectedAssigneeId}
                disabled={!selectedDepartmentId || isDeptUsersLoading || departmentUsers.length === 0}
                hint={
                  !selectedDepartmentId
                    ? 'Seleccione primeiro um departamento.'
                    : departmentUsers.length === 0
                      ? 'Este departamento ainda não tem utilizadores associados.'
                      : 'Apenas utilizadores do departamento seleccionado.'
                }
              />
            )}
          </>
        ) : (
          /* ADMIN / outros — choose type + searchable combobox */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Controller
              name="owner_type"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Tipo de dono"
                  options={ROLE_OPTS}
                  value={field.value}
                  onChange={val => { field.onChange(val); handleOwnerTypeChange(val) }}
                />
              )}
            />
            <SearchableSelect
              label={ownerType === 'DIRECAO' ? 'Direcção' : 'Departamento'}
              options={ownerOptions(ownerType)}
              value={selectedOwnerId}
              onChange={handleOwnerIdChange}
              error={errors.owner_id?.message}
            />
            {canPickTaskResponsible && ownerType === 'DEPARTAMENTO' && (
              <SearchableSelect
                label="Utilizador responsável"
                options={assigneeOptions}
                value={selectedAssigneeId}
                onChange={setSelectedAssigneeId}
                disabled={!selectedDepartmentId || isDeptUsersLoading || departmentUsers.length === 0}
                hint={
                  !selectedDepartmentId
                    ? 'Seleccione primeiro um departamento.'
                    : departmentUsers.length === 0
                      ? 'Este departamento ainda não tem utilizadores associados.'
                      : 'Apenas utilizadores do departamento seleccionado.'
                }
              />
            )}
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
          <Input label="Valor inicial" type="number" step="any" {...register('start_value')} />
          <Input label="Valor alvo" type="number" step="any" error={errors.target_value?.message} {...register('target_value')} />
        </div>
        <Controller
          name="aggregation_type"
          control={control}
          render={({ field }) => (
            <div>
              <SearchableSelect
                label="Tipo de incidência"
                options={AGG_TYPE_OPTS}
                value={field.value ?? 'SUM_UP'}
                onChange={field.onChange}
              />
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                {AGG_TYPE_OPTS.find(o => o.value === (field.value ?? 'SUM_UP'))?.hint}
              </p>
            </div>
          )}
        />
        <Controller
          name="frequency"
          control={control}
          render={({ field }) => (
            <SearchableSelect label="Periodicidade de actualização" options={FREQ_OPTS} value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="weight"
          control={control}
          render={({ field }) => (
            <WeightSlider
              value={Number(field.value) || 0}
              onChange={field.onChange}
              usedByOthers={usedWeight > 0 ? usedWeight : undefined}
              error={overBudget ? 'Peso total excede 100%. Ajuste antes de guardar.' : errors.weight?.message}
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
