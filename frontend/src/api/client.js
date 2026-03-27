import axios from 'axios'

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  timeout: 120_000,
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.error ||
      err.message ||
      'Bilinmeyen bir hata oluştu.'
    return Promise.reject(new Error(msg))
  }
)

export const uploadFile = (file, onProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post('/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
}

export const getGroupAnalysis   = () => api.get('/analysis/group')
export const getUserAnalysis    = () => api.get('/analysis/users')
export const getTopicAnalysis   = () => api.get('/analysis/topics')
export const getUserProfile     = (username) => api.get(`/analysis/user-profile?user=${encodeURIComponent(username)}`)
export const getSessionStatus  = () => api.get('/session/status')
export const clearSession      = () => api.post('/session/clear')

export const getLLMInsights = (payload) => api.post('/llm-insights', payload)

export default api
