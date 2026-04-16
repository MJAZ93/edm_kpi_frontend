import api from './api'
import type {
  DashboardSummary, PerformanceEntity, DrillDownResponse,
  MapResponse, ForecastResponse, TopPerformersResponse,
  TimelineResponse, DistributionResponse, BenchmarkResponse,
  ScopeStatsResponse, EmployeeRankItem,
} from '../types'

export const dashboardService = {
  getSummary: () =>
    api.get<any>('/private/dashboard/summary').then(r => {
      const d = r.data
      // Backend returns flat performance fields; wrap them into performance object
      const summary: DashboardSummary = {
        total_projects:    d.total_projects ?? 0,
        total_tasks:       d.total_tasks ?? 0,
        milestones_done:   d.milestones_done ?? 0,
        milestones_pending: d.milestones_pending ?? 0,
        milestones_blocked: d.milestones_blocked ?? 0,
        performance: {
          execution_score: d.execution_score ?? d.performance?.execution_score ?? 0,
          goal_score:      d.goal_score ?? d.performance?.goal_score ?? 0,
          total_score:     d.total_score ?? d.performance?.total_score ?? 0,
          traffic_light:   d.traffic_light ?? d.performance?.traffic_light ?? 'RED',
        },
        top_performers: d.top_performers ?? [],
        alerts:         d.alerts ?? [],
      }
      return summary
    }),

  getPerformance: (params: { entity_type: string; entity_id?: number; period?: string }) =>
    api.get<PerformanceEntity>('/private/dashboard/performance', { params }).then(r => r.data),

  getDrillDown: (params: { level: string; id?: number; period?: string }) =>
    api.get<DrillDownResponse>('/private/dashboard/drill-down', { params }).then(r => r.data),

  getMap: (params: { level: 'REGIONAL' | 'ASC'; period?: string; direcao_id?: number; regiao_id?: number; asc_ids?: string }) =>
    api.get<MapResponse>('/private/dashboard/map', { params }).then(r => r.data),

  getForecast: (task_id: number) =>
    api.get<ForecastResponse>('/private/dashboard/forecast', { params: { task_id } }).then(r => r.data),

  getTopPerformers: (params: { entity_type: string; period?: string; limit?: number }) =>
    api.get<TopPerformersResponse>('/private/dashboard/top-performers', { params }).then(r => r.data),

  getTimeline: (params: { entity_type: string; entity_id?: number; from?: string; to?: string }) =>
    api.get<TimelineResponse>('/private/dashboard/timeline', { params }).then(r => r.data),

  getDistribution: (params: { entity_type?: string; entity_id?: number; dimension: string }) =>
    api.get<DistributionResponse>('/private/dashboard/distribution', { params }).then(r => r.data),

  getBenchmark: (params: { entity_type: string; id_a: number; id_b: number; period?: string }) =>
    api.get<BenchmarkResponse>('/private/dashboard/benchmark', { params }).then(r => r.data),

  getScopeStats: (params: { type: 'ASC' | 'REGIAO'; id: number }) =>
    api.get<ScopeStatsResponse>('/private/dashboard/scope-stats', { params }).then(r => r.data),

  getEmployeeRanking: () =>
    api.get<{ role: string; org_id: number; ranking: EmployeeRankItem[] }>('/private/dashboard/employee-ranking').then(r => r.data),

  getDirecaoOverview: () =>
    api.get<any>('/private/dashboard/direcao-overview').then(r => r.data),

  getDepartamentoOverview: () =>
    api.get<any>('/private/dashboard/departamento-overview').then(r => r.data),

  getMemberOverview: () =>
    api.get<any>('/private/dashboard/member-overview').then(r => r.data),

  getRegionalOverview: () =>
    api.get<any>('/private/dashboard/regional-overview').then(r => r.data),

  getDirecaoMilestones: (direcaoId: number) =>
    api.get<any>('/private/dashboard/direcao-milestones', { params: { direcao_id: direcaoId } }).then(r => r.data),

  getDepartamentoDetail: (id: number) =>
    api.get<any>(`/private/dashboard/departamento-detail/${id}`).then(r => r.data),

  getUserDetail: (id: number) =>
    api.get<any>(`/private/dashboard/user-detail/${id}`).then(r => r.data),
}
