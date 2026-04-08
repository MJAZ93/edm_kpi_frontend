// ── Roles & Enums ────────────────────────────────────────────────────────────

export type Role = 'ADMIN' | 'CA' | 'PELOURO' | 'DIRECAO' | 'DEPARTAMENTO'
export type TrafficLight = 'GREEN' | 'YELLOW' | 'RED'
export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'BIANNUAL' | 'ANNUAL'
export type BlockerType = 'LOGISTIC' | 'FINANCIAL' | 'TECHNICAL' | 'LEGAL'
export type BlockerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED'
export type MilestoneStatus = 'PENDING' | 'DONE' | 'BLOCKED'
export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type ScopeType = 'ASC' | 'REGIAO' | 'NACIONAL'

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  name: string
  email: string
  role: Role
  active?: boolean
  /** Only set for DIRECAO role: "DIRECTION" = leads a Direcção, "REGION" = leads only a Região (read-only) */
  director_scope?: 'DIRECTION' | 'REGION'
}

export interface AuthResponse {
  token: string
  user: User
}

// ── Organisation ─────────────────────────────────────────────────────────────

export interface Pelouro {
  id: number
  name: string
  description?: string
  responsible_id: number
  responsible?: User
  created_at?: string
}

export interface Direcao {
  id: number
  name: string
  description?: string
  pelouro_id: number
  pelouro?: Pelouro
  responsible_id: number
  responsible?: User
  created_at?: string
}

export interface Departamento {
  id: number
  name: string
  description?: string
  direcao_id: number
  direcao?: Direcao
  responsible_id: number
  responsible?: User
  users?: User[]
  created_at?: string
}

export interface OrgTree {
  pelouros: Array<Pelouro & {
    direcoes: Array<Direcao & {
      departamentos: Array<Departamento & { users: User[] }>
    }>
  }>
}

// ── Geography ─────────────────────────────────────────────────────────────────

export interface GeoPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface Regiao {
  id: number
  name: string
  code: string
  responsible_id: number
  responsible?: User
  polygon?: GeoPolygon
  created_at?: string
}

export interface ASC {
  id: number
  name: string
  code: string
  regiao_id: number
  regiao?: Regiao
  responsible_id: number
  responsible?: User
  director_id?: number
  director?: User
  polygon?: GeoPolygon
  created_at?: string
}

// ── Performance ───────────────────────────────────────────────────────────────

export interface PerformanceData {
  execution_score: number
  goal_score: number
  total_score: number
  traffic_light: TrafficLight
}

// ── Projects ──────────────────────────────────────────────────────────────────

