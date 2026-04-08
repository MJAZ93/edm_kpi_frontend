import React, { useState } from 'react'
import Sidebar from '../../components/layout/Sidebar'
import Topbar from '../../components/layout/Topbar'
import PageHeader from '../../components/layout/PageHeader'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Textarea from '../../components/ui/Textarea'
import Checkbox from '../../components/ui/Checkbox'
import Switch from '../../components/ui/Switch'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import ProgressBar from '../../components/ui/ProgressBar'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'
import Tabs from '../../components/ui/Tabs'
import Tooltip from '../../components/ui/Tooltip'
import TrafficLight from '../../components/domain/TrafficLight'
import StatCard from '../../components/domain/StatCard'
import PerformanceScore from '../../components/domain/PerformanceScore'
import ForecastAlert from '../../components/domain/ForecastAlert'
import ProjectCard from '../../components/domain/ProjectCard'
import TaskCard from '../../components/domain/TaskCard'
import MilestoneCard from '../../components/domain/MilestoneCard'
import BlockerCard from '../../components/domain/BlockerCard'
import Leaderboard from '../../components/domain/Leaderboard'
import PerformanceLineChart from '../../components/charts/PerformanceLineChart'
import DonutChart from '../../components/charts/DonutChart'
import BarRankingChart from '../../components/charts/BarRankingChart'
import ForecastChart from '../../components/charts/ForecastChart'
import PerformanceMap from '../../components/map/PerformanceMap'
import {
  FolderKanban, BarChart3, ShieldAlert, Bell, Palette,
  Plus, Search, Trash2, Eye, CheckCircle2, Info,
} from 'lucide-react'

// ── Mock data ──────────────────────────────────────────────────────────────

const TIMELINE_DATA = [
  { period: 'Jan', execution_score: 42, goal_score: 38, total_score: 40.4 },
  { period: 'Fev', execution_score: 51, goal_score: 44, total_score: 48.2 },
  { period: 'Mar', execution_score: 58, goal_score: 55, total_score: 56.8 },
  { period: 'Abr', execution_score: 64, goal_score: 61, total_score: 62.8 },
  { period: 'Mai', execution_score: 70, goal_score: 65, total_score: 68 },
  { period: 'Jun', execution_score: 78, goal_score: 72, total_score: 75.6 },
  { period: 'Jul', execution_score: 82, goal_score: 76, total_score: 79.6 },
  { period: 'Ago', execution_score: 88, goal_score: 84, total_score: 86.4 },
]

const DONUT_DATA = [
  { label: 'GREEN',  count: 18, percentage: 37.5 },
  { label: 'YELLOW', count: 22, percentage: 45.8 },
  { label: 'RED',    count:  8, percentage: 16.7 },
]

const RANKING_DATA = [
  { name: 'ASC Nacala',   total_score: 94.2, traffic_light: 'GREEN'  as const },
  { name: 'ASC Pemba',    total_score: 88.7, traffic_light: 'GREEN'  as const },
  { name: 'ASC Maputo N', total_score: 76.4, traffic_light: 'YELLOW' as const },
  { name: 'ASC Beira',    total_score: 72.1, traffic_light: 'YELLOW' as const },
  { name: 'ASC Nampula',  total_score: 58.3, traffic_light: 'RED'    as const },
]

const FORECAST_DATA = [
  { period: 'Jan', actual: 0 },
  { period: 'Fev', actual: 3200 },
  { period: 'Mar', actual: 7800 },
  { period: 'Abr', actual: 12400 },
  { period: 'Mai', actual: 18000 },
  { period: 'Jun', projected: 18000 },
  { period: 'Jul', projected: 24000 },
  { period: 'Ago', projected: 30000 },
  { period: 'Set', projected: 36000 },
  { period: 'Out', projected: 42000 },
  { period: 'Nov', projected: 48000 },
  { period: 'Dez', projected: 54000 },
]

