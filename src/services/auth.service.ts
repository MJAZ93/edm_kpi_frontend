import api from './api'
import type { AuthResponse } from '../types'

export const authService = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/public/auth/login', { email, password }).then(r => r.data),

  forgotPassword: (email: string) =>
    api.post('/public/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, password: string) =>
    api.post('/public/auth/reset-password', { token, password }).then(r => r.data),

  changePassword: (current_password: string, new_password: string) =>
    api.put('/private/auth/change-password', { current_password, new_password }).then(r => r.data),

  me: () =>
    api.get('/private/users/me').then(r => r.data),
}
