import api from './api'
import type { Milestone, MilestoneProgressEvent, CreateMilestonePayload, UpdateMilestonePayload, PaginatedResponse } from '../types'

export const milestonesService = {
  list: (task_id: number) =>
    api.get<PaginatedResponse<Milestone>>('/private/milestones', { params: { task_id, limit: 500 } }).then(r => r.data),

  get: (id: number) =>
    api.get<Milestone>(`/private/milestones/${id}`).then(r => r.data),

  create: (task_id: number, payload: CreateMilestonePayload) =>
    api.post<Milestone>('/private/milestones', payload, { params: { task_id } }).then(r => r.data),

  update: (id: number, payload: Partial<UpdateMilestonePayload>) =>
    api.put<Milestone>(`/private/milestones/${id}`, payload).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/private/milestones/${id}`).then(r => r.data),

  uploadPhoto: (id: number, file: File) => {
    const form = new FormData()
    form.append('photo', file)
    return api.post<{ photo_url: string }>(`/private/milestones/${id}/photo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },

  addProgress: (id: number, payload: { increment_value: number; period_reference?: string; notes?: string; status?: string }) =>
    api.post<{ milestone: Milestone; progress_event: any; new_total: number }>(
      `/private/milestones/${id}/progress`, payload
    ).then(r => r.data),

  listProgress: (id: number) =>
    api.get<{ events: MilestoneProgressEvent[]; total: number }>(`/private/milestones/${id}/progress`).then(r => r.data),
}
