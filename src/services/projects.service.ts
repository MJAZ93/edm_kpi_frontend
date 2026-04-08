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

  updateProgress: (id: number, currentValue: number) =>
    api.patch<Project>(`/private/projects/${id}/progress`, { current_value: currentValue }).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/private/projects/${id}`).then(r => r.data),
}
