import api from './api'
import type { Project, CreateProjectPayload, PaginatedResponse, PaginationParams, ProjectStatus, Role } from '../types'

interface ListProjectsParams extends PaginationParams {
  creator_type?: Role
  parent_id?: number
  status?: ProjectStatus
  direcao_id?: number
}

export const projectsService = {
  list: (params?: ListProjectsParams) =>
    api.get<PaginatedResponse<Project>>('/private/projects', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<Project>(`/private/projects/${id}`).then(r => r.data),

  getTree: (id: number) =>
    api.get(`/private/projects/${id}/tree`).then(r => r.data),

  create: (payload: CreateProjectPayload) =>
    api.post<Project>('/private/projects', payload).then(r => r.data),

  update: (id: number, payload: Partial<CreateProjectPayload>) =>
    api.put<Project>(`/private/projects/${id}`, payload).then(r => r.data),

  updateProgress: (id: number, currentValue: number, periodReference?: string) =>
    api.patch<Project>(`/private/projects/${id}/progress`, { current_value: currentValue, period_reference: periodReference }).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/private/projects/${id}`).then(r => r.data),

  // ── Project History ──────────────────────────────────────────────────────
  listHistory: (projectId: number) =>
    api.get<{ entries: ProjectHistoryEntry[] }>(`/private/projects/${projectId}/history`).then(r => r.data),

  createHistory: (projectId: number, payload: { value: number; period_reference: string; notes?: string }) =>
    api.post<ProjectHistoryEntry>(`/private/projects/${projectId}/history`, payload).then(r => r.data),

  updateHistory: (entryId: number, payload: { value?: number; notes?: string }) =>
    api.put<ProjectHistoryEntry>(`/private/projects/history/${entryId}`, payload).then(r => r.data),

  deleteHistory: (entryId: number) =>
    api.delete(`/private/projects/history/${entryId}`).then(r => r.data),

  listExecutionHistory: (projectId: number) =>
    api.get<ExecutionHistoryResponse>(`/private/projects/${projectId}/execution-history`).then(r => r.data),
}

export interface ExecutionPeriod {
  period: string
  planned: number
  achieved: number
  exec_pct: number
  cum_planned: number
  cum_achieved: number
  cum_exec_pct: number
  ms_count: number
  ms_done: number
}

export interface ExecutionHistoryResponse {
  periods: ExecutionPeriod[]
  start_date?: string
  end_date?: string
}

export interface ProjectHistoryEntry {
  id: number
  project_id: number
  value: number
  period_reference: string
  notes?: string
  created_by: number
  creator?: { name: string }
  created_at: string
  updated_at: string
}
