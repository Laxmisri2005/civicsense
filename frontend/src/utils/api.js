import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 15000, withCredentials: true })

api.interceptors.request.use(config => {
  const token = localStorage.getItem('cs_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cs_token')
      if (!window.location.pathname.includes('/login'))
        window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register:           d => api.post('/auth/register', d),
  login:              d => api.post('/auth/login', d),
  logout:             () => api.post('/auth/logout'),
  me:                 () => api.get('/auth/me'),
  updateProfile:      d => api.patch('/auth/profile', d),
  verifyEmail:        d => api.post('/auth/verify-email', d),
  resendVerification: () => api.post('/auth/resend-verification'),
  forgotPassword:     d => api.post('/auth/forgot-password', d),
  resetPassword:      d => api.post('/auth/reset-password', d),
  requestNGOBadge:    d => api.post('/auth/request-ngo-badge', d),
}

export const issuesAPI = {
  getAll:             p  => api.get('/issues/', { params: p }),
  getOne:             id => api.get(`/issues/${id}`),
  create:             d  => api.post('/issues/', d),
  upvote:             id => api.post(`/issues/${id}/upvote`),
  comment:            (id, d) => api.post(`/issues/${id}/comment`, d),
  deleteComment:      id => api.delete(`/issues/comment/${id}`),
  updateStatus:       (id, d) => api.patch(`/issues/${id}/status`, d),
  categories:         () => api.get('/issues/meta/categories'),
  stats:              () => api.get('/issues/meta/stats'),
  myIssues:           p  => api.get('/issues/my-issues', { params: p }),
  authorityDashboard: p  => api.get('/issues/authority-dashboard', { params: p }),
}

export const alertsAPI = {
  getAll:     ()  => api.get('/alerts/'),
  getWeather: p   => api.get('/alerts/weather', { params: p }),
  create:     d   => api.post('/alerts/', d),
}

export const helpAPI = {
  getAll:     p  => api.get('/help/', { params: p }),
  create:     d  => api.post('/help/', d),
  fulfill:    id => api.patch(`/help/${id}/fulfill`),
  categories: () => api.get('/help/meta/categories'),
}

export const storiesAPI = {
  getAll: p  => api.get('/stories/', { params: p }),
  getOne: id => api.get(`/stories/${id}`),
  create: d  => api.post('/stories/', d),
  like:   id => api.post(`/stories/${id}/like`),
  tags:   () => api.get('/stories/meta/tags'),
}

export const offlineAPI = {
  templates: () => api.get('/offline/templates'),
  sync:      msgs => api.post('/offline/sync', { messages: msgs }),
  nearby:    () => api.get('/offline/nearby'),
}

export const notifAPI = {
  getAll:     p  => api.get('/notifications/', { params: p }),
  markRead:   id => api.patch(`/notifications/${id}/read`),
  markAllRead:() => api.post('/notifications/read-all'),
  unreadCount:() => api.get('/notifications/unread-count'),
}

export const searchAPI = {
  search: q => api.get('/search/', { params: { q } }),
}

export default api

export const analyticsAPI = {
  dashboard: () => api.get('/analytics/dashboard'),
  ward:      w  => api.get(`/analytics/ward/${w}`),
}

export const volunteersAPI = {
  getAll:   p  => api.get('/volunteers/', { params: p }),
  getOne:   id => api.get(`/volunteers/${id}`),
  create:   d  => api.post('/volunteers/', d),
  enroll:   (id, d) => api.post(`/volunteers/${id}/enroll`, d),
  complete: id => api.patch(`/volunteers/${id}/complete`),
  types:    () => api.get('/volunteers/types'),
}

export const budgetAPI = {
  getAll:   p  => api.get('/budget/', { params: p }),
  create:   d  => api.post('/budget/', d),
  vote:     (id, v) => api.post(`/budget/${id}/vote`, { vote: v }),
  myVotes:  () => api.get('/budget/my-votes'),
}

export const adminAPI = {
  listUsers:     p    => api.get('/admin/users', { params: p }),
  toggleUser:    id   => api.patch(`/admin/users/${id}/toggle`),
  changeRole:    (id, role) => api.patch(`/admin/users/${id}/role`, { role }),
  moderateIssue: (id, action) => api.patch(`/admin/issues/${id}/moderate`, { action }),
  auditLog:      p   => api.get('/admin/audit-log', { params: p }),
}

export const aiAPI = {
  categorize:     d  => api.post('/ai/categorize', d),
  findDuplicates: d  => api.post('/ai/duplicates', d),
  translate:      d  => api.post('/ai/translate', d),
  detectLang:     d  => api.post('/ai/detect-language', d),
  sendSMS:        d  => api.post('/ai/sms-alert', d),
}

export const mapAPI = {
  issuesGeoJSON: p  => api.get('/map/issues/geojson', { params: p }),
  helpGeoJSON:   () => api.get('/map/help/geojson'),
  wardHeatmap:   () => api.get('/map/ward-heatmap'),
  nearbyGIS:     p  => api.get('/map/gis/nearby', { params: p }),
}

export const alertsSafetyAPI = {
  safetyInfo: type => api.get(`/alerts/safety-info/${type}`),
  smsBroadcast: d  => api.post('/alerts/sms-broadcast', d),
}
