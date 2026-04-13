import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GitCompare, Trophy, Minus, ChevronRight, ArrowRight } from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import PageHeader from '../../components/layout/PageHeader'
import Card from '../../components/ui/Card'
import Select from '../../components/ui/Select'
import Spinner from '../../components/ui/Spinner'
import TrafficLight from '../../components/domain/TrafficLight'

// ── types ─────────────────────────────────────────────────────────────────────

type TL = 'GREEN' | 'YELLOW' | 'RED'
const TL_COLORS: Record<TL, { bg: string; border: string; text: string }> = {
  GREEN:  { bg: 'var(--color-traffic-green-bg)',  border: 'var(--color-traffic-green)',  text: 'var(--color-traffic-green)'  },
  YELLOW: { bg: 'var(--color-traffic-yellow-bg)', border: 'var(--color-traffic-yellow)', text: 'var(--color-traffic-yellow)' },
  RED:    { bg: 'var(--color-traffic-red-bg)',    border: 'var(--color-traffic-red)',    text: 'var(--color-traffic-red)'    },
}

const ENTITY_OPTS = [
  { value: 'ASC',          label: 'ASC' },
  { value: 'REGIAO',       label: 'Região' },
  { value: 'DIRECAO',      label: 'Direcção' },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
]

function getPeriodOptions() {
  return Array.from({ length: 12 }, (_, i) => {
    const val = `2026-${String(i + 1).padStart(2, '0')}`
    return { value: val, label: val }
  })
}

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, tl, size = 120, winner }: { score: number; tl: string; size?: number; winner?: boolean }) {
  const c = TL_COLORS[(tl as TL) in TL_COLORS ? (tl as TL) : 'RED']
  const r = (size / 2) - 10
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, score)) / 100) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      {winner && (
        <div style={{
          position: 'absolute', top: -8, right: -8, zIndex: 2,
          width: 26, height: 26, borderRadius: '50%',
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, boxShadow: '0 2px 8px rgba(232,103,10,0.4)',
        }}>🏆</div>
      )}
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={10} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={c.border} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 800ms cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.22, fontWeight: 900, color: c.text, lineHeight: 1 }}>{score.toFixed(1)}</span>
        <span style={{ fontSize: size * 0.1, color: 'var(--color-text-muted)', fontWeight: 600 }}>/100</span>
      </div>
    </div>
  )
}

// ── Stat bar row ──────────────────────────────────────────────────────────────

