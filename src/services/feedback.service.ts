import api from './api'
import type { Feedback, PaginatedResponse } from '../types'

export const feedbackService = {
  listReceived: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Feedback>>('/private/feedback/received', { params }).then(r => r.data),

  listSent: (params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Feedback>>('/private/feedback/sent', { params }).then(r => r.data),

  create: (payload: { receiver_id: number; message: string; category: string; target_type?: string; target_id?: number }) =>
    api.post<Feedback>('/private/feedback', payload).then(r => r.data),

  reply: (id: number, payload: { message: string }) =>
    api.post<Feedback>(`/private/feedback/${id}/reply`, payload).then(r => r.data),

  listByTarget: (targetType: string, targetId: number, params?: { page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Feedback>>('/private/feedback/by-target', { params: { target_type: targetType, target_id: targetId, ...params } }).then(r => r.data),

  markRead: (id: number) =>
    api.put(`/private/feedback/${id}/read`).then(r => r.data),

  remove: (id: number) =>
    api.delete(`/private/feedback/${id}`).then(r => r.data),

  unreadCount: () =>
    api.get<{ count: number }>('/private/feedback/unread-count').then(r => r.data),
}
