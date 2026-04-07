import api from './api'
import type { Blocker, CreateBlockerPayload, PaginatedResponse, PaginationParams, BlockerStatus } from '../types'

interface ListBlockersParams extends PaginationParams {
  entity_type?: string
  entity_id?: number
  status?: BlockerStatus
}

export const blockersService = {
  list: (params?: ListBlockersParams) =>
    api.get<PaginatedResponse<Blocker>>('/private/blockers', { params }).then(r => r.data),

  get: (id: number) =>
    api.get<Blocker>(`/private/blockers/${id}`).then(r => r.data),

  create: (payload: CreateBlockerPayload) =>
    api.post<Blocker>('/private/blockers', payload).then(r => r.data),

  approve: (id: number) =>
    api.put(`/private/blockers/${id}/approve`).then(r => r.data),

  reject: (id: number, rejection_reason: string) =>
    api.put(`/private/blockers/${id}/reject`, { rejection_reason }).then(r => r.data),
}
