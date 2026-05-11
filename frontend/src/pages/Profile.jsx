import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI, issuesAPI } from '../utils/api'
import { ShieldCheck, Edit2, Key, LogOut, Building2, CheckCircle, Mail, MapPin, ThumbsUp, FileText } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import './Profile.css'

// Inline email verification widget
function VerifyWidget({ onVerified }) {
  const [otp,setOtp]       = useState('')
  const [sending,setSending]= useState(false)
  const [verifying,setVer] = useState(false)
  const [msg,setMsg]       = useState('')
  const [err,setErr]       = useState('')
  const [done,setDone]     = useState(false)
  const { user }           = useAuth()

  async function resend() {
    setSending(true); setMsg(''); setErr('')
    try { const r=await authAPI.resendVerification(); setMsg(r.data.message) }
    catch(ex){ setErr(ex.response?.data?.error||'Failed to send OTP.') }
    finally{ setSending(false) }
  }

  async function verify(e) {
    e.preventDefault(); setVer(true); setErr('')
    try {
      const r = await authAPI.verifyEmail({ otp })
      setMsg(r.data.message); setDone(true)
      if (onVerified) onVerified()
    } catch(ex){ setErr(ex.response?.data?.error||'Invalid OTP.') }
    finally{ setVer(false) }
  }

  if (done) return (
    <div className="verify-done">
      <CheckCircle size={32} color="var(--green)"/>
      <h3>Email Verified! +10 Reputation</h3>
      <p>Your account is now verified.</p>
    </div>
  )

  return (
    <div className="verify-widget">
      <Mail size={26} color="var(--navy)"/>
      <h3>Verify your Email</h3>
      <p>We sent a 6-digit OTP to <strong>{user?.email}</strong>.</p>
      {msg && <div className="profile-success">{msg}</div>}
      {err && <div className="profile-error">{err}</div>}
      <form onSubmit={verify} style={{display:'flex',gap:8,width:'100%',flexWrap:'wrap'}}>
        <input className="form-input" style={{flex:1,letterSpacing:'.25em',textAlign:'center',fontWeight:700,fontSize:'1.1rem'}}
          maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))} placeholder="6-digit OTP" required/>
        <button type="submit" className="btn btn-primary" disabled={verifying||otp.length<6}>
          {verifying?'Verifying…':'Verify'}
        </button>
      </form>
      <button className="btn btn-ghost btn-sm" onClick={resend} disabled={sending}>
        {sending?'Sending…':'Resend OTP'}
      </button>
    </div>
  )
}

