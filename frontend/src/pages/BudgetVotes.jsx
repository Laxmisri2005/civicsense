import { useEffect, useState } from 'react'
import { budgetAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import { ThumbsUp, ThumbsDown, Plus, X, IndianRupee } from 'lucide-react'
import './BudgetVotes.css'

const CATEGORIES = ['Roads', 'Water Supply', 'Sanitation', 'Parks', 'Schools',
                    'Hospitals', 'Electricity', 'Drainage', 'Housing', 'Other']

export default function BudgetVotes() {
  const { user }                        = useAuth()
  const [proposals, setProposals]       = useState([])
  const [myVotes, setMyVotes]           = useState({})   // { proposal_id: true/false }
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '', estimated_cost: '', ward: '' })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [pRes, vRes] = await Promise.allSettled([
        budgetAPI.getAll(),
        user ? budgetAPI.myVotes() : Promise.resolve({ data: [] })
      ])
      if (pRes.status === 'fulfilled') setProposals(Array.isArray(pRes.value.data) ? pRes.value.data : (pRes.value.data?.items ?? []))
      if (vRes.status === 'fulfilled') {
        const vMap = {}
        const votes = Array.isArray(vRes.value.data) ? vRes.value.data : []
        votes.forEach(v => { vMap[v.proposal_id] = v.vote })
        setMyVotes(vMap)
      }
    } finally { setLoading(false) }
  }

  async function handleVote(id, vote) {
    if (!user) return alert('Please log in to vote')
    try {
      await budgetAPI.vote(id, vote)
      setMyVotes(v => ({ ...v, [id]: vote }))
      setProposals(ps => ps.map(p =>
        p.id === id
          ? { ...p, votes_for: vote ? p.votes_for + 1 : p.votes_for,
                    votes_against: !vote ? p.votes_against + 1 : p.votes_against,
                    total_votes: p.total_votes + 1 }
          : p
      ))
    } catch (err) {
      alert(err.response?.data?.error || 'Vote failed')
    }
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await budgetAPI.create(form)
      setShowForm(false)
      setForm({ title: '', description: '', category: '', estimated_cost: '', ward: '' })
      fetchData()
    } finally { setSubmitting(false) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="budget-page">
      <div className="budget-header">
        <div>
          <h1 className="page-title">🏛️ Community Budget Votes</h1>
          <p className="page-subtitle">Vote on how your ward's civic budget should be spent. Every vote counts.</p>
        </div>
        {user && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Propose
          </button>
        )}
      </div>

      {!user && (
        <div className="budget-notice">
          🔒 Sign in to vote on proposals and submit your own ideas.
        </div>
      )}

      {loading ? <p className="loading-text">Loading proposals…</p>
        : proposals.length === 0 ? (
          <div className="empty-state">
            <h3>No proposals yet</h3>
            <p>Be the first to propose a civic budget priority.</p>
          </div>
        ) : (
          <div className="proposals-list">
            {proposals.map(p => {
              const myVote  = myVotes[p.id]
              const hasVoted = myVote !== undefined
              const approvalPct = p.total_votes > 0 ? Math.round(p.votes_for / p.total_votes * 100) : 0

              return (
                <div key={p.id} className="proposal-card card">
                  <div className="proposal-card__top">
                    <div className="proposal-card__info">
                      <div className="proposal-card__tags">
                        {p.category && <span className="badge badge-navy">{p.category}</span>}
                        {p.ward && <span className="badge badge-amber">Ward: {p.ward}</span>}
                      </div>
                      <h3 className="proposal-card__title">{p.title}</h3>
                      {p.description && <p className="proposal-card__desc">{p.description}</p>}
                      {p.estimated_cost && (
                        <div className="proposal-card__cost">
                          <IndianRupee size={13} /> Estimated: <strong>{p.estimated_cost}</strong>
                        </div>
                      )}
                    </div>

                    {/* Vote buttons */}
                    <div className="proposal-votes">
                      <button
                        className={`vote-btn vote-btn--for ${myVote === true ? 'vote-btn--active' : ''}`}
                        onClick={() => !hasVoted && handleVote(p.id, true)}
                        disabled={hasVoted}>
                        <ThumbsUp size={16} />
                        <span>{p.votes_for}</span>
                      </button>
                      <button
                        className={`vote-btn vote-btn--against ${myVote === false ? 'vote-btn--active-red' : ''}`}
                        onClick={() => !hasVoted && handleVote(p.id, false)}
                        disabled={hasVoted}>
                        <ThumbsDown size={16} />
                        <span>{p.votes_against}</span>
                      </button>
                    </div>
                  </div>

                  {/* Approval bar */}
                  <div className="approval-section">
                    <div className="approval-bar">
                      <div className="approval-bar__for"   style={{ width: `${approvalPct}%` }} />
                      <div className="approval-bar__against" style={{ width: `${100 - approvalPct}%` }} />
                    </div>
                    <div className="approval-labels">
                      <span style={{ color: 'var(--green)' }}>👍 {approvalPct}% support</span>
                      <span style={{ color: 'var(--text-muted)' }}>{p.total_votes} total votes</span>
                      {hasVoted && <span className="voted-badge">✅ You voted</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Propose form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2>🏛️ Submit Budget Proposal</h2>
              <button className="modal__close" onClick={() => setShowForm(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="modal__form">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={set('title')} required
                  placeholder="e.g. Build covered bus stops in Ward 7" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" rows={3} value={form.description}
                  onChange={set('description')} placeholder="Why is this important?" />
              </div>
              <div className="auth-grid">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-input" value={form.category} onChange={set('category')}>
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ward (optional)</label>
                  <input className="form-input" value={form.ward} onChange={set('ward')} placeholder="e.g. Ward 12" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estimated Cost</label>
                <input className="form-input" value={form.estimated_cost} onChange={set('estimated_cost')}
                  placeholder="e.g. ₹50 Lakh" />
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
