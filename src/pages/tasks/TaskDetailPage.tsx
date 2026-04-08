import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, MapPin, Target, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { tasksService } from '../../services/tasks.service'
import { milestonesService } from '../../services/milestones.service'
import { blockersService } from '../../services/blockers.service'
import { dashboardService } from '../../services/dashboard.service'
import { geoService } from '../../services/geo.service'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import DatePicker from '../../components/ui/DatePicker'
import Select from '../../components/ui/Select'
import SearchableSelect from '../../components/ui/SearchableSelect'
import Avatar from '../../components/ui/Avatar'
import Textarea from '../../components/ui/Textarea'
import Spinner from '../../components/ui/Spinner'
import Tabs from '../../components/ui/Tabs'
import ProgressBar from '../../components/ui/ProgressBar'
import MilestoneCard from '../../components/domain/MilestoneCard'
import BlockerCard from '../../components/domain/BlockerCard'
import ProgressModal from '../../components/domain/ProgressModal'
import ForecastAlert from '../../components/domain/ForecastAlert'
import ForecastChart from '../../components/charts/ForecastChart'
import ScopeMap from '../../components/map/ScopeMap'
import TaskForm from './TaskForm'
import type { CreateMilestonePayload, CreateBlockerPayload, CreateTaskPayload, ScopeType, MilestoneStatus, BlockerType, ASC, Regiao } from '../../types'

function fmtDate(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const FREQ_LABEL: Record<string, string> = {
  DAILY: 'Diária', WEEKLY: 'Semanal', MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral', BIANNUAL: 'Semestral', ANNUAL: 'Anual',
}
const SCOPE_OPTS = [
  { value: '',        label: 'Seleccionar âmbito…' },
  { value: 'ASC',     label: 'ASC'      },
  { value: 'REGIAO',  label: 'Região'   },
  { value: 'NACIONAL', label: 'Nacional' },
]
const STATUS_OPTS = [
  { value: 'PENDING', label: 'Pendente' }, { value: 'DONE', label: 'Concluído' },
]
const BLOCKER_TYPE_OPTS = [
  { value: 'LOGISTIC', label: 'Logístico' }, { value: 'FINANCIAL', label: 'Financeiro' },
  { value: 'TECHNICAL', label: 'Técnico' }, { value: 'LEGAL', label: 'Legal' },
]

// ── Indicador form section header ─────────────────────────────────────────────
function MsSectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8, marginBottom: 2, borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ width: 24, height: 24, borderRadius: 7, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  )
}

// ── Indicador form inner component ────────────────────────────────────────────
interface IndicadorFormProps {
  msTitle: string; setMsTitle: (v: string) => void
  msScopeType: ScopeType | ''; setMsScopeType: (v: ScopeType | '') => void
  msScopeId: string; setMsScopeId: (v: string) => void
  msPlanned: string; setMsPlanned: (v: string) => void
  msDate: string; setMsDate: (v: string) => void
  msNotes: string; setMsNotes: (v: string) => void
  ascs: ASC[]; regioes: Regiao[]
  goalLabel?: string
  deptUsers?: { id: number; name: string }[]
  msAssignedTo: string; setMsAssignedTo: (v: string) => void
  currentUserId?: number
  taskStartDate?: string   // YYYY-MM-DD
  taskEndDate?: string     // YYYY-MM-DD
  taskTargetValue?: number
  taskTotalPlanned?: number  // sum of already-created indicadores
}

