/**
 * AuthContext — Global authentication state
 * Wraps the entire app, provides user, login, logout, loading.
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)  // checking session on mount

  // On app load, check if token exists and fetch profile
  useEffect(() => {
    const token = localStorage.getItem('cs_token')
    if (token) {
      authAPI.me()
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('cs_token'))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(identifier, password) {
    const res = await authAPI.login({ identifier, password })
    localStorage.setItem('cs_token', res.data.access_token)
    setUser(res.data.user)
    return res.data.user
  }

  async function register(data) {
    const res = await authAPI.register(data)
    localStorage.setItem('cs_token', res.data.access_token)
    setUser(res.data.user)
    return res.data.user
  }

  async function logout() {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('cs_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
