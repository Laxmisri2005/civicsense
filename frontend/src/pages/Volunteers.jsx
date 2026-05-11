import { useEffect, useState } from 'react'
import { volunteersAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { Users, Plus, X, MapPin, Calendar, CheckCircle } from 'lucide-react'
import './Volunteers.css'

const TYPE_EMOJI = {
  'Flood Relief': '🌊', 'Earthquake Response': '🏚️', 'Medical Camp': '🏥',
  'Food Distribution': '🍱', 'Road Cleanup': '🛣️', 'Tree Plantation': '🌳',
  'Shelter Setup': '🏕️', 'Education Drive': '📚', 'Blood Donation': '🩸', 'Other': '🤝'
}
const STATUS_COLOR = { Open: 'badge-green', Active: 'badge-blue', Completed: 'badge-navy' }

export default function Volunteers() {
  const { user }                    = useAuth()
  const [missions, setMissions]     = useState([])
  const [types, setTypes]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [filter, setFilter]         = useState({ status: '', type: '' })
  const [enrollingId, setEnrollingId] = useState(null)
  const [skills, setSkills]         = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', mission_type: 'Other',
    location_text: '', max_volunteers: 20,
    start_date: '', end_date: ''
  })

  useEffect(() => {
    fetchMissions()
    volunteersAPI.types().then(r => setTypes(Array.isArray(r.data) ? r.data : []))
  }, [filter])

  async function fetchMissions() {
    setLoading(true)
    try {
      const params = {}
      if (filter.status) params.status = filter.status
      if (filter.type)   params.type   = filter.type
      const r = await volunteersAPI.getAll(params)
      setMissions(Array.isArray(r.data) ? r.data : (r.data?.items ?? []))
    } finally { setLoading(false) }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await volunteersAPI.create(form)
      setShowForm(false)
      fetchMissions()
    } finally { setSubmitting(false) }
  }

  async function handleEnroll(id) {
    try {
      await volunteersAPI.enroll(id, { skills })
      setEnrollingId(null)
      setSkills('')
      fetchMissions()
    } catch (err) {
      alert(err.response?.data?.error || 'Enrollment failed')
    }
  }

  async function handleComplete(id) {
    if (!window.confirm('Mark this mission as completed?')) return
    await volunteersAPI.complete(id)
    fetchMissions()
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="volunteers-page">
      <div className="volunteers-header">
        <div>
          <h1 className="page-title">🤝 Volunteer Missions</h1>
          <p className="page-subtitle">Join disaster relief and civic improvement missions in your area.</p>
        </div>
        {user && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Create Mission
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card filters">
        <select className="form-input filter-select"
          value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="Active">Active</option>
          <option value="Completed">Completed</option>
        </select>
        <select className="form-input filter-select"
          value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Missions */}
      {loading ? <p className="loading-text">Loading missions…</p>
        : missions.length === 0 ? (
          <div className="empty-state"><h3>No missions found</h3><p>Be the first to organize a volunteer mission.</p></div>
        ) : (
          <div className="grid-2">
            {missions.map(m => (
              <div key={m.id} className="mission-card card">
                <div className="mission-card__header">
                  <span className="mission-emoji">{TYPE_EMOJI[m.mission_type] ?? '🤝'}</span>
                  <div className="mission-card__meta">
                    <div className="mission-card__tags">
                      <span className={`badge ${STATUS_COLOR[m.status]}`}>{m.status}</span>
                      <span className="badge badge-navy">{m.mission_type}</span>
                    </div>
                    <h3 className="mission-card__title">{m.title}</h3>
                  </div>
                </div>

                <p className="mission-card__desc">{m.description}</p>

                <div className="mission-card__info">
                  {m.location_text && <span><MapPin size={12} /> {m.location_text}</span>}
                  {m.start_date && <span><Calendar size={12} /> {new Date(m.start_date).toLocaleDateString()}</span>}
                  <span><Users size={12} /> {m.enrolled_count} / {m.max_volunteers} volunteers</span>
                </div>

                {/* Enrollment progress */}
                <div className="enroll-bar">
                  <div className="enroll-bar__fill"
                    style={{ width: `${Math.min((m.enrolled_count / m.max_volunteers) * 100, 100)}%` }} />
                </div>

                {/* Actions */}
                <div className="mission-card__actions">
                  {user && m.status === 'Open' && (
                    enrollingId === m.id ? (
                      <div className="enroll-form">
                        <input className="form-input" placeholder="Your skills (optional)"
                          value={skills} onChange={e => setSkills(e.target.value)} />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary" style={{ fontSize: '0.82rem' }}
                            onClick={() => handleEnroll(m.id)}>
                            <CheckCircle size={13} /> Confirm
                          </button>
                          <button className="btn btn-ghost" style={{ fontSize: '0.82rem' }}
                            onClick={() => setEnrollingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button className="btn btn-primary" style={{ fontSize: '0.82rem' }}
                        onClick={() => setEnrollingId(m.id)}>
                        <Users size={14} /> Join Mission
                      </button>
                    )
                  )}
                  {user && m.status !== 'Completed' && (
                    <button className="btn btn-ghost" style={{ fontSize: '0.78rem' }}
                      onClick={() => handleComplete(m.id)}>
                      ✅ Mark Complete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Create form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>🤝 Create Volunteer Mission</h2>
              <button className="modal__close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="modal__form">
              <div className="form-group">
                <label className="form-label">Mission Title *</label>
                <input className="form-input" value={form.title} onChange={set('title')} required
                  placeholder="e.g. Flood Relief - Kakinada Ward 5" />
              </div>
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select className="form-input" value={form.mission_type} onChange={set('mission_type')}>
                  {types.map(t => <option key={t} value={t}>{TYPE_EMOJI[t]} {t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-input" rows={3} value={form.description}
                  onChange={set('description')} required placeholder="What will volunteers do?" />
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location_text} onChange={set('location_text')}
                  placeholder="Meeting point or area" />
              </div>
              <div className="auth-grid">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input className="form-input" type="datetime-local" value={form.start_date} onChange={set('start_date')} />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="datetime-local" value={form.end_date} onChange={set('end_date')} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Max Volunteers</label>
                <input className="form-input" type="number" min={1} max={500}
                  value={form.max_volunteers} onChange={set('max_volunteers')} />
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating…' : 'Create Mission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
