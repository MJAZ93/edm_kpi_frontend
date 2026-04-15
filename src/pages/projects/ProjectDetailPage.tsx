import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Calendar, CalendarCheck, Weight, ArrowUp, MapPin, Users, Tag, User, Activity, Building2, FolderOpen, Pencil, MessageSquare, TrendingUp, ListTodo } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import HoverReferenceLine from '../../components/charts/HoverReferenceLine'
import toast from 'react-hot-toast'
import { projectsService } from '../../services/projects.service'
import { tasksService } from '../../services/tasks.service'
import { milestonesService } from '../../services/milestones.service'
import { dashboardService } from '../../services/dashboard.service'
import { geoService } from '../../services/geo.service'
import ScopeMap from '../../components/map/ScopeMap'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import Tabs from '../../components/ui/Tabs'
import Avatar from '../../components/ui/Avatar'
import PerformanceScore from '../../components/domain/PerformanceScore'
import TaskCard from '../../components/domain/TaskCard'
import PerformanceLineChart from '../../components/charts/PerformanceLineChart'
import GanttChart from '../../components/charts/GanttChart'
import HistoryTab from '../../components/domain/HistoryTab'
import ProjectHistoryTab from '../../components/domain/ProjectHistoryTab'
import TaskForm from '../tasks/TaskForm'
import ProjectForm from './ProjectForm'
import { buildPeriodOptions } from '../../components/domain/ProgressModal'
import QuickFeedbackModal from '../../components/domain/QuickFeedbackModal'
import EntityFeedbackTab from '../../components/domain/EntityFeedbackTab'
import type { CreateTaskPayload, CreateProjectPayload, ScopeType } from '../../types'

const STATUS_BADGE: Record<string, 'orange' | 'success' | 'muted'> = {
  ACTIVE: 'orange', COMPLETED: 'success', CANCELLED: 'muted',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo', COMPLETED: 'Concluído', CANCELLED: 'Cancelado',
}
const CREATOR_TYPE_LABEL: Record<string, string> = {
  CA: 'CA', PELOURO: 'Pelouro', DIRECAO: 'Direcção', DEPARTAMENTO: 'Departamento',
}
const SCOPE_TYPE_LABEL: Record<ScopeType, string> = {
  ASC: 'ASC', REGIAO: 'Região', NACIONAL: 'Nacional',
}
const SCOPE_BADGE_COLOR: Record<ScopeType, 'orange' | 'default' | 'success'> = {
  ASC: 'orange', REGIAO: 'default', NACIONAL: 'success',
}

