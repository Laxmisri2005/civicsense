import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { issuesAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'
import {
  AlertTriangle, Clock, CheckCircle, Flame,
  ChevronLeft, ChevronRight, Filter, RefreshCw, MapPin, ThumbsUp
} from 'lucide-react'
import './AuthorityDashboard.css'

const STATUS_OPTIONS = ['', 'Reported', 'Under Review', 'In Progress']
const STATUS_CLS     = {
  Reported:       'badge-amber',
  'Under Review': 'badge-purple',
  'In Progress':  'badge-blue',
  Resolved:       'badge-green',
  Rejected:       'badge-red',
}
const PRIORITY_COLOR = { Critical: '#dc2626', 'High Priority': '#f59e0b', Normal: '#2563eb' }

export default function AuthorityDashboard() {
  const { user, loading: authLoading } = useAuth()

  const [issues,   setIssues]   = useState([])
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [page,     setPage]     = useState(1)
  const [pages,    setPages]    = useState(1)
  const [total,    setTotal]    = useState(0)
  const [filter,   setFilter]   = useState({ status: '', category: '' })

  // Status update modal
  const [selected,    setSelected]    = useState(null)
  const [newStatus,   setNewStatus]   = useState('')
  const [note,        setNote]        = useState('')
  const [updating,    setUpdating]    = useState(false)
  const [updateMsg,   setUpdateMsg]   = useState('')

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const r = await issuesAPI.authorityDashboard({ page, ...filter })
      setIssues(r.data.items   ?? [])
      setTotal( r.data.total   ?? 0)
      setPages( r.data.pages   ?? 1)
      setSummary(r.data.summary)
    } catch { setIssues([]) }
    finally { setLoading(false) }
  }, [page, filter])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  if (authLoading) return <div className="loading-text">Loading…</div>
  if (!user || !['authority', 'admin'].includes(user.role)) return <Navigate to="/" replace />

  async function handleUpdate(e) {
    e.preventDefault()
    if (!newStatus) return
    setUpdating(true); setUpdateMsg('')
    try {
      await issuesAPI.updateStatus(selected.id, { status: newStatus, authority_note: note })
      setUpdateMsg(`✅ Status updated to "${newStatus}" — Citizen has been notified by email.`)
      setNote('')
      fetchDashboard()
      setTimeout(() => { setSelected(null); setUpdateMsg('') }, 2500)
    } catch {
      setUpdateMsg('❌ Update failed. Please try again.')
    } finally { setUpdating(false) }
  }

  const setF = (k, v) => { setFilter(f => ({ ...f, [k]: v })); setPage(1) }

  return (
    <div className="auth-dash">
      <div className="auth-dash__header">
        <div>
          <h1 className="page-title">🏛️ Authority Dashboard</h1>
          <p className="page-sub">Pending civic issues assigned to you — review, act, and resolve.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={fetchDashboard} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="auth-summary">
          <div className="auth-kpi auth-kpi--red">
            <Flame size={20} />
            <div>
              <strong>{summary.critical}</strong>
              <span>Critical</span>
            </div>
          </div>
          <div className="auth-kpi auth-kpi--amber">
            <AlertTriangle size={20} />
            <div>
              <strong>{summary.high_priority}</strong>
              <span>High Priority</span>
            </div>
          </div>
          <div className="auth-kpi auth-kpi--blue">
            <Clock size={20} />
            <div>
              <strong>{summary.total_pending}</strong>
              <span>Total Pending</span>
            </div>
          </div>
          <div className="auth-kpi auth-kpi--green">
            <CheckCircle size={20} />
            <div>
              <strong>{summary.resolved_today}</strong>
              <span>Resolved Today</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card filters-bar">
        <Filter size={13} color="var(--muted)" />
        <select className="form-input filter-sel"
          value={filter.status} onChange={e => setF('status', e.target.value)}>
          <option value="">All Pending Statuses</option>
          {STATUS_OPTIONS.filter(Boolean).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select className="form-input filter-sel"
          value={filter.category} onChange={e => setF('category', e.target.value)}>
          <option value="">All Categories</option>
          {['Road & Infrastructure','Water Supply','Drainage & Sewage','Electricity',
            'Sanitation & Waste','Pollution','Public Safety','Parks & Public Spaces',
            'Encroachment','Government Services','Transport & Traffic','Healthcare',
            'Education','Animal & Wildlife','Disaster & Emergency','Other'
          ].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Issues list */}
      {loading ? (
        <p className="loading-text">Loading pending issues…</p>
      ) : issues.length === 0 ? (
        <div className="empty-state">
          <CheckCircle size={40} color="var(--green)" />
          <h3>All Clear!</h3>
          <p>No pending issues matching your filters. Great work!</p>
        </div>
      ) : (
        <>
          <div className="auth-issues-list">
            {issues.map(issue => (
              <div key={issue.id} className="auth-issue-card card">
                {/* Priority stripe */}
                <div className="auth-issue-card__stripe"
                  style={{ background: PRIORITY_COLOR[issue.priority] || '#6b7280' }} />

                <div className="auth-issue-card__body">
                  <div className="auth-issue-card__top">
                    <div className="auth-issue-card__tags">
                      <span className={`badge ${STATUS_CLS[issue.status] || 'badge-navy'}`}>
                        {issue.status}
                      </span>
                      {issue.priority !== 'Normal' && (
                        <span className="badge badge-red">
                          {issue.priority === 'Critical' ? '🚨' : '🔥'} {issue.priority}
                        </span>
                      )}
                      <span className="badge badge-navy">{issue.category}</span>
                    </div>
                    <div className="auth-issue-card__meta">
                      <span><ThumbsUp size={11} /> {issue.upvotes}</span>
                      <span>{new Date(issue.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>

                  <h3 className="auth-issue-card__title">
                    <Link to={`/issues/${issue.id}`}>{issue.title}</Link>
                  </h3>
                  <p className="auth-issue-card__desc">
                    {issue.description.length > 120
                      ? issue.description.slice(0, 120) + '…'
                      : issue.description}
                  </p>

                  <div className="auth-issue-card__foot">
                    <span className="auth-issue-card__loc">
                      <MapPin size={11} /> {issue.location_text || 'No location'}
                      {issue.ward && ` · Ward ${issue.ward}`}
                    </span>
                    <span className="auth-issue-card__dept">{issue.assigned_to}</span>
                  </div>

                  {issue.authority_note && (
                    <div className="auth-prev-note">
                      📝 <em>Last note: {issue.authority_note}</em>
                    </div>
                  )}

                  <div className="auth-issue-card__actions">
                    <Link to={`/issues/${issue.id}`} className="btn btn-ghost btn-sm">
                      View Full Issue
                    </Link>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setSelected(issue); setNewStatus(''); setNote(''); setUpdateMsg('') }}>
                      ✏️ Update Status
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pages > 1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}>
                <ChevronLeft size={15} /> Prev
              </button>
              <span>Page {page} of {pages} · {total} total</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= pages}
                onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Update Status Modal */}
      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal card" onClick={e => e.stopPropagation()}
            style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2>✏️ Update Issue Status</h2>
              <button className="modal-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="auth-modal-issue">
                <strong>{selected.title}</strong>
                <span>{selected.category} · {selected.location_text || 'No location'}</span>
              </div>

              {updateMsg && (
                <div className={updateMsg.startsWith('✅')
                  ? 'profile-success' : 'profile-error'}>
                  {updateMsg}
                </div>
              )}

              <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                <div className="form-group">
                  <label className="form-label">New Status *</label>
                  <div className="status-btn-grid">
                    {[
                      { s: 'Under Review', emoji: '🔍', desc: 'Acknowledged, investigating' },
                      { s: 'In Progress',  emoji: '🔧', desc: 'Work has started' },
                      { s: 'Resolved',     emoji: '✅', desc: 'Issue fixed & closed' },
                      { s: 'Rejected',     emoji: '❌', desc: 'Not actionable / invalid' },
                    ].map(({ s, emoji, desc }) => (
                      <button key={s} type="button"
                        className={`status-btn ${newStatus === s ? 'status-btn--active' : ''}`}
                        onClick={() => setNewStatus(s)}>
                        <span>{emoji}</span>
                        <strong>{s}</strong>
                        <small>{desc}</small>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Note to Citizen (optional)</label>
                  <textarea className="form-input" rows={3}
                    placeholder="e.g. Road repair scheduled for 15th June. Contractor assigned."
                    value={note} onChange={e => setNote(e.target.value)} />
                  <span className="form-hint">This note will be emailed to the citizen and shown on the issue.</span>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost"
                    onClick={() => setSelected(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary"
                    disabled={updating || !newStatus}>
                    {updating ? 'Updating…' : '📨 Update & Notify Citizen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
