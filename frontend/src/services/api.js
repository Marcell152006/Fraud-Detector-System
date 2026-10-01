import axios from 'axios'

/**
 * Pre-configured Axios instance.
 * All API calls use /api/* which Vite proxies to http://localhost:8000.
 */
const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// ── Prediction ────────────────────────────────────────────────────────────────
export const predictSingle = (data) =>
  api.post('/predict', data).then((r) => r.data)

// ── Batch Upload ──────────────────────────────────────────────────────────────
export const uploadCSV = (file) => {
  const form = new FormData()
  form.append('file', file)
  return api
    .post('/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data)
}

export const downloadBatchCSV = (batchId) =>
  api
    .get(`/upload/download/${batchId}`, { responseType: 'blob' })
    .then((r) => r.data)

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard = () =>
  api.get('/dashboard').then((r) => r.data)

// ── History ───────────────────────────────────────────────────────────────────
export const getHistory = (params) =>
  api.get('/history', { params }).then((r) => r.data)

export const deleteRecord = (id) =>
  api.delete(`/history/${id}`)

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getAnalytics = () =>
  api.get('/analytics').then((r) => r.data)

export default api
