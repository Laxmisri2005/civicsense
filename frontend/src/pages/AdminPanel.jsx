import { useEffect, useState } from 'react'
import { adminAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import { Users, FileText, Shield, Activity, Search, ChevronRight } from 'lucide-react'
import './AdminPanel.css'

export default function AdminPanel() {
  const { user, loading }         = useAuth()
  const [tab, setTab]             = useState('users')
  const [users, setUsers]         = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [search, setSearch]       = useState('')
  const [dataLoading, setDataLoading] = useState(false)
  const [page, setPage]           = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!user || !['admin', 'authority'].includes(user.role)) return
    if (tab === 'users')  fetchUsers()
    if (tab === 'audit')  fetchAudit()
  }, [tab, page, search, user])

  // Guard: only admin/authority — placed AFTER all hooks to follow Rules of Hooks
  if (!loading && (!user || !['admin', 'authority'].includes(user.role))) {
    return <Navigate to="/" replace />
  }

  async function fetchUsers() {
    setDataLoading(true)
    try {
      const r = await adminAPI.listUsers({ page, search })
      setUsers(r.data?.items ?? [])
      setTotalPages(r.data?.pages ?? 1)
    } finally { setDataLoading(false) }
  }

  async function fetchAudit() {
    setDataLoading(true)
    try {
      const r = await adminAPI.auditLog({ page })
      setAuditLogs(r.data?.items ?? [])
      setTotalPages(r.data?.pages ?? 1)
    } finally { setDataLoading(false) }
  }

  async function toggleUser(id) {
    await adminAPI.toggleUser(id)
    fetchUsers()
  }

  async function changeRole(id, role) {
    await adminAPI.changeRole(id, role)
    fetchUsers()
  }

  const ROLE_OPTIONS = ['citizen', 'authority', 'admin']
  const ROLE_COLOR   = { citizen: 'badge-navy', authority: 'badge-amber', admin: 'badge-red' }

  return (
    <div className="admin-page">
      <h1 className="page-title">⚙️ Admin Panel</h1>
      <p className="page-subtitle">Manage users, roles, and monitor platform activity.</p>

      {/* Tabs */}
      <div className="lb-tabs">
        {[
          { key: 'users', icon: Users,    label: 'Users' },
          { key: 'audit', icon: Activity, label: 'Audit Log' },
        ].map(t => (
          <button key={t.key} className={`lb-tab ${tab === t.key ? 'lb-tab--active' : ''}`}
            onClick={() => { setTab(t.key); setPage(1) }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === 'users' && (
        <div className="admin-section">
          <div className="admin-search">
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input className="form-input" placeholder="Search by username or email…"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>

          {dataLoading ? <p className="loading-text">Loading users…</p> : (
            <div className="admin-table card">
              <div className="admin-table__head">
                <span>User</span><span>Role</span><span>Stats</span><span>Status</span><span>Actions</span>
              </div>
              {users.map(u => (
                <div key={u.id} className="admin-row">
                  <div className="admin-row__user">
                    <div className="admin-avatar">{u.username[0].toUpperCase()}</div>
                    <div>
                      <div className="admin-row__name">{u.full_name || u.username}</div>
                      <div className="admin-row__email">{u.email}</div>
                    </div>
                  </div>

                  <div>
                    <select className={`role-select badge ${ROLE_COLOR[u.role]}`}
                      value={u.role}
                      onChange={e => changeRole(u.id, e.target.value)}>
                      {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>

                  <div className="admin-row__stats">
                    <span>📍 {u.issues_reported}</span>
                    <span>🤝 {u.helps_given}</span>
                    <span>⭐ {u.reputation_score}</span>
                  </div>

                  <div>
                    <span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>
                      {u.is_active ? 'Active' : 'Banned'}
                    </span>
                  </div>

                  <div className="admin-row__actions">
                    <button className={`btn ${u.is_active ? 'btn-danger' : 'btn-ghost'}`}
                      style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                      onClick={() => toggleUser(u.id)}>
                      {u.is_active ? 'Ban' : 'Unban'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="admin-pagination">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}

      {/* Audit log tab */}
      {tab === 'audit' && (
        <div className="admin-section">
          {dataLoading ? <p className="loading-text">Loading audit log…</p> : (
            <div className="audit-list card">
              {auditLogs.map(log => (
                <div key={log.id} className="audit-row">
                  <div className="audit-row__action">
                    <span className="audit-action-badge">{log.action.replace(/_/g, ' ')}</span>
                    {log.entity && <span className="audit-entity">{log.entity} #{log.entity_id}</span>}
                  </div>
                  <div className="audit-row__detail">{log.detail || '—'}</div>
                  <div className="audit-row__meta">
                    <span>User #{log.user_id || 'anon'}</span>
                    <span>{log.ip_address}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && <p style={{ padding: 20, color: 'var(--text-muted)' }}>No audit logs yet.</p>}
            </div>
          )}
          <div className="admin-pagination">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}