function StatBar({ label, valA, valB, winnerSide }: { label: string; valA: number; valB: number; winnerSide: 'A' | 'B' | 'TIE' }) {
  const maxVal = Math.max(valA, valB, 1)
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: winnerSide === 'A' ? 'var(--color-primary)' : 'var(--color-text)', minWidth: 44 }}>
          {valA.toFixed(1)}%
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: winnerSide === 'B' ? 'var(--color-primary)' : 'var(--color-text)', minWidth: 44, textAlign: 'right' }}>
          {valB.toFixed(1)}%
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {/* A bar (right-aligned) */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ height: 7, borderRadius: '4px 0 0 4px', width: `${(valA / maxVal) * 100}%`, background: winnerSide === 'A' ? 'var(--color-primary)' : 'var(--color-border)', transition: 'width 700ms ease' }} />
        </div>
        {/* B bar (left-aligned) */}
        <div>
          <div style={{ height: 7, borderRadius: '0 4px 4px 0', width: `${(valB / maxVal) * 100}%`, background: winnerSide === 'B' ? 'var(--color-primary)' : 'var(--color-border)', transition: 'width 700ms ease' }} />
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BenchmarkPage() {
  const [entityType, setEntityType] = useState('ASC')
  const [idA, setIdA] = useState('')
  const [idB, setIdB] = useState('')
  const [period, setPeriod] = useState('2026-04')

  // Entity lists — read-only from cache (populated by AppShell)
  const qcRef = useQueryClient()
  const ascs          = qcRef.getQueryData<any>(['geo', 'ascs'])
  const regioes       = qcRef.getQueryData<any>(['geo', 'regioes'])
  const direcoes      = qcRef.getQueryData<any>(['direcoes'])
  const departamentos = qcRef.getQueryData<any>(['departamentos'])

  const entityOptions = useMemo(() => {
    if (entityType === 'ASC')          return ascs?.data?.map((a: any) => ({ value: String(a.id), label: a.name })) ?? []
    if (entityType === 'REGIAO')       return regioes?.data?.map((r: any) => ({ value: String(r.id), label: r.name })) ?? []
    if (entityType === 'DIRECAO')      return direcoes?.data?.map((d: any) => ({ value: String(d.id), label: d.name })) ?? []
    return departamentos?.data?.map((d: any) => ({ value: String(d.id), label: d.name })) ?? []
  }, [entityType, ascs, regioes, direcoes, departamentos])

  // Auto-select first two when list loads
  useEffect(() => {
    if (entityOptions.length >= 2) {
      setIdA(entityOptions[0].value)
      setIdB(entityOptions[1].value)
    } else if (entityOptions.length === 1) {
      setIdA(entityOptions[0].value)
      setIdB('')
    } else {
      setIdA(''); setIdB('')
    }
  }, [entityOptions])

  const canCompare = !!idA && !!idB && idA !== idB

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'benchmark', entityType, idA, idB, period],
    queryFn: () => dashboardService.getBenchmark({ entity_type: entityType, id_a: Number(idA), id_b: Number(idB), period }),
    enabled: canCompare,
  })

  const optsWithPlaceholder = [{ value: '', label: 'Seleccionar…' }, ...entityOptions]

  const nameA = data?.a?.name ?? entityOptions.find((o: any) => o.value === idA)?.label ?? 'A'
  const nameB = data?.b?.name ?? entityOptions.find((o: any) => o.value === idB)?.label ?? 'B'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <PageHeader eyebrow="Analytics" title="Benchmark" subtitle="Compare o desempenho lado a lado entre duas entidades" />

      {/* ── Controls ── */}
      <Card variant="elevated">
        <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 40px 1fr 150px', gap: 12, alignItems: 'flex-end' }}>
          <Select
            label="Tipo"
            options={ENTITY_OPTS}
            value={entityType}
            onChange={e => { setEntityType(e.target.value); setIdA(''); setIdB('') }}
          />
          <Select
            label="Entidade A"
            options={optsWithPlaceholder}
            value={idA}
            onChange={e => setIdA(e.target.value)}
          />
          {/* VS divider */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 2 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: '0.02em', boxShadow: '0 2px 8px rgba(232,103,10,0.3)' }}>
              VS
            </div>
          </div>
          <Select
            label="Entidade B"
            options={optsWithPlaceholder.filter(o => o.value !== idA || o.value === '')}
            value={idB}
            onChange={e => setIdB(e.target.value)}
          />
          <Select
            label="Período"
            options={getPeriodOptions()}
            value={period}
            onChange={e => setPeriod(e.target.value)}
          />
        </div>
      </Card>

      {/* ── Results ── */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : !canCompare ? (
        <Card variant="elevated" style={{ padding: '48px', textAlign: 'center' }}>
          <GitCompare size={40} style={{ color: 'var(--color-primary)', opacity: 0.3, margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>
            Seleccione duas entidades diferentes para iniciar a comparação
          </p>
        </Card>
      ) : data ? (
        <BenchmarkResult data={data} nameA={nameA} nameB={nameB} />
      ) : null}
    </div>
  )
}

// ── Result component ──────────────────────────────────────────────────────────

