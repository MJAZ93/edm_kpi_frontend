import api from './api'
import type { Regiao, ASC, PaginatedResponse, GeoPolygon } from '../types'

export const geoService = {
  // Regiões
  listRegioes: (opts?: { includePolygon?: boolean }) =>
    api.get<PaginatedResponse<Regiao>>('/private/geo/regioes', {
      params: opts?.includePolygon ? { include_polygon: 'true' } : undefined,
    }).then(r => r.data),
  getRegiao: (id: number) =>
    api.get<Regiao>(`/private/geo/regioes/${id}`).then(r => r.data),
  createRegiao: (payload: { name: string; code: string; responsible_id: number; polygon?: GeoPolygon }) =>
    api.post<Regiao>('/private/geo/regioes', payload).then(r => r.data),
  updateRegiao: (id: number, payload: Partial<{ name: string; code: string; responsible_id: number; polygon: GeoPolygon }>) =>
    api.put<Regiao>(`/private/geo/regioes/${id}`, payload).then(r => r.data),
  deleteRegiao: (id: number) =>
    api.delete(`/private/geo/regioes/${id}`).then(r => r.data),

  // ASCs
  listAscs: (opts?: { includePolygon?: boolean }) =>
    api.get<PaginatedResponse<ASC>>('/private/geo/ascs', {
      params: opts?.includePolygon ? { include_polygon: 'true' } : undefined,
    }).then(r => r.data),
  getAsc: (id: number) =>
    api.get<ASC>(`/private/geo/ascs/${id}`).then(r => r.data),
  createAsc: (payload: { name: string; code: string; regiao_id: number; responsible_id: number; director_id?: number; polygon?: GeoPolygon }) =>
    api.post<ASC>('/private/geo/ascs', payload).then(r => r.data),
  updateAsc: (id: number, payload: Partial<{ name: string; code: string; regiao_id: number; responsible_id: number; director_id: number; polygon: GeoPolygon }>) =>
    api.put<ASC>(`/private/geo/ascs/${id}`, payload).then(r => r.data),
  deleteAsc: (id: number) =>
    api.delete(`/private/geo/ascs/${id}`).then(r => r.data),
}