export default function Profile() {
  const { user, logout }  = useAuth()
  const navigate          = useNavigate()
  const [tab, setTab]     = useState('profile')
  const [verified, setVerified] = useState(user?.is_verified)

  const [pForm, setPForm] = useState({ full_name:user?.full_name||'', bio:user?.bio||'', phone:user?.phone||'', city:user?.city||'', state:user?.state||'' })
  const [pwdForm,setPwd]  = useState({ current_password:'',new_password:'',confirm:'' })
  const [ngoForm,setNgo]  = useState({ org_name:'',reg_no:'',website:'' })

  const [pMsg,setPMsg]    = useState('')
  const [pwdMsg,setPwdMsg]= useState('')
  const [ngoMsg,setNgoMsg]= useState('')
  const [pErr,setPErr]    = useState('')
  const [pwdErr,setPwdErr]= useState('')
  const [ngoErr,setNgoErr]= useState('')
  const [saving,setSaving]= useState(false)

  const ROLE = { citizen:'🏘️ Citizen', authority:'🏛️ Authority', admin:'⚙️ Admin' }

  async function saveProfile(e) {
    e.preventDefault(); setSaving(true); setPErr(''); setPMsg('')
    try { await authAPI.updateProfile(pForm); setPMsg('Profile updated!') }
    catch(ex){ setPErr(ex.response?.data?.error||'Update failed') }
    finally{ setSaving(false) }
  }

  async function savePwd(e) {
    e.preventDefault(); setPwdErr(''); setPwdMsg('')
    if (pwdForm.new_password!==pwdForm.confirm) return setPwdErr("Passwords don't match")
    setSaving(true)
    try {
      await authAPI.updateProfile({ current_password:pwdForm.current_password, new_password:pwdForm.new_password })
      setPwdMsg('Password updated!'); setPwd({current_password:'',new_password:'',confirm:''})
    } catch(ex){ setPwdErr(ex.response?.data?.error||'Failed') }
    finally{ setSaving(false) }
  }

  async function saveNgo(e) {
    e.preventDefault(); setNgoErr(''); setNgoMsg(''); setSaving(true)
    try { const r=await authAPI.requestNGOBadge(ngoForm); setNgoMsg(r.data.message) }
    catch(ex){ setNgoErr(ex.response?.data?.error||'Failed') }
    finally{ setSaving(false) }
  }

  async function handleLogout() { await logout(); navigate('/login') }

  const TABS = [
    { key:'profile',  label:'👤 Profile'    },
    { key:'myissues', label:'📍 My Issues'  },
    { key:'security', label:'🔐 Security'   },
    { key:'verify',   label: verified ? '✅ Verified' : '📧 Verify Email', disabled: verified },
    { key:'ngo',      label:'🏢 NGO Badge'  },
  ]

  // My Issues state
  const [myIssues,   setMyIssues]   = useState([])
  const [issLoading, setIssLoading] = useState(false)
  const [issFilter,  setIssFilter]  = useState('')

  useEffect(() => {
    if (tab !== 'myissues') return
    setIssLoading(true)
    issuesAPI.myIssues({ status: issFilter })
      .then(r => setMyIssues(r.data?.items ?? []))
      .catch(() => setMyIssues([]))
      .finally(() => setIssLoading(false))
  }, [tab, issFilter])

  const STATUS_CLS = {
    Reported: 'badge-amber', 'Under Review': 'badge-purple',
    'In Progress': 'badge-blue', Resolved: 'badge-green', Rejected: 'badge-red',
  }

  return (
    <div className="profile-page">
      <h1 className="page-title">My Profile</h1>

      <div className="profile-hero card">
        <div className="profile-avatar">{user?.username?.[0]?.toUpperCase()??'U'}</div>
        <div className="profile-info">
          <h2>{user?.full_name||user?.username}{verified&&<span className="verified-chip ml">✅ Verified</span>}</h2>
          <p style={{fontSize:'.85rem',color:'var(--muted)'}}>@{user?.username} · {user?.email}</p>
          <div className="profile-stats">
            <div><strong>{user?.issues_reported??0}</strong><span>Issues</span></div>
            <div><strong>{user?.helps_given??0}</strong><span>Helps</span></div>
            <div><strong>{user?.reputation_score??0}</strong><span>Rep</span></div>
          </div>
        </div>
        <button className="btn btn-danger btn-sm profile-logout" onClick={handleLogout}>
          <LogOut size={14}/> Sign Out
        </button>
      </div>

      <div className="tabs">
        {TABS.map(t=>(
          <button key={t.key}
            className={`tab ${tab===t.key?'tab--active':''} ${t.disabled?'tab--disabled':''}`}
            onClick={()=>!t.disabled&&setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab==='profile' && (
        <div className="card profile-section">
          <h3><Edit2 size={15}/> Edit Profile</h3>
          {pMsg && <div className="profile-success">{pMsg}</div>}
          {pErr && <div className="profile-error">{pErr}</div>}
          <form onSubmit={saveProfile} className="profile-form">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Full Name</label>
                <input className="form-input" value={pForm.full_name} onChange={e=>setPForm(f=>({...f,full_name:e.target.value}))} placeholder="Your full name"/></div>
              <div className="form-group"><label className="form-label">Phone</label>
                <input className="form-input" value={pForm.phone} onChange={e=>setPForm(f=>({...f,phone:e.target.value}))} placeholder="+91 98765 43210"/></div>
            </div>
            <div className="form-group"><label className="form-label">Bio</label>
              <textarea className="form-input" rows={2} value={pForm.bio} onChange={e=>setPForm(f=>({...f,bio:e.target.value}))} placeholder="Tell your community about yourself…"/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">City</label>
                <input className="form-input" value={pForm.city} onChange={e=>setPForm(f=>({...f,city:e.target.value}))} placeholder="Visakhapatnam"/></div>
              <div className="form-group"><label className="form-label">State</label>
                <input className="form-input" value={pForm.state} onChange={e=>setPForm(f=>({...f,state:e.target.value}))} placeholder="Andhra Pradesh"/></div>
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving?'Saving…':'Save Profile'}</button>
          </form>
        </div>
      )}

      {tab==='security' && (
        <div className="card profile-section">
          <h3><Key size={15}/> Change Password</h3>
          {pwdMsg && <div className="profile-success">{pwdMsg}</div>}
          {pwdErr && <div className="profile-error">{pwdErr}</div>}
          <form onSubmit={savePwd} className="profile-form">
            {['current_password','new_password','confirm'].map((k,i)=>(
              <div key={k} className="form-group">
                <label className="form-label">{['Current Password','New Password','Confirm New Password'][i]}</label>
                <input className="form-input" type="password" required={i<2} minLength={i>0?6:undefined}
                  value={pwdForm[k]} onChange={e=>setPwd(f=>({...f,[k]:e.target.value}))}/>
              </div>
            ))}
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving?'Updating…':'Update Password'}</button>
          </form>
        </div>
      )}

      {tab==='verify' && (
        <div className="card profile-section">
          <VerifyWidget onVerified={()=>setVerified(true)}/>
        </div>
      )}

      {tab==='ngo' && (
        <div className="card profile-section">
          <h3><Building2 size={15}/> Request NGO Badge</h3>
          <p style={{fontSize:'.83rem',color:'var(--muted)',lineHeight:1.6}}>Representing an NGO, RWA, or civic organisation? Get a verified badge.</p>
          {ngoMsg && <div className="profile-success">{ngoMsg}</div>}
          {ngoErr && <div className="profile-error">{ngoErr}</div>}
          <form onSubmit={saveNgo} className="profile-form">
            <div className="form-group"><label className="form-label">Organisation Name *</label>
              <input className="form-input" required value={ngoForm.org_name} onChange={e=>setNgo(f=>({...f,org_name:e.target.value}))} placeholder="e.g. Vizag Citizens Forum"/></div>
            <div className="form-group"><label className="form-label">Registration Number *</label>
              <input className="form-input" required value={ngoForm.reg_no} onChange={e=>setNgo(f=>({...f,reg_no:e.target.value}))} placeholder="e.g. AP/2019/0012345"/></div>
            <div className="form-group"><label className="form-label">Website</label>
              <input className="form-input" value={ngoForm.website} onChange={e=>setNgo(f=>({...f,website:e.target.value}))} placeholder="https://yourorg.in"/></div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving?'Submitting…':'Submit Request'}</button>
          </form>
        </div>
      )}

      {tab==='myissues' && (
        <div className="card profile-section">
          <h3><FileText size={15}/> My Reported Issues</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:4}}>
            {['','Reported','Under Review','In Progress','Resolved','Rejected'].map(s => (
              <button key={s}
                className={`tab ${issFilter===s?'tab--active':''}`}
                style={{fontSize:'.75rem',padding:'4px 11px'}}
                onClick={()=>setIssFilter(s)}>
                {s||'All'}
              </button>
            ))}
          </div>
          {issLoading ? <p className="loading-text">Loading your issues…</p>
            : myIssues.length === 0 ? (
              <div className="empty-state" style={{padding:'24px 0'}}>
                <h3>No issues yet</h3>
                <p>You haven't reported any civic issues. <Link to="/issues" style={{color:'var(--blue)'}}>Report one now →</Link></p>
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {myIssues.map(issue => (
                  <Link key={issue.id} to={`/issues/${issue.id}`} className="my-issue-row">
                    <div className="my-issue-row__left">
                      <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:4}}>
                        <span className={`badge ${STATUS_CLS[issue.status]||'badge-navy'}`}>{issue.status}</span>
                        {issue.priority !== 'Normal' && (
                          <span className="badge badge-red">{issue.priority==='Critical'?'🚨':'🔥'} {issue.priority}</span>
                        )}
                        <span className="badge badge-navy">{issue.category}</span>
                      </div>
                      <div className="my-issue-row__title">{issue.title}</div>
                      {issue.location_text && (
                        <div className="my-issue-row__loc"><MapPin size={10}/> {issue.location_text}</div>
                      )}
                      {issue.authority_note && (
                        <div className="my-issue-row__note">📝 Authority: {issue.authority_note}</div>
                      )}
                    </div>
                    <div className="my-issue-row__right">
                      <div style={{display:'flex',alignItems:'center',gap:4,fontSize:'.73rem',color:'var(--muted)'}}><ThumbsUp size={11}/>{issue.upvotes}</div>
                      <div style={{fontSize:'.7rem',color:'var(--muted)'}}>{new Date(issue.created_at).toLocaleDateString('en-IN')}</div>
                      {issue.status==='Resolved' && <span style={{fontSize:'.7rem',color:'var(--green)',fontWeight:600}}>✅ Resolved</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>
      )}

      <div className="card profile-section">
        <h3><ShieldCheck size={15}/> Account</h3>
        <div className="profile-meta">
          <div><span>Member since</span><strong>{user?.created_at?new Date(user.created_at).toLocaleDateString('en-IN'):'—'}</strong></div>
          <div><span>Role</span><strong>{ROLE[user?.role]??user?.role}</strong></div>
          <div><span>Email verified</span><strong>{verified?'✅ Yes':'⚠️ No — click Verify Email tab'}</strong></div>
          <div><span>Anonymous posting</span><strong>✅ Always available</strong></div>
        </div>
      </div>
    </div>
  )
}