function BenchmarkResult({ data, nameA, nameB }: { data: any; nameA: string; nameB: string }) {
  const a = data.a
  const b = data.b
  const winner: 'A' | 'B' | '' = data.winner ?? ''

  const tlA = (a.traffic_light in TL_COLORS ? a.traffic_light : 'RED') as TL
  const tlB = (b.traffic_light in TL_COLORS ? b.traffic_light : 'RED') as TL
  const cA = TL_COLORS[tlA]
  const cB = TL_COLORS[tlB]

  const winSide = (field: 'execution_score' | 'goal_score' | 'total_score'): 'A' | 'B' | 'TIE' => {
    const vA = a[field] ?? 0
    const vB = b[field] ?? 0
    if (vA > vB) return 'A'
    if (vB > vA) return 'B'
    return 'TIE'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Winner banner ── */}
      {winner && (
        <div style={{
          padding: '14px 24px',
          borderRadius: 14,
          background: winner === 'A' ? cA.bg : cB.bg,
          border: `2px solid ${winner === 'A' ? cA.border : cB.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Trophy size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', flex: 1 }}>{data.message}</p>
          {data.ratio > 1 && (
            <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', borderRadius: 8, padding: '4px 10px' }}>
              {data.ratio.toFixed(2)}×
            </span>
          )}
        </div>
      )}

      {/* ── Head-to-head score cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'stretch' }}>

        {/* Entity A */}
        <Card variant="elevated" style={{ background: cA.bg, border: `2px solid ${winner === 'A' ? cA.border : 'transparent'}`, padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--color-bg)', borderRadius: 6, padding: '3px 10px' }}>
              Entidade A
            </div>
            <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>{nameA}</p>
            <ScoreRing score={a.total_score ?? 0} tl={tlA} size={130} winner={winner === 'A'} />
            <TrafficLight status={tlA} size="md" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', marginTop: 4 }}>
              <div style={{ padding: '10px', background: 'var(--color-surface)', borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)' }}>{(a.execution_score ?? 0).toFixed(1)}%</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' }}>Execução</p>
              </div>
              <div style={{ padding: '10px', background: 'var(--color-surface)', borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)' }}>{(a.goal_score ?? 0).toFixed(1)}%</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' }}>Objectivos</p>
              </div>
            </div>
          </div>
        </Card>

        {/* VS column */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 900, boxShadow: '0 2px 12px rgba(232,103,10,0.35)' }}>
            VS
          </div>
          <ArrowRight size={16} style={{ color: 'var(--color-text-muted)', transform: winner === 'B' ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 400ms' }} />
        </div>

        {/* Entity B */}
        <Card variant="elevated" style={{ background: cB.bg, border: `2px solid ${winner === 'B' ? cB.border : 'transparent'}`, padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', background: 'var(--color-bg)', borderRadius: 6, padding: '3px 10px' }}>
              Entidade B
            </div>
            <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>{nameB}</p>
            <ScoreRing score={b.total_score ?? 0} tl={tlB} size={130} winner={winner === 'B'} />
            <TrafficLight status={tlB} size="md" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', marginTop: 4 }}>
              <div style={{ padding: '10px', background: 'var(--color-surface)', borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)' }}>{(b.execution_score ?? 0).toFixed(1)}%</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' }}>Execução</p>
              </div>
              <div style={{ padding: '10px', background: 'var(--color-surface)', borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)' }}>{(b.goal_score ?? 0).toFixed(1)}%</p>
                <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, textTransform: 'uppercase' }}>Objectivos</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Head-to-head bar chart ── */}
      <Card variant="elevated">
        <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 20 }}>
          Comparação Detalhada
        </p>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{nameA}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{nameB}</span>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary)' }} />
          </div>
        </div>

        <StatBar label="Score Total"    valA={a.total_score}     valB={b.total_score}     winnerSide={winSide('total_score')} />
        <StatBar label="Execução"       valA={a.execution_score} valB={b.execution_score} winnerSide={winSide('execution_score')} />
        <StatBar label="Objectivos"     valA={a.goal_score}      valB={b.goal_score}      winnerSide={winSide('goal_score')} />

        {/* Score diff row */}
        <div style={{ marginTop: 20, padding: '14px 16px', borderRadius: 12, background: 'var(--color-bg-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          {winner ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Diferença de score:</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--color-primary)' }}>
                {Math.abs(a.total_score - b.total_score).toFixed(1)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>pontos</span>
              {data.ratio > 1 && (
                <>
                  <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-primary)' }}>{data.ratio.toFixed(2)}× mais eficiente</span>
                </>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
              <Minus size={16} />
              <span style={{ fontSize: 13, fontWeight: 700 }}>Desempenho idêntico</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
