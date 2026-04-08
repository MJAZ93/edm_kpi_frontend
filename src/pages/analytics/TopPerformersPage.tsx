import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Users, CheckCircle2, Activity } from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import { useAuth } from '../../hooks/useAuth'
import PageHeader from '../../components/layout/PageHeader'
import Tabs from '../../components/ui/Tabs'
import Select from '../../components/ui/Select'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import TrafficLight from '../../components/domain/TrafficLight'
import ProgressBar from '../../components/ui/ProgressBar'
import type { EmployeeRankItem } from '../../types'

const ENTITY_TABS = [
  { key: 'ASC',          label: 'ASC' },
  { key: 'REGIAO',       label: 'Regiões' },
  { key: 'DIRECAO',      label: 'Direcções' },
  { key: 'DEPARTAMENTO', label: 'Departamentos' },
  { key: 'EMPLOYEES',    label: 'Funcionários' },
]

function getPeriodOptions() {
  return Array.from({ length: 12 }, (_, i) => {
    const val = `2026-${String(i + 1).padStart(2, '0')}`
    return { value: val, label: val }
  })
}

const MEDALS = ['🥇', '🥈', '🥉']

const TL_COLORS = {
  GREEN:  { text: 'var(--color-traffic-green)',  bg: 'var(--color-traffic-green-bg)'  },
  YELLOW: { text: 'var(--color-traffic-yellow)', bg: 'var(--color-traffic-yellow-bg)' },
  RED:    { text: 'var(--color-traffic-red)',    bg: 'var(--color-traffic-red-bg)'    },
} as const

