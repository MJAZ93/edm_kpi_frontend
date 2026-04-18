import api from './api'
import type { Task, CreateTaskPayload, PaginatedResponse, PaginationParams } from '../types'

export const tasksService = {
  list: (project_id: number, params?: PaginationParams) =>
    api.get<PaginatedResponse<Task>>('/private/tasks', { params: { project_id, ...params } }).then(r => r.data),

  get: (id: number) =>
    api.get<Task>(`/private/tasks/${id}`).then(r => r.data),

  create: (project_id: number, payload: CreateTaskPayload) =>
    api.post<Task>('/private/tasks', payload, { params: { project_id } }).then(r => r.data),

  update: (id: number, payload: Partial<CreateTaskPayload>) =>
    api.put<Task>(`/private/tasks/${id}`, payload).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/private/tasks/${id}`).then(r => r.data),

  listProgress: (id: number) =>
    api.get<{ entries: Array<{ period: string; value: number; id: number }> }>(`/private/tasks/${id}/progress`).then(r => r.data),

  updateProgress: (id: number, currentValue: number, period: string) =>
    api.patch(`/private/tasks/${id}/progress`, { current_value: currentValue, period }).then(r => r.data),
}
