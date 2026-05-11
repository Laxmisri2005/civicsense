import { useEffect, useState } from 'react'
import { storiesAPI } from '../utils/api'
import { BookOpen, Heart, Plus, X } from 'lucide-react'
import './Stories.css'

const DHARMA = {
  Dharma:     { bg:'#fef3c7', color:'#92400e', quote:'"Dharma protects those who protect it." — Mahabharata' },
  Patience:   { bg:'#e0f2fe', color:'#0369a1', quote:'"A man is great not in strength, but in patience." — Mahabharata' },
  Justice:    { bg:'#fee2e2', color:'#b91c1c', quote:'"Satyameva Jayate — Truth alone triumphs." — Upanishad' },
  Courage:    { bg:'#fce7f3', color:'#be185d', quote:'"Arise, awake, and stop not till the goal is reached." — Vivekananda' },
  Compassion: { bg:'#dcfce7', color:'#15803d', quote:'"Ahimsa paramo dharma — Non-violence is the highest duty."' },
  Truth:      { bg:'#ede9fe', color:'#6d28d9', quote:'"Let noble thoughts come to us from every side." — Rigveda' },
  Sacrifice:  { bg:'#ffedd5', color:'#c2410c', quote:'"The greatest sacrifice is to give up comfort for another\'s wellbeing."' },
}

export default function Stories() {
  const [stories,  setStories]  = useState([])
  const [tags,     setTags]     = useState([])
  const [tag,      setTag]      = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSub]    = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ title:'',content:'',moral:'',dharma_tag:'',is_anonymous:true,author_name:'' })

  useEffect(() => { fetchStories() }, [tag])

  async function fetchStories() {
    setLoading(true)
    try {
      const r = await storiesAPI.getAll(tag ? { tag } : {})
      setStories(Array.isArray(r.data) ? r.data : (r.data.items || []))
    } finally { setLoading(false) }
  }

  useEffect(() => { storiesAPI.tags().then(r => setTags(r.data||[])) }, [])

  async function handleLike(e, id) {
    e.stopPropagation()
    await storiesAPI.like(id)
    setStories(s => s.map(x => x.id===id ? {...x, likes:x.likes+1} : x))
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSub(true)
    try {
      await storiesAPI.create(form)
      setShowForm(false)
      setForm({title:'',content:'',moral:'',dharma_tag:'',is_anonymous:true,author_name:''})
      fetchStories()
    } catch (ex) { alert(ex.response?.data?.error||'Failed to share story.') }
    finally { setSub(false) }
  }

  return (
    <div className="stories-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inspire & Share</h1>
          <p className="page-sub">Stories of courage, compassion, and dharma from our community.</p>
        </div>
        <button className="btn btn-saffron" onClick={()=>setShowForm(true)}>
          <Plus size={15}/> Share Story
        </button>
      </div>

      {/* Tag filter */}
      <div className="tabs">
        <button className={`tab ${tag===''?'tab--active':''}`} onClick={()=>setTag('')}>All</button>
        {tags.map(t => {
          const d = DHARMA[t] || {}
          return (
            <button key={t}
              className={`tab ${tag===t?'tab--active':''}`}
              style={tag===t ? {background:d.color,color:'#fff'} : {background:d.bg,color:d.color}}
              onClick={()=>setTag(t)}>{t}</button>
          )
        })}
      </div>

      {/* Active tag quote */}
      {tag && DHARMA[tag] && (
        <div className="dharma-quote-bar" style={{borderLeftColor:DHARMA[tag].color}}>
          <em>{DHARMA[tag].quote}</em>
        </div>
      )}

      {/* Stories */}
      {loading ? <p className="loading-text">Loading stories…</p>
        : stories.length===0 ? (
          <div className="empty-state"><h3>No stories yet</h3><p>Be the first to share a story of courage or compassion.</p></div>
        ) : (
          <div className="stories-grid">
            {stories.map(s => {
              const d = DHARMA[s.dharma_tag] || {}
              const open = expanded === s.id
              return (
                <div key={s.id} className="story-card card">
                  <div className="story-card__body" onClick={()=>setExpanded(open?null:s.id)}>
                    {s.dharma_tag && (
                      <span className="badge" style={{background:d.bg,color:d.color}}>✦ {s.dharma_tag}</span>
                    )}
                    <h3 className="story-title">{s.title}</h3>
                    <p className="story-excerpt">
                      {open ? s.content : s.content.slice(0,150)+(s.content.length>150?'…':'')}
                    </p>
                    {open && s.moral && (
                      <div className="story-moral">💡 <strong>Moral:</strong> {s.moral}</div>
                    )}
                    {open && s.quote && (
                      <div className="story-scripture">
                        <em>"{s.quote}"</em>
                        {s.quote_source && <span> — {s.quote_source}</span>}
                      </div>
                    )}
                  </div>
                  <div className="story-card__foot">
                    <span className="story-meta">By {s.author_name} · {new Date(s.created_at).toLocaleDateString('en-IN')}</span>
                    <div style={{display:'flex',gap:7,alignItems:'center'}}>
                      <button className="like-btn" onClick={e=>handleLike(e,s.id)}>
                        <Heart size={13}/> {s.likes}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={()=>setExpanded(open?null:s.id)}>
                        {open?'Less':'Read more'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      {/* Form modal */}
      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2><BookOpen size={16}/> Share Your Story</h2>
              <button className="modal-close" onClick={()=>setShowForm(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Give your story a title"/>
              </div>
              <div className="form-group">
                <label className="form-label">Your Story *</label>
                <textarea className="form-input" rows={5} required value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Share your experience…"/>
              </div>
              <div className="form-group">
                <label className="form-label">Moral / Lesson</label>
                <input className="form-input" value={form.moral} onChange={e=>setForm(f=>({...f,moral:e.target.value}))} placeholder="What did you learn?"/>
              </div>
              <div className="form-group">
                <label className="form-label">Dharma Tag</label>
                <select className="form-input" value={form.dharma_tag} onChange={e=>setForm(f=>({...f,dharma_tag:e.target.value}))}>
                  <option value="">None</option>
                  {tags.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="anon-toggle">
                <input type="checkbox" id="anon-s" checked={form.is_anonymous} onChange={e=>setForm(f=>({...f,is_anonymous:e.target.checked}))}/>
                <label htmlFor="anon-s">Post anonymously</label>
              </div>
              {!form.is_anonymous && (
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input className="form-input" value={form.author_name} onChange={e=>setForm(f=>({...f,author_name:e.target.value}))}/>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-saffron" disabled={submitting}>{submitting?'Sharing…':'Share Story'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