export interface Project {
  id: number
  title: string
  description?: string
  creator_type: Role
  creator_org_id?: number
  creator?: User
  parent_id?: number
  parent?: Project
  weight: number
  start_date: string
  end_date: string
  status: ProjectStatus
  performance?: PerformanceData
  direcoes?: Direcao[]
  created_at?: string
  updated_at?: string
  // KPI objective tracking
  goal_label?: string
  frequency?: string
  start_value?: number
  target_value?: number
  current_value?: number
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface TaskScope {
  scope_type: ScopeType
  scope_id: number
  scope_name?: string
}

export interface Task {
  id: number
  project_id: number
  title: string
  description?: string
  owner_type: Role
  owner_id: number
  owner_name?: string
  assigned_to?: number
  assignee?: User
  frequency: Frequency
  goal_label: string
  start_value: number
  current_value: number
  target_value: number
  weight: number
  start_date: string
  end_date: string
  parent_task_id?: number
  scopes: TaskScope[]
  performance?: PerformanceData
  created_at?: string
  updated_at?: string
}

// ── Milestones ────────────────────────────────────────────────────────────────

export interface Milestone {
  id: number
  task_id: number
  title: string
  description?: string
  scope_type?: ScopeType
  scope_id?: number
  scope_name?: string
  planned_value: number
  achieved_value?: number
  planned_date: string
  achieved_date?: string
  status: MilestoneStatus
  notes?: string
  photo_url?: string
  assigned_to?: number
  assignee?: User
  created_at?: string
  updated_at?: string
}

// ── Blockers ──────────────────────────────────────────────────────────────────

export interface Blocker {
  id: number
  entity_type: 'MILESTONE' | 'TASK'
  entity_id: number
  entity_title?: string
  blocker_type: BlockerType
  description: string
  status: BlockerStatus
  sla_days: number
  auto_approve_at?: string
  rejection_reason?: string
  created_by?: User
  created_at?: string
  updated_at?: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  total_projects: number
  total_tasks: number
  milestones_done: number
  milestones_pending: number
  milestones_blocked: number
  performance: PerformanceData
  top_performers: TopPerformerItem[]
  alerts: Alert[]
}

export interface Alert {
  id: number
  type: 'DELAY' | 'MILESTONE_OVERDUE' | 'BLOCKER_CREATED' | 'GOAL_AT_RISK'
  message: string
  entity_type?: string
  entity_id?: number
  created_at?: string
}

export interface PerformanceEntity {
  entity_type: string
  entity_id?: number
  entity_name: string
  period: string
  execution_score: number
  goal_score: number
  total_score: number
  traffic_light: TrafficLight
  tasks_total: number
  tasks_completed: number
  milestones_total: number
  milestones_done: number
}

export interface DrillDownItem {
  id: number
  name: string
  type: string
  execution_score: number
  goal_score: number
  total_score: number
  traffic_light: TrafficLight
  children_count: number
}

export interface DrillDownResponse {
  level: string
  items: DrillDownItem[]
}

export interface TopPerformerItem {
  rank: number
  id: number
  name: string
  total_score: number
  traffic_light: TrafficLight
}

export interface TopPerformersResponse {
  period: string
  entity_type: string
  ranking: TopPerformerItem[]
}

export interface TimelinePeriod {
  period: string
  total_score: number
  execution_score?: number
  goal_score?: number
  traffic_light: TrafficLight
}

export interface TimelineResponse {
  entity_type: string
  entity_id?: number
  periods: TimelinePeriod[]
}

export interface DistributionItem {
  label: string
  count: number
  percentage: number
}

export interface DistributionResponse {
  dimension: string
  data: DistributionItem[]
}

export interface ForecastResponse {
  task_id: number
  title: string
  start_value: number
  target_value: number
  current_value: number
  start_date: string
  end_date: string
  days_elapsed: number
  days_remaining: number
  velocity_per_day: number
  projected_final_value: number
  will_reach_target: boolean
  alert?: string | null
  alert_message?: string | null
}

export interface BenchmarkResponse {
  a: { id: number; name: string; total_score: number }
  b: { id: number; name: string; total_score: number }
  ratio: number
  message: string
}

export interface MapFeature {
  type: 'Feature'
  geometry: GeoPolygon
  properties: {
    id: number
    name: string
    total_score: number
    traffic_light: TrafficLight
  }
}

export interface MapResponse {
  type: 'FeatureCollection'
  features: MapFeature[]
}

// ── Employee Ranking ─────────────────────────────────────────────────────────

export interface EmployeeRankItem {
  rank: number
  id: number
  name: string
  role: string
  category: 'DIR_DIRECAO' | 'CHEFE_DEPT' | 'DIR_ASC' | 'DIR_REGIONAL' | 'COLABORADOR'
  dept_name: string
  execution_score: number
  goal_score: number
  total_score: number
  traffic_light: string
  ms_total: number
  ms_done: number
}

// ── Scope Stats ───────────────────────────────────────────────────────────────

export interface ScopeTaskSummary {
  id: number
  title: string
  owner_type: string
  owner_id: number
  project_id: number
  project_title: string
  current_value: number
  target_value: number
  status: string
}

export interface ScopeProjectInfo {
  id: number
  title: string
}

export interface ScopeDirInfo {
  id: number
  name: string
}

export interface ScopeStatsResponse {
  id: number
  name: string
  type: 'ASC' | 'REGIAO'
  execution_score: number
  goal_score: number
  total_score: number
  traffic_light: string
  task_count: number
  tasks: ScopeTaskSummary[]
  project_count: number
  projects: ScopeProjectInfo[]
  direction_count: number
  directions: ScopeDirInfo[]
}

// ── Notifications ─────────────────────────────────────────────────────────────

export interface Notification {
  id: number
  type: 'DELAY' | 'MILESTONE_OVERDUE' | 'BLOCKER_CREATED' | 'GOAL_AT_RISK' | 'UPDATE'
  message: string
  is_read: boolean
  entity_type?: string
  entity_id?: number
  created_at: string
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: number
  entity_type: string
  entity_id: number
  action: 'CREATE' | 'UPDATE' | 'DELETE'
  changed_by: number
  changer?: User
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  created_at: string
}

// ── API Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export interface PaginationParams {
  page?: number
  limit?: number
}

// ── Form payloads ─────────────────────────────────────────────────────────────

export interface CreateProjectPayload {
  title: string
  description?: string
  creator_type: Role
  creator_org_id?: number
  parent_id?: number
  weight: number
  start_date: string
  end_date: string
  direcao_ids?: number[]
  status?: string
  goal_label?: string
  frequency?: string
  start_value?: number
  target_value?: number
  current_value?: number
}

export interface CreateTaskPayload {
  title: string
  description?: string
  owner_type: Role
  owner_id: number
  assigned_to?: number
  frequency: Frequency
  goal_label: string
  start_value: number
  target_value: number
  weight: number
  start_date: string
  end_date: string
  parent_task_id?: number
  scopes: { scope_type: ScopeType; scope_id: number }[]
}

export interface CreateMilestonePayload {
  title: string
  description?: string
  scope_type?: ScopeType
  scope_id?: number
  planned_value: number
  planned_date: string
  notes?: string
  assigned_to?: number
}

export interface UpdateMilestonePayload {
  achieved_value?: number
  achieved_date?: string
  status?: MilestoneStatus
  notes?: string
  title?: string
  description?: string
  scope_type?: ScopeType
  scope_id?: number
  planned_value?: number
  planned_date?: string
  assigned_to?: number
}

export interface CreateBlockerPayload {
  entity_type: 'MILESTONE' | 'TASK'
  entity_id: number
  blocker_type: BlockerType
  description: string
  sla_days: number
}
