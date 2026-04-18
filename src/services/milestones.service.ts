import api from './api'
import type {
  Milestone,
  MilestoneProgressEvent,
  CreateMilestonePayload,
  UpdateMilestonePayload,
  PaginatedResponse,
  MilestoneMonthlyTarget,
  MonthlyChartRow,
} from '../types'

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

  updateProgress: (progressId: number, payload: { increment_value?: number; notes?: string }) =>
    api.put<{ progress: any; new_achieved: number }>(`/private/milestones/progress/${progressId}`, payload).then(r => r.data),

  // ── Metas mensais (monthly targets) ────────────────────────────────────────
  listMonthlyTargets: (milestoneId: number) =>
    api.get<{ rows: MilestoneMonthlyTarget[]; total: number }>(
      `/private/milestones/${milestoneId}/monthly-targets`
    ).then(r => r.data),

  upsertMonthlyTarget: (
    milestoneId: number,
    payload: { period: string; planned_value?: number; achieved_value?: number; notes?: string }
  ) =>
    api.put<MilestoneMonthlyTarget>(
      `/private/milestones/${milestoneId}/monthly-targets`, payload
    ).then(r => r.data),

  bulkUpsertMonthlyTargets: (
    milestoneId: number,
    rows: { period: string; planned_value?: number; achieved_value?: number; notes?: string }[]
  ) =>
    api.put<{ rows: MilestoneMonthlyTarget[]; total: number }>(
      `/private/milestones/${milestoneId}/monthly-targets/bulk`, { rows }
    ).then(r => r.data),

  taskMonthlyChart: (taskId: number) =>
    api.get<{ rows: MonthlyChartRow[] }>(`/private/tasks/${taskId}/monthly-chart`).then(r => r.data),

  projectMonthlyChart: (projectId: number) =>
    api.get<{ rows: MonthlyChartRow[] }>(`/private/projects/${projectId}/monthly-chart`).then(r => r.data),
}