function fmtDate(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return isNaN(date.getTime()) ? d : date.toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const navigate = useNavigate()
  const { can, user } = useAuth()
  const qc = useQueryClient()
  const [taskModal, setTaskModal] = useState(false)
  const [taskFormValid, setTaskFormValid] = useState(true)
  const [deleteModal, setDeleteModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressInput, setProgressInput] = useState('')
  const [progressPeriod, setProgressPeriod] = useState('')

  const canEdit = can('update:project') && user?.role !== 'CA' && user?.role !== 'PELOURO'
  const canAddTask = canEdit

  const { data: project, isLoading } = useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => projectsService.get(projectId),
  })
  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { project_id: projectId }],
    queryFn: () => tasksService.list(projectId, { limit: 50 }),
    enabled: !!projectId,
  })
  const { data: subProjectsData } = useQuery({
    queryKey: ['projects', { parent_id: projectId }],
    queryFn: () => projectsService.list({ parent_id: projectId, limit: 50 }),
    enabled: !!projectId,
  })
  const { data: timeline } = useQuery({
    queryKey: ['dashboard', 'timeline', { entity_type: 'CA', id: projectId }],
    queryFn: () => dashboardService.getTimeline({ entity_type: 'CA' }),
  })
  // Geo & org data — read-only from cache (populated by AppShell)
  const qcRef = useQueryClient()
  const ascsData     = qcRef.getQueryData<any>(['geo', 'ascs'])
  const regioesData  = qcRef.getQueryData<any>(['geo', 'regioes'])
  const deptsData    = qcRef.getQueryData<any>(['departamentos'])
  const direcoesData = qcRef.getQueryData<any>(['direcoes'])
  const [activeTab, setActiveTab] = useState('overview')
  const [feedbackModal, setFeedbackModal] = useState(false)

  // Fetch project history to know used periods (for progress update validation)
  const { data: projectHistoryData } = useQuery({
    queryKey: ['projects', 'history', projectId],
    queryFn: () => projectsService.listHistory(projectId),
    enabled: !!projectId,
  })
  const usedPeriods = useMemo(() => {
    const set = new Set<string>()
    ;(projectHistoryData?.entries ?? []).forEach((e: any) => { if (e.period_reference) set.add(e.period_reference) })
    return set
  }, [projectHistoryData])
  const needsPolygon = activeTab === 'scope'
  const { data: ascsGeo }       = useQuery({ queryKey: ['geo', 'ascs', 'polygon'],    queryFn: () => geoService.listAscs({ includePolygon: true }),    staleTime: Infinity, enabled: needsPolygon })
  const { data: regioesGeo }    = useQuery({ queryKey: ['geo', 'regioes', 'polygon'], queryFn: () => geoService.listRegioes({ includePolygon: true }), staleTime: Infinity, enabled: needsPolygon })

  const createTask = useMutation({
    mutationFn: (payload: CreateTaskPayload) => tasksService.create(projectId, payload),
    onSuccess: () => {
      toast.success('Acção criada.')
      qc.invalidateQueries({ queryKey: ['tasks', { project_id: projectId }] })
      setTaskModal(false)
    },
    onError: () => toast.error('Erro ao criar acção.'),
  })
  const deleteProject = useMutation({
    mutationFn: () => projectsService.remove(projectId),
    onSuccess: () => { toast.success('Pilar Estratégico eliminado.'); navigate('/projects') },
    onError: () => toast.error('Erro ao eliminar pilar estratégico.'),
  })

  const updateProject = useMutation({
    mutationFn: (payload: Partial<CreateProjectPayload>) => projectsService.update(projectId, payload as any),
    onSuccess: () => {
      toast.success('Pilar Estratégico actualizado.')
      qc.invalidateQueries({ queryKey: ['projects', projectId] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'direcao-overview'] })
      setEditModal(false)
    },
    onError: () => toast.error('Erro ao actualizar pilar estratégico.'),
  })

  const saveProgress = useMutation({
    mutationFn: ({ val, period }: { val: number; period: string }) =>
      projectsService.updateProgress(projectId, val, period || undefined),
    onSuccess: () => {
      toast.success('Progresso actualizado.')
      qc.invalidateQueries({ queryKey: ['projects', projectId] })
      qc.invalidateQueries({ queryKey: ['projects', 'history', projectId] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'direcao-overview'] })
      setEditingProgress(false)
      setProgressInput('')
      setProgressPeriod('')
    },
    onError: () => toast.error('Erro ao actualizar progresso.'),
  })

  const tasks = tasksData?.data ?? []
  const subProjects = subProjectsData?.data ?? []
  const timelineData = timeline?.periods?.map(p => ({ period: p.period.slice(5), total_score: p.total_score })) ?? []

  const ascMap = useMemo(() => {
    const m: Record<number, string> = {}
    ascsData?.data?.forEach((a: any) => { m[a.id] = a.name })
    return m
  }, [ascsData])

  const regiaoMap = useMemo(() => {
    const m: Record<number, string> = {}
    regioesData?.data?.forEach((r: any) => { m[r.id] = r.name })
    return m
  }, [regioesData])

  const deptMap = useMemo(() => {
    const m: Record<number, string> = {}
    deptsData?.data?.forEach((d: any) => { m[d.id] = d.name })
    return m
  }, [deptsData])

  const direcaoMap = useMemo(() => {
    const m: Record<number, string> = {}
    direcoesData?.data?.forEach((d: any) => { m[d.id] = d.name })
    return m
  }, [direcoesData])

  const taskOwnerLabel = (task: typeof tasks[number]) => {
    const orgName = task.owner_type === 'DEPARTAMENTO' ? deptMap[task.owner_id]
      : task.owner_type === 'DIRECAO' ? direcaoMap[task.owner_id]
      : undefined
    const base = orgName ? `${task.owner_type} · ${orgName}` : (task.owner_name ?? task.owner_type)
    return task.assignee?.name ? `${base} · ${task.assignee.name}` : base
  }

  const uniqueOwners = useMemo(() => {
    const seen = new Set<string>()
    const owners: { key: string; owner_type: string; owner_id: number; name?: string }[] = []
    tasks.forEach(t => {
      const key = `${t.owner_type}:${t.owner_id}`
      if (!seen.has(key)) { seen.add(key); owners.push({ key, owner_type: t.owner_type, owner_id: t.owner_id, name: t.owner_name }) }
    })
    return owners
  }, [tasks])

  const allScopes = useMemo(() => {
    const seen = new Set<string>()
    const scopes: { scope_type: ScopeType; scope_id: number; scope_name?: string }[] = []
    tasks.forEach(t => {
      t.scopes?.forEach(s => {
        const key = `${s.scope_type}:${s.scope_id}`
        if (!seen.has(key)) {
          seen.add(key)
          const name = s.scope_name ?? (s.scope_type === 'ASC' ? ascMap[s.scope_id] : s.scope_type === 'REGIAO' ? regiaoMap[s.scope_id] : undefined)
          scopes.push({ scope_type: s.scope_type, scope_id: s.scope_id, scope_name: name })
        }
      })
    })
    return scopes
  }, [tasks, ascMap, regiaoMap])

  // Must be before early returns
  const indicadorQueries = useQueries({
    queries: tasks.map(t => ({
      queryKey: ['indicadores', { task_id: t.id }],
      queryFn: () => milestonesService.list(t.id),
      enabled: tasks.length > 0,
    })),
  })

  const ganttTasks = useMemo(() => tasks.map((t, i) => ({
    id: t.id,
    title: t.title,
    start_date: t.start_date,
    end_date: t.end_date,
    traffic_light: t.performance?.traffic_light as 'GREEN' | 'YELLOW' | 'RED' | undefined,
    owner_label: taskOwnerLabel(t),
    indicadores: indicadorQueries[i]?.data?.data ?? [],
  })), [tasks, indicadorQueries])

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
  if (!project) return <div style={{ padding: 40, color: 'var(--color-text-muted)' }}>Pilar Estratégico não encontrado.</div>

  const perf = project.performance
  const ascScopes    = allScopes.filter(s => s.scope_type === 'ASC')
  const regiaoScopes = allScopes.filter(s => s.scope_type === 'REGIAO')
  const isNacional   = allScopes.some(s => s.scope_type === 'NACIONAL')
  const tasksWithScopes = tasks.filter(t => t.scopes && t.scopes.length > 0)

  const scopeMapFeatures = allScopes.flatMap(s => {
    // Find tasks that cover this scope
    const coveringTasks = tasks.filter(t =>
      t.scopes?.some(ts => ts.scope_type === s.scope_type && ts.scope_id === s.scope_id)
    )
    const totalCurrent = coveringTasks.reduce((sum, t) => sum + (t.current_value ?? 0), 0)
    const totalTarget  = coveringTasks.reduce((sum, t) => sum + (t.target_value ?? 0), 0)
    const totalStart   = coveringTasks.reduce((sum, t) => sum + (t.start_value ?? 0), 0)

    const progressProps = coveringTasks.length > 0 ? {
      currentValue: totalCurrent,
      targetValue:  totalTarget,
      startValue:   totalStart,
      taskCount:    coveringTasks.length,
      taskTitles:   coveringTasks.map(t => t.title),
    } : {}

    if (s.scope_type === 'ASC') {
      const asc = (ascsGeo?.data ?? ascsData?.data ?? []).find((a: any) => a.id === s.scope_id)
      if (asc?.polygon) return [{ name: asc.name, scopeType: 'ASC', geometry: asc.polygon as any, ...progressProps }]
    }
    if (s.scope_type === 'REGIAO') {
      const reg = (regioesGeo?.data ?? regioesData?.data ?? []).find((r: any) => r.id === s.scope_id)
      if (reg?.polygon) return [{ name: reg.name, scopeType: 'Região', geometry: reg.polygon as any, ...progressProps }]
    }
    return []
  })

  // ── Reusable section blocks ────────────────────────────────────────────────

  // Traffic light colour helpers
  const TL_BG: Record<string, string> = { GREEN: 'var(--color-traffic-green-bg)', YELLOW: 'var(--color-traffic-yellow-bg)', RED: 'var(--color-traffic-red-bg)' }
  const TL_FG: Record<string, string> = { GREEN: 'var(--color-traffic-green)', YELLOW: 'var(--color-traffic-yellow)', RED: 'var(--color-traffic-red)' }
  const util_getTL = (score: number) => score >= 90 ? 'GREEN' : score >= 60 ? 'YELLOW' : 'RED'

  // ── Goal / KPI progress helpers ────────────────────────────────────────────
  const hasGoal = !!(project?.goal_label || project?.target_value != null)
  const goalStart   = project?.start_value   ?? 0
  const goalTarget  = project?.target_value  ?? 0
  const goalCurrent = project?.current_value ?? goalStart

  // Direction of improvement: if target < start the goal is to decrease (e.g. losses 15% → 3%)
  const improving = goalTarget <= goalStart
  const totalRange = Math.abs(goalTarget - goalStart)
  const progress   = totalRange > 0
    ? Math.min(100, Math.max(0, (Math.abs(goalCurrent - goalStart) / totalRange) * 100))
    : 0
  const reached = improving ? goalCurrent <= goalTarget : goalCurrent >= goalTarget

  const FREQ_LABEL: Record<string, string> = {
    DAILY: 'Diária', WEEKLY: 'Semanal', MONTHLY: 'Mensal',
    QUARTERLY: 'Trimestral', BIANNUAL: 'Semestral', ANNUAL: 'Anual',
  }

  const OverviewCards = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI / Objectivo progress card ── */}
      {hasGoal && (
        <Card variant="elevated" style={{ border: reached ? '2px solid var(--color-traffic-green)' : '2px solid var(--color-primary)44', background: reached ? 'var(--color-traffic-green-bg)' : 'var(--color-primary-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>
              {project?.goal_label || 'Objectivo KPI'}
              {project?.frequency && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginLeft: 8 }}>
                  · {FREQ_LABEL[project.frequency] ?? project.frequency}
                </span>
              )}
            </p>
            {reached && (
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-traffic-green)', background: 'var(--color-traffic-green-bg)', border: '1px solid var(--color-traffic-green)44', borderRadius: 8, padding: '3px 10px' }}>
                ✓ Atingido
              </span>
            )}
          </div>

          {/* Numbers row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
            <div style={{ textAlign: 'center', background: 'var(--color-bg)', borderRadius: 10, padding: '6px 8px' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4 }}>Inicial</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text-muted)', lineHeight: 1 }}>
                {goalStart.toLocaleString('pt-MZ')}
              </p>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--color-bg)', borderRadius: 10, padding: '6px 8px', border: '2px solid var(--color-primary)' }}>
              <p style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 700, marginBottom: 4 }}>Actual</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: reached ? 'var(--color-traffic-green)' : 'var(--color-primary)', lineHeight: 1 }}>
                {goalCurrent.toLocaleString('pt-MZ')}
              </p>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--color-bg)', borderRadius: 10, padding: '6px 8px' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4 }}>Meta</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
                {goalTarget.toLocaleString('pt-MZ')}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>Progresso em direcção à meta</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: reached ? 'var(--color-traffic-green)' : 'var(--color-primary)' }}>{progress.toFixed(1)}%</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: 'var(--color-border)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, borderRadius: 999, background: reached ? 'var(--color-traffic-green)' : 'var(--color-primary)', transition: 'width 600ms' }} />
            </div>
          </div>

          {/* Inline update */}
          {canEdit && (
            editingProgress ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={progressPeriod}
                  onChange={e => setProgressPeriod(e.target.value)}
                  style={{ width: 180, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 13, fontWeight: 700, outline: 'none', cursor: 'pointer', flexShrink: 0 }}
                >
                  <option value="">Período</option>
                  {buildPeriodOptions(
                    project?.frequency || 'MONTHLY',
                    project?.start_date?.slice(0, 10),
                    project?.end_date?.slice(0, 10),
                  ).filter(opt => !usedPeriods.has(opt.value)).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="any"
                  value={progressInput}
                  onChange={e => setProgressInput(e.target.value)}
                  placeholder={`Novo valor (actual: ${goalCurrent})`}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-primary)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14, fontWeight: 700, outline: 'none' }}
                  autoFocus
                />
                <button
                  disabled={progressInput === '' || progressPeriod === '' || saveProgress.isPending}
                  onClick={() => saveProgress.mutate({ val: parseFloat(progressInput), period: progressPeriod })}
                  style={{
                    padding: '8px 20px', borderRadius: 8,
                    background: (progressInput !== '' && progressPeriod !== '') ? 'var(--color-primary)' : 'var(--color-border)',
                    color: (progressInput !== '' && progressPeriod !== '') ? '#fff' : 'var(--color-text-muted)',
                    border: 'none', cursor: (progressInput !== '' && progressPeriod !== '') ? 'pointer' : 'not-allowed',
                    fontSize: 13, fontWeight: 800, flexShrink: 0,
                  }}
                >
                  {saveProgress.isPending ? '…' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setEditingProgress(false); setProgressInput(''); setProgressPeriod('') }}
                  style={{ padding: '8px 12px', borderRadius: 8, background: 'none', border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}
                >✕</button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingProgress(true); setProgressInput(String(goalCurrent)) }}
                style={{ width: '100%', padding: '9px 0', borderRadius: 8, background: 'var(--color-bg)', border: '1.5px solid var(--color-primary)44', color: 'var(--color-primary)', cursor: 'pointer', fontSize: 13, fontWeight: 800 }}
                onMouseEnter={e => { (e.currentTarget.style.background = 'var(--color-primary)'); (e.currentTarget.style.color = '#fff') }}
                onMouseLeave={e => { (e.currentTarget.style.background = 'var(--color-bg)'); (e.currentTarget.style.color = 'var(--color-primary)') }}
              >
                ✏ Actualizar valor actual
              </button>
            )
          )}
        </Card>
      )}

      {/* ── Performance banner (full width, only when data exists) ── */}
      {perf && (
        <Card variant="elevated" style={{ background: TL_BG[perf.traffic_light] ?? 'var(--color-surface)', border: `1.5px solid ${TL_FG[perf.traffic_light] ?? 'var(--color-border)'}20` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Performance</p>
              <PerformanceScore
                executionScore={perf.execution_score}
                goalScore={perf.goal_score}
                totalScore={perf.total_score}
                trafficLight={perf.traffic_light as 'GREEN' | 'YELLOW' | 'RED'}
              />
            </div>
            {/* Big score pill */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 96, height: 96, borderRadius: '50%', background: TL_FG[perf.traffic_light], boxShadow: `0 4px 20px ${TL_FG[perf.traffic_light]}55` }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{perf.total_score.toFixed(0)}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#ffffffcc', letterSpacing: '0.05em' }}>SCORE</span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Chart + Tasks grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16 }}>
        {/* LEFT: compact tasks list with KPI numbers */}
        <Card variant="elevated" style={{ maxHeight: 580, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0 }}>
            <ListTodo size={14} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Acções ({tasks.length})</p>
          </div>
          {tasks.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0' }}>Nenhuma acção criada.</p>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.map(t => {
                const tl = (t.performance?.traffic_light ?? '') as string
                const tlColor = TL_FG[tl] ?? 'var(--color-border)'
                const exec = t.performance?.execution_score ?? 0
                const goal = t.performance?.goal_score ?? 0
                const score = t.performance?.total_score ?? 0
                const taskStart = t.start_value ?? 0
                const taskTarget = t.target_value ?? 0
                const taskCurrent = t.current_value ?? taskStart
                const taskRange = Math.abs(taskTarget - taskStart)
                const taskPct = taskRange > 0 ? Math.min(100, (Math.abs(taskCurrent - taskStart) / taskRange) * 100) : 0
                return (
                  <div key={t.id} onClick={() => navigate(`/tasks/${t.id}`)}
                    style={{ padding: '10px 12px', background: 'var(--color-bg-strong)', borderRadius: 10, cursor: 'pointer', border: '1.5px solid transparent', transition: 'border-color 150ms', borderLeft: `3px solid ${tlColor}` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = tlColor }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLElement).style.borderLeftColor = tlColor }}
                  >
                    {/* Title */}
                    <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6, lineHeight: 1.3 }}>{t.title}</p>

                    {/* KPI numbers row */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Início <strong style={{ color: 'var(--color-text)', fontSize: 11 }}>{taskStart.toLocaleString('pt-PT')}</strong>
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>→</span>
                      <span style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 800 }}>
                        <strong style={{ fontSize: 12 }}>{taskCurrent.toLocaleString('pt-PT')}</strong>
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>→</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Meta <strong style={{ color: 'var(--color-traffic-green)', fontSize: 11 }}>{taskTarget.toLocaleString('pt-PT')}</strong>
                      </span>
                    </div>

                    {/* Dual progress bars: Execução + Objectivo */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Exec</span>
                          <span style={{ fontSize: 8, fontWeight: 800, color: exec >= 60 ? '#16a34a' : exec >= 30 ? '#d97706' : '#dc2626' }}>{Math.max(0, exec).toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, exec))}%`, borderRadius: 2, background: exec >= 60 ? '#16a34a' : exec >= 30 ? '#d97706' : '#dc2626', transition: 'width 300ms' }} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Obj</span>
                          <span style={{ fontSize: 8, fontWeight: 800, color: goal >= 60 ? '#16a34a' : goal >= 30 ? '#d97706' : '#dc2626' }}>{Math.max(0, goal).toFixed(0)}%</span>
                        </div>
                        <div style={{ height: 3, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, Math.max(0, goal))}%`, borderRadius: 2, background: goal >= 60 ? '#16a34a' : goal >= 30 ? '#d97706' : '#dc2626', transition: 'width 300ms' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 900, color: tlColor, minWidth: 32, textAlign: 'right' }}>{score.toFixed(1)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* RIGHT: value evolution chart */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <TrendingUp size={14} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{project?.goal_label || 'Evolução de Valor'}</p>
          </div>
          {(() => {
            const pilarHistory = projectHistoryData?.entries ?? []
            const sorted = [...pilarHistory]
              .sort((a: any, b: any) => (a.period_reference ?? a.created_at).localeCompare(b.period_reference ?? b.created_at))

            const currentYear = new Date().getFullYear()
            const chartEntries: any[] = sorted.map((h: any) => {
              const ref = h.period_reference ?? ''
              const year = parseInt(ref.slice(0, 4), 10)
              const isRecent = year >= currentYear
              return {
                period: ref.length === 7
                  ? new Date(ref + '-01').toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' })
                  : ref || new Date(h.created_at).toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit' }),
                valor: h.value,
                type: isRecent ? 'recent' : 'old',
              }
            })

            // Compute forecast
            const startVal = project?.start_value ?? 0
            const targetVal = project?.target_value ?? 0
            const currentVal = project?.current_value ?? startVal
            const startDate = project?.start_date ? new Date(project.start_date) : null
            const endDate = project?.end_date ? new Date(project.end_date) : null
            let forecastVal: number | null = null

            if (startDate && endDate && chartEntries.length >= 2) {
              const now = new Date()
              const daysElapsed = Math.max(1, (now.getTime() - startDate.getTime()) / 86400000)
              const daysRemaining = Math.max(0, (endDate.getTime() - now.getTime()) / 86400000)
              const velocity = (currentVal - startVal) / daysElapsed
              forecastVal = Math.round((currentVal + velocity * daysRemaining) * 100) / 100
              const endLabel = endDate.toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' })
              chartEntries.push({
                period: `${endLabel} (prev.)`,
                valor: forecastVal,
                type: 'forecast',
              })
            }

            if (chartEntries.length === 0) return (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-strong)', borderRadius: 12, color: 'var(--color-text-muted)' }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Este pilar ainda não tem registos de valor.</p>
              </div>
            )

            const CustomBar = (props: any) => {
              const { x, y, width, height, index } = props
              const entry = chartEntries[index]
              if (!entry || height <= 0) return null
              const isOld = entry.type === 'old'
              const isForecast = entry.type === 'forecast'
              const barW = isOld ? Math.min(width, 18) : Math.min(width, 40)
              const barX = x + (width - barW) / 2
              const r = isOld ? 4 : 8

              if (isForecast) {
                return (
                  <g>
                    <rect x={barX} y={y} width={barW} height={height} rx={r} ry={r}
                      fill="none" stroke="#e8670a" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.6} />
                    <rect x={barX} y={y} width={barW} height={height} rx={r} ry={r}
                      fill="#e8670a" opacity={0.08} />
                  </g>
                )
              }
              return (
                <rect x={barX} y={y} width={barW} height={height} rx={r} ry={r}
                  fill={isOld ? '#d4c4a0' : '#e8670a'}
                  stroke={isOld ? 'transparent' : '#c4530a'}
                  strokeWidth={isOld ? 0 : 1.5}
                />
              )
            }

            const CustomLabel = (props: any) => {
              const { x, y, width, index } = props
              const entry = chartEntries[index]
              if (!entry) return null
              const isOld = entry.type === 'old'
              const isForecast = entry.type === 'forecast'
              const val = entry.valor

              // Determine color by comparing to previous entry
              let trendColor = isOld ? '#aaa' : '#1a1a1a'
              if (!isForecast && index > 0) {
                const prev = chartEntries[index - 1]
                if (prev && prev.type !== 'forecast') {
                  const diff = val - prev.valor
                  if (diff !== 0) {
                    // For reduction goals (target < start), decrease = good (green)
                    const isGood = isReduction ? diff < 0 : diff > 0
                    trendColor = isGood ? '#16a34a' : '#dc2626'
                  }
                }
              }
              if (isForecast) trendColor = '#e8670a'

              return (
                <text
                  x={x + width / 2} y={y - 8}
                  textAnchor="middle"
                  fontSize={isForecast ? 13 : isOld ? 10 : 13}
                  fontWeight={isForecast ? 900 : isOld ? 700 : 900}
                  fill={trendColor}
                  fontStyle={isForecast ? 'italic' : 'normal'}
                >
                  {val.toLocaleString('pt-PT')}
                </text>
              )
            }

            const isReduction = targetVal < startVal
            const willReach = forecastVal != null && (isReduction ? forecastVal <= targetVal : forecastVal >= targetVal)

            return (
              <>
                {forecastVal != null && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12,
                    padding: '8px 14px', borderRadius: 10,
                    background: willReach ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.06)',
                    border: `1.5px solid ${willReach ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.2)'}`,
                  }}>
                    <TrendingUp size={14} style={{ color: willReach ? '#16a34a' : '#dc2626', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>
                        Previsão:{' '}
                        <strong style={{ fontSize: 14, color: willReach ? '#16a34a' : '#dc2626' }}>
                          {forecastVal.toLocaleString('pt-PT')}
                        </strong>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                        {willReach ? 'Meta será atingida' : 'Meta em risco'}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em',
                      padding: '3px 10px', borderRadius: 6,
                      background: willReach ? '#16a34a' : '#dc2626', color: '#fff',
                    }}>
                      {willReach ? 'No caminho' : 'Em risco'}
                    </span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartEntries} margin={{ top: 28, right: 60, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,80,20,0.06)" vertical={false} />
                    <XAxis
                      dataKey="period"
                      tick={({ x, y, payload, index }: any) => {
                        const entry = chartEntries[index]
                        const isOld = entry?.type === 'old'
                        const isForecast = entry?.type === 'forecast'
                        return (
                          <text x={x} y={y + 14} textAnchor="middle"
                            fontSize={isOld ? 9 : 12}
                            fontWeight={isForecast ? 700 : isOld ? 400 : 800}
                            fill={isForecast ? '#e8670a' : isOld ? '#bbb' : '#1a1a1a'}
                            fontStyle={isForecast ? 'italic' : 'normal'}
                          >
                            {payload.value}
                          </text>
                        )
                      }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false}
                      domain={[(min: number) => {
                        const refs = [startVal, targetVal].filter((v): v is number => v != null && v !== 0)
                        const allMin = Math.min(min, ...refs)
                        const pad = Math.max((Math.max(min, ...refs.map(r => r)) - allMin) * 0.15, 1)
                        return Math.floor(allMin - pad)
                      }, (max: number) => {
                        const refs = [startVal, targetVal].filter((v): v is number => v != null && v !== 0)
                        const allMax = Math.max(max, ...refs)
                        const pad = Math.max((allMax - Math.min(max, ...refs.map(r => r))) * 0.15, 1)
                        return Math.ceil(allMax + pad)
                      }]}
                    />
                    <Tooltip
                      contentStyle={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, boxShadow: 'var(--shadow-soft)', fontSize: 13 }}
                      formatter={(value: any, _name: any, props: any) => {
                        const entry = chartEntries[props?.payload?.__index ?? 0]
                        const label = entry?.type === 'forecast' ? 'Previsão' : (project?.goal_label || 'Valor')
                        return [Number(value).toLocaleString('pt-PT'), label]
                      }}
                    />
                    {targetVal != null && targetVal !== 0 && (
                      <HoverReferenceLine y={targetVal} text={`Meta: ${targetVal.toLocaleString('pt-PT')}`} color="#16a34a" strokeWidth={2} strokeDasharray="8 4" fontSize={12} fontWeight={800} />
                    )}
                    {startVal != null && startVal !== 0 && (
                      <HoverReferenceLine y={startVal} text={`Início: ${startVal.toLocaleString('pt-PT')}`} color="#888" strokeWidth={1.5} strokeDasharray="5 5" fontSize={11} fontWeight={700} />
                    )}
                    <Bar dataKey="valor" shape={<CustomBar />}>
                      <LabelList content={<CustomLabel />} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            )
          })()}
        </Card>
      </div>

      {/* ── Equipa + Mapa side-by-side ── */}
      <div style={{ display: 'grid', gridTemplateColumns: scopeMapFeatures.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Users size={15} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipa & Responsáveis</p>
          </div>
          {uniqueOwners.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0' }}>Nenhuma acção com responsável atribuído.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {uniqueOwners.map(owner => {
                const displayName = owner.name
                  ?? (owner.owner_type === 'DEPARTAMENTO' ? deptMap[owner.owner_id] : undefined)
                  ?? (owner.owner_type === 'DIRECAO' ? direcaoMap[owner.owner_id] : undefined)
                  ?? `${CREATOR_TYPE_LABEL[owner.owner_type] ?? owner.owner_type} #${owner.owner_id}`
                return (
                  <div key={owner.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--color-bg-strong)', borderRadius: 10 }}>
                    <Avatar name={displayName} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
                      <Badge variant="default" style={{ fontSize: 10 }}>{CREATOR_TYPE_LABEL[owner.owner_type] ?? owner.owner_type}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ASCs & Regiões chips */}
          {allScopes.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Âmbito geográfico</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allScopes.map((s, i) => {
                  const name = s.scope_name
                    ?? (s.scope_type === 'ASC' ? ascMap[s.scope_id] : undefined)
                    ?? (s.scope_type === 'REGIAO' ? regiaoMap[s.scope_id] : undefined)
                    ?? (s.scope_type === 'NACIONAL' ? 'Nacional' : `ID ${s.scope_id}`)
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'var(--color-primary-soft)', borderRadius: 8, border: '1px solid var(--color-primary)20' }}>
                      <MapPin size={11} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{name}</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{SCOPE_TYPE_LABEL[s.scope_type]}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        {/* Map panel — only if there are scope polygons */}
        {scopeMapFeatures.length > 0 && (
          <Card variant="elevated">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MapPin size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mapa de Cobertura</p>
            </div>
            <ScopeMap features={scopeMapFeatures} height={340} />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 10 }}>
              {ascScopes.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)' }}>{ascScopes.length} ASCs</span>
              )}
              {regiaoScopes.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)' }}>{regiaoScopes.length} Regiões</span>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* ── Employee ranking — grouped by user ── */}
      {(() => {
        // Group tasks by assignee user, aggregate scores
        const userMap = new Map<number, { name: string; taskCount: number; sumScore: number; sumExec: number; sumGoal: number }>()
        tasks.forEach(t => {
          if (!t.assignee || !t.performance) return
          const uid = t.assigned_to ?? 0
          const existing = userMap.get(uid)
          if (existing) {
            existing.taskCount++
            existing.sumScore += t.performance.total_score
            existing.sumExec += t.performance.execution_score ?? 0
            existing.sumGoal += t.performance.goal_score ?? 0
          } else {
            userMap.set(uid, {
              name: t.assignee.name,
              taskCount: 1,
              sumScore: t.performance.total_score,
              sumExec: t.performance.execution_score ?? 0,
              sumGoal: t.performance.goal_score ?? 0,
            })
          }
        })
        const ranked = Array.from(userMap.values())
          .map(u => ({
            name: u.name,
            taskCount: u.taskCount,
            avgScore: u.sumScore / u.taskCount,
            avgExec: u.sumExec / u.taskCount,
            avgGoal: u.sumGoal / u.taskCount,
            traffic_light: util_getTL(u.sumScore / u.taskCount),
          }))
          .sort((a, b) => b.avgScore - a.avgScore)
        const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}']
        if (ranked.length === 0) return null
        return (
          <Card variant="elevated">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Users size={15} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ranking de Colaboradores</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ranked.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--color-bg-strong)', borderRadius: 10 }}>
                  <span style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>{medals[i] ?? `${i + 1}.`}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{r.taskCount} {r.taskCount === 1 ? 'acção' : 'acções'} · Exec {r.avgExec.toFixed(0)}% · Obj {r.avgGoal.toFixed(0)}%</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: TL_FG[r.traffic_light] ?? 'var(--color-border)' }} />
                    <span style={{ fontSize: 14, fontWeight: 900, color: TL_FG[r.traffic_light] ?? 'var(--color-text)' }}>{r.avgScore.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )
      })()}
    </div>
  )

  const TasksSection = (
    <div>
      {canAddTask && (
        <div style={{ marginBottom: 20 }}>
          <Button variant="primary" icon={<Plus size={14} />} onClick={() => setTaskModal(true)}>Nova Acção</Button>
        </div>
      )}
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: 14 }}>Nenhuma acção criada ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {tasks.map((t, idx) => {
            const indicadores = indicadorQueries[idx]?.data?.data ?? []
            const doneCount = indicadores.filter((ms: any) => ms.status === 'DONE').length

            return (
              <TaskCard
                key={t.id}
                title={t.title}
                frequency={t.frequency}
                goalLabel={t.goal_label}
                startValue={t.start_value}
                currentValue={t.current_value}
                targetValue={t.target_value}
                indicadoresTotal={indicadores.length}
                milesDone={doneCount}
                trafficLight={(t.performance?.traffic_light ?? 'YELLOW') as 'GREEN' | 'YELLOW' | 'RED'}
                ownerLabel={taskOwnerLabel(t)}
                onClick={() => navigate(`/tasks/${t.id}`)}
              />
            )
          })}
        </div>
      )}
    </div>
  )

  const GanttSection = (
    <Card variant="elevated">
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>Cronograma do Pilar Estratégico</p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {fmtDate(project.start_date)} → {fmtDate(project.end_date)}
          {' · '}{tasks.length} {tasks.length === 1 ? 'acção' : 'acções'}
        </p>
      </div>
      <GanttChart
        tasks={ganttTasks}
        projectStart={project.start_date}
        projectEnd={project.end_date}
        onTaskClick={taskId => navigate(`/tasks/${taskId}`)}
      />
    </Card>
  )

  const ScopeSection = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card variant="elevated">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <MapPin size={15} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cobertura Geográfica</p>
        </div>

        {allScopes.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0' }}>Nenhum âmbito geográfico definido nas acções.</p>
        ) : isNacional ? (
          <Badge variant="success" style={{ marginBottom: 12 }}>Âmbito Nacional</Badge>
        ) : scopeMapFeatures.length > 0 ? (
          <ScopeMap features={scopeMapFeatures} height={440} />
        ) : (
          <div style={{ padding: 20, background: 'var(--color-bg-strong)', borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Polígonos não disponíveis — adicione geometria às ASCs/Regiões.</p>
          </div>
        )}

        {/* Stat counters */}
        {allScopes.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 16 }}>
            {ascScopes.length > 0 && (
              <div style={{ padding: '10px 18px', background: 'var(--color-primary-soft)', borderRadius: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-primary)' }}>{ascScopes.length}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>ASCs</p>
              </div>
            )}
            {regiaoScopes.length > 0 && (
              <div style={{ padding: '10px 18px', background: 'var(--color-bg-strong)', borderRadius: 12, textAlign: 'center' }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)' }}>{regiaoScopes.length}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Regiões</p>
              </div>
            )}
          </div>
        )}

        {/* Chips */}
        {(ascScopes.length > 0 || regiaoScopes.length > 0) && (
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {ascScopes.map(s => (
              <div key={`asc-${s.scope_id}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--color-primary-soft)', borderRadius: 20, border: '1px solid var(--color-primary)20' }}>
                <MapPin size={10} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{s.scope_name ?? `ASC #${s.scope_id}`}</span>
                <span style={{ fontSize: 10, color: 'var(--color-primary)', fontWeight: 700 }}>ASC</span>
              </div>
            ))}
            {regiaoScopes.map(s => (
              <div key={`reg-${s.scope_id}`} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'var(--color-bg-strong)', borderRadius: 20, border: '1px solid var(--color-border)' }}>
                <MapPin size={10} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text)' }}>{s.scope_name ?? `Região #${s.scope_id}`}</span>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 700 }}>Região</span>
              </div>
            ))}
          </div>
        )}
      </Card>
      {tasksWithScopes.length > 0 && (
        <Card variant="elevated">
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Âmbito por Acção</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tasksWithScopes.map(task => (
              <div key={task.id} style={{ padding: '12px 14px', background: 'var(--color-bg-strong)', borderRadius: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', marginBottom: 8, cursor: 'pointer' }} onClick={() => navigate(`/tasks/${task.id}`)}>
                  {task.title}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {task.scopes.map((s, idx) => {
                    const name = s.scope_name ?? (s.scope_type === 'ASC' ? ascMap[s.scope_id] : s.scope_type === 'REGIAO' ? regiaoMap[s.scope_id] : undefined)
                    const displayName = s.scope_type === 'NACIONAL' ? 'Nacional' : (name ?? `${s.scope_type} #${s.scope_id}`)
                    return (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Badge variant={SCOPE_BADGE_COLOR[s.scope_type]} style={{ fontSize: 10 }}>{SCOPE_TYPE_LABEL[s.scope_type]}</Badge>
                        <span style={{ fontSize: 12, color: 'var(--color-text)', fontWeight: 600 }}>{displayName}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )

  const ProgressSection = (
    <Card variant="elevated">
      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 20 }}>Evolução temporal</p>
      {timelineData.length > 0
        ? <PerformanceLineChart data={timelineData} height={300} />
        : <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Sem dados de histórico ainda.</p>
      }
    </Card>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        onBack={() => navigate(-1)}
        eyebrow={
          project.parent ? (
            <span>
              <span onClick={() => navigate('/projects')} style={{ cursor: 'pointer', color: 'var(--color-primary)' }}>Pilares Estratégicos</span>
              {' / '}
              <span onClick={() => navigate(`/projects/${project.parent!.id}`)} style={{ cursor: 'pointer', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ArrowUp size={11} />{project.parent.title}
              </span>
            </span>
          ) : 'Pilares Estratégicos'
        }
        title={project.title}
        subtitle={project.description}
        badges={
          <>
            <Badge variant={STATUS_BADGE[project.status]}>{STATUS_LABEL[project.status]}</Badge>
            <Badge variant="default"><Tag size={11} style={{ marginRight: 4 }} />{CREATOR_TYPE_LABEL[project.creator_type] ?? project.creator_type}</Badge>
            <Badge variant="default"><Calendar size={11} style={{ marginRight: 4 }} />{fmtDate(project.start_date)} → {fmtDate(project.end_date)}</Badge>
            {project.parent_id && <Badge variant="default"><Weight size={11} style={{ marginRight: 4 }} />Peso {project.weight}%</Badge>}
            {project.creator?.name && <Badge variant="default">Por: {project.creator.name}</Badge>}
            {project.frequency && <Badge variant="default"><Activity size={11} style={{ marginRight: 4 }} />{FREQ_LABEL[project.frequency] ?? project.frequency}</Badge>}
            {project.direcoes && project.direcoes.length > 0 && (
              <Badge variant="default"><Building2 size={11} style={{ marginRight: 4 }} />{project.direcoes.map(d => d.name).join(', ')}</Badge>
            )}
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<MessageSquare size={13} />} onClick={() => setFeedbackModal(true)}>Feedback</Button>
            {canEdit && (
              <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={() => setEditModal(true)}>Editar</Button>
            )}
            {canEdit && (
              <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => setDeleteModal(true)}>Eliminar</Button>
            )}
          </div>
        }
      />

      <Tabs activeKey={activeTab} onChange={setActiveTab} tabs={[
        { key: 'overview',  label: 'Visão Geral' },
        { key: 'tasks',     label: `Acções (${tasks.length})` },
        { key: 'gantt',     label: 'Cronograma' },
        { key: 'scope',     label: 'Âmbito & Mapa' },
        { key: 'progress',  label: 'Progresso' },
        { key: 'values',    label: 'Evolução de Valor' },
        { key: 'feedback',  label: 'Feedback' },
      ]}>
        {(activeTab) => {
          if (activeTab === 'overview') return OverviewCards

          if (activeTab === 'tasks')    return TasksSection
          if (activeTab === 'gantt')    return GanttSection
          if (activeTab === 'scope')    return ScopeSection
          if (activeTab === 'progress') return ProgressSection
          if (activeTab === 'values')   return <ProjectHistoryTab projectId={project.id} project={project} />
          if (activeTab === 'feedback') return <EntityFeedbackTab targetType="PROJECT" targetId={project.id} />

          return null
        }}
      </Tabs>

      <Modal open={editModal} onClose={() => setEditModal(false)} title="Editar Pilar Estratégico" width={600}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal(false)}>Cancelar</Button>
            <Button variant="primary" form="edit-project-form" type="submit" loading={updateProject.isPending} icon={<Pencil size={14} />}>Guardar</Button>
          </>
        }
      >
        <ProjectForm
          id="edit-project-form"
          editMode
          defaultValues={{
            title:        project.title,
            description:  project.description ?? '',
            creator_type: project.creator_type as any,
            creator_org_id: project.creator_org_id ? String(project.creator_org_id) : '',
            weight:       project.weight,
            start_date:   project.start_date?.split('T')[0] ?? '',
            end_date:     project.end_date?.split('T')[0] ?? '',
            parent_id:    project.parent_id ? String(project.parent_id) : '',
            status:       project.status,
            goal_label:   project.goal_label ?? '',
            frequency:    project.frequency ?? '',
            start_value:  project.start_value,
            target_value: project.target_value,
          }}
          initialDirecaoIds={project.direcoes?.map((d: any) => d.id) ?? []}
          onSubmit={payload => updateProject.mutate(payload)}
        />
      </Modal>

      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Nova Acção" width={600}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTaskModal(false)}>Cancelar</Button>
            <Button variant="primary" form="task-form" type="submit" loading={createTask.isPending} disabled={!taskFormValid} icon={<Plus size={14} />}>Criar Acção</Button>
          </>
        }
      >
        <TaskForm id="task-form" projectId={projectId} onSubmit={payload => createTask.mutate(payload)} onValidityChange={setTaskFormValid} />
      </Modal>

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Eliminar pilar estratégico"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(false)}>Cancelar</Button>
            <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => deleteProject.mutate()} loading={deleteProject.isPending}>Eliminar</Button>
          </>
        }
      >
        <p style={{ fontSize: 14, color: 'var(--color-text)' }}>
          Tem a certeza que pretende eliminar <b>{project.title}</b>? Esta acção não pode ser revertida.
        </p>
      </Modal>

      <QuickFeedbackModal
        open={feedbackModal}
        onClose={() => setFeedbackModal(false)}
        targetType="PROJECT"
        targetId={project.id}
        targetName={project.title}
        defaultReceiverId={project.creator?.id}
        defaultReceiverName={project.creator?.name}
      />
    </div>
  )
}