function IndicadorForm({ msTitle, setMsTitle, msScopeType, setMsScopeType, msScopeId, setMsScopeId, msPlanned, setMsPlanned, msDate, setMsDate, msNotes, setMsNotes, ascs, regioes, goalLabel, deptUsers, msAssignedTo, setMsAssignedTo, currentUserId, taskStartDate, taskEndDate, taskTargetValue, taskTotalPlanned }: IndicadorFormProps) {
  const scopeEntityOptions = msScopeType === 'ASC'
    ? ascs.map(a => ({ value: String(a.id), label: a.name }))
    : msScopeType === 'REGIAO'
      ? regioes.map(r => ({ value: String(r.id), label: r.name }))
      : []

  const selectedResponsible = msScopeType === 'ASC'
    ? ascs.find(a => String(a.id) === msScopeId)?.responsible ?? null
    : msScopeType === 'REGIAO'
      ? regioes.find(r => String(r.id) === msScopeId)?.responsible ?? null
      : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Identificação */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MsSectionHeader icon={<FileText size={12} style={{ color: 'var(--color-primary)' }} />} label="Identificação" />
        <Input label="Título" placeholder="Ex: Semana 1 — Inspecções Pemba" value={msTitle} onChange={e => setMsTitle(e.target.value)} />
      </div>

      {/* ── Âmbito geográfico */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MsSectionHeader icon={<MapPin size={12} style={{ color: 'var(--color-primary)' }} />} label="Âmbito geográfico" />
        <SearchableSelect
          label="Tipo de âmbito"
          options={SCOPE_OPTS}
          value={msScopeType}
          onChange={v => setMsScopeType(v as ScopeType | '')}
        />
        {(msScopeType === 'ASC' || msScopeType === 'REGIAO') && (
          <SearchableSelect
            label={msScopeType === 'ASC' ? 'ASC' : 'Região'}
            options={[{ value: '', label: `Seleccionar ${msScopeType === 'ASC' ? 'ASC' : 'região'}…` }, ...scopeEntityOptions]}
            value={msScopeId}
            onChange={setMsScopeId}
          />
        )}
        {msScopeType === 'NACIONAL' && (
          <div style={{ padding: '8px 12px', background: 'var(--color-primary-soft)', borderRadius: 10, border: '1px solid var(--color-primary)20' }}>
            <p style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 600 }}>Âmbito nacional — sem restrição geográfica</p>
          </div>
        )}
        {selectedResponsible && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--color-primary-soft)', borderRadius: 12, border: '1px solid var(--color-primary)20' }}>
            <Avatar name={selectedResponsible.name} size="sm" />
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>Responsável</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{selectedResponsible.name}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Valores & Data */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MsSectionHeader icon={<Target size={12} style={{ color: 'var(--color-primary)' }} />} label="Objectivo & Período" />

        {/* Task target context banner */}
        {taskTargetValue !== undefined && taskTotalPlanned !== undefined && (() => {
          const alreadyPlanned = taskTotalPlanned
          const remaining = taskTargetValue - alreadyPlanned
          const thisVal   = Number(msPlanned) || 0
          const afterThis = alreadyPlanned + thisVal
          const afterPct  = taskTargetValue > 0 ? (afterThis / taskTargetValue) * 100 : 0
          const overTarget = afterThis > taskTargetValue

          return (
            <div style={{ padding: '10px 14px', background: 'var(--color-surface-muted)', borderRadius: 10, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {/* Objectivo row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objectivo da acção</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>{taskTargetValue.toLocaleString('pt-PT')} {goalLabel ?? ''}</span>
              </div>
              {/* Already assigned row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>Já atribuído a indicadores</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{alreadyPlanned.toLocaleString('pt-PT')}</span>
              </div>
              {/* Remaining row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: remaining > 0 ? 'var(--color-traffic-red)' : 'var(--color-traffic-green)' }}>
                  {remaining > 0 ? 'Por cobrir' : remaining === 0 ? 'Totalmente coberto' : 'Já ultrapassado'}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: remaining > 0 ? 'var(--color-traffic-red)' : 'var(--color-traffic-green)' }}>
                  {remaining > 0 ? remaining.toLocaleString('pt-PT') : remaining === 0 ? '✓' : `+${Math.abs(remaining).toLocaleString('pt-PT')}`}
                </span>
              </div>
              {/* Live projection (only when user typed a value) */}
              {thisVal > 0 && (
                <>
                  <div style={{ height: 1, background: 'var(--color-border)', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: overTarget ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                      {overTarget ? '🚀 Com este indicador' : 'Com este indicador'}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: overTarget ? 'var(--color-primary)' : 'var(--color-traffic-green)' }}>
                      {afterThis.toLocaleString('pt-PT')} ({afterPct.toFixed(0)}%{overTarget ? ' — acima do objectivo, é permitido' : ''})
                    </span>
                  </div>
                  {/* Mini progress bar */}
                  <div style={{ height: 6, borderRadius: 4, background: 'var(--color-border)', overflow: 'hidden', position: 'relative' }}>
                    {/* Previous planned */}
                    <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(100, (alreadyPlanned / taskTargetValue) * 100)}%`, background: 'var(--color-primary)60', transition: 'width .3s' }} />
                    {/* This indicador addition */}
                    <div style={{
                      position: 'absolute', left: `${Math.min(100, (alreadyPlanned / taskTargetValue) * 100)}%`, top: 0, height: '100%',
                      width: `${Math.min(100 - Math.min(100, (alreadyPlanned / taskTargetValue) * 100), (thisVal / taskTargetValue) * 100)}%`,
                      background: overTarget ? 'var(--color-primary)' : 'var(--color-traffic-green)', transition: 'width .3s',
                    }} />
                  </div>
                </>
              )}
            </div>
          )
        })()}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label={goalLabel || 'Valor planeado'} type="number" min={0} value={msPlanned} onChange={e => setMsPlanned(e.target.value)} />
          <DatePicker
            label="Data limite"
            value={msDate}
            onChange={val => setMsDate(val)}
            min={taskStartDate}
            max={taskEndDate}
            hint={taskStartDate && taskEndDate ? `Entre ${taskStartDate.split('-').reverse().join('/')} e ${taskEndDate.split('-').reverse().join('/')}` : undefined}
          />
        </div>
      </div>

      {/* ── Técnico responsável (DEPARTAMENTO only) */}
      {deptUsers && deptUsers.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MsSectionHeader icon={<FileText size={12} style={{ color: 'var(--color-primary)' }} />} label="Técnico Responsável" />
          <SearchableSelect
            label="Responsável pelo marco *"
            options={[
              { value: '', label: '— Seleccionar técnico —' },
              ...deptUsers.map(u => ({
                value: String(u.id),
                label: u.id === currentUserId ? `${u.name} (eu próprio)` : u.name,
              })),
            ]}
            value={msAssignedTo}
            onChange={setMsAssignedTo}
          />
          {!msAssignedTo && (
            <p style={{ fontSize: 11, color: 'var(--color-traffic-red)', fontWeight: 600, marginTop: -4 }}>
              ⚠ O técnico responsável é obrigatório
            </p>
          )}
        </div>
      )}

      {/* ── Notas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <MsSectionHeader icon={<FileText size={12} style={{ color: 'var(--color-primary)' }} />} label="Notas" />
        <Textarea rows={2} value={msNotes} onChange={e => setMsNotes(e.target.value)} placeholder="Observações adicionais…" />
      </div>

    </div>
  )
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const taskId = Number(id)
  const { can, user, isDepartamento } = useAuth()
  const qc = useQueryClient()

  const [editModal, setEditModal] = useState(false)
  const [indicadorModal, setIndicadorModal] = useState(false)
  const [updateMs, setUpdateMs] = useState<any | null>(null)
  const [blockerModal, setBlockerModal] = useState<number | null>(null)
  const [rejectModal, setRejectModal] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Indicador form state
  const [msTitle, setMsTitle] = useState('')
  const [msScopeType, setMsScopeType] = useState<ScopeType | ''>('')
  const [msScopeId, setMsScopeId] = useState('')
  const [msPlanned, setMsPlanned] = useState('')
  const [msDate, setMsDate] = useState('')
  const [msNotes, setMsNotes] = useState('')
  const [msAssignedTo, setMsAssignedTo] = useState('')

  // Blocker form state
  const [blType, setBlType] = useState<BlockerType>('LOGISTIC')
  const [blDesc, setBlDesc] = useState('')
  const [blSla, setBlSla] = useState('3')

  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => tasksService.get(taskId),
  })

  const { data: indicadoresData } = useQuery({
    queryKey: ['indicadores', { task_id: taskId }],
    queryFn: () => milestonesService.list(taskId),
    enabled: !!taskId,
  })

  const { data: blockersData } = useQuery({
    queryKey: ['blockers', { entity_type: 'TASK', entity_id: taskId }],
    queryFn: () => blockersService.list({ entity_type: 'TASK', entity_id: taskId }),
    enabled: !!taskId,
  })

  const { data: forecast } = useQuery({
    queryKey: ['dashboard', 'forecast', { task_id: taskId }],
    queryFn: () => dashboardService.getForecast(taskId),
    enabled: !!taskId,
  })

  // Geo data for indicador scope picker
  const { data: ascsData }    = useQuery({ queryKey: ['geo', 'ascs'],    queryFn: () => geoService.listAscs()    })
  const { data: regioesData } = useQuery({ queryKey: ['geo', 'regioes'], queryFn: () => geoService.listRegioes() })

  // Dept users — only for DEPARTAMENTO role (to assign indicadores to technicians)
  const { data: deptOverview } = useQuery({
    queryKey: ['dashboard', 'departamento-overview'],
    queryFn: dashboardService.getDepartamentoOverview,
    enabled: isDepartamento(),
  })
  const deptUsers: { id: number; name: string }[] = isDepartamento() ? (deptOverview?.users ?? []) : []

  const updateTask = useMutation({
    mutationFn: (payload: Partial<CreateTaskPayload>) => tasksService.update(taskId, payload),
    onSuccess: () => { toast.success('Acção actualizada.'); qc.invalidateQueries({ queryKey: ['tasks', taskId] }); setEditModal(false) },
    onError: () => toast.error('Erro ao actualizar acção.'),
  })

  const createMs = useMutation({
    mutationFn: (p: CreateMilestonePayload) => milestonesService.create(taskId, p),
    onSuccess: () => { toast.success('Indicador criado.'); qc.invalidateQueries({ queryKey: ['indicadores'] }); setIndicadorModal(false) },
    onError: () => toast.error('Erro ao criar indicador.'),
  })

  const createBlocker = useMutation({
    mutationFn: (p: CreateBlockerPayload) => blockersService.create(p),
    onSuccess: () => { toast.success('Impedimento registado.'); qc.invalidateQueries({ queryKey: ['blockers'] }); setBlockerModal(null) },
    onError: () => toast.error('Erro ao criar impedimento.'),
  })

  const approveBlocker = useMutation({
    mutationFn: (id: number) => blockersService.approve(id),
    onSuccess: () => { toast.success('Impedimento aprovado.'); qc.invalidateQueries({ queryKey: ['blockers'] }) },
    onError: () => toast.error('Erro ao aprovar.'),
  })

  const rejectBlocker = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => blockersService.reject(id, reason),
    onSuccess: () => { toast.success('Impedimento rejeitado.'); qc.invalidateQueries({ queryKey: ['blockers'] }); setRejectModal(null) },
    onError: () => toast.error('Erro ao rejeitar.'),
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  if (!task) return <div style={{ padding: 40 }}>Acção não encontrada.</div>

  const indicadores = indicadoresData?.data ?? []
  const blockers = blockersData?.data ?? []
  const startVal = task.start_value ?? 0
  const currentVal = task.current_value ?? 0
  const targetVal = task.target_value ?? 0
  const pct = targetVal > startVal ? Math.min(100, ((currentVal - startVal) / (targetVal - startVal)) * 100) : 0

  const totalPlanned = indicadores.reduce((sum: number, m: any) => sum + (m.planned_value ?? 0), 0)
  const unassigned = Math.max(0, targetVal - totalPlanned)

  // Resolve scope label from loaded geo data
  const scopeLabelFor = (m: any): string | undefined => {
    if (!m.scope_type || !m.scope_id) return undefined
    if (m.scope_type === 'ASC') {
      const asc = ascsData?.data?.find((a: any) => a.id === m.scope_id)
      return asc ? asc.name : `ASC #${m.scope_id}`
    }
    if (m.scope_type === 'REGIONAL' || m.scope_type === 'REGIAO') {
      const r = regioesData?.data?.find((r: any) => r.id === m.scope_id)
      return r ? r.name : `Região #${m.scope_id}`
    }
    if (m.scope_type === 'NACIONAL') return 'Nacional'
    return undefined
  }

  const forecastData = forecast ? [
    { period: 'Início', actual: forecast.start_value },
    { period: 'Actual', actual: forecast.current_value },
    { period: 'Projecção', projected: forecast.current_value },
    { period: 'Fim', projected: forecast.projected_final_value },
  ] : []

  const handleCreateMs = () => {
    createMs.mutate({
      title: msTitle, scope_type: msScopeType || undefined,
      scope_id: msScopeId ? Number(msScopeId) : undefined,
      planned_value: Number(msPlanned), planned_date: msDate, notes: msNotes,
      assigned_to: msAssignedTo ? Number(msAssignedTo) : undefined,
    })
  }

  const handleCreateBlocker = () => {
    if (!blockerModal) return
    createBlocker.mutate({ entity_type: 'TASK', entity_id: blockerModal, blocker_type: blType, description: blDesc, sla_days: Number(blSla) })
  }

  return (
    <div>
      <PageHeader
        eyebrow="Acções"
        title={task.title}
        subtitle={task.description}
        badges={
          <>
            <Badge variant="default">{FREQ_LABEL[task.frequency]}</Badge>
            <Badge variant="orange">{task.goal_label}</Badge>
            <Badge variant="default">{fmtDate(task.start_date)} → {fmtDate(task.end_date)}</Badge>
          </>
        }
        actions={
          can('create:task') && (
            <Button variant="secondary" icon={<Pencil size={14} />} onClick={() => setEditModal(true)}>
              Editar
            </Button>
          )
        }
      />

      {/* Goal tracker */}
      <Card variant="elevated" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>{task.goal_label}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 12 }}>
          {[
            { l: 'Início', v: startVal },
            { l: 'Actual', v: currentVal, highlight: true },
            { l: 'Objectivo', v: targetVal },
          ].map(item => (
            <div key={item.l} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{item.l}</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: item.highlight ? 'var(--color-primary)' : 'var(--color-text)' }}>{(item.v ?? 0).toLocaleString('pt-PT')}</p>
            </div>
          ))}
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Progresso</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: pct >= 90 ? 'var(--color-traffic-green)' : pct >= 60 ? 'var(--color-traffic-yellow)' : 'var(--color-traffic-red)' }}>{pct.toFixed(1)}%</p>
          </div>
        </div>
        <ProgressBar value={pct} variant="auto" height={10} showLabel />

        {/* Indicador coverage hint */}
        {indicadores.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text)' }}>{totalPlanned.toLocaleString('pt-PT')}</strong> atribuídos em indicadores
            </span>
            {unassigned > 0 ? (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-traffic-red)' }}>
                ⚠ {unassigned.toLocaleString('pt-PT')} por distribuir por indicadores
              </span>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-traffic-green)' }}>
                ✓ Objectivo totalmente distribuído por indicadores
              </span>
            )}
          </div>
        )}
      </Card>

      {forecast && (
        <div style={{ marginBottom: 20 }}>
          <ForecastAlert
            willReachTarget={forecast.will_reach_target}
            targetValue={forecast.target_value}
            velocityPerDay={forecast.velocity_per_day}
            daysRemaining={forecast.days_remaining}
            projectedFinalValue={forecast.projected_final_value}
            message={forecast.alert_message ?? undefined}
          />
        </div>
      )}

      <Tabs tabs={[
        { key: 'indicadores', label: `Indicadores (${indicadores.length})` },
        { key: 'forecast', label: 'Previsão' },
        { key: 'blockers', label: `Impedimentos (${blockers.length})` },
        { key: 'scopes', label: 'Âmbito' },
      ]}>
        {(activeTab) => {
          if (activeTab === 'indicadores') return (
            <div>
              {can('update:milestone') && (
                <div style={{ marginBottom: 16 }}>
                  <Button variant="primary" icon={<Plus size={14} />} onClick={() => { setMsTitle(''); setMsDate(''); setMsPlanned(''); setMsAssignedTo(''); setIndicadorModal(true) }}>
                    Novo Indicador
                  </Button>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {indicadores.map(m => (
                  <MilestoneCard
                    key={m.id}
                    title={m.title}
                    scopeLabel={scopeLabelFor(m)}
                    plannedValue={m.planned_value}
                    achievedValue={m.achieved_value}
                    plannedDate={m.planned_date}
                    achievedDate={m.achieved_date}
                    status={m.status}
                    hasPhoto={!!m.photo_url}
                    notes={m.notes}
                    onUpdate={can('update:milestone') && m.status !== 'DONE' ? () => setUpdateMs(m) : undefined}
                  />
                ))}
                {indicadores.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Nenhum indicador criado.</p>}
              </div>
            </div>
          )

          if (activeTab === 'forecast') return (
            <Card variant="elevated">
              {forecast && forecastData.length > 0
                ? <ForecastChart data={forecastData} target={forecast.target_value} height={300} willReach={forecast.will_reach_target} />
                : <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Sem dados de previsão.</p>
              }
              {forecast && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 20 }}>
                  {[
                    { l: 'Velocidade/dia', v: Math.round(forecast.velocity_per_day).toLocaleString('pt-PT') },
                    { l: 'Dias restantes', v: forecast.days_remaining },
                    { l: 'Projecção final', v: forecast.projected_final_value.toLocaleString('pt-PT') },
                  ].map(item => (
                    <div key={item.l} style={{ textAlign: 'center', padding: '12px 16px', background: 'var(--color-surface-muted)', borderRadius: 10 }}>
                      <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{item.l}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>{item.v}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )

          if (activeTab === 'blockers') return (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button variant="secondary" icon={<Plus size={14} />} onClick={() => { setBlockerModal(taskId); setBlDesc(''); setBlSla('3') }}>
                  Reportar Impedimento
                </Button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                {blockers.map(b => (
                  <BlockerCard
                    key={b.id}
                    blockerType={b.blocker_type}
                    description={b.description}
                    status={b.status}
                    slaDays={b.sla_days}
                    rejectionReason={b.rejection_reason ?? undefined}
                    onApprove={can('approve:blocker') && b.status === 'PENDING' ? () => approveBlocker.mutate(b.id) : undefined}
                    onReject={can('approve:blocker') && b.status === 'PENDING' ? () => { setRejectModal(b.id); setRejectReason('') } : undefined}
                  />
                ))}
                {blockers.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Sem impedimentos activos.</p>}
              </div>
            </div>
          )

          if (activeTab === 'scopes') {
            const ascs    = ascsData?.data    ?? []
            const regioes = regioesData?.data ?? []

            // Task-level progress (same for all scopes of this task)
            const taskProgress = {
              currentValue: task.current_value ?? 0,
              targetValue:  task.target_value  ?? 0,
              startValue:   task.start_value   ?? 0,
              taskCount:    1,
              taskTitles:   [task.title],
            }

            const mapFeatures = (task.scopes ?? []).flatMap(s => {
              if (s.scope_type === 'ASC') {
                const asc = ascs.find(a => a.id === s.scope_id)
                if (asc?.polygon) return [{ name: asc.name, scopeType: 'ASC', geometry: asc.polygon as any, ...taskProgress }]
              }
              if (s.scope_type === 'REGIAO') {
                const reg = regioes.find(r => r.id === s.scope_id)
                if (reg?.polygon) return [{ name: reg.name, scopeType: 'Região', geometry: reg.polygon as any, ...taskProgress }]
              }
              return []
            })

            const scopeLabels = (task.scopes ?? []).map(s => {
              const name = s.scope_name
                ?? (s.scope_type === 'ASC'    ? ascs.find(a    => a.id === s.scope_id)?.name : undefined)
                ?? (s.scope_type === 'REGIAO' ? regioes.find(r => r.id === s.scope_id)?.name : undefined)
                ?? (s.scope_type === 'NACIONAL' ? 'Nacional' : `ID ${s.scope_id}`)
              return { name, scope_type: s.scope_type }
            })

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Map */}
                {mapFeatures.length > 0 ? (
                  <ScopeMap features={mapFeatures} height={420} />
                ) : (
                  <div style={{ padding: '20px', background: 'var(--color-surface-muted)', borderRadius: 12, border: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <MapPin size={24} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {task.scopes?.length ? 'Polígonos não disponíveis para este âmbito.' : 'Âmbito nacional — sem restrição geográfica.'}
                    </p>
                  </div>
                )}

                {/* Scope chips */}
                {scopeLabels.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {scopeLabels.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--color-primary-soft)', borderRadius: 20, border: '1px solid var(--color-primary)30' }}>
                        <MapPin size={11} style={{ color: 'var(--color-primary)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.scope_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          }
          return null
        }}
      </Tabs>

      {/* Create Indicador Modal */}
      <Modal open={indicadorModal} onClose={() => setIndicadorModal(false)} title="Novo Indicador" width={540}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIndicadorModal(false)}>Cancelar</Button>
            <Button
              variant="primary"
              icon={<Plus size={13} />}
              onClick={handleCreateMs}
              loading={createMs.isPending}
              disabled={isDepartamento() && deptUsers.length > 0 && !msAssignedTo}
            >
              Criar
            </Button>
          </>
        }
      >
        <IndicadorForm
          msTitle={msTitle} setMsTitle={setMsTitle}
          msScopeType={msScopeType} setMsScopeType={v => { setMsScopeType(v); setMsScopeId('') }}
          msScopeId={msScopeId} setMsScopeId={setMsScopeId}
          msPlanned={msPlanned} setMsPlanned={setMsPlanned}
          msDate={msDate} setMsDate={setMsDate}
          msNotes={msNotes} setMsNotes={setMsNotes}
          ascs={ascsData?.data ?? []}
          regioes={regioesData?.data ?? []}
          goalLabel={task?.goal_label}
          deptUsers={deptUsers.length > 0 ? deptUsers : undefined}
          msAssignedTo={msAssignedTo} setMsAssignedTo={setMsAssignedTo}
          currentUserId={user?.id}
          taskStartDate={task?.start_date ? task.start_date.slice(0, 10) : undefined}
          taskEndDate={task?.end_date ? task.end_date.slice(0, 10) : undefined}
          taskTargetValue={targetVal}
          taskTotalPlanned={totalPlanned}
        />
      </Modal>

      {/* Update Indicador — shared ProgressModal */}
      {updateMs && (
        <ProgressModal
          ms={updateMs}
          goalLabel={task?.goal_label}
          onClose={() => setUpdateMs(null)}
          onSuccess={() => {
            setUpdateMs(null)
            qc.invalidateQueries({ queryKey: ['indicadores'] })
            qc.invalidateQueries({ queryKey: ['tasks', taskId] })
          }}
        />
      )}

      {/* Blocker modal */}
      <Modal open={!!blockerModal} onClose={() => setBlockerModal(null)} title="Reportar Impedimento" width={480}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBlockerModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={handleCreateBlocker} loading={createBlocker.isPending}>Reportar</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Tipo" options={BLOCKER_TYPE_OPTS} value={blType} onChange={e => setBlType(e.target.value as BlockerType)} />
            <Input label="SLA (dias)" type="number" min={1} value={blSla} onChange={e => setBlSla(e.target.value)} />
          </div>
          <Textarea label="Descrição" rows={4} value={blDesc} onChange={e => setBlDesc(e.target.value)} placeholder="Descreva o impedimento em detalhe…" />
        </div>
      </Modal>

      {/* Edit task modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Acção" width={620}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" form="edit-task-form" loading={updateTask.isPending}>Guardar</Button>
          </>
        }
      >
        <TaskForm
          id="edit-task-form"
          projectId={task.project_id}
          onSubmit={payload => updateTask.mutate(payload)}
          initialScopes={(task.scopes ?? []).map(s => ({
            scope_type: s.scope_type as ScopeType,
            scope_id:   s.scope_id ?? 0,
            name:       s.scope_name ?? `#${s.scope_id}`,
          }))}
          defaultValues={{
            title:        task.title,
            description:  task.description ?? '',
            owner_type:   task.owner_type as any,
            owner_id:     task.owner_id,
            frequency:    task.frequency as any,
            goal_label:   task.goal_label,
            start_value:  task.start_value ?? 0,
            target_value: task.target_value ?? 0,
            weight:       task.weight ?? 100,
            start_date:   task.start_date ? task.start_date.slice(0, 10) : '',
            end_date:     task.end_date   ? task.end_date.slice(0, 10)   : '',
          }}
        />
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Rejeitar impedimento" width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => rejectModal && rejectBlocker.mutate({ id: rejectModal, reason: rejectReason })} loading={rejectBlocker.isPending}>Rejeitar</Button>
          </>
        }
      >
        <Textarea label="Motivo da rejeição" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Indique o motivo…" />
      </Modal>
    </div>
  )
}
