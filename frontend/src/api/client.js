import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

// React StrictMode runs development effects twice. Share identical in-flight
// reads so the development server receives one request per page load.
const pendingGetRequests = new Map()
const axiosGet = api.get.bind(api)
api.get = (url, config = {}) => {
  if (config.signal || config.cancelToken) return axiosGet(url, config)

  const key = JSON.stringify([
    url,
    config.params ?? null,
    config.baseURL ?? api.defaults.baseURL,
    config.responseType ?? 'json',
    config.headers?.Authorization ?? sessionStorage.getItem('accessToken') ?? '',
  ])
  const pending = pendingGetRequests.get(key)
  if (pending) return pending

  const request = axiosGet(url, config).finally(() => pendingGetRequests.delete(key))
  pendingGetRequests.set(key, request)
  return request
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshRequest
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const refreshToken = sessionStorage.getItem('refreshToken')
    if (error.response?.status !== 401 || !refreshToken || originalRequest?._retried) {
      return Promise.reject(error)
    }

    originalRequest._retried = true
    refreshRequest ||= axios.post(`${api.defaults.baseURL}/token/refresh/`, { refresh: refreshToken })
      .then(({ data }) => {
        sessionStorage.setItem('accessToken', data.access)
        return data.access
      })
      .finally(() => { refreshRequest = undefined })

    try {
      const accessToken = await refreshRequest
      originalRequest.headers.Authorization = `Bearer ${accessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      window.dispatchEvent(new Event('auth:expired'))
      return Promise.reject(refreshError)
    }
  },
)

export default api
