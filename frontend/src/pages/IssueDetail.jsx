import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { issuesAPI, aiAPI } from '../utils/api'
import { ArrowLeft, ThumbsUp, MapPin, Send, GitCompare, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import './IssueDetail.css'

const STATUS_OPTIONS = ['Reported','Under Review','In Progress','Resolved','Rejected','Duplicate']
const STATUS_CLS     = { Reported:'badge-amber','Under Review':'badge-purple','In Progress':'badge-blue',Resolved:'badge-green',Rejected:'badge-red',Duplicate:'badge-red' }
const LANG_NAMES     = { hi:'Hindi', te:'Telugu', ta:'Tamil', en:'English' }

export default function IssueDetail() {
  const { id }   = useParams()
  const [issue, setIssue]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setCmt]     = useState('')
  const [anonCmt, setAnon]    = useState(true)
  const [author, setAuthor]   = useState('')
  const [sending, setSending] = useState(false)
  const [upvoteErr, setUpErr] = useState('')
  const [showBefore, setShowBefore] = useState(false)
  const [translation, setTrans]     = useState('')
  const [translating, setTranslating] = useState(false)
  const [targetLang, setTgt]         = useState('hi')
  const [transErr, setTransErr]      = useState('')
  const [statusNote, setSNote]       = useState('')
  const [showStatusPanel, setShowSP] = useState(false)
  const [duplicates, setDups]        = useState([])

  useEffect(() => { fetchIssue() }, [id])

  async function fetchIssue() {
    setLoading(true)
    try { const r = await issuesAPI.getOne(id); setIssue(r.data) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!issue) return
    aiAPI.findDuplicates({ title:issue.title, description:issue.description, category:issue.category })
      .then(r => setDups((r.data.duplicates||[]).filter(d => d.id !== parseInt(id))))
      .catch(() => {})
  }, [issue?.id])

  async function handleUpvote() {
    setUpErr('')
    try {
      const r = await issuesAPI.upvote(id)
      setIssue(i => ({...i, upvotes:r.data.upvotes, priority:r.data.priority}))
    } catch (ex) {
      setUpErr(ex.response?.status===409 ? 'You have already upvoted this issue.' : 'Upvote failed.')
    }
  }

  async function handleComment(e) {
    e.preventDefault(); if (!comment.trim()) return
    setSending(true)
    try {
      await issuesAPI.comment(id, { content:comment, is_anonymous:anonCmt, author_name:author })
      setCmt(''); fetchIssue()
    } finally { setSending(false) }
  }

  async function handleStatus(s) {
    try {
      await issuesAPI.updateStatus(id, { status:s, authority_note:statusNote })
      setShowSP(false); setSNote(''); fetchIssue()
    } catch {}
  }

  async function handleTranslate() {
    setTranslating(true); setTrans(''); setTransErr('')
    try {
      const r = await aiAPI.translate({ text:`${issue.title}. ${issue.description}`, target:targetLang })
      if (r.data.success === false) setTransErr(r.data.message || 'Translation unavailable.')
      else setTrans(r.data.translated)
    } catch { setTransErr('Translation failed.') }
    finally { setTranslating(false) }
  }

  if (loading) return <div className="loading-text" style={{padding:'40px 0'}}>Loading issue…</div>
  if (!issue)  return <div className="empty-state"><h3>Issue not found</h3></div>

  const pct  = Math.min((issue.upvotes / 10) * 100, 100)
  const pct2 = Math.min((issue.upvotes / 25) * 100, 100)

  return (
    <div className="issue-detail">
      <Link to="/issues" className="back-link"><ArrowLeft size={15}/> Back to Issues</Link>

      <div className="idetail-main card">
        {/* Photos */}
        {issue.image_url && (
          <div>
            {issue.image_url_2 ? (
              <>
                <div className="photo-tabs">
                  <button className={`photo-tab ${!showBefore?'photo-tab--active':''}`} onClick={() => setShowBefore(false)}>
                    <GitCompare size={13}/> Before (Reported)
                  </button>
                  <button className={`photo-tab ${showBefore?'photo-tab--active':''}`} onClick={() => setShowBefore(true)}>
                    After (Progress)
                  </button>
                </div>
                <img src={showBefore ? issue.image_url_2 : issue.image_url} alt="" className="detail-img"/>
              </>
            ) : (
              <img src={issue.image_url} alt="" className="detail-img"/>
            )}
          </div>
        )}

        <div className="detail-body">
          <div className="detail-tags">
            <span className={`badge ${STATUS_CLS[issue.status]||'badge-navy'}`}>{issue.status}</span>
            {issue.priority!=='Normal' && <span className="badge badge-red">{issue.priority==='Critical'?'🚨':'🔥'} {issue.priority}</span>}
            <span className="badge badge-navy">{issue.category}</span>
            {issue.subcategory && <span className="badge badge-navy">{issue.subcategory}</span>}
          </div>

          <h1 className="detail-title">{issue.title}</h1>
          <p className="detail-desc">{issue.description}</p>

          <div className="detail-meta">
            {issue.location_text && <span><MapPin size={13}/> {issue.location_text}</span>}
            {issue.latitude && <span>📍 {Number(issue.latitude).toFixed(4)}, {Number(issue.longitude).toFixed(4)}</span>}
            {issue.ward    && <span>🏘️ Ward: {issue.ward}</span>}
            {issue.pincode && <span>📮 {issue.pincode}</span>}
            <span>👤 {issue.reporter_name}</span>
            <span>🗓️ {new Date(issue.created_at).toLocaleDateString('en-IN')}</span>
            <span>👁️ {issue.views} views · 🏛️ {issue.assigned_to}</span>
          </div>

          {issue.authority_note && (
            <div className="authority-note">💬 Authority note: <em>{issue.authority_note}</em></div>
          )}
          {issue.resolved_at && (
            <div className="resolved-banner">✅ Resolved on {new Date(issue.resolved_at).toLocaleDateString('en-IN')}</div>
          )}

          {/* Upvote */}
          <div className="detail-actions">
            <button className="btn btn-primary btn-sm" onClick={handleUpvote}>
              <ThumbsUp size={14}/> Upvote ({issue.upvotes})
            </button>
            <span style={{fontSize:'.8rem',color:'var(--muted)'}}>
              {issue.upvotes>=25 ? '🚨 Critical — escalated!'
                : issue.upvotes>=10 ? '🔥 High Priority — escalated!'
                : `${10-issue.upvotes} more to escalate`}
            </span>
          </div>
          {upvoteErr && <p style={{color:'var(--red)',fontSize:'.8rem'}}>{upvoteErr}</p>}

          <div className="escalation-track">
            <div className="escalation-fill" style={{width:`${pct}%`}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.68rem',color:'var(--muted)'}}>
            <span>0</span><span style={{color:'var(--amber)'}}>10 → High Priority</span><span style={{color:'var(--red)'}}>25 → Critical</span>
          </div>

          {/* Translate */}
          <div className="translate-box">
            <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              <Sparkles size={13} color="var(--blue)"/>
              <span style={{fontSize:'.82rem',fontWeight:600,color:'var(--navy)'}}>Translate to</span>
              <select className="form-input" style={{width:110,padding:'4px 8px',fontSize:'.8rem'}}
                value={targetLang} onChange={e => setTgt(e.target.value)}>
                {Object.entries(LANG_NAMES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button className="btn btn-ghost btn-sm" onClick={handleTranslate} disabled={translating}>
                {translating ? 'Translating…' : 'Translate'}
              </button>
            </div>
            {transErr && <p style={{fontSize:'.78rem',color:'var(--amber)',marginTop:6}}>{transErr}</p>}
            {translation && (
              <div className="translation-result">
                <strong>{LANG_NAMES[targetLang]}:</strong> {translation}
              </div>
            )}
          </div>

          {/* Similar issues */}
          {duplicates.length > 0 && (
            <div className="similar-box">
              <h4>🔍 Similar Issues Already Reported</h4>
              {duplicates.slice(0,3).map(d => (
                <Link key={d.id} to={`/issues/${d.id}`} className="similar-item">
                  <span>{d.title}</span>
                  <span style={{fontSize:'.72rem',color:'var(--muted)'}}>{d.status} · {d.upvotes} upvotes · {Math.round(d.similarity*100)}% match</span>
                </Link>
              ))}
            </div>
          )}

          {/* Authority panel */}
          <div className="authority-panel">
            <button className="authority-toggle" onClick={() => setShowStatusPanel(v => !v)}>
              🏛️ Authority Status Update {showStatusPanel ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
            {showStatusPanel && (
              <div className="authority-body">
                <div className="form-group">
                  <label className="form-label">Note (optional)</label>
                  <input className="form-input" value={statusNote} onChange={e=>setSNote(e.target.value)} placeholder="Explain the status change…"/>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
                  {STATUS_OPTIONS.map(s => (
                    <button key={s}
                      className={`btn btn-sm ${issue.status===s?'btn-primary':'btn-ghost'}`}
                      onClick={() => handleStatus(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comments */}
      <div className="comments card">
        <h2 style={{fontSize:'.95rem',color:'var(--navy)',marginBottom:12}}>
          Comments ({issue.comments?.length ?? 0})
        </h2>
        {issue.comments?.length === 0 && (
          <p style={{fontSize:'.85rem',color:'var(--muted)'}}>No comments yet. Add one to validate this issue.</p>
        )}
        {issue.comments?.map(c => (
          <div key={c.id} className={`comment-item ${c.is_authority?'comment-item--auth':''}`}>
            <div className="comment-header">
              <span className="comment-author">{c.author_name}</span>
              {c.is_authority && <span className="badge badge-blue">🏛️ Authority</span>}
              <span className="comment-time">{new Date(c.created_at).toLocaleString('en-IN')}</span>
            </div>
            <p className="comment-text">{c.content}</p>
          </div>
        ))}
        <form onSubmit={handleComment} className="comment-form">
          <textarea className="form-input" rows={2} required
            placeholder="Add a comment to validate or share more information…"
            value={comment} onChange={e=>setCmt(e.target.value)}/>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <label className="anon-toggle">
              <input type="checkbox" checked={anonCmt} onChange={e=>setAnon(e.target.checked)}/> Anonymous
            </label>
            {!anonCmt && (
              <input className="form-input" style={{maxWidth:160,padding:'6px 10px'}}
                placeholder="Your name" value={author} onChange={e=>setAuthor(e.target.value)}/>
            )}
            <button className="btn btn-primary btn-sm" type="submit" disabled={sending} style={{marginLeft:'auto'}}>
              <Send size={13}/>{sending?'Posting…':'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
