import api from './api'
import type { Pelouro, Direcao, Departamento, OrgTree, User, PaginatedResponse } from '../types'

export const orgService = {
  // Pelouros
  listPelouros: () =>
    api.get<PaginatedResponse<Pelouro>>('/private/pelouros').then(r => r.data),
  getPelouro: (id: number) =>
    api.get<Pelouro>(`/private/pelouros/${id}`).then(r => r.data),
  createPelouro: (payload: { name: string; description?: string; responsible_id: number }) =>
    api.post<Pelouro>('/private/pelouros', payload).then(r => r.data),
  updatePelouro: (id: number, payload: { name?: string; description?: string; responsible_id?: number }) =>
    api.put<Pelouro>(`/private/pelouros/${id}`, payload).then(r => r.data),
  deletePelouro: (id: number) =>
    api.delete(`/private/pelouros/${id}`).then(r => r.data),

  // Direções
  listDirecoes: () =>
    api.get<PaginatedResponse<Direcao>>('/private/direcoes').then(r => r.data),
  getDirecao: (id: number) =>
    api.get<Direcao>(`/private/direcoes/${id}`).then(r => r.data),
  createDirecao: (payload: { name: string; pelouro_id: number; responsible_id: number; description?: string }) =>
    api.post<Direcao>('/private/direcoes', payload).then(r => r.data),
  updateDirecao: (id: number, payload: Partial<{ name: string; pelouro_id: number; responsible_id: number; description: string }>) =>
    api.put<Direcao>(`/private/direcoes/${id}`, payload).then(r => r.data),
  deleteDirecao: (id: number) =>
    api.delete(`/private/direcoes/${id}`).then(r => r.data),

  // Departamentos
  listDepartamentos: () =>
    api.get<PaginatedResponse<Departamento>>('/private/departamentos').then(r => r.data),
  getDepartamento: (id: number) =>
    api.get<Departamento>(`/private/departamentos/${id}`).then(r => r.data),
  createDepartamento: (payload: { name: string; direcao_id: number; responsible_id: number; description?: string }) =>
    api.post<Departamento>('/private/departamentos', payload).then(r => r.data),
  updateDepartamento: (id: number, payload: Partial<{ name: string; direcao_id: number; responsible_id: number; description: string }>) =>
    api.put<Departamento>(`/private/departamentos/${id}`, payload).then(r => r.data),
  deleteDepartamento: (id: number) =>
    api.delete(`/private/departamentos/${id}`).then(r => r.data),
  addUser: (deptId: number, user_id: number) =>
    api.post(`/private/departamentos/${deptId}/users`, { user_id }).then(r => r.data),
  removeUser: (deptId: number, user_id: number) =>
    api.delete(`/private/departamentos/${deptId}/users/${user_id}`).then(r => r.data),

  // Tree
  getTree: () =>
    api.get<OrgTree>('/private/org/tree').then(r => r.data),
}

export const usersService = {
  list: (params?: { role?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<User>>('/private/users', { params }).then(r => r.data),
  get: (id: number) =>
    api.get<User>(`/private/users/${id}`).then(r => r.data),
  me: () =>
    api.get<User>('/private/users/me').then(r => r.data),
  create: (payload: { name: string; email: string; password: string; role: string }) =>
    api.post<User>('/private/users', payload).then(r => r.data),
  update: (id: number, payload: Partial<{ name: string; email: string; role: string }>) =>
    api.put<User>(`/private/users/${id}`, payload).then(r => r.data),
  remove: (id: number) =>
    api.delete(`/private/users/${id}`).then(r => r.data),
}