// Mozambique mock polygons
const MAP_FEATURES = [
  {
    geometry: { type: 'Polygon' as const, coordinates: [[[32.0, -10.5],[35.5,-10.5],[35.5,-14.5],[32.0,-14.5],[32.0,-10.5]]] },
    properties: { id: 1, name: 'Região Norte', total_score: 88.2, traffic_light: 'GREEN' as const },
  },
  {
    geometry: { type: 'Polygon' as const, coordinates: [[[33.0, -14.5],[37.0,-14.5],[37.0,-18.5],[33.0,-18.5],[33.0,-14.5]]] },
    properties: { id: 2, name: 'Região Centro', total_score: 71.5, traffic_light: 'YELLOW' as const },
  },
  {
    geometry: { type: 'Polygon' as const, coordinates: [[[32.5, -18.5],[36.0,-18.5],[36.0,-26.5],[32.5,-26.5],[32.5,-18.5]]] },
    properties: { id: 3, name: 'Região Sul', total_score: 54.8, traffic_light: 'RED' as const },
  },
  {
    geometry: { type: 'Polygon' as const, coordinates: [[[35.5, -10.5],[40.5,-10.5],[40.5,-15.5],[35.5,-15.5],[35.5,-10.5]]] },
    properties: { id: 4, name: 'ASC Pemba', total_score: 92.1, traffic_light: 'GREEN' as const },
  },
]

const LEADERBOARD_DATA = [
  { rank: 1, name: 'ASC Nacala',    total_score: 94.2, traffic_light: 'GREEN'  as const, trend: 4 },
  { rank: 2, name: 'ASC Pemba',     total_score: 88.7, traffic_light: 'GREEN'  as const, trend: 2 },
  { rank: 3, name: 'ASC Maputo N',  total_score: 76.4, traffic_light: 'YELLOW' as const, trend: -1 },
  { rank: 4, name: 'ASC Beira',     total_score: 72.1, traffic_light: 'YELLOW' as const, trend: 3 },
  { rank: 5, name: 'ASC Nampula',   total_score: 58.3, traffic_light: 'RED'    as const, trend: -5 },
]

// ── Section helpers ────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ marginBottom: 56 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, paddingBottom: 12, borderBottom: '2px solid var(--color-border)' }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Row({ children, gap = 16, wrap = true, style }: { children: React.ReactNode; gap?: number; wrap?: boolean; style?: React.CSSProperties }) {
  return <div style={{ display: 'flex', gap, flexWrap: wrap ? 'wrap' : 'nowrap', alignItems: 'flex-start', ...style }}>{children}</div>
}

function Grid({ children, cols = 2, gap = 20 }: { children: React.ReactNode; cols?: number; gap?: number }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}>{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{children}</p>
}

