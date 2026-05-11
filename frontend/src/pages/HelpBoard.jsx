import { useEffect, useState } from 'react'
import { helpAPI } from '../utils/api'
import { HandHeart, Plus, X, MapPin, CheckCircle, Phone } from 'lucide-react'
import './HelpBoard.css'

const CAT_EMOJI = { Food:'🍚', Water:'💧', Medical:'🏥', Shelter:'🏠', Transport:'🚗', 'Mental Support':'💙', Other:'🤝' }
const URG_CLS   = { Critical:'badge-red', Urgent:'badge-amber', Normal:'badge-blue', Low:'badge-navy' }

export default function HelpBoard() {
  const [requests, setRequests]   = useState([])
  const [cats, setCats]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [showForm, setShowForm]   = useState(false)
  const [formType, setFormType]   = useState('need')
  const [submitting, setSub]      = useState(false)
  const [form, setForm] = useState({
    title:'', category:'', description:'', quantity:'',
    urgency:'Normal', contact_method:'phone', contact_info:'',
    location_text:'', latitude:'', longitude:'',
    is_anonymous:true, name:''
  })

  useEffect(() => {
    fetchRequests()
    helpAPI.categories().then(r => setCats(r.data || []))
  }, [filter])

  async function fetchRequests() {
    setLoading(true)
    try {
      const params = {}
      if (filter !== 'all') params.type = filter
      const r = await helpAPI.getAll(params)
      setRequests(Array.isArray(r.data) ? r.data : (r.data.items || []))
    } finally { setLoading(false) }
  }

  async function handleSubmit(e) {
    e.preventDefault(); setSub(true)
    try {
      await helpAPI.create({ ...form, request_type: formType })
      setShowForm(false)
      setForm({title:'',category:'',description:'',quantity:'',urgency:'Normal',contact_method:'phone',contact_info:'',location_text:'',latitude:'',longitude:'',is_anonymous:true,name:''})
      fetchRequests()
    } catch (ex) {
      alert(ex.response?.data?.error || 'Failed to post.')
    } finally { setSub(false) }
  }

  async function handleFulfill(id) {
    await helpAPI.fulfill(id)
    setRequests(r => r.filter(x => x.id !== id))
  }

  function useGPS() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      p => setForm(f => ({...f, latitude:p.coords.latitude, longitude:p.coords.longitude})),
      () => {}
    )
  }

  const needs  = requests.filter(r => r.request_type === 'need')
  const offers = requests.filter(r => r.request_type === 'offer')
  const shown  = filter === 'need' ? needs : filter === 'offer' ? offers : requests

  return (
    <div className="help-page">
      <h1 className="page-title">Community Help</h1>
      <p className="page-sub">Request help or offer support to people in need near you.</p>

      {/* CTA */}
      <div className="help-cta">
        <button className="cta-need" onClick={()=>{setFormType('need');setShowForm(true)}}>
          🆘 I NEED HELP
        </button>
        <button className="cta-offer" onClick={()=>{setFormType('offer');setShowForm(true)}}>
          <HandHeart size={18}/> I CAN HELP
        </button>
      </div>

      {/* Stats */}
      <div className="help-stats">
        <div className="help-stat help-stat--red"><strong>{needs.length}</strong><span>Open Needs</span></div>
        <div className="help-stat help-stat--green"><strong>{offers.length}</strong><span>Available Offers</span></div>
      </div>

      {/* Filter tabs */}
      <div className="tabs">
        {[['all','All'],['need','🆘 Needs'],['offer','🤝 Offers']].map(([v,l])=>(
          <button key={v} className={`tab ${filter===v?'tab--active':''}`} onClick={()=>setFilter(v)}>{l}</button>
        ))}
      </div>

      {/* Cards */}
      {loading ? <p className="loading-text">Loading…</p>
        : shown.length === 0 ? (
          <div className="empty-state"><h3>Nothing here yet</h3><p>Be the first to post a need or offer.</p></div>
        ) : (
          <div className="grid-2">
            {shown.map(r => (
              <div key={r.id} className={`help-card card help-card--${r.request_type}`}>
                <div className="help-card__top">
                  <span style={{fontSize:'1.9rem',flexShrink:0}}>{CAT_EMOJI[r.category]||'🤝'}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:5}}>
                      <span className={`badge ${r.request_type==='need'?'badge-red':'badge-green'}`}>
                        {r.request_type==='need'?'🆘 NEED':'🤝 OFFER'}
                      </span>
                      <span className="badge badge-navy">{r.category}</span>
                      {r.urgency && r.urgency!=='Normal' && (
                        <span className={`badge ${URG_CLS[r.urgency]||'badge-navy'}`}>{r.urgency}</span>
                      )}
                    </div>
                    {r.title && <p style={{fontWeight:700,fontSize:'.88rem',color:'var(--navy)',marginBottom:3}}>{r.title}</p>}
                    <p style={{fontSize:'.82rem',color:'var(--muted)',lineHeight:1.55}}>{r.description}</p>
                    {r.quantity && <p style={{fontSize:'.75rem',color:'var(--text)',marginTop:3}}>Qty: {r.quantity}</p>}
                    <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:7,fontSize:'.73rem',color:'var(--muted)'}}>
                      {r.location_text && <span><MapPin size={10}/> {r.location_text}</span>}
                      {r.distance_km    && <span>📍 {r.distance_km} km away</span>}
                      <span>👤 {r.name}</span>
                    </div>
                    {r.contact_info && (
                      <a href={`tel:${r.contact_info}`} className="help-contact">
                        <Phone size={12}/> {r.contact_info}
                        {r.contact_method === 'whatsapp' && ' (WhatsApp)'}
                      </a>
                    )}
                  </div>
                </div>
                <div className="help-card__foot">
                  <span style={{fontSize:'.72rem',color:'var(--muted)'}}>{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                  <button className="btn btn-ghost btn-sm" onClick={()=>handleFulfill(r.id)}>
                    <CheckCircle size={12}/> Mark Fulfilled
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal card" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2>{formType==='need'?'🆘 I Need Help':'🤝 I Can Offer Help'}</h2>
              <button className="modal-close" onClick={()=>setShowForm(false)}><X size={18}/></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  placeholder={formType==='need'?'What do you need?':'What can you offer?'}/>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select className="form-input" required value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                    <option value="">Select…</option>
                    {cats.map(c=><option key={c} value={c}>{CAT_EMOJI[c]} {c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency</label>
                  <select className="form-input" value={form.urgency} onChange={e=>setForm(f=>({...f,urgency:e.target.value}))}>
                    {['Low','Normal','Urgent','Critical'].map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description *</label>
                <textarea className="form-input" rows={3} required
                  value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  placeholder={formType==='need'?'Describe what you need and how urgent it is…':'Describe what you can provide…'}/>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" value={form.quantity} onChange={e=>setForm(f=>({...f,quantity:e.target.value}))}
                    placeholder="e.g. 5 kg, 2 people"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Method</label>
                  <select className="form-input" value={form.contact_method} onChange={e=>setForm(f=>({...f,contact_method:e.target.value}))}>
                    {['phone','whatsapp','in-person'].map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Contact Info</label>
                <input className="form-input" value={form.contact_info} onChange={e=>setForm(f=>({...f,contact_info:e.target.value}))}
                  placeholder="Phone number or how to reach you"/>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <div className="location-row">
                  <input className="form-input" value={form.location_text} onChange={e=>setForm(f=>({...f,location_text:e.target.value}))}
                    placeholder="Area or landmark"/>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={useGPS}><MapPin size={13}/>GPS</button>
                </div>
              </div>
              <div className="anon-toggle">
                <input type="checkbox" id="anon-h" checked={form.is_anonymous} onChange={e=>setForm(f=>({...f,is_anonymous:e.target.checked}))}/>
                <label htmlFor="anon-h">Post anonymously</label>
              </div>
              {!form.is_anonymous && (
                <div className="form-group">
                  <label className="form-label">Your Name</label>
                  <input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Your name"/>
                </div>
              )}
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={()=>setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting?'Posting…':'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
