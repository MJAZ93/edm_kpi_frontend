import React, { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, MapPin, Target, Pencil, User, Trophy, Trash2, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'
import { tasksService } from '../../services/tasks.service'
import { milestonesService } from '../../services/milestones.service'
import { blockersService } from '../../services/blockers.service'
import { dashboardService } from '../../services/dashboard.service'
import { geoService } from '../../services/geo.service'
import { orgService } from '../../services/org.service'
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
import MilestoneDetailModal from '../../components/domain/MilestoneDetailModal'
import ForecastAlert from '../../components/domain/ForecastAlert'
import ForecastChart from '../../components/charts/ForecastChart'
import ScopeMap from '../../components/map/ScopeMap'
import HistoryTab from '../../components/domain/HistoryTab'
import TaskForm from './TaskForm'
import QuickFeedbackModal from '../../components/domain/QuickFeedbackModal'
import EntityFeedbackTab from '../../components/domain/EntityFeedbackTab'
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

const TL_COLORS = {
  GREEN:  { text: 'var(--color-traffic-green)' },
  YELLOW: { text: 'var(--color-traffic-yellow)' },
  RED:    { text: 'var(--color-traffic-red)' },
}

function getTrafficLight(score: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (score >= 90) return 'GREEN'
  if (score >= 60) return 'YELLOW'
  return 'RED'
}

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
  msFrequency: string; setMsFrequency: (v: string) => void
  msPlanned: string; setMsPlanned: (v: string) => void
  msDate: string; setMsDate: (v: string) => void
  msNotes: string; setMsNotes: (v: string) => void
  ascs: ASC[]; regioes: Regiao[]
  goalLabel?: string
  deptUsers?: { id: number; name: string }[]
  msAssignedTo: string; setMsAssignedTo: (v: string) => void
  msAggType: string; setMsAggType: (v: string) => void
  currentUserId?: number
  taskStartDate?: string   // YYYY-MM-DD
  taskEndDate?: string     // YYYY-MM-DD
  taskTargetValue?: number
  taskTotalPlanned?: number  // sum of already-created indicadores
  taskAggType?: string       // SUM_UP, SUM_DOWN, AVG, LAST, MANUAL
  isReduction?: boolean      // target < start (lower = better)
}

const FREQ_OPTS = [
  { value: 'DAILY', label: 'Diária' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'QUARTERLY', label: 'Trimestral' },
  { value: 'BIANNUAL', label: 'Semestral' },
  { value: 'ANNUAL', label: 'Anual' },
]

const MS_AGG_OPTS = [
  { value: 'SUM_UP', label: 'Somatório (acumula)' },
  { value: 'AVG',    label: 'Média' },
  { value: 'LAST',   label: 'Último valor' },
  { value: 'MANUAL', label: 'Manual' },
]

