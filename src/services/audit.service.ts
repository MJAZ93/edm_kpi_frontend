import api from './api'
import type { AuditEntry, PaginatedResponse } from '../types'

export const auditService = {
  list: (params?: { entity_type?: string; entity_id?: number; from_date?: string; to_date?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<AuditEntry>>('/private/audit', { params }).then(r => r.data),
}