export default function TopPerformersPage() {
  const { isDepartamento } = useAuth()
  const [entityType, setEntityType] = useState('ASC')
  const [period, setPeriod] = useState('2026-04')

  const isEmployeeTab = entityType === 'EMPLOYEES'

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'top-performers', { entity_type: entityType, period }],
    queryFn: () => dashboardService.getTopPerformers({ entity_type: entityType, period, limit: 20 }),
    enabled: !isEmployeeTab,
  })

  const { data: distData } = useQuery({
    queryKey: ['dashboard', 'distribution', entityType],
    queryFn: () => dashboardService.getDistribution({ dimension: 'traffic_light', entity_type: entityType }),
    enabled: !isEmployeeTab,
  })

  const { data: empData, isLoading: empLoading } = useQuery({
    queryKey: ['dashboard', 'employee-ranking'],
    queryFn: dashboardService.getEmployeeRanking,
    enabled: isEmployeeTab,
  })

  const ranking = data?.ranking ?? []
  const distribution = (distData as any)?.data ?? []
  const employees: EmployeeRankItem[] = empData?.ranking ?? []

  return (
    <div>
      <PageHeader eyebrow="Analytics" title="Top Performers" subtitle="Ranking de desempenho por entidade e período" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Tabs tabs={ENTITY_TABS} activeKey={entityType} onChange={setEntityType}>{() => null}</Tabs>
        <div style={{ width: 160 }}>
          <Select options={getPeriodOptions()} value={period} onChange={e => setPeriod(e.target.value)} />
        </div>
      </div>

      {isEmployeeTab ? (
        empLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
        ) : (
          <EmployeePanel employees={employees} hideCategoryTabs={isDepartamento()} />
        )
      ) : isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size="lg" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>

          {/* ── Leaderboard ── */}
          <Card variant="elevated">
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 20 }}>
              Leaderboard — {ENTITY_TABS.find(t => t.key === entityType)?.label}
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginLeft: 8 }}>
                {ranking.length} {ranking.length === 1 ? 'entidade' : 'entidades'}
              </span>
            </p>

            {ranking.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados de performance para este período.</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                  Certifique-se que existem acções e indicadores registados.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ranking.map((item: any, i: number) => {
                  const tl = (item.traffic_light in TL_COLORS ? item.traffic_light : 'RED') as keyof typeof TL_COLORS
                  const c = TL_COLORS[tl]
                  const isTop = i < 3
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        background: isTop ? c.bg : 'var(--color-bg-strong)',
                        border: `1.5px solid ${isTop ? c.text + '33' : 'transparent'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: isTop ? 20 : 13, fontWeight: 800, minWidth: 30, textAlign: 'center', color: isTop ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                          {isTop ? MEDALS[i] : `#${i + 1}`}
                        </span>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </span>
                        <span style={{ fontSize: 20, fontWeight: 900, color: c.text, flexShrink: 0 }}>
                          {(item.total_score ?? 0).toFixed(1)}
                        </span>
                        <TrafficLight status={tl} showLabel={false} size="sm" />
                      </div>
                      {/* Sub-scores + bar */}
                      <div style={{ paddingLeft: 42 }}>
                        <ProgressBar value={item.total_score} variant="auto" height={4} />
                        <div style={{ display: 'flex', gap: 10, marginTop: 5 }}>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            Exec {(item.execution_score ?? 0).toFixed(1)}%
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                          <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                            Obj {(item.goal_score ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* ── Sidebar: distribution + summary ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Traffic light distribution */}
            <Card variant="elevated">
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 16 }}>Distribuição por Semáforo</p>
              {distribution.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem dados.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {distribution.map((bucket: any) => {
                    const count = bucket.count ?? bucket.value ?? 0
                    const pct   = bucket.percentage ?? 0
                    const label = bucket.label === 'GREEN' ? 'Verde ≥90%'
                                : bucket.label === 'YELLOW' ? 'Amarelo 60–89%'
                                : bucket.label === 'RED' ? 'Vermelho <60%'
                                : bucket.label
                    const color = bucket.label === 'GREEN'  ? 'var(--color-traffic-green)'
                                : bucket.label === 'YELLOW' ? 'var(--color-traffic-yellow)'
                                : 'var(--color-traffic-red)'
                    return (
                      <div key={bucket.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)' }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color }}>{count}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 400ms ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Summary stats */}
            {ranking.length > 0 && (() => {
              const avg = ranking.reduce((s: number, r: any) => s + r.total_score, 0) / ranking.length
              const best = ranking[0]
              const worst = ranking[ranking.length - 1]
              return (
                <Card variant="elevated">
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 14 }}>Resumo</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {[
                      { label: 'Média geral',   value: `${avg.toFixed(1)}` },
                      { label: 'Melhor score',  value: `${best.total_score.toFixed(1)} (${best.name})` },
                      { label: 'Pior score',    value: `${worst.total_score.toFixed(1)} (${worst.name})` },
                      { label: 'Total entidades', value: ranking.length },
                    ].map((row, i, arr) => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>{row.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Employee Panel ────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  DIRECAO: 'Director', DEPARTAMENTO: 'Dep. Head', PELOURO: 'Pelouro', CA: 'CA',
}

const CATEGORY_TABS = [
  { key: 'ALL',         label: 'Todos' },
  { key: 'DIR_DIRECAO', label: 'Dir. Direcção' },
  { key: 'CHEFE_DEPT',  label: 'Chefe de Dept.' },
  { key: 'DIR_REGIONAL',label: 'Dir. Regional' },
  { key: 'DIR_ASC',     label: 'Dir. ASC' },
  { key: 'COLABORADOR', label: 'Colaboradores' },
] as const

type CategoryKey = typeof CATEGORY_TABS[number]['key']

const TL_EMP = {
  GREEN:  { text: 'var(--color-traffic-green)',  bg: 'var(--color-traffic-green-bg)'  },
  YELLOW: { text: 'var(--color-traffic-yellow)', bg: 'var(--color-traffic-yellow-bg)' },
  RED:    { text: 'var(--color-traffic-red)',    bg: 'var(--color-traffic-red-bg)'    },
} as const

const MEDALS_EMP = ['🥇', '🥈', '🥉']

function EmployeePanel({ employees, hideCategoryTabs = false }: { employees: EmployeeRankItem[]; hideCategoryTabs?: boolean }) {
  const [selected, setSelected] = useState<EmployeeRankItem | null>(null)
  const [category, setCategory] = useState<CategoryKey>('ALL')

  const filtered = category === 'ALL' || hideCategoryTabs ? employees : employees.filter(e => e.category === category)

  // Re-rank within the filtered subset
  const ranked = filtered.map((e, i) => ({ ...e, rank: i + 1 }))

  if (employees.length === 0) {
    return (
      <Card variant="elevated" style={{ padding: '48px 32px', textAlign: 'center' }}>
        <Users size={36} style={{ color: 'var(--color-primary)', opacity: 0.3, margin: '0 auto 12px' }} />
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-muted)' }}>
          Sem funcionários associados a departamentos.
        </p>
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6, fontStyle: 'italic' }}>
          Adicione utilizadores a departamentos para ver o ranking.
        </p>
      </Card>
    )
  }

  const avg = employees.reduce((s, e) => s + e.total_score, 0) / employees.length
  const withMs = employees.filter(e => e.ms_total > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Sub-tab strip — hidden for DEPARTAMENTO role ── */}
      {!hideCategoryTabs && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CATEGORY_TABS.map(tab => {
          const count = tab.key === 'ALL' ? employees.length : employees.filter(e => e.category === tab.key).length
          const isActive = category === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => { setCategory(tab.key); setSelected(null) }}
              style={{
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 12, transition: 'all 150ms',
                background: isActive ? 'var(--color-primary)' : 'var(--color-bg-strong)',
                color: isActive ? '#fff' : 'var(--color-text-muted)',
                boxShadow: isActive ? '0 2px 8px rgba(232,103,10,0.25)' : 'none',
              }}
            >
              {tab.label}
              <span style={{
                marginLeft: 6, fontSize: 10, fontWeight: 800,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--color-border)',
                color: isActive ? '#fff' : 'var(--color-text-muted)',
                borderRadius: 10, padding: '1px 6px',
              }}>{count}</span>
            </button>
          )
        })}
      </div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
      {/* Ranking list */}
      <Card variant="elevated">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)' }}>
            {CATEGORY_TABS.find(t => t.key === category)?.label ?? 'Todos'}
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginLeft: 8 }}>
              {ranked.length} {ranked.length === 1 ? 'colaborador' : 'colaboradores'}
            </span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: 'var(--color-bg-strong)', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>
            <Activity size={12} style={{ color: 'var(--color-primary)' }} /> Média: {ranked.length > 0 ? (ranked.reduce((s, e) => s + e.total_score, 0) / ranked.length).toFixed(1) : '—'}
          </div>
        </div>

        {ranked.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Sem colaboradores nesta categoria.</p>
          </div>
        ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ranked.map((emp, i) => {
            const tl = (emp.traffic_light in TL_EMP ? emp.traffic_light : 'RED') as keyof typeof TL_EMP
            const c = TL_EMP[tl]
            const isTop = i < 3
            const isSelected = selected?.id === emp.id
            const msPct = emp.ms_total > 0 ? (emp.ms_done / emp.ms_total) * 100 : 0

            return (
              <div
                key={emp.id}
                onClick={() => setSelected(isSelected ? null : emp)}
                style={{
                  padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                  background: isSelected ? c.bg : isTop ? `${c.text}0d` : 'var(--color-bg-strong)',
                  border: `2px solid ${isSelected ? c.text : isTop ? `${c.text}33` : 'transparent'}`,
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = `${c.text}55` }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.borderColor = isTop ? `${c.text}33` : 'transparent' }}
              >
                {/* Row 1: medal + name + score + TL */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: isTop ? 20 : 12, fontWeight: 800, minWidth: 30, textAlign: 'center', color: isTop ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {isTop ? MEDALS_EMP[i] : `#${i + 1}`}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                      {emp.dept_name && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: 4, padding: '1px 6px' }}>
                          {emp.dept_name}
                        </span>
                      )}
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', borderRadius: 4, padding: '1px 6px' }}>
                        {ROLE_LABELS[emp.role] ?? emp.role}
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ fontSize: 20, fontWeight: 900, color: c.text }}>{emp.total_score.toFixed(1)}</span>
                  </div>
                  <TrafficLight status={tl} showLabel={false} size="sm" />
                </div>

                {/* Row 2: progress bar + indicador badge */}
                <div style={{ paddingLeft: 42 }}>
                  <ProgressBar value={emp.total_score} variant="auto" height={4} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Exec {(emp.execution_score ?? 0).toFixed(1)}%
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>·</span>
                      <span style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        Obj {(emp.goal_score ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    {emp.ms_total > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <CheckCircle2 size={10} style={{ color: 'var(--color-traffic-green)' }} />
                        {emp.ms_done}/{emp.ms_total} indicadores ({msPct.toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        )}
      </Card>

      {/* Detail sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {selected ? (
          <Card variant="elevated" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header */}
            {(() => {
              const tl = (selected.traffic_light in TL_EMP ? selected.traffic_light : 'RED') as keyof typeof TL_EMP
              const c = TL_EMP[tl]
              const msPct = selected.ms_total > 0 ? (selected.ms_done / selected.ms_total) * 100 : 0
              return (
                <>
                  <div style={{ padding: '16px', background: c.bg, borderBottom: '1px solid var(--color-border)' }}>
                    {/* Avatar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 900, flexShrink: 0 }}>
                        {selected.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1.2 }}>{selected.name}</p>
                        <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                          {selected.dept_name && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', background: 'var(--color-bg)', borderRadius: 4, padding: '1px 6px' }}>
                              {selected.dept_name}
                            </span>
                          )}
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-soft)', borderRadius: 4, padding: '1px 6px' }}>
                            {ROLE_LABELS[selected.role] ?? selected.role}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Score big */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 40, fontWeight: 900, color: c.text, lineHeight: 1 }}>{selected.total_score.toFixed(1)}</span>
                      <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>/100</span>
                    </div>
                    <TrafficLight status={tl} size="sm" style={{ marginTop: 6 }} />
                  </div>

                  <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Score breakdown */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Execução',   value: `${selected.execution_score.toFixed(1)}%` },
                        { label: 'Objectivos', value: `${selected.goal_score.toFixed(1)}%` },
                      ].map(row => (
                        <div key={row.label} style={{ padding: '10px', background: 'var(--color-bg-strong)', borderRadius: 10, textAlign: 'center' }}>
                          <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--color-text)' }}>{row.value}</p>
                          <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Indicador summary */}
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                        Indicadores
                      </p>
                      {selected.ms_total === 0 ? (
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Sem indicadores registados.</p>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>
                              {selected.ms_done} de {selected.ms_total} concluídos
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--color-traffic-green)' }}>
                              {msPct.toFixed(0)}%
                            </span>
                          </div>
                          <ProgressBar value={msPct} variant="auto" height={6} />
                        </>
                      )}
                    </div>

                    <button
                      onClick={() => setSelected(null)}
                      style={{ width: '100%', padding: '8px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}
                    >
                      ✕ Fechar
                    </button>
                  </div>
                </>
              )
            })()}
          </Card>
        ) : (
          <>
            {/* Stats summary */}
            <Card variant="elevated">
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', marginBottom: 14 }}>Resumo</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {[
                  { label: 'Total colaboradores', value: employees.length },
                  { label: 'Com indicadores',       value: withMs.length },
                  { label: 'Média de score',        value: `${avg.toFixed(1)}` },
                  { label: 'Melhor performer',      value: employees[0]?.name ?? '—' },
                ].map((row, i, arr) => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>{row.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-text)', textAlign: 'right', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="elevated" style={{ textAlign: 'center', padding: '20px 16px' }}>
              <Users size={24} style={{ color: 'var(--color-primary)', opacity: 0.45, margin: '0 auto 8px' }} />
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                Clique num colaborador para ver o detalhe
              </p>
            </Card>
          </>
        )}
      </div>
      </div>  {/* end grid */}
    </div>
  )
}