function IndicadorForm({ msTitle, setMsTitle, msScopeType, setMsScopeType, msScopeId, setMsScopeId, msFrequency, setMsFrequency, msPlanned, setMsPlanned, msDate, setMsDate, msNotes, setMsNotes, ascs, regioes, goalLabel, deptUsers, msAssignedTo, setMsAssignedTo, msAggType, setMsAggType, currentUserId, taskStartDate, taskEndDate, taskTargetValue, taskTotalPlanned, taskAggType, isReduction }: IndicadorFormProps) {
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
        <SearchableSelect
          label="Periodicidade de actualização"
          options={FREQ_OPTS}
          value={msFrequency}
          onChange={setMsFrequency}
        />
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
          const isAvg = taskAggType === 'AVG'
          const thisVal = Number(msPlanned) || 0

          // AVG mode: each indicator has its own target (= task target). No SUM distribution.
          if (isAvg) {
            const matchesTarget = thisVal > 0 && Math.abs(thisVal - taskTargetValue) < 0.01
            return (
              <div style={{ padding: '10px 14px', background: 'var(--color-surface-muted)', borderRadius: 10, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isReduction ? 'Alvo mensal (redução)' : 'Alvo mensal da acção'}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)' }}>{taskTargetValue.toLocaleString('pt-PT')} {goalLabel ?? ''}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)' }}>Agregação</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>Média {isReduction ? '(menor = melhor)' : ''}</span>
                </div>
                {thisVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: matchesTarget ? 'var(--color-traffic-green)' : 'var(--color-text-muted)' }}>
                      Valor deste indicador
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: matchesTarget ? 'var(--color-traffic-green)' : 'var(--color-primary)' }}>
                      {thisVal.toLocaleString('pt-PT')} {matchesTarget ? '✓' : ''}
                    </span>
                  </div>
                )}
              </div>
            )
          }

          // SUM mode: distribute target across indicators
          const alreadyPlanned = taskTotalPlanned
          const remaining = taskTargetValue - alreadyPlanned
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
                      Com este indicador
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: overTarget ? 'var(--color-primary)' : 'var(--color-traffic-green)' }}>
                      {afterThis.toLocaleString('pt-PT')} ({afterPct.toFixed(0)}%)
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
          <Input label={goalLabel || 'Valor planeado'} type="number" min={0} step="any" value={msPlanned} onChange={e => setMsPlanned(e.target.value)} />
          <DatePicker
            label="Data limite"
            value={msDate}
            onChange={val => setMsDate(val)}
            min={taskStartDate}
            max={taskEndDate}
            hint={taskStartDate && taskEndDate ? `Entre ${taskStartDate.split('-').reverse().join('/')} e ${taskEndDate.split('-').reverse().join('/')}` : undefined}
          />
        </div>
        <Select label="Tipo de incidência" options={MS_AGG_OPTS} value={msAggType} onChange={e => setMsAggType(e.target.value)} />
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
  const { can, user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  /** DEPARTAMENTO users can only edit milestones assigned to them */
  const canEditMilestone = (m: { assigned_to?: number }) => {
    if (user?.role === 'DEPARTAMENTO') return m.assigned_to === user?.id
    return can('update:milestone')
  }

  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [taskFormValid, setTaskFormValid] = useState(true)
  const [indicadorModal, setIndicadorModal] = useState(false)
  const [progressMs, setProgressMs] = useState<any | null>(null)
  const [editingMilestone, setEditingMilestone] = useState<any | null>(null)
  const [detailMsId, setDetailMsId] = useState<number | null>(null)
  const [blockerModal, setBlockerModal] = useState<number | null>(null)
  const [rejectModal, setRejectModal] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  // Indicador form state
  const [msTitle, setMsTitle] = useState('')
  const [msScopeType, setMsScopeType] = useState<ScopeType | ''>('')
  const [msScopeId, setMsScopeId] = useState('')
  const [msFrequency, setMsFrequency] = useState('MONTHLY')
  const [msPlanned, setMsPlanned] = useState('')
  const [msDate, setMsDate] = useState('')
  const [msNotes, setMsNotes] = useState('')
  const [msAssignedTo, setMsAssignedTo] = useState('')
  const [msAggType, setMsAggType] = useState('SUM_UP')
  const [feedbackModal, setFeedbackModal] = useState(false)
  const [feedbackMs, setFeedbackMs] = useState<{ id: number; title: string; assigneeName?: string; assigneeId?: number } | null>(null)

  // Blocker form state
  const [blType, setBlType] = useState<BlockerType>('LOGISTIC')
  const [blDesc, setBlDesc] = useState('')
  const [blSla, setBlSla] = useState('3')

  // Manual value override
  const [manualValue, setManualValue] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)

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

  // Geo data — light (names only) for scope picker; full (with polygons) for map
  // Geo data — read-only from cache (populated by AppShell)
  const qcRef = useQueryClient()
  const ascsData    = qcRef.getQueryData<any>(['geo', 'ascs'])
  const regioesData = qcRef.getQueryData<any>(['geo', 'regioes'])
  const [activeTab, setActiveTab] = useState('blockers')
  // Always load polygons for the inline map section
  const { data: ascsGeo }     = useQuery({ queryKey: ['geo', 'ascs', 'polygon'],    queryFn: () => geoService.listAscs({ includePolygon: true }), staleTime: Infinity })
  const { data: regioesGeo }  = useQuery({ queryKey: ['geo', 'regioes', 'polygon'], queryFn: () => geoService.listRegioes({ includePolygon: true }), staleTime: Infinity })

  const { data: taskOwnerDept } = useQuery({
    queryKey: ['departamentos', task?.owner_id, 'task-owner'],
    queryFn: () => orgService.getDepartamento(task!.owner_id),
    enabled: !!task && task.owner_type === 'DEPARTAMENTO',
  })
  const deptUsers = useMemo(() => {
    const seen = new Set<number>()
    const users: { id: number; name: string }[] = []
    const responsible = taskOwnerDept?.responsible

    if (responsible && !seen.has(responsible.id)) {
      seen.add(responsible.id)
      users.push({ id: responsible.id, name: responsible.name })
    }
    ;(taskOwnerDept?.users ?? []).forEach((u) => {
      if (!seen.has(u.id)) {
        seen.add(u.id)
        users.push({ id: u.id, name: u.name })
      }
    })

    return users
  }, [taskOwnerDept])

  const updateTask = useMutation({
    mutationFn: (payload: Partial<CreateTaskPayload>) => tasksService.update(taskId, payload),
    onSuccess: () => { toast.success('Acção actualizada.'); qc.invalidateQueries({ queryKey: ['tasks', taskId] }); qc.invalidateQueries({ queryKey: ['indicadores'] }); setEditModal(false) },
    onError: () => toast.error('Erro ao actualizar acção.'),
  })

  const saveManualValue = useMutation({
    mutationFn: (val: number) => tasksService.update(taskId, { current_value: val } as any),
    onSuccess: () => { toast.success('Valor actual actualizado.'); qc.invalidateQueries({ queryKey: ['tasks', taskId] }); setShowManualInput(false) },
    onError: () => toast.error('Erro ao actualizar valor.'),
  })

  const deleteTask = useMutation({
    mutationFn: () => tasksService.remove(taskId),
    onSuccess: () => { toast.success('Acção eliminada.'); navigate(`/projects/${task?.project_id}`) },
    onError: () => toast.error('Erro ao eliminar acção.'),
  })

  const createMs = useMutation({
    mutationFn: (p: CreateMilestonePayload) => milestonesService.create(taskId, p),
    onSuccess: () => { toast.success('Indicador criado.'); qc.invalidateQueries({ queryKey: ['indicadores'] }); setIndicadorModal(false) },
    onError: () => toast.error('Erro ao criar indicador.'),
  })

  const updateMilestone = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateMilestonePayload> }) => milestonesService.update(id, payload),
    onSuccess: () => {
      toast.success('Indicador actualizado.')
      qc.invalidateQueries({ queryKey: ['indicadores'] })
      qc.invalidateQueries({ queryKey: ['tasks', taskId] })
      if (editingMilestone?.id) {
        qc.invalidateQueries({ queryKey: ['milestone-detail', editingMilestone.id] })
      }
      setEditingMilestone(null)
    },
    onError: () => toast.error('Erro ao actualizar indicador.'),
  })

  const createBlocker = useMutation({
    mutationFn: (p: CreateBlockerPayload) => blockersService.create(p),
    onSuccess: () => { toast.success('Constrangimento registado.'); qc.invalidateQueries({ queryKey: ['blockers'] }); setBlockerModal(null) },
    onError: () => toast.error('Erro ao criar constrangimento.'),
  })

  const approveBlocker = useMutation({
    mutationFn: (id: number) => blockersService.approve(id),
    onSuccess: () => { toast.success('Constrangimento aprovado.'); qc.invalidateQueries({ queryKey: ['blockers'] }) },
    onError: () => toast.error('Erro ao aprovar.'),
  })

  const rejectBlocker = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => blockersService.reject(id, reason),
    onSuccess: () => { toast.success('Constrangimento rejeitado.'); qc.invalidateQueries({ queryKey: ['blockers'] }); setRejectModal(null) },
    onError: () => toast.error('Erro ao rejeitar.'),
  })

  const indicadores = indicadoresData?.data ?? []
  const blockers = blockersData?.data ?? []
  const startVal = task?.start_value ?? 0
  const currentVal = task?.current_value ?? 0
  const targetVal = task?.target_value ?? 0
  const goalDiff = targetVal - startVal
  // Universal formula: works for growth (target > start) AND reduction (target < start)
  // Allows negative progress when going opposite direction of target
  const pct = goalDiff !== 0 ? Math.min(100, ((currentVal - startVal) / goalDiff) * 100) : 100
  const isReduction = targetVal < startVal

  const totalPlanned = indicadores.reduce((sum: number, m: any) => sum + (m.planned_value ?? 0), 0)
  const aggType = task?.aggregation_type ?? 'SUM_UP'
  // For AVG tasks, check if each indicator's planned ≈ target; for SUM, check sum vs target
  const unassigned = (aggType === 'AVG' || aggType === 'LAST' || aggType === 'MANUAL')
    ? 0  // AVG/LAST/MANUAL: sum doesn't apply
    : Math.max(0, targetVal - totalPlanned)

  const workerRanking = useMemo(() => {
    if (!task || task.owner_type !== 'DEPARTAMENTO' || deptUsers.length === 0) return []

    const userMap = new Map<number, {
      id: number
      name: string
      planned: number
      achieved: number
      msTotal: number
      msDone: number
    }>()

    deptUsers.forEach((u) => {
      userMap.set(u.id, { id: u.id, name: u.name, planned: 0, achieved: 0, msTotal: 0, msDone: 0 })
    })

    indicadores.forEach((m: any) => {
      const assigneeId = m.assigned_to ?? task.assigned_to
      if (!assigneeId || !userMap.has(assigneeId)) return

      const current = userMap.get(assigneeId)!
      current.planned += m.planned_value ?? 0
      current.achieved += m.achieved_value ?? 0
      current.msTotal += 1
      if (m.status === 'DONE') current.msDone += 1
    })

    return Array.from(userMap.values())
      .map((worker) => {
        const executionScore = worker.planned > 0
          ? isReduction
            ? Math.min(100, (worker.planned / worker.achieved) * 100)
            : Math.min(100, (worker.achieved / worker.planned) * 100)
          : 0
        const totalScore = Number(executionScore.toFixed(1))
        return {
          ...worker,
          totalScore,
          trafficLight: getTrafficLight(totalScore),
        }
      })
      .sort((a, b) =>
        b.totalScore - a.totalScore ||
        b.msDone - a.msDone ||
        b.msTotal - a.msTotal ||
        a.name.localeCompare(b.name),
      )
      .map((worker, index) => ({ ...worker, rank: index + 1 }))
  }, [deptUsers, indicadores, task?.assigned_to, task?.owner_type, isReduction])

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  if (!task) return <div style={{ padding: 40 }}>Acção não encontrada.</div>

  const resetMilestoneForm = () => {
    setMsTitle('')
    setMsScopeType('')
    setMsScopeId('')
    setMsFrequency(task?.frequency ?? 'MONTHLY')
    setMsPlanned('')
    setMsDate('')
    setMsNotes('')
    setMsAssignedTo('')
    setMsAggType('SUM_UP')
  }

  const openCreateMilestone = () => {
    resetMilestoneForm()
    setIndicadorModal(true)
  }

  const openEditMilestone = (ms: any) => {
    setMsTitle(ms.title ?? '')
    setMsScopeType(ms.scope_type === 'REGIONAL' ? 'REGIAO' : (ms.scope_type ?? ''))
    setMsScopeId(ms.scope_id ? String(ms.scope_id) : '')
    setMsFrequency(ms.frequency ?? task?.frequency ?? 'MONTHLY')
    setMsPlanned(String(ms.planned_value ?? ''))
    setMsDate(ms.planned_date ? String(ms.planned_date).slice(0, 10) : '')
    setMsNotes(ms.notes ?? '')
    setMsAssignedTo(ms.assigned_to ? String(ms.assigned_to) : '')
    setMsAggType(ms.aggregation_type ?? 'SUM_UP')
    setEditingMilestone(ms)
  }

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
      frequency: msFrequency as any,
      planned_value: Number(msPlanned), planned_date: msDate, notes: msNotes,
      assigned_to: msAssignedTo ? Number(msAssignedTo) : undefined,
      aggregation_type: msAggType as any,
    })
  }

  const handleUpdateMilestone = () => {
    if (!editingMilestone) return

    updateMilestone.mutate({
      id: editingMilestone.id,
      payload: {
        title: msTitle,
        scope_type: msScopeType || undefined,
        scope_id: msScopeId ? Number(msScopeId) : undefined,
        frequency: msFrequency as any,
        planned_value: Number(msPlanned),
        planned_date: msDate,
        notes: msNotes,
        assigned_to: msAssignedTo ? Number(msAssignedTo) : undefined,
        aggregation_type: msAggType as any,
      },
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
        onBack={() => navigate(-1)}
        badges={
          <>
            <Badge variant="default">{FREQ_LABEL[task.frequency]}</Badge>
            <Badge variant="orange">{task.goal_label}</Badge>
            <Badge variant="default">{fmtDate(task.start_date)} → {fmtDate(task.end_date)}</Badge>
            {task.assignee?.name && <Badge variant="default"><User size={11} style={{ marginRight: 4 }} />{task.assignee.name}</Badge>}
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" icon={<MessageSquare size={14} />} onClick={() => setFeedbackModal(true)}>
              Feedback
            </Button>
            {can('create:task') && (
              <Button variant="secondary" icon={<Pencil size={14} />} onClick={() => setEditModal(true)}>
                Editar
              </Button>
            )}
            {(user?.role === 'ADMIN' || user?.role === 'CA') && (
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setDeleteModal(true)}>
                Eliminar
              </Button>
            )}
          </div>
        }
      />

      {/* Goal tracker */}
      <Card variant="elevated" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{task.goal_label}</p>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
            background: isReduction ? 'var(--color-traffic-red-bg)' : 'var(--color-traffic-green-bg)',
            color: isReduction ? 'var(--color-traffic-red)' : 'var(--color-traffic-green)',
            border: `1px solid ${isReduction ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {isReduction ? '↓ Redução' : '↑ Crescimento'}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Início</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)' }}>{(startVal ?? 0).toLocaleString('pt-PT')}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Actual</p>
            {aggType === 'MANUAL' && showManualInput ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number" step="any" autoFocus
                  value={manualValue}
                  onChange={e => setManualValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && manualValue) saveManualValue.mutate(parseFloat(manualValue)); if (e.key === 'Escape') setShowManualInput(false) }}
                  style={{ width: 90, padding: '4px 8px', fontSize: 18, fontWeight: 800, textAlign: 'center', border: '2px solid var(--color-primary)', borderRadius: 8, background: 'var(--color-surface-strong)', color: 'var(--color-primary)', outline: 'none' }}
                />
                <button onClick={() => manualValue && saveManualValue.mutate(parseFloat(manualValue))} style={{ background: 'var(--color-primary)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>OK</button>
                <button onClick={() => setShowManualInput(false)} style={{ background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <p
                style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-primary)', cursor: aggType === 'MANUAL' ? 'pointer' : 'default' }}
                onClick={() => { if (aggType === 'MANUAL') { setManualValue(String(currentVal)); setShowManualInput(true) } }}
                title={aggType === 'MANUAL' ? 'Clique para editar' : undefined}
              >
                {(currentVal ?? 0).toLocaleString('pt-PT')}{aggType === 'MANUAL' && <Pencil size={12} style={{ marginLeft: 6, opacity: 0.5, verticalAlign: 'super' }} />}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Objectivo</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-text)' }}>{(targetVal ?? 0).toLocaleString('pt-PT')}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Progresso</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: pct >= 90 ? 'var(--color-traffic-green)' : pct >= 60 ? 'var(--color-traffic-yellow)' : 'var(--color-traffic-red)' }}>{pct.toFixed(1)}%</p>
          </div>
        </div>
        <ProgressBar value={Math.max(0, pct)} variant="auto" height={10} showLabel={pct >= 0} />
        {pct < 0 && (
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-traffic-red)', marginTop: 4 }}>
            Progresso negativo — {isReduction ? 'o valor subiu' : 'o valor desceu'} em vez de {isReduction ? 'descer' : 'subir'}
          </p>
        )}

        {/* Indicador coverage hint */}
        {indicadores.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--color-border)', flexWrap: 'wrap', gap: 8 }}>
            {(aggType === 'AVG' || aggType === 'LAST' || aggType === 'MANUAL') ? (
              <>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  <strong style={{ color: 'var(--color-text)' }}>{indicadores.length}</strong> indicadores ({aggType === 'AVG' ? 'média' : aggType === 'LAST' ? 'último valor' : 'manual'})
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-traffic-green)' }}>
                  ✓ Agregação {aggType === 'AVG' ? 'por média' : aggType === 'LAST' ? 'por último valor' : 'manual'}
                </span>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}
      </Card>

      {forecast && (
        <div style={{ marginBottom: 20 }}>
          <ForecastAlert
            willReachTarget={forecast.will_reach_target}
            targetValue={forecast.target_value}
            startValue={forecast.start_value}
            velocityPerDay={forecast.velocity_per_day}
            daysRemaining={forecast.days_remaining}
            projectedFinalValue={forecast.projected_final_value}
            message={forecast.alert_message ?? undefined}
          />
        </div>
      )}

      {/* ══ INDICADORES + PREVISÃO (side-by-side) ══════════════════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: forecast ? '1fr 1fr' : '1fr', gap: 20, marginBottom: 20 }}>
        {/* Left — Rich indicator list */}
        <Card variant="elevated" style={{ maxHeight: 520, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Indicadores
              </p>
              <Badge variant="default">{indicadores.length}</Badge>
            </div>
            {can('update:milestone') && (
              <Button variant="primary" size="sm" icon={<Plus size={12} />} onClick={openCreateMilestone}>
                Novo
              </Button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
            {indicadores.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <Target size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Nenhum indicador criado.</p>
              </div>
            ) : [...indicadores].sort((a: any, b: any) => (b.achieved_value ?? 0) - (a.achieved_value ?? 0)).map((m: any) => {
              const mPct = (() => {
                if (!m.planned_value) return 0
                if (isReduction) return Math.min(100, (m.planned_value / Math.max(m.achieved_value ?? 0.01, 0.01)) * 100)
                return Math.min(100, ((m.achieved_value ?? 0) / m.planned_value) * 100)
              })()
              const mTL = getTrafficLight(mPct)
              const tlColor = TL_COLORS[mTL]
              return (
                <div
                  key={m.id}
                  onClick={() => setDetailMsId(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--color-bg-strong)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.background = 'var(--color-primary-soft)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-bg-strong)' }}
                >
                  {/* Traffic light dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: tlColor.text,
                  }} />
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      {scopeLabelFor(m) && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', padding: '1px 6px', borderRadius: 4 }}>
                          <MapPin size={8} style={{ marginRight: 2, verticalAlign: 'middle' }} />{scopeLabelFor(m)}
                        </span>
                      )}
                      {m.assignee?.name && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                          <User size={8} style={{ marginRight: 2, verticalAlign: 'middle' }} />{m.assignee.name}
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)' }}>
                        {fmtDate(m.planned_date)}
                      </span>
                    </div>
                  </div>
                  {/* Values + mini progress */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', lineHeight: 1.2 }}>
                      {(m.achieved_value ?? 0).toLocaleString('pt-PT')} <span style={{ color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 10 }}>/ {(m.planned_value ?? 0).toLocaleString('pt-PT')}</span>
                    </p>
                    <div style={{ height: 4, borderRadius: 2, background: 'var(--color-border)', marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${Math.max(0, Math.min(100, mPct))}%`, background: tlColor.text, transition: 'width .3s' }} />
                    </div>
                  </div>
                  {/* Status badge */}
                  <Badge variant={m.status === 'DONE' ? 'success' : 'default'} style={{ flexShrink: 0, fontSize: 9 }}>
                    {m.status === 'DONE' ? '✓' : 'Pend.'}
                  </Badge>
                  {/* Chevron hint */}
                  <span style={{ fontSize: 14, color: 'var(--color-text-muted)', flexShrink: 0 }}>›</span>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Right — Forecast chart */}
        {forecast && (
          <Card variant="elevated" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <FileText size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Previsão
              </p>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {forecastData.length > 0
                ? <ForecastChart data={forecastData} target={forecast.target_value} height={280} willReach={forecast.will_reach_target} />
                : <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Sem dados de previsão.</p>
              }
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 16 }}>
              {[
                { l: 'Velocidade/dia', v: Math.round(forecast.velocity_per_day).toLocaleString('pt-PT') },
                { l: 'Dias restantes', v: forecast.days_remaining },
                { l: 'Projecção final', v: forecast.projected_final_value.toLocaleString('pt-PT') },
              ].map(item => (
                <div key={item.l} style={{ textAlign: 'center', padding: '10px 12px', background: 'var(--color-surface-muted)', borderRadius: 10 }}>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{item.l}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>{item.v}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ══ MAPA + COLABORADORES (side-by-side) ═══════════════════════════ */}
      {(() => {
        const geoAscs    = ascsGeo?.data    ?? ascsData?.data    ?? []
        const geoRegioes = regioesGeo?.data ?? regioesData?.data ?? []
        const taskProgress = {
          currentValue: task.current_value ?? 0,
          targetValue:  task.target_value  ?? 0,
          startValue:   task.start_value   ?? 0,
          taskCount:    1,
          taskTitles:   [task.title],
        }
        const scopeMapFeatures = (task.scopes ?? []).flatMap(s => {
          if (s.scope_type === 'ASC') {
            const asc = geoAscs.find((a: any) => a.id === s.scope_id)
            if (asc?.polygon) return [{ name: asc.name, scopeType: 'ASC', geometry: asc.polygon as any, ...taskProgress }]
          }
          if (s.scope_type === 'REGIAO') {
            const reg = geoRegioes.find((r: any) => r.id === s.scope_id)
            if (reg?.polygon) return [{ name: reg.name, scopeType: 'Região', geometry: reg.polygon as any, ...taskProgress }]
          }
          return []
        })
        const scopeLabels = (task.scopes ?? []).map(s => {
          const name = s.scope_name
            ?? (s.scope_type === 'ASC'    ? geoAscs.find((a: any)    => a.id === s.scope_id)?.name : undefined)
            ?? (s.scope_type === 'REGIAO' ? geoRegioes.find((r: any) => r.id === s.scope_id)?.name : undefined)
            ?? (s.scope_type === 'NACIONAL' ? 'Nacional' : `ID ${s.scope_id}`)
          return { name, scope_type: s.scope_type }
        })

        const hasMap = scopeMapFeatures.length > 0 || (task.scopes?.length ?? 0) > 0
        const hasCollaborators = task.owner_type === 'DEPARTAMENTO' && deptUsers.length > 0

        if (!hasMap && !hasCollaborators) return null

        return (
          <div style={{
            display: 'grid',
            gridTemplateColumns: hasMap && hasCollaborators ? '1fr 1fr' : '1fr',
            gap: 20, marginBottom: 20,
          }}>
            {/* Map */}
            {hasMap && (
              <Card variant="elevated">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <MapPin size={15} style={{ color: 'var(--color-primary)' }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Âmbito Geográfico
                  </p>
                </div>
                {scopeMapFeatures.length > 0 ? (
                  <ScopeMap features={scopeMapFeatures} height={340} />
                ) : (
                  <div style={{ padding: '32px 20px', background: 'var(--color-surface-muted)', borderRadius: 12, border: '1px solid var(--color-border)', textAlign: 'center' }}>
                    <MapPin size={24} style={{ color: 'var(--color-text-muted)', marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                      {task.scopes?.length ? 'Polígonos não disponíveis para este âmbito.' : 'Âmbito nacional — sem restrição geográfica.'}
                    </p>
                  </div>
                )}
                {scopeLabels.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                    {scopeLabels.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--color-primary-soft)', borderRadius: 20, border: '1px solid var(--color-primary)30' }}>
                        <MapPin size={10} style={{ color: 'var(--color-primary)' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{s.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase' }}>{s.scope_type}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Collaborators */}
            {hasCollaborators && (
              <Card variant="elevated" style={{ maxHeight: 460, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexShrink: 0 }}>
                  <Trophy size={15} style={{ color: 'var(--color-primary)' }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Ranking de Técnicos
                  </p>
                  <Badge variant="default">{workerRanking.length}</Badge>
                </div>

                {workerRanking.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <Trophy size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.3, marginBottom: 8 }} />
                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>Sem técnicos para rankear.</p>
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, paddingRight: 4 }}>
                    {workerRanking.map((worker, idx) => {
                      const ec = TL_COLORS[worker.trafficLight]
                      const medal = ['🥇', '🥈', '🥉'][idx] ?? null
                      return (
                        <div key={worker.id} style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 10,
                          background: idx === 0 ? 'var(--color-traffic-green-bg)' : 'var(--color-bg-strong)',
                          border: `1px solid ${idx === 0 ? 'var(--color-traffic-green)' : 'transparent'}`,
                        }}>
                          <span style={{ fontSize: 18, flexShrink: 0, width: 24, textAlign: 'center' }}>
                            {medal ?? <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>#{worker.rank}</span>}
                          </span>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--color-primary)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 13, fontWeight: 800, flexShrink: 0,
                          }}>
                            {(worker.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{worker.name}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                              {worker.msDone}/{worker.msTotal} marcos concluídos
                            </p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 16, fontWeight: 900, color: ec.text, lineHeight: 1 }}>
                              {worker.totalScore.toFixed(1)}
                            </p>
                            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>/100</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>
        )
      })()}

      {/* ══ TABS SECUNDÁRIAS ══════════════════════════════════════════════ */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} tabs={[
        { key: 'blockers', label: `Constrangimentos (${blockers.length})` },
        { key: 'history', label: 'Histórico' },
        { key: 'feedback', label: 'Feedback' },
      ]}>
        {(activeTab) => {
          if (activeTab === 'blockers') return (
            <div>
              <div style={{ marginBottom: 16 }}>
                <Button variant="secondary" icon={<Plus size={14} />} onClick={() => { setBlockerModal(taskId); setBlDesc(''); setBlSla('3') }}>
                  Reportar Constrangimento
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
                {blockers.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Sem constrangimentos activos.</p>}
              </div>
            </div>
          )
          if (activeTab === 'history') return <HistoryTab entityType="task" entityId={task.id} valueLabel="Valor actual" />
          if (activeTab === 'feedback') return <EntityFeedbackTab targetType="TASK" targetId={task.id} />
          return null
        }}
      </Tabs>

      {/* Delete Task Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Eliminar acção"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => deleteTask.mutate()} loading={deleteTask.isPending}>Eliminar</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--color-text)' }}>
          Tem a certeza que pretende eliminar <b>{task.title}</b>? Esta acção não pode ser revertida e todos os indicadores associados serão eliminados.
        </p>
      </Modal>

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
              disabled={task.owner_type === 'DEPARTAMENTO' && deptUsers.length > 0 && !msAssignedTo}
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
          msFrequency={msFrequency} setMsFrequency={setMsFrequency}
          msPlanned={msPlanned} setMsPlanned={setMsPlanned}
          msDate={msDate} setMsDate={setMsDate}
          msNotes={msNotes} setMsNotes={setMsNotes}
          ascs={ascsData?.data ?? []}
          regioes={regioesData?.data ?? []}
          goalLabel={task?.goal_label}
          deptUsers={deptUsers.length > 0 ? deptUsers : undefined}
          msAssignedTo={msAssignedTo} setMsAssignedTo={setMsAssignedTo}
          msAggType={msAggType} setMsAggType={setMsAggType}
          currentUserId={user?.id}
          taskStartDate={task?.start_date ? task.start_date.slice(0, 10) : undefined}
          taskEndDate={task?.end_date ? task.end_date.slice(0, 10) : undefined}
          taskTargetValue={targetVal}
          taskTotalPlanned={totalPlanned}
          taskAggType={aggType}
          isReduction={isReduction}
        />
      </Modal>

      <Modal open={!!editingMilestone} onClose={() => setEditingMilestone(null)} title="Editar Indicador" width={540}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingMilestone(null)}>Cancelar</Button>
            <Button
              variant="primary"
              icon={<Pencil size={13} />}
              onClick={handleUpdateMilestone}
              loading={updateMilestone.isPending}
            >
              Guardar alterações
            </Button>
          </>
        }
      >
        <IndicadorForm
          msTitle={msTitle} setMsTitle={setMsTitle}
          msScopeType={msScopeType} setMsScopeType={v => { setMsScopeType(v); setMsScopeId('') }}
          msScopeId={msScopeId} setMsScopeId={setMsScopeId}
          msFrequency={msFrequency} setMsFrequency={setMsFrequency}
          msPlanned={msPlanned} setMsPlanned={setMsPlanned}
          msDate={msDate} setMsDate={setMsDate}
          msNotes={msNotes} setMsNotes={setMsNotes}
          ascs={ascsData?.data ?? []}
          regioes={regioesData?.data ?? []}
          goalLabel={task?.goal_label}
          deptUsers={deptUsers.length > 0 ? deptUsers : undefined}
          msAssignedTo={msAssignedTo} setMsAssignedTo={setMsAssignedTo}
          msAggType={msAggType} setMsAggType={setMsAggType}
          currentUserId={user?.id}
          taskStartDate={task?.start_date ? task.start_date.slice(0, 10) : undefined}
          taskEndDate={task?.end_date ? task.end_date.slice(0, 10) : undefined}
          taskTargetValue={targetVal}
          taskTotalPlanned={Math.max(0, totalPlanned - (editingMilestone?.planned_value ?? 0))}
          taskAggType={aggType}
          isReduction={isReduction}
        />
      </Modal>

      {/* Update Indicador — shared ProgressModal */}
      {progressMs && (
        <ProgressModal
          ms={progressMs}
          goalLabel={task?.goal_label}
          isReduction={isReduction}
          taskStartDate={task?.start_date ? task.start_date.slice(0, 10) : undefined}
          taskAggType={aggType}
          onClose={() => setProgressMs(null)}
          onSuccess={() => {
            const updatedMsId = progressMs?.id
            setProgressMs(null)
            qc.invalidateQueries({ queryKey: ['indicadores'] })
            qc.invalidateQueries({ queryKey: ['tasks', taskId] })
            if (updatedMsId) {
              qc.invalidateQueries({ queryKey: ['milestone-detail', updatedMsId] })
              qc.invalidateQueries({ queryKey: ['milestone-progress', updatedMsId] })
            }
          }}
        />
      )}

      <MilestoneDetailModal
        open={detailMsId !== null}
        milestoneId={detailMsId}
        onClose={() => setDetailMsId(null)}
        fallbackMilestone={(() => {
          const m = indicadores.find((ms: any) => ms.id === detailMsId)
          if (!m) return null
          return { ...m, scope_name: m.scope_name || scopeLabelFor(m) }
        })()}
        goalLabel={task?.goal_label}
        isReduction={isReduction}
        taskStartDate={task?.start_date ? task.start_date.slice(0, 10) : undefined}
        taskEndDate={task?.end_date ? task.end_date.slice(0, 10) : undefined}
        onUpdateProgress={(() => {
          const m = indicadores.find((m: any) => m.id === detailMsId)
          return m && canEditMilestone(m) && m.status !== 'DONE' ? () => setProgressMs(m) : undefined
        })()}
        onEdit={(() => {
          const m = indicadores.find((m: any) => m.id === detailMsId)
          return m && canEditMilestone(m) ? () => openEditMilestone(m) : undefined
        })()}
        onFeedback={(() => {
          const m = indicadores.find((m: any) => m.id === detailMsId)
          return m ? () => setFeedbackMs({ id: m.id, title: m.title, assigneeName: m.assignee?.name, assigneeId: m.assigned_to }) : undefined
        })()}
      />

      {/* Blocker modal */}
      <Modal open={!!blockerModal} onClose={() => setBlockerModal(null)} title="Reportar Constrangimento" width={480}
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
          <Textarea label="Descrição" rows={4} value={blDesc} onChange={e => setBlDesc(e.target.value)} placeholder="Descreva o constrangimento em detalhe…" />
        </div>
      </Modal>

      {/* Edit task modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Acção" width={620}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit" form="edit-task-form" loading={updateTask.isPending} disabled={!taskFormValid}>Guardar</Button>
          </>
        }
      >
        <TaskForm
          id="edit-task-form"
          projectId={task.project_id}
          existingTaskId={task.id}
          onSubmit={payload => updateTask.mutate(payload)}
          onValidityChange={setTaskFormValid}
          initialScopes={(task.scopes ?? []).map(s => {
            let name = s.scope_name ?? ''
            if (!name && s.scope_type === 'ASC') {
              name = ascsData?.data?.find((a: any) => a.id === s.scope_id)?.name ?? `ASC #${s.scope_id}`
            } else if (!name && s.scope_type === 'REGIAO') {
              name = regioesData?.data?.find((r: any) => r.id === s.scope_id)?.name ?? `Região #${s.scope_id}`
            } else if (!name && s.scope_type === 'NACIONAL') {
              name = 'Nacional'
            }
            return { scope_type: s.scope_type as ScopeType, scope_id: s.scope_id ?? 0, name }
          })}
          defaultValues={{
            title:            task.title,
            description:      task.description ?? '',
            owner_type:       task.owner_type as any,
            owner_id:         task.owner_id,
            assigned_to:      task.assigned_to,
            frequency:        task.frequency as any,
            goal_label:       task.goal_label,
            start_value:      task.start_value ?? 0,
            target_value:     task.target_value ?? 0,
            aggregation_type: task.aggregation_type ?? 'SUM_UP',
            weight:           task.weight ?? 100,
            start_date:       task.start_date ? task.start_date.slice(0, 10) : '',
            end_date:         task.end_date   ? task.end_date.slice(0, 10)   : '',
          }}
        />
      </Modal>

      {/* Reject modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Rejeitar constrangimento" width={440}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => rejectModal && rejectBlocker.mutate({ id: rejectModal, reason: rejectReason })} loading={rejectBlocker.isPending}>Rejeitar</Button>
          </>
        }
      >
        <Textarea label="Motivo da rejeição" rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Indique o motivo…" />
      </Modal>

      <QuickFeedbackModal
        open={feedbackModal}
        onClose={() => setFeedbackModal(false)}
        targetType="TASK"
        targetId={task.id}
        targetName={task.title}
        defaultReceiverId={task.assignee?.id ?? task.assigned_to}
        defaultReceiverName={task.assignee?.name}
      />

      {feedbackMs && (
        <QuickFeedbackModal
          open={!!feedbackMs}
          onClose={() => setFeedbackMs(null)}
          targetType="MILESTONE"
          targetId={feedbackMs.id}
          targetName={feedbackMs.title}
          defaultReceiverId={feedbackMs.assigneeId}
          defaultReceiverName={feedbackMs.assigneeName}
        />
      )}
    </div>
  )
}
