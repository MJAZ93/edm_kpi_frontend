import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ── GORM key normalizer ──────────────────────────────────────────────────────
// The backend uses GORM which serializes the base model as:
//   ID, CreatedAt, UpdatedAt, DeletedAt  (PascalCase)
// We normalize these to snake_case so the rest of the frontend can use .id etc.
function normalizeKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(normalizeKeys)
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      const k =
        key === 'ID'         ? 'id'         :
        key === 'CreatedAt'  ? 'created_at' :
        key === 'UpdatedAt'  ? 'updated_at' :
        key === 'DeletedAt'  ? 'deleted_at' :
        key
      // Parse polygon JSON strings
      if (k === 'polygon' && typeof val === 'string' && val.startsWith('{')) {
        try { result[k] = JSON.parse(val); continue } catch { /* keep as-is */ }
      }
      result[k] = normalizeKeys(val)
    }
    return result
  }
  return obj
}

// Inject token on every request
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem('commv_auth')
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      const token = parsed?.state?.token ?? parsed?.token
      if (token) config.headers.Authorization = `Bearer ${token}`
    } catch { /* ignore */ }
  }
  return config
})

// Normalize response data + redirect to login on 401
api.interceptors.response.use(
  (res) => {
    res.data = normalizeKeys(res.data)
    return res
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('commv_auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
