import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Home, ExternalLink } from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/ui/Card'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import TrafficLight from '../../components/domain/TrafficLight'
import PerformanceScore from '../../components/domain/PerformanceScore'
import Badge from '../../components/ui/Badge'
import ProgressBar from '../../components/ui/ProgressBar'

const LEVELS = ['NATIONAL', 'REGIONAL', 'ASC', 'PELOURO', 'DIRECAO', 'DEPARTAMENTO']
const LEVEL_LABELS: Record<string, string> = {
  NATIONAL: 'País', REGIONAL: 'Região', ASC: 'ASC', PELOURO: 'Pelouro', DIRECAO: 'Direcção', DEPARTAMENTO: 'Departamento',
}

interface Crumb { level: string; id?: number; name: string }

function getPeriodOptions() {
  const opts = []
  for (let m = 1; m <= 12; m++) {
    const val = `2026-${String(m).padStart(2, '0')}`
    opts.push({ value: val, label: val })
  }
  return opts
}

export default function DrillDownPage() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('2026-04')
  const [crumbs, setCrumbs] = useState<Crumb[]>([{ level: 'NATIONAL', name: 'País' }])

  const current = crumbs[crumbs.length - 1]
  const isLeafLevel = current.level === 'ASC'

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'drill-down', { level: current.level, id: current.id, period }],
    queryFn: () => dashboardService.getDrillDown({ level: current.level, id: current.id, period }),
  })

  const handleCardClick = (item: { id: number; name: string; type: string }) => {
    // At leaf levels (ASC), items are PROJECT/TASK — navigate to detail pages
    if (isLeafLevel) {
      if (item.type === 'PROJECT') {
        navigate(`/projects/${item.id}`)
      } else if (item.type === 'TASK') {
        navigate(`/tasks/${item.id}`)
      }
      return
    }
    // Otherwise, drill deeper in the hierarchy
    const nextLevelIdx = LEVELS.indexOf(current.level) + 1
    if (nextLevelIdx < LEVELS.length) {
      setCrumbs(c => [...c, { level: LEVELS[nextLevelIdx], id: item.id, name: item.name }])
    }
  }

  const goToCrumb = (idx: number) => {
    setCrumbs(c => c.slice(0, idx + 1))
  }

  return (
    <div>
      <PageHeader eyebrow="Analytics" title="Drill-Down Interactivo" subtitle="Navegar hierarquia: País → Região → ASC → Pelouro → Direcção → Departamento" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {crumbs.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />}
              <button
                onClick={() => goToCrumb(i)}
                style={{
                  background: i === crumbs.length - 1 ? 'var(--color-primary-soft)' : 'none',
                  border: i === crumbs.length - 1 ? '1px solid rgba(232,103,10,0.20)' : 'none',
                  borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                  fontSize: 13, fontWeight: i === crumbs.length - 1 ? 700 : 600,
                  color: i === crumbs.length - 1 ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                {i === 0 && <Home size={12} />}{c.name}
                <Badge variant="muted" style={{ fontSize: 10, padding: '1px 6px' }}>{LEVEL_LABELS[c.level]}</Badge>
              </button>
            </React.Fragment>
          ))}
        </div>
        <div style={{ width: 160 }}>
          <Select options={getPeriodOptions()} value={period} onChange={e => setPeriod(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {data?.items?.map(item => (
            <Card key={`${item.type}-${item.id}`} variant="default" onClick={() => handleCardClick(item)} style={{ borderLeft: `3px solid var(--color-${item.traffic_light === 'GREEN' ? 'traffic-green' : item.traffic_light === 'YELLOW' ? 'traffic-yellow' : 'traffic-red'})`, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <Badge variant="muted" style={{ marginBottom: 6 }}>
                    {item.type === 'PROJECT' ? 'Projecto' : item.type === 'TASK' ? 'Tarefa' : (LEVEL_LABELS[item.type] || item.type)}
                  </Badge>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>{item.name}</h3>
                </div>
                <TrafficLight status={item.traffic_light} showLabel={false} />
              </div>
              <ProgressBar value={item.total_score} variant="auto" height={6} showLabel label={`Score: ${item.total_score.toFixed(1)}`} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <span>Exec: {item.execution_score.toFixed(1)}%</span>
                <span>Goal: {item.goal_score.toFixed(1)}%</span>
                {isLeafLevel ? (
                  <span style={{ color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
                    Ver detalhes <ExternalLink size={11} />
                  </span>
                ) : (
                  item.children_count > 0 && <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{item.children_count} sub-entidades →</span>
                )}
              </div>
            </Card>
          ))}
          {!data?.items?.length && !isLoading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
              <p>Sem dados para este nível.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