// ── Navigation ─────────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'colors',       label: 'Cores' },
  { id: 'typography',   label: 'Tipografia' },
  { id: 'buttons',      label: 'Botões' },
  { id: 'forms',        label: 'Formulários' },
  { id: 'badges',       label: 'Badges' },
  { id: 'cards',        label: 'Cards' },
  { id: 'feedback',     label: 'Feedback' },
  { id: 'stat-cards',   label: 'StatCards' },
  { id: 'traffic',      label: 'Semáforo' },
  { id: 'performance',  label: 'Performance' },
  { id: 'domain',       label: 'Domínio' },
  { id: 'charts',       label: 'Gráficos' },
  { id: 'map',          label: 'Mapa' },
  { id: 'modals',       label: 'Modais' },
  { id: 'tabs',         label: 'Tabs' },
  { id: 'sidebar',      label: 'Sidebar' },
]

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [checked1, setChecked1] = useState(true)
  const [checked2, setChecked2] = useState(false)
  const [switched, setSwitched] = useState(true)
  const [inputVal, setInputVal] = useState('')
  const [selectVal, setSelectVal] = useState('monthly')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Sidebar activeKey="design-system" />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar breadcrumb={['CommV', 'Design System']} />

        {/* Sticky nav */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)',
          padding: '10px 28px', overflowX: 'auto',
          display: 'flex', gap: 6, boxShadow: '0 2px 8px rgba(120,60,10,0.05)',
        }}>
          {SECTIONS.map(s => (
            <a key={s.id} href={`#${s.id}`} style={{
              padding: '5px 13px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              color: 'var(--color-text-soft)', background: 'none',
              border: '1px solid transparent', whiteSpace: 'nowrap',
              transition: 'all 150ms', textDecoration: 'none',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-soft)'; (e.currentTarget as HTMLElement).style.color = 'var(--color-primary)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(232,103,10,0.2)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--color-text-soft)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent' }}
            >
              {s.label}
            </a>
          ))}
        </div>

        <main style={{ flex: 1, padding: '32px 40px', maxWidth: 1200, width: '100%' }}>

          <PageHeader
            eyebrow="CommV Platform"
            title="Design System"
            subtitle="Tokens, componentes e padrões visuais do CommV."
            badges={<><Badge variant="orange">v1.0</Badge><Badge variant="success" dot>Activo</Badge></>}
            actions={<Button variant="primary" icon={<Palette size={15} />}>Exportar tokens</Button>}
          />

          {/* ── COLORS ─────────────────────────────────────── */}
          <Section id="colors" title="Cores & Tokens">
            <Grid cols={3} gap={16}>
              {[
                { name: 'Primary', value: '#e8670a', var: '--color-primary', label: 'Laranja primário' },
                { name: 'Primary Deep', value: '#b84f06', var: '--color-primary-deep', label: 'Laranja profundo' },
                { name: 'Primary Soft', value: 'rgba(232,103,10,0.10)', var: '--color-primary-soft', label: 'Laranja suave' },
                { name: 'Green', value: '#0f766e', var: '--color-green', label: 'Verde petróleo' },
                { name: 'Green Deep', value: '#0a524c', var: '--color-green-deep', label: 'Verde profundo' },
                { name: 'Sidebar BG', value: '#0d2420', var: '--sidebar-bg', label: 'Sidebar background' },
                { name: 'Surface', value: '#fffdf8', var: '--color-surface-strong', label: 'Superfície principal' },
                { name: 'BG', value: '#f2f0eb', var: '--color-bg', label: 'Background geral' },
                { name: 'Border', value: 'rgba(120,80,20,0.12)', var: '--color-border', label: 'Borda subtil' },
                { name: 'Traffic Green', value: '#16a34a', var: '--color-traffic-green', label: 'Score ≥ 90%' },
                { name: 'Traffic Yellow', value: '#ca8a04', var: '--color-traffic-yellow', label: 'Score 60–89%' },
                { name: 'Traffic Red', value: '#dc2626', var: '--color-traffic-red', label: 'Score < 60%' },
              ].map(c => (
                <div key={c.name} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
                  <div style={{ height: 60, background: c.value, borderBottom: '1px solid var(--color-border)' }} />
                  <div style={{ padding: '10px 12px' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 2 }}>{c.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 600 }}>{c.label}</p>
                    <p style={{ fontSize: 10, color: 'var(--color-text-muted)', fontFamily: 'monospace', marginTop: 4 }}>{c.var}</p>
                  </div>
                </div>
              ))}
            </Grid>
          </Section>

          {/* ── TYPOGRAPHY ─────────────────────────────────── */}
          <Section id="typography" title="Tipografia">
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {[
                  { label: 'Título de página', size: 28, weight: 800, sample: 'Redução de Perdas — 2026' },
                  { label: 'Título de card', size: 20, weight: 700, sample: 'Efectuar 50.000 Inspecções' },
                  { label: 'Subtítulo', size: 15, weight: 600, sample: 'Actualizado esta semana • Direcção Técnica' },
                  { label: 'Body', size: 14, weight: 500, sample: 'O desempenho da região norte melhorou 12% no último trimestre.' },
                  { label: 'Label / Eyebrow', size: 11, weight: 700, sample: 'DESEMPENHO TRIMESTRAL', letter: '0.08em', upper: true },
                  { label: 'Meta / Timestamp', size: 12, weight: 500, sample: 'Actualizado a 5 Abr 2026, 10:32', muted: true },
                ].map(t => (
                  <div key={t.label} style={{ display: 'flex', alignItems: 'baseline', gap: 24, paddingBottom: 16, borderBottom: '1px solid var(--color-border)' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', minWidth: 140, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t.label}</span>
                    <span style={{ fontSize: t.size, fontWeight: t.weight, letterSpacing: t.letter, textTransform: t.upper ? 'uppercase' : undefined, color: t.muted ? 'var(--color-text-muted)' : 'var(--color-text)' }}>
                      {t.sample}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </Section>

          {/* ── BUTTONS ────────────────────────────────────── */}
          <Section id="buttons" title="Botões">
            <Card style={{ marginBottom: 16 }}>
              <Label>Variantes</Label>
              <Row>
                <Button variant="primary">Primário</Button>
                <Button variant="secondary">Secundário</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Perigo</Button>
                <Button variant="primary" loading>A carregar…</Button>
                <Button variant="primary" disabled>Desactivado</Button>
              </Row>
            </Card>
            <Card style={{ marginBottom: 16 }}>
              <Label>Tamanhos</Label>
              <Row style={{ alignItems: 'center' }}>
                <Button size="sm" variant="primary">Pequeno</Button>
                <Button size="md" variant="primary">Médio</Button>
                <Button size="lg" variant="primary">Grande</Button>
              </Row>
            </Card>
            <Card>
              <Label>Com ícones</Label>
              <Row>
                <Button variant="primary" icon={<Plus size={15} />}>Novo Pilar Estratégico</Button>
                <Button variant="secondary" icon={<Search size={14} />}>Pesquisar</Button>
                <Button variant="danger" icon={<Trash2 size={14} />}>Eliminar</Button>
                <Button variant="ghost" icon={<Eye size={14} />}>Ver detalhes</Button>
              </Row>
            </Card>
          </Section>

          {/* ── FORMS ──────────────────────────────────────── */}
          <Section id="forms" title="Formulários">
            <Grid cols={2} gap={24}>
              <Card>
                <Label>Inputs</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Input label="Nome do Pilar Estratégico" placeholder="Ex: Redução de Perdas 2026" value={inputVal} onChange={e => setInputVal(e.target.value)} />
                  <Input label="Email" placeholder="utilizador@edm.co.mz" type="email" />
                  <Input label="Campo com erro" placeholder="Preencha este campo" error="Este campo é obrigatório" />
                  <Input label="Com hint" placeholder="Ex: 50000" hint="Número inteiro positivo" icon={<Search size={14} />} />
                </div>
              </Card>
              <Card>
                <Label>Outros controlos</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <Select label="Frequência" value={selectVal} onChange={e => setSelectVal(e.target.value)}
                    options={[
                      { value: 'daily', label: 'Diária' }, { value: 'weekly', label: 'Semanal' },
                      { value: 'monthly', label: 'Mensal' }, { value: 'quarterly', label: 'Trimestral' },
                      { value: 'annual', label: 'Anual' },
                    ]} />
                  <Textarea label="Notas" placeholder="Descreva o impedimento ou contexto…" rows={4} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Checkbox checked={checked1} onChange={setChecked1} label="Incluir indicadores bloqueados" />
                    <Checkbox checked={checked2} onChange={setChecked2} label="Notificar responsável acima" />
                    <Checkbox checked={false} onChange={() => {}} label="Opção desactivada" disabled />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <Switch checked={switched} onChange={setSwitched} label="Notificações por email" />
                    <Switch checked={false} onChange={() => {}} label="Modo silencioso" />
                  </div>
                </div>
              </Card>
            </Grid>
          </Section>

          {/* ── BADGES ─────────────────────────────────────── */}
          <Section id="badges" title="Badges & Chips">
            <Card>
              <Row>
                <Badge variant="orange" dot>Activo</Badge>
                <Badge variant="success" dot>Concluído</Badge>
                <Badge variant="warning" dot>Pendente</Badge>
                <Badge variant="danger" dot>Bloqueado</Badge>
                <Badge variant="info">Logístico</Badge>
                <Badge variant="muted">Cancelado</Badge>
                <Badge variant="default">Peso 30%</Badge>
                <Badge variant="orange">CA</Badge>
                <Badge variant="info">DIRECAO</Badge>
              </Row>
            </Card>
          </Section>

          {/* ── CARDS ──────────────────────────────────────── */}
          <Section id="cards" title="Cards">
            <Grid cols={3} gap={20}>
              <Card variant="default">
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Card Default</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>Superfície limpa com sombra suave e borda discreta.</p>
              </Card>
              <Card variant="elevated">
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Card Elevated</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>Sombra mais pronunciada para destaque.</p>
              </Card>
              <Card variant="bordered">
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Card Bordered</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>Sem sombra, borda forte. Útil para listas.</p>
              </Card>
              <Card variant="muted">
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Card Muted</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>Fundo muted, sem sombra. Para conteúdo secundário.</p>
              </Card>
              <Card variant="default" onClick={() => {}}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>Card Clicável</p>
                <p style={{ fontSize: 13, color: 'var(--color-text-soft)' }}>Hover com elevação subtil e cursor pointer.</p>
              </Card>
            </Grid>
          </Section>

          {/* ── FEEDBACK ───────────────────────────────────── */}
          <Section id="feedback" title="Feedback & Loading">
            <Grid cols={2} gap={20}>
              <Card>
                <Label>Spinners</Label>
                <Row style={{ alignItems: 'center' }}>
                  <Spinner size="sm" />
                  <Spinner size="md" />
                  <Spinner size="lg" />
                  <Spinner size="md" color="var(--color-green)" />
                  <Spinner size="md" color="var(--color-traffic-red)" />
                </Row>
              </Card>
              <Card>
                <Label>Avatares</Label>
                <Row style={{ alignItems: 'center' }}>
                  <Avatar name="Carlos Ferreira" size="sm" />
                  <Avatar name="Maria Silva" size="md" />
                  <Avatar name="João Paulo" size="lg" />
                  <Avatar name="Ana Costa" size="md" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0a524c 100%)' }} />
                </Row>
              </Card>
              <Card>
                <Label>Tooltips</Label>
                <Row>
                  <Tooltip content="Score calculado automaticamente">
                    <Button variant="secondary" icon={<Info size={14} />}>Hover aqui</Button>
                  </Tooltip>
                  <Tooltip content="Performance Score = (Exec × 0.6) + (Goal × 0.4)" placement="bottom">
                    <Button variant="ghost" icon={<Info size={14} />}>Fórmula (bottom)</Button>
                  </Tooltip>
                </Row>
              </Card>
              <Card>
                <Label>Progress Bars</Label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <ProgressBar value={85} showLabel label="Execução" variant="orange" height={8} />
                  <ProgressBar value={62} showLabel label="Objectivo" variant="green" height={8} />
                  <ProgressBar value={42} showLabel label="Score baixo" variant="red" height={8} />
                  <ProgressBar value={75} showLabel label="Auto (amarelo)" variant="auto" height={8} />
                  <ProgressBar value={91} showLabel label="Auto (verde)" variant="auto" height={8} />
                  <ProgressBar value={38} showLabel label="Auto (vermelho)" variant="auto" height={8} />
                </div>
              </Card>
            </Grid>
          </Section>

          {/* ── STAT CARDS ─────────────────────────────────── */}
          <Section id="stat-cards" title="StatCards">
            <Grid cols={4} gap={16}>
              <StatCard label="Total Pilares Estratégicos" value="12" delta={8} deltaLabel="vs mês anterior" icon={<FolderKanban size={18} />} />
              <StatCard label="Indicadores Feitos" value="120" delta={15} deltaLabel="vs mês anterior" icon={<CheckCircle2 size={18} />} color="var(--color-green-soft)" />
              <StatCard label="Score Empresa" value="70.7" delta={-3} deltaLabel="vs mês anterior" icon={<BarChart3 size={18} />} color="var(--color-traffic-yellow-bg)" />
              <StatCard label="Impedimentos" value="4" delta={-2} deltaLabel="resolvidos" icon={<ShieldAlert size={18} />} color="var(--color-traffic-red-bg)" />
            </Grid>
          </Section>

          {/* ── TRAFFIC LIGHT ──────────────────────────────── */}
          <Section id="traffic" title="Semáforo de Desempenho">
            <Card>
              <Grid cols={3} gap={20}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <TrafficLight status="GREEN" size="lg" style={{ marginBottom: 12, display: 'inline-flex' }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Score ≥ 90%</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Excelente desempenho</p>
                </div>
                <div style={{ textAlign: 'center', padding: '20px 0', borderInline: '1px solid var(--color-border)' }}>
                  <TrafficLight status="YELLOW" size="lg" style={{ marginBottom: 12, display: 'inline-flex' }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Score 60–89%</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Atenção necessária</p>
                </div>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <TrafficLight status="RED" size="lg" style={{ marginBottom: 12, display: 'inline-flex' }} />
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Score &lt; 60%</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Intervenção urgente</p>
                </div>
              </Grid>
              <div style={{ marginTop: 20, padding: '14px 18px', background: 'var(--color-surface-muted)', borderRadius: 10, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)' }}>Inline:</span>
                <TrafficLight status="GREEN" size="sm" />
                <TrafficLight status="YELLOW" size="sm" />
                <TrafficLight status="RED" size="sm" />
                <TrafficLight status="GREEN" showLabel={false} size="sm" />
                <TrafficLight status="YELLOW" showLabel={false} size="md" />
                <TrafficLight status="RED" showLabel={false} size="lg" />
              </div>
            </Card>
          </Section>

          {/* ── PERFORMANCE SCORE ──────────────────────────── */}
          <Section id="performance" title="Performance Score">
            <Grid cols={2} gap={20}>
              <Card variant="elevated">
                <Label>Score completo</Label>
                <PerformanceScore executionScore={78} goalScore={65} totalScore={72.8} trafficLight="YELLOW" />
              </Card>
              <Card variant="elevated">
                <Label>Score excelente</Label>
                <PerformanceScore executionScore={94} goalScore={91} totalScore={92.8} trafficLight="GREEN" />
              </Card>
              <Card>
                <Label>ForecastAlert — em risco</Label>
                <ForecastAlert willReachTarget={false} targetValue={50000} velocityPerDay={189} daysRemaining={245} projectedFinalValue={36000} />
              </Card>
              <Card>
                <Label>ForecastAlert — no ritmo</Label>
                <ForecastAlert willReachTarget={true} targetValue={50000} velocityPerDay={420} daysRemaining={245} projectedFinalValue={54000} />
              </Card>
            </Grid>
          </Section>

          {/* ── DOMAIN CARDS ───────────────────────────────── */}
          <Section id="domain" title="Componentes de Domínio">
            <Tabs tabs={[
              { key: 'projects', label: 'Pilares Estratégicos' },
              { key: 'tasks', label: 'Acções' },
              { key: 'indicadores', label: 'Indicadores' },
              { key: 'blockers', label: 'Impedimentos' },
              { key: 'leaderboard', label: 'Leaderboard' },
            ]}>
              {(active) => {
                if (active === 'projects') return (
                  <Grid cols={2} gap={20}>
                    <ProjectCard title="Redução de Perdas Técnicas" description="Reduzir perdas de energia em toda a rede nacional." ownerLabel="Pelouro Técnico" startDate="Jan 2026" endDate="Dez 2026" totalScore={72.8} executionScore={78} trafficLight="YELLOW" weight={100} status="ACTIVE" onClick={() => {}} />
                    <ProjectCard title="Modernização da Rede" description="Substituição de equipamentos obsoletos nas ASCs prioritárias." ownerLabel="Pelouro Infraestrutura" startDate="Mar 2026" endDate="Dez 2026" totalScore={92.1} executionScore={94} trafficLight="GREEN" weight={60} status="ACTIVE" onClick={() => {}} />
                    <ProjectCard title="Pilar Estratégico Piloto Sul" description="Teste de novos medidores na região sul." ownerLabel="Direcção Sul" startDate="Jan 2026" endDate="Jun 2026" totalScore={48.3} executionScore={42} trafficLight="RED" weight={30} status="ACTIVE" onClick={() => {}} />
                    <ProjectCard title="Formação de Técnicos" description="" ownerLabel="RH" startDate="Fev 2026" endDate="Abr 2026" totalScore={100} executionScore={100} trafficLight="GREEN" status="COMPLETED" onClick={() => {}} />
                  </Grid>
                )
                if (active === 'tasks') return (
                  <Grid cols={2} gap={20}>
                    <TaskCard title="Efectuar 50.000 inspecções" frequency="MONTHLY" goalLabel="Inspecções realizadas" startValue={0} currentValue={18000} targetValue={50000} indicadoresTotal={12} milesDone={7} trafficLight="YELLOW" ownerLabel="Direcção Técnica" onClick={() => {}} />
                    <TaskCard title="Efectuar 18.000 trocas de contadores" frequency="WEEKLY" goalLabel="Contadores trocados" startValue={0} currentValue={15800} targetValue={18000} indicadoresTotal={8} milesDone={8} trafficLight="GREEN" ownerLabel="Departamento Contadores" onClick={() => {}} />
                    <TaskCard title="Reduzir perdas técnicas em 5%" frequency="QUARTERLY" goalLabel="% perdas técnicas" startValue={78} currentValue={74} targetValue={73} indicadoresTotal={4} milesDone={1} trafficLight="RED" ownerLabel="Direcção Norte" onClick={() => {}} />
                  </Grid>
                )
                if (active === 'indicadores') return (
                  <Grid cols={2} gap={16}>
                    <MilestoneCard title="Semana 1 — Inspecções Pemba" scopeLabel="ASC Pemba" plannedValue={300} achievedValue={287} plannedDate="07 Jan" achievedDate="08 Jan" status="DONE" hasPhoto notes="Condições climatéricas adversas reduziram produção 4%." />
                    <MilestoneCard title="Semana 2 — Inspecções Nacala" scopeLabel="ASC Nacala" plannedValue={400} achievedValue={320} plannedDate="14 Jan" status="PENDING" onUpdate={() => {}} />
                    <MilestoneCard title="Semana 3 — Inspecções Beira" scopeLabel="ASC Beira" plannedValue={250} plannedDate="21 Jan" status="BLOCKED" hasBlocker onUpdate={() => {}} />
                  </Grid>
                )
                if (active === 'blockers') return (
                  <Grid cols={2} gap={16}>
                    <BlockerCard blockerType="LOGISTIC" description="Veículos de transporte indisponíveis por avaria mecânica há 3 dias." status="PENDING" slaDays={3} daysRemaining={1} onApprove={() => {}} onReject={() => {}} />
                    <BlockerCard blockerType="FINANCIAL" description="Verba de combustível esgotada para o mês de Janeiro." status="APPROVED" slaDays={5} />
                    <BlockerCard blockerType="TECHNICAL" description="Sistema de telemetria offline na ASC Nacala." status="REJECTED" slaDays={2} rejectionReason="Equipa técnica disponível no local — resolver internamente." />
                    <BlockerCard blockerType="LEGAL" description="Falta de autorização camarária para acesso a propriedade privada." status="AUTO_APPROVED" slaDays={7} />
                  </Grid>
                )
                if (active === 'leaderboard') return (
                  <Grid cols={2} gap={20}>
                    <Card>
                      <Leaderboard title="Top ASC — Abril 2026" items={LEADERBOARD_DATA} />
                    </Card>
                    <Card>
                      <Leaderboard title="Top Direcções — Abril 2026" items={[
                        { rank: 1, name: 'Dir. Técnica Norte', total_score: 91.3, traffic_light: 'GREEN', trend: 6 },
                        { rank: 2, name: 'Dir. Comercial',     total_score: 84.7, traffic_light: 'GREEN', trend: 1 },
                        { rank: 3, name: 'Dir. Operações',     total_score: 73.2, traffic_light: 'YELLOW', trend: -2 },
                        { rank: 4, name: 'Dir. Técnica Sul',   total_score: 61.8, traffic_light: 'YELLOW', trend: 4 },
                        { rank: 5, name: 'Dir. Administrativa',total_score: 49.1, traffic_light: 'RED', trend: -8 },
                      ]} />
                    </Card>
                  </Grid>
                )
                return null
              }}
            </Tabs>
          </Section>

          {/* ── CHARTS ─────────────────────────────────────── */}
          <Section id="charts" title="Gráficos">
            <Grid cols={1} gap={24}>
              <Card variant="elevated">
                <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--color-text)' }}>Tendência de Performance — 2026</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Evolução dos scores mensais (Execução, Objectivo, Total)</p>
                <PerformanceLineChart data={TIMELINE_DATA} height={300} />
              </Card>
              <Grid cols={2} gap={20}>
                <Card variant="elevated">
                  <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--color-text)' }}>Distribuição por Semáforo</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>48 acções activas</p>
                  <DonutChart data={DONUT_DATA} height={200} centerValue="48" centerLabel="Acções" />
                </Card>
                <Card variant="elevated">
                  <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--color-text)' }}>Ranking ASC</p>
                  <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>Score total por ASC</p>
                  <BarRankingChart data={RANKING_DATA} height={220} />
                </Card>
              </Grid>
              <Card variant="elevated">
                <p style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: 'var(--color-text)' }}>Previsão — Efectuar 50.000 Inspecções</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>Real vs projecção linear até Dez 2026</p>
                <ForecastAlert willReachTarget={false} targetValue={50000} velocityPerDay={189} daysRemaining={245} projectedFinalValue={36000} style={{ marginBottom: 16 }} />
                <ForecastChart data={FORECAST_DATA} target={50000} height={280} willReach={false} />
              </Card>
            </Grid>
          </Section>

          {/* ── MAP ────────────────────────────────────────── */}
          <Section id="map" title="Mapa de Desempenho">
            <Card variant="elevated" padding={0} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px 16px' }}>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text)', marginBottom: 4 }}>Mapa Coroplético — Moçambique</p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Desempenho por Região / ASC • Verde ≥ 90% • Amarelo 60–89% • Vermelho &lt; 60%</p>
              </div>
              <PerformanceMap features={MAP_FEATURES} height={480} onSelect={(p) => console.log('Selected:', p)} />
            </Card>
          </Section>

          {/* ── MODALS ─────────────────────────────────────── */}
          <Section id="modals" title="Modais & Popups">
            <Card>
              <Label>Demos</Label>
              <Row>
                <Button variant="primary" onClick={() => setModalOpen(true)}>Abrir Modal Simples</Button>
                <Button variant="secondary" onClick={() => setFormModalOpen(true)}>Modal com Formulário</Button>
              </Row>
            </Card>

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Confirmar acção" footer={
              <>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button variant="danger" onClick={() => setModalOpen(false)}>Eliminar</Button>
              </>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 14, color: 'var(--color-text)' }}>
                  Tem a certeza que pretende eliminar o pilar estratégico <b>Redução de Perdas 2026</b>?
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Esta acção não pode ser revertida. Todas as acções e indicadores associados serão arquivados.</p>
                <div style={{ padding: '12px 16px', background: 'var(--color-traffic-red-bg)', borderRadius: 10, border: '1px solid rgba(220,38,38,0.15)' }}>
                  <p style={{ fontSize: 13, color: 'var(--color-traffic-red)', fontWeight: 600 }}>12 acções e 48 indicadores serão afectados.</p>
                </div>
              </div>
            </Modal>

            <Modal open={formModalOpen} onClose={() => setFormModalOpen(false)} title="Novo Pilar Estratégico" width={560} footer={
              <>
                <Button variant="secondary" onClick={() => setFormModalOpen(false)}>Cancelar</Button>
                <Button variant="primary" icon={<Plus size={14} />} onClick={() => setFormModalOpen(false)}>Criar Pilar Estratégico</Button>
              </>
            }>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input label="Título do Pilar Estratégico" placeholder="Ex: Redução de Perdas 2026" />
                <Textarea label="Descrição" placeholder="Descreva o objectivo principal deste pilar estratégico…" rows={3} />
                <Grid cols={2} gap={12}>
                  <Select label="Nível" options={[{value:'CA',label:'CA'},{value:'PELOURO',label:'Pelouro'},{value:'DIRECAO',label:'Direcção'}]} />
                  <Input label="Peso (%)" type="number" placeholder="100" />
                </Grid>
                <Grid cols={2} gap={12}>
                  <Input label="Data Início" type="date" />
                  <Input label="Data Fim" type="date" />
                </Grid>
                <Checkbox checked={checked1} onChange={setChecked1} label="Notificar responsáveis ao criar" />
              </div>
            </Modal>
          </Section>

          {/* ── TABS ───────────────────────────────────────── */}
          <Section id="tabs" title="Tabs">
            <Card>
              <Tabs tabs={[
                { key: 'overview', label: 'Visão Geral', icon: <FolderKanban size={14} /> },
                { key: 'tasks', label: 'Acções', icon: <CheckCircle2 size={14} /> },
                { key: 'analytics', label: 'Analytics', icon: <BarChart3 size={14} /> },
                { key: 'notifications', label: 'Notificações', icon: <Bell size={14} /> },
              ]}>
                {(key) => (
                  <div style={{ padding: '4px 0' }}>
                    <p style={{ fontSize: 14, color: 'var(--color-text-soft)' }}>
                      Conteúdo do separador: <b style={{ color: 'var(--color-text)' }}>{key}</b>
                    </p>
                  </div>
                )}
              </Tabs>
            </Card>
          </Section>

          {/* ── SIDEBAR PREVIEW ────────────────────────────── */}
          <Section id="sidebar" title="Sidebar & Layout">
            <Card variant="muted" padding={0} style={{ overflow: 'hidden', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', height: 420 }}>
                <Sidebar activeKey="dashboard" />
                <div style={{ flex: 1, background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-soft)' }}>Área de conteúdo</p>
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>Sidebar com navigação activa no Dashboard</p>
                  </div>
                </div>
              </div>
            </Card>
          </Section>

        </main>
      </div>
    </div>
  )
}
