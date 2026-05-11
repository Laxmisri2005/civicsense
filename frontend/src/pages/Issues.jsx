import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { issuesAPI, aiAPI } from '../utils/api'
import { MapPin, ThumbsUp, MessageSquare, Plus, X, Filter, Upload, ChevronLeft, ChevronRight, Search, Sparkles } from 'lucide-react'
import './Issues.css'

const STATUS_OPTIONS  = ['','Reported','Under Review','In Progress','Resolved','Rejected']
const PRIORITY_OPTIONS= ['','Normal','High Priority','Critical']
const SORT_OPTIONS    = [{v:'newest',l:'Newest'},{v:'upvotes',l:'Most Upvoted'},{v:'views',l:'Most Viewed'}]
const STATUS_CLS      = { Reported:'badge-amber','Under Review':'badge-purple','In Progress':'badge-blue',Resolved:'badge-green',Rejected:'badge-red' }

export default function Issues() {
  const [issues, setIssues]     = useState([])
  const [cats, setCats]         = useState({})
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSub]    = useState(false)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [pages, setPages]       = useState(1)
  const [filters, setFilters]   = useState({ status:'',category:'',priority:'',sort:'newest',search:'' })
  const [searchQ, setSearchQ]   = useState('')
  const [aiSug, setAiSug]       = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [form, setForm] = useState({
    title:'',description:'',category:'',subcategory:'',
    location_text:'',latitude:'',longitude:'',ward:'',pincode:'',
    is_anonymous:true,reporter_name:'',image:null,image2:null
  })

  useEffect(() => { issuesAPI.categories().then(r => setCats(r.data || {})) }, [])

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    try {
      const p = { page, per_page:12, sort:filters.sort }
      if (filters.status)   p.status   = filters.status
      if (filters.category) p.category = filters.category
      if (filters.priority) p.priority = filters.priority
      if (filters.search)   p.search   = filters.search
      const r = await issuesAPI.getAll(p)
      setIssues(r.data?.items  ?? [])
      setTotal( r.data?.total  ?? 0)
      setPages( r.data?.pages  ?? 1)
    } catch { setIssues([]); setTotal(0); setPages(1)
    } finally { setLoading(false) }
  }, [page, filters])

  useEffect(() => { fetchIssues() }, [fetchIssues])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setFilters(f => ({...f,search:searchQ})); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchQ])

  async function handleUpvote(e, id) {
    e.preventDefault(); e.stopPropagation()
    try {
      const r = await issuesAPI.upvote(id)
      setIssues(prev => prev.map(i => i.id===id ? {...i,upvotes:r.data.upvotes,priority:r.data.priority} : i))
    } catch (ex) {
      if (ex.response?.status===409) alert('You have already upvoted this issue.')
    }
  }

  async function handleAI() {
    if (!form.title && !form.description) return
    setAiLoading(true); setAiSug(null)
    try {
      const r = await aiAPI.categorize({ title:form.title, description:form.description })
      setAiSug(r.data)
    } catch {} finally { setAiLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSub(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k,v]) => {
        if (k==='image' && v) fd.append('image', v)
        else if (k==='image2' && v) fd.append('image2', v)
        else if (v!==null && v!=='') fd.append(k, v)
      })
      await issuesAPI.create(fd)
      setShowForm(false)
      setForm({title:'',description:'',category:'',subcategory:'',location_text:'',latitude:'',longitude:'',ward:'',pincode:'',is_anonymous:true,reporter_name:'',image:null,image2:null})
      setAiSug(null); setPage(1); fetchIssues()
    } catch (ex) {
      alert(ex.response?.data?.errors?.join(', ') || ex.response?.data?.error || 'Failed to submit.')
    } finally { setSub(false) }
  }

  function useGPS() {
    if (!navigator.geolocation) return alert('Geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      pos => setForm(f => ({...f,latitude:pos.coords.latitude,longitude:pos.coords.longitude})),
      ()  => alert('Could not get location')
    )
  }

  const setF = (k,v) => { setFilters(f => ({...f,[k]:v})); setPage(1) }
  const subcats = cats[form.category] || []

  return (
    <div className="issues-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Civic Issues</h1>
          <p className="page-sub">{loading ? 'Loading…' : `${total} issues reported`}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15}/> Report Issue
        </button>
      </div>

      {/* Toolbar */}
      <div className="issues-toolbar">
        <div className="search-inline">
          <Search size={14} color="var(--muted)"/>
          <input className="form-input" placeholder="Search issues…" value={searchQ}
            onChange={e => setSearchQ(e.target.value)} style={{border:'none',background:'none',boxShadow:'none'}}/>
        </div>
        <div className="filters-bar card">
          <Filter size={13} color="var(--muted)"/>
          <select className="form-input filter-sel" value={filters.status}   onChange={e=>setF('status',e.target.value)}>
            {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s||'All Statuses'}</option>)}
          </select>
          <select className="form-input filter-sel" value={filters.category} onChange={e=>setF('category',e.target.value)}>
            <option value="">All Categories</option>
            {Object.keys(cats).map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <select className="form-input filter-sel" value={filters.priority} onChange={e=>setF('priority',e.target.value)}>
            {PRIORITY_OPTIONS.map(p=><option key={p} value={p}>{p||'All Priorities'}</option>)}
          </select>
          <select className="form-input filter-sel" value={filters.sort}     onChange={e=>setF('sort',e.target.value)}>
            {SORT_OPTIONS.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid-2">{[1,2,3,4,5,6].map(i=><div key={i} className="skeleton"/>)}</div>
      ) : issues.length===0 ? (
        <div className="empty-state">
          <h3>No issues found</h3>
          <p>Adjust filters or be the first to report a civic issue.</p>
        </div>
      ) : (
        <>
          <div className="grid-2">
            {issues.map(issue => (
              <Link to={`/issues/${issue.id}`} key={issue.id} className="issue-card card">
                {issue.image_url && <img src={issue.image_url} alt="" className="issue-card__img"/>}
                <div className="issue-card__body">
                  <div className="issue-card__tags">
                    <span className={`badge ${STATUS_CLS[issue.status]||'badge-navy'}`}>{issue.status}</span>
                    {issue.priority!=='Normal' && (
                      <span className="badge badge-red">{issue.priority==='Critical'?'🚨':'🔥'} {issue.priority}</span>
                    )}
                    <span className="badge badge-navy">{issue.category}</span>
                  </div>
                  <h3 className="issue-card__title">{issue.title}</h3>
                  <p className="issue-card__desc">
                    {issue.description.length>115 ? issue.description.slice(0,115)+'…' : issue.description}
                  </p>
                  <div className="issue-card__foot">
                    <span className="issue-card__loc"><MapPin size={11}/>{issue.location_text||'No location'}</span>
                    <div className="issue-card__actions">
                      <button className="act-btn" onClick={e=>handleUpvote(e,issue.id)}>
                        <ThumbsUp size={13}/>{issue.upvotes}
                      </button>
                      <span className="act-btn"><MessageSquare size={13}/>{issue.comment_count}</span>
                    </div>
                  </div>
                  <p className="issue-card__meta">By <strong>{issue.reporter_name}</strong> · {new Date(issue.created_at).toLocaleDateString('en-IN')}</p>
                </div>
              </Link>
            ))}
          </div>
          {pages>1 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft size={15}/>Prev</button>
              <span>Page {page} of {pages} · {total} total</span>
              <button className="btn btn-ghost btn-sm" disabled={page>=pages} onClick={()=>setPage(p=>p+1)}>Next<ChevronRight size={15}/></button>
            </div>
          )}
        </>
      )}

      {/* Report Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report a Civic Issue</h2>
              <button className="modal-close" onClick={()=>setShowForm(false)}><X size={19}/></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" required maxLength={200}
                  placeholder="e.g. Large pothole near bus stop on MG Road"
                  value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
              </div>

              {/* AI Suggest */}
              <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={handleAI}
                  disabled={aiLoading||(!form.title&&!form.description)}>
                  <Sparkles size={13}/>{aiLoading?'Analysing…':'AI Suggest Category'}
                </button>
                {aiSug && (
                  <div style={{display:'flex',alignItems:'center',gap:8,background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,padding:'5px 11px',fontSize:'.8rem',color:'#1e40af',flexWrap:'wrap'}}>
                    <span>Suggested: <strong>{aiSug.suggested_category}</strong> ({Math.round(aiSug.confidence*100)}%)</span>
                    <button type="button" className="btn btn-saffron btn-sm" style={{padding:'3px 9px',fontSize:'.74rem'}}
                      onClick={()=>{setForm(f=>({...f,category:aiSug.suggested_category,subcategory:''}));setAiSug(null)}}>Apply</button>
                    <button type="button" className="btn btn-ghost btn-sm" style={{padding:'3px 9px',fontSize:'.74rem'}}
                      onClick={()=>setAiSug(null)}>✕</button>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-input" required value={form.category}
                    onChange={e=>setForm(f=>({...f,category:e.target.value,subcategory:''}))}>
                    <option value="">Select…</option>
                    {Object.keys(cats).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {subcats.length>0 && (
                  <div className="form-group">
                    <label className="form-label">Sub-type</label>
                    <select className="form-input" value={form.subcategory}
                      onChange={e=>setForm(f=>({...f,subcategory:e.target.value}))}>
                      <option value="">Select…</option>
                      {subcats.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-input" rows={3} required
                  placeholder="Describe the issue clearly — severity, duration, and impact."
                  value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <div className="location-row">
                  <input className="form-input" placeholder="Street / area / landmark"
                    value={form.location_text} onChange={e=>setForm(f=>({...f,location_text:e.target.value}))}/>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={useGPS}><MapPin size={13}/>GPS</button>
                </div>
                {form.latitude && <span className="form-hint" style={{color:'var(--green)'}}>📍 {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}</span>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ward</label>
                  <input className="form-input" placeholder="e.g. Ward 12"
                    value={form.ward} onChange={e=>setForm(f=>({...f,ward:e.target.value}))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">PIN Code</label>
                  <input className="form-input" placeholder="e.g. 533001" maxLength={6}
                    value={form.pincode} onChange={e=>setForm(f=>({...f,pincode:e.target.value}))}/>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Photo 1</label>
                  <label className="upload-btn">
                    <Upload size={13}/>{form.image?form.image.name:'Choose file'}
                    <input type="file" accept="image/*" style={{display:'none'}}
                      onChange={e=>setForm(f=>({...f,image:e.target.files[0]}))}/>
                  </label>
                </div>
                <div className="form-group">
                  <label className="form-label">Photo 2</label>
                  <label className="upload-btn">
                    <Upload size={13}/>{form.image2?form.image2.name:'Choose file'}
                    <input type="file" accept="image/*" style={{display:'none'}}
                      onChange={e=>setForm(f=>({...f,image2:e.target.files[0]}))}/>
                  </label>
                </div>
              </div>

              <div className="anon-toggle">
                <input type="checkbox" id="anon" checked={form.is_anonymous}
                  onChange={e=>setForm(f=>({...f,is_anonymous:e.target.checked}))}/>
                <label htmlFor="anon">Post anonymously</label>
              </div>
              {!form.is_anonymous && (
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input className="form-input" placeholder="Your name"
                    value={form.reporter_name} onChange={e=>setForm(f=>({...f,reporter_name:e.target.value}))}/>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting?'Submitting…':'Submit Issue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
