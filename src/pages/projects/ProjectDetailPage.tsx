import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Calendar, CalendarCheck, Weight, ArrowUp, MapPin, Users, Tag, User, Activity, Building2, FolderOpen, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import { projectsService } from '../../services/projects.service'
import { tasksService } from '../../services/tasks.service'
import { milestonesService } from '../../services/milestones.service'
import { dashboardService } from '../../services/dashboard.service'
import { geoService } from '../../services/geo.service'
import { orgService } from '../../services/org.service'
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
import TaskForm from '../tasks/TaskForm'
import ProjectForm from './ProjectForm'
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
  const [deleteModal, setDeleteModal] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editingProgress, setEditingProgress] = useState(false)
  const [progressInput, setProgressInput] = useState('')

  const canAddTask = can('create:task') && user?.role !== 'CA' && user?.role !== 'PELOURO'

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
  const { data: ascsData }      = useQuery({ queryKey: ['geo', 'ascs'],    queryFn: () => geoService.listAscs()              })
  const { data: regioesData }   = useQuery({ queryKey: ['geo', 'regioes'], queryFn: () => geoService.listRegioes()            })
  const { data: deptsData }     = useQuery({ queryKey: ['departamentos'],   queryFn: () => orgService.listDepartamentos()      })
  const { data: direcoesData }  = useQuery({ queryKey: ['direcoes'],        queryFn: () => orgService.listDirecoes()           })

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
    mutationFn: (val: number) => projectsService.updateProgress(projectId, val),
    onSuccess: () => {
      toast.success('Progresso actualizado.')
      qc.invalidateQueries({ queryKey: ['projects', projectId] })
      qc.invalidateQueries({ queryKey: ['dashboard', 'direcao-overview'] })
      setEditingProgress(false)
      setProgressInput('')
    },
    onError: () => toast.error('Erro ao actualizar progresso.'),
  })

  const tasks = tasksData?.data ?? []
  const subProjects = subProjectsData?.data ?? []
  const timelineData = timeline?.periods?.map(p => ({ period: p.period.slice(5), total_score: p.total_score })) ?? []

  const ascMap = useMemo(() => {
    const m: Record<number, string> = {}
    ascsData?.data?.forEach(a => { m[a.id] = a.name })
    return m
  }, [ascsData])

  const regiaoMap = useMemo(() => {
    const m: Record<number, string> = {}
    regioesData?.data?.forEach(r => { m[r.id] = r.name })
    return m
  }, [regioesData])

  const deptMap = useMemo(() => {
    const m: Record<number, string> = {}
    deptsData?.data?.forEach(d => { m[d.id] = d.name })
    return m
  }, [deptsData])

  const direcaoMap = useMemo(() => {
    const m: Record<number, string> = {}
    direcoesData?.data?.forEach(d => { m[d.id] = d.name })
    return m
  }, [direcoesData])

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
    owner_label: t.owner_name ?? t.owner_type,
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
      const asc = (ascsData?.data ?? []).find(a => a.id === s.scope_id)
      if (asc?.polygon) return [{ name: asc.name, scopeType: 'ASC', geometry: asc.polygon as any, ...progressProps }]
    }
    if (s.scope_type === 'REGIAO') {
      const reg = (regioesData?.data ?? []).find(r => r.id === s.scope_id)
      if (reg?.polygon) return [{ name: reg.name, scopeType: 'Região', geometry: reg.polygon as any, ...progressProps }]
    }
    return []
  })

  // ── Reusable section blocks ────────────────────────────────────────────────

  // Traffic light colour helpers
  const TL_BG: Record<string, string> = { GREEN: 'var(--color-traffic-green-bg)', YELLOW: 'var(--color-traffic-yellow-bg)', RED: 'var(--color-traffic-red-bg)' }
  const TL_FG: Record<string, string> = { GREEN: 'var(--color-traffic-green)', YELLOW: 'var(--color-traffic-yellow)', RED: 'var(--color-traffic-red)' }

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: reached ? 'var(--color-traffic-green)' : 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Activity size={15} style={{ color: '#fff' }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 1 }}>
                {project?.goal_label || 'Objectivo KPI'}
              </p>
              {project?.frequency && (
                <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  Frequência: {FREQ_LABEL[project.frequency] ?? project.frequency}
                </span>
              )}
            </div>
            {reached && (
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-traffic-green)', background: 'var(--color-traffic-green-bg)', border: '1px solid var(--color-traffic-green)44', borderRadius: 8, padding: '3px 10px' }}>
                ✓ Atingido
              </span>
            )}
          </div>

          {/* Numbers row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', background: 'var(--color-bg)', borderRadius: 10, padding: '10px 8px' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4 }}>Inicial</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-text-muted)', lineHeight: 1 }}>
                {goalStart.toLocaleString('pt-MZ')}
              </p>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--color-bg)', borderRadius: 10, padding: '10px 8px', border: '2px solid var(--color-primary)' }}>
              <p style={{ fontSize: 11, color: 'var(--color-primary)', fontWeight: 700, marginBottom: 4 }}>Actual</p>
              <p style={{ fontSize: 24, fontWeight: 900, color: reached ? 'var(--color-traffic-green)' : 'var(--color-primary)', lineHeight: 1 }}>
                {goalCurrent.toLocaleString('pt-MZ')}
              </p>
            </div>
            <div style={{ textAlign: 'center', background: 'var(--color-bg)', borderRadius: 10, padding: '10px 8px' }}>
              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 4 }}>Meta</p>
              <p style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>
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
          {can('update:project') && (
            editingProgress ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="number"
                  step="any"
                  value={progressInput}
                  onChange={e => setProgressInput(e.target.value)}
                  placeholder={`Valor actual (era ${goalCurrent})`}
                  style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-primary)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 14, fontWeight: 700, outline: 'none' }}
                  autoFocus
                />
                <button
                  disabled={progressInput === '' || saveProgress.isPending}
                  onClick={() => saveProgress.mutate(parseFloat(progressInput))}
                  style={{ padding: '8px 20px', borderRadius: 8, background: progressInput !== '' ? 'var(--color-primary)' : 'var(--color-border)', color: progressInput !== '' ? '#fff' : 'var(--color-text-muted)', border: 'none', cursor: progressInput !== '' ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 800, flexShrink: 0 }}
                >
                  {saveProgress.isPending ? '…' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setEditingProgress(false); setProgressInput('') }}
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

      {/* ── Details card — full width, icon grid ── */}
      <Card variant="elevated">
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 20 }}>Detalhes do Pilar Estratégico</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {/* Tipo */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--color-bg-strong)', borderRadius: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Tag size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Tipo</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{CREATOR_TYPE_LABEL[project.creator_type] ?? project.creator_type}</p>
            </div>
          </div>

          {/* Criado por */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--color-bg-strong)', borderRadius: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Criado por</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.creator?.name ?? '—'}</p>
            </div>
          </div>

          {/* Início */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--color-bg-strong)', borderRadius: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Início</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{fmtDate(project.start_date)}</p>
            </div>
          </div>

          {/* Fim */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--color-bg-strong)', borderRadius: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarCheck size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Fim</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{fmtDate(project.end_date)}</p>
            </div>
          </div>

          {/* Peso — só quando tem pilar estratégico pai */}
          {project.parent_id && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--color-bg-strong)', borderRadius: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Weight size={16} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Peso</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>{project.weight}%</p>
              </div>
            </div>
          )}

          {/* Estado */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--color-bg-strong)', borderRadius: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Activity size={16} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Estado</p>
              <Badge variant={STATUS_BADGE[project.status]} style={{ fontSize: 12 }}>{STATUS_LABEL[project.status]}</Badge>
            </div>
          </div>

          {/* Pilar Estratégico pai (optional) */}
          {project.parent && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: 'var(--color-bg-strong)', borderRadius: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FolderOpen size={16} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Pilar Estratégico pai</p>
                <button onClick={() => navigate(`/projects/${project.parent!.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: 13, fontWeight: 700, padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ArrowUp size={11} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.parent.title}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Direcções afectadas */}
        {project.direcoes && project.direcoes.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Building2 size={14} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Direcções afectadas</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {project.direcoes.map(d => <Badge key={d.id} variant="default" style={{ fontSize: 12 }}>{d.name}</Badge>)}
            </div>
          </div>
        )}
      </Card>

      {/* ── Equipa ── */}
      <Card variant="elevated">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Users size={15} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipa & Responsáveis</p>
        </div>
        {uniqueOwners.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', padding: '12px 0' }}>Nenhuma acção com responsável atribuído.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
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

        {/* ASCs & Regiões afectadas */}
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

      {/* ── Sub-pilares ── */}
      {subProjects.length > 0 && (
        <Card variant="elevated">
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Sub-pilares ({subProjects.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {subProjects.map(sp => (
              <div key={sp.id} onClick={() => navigate(`/projects/${sp.id}`)}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--color-bg-strong)', borderRadius: 10, cursor: 'pointer', border: '1.5px solid transparent', transition: 'border-color 150ms ease' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{sp.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{fmtDate(sp.start_date)} → {fmtDate(sp.end_date)}</p>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Badge variant={STATUS_BADGE[sp.status]} style={{ fontSize: 10 }}>{STATUS_LABEL[sp.status]}</Badge>
                  {sp.performance && <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-text)' }}>{sp.performance.total_score.toFixed(1)}</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
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
          {tasks.map(t => (
            <TaskCard
              key={t.id}
              title={t.title}
              frequency={t.frequency}
              goalLabel={t.goal_label}
              startValue={t.start_value}
              currentValue={t.current_value}
              targetValue={t.target_value}
              indicadoresTotal={0}
              milesDone={0}
              trafficLight={(t.performance?.traffic_light ?? 'YELLOW') as 'GREEN' | 'YELLOW' | 'RED'}
              ownerLabel={t.owner_name ?? t.owner_type}
              onClick={() => navigate(`/tasks/${t.id}`)}
            />
          ))}
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
            <Badge variant="default"><Calendar size={11} style={{ marginRight: 4 }} />{fmtDate(project.start_date)} → {fmtDate(project.end_date)}</Badge>
            {project.parent_id && <Badge variant="default"><Weight size={11} style={{ marginRight: 4 }} />Peso {project.weight}%</Badge>}
            {project.creator?.name && <Badge variant="default">Por: {project.creator.name}</Badge>}
          </>
        }
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            {can('update:project') && (
              <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={() => setEditModal(true)}>Editar</Button>
            )}
            {can('create:project') && (
              <Button variant="danger" size="sm" icon={<Trash2 size={13} />} onClick={() => setDeleteModal(true)}>Eliminar</Button>
            )}
          </div>
        }
      />

      <Tabs tabs={[
        { key: 'overview',  label: 'Visão Geral' },
        { key: 'tasks',     label: `Acções (${tasks.length})` },
        { key: 'gantt',     label: 'Cronograma' },
        { key: 'scope',     label: 'Âmbito & Mapa' },
        { key: 'progress',  label: 'Progresso' },
      ]}>
        {(activeTab) => {
          if (activeTab === 'overview') return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
              {OverviewCards}
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Acções ({tasks.length})
                </p>
                {TasksSection}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Cronograma
                </p>
                {GanttSection}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Âmbito & Mapa
                </p>
                {ScopeSection}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>
                  Progresso
                </p>
                {ProgressSection}
              </div>
            </div>
          )

          if (activeTab === 'tasks')    return TasksSection
          if (activeTab === 'gantt')    return GanttSection
          if (activeTab === 'scope')    return ScopeSection
          if (activeTab === 'progress') return ProgressSection

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
          onSubmit={payload => updateProject.mutate(payload)}
        />
      </Modal>

      <Modal open={taskModal} onClose={() => setTaskModal(false)} title="Nova Acção" width={600}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTaskModal(false)}>Cancelar</Button>
            <Button variant="primary" form="task-form" type="submit" loading={createTask.isPending} icon={<Plus size={14} />}>Criar Acção</Button>
          </>
        }
      >
        <TaskForm id="task-form" projectId={projectId} onSubmit={payload => createTask.mutate(payload)} />
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
    </div>
  )
}
