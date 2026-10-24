import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    const { data } = await api.get('/me/')
    setUser(data)
    return data
  }, [])

  useEffect(() => {
    let active = true
    const restore = async () => {
      if (!sessionStorage.getItem('accessToken') && !sessionStorage.getItem('refreshToken')) {
        setLoading(false)
        return
      }
      try {
        const { data } = await api.get('/me/')
        if (active) setUser(data)
      } catch {
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    }
    restore()
    const expire = () => setUser(null)
    window.addEventListener('auth:expired', expire)
    return () => {
      active = false
      window.removeEventListener('auth:expired', expire)
    }
  }, [])

  const login = useCallback(async (credentials) => {
    const { data } = await api.post('/token/', credentials)
    sessionStorage.setItem('accessToken', data.access)
    sessionStorage.setItem('refreshToken', data.refresh)
    try {
      const profile = await loadProfile()
      if (credentials.account_type && profile.role !== credentials.account_type) {
        throw new Error('The signed-in account does not match the selected account type.')
      }
      return profile
    } catch (error) {
      sessionStorage.removeItem('accessToken')
      sessionStorage.removeItem('refreshToken')
      setUser(null)
      throw error
    }
  }, [loadProfile])

  const register = useCallback((details) => api.post('/register/', details), [])

  const logout = useCallback(() => {
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, loading, login, register, logout, loadProfile }), [
    user, loading, login, register, logout, loadProfile,
  ])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
