import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Mail, Building2, ListChecks, AlertTriangle, CheckCircle2, Clock, TrendingUp, ChevronRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { dashboardService } from '../../services/dashboard.service'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'

const TL_COLORS: Record<string, { text: string; bg: string }> = {
  GREEN:  { text: '#16a34a', bg: '#dcfce7' },
  YELLOW: { text: '#d97706', bg: '#fef3c7' },
  RED:    { text: '#dc2626', bg: '#fee2e2' },
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['user-detail', id],
    queryFn: () => dashboardService.getUserDetail(Number(id)),
    enabled: !!id,
  })

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
  if (!data) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-text-muted)' }}>Utilizador não encontrado</div>

  const { user, departments, score, tasks, milestones, stats, monthly } = data
  const tl = TL_COLORS[score.traffic_light] ?? TL_COLORS.RED

  const overdueMilestones = milestones.filter((m: any) => m.days_overdue > 0)

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>
          <ArrowLeft size={20} />
        </button>
        <Avatar name={user.name} size="lg" />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-text)', margin: 0 }}>{user.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-muted)' }}>
              <Mail size={12} /> {user.email}
            </span>
            <Badge variant="neutral" size="sm">{user.role}</Badge>
            {departments.map((d: any) => (
              <span key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'var(--color-text-muted)' }}>
                <Building2 size={11} /> {d.name}
              </span>
            ))}
          </div>
        </div>
        {/* Score circle */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: `4px solid ${tl.text}`, background: tl.bg,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: tl.text, lineHeight: 1 }}>{score.total_score.toFixed(1)}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: tl.text }}>/100</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Score Total', value: score.total_score.toFixed(1), color: tl.text },
          { label: 'Execução', value: `${score.execution_score}%`, color: '#e8670a' },
          { label: 'Objectivos', value: `${score.goal_score}%`, color: '#4a6fa5' },
          { label: 'Indicadores', value: `${stats.done}/${stats.total}`, color: '#16a34a' },
          { label: 'Atrasados', value: stats.overdue, color: stats.overdue > 0 ? '#dc2626' : '#16a34a' },
        ].map(s => (
          <Card key={s.label} variant="elevated" style={{ textAlign: 'center', padding: '16px 12px' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Monthly trend */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <TrendingUp size={14} style={{ color: 'var(--color-primary)' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Progresso Mensal</p>
          </div>
          {monthly.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '30px 0' }}>Sem dados mensais</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly.map((m: any) => ({
                ...m,
                month: new Date(m.month + '-01').toLocaleDateString('pt-MZ', { month: 'short', year: '2-digit' }),
                pct: m.total > 0 ? Math.round((m.done / m.total) * 100) : 0,
              }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-surface-strong)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v: any, name: string) => [v, name === 'done' ? 'Concluídos' : 'Total']}
                />
                <Bar dataKey="total" fill="var(--color-border)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="done" radius={[6, 6, 0, 0]}>
                  {monthly.map((_: any, i: number) => (
                    <Cell key={i} fill="#16a34a" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Overdue milestones */}
        <Card variant="elevated">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <AlertTriangle size={14} style={{ color: '#dc2626' }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Indicadores Atrasados
            </p>
            {overdueMilestones.length > 0 && (
              <Badge variant="danger" size="sm">{overdueMilestones.length}</Badge>
            )}
          </div>
          {overdueMilestones.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-text-muted)' }}>
              <CheckCircle2 size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>Nenhum indicador atrasado</p>
            </div>
          ) : (
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {overdueMilestones.map((ms: any, i: number) => (
                <div
                  key={ms.id}
                  onClick={() => navigate(`/tasks/${ms.task_id}`)}
                  style={{
                    padding: '10px 8px', cursor: 'pointer', borderRadius: 8,
                    borderBottom: i < overdueMilestones.length - 1 ? '1px solid var(--color-border)' : 'none',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                      {ms.title}
                    </p>
                    <Badge variant="danger" size="sm">{ms.days_overdue}d</Badge>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{ms.task_title} · {ms.project_title}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Tasks */}
      <Card variant="elevated" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <ListChecks size={14} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Acções Atribuídas
          </p>
          <Badge variant="neutral" size="sm">{tasks.length}</Badge>
        </div>
        {tasks.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>Sem acções atribuídas</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {tasks.map((t: any, i: number) => (
              <div
                key={t.id}
                onClick={() => navigate(`/tasks/${t.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 8px', cursor: 'pointer', borderRadius: 8,
                  borderBottom: i < tasks.length - 1 ? '1px solid var(--color-border)' : 'none',
                  transition: 'background 120ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: t.status === 'COMPLETED' ? '#16a34a' : t.status === 'CANCELLED' ? '#94a3b8' : 'var(--color-primary)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.title}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>
                    {[t.project_name, t.dept_name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Badge variant={t.status === 'COMPLETED' ? 'success' : t.status === 'CANCELLED' ? 'neutral' : 'warning'} size="sm">
                  {t.status === 'COMPLETED' ? 'Concluída' : t.status === 'CANCELLED' ? 'Cancelada' : 'Activa'}
                </Badge>
                <ChevronRight size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* All milestones */}
      <Card variant="elevated">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Clock size={14} style={{ color: 'var(--color-primary)' }} />
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
            Todos os Indicadores
          </p>
          <Badge variant="neutral" size="sm">{milestones.length}</Badge>
        </div>
        {milestones.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '20px 0' }}>Sem indicadores</p>
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Indicador</th>
                  <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Acção</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Data</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Progresso</th>
                  <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700, color: 'var(--color-text-muted)', fontSize: 10, textTransform: 'uppercase' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((ms: any) => {
                  const pct = ms.planned_value > 0 ? Math.round((ms.achieved_value / ms.planned_value) * 100) : 0
                  const isOverdue = ms.days_overdue > 0
                  return (
                    <tr
                      key={ms.id}
                      onClick={() => navigate(`/tasks/${ms.task_id}`)}
                      style={{
                        borderBottom: '1px solid var(--color-border)', cursor: 'pointer',
                        background: isOverdue ? '#fef2f2' : 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-strong)')}
                      onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? '#fef2f2' : 'transparent')}
                    >
                      <td style={{ padding: '10px 6px', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ms.title}
                      </td>
                      <td style={{ padding: '10px 6px', color: 'var(--color-text-muted)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ms.task_title}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center', color: isOverdue ? '#dc2626' : 'var(--color-text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                        {ms.planned_date ? new Date(ms.planned_date).toLocaleDateString('pt-MZ', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                        {isOverdue && <span style={{ fontSize: 10, marginLeft: 4 }}>({ms.days_overdue}d)</span>}
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                          <div style={{ width: 50, height: 4, borderRadius: 2, background: 'var(--color-border)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, borderRadius: 2, background: pct >= 100 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626' }} />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                        <Badge
                          variant={ms.status === 'DONE' ? 'success' : ms.status === 'BLOCKED' ? 'danger' : isOverdue ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {ms.status === 'DONE' ? 'Concluído' : ms.status === 'BLOCKED' ? 'Bloqueado' : isOverdue ? 'Atrasado' : 'Pendente'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
