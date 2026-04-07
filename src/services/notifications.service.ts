import api from './api'
import type { Notification, PaginatedResponse } from '../types'

export const notificationsService = {
  list: (params?: { is_read?: boolean; type?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<Notification>>('/private/notifications', { params }).then(r => r.data),
  markRead: (id: number) =>
    api.put(`/private/notifications/${id}/read`).then(r => r.data),
  markAllRead: () =>
    api.put('/private/notifications/read-all').then(r => r.data),
}
