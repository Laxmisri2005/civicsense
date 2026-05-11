import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { issuesAPI, alertsAPI, helpAPI, storiesAPI } from '../utils/api'
import { MapPin, AlertTriangle, HandHeart, BookOpen, TrendingUp, ShieldCheck, ArrowRight, Activity, Map, Users, Vote } from 'lucide-react'
import './Dashboard.css'

const STATUS_COLOR = { Reported:'#d97706','Under Review':'#7c3aed','In Progress':'#2563eb',Resolved:'#16a34a',Rejected:'#dc2626' }

export default function Dashboard() {
  const [stats, setStats]           = useState({ issues:0, alerts:0, help:0, stories:0 })
  const [recentIssues, setRecent]   = useState([])
  const [activeAlert, setAlert]     = useState(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [issues, alerts, help, stories] = await Promise.allSettled([
          issuesAPI.getAll({ per_page:4, sort:'newest' }),
          alertsAPI.getAll(),
          helpAPI.getAll(),
          storiesAPI.getAll(),
        ])
        const items  = issues.value?.data?.items   ?? []
        const total  = issues.value?.data?.total   ?? 0
        const alData = alerts.value?.data           ?? []
        const hlData = help.value?.data             ?? []
        const stData = stories.value?.data          ?? []
        const hlTotal = Array.isArray(hlData) ? hlData.length : (hlData?.total ?? 0)
        const stTotal = Array.isArray(stData) ? stData.length : (stData?.total ?? 0)
        setStats({ issues:total, alerts:Array.isArray(alData) ? alData.length : 0, help:hlTotal, stories:stTotal })
        setRecent(items.slice(0,4))
        if (Array.isArray(alData) && alData.length > 0) setAlert(alData[0])
      } finally { setLoading(false) }
    }
    load()
  }, [])

  const STAT_CARDS = [
    { label:'Civic Issues',   value:stats.issues,  icon:MapPin,        color:'blue',  to:'/issues'  },
    { label:'Active Alerts',  value:stats.alerts,  icon:AlertTriangle, color:'red',   to:'/alerts'  },
    { label:'Help Requests',  value:stats.help,    icon:HandHeart,     color:'green', to:'/help'    },
    { label:'Stories Shared', value:stats.stories, icon:BookOpen,      color:'amber', to:'/stories' },
  ]

  return (
    <div className="dashboard">
      {/* Hero */}
      <div className="dash-hero card">
        <div className="dash-hero__text">
          <h1>नमस्ते, Welcome to CivicSense</h1>
          <p>Report civic issues, stay safe during disasters, and support your community — anonymously and with purpose.</p>
          <div className="dash-hero__actions">
            <Link to="/issues"    className="btn btn-saffron"><MapPin size={15}/>Report Issue</Link>
            <Link to="/emergency" className="btn btn-danger"><Activity size={15}/>Emergency SOS</Link>
          </div>
        </div>
        <div className="dash-hero__emoji">🏛️</div>
      </div>

      {/* Alert banner */}
      {activeAlert && (
        <Link to="/alerts" className="alert-banner-warn">
          <AlertTriangle size={17}/>
          <span><strong>{activeAlert.severity} Alert:</strong> {activeAlert.title}</span>
          <ArrowRight size={15} style={{marginLeft:'auto'}}/>
        </Link>
      )}

      {/* Stat cards */}
      <div className="grid-4">
        {STAT_CARDS.map(({ label, value, icon:Icon, color, to }) => (
          <Link to={to} key={label} className={`stat-card stat-card--${color} card`}>
            <div className="stat-card__icon"><Icon size={20}/></div>
            <div className="stat-card__val">{loading ? '—' : value}</div>
            <div className="stat-card__label">{label}</div>
          </Link>
        ))}
      </div>

      {/* Recent issues + dharma */}
      <div className="dash-bottom">
        <div className="card recent-issues">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <h2 style={{fontSize:'.95rem',display:'flex',alignItems:'center',gap:7,color:'var(--navy)'}}><TrendingUp size={16}/>Recent Issues</h2>
            <Link to="/issues" style={{fontSize:'.78rem',color:'var(--blue)',fontWeight:600,display:'flex',alignItems:'center',gap:3}}>See all<ArrowRight size={13}/></Link>
          </div>
          {loading ? <p className="loading-text">Loading…</p>
            : recentIssues.length === 0 ? (
              <div className="empty-state" style={{padding:'24px 0'}}><h3>No issues yet</h3><p>Be the first to report a civic problem.</p></div>
            ) : (
              <div>
                {recentIssues.map(issue => (
                  <Link to={`/issues/${issue.id}`} key={issue.id} className="recent-row">
                    <div>
                      <div className="recent-row__title">{issue.title}</div>
                      <div className="recent-row__meta">{issue.category} · {issue.reporter_name}</div>
                    </div>
                    <div style={{display:'flex',gap:5,alignItems:'center',flexShrink:0}}>
                      <span className="badge" style={{background:`${STATUS_COLOR[issue.status]||'#6b7280'}18`,color:STATUS_COLOR[issue.status]||'#6b7280'}}>{issue.status}</span>
                      {issue.priority!=='Normal'&&<span className="badge badge-red">{issue.priority==='Critical'?'🚨':'🔥'}</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
        </div>

        <div className="card dharma-card">
          <ShieldCheck size={26} color="#f59e0b"/>
          <blockquote className="dharma-card__verse">
            "यदा यदा हि धर्मस्य<br/>ग्लानिर्भवति भारत।"
          </blockquote>
          <p className="dharma-card__src">— Bhagavad Gita 4.7</p>
          <p className="dharma-card__trans">"Whenever righteousness declines, I manifest to restore what is right."</p>
          <Link to="/stories" className="btn btn-ghost btn-sm" style={{marginTop:8}}>
            <BookOpen size={13}/>Community Stories
          </Link>
        </div>
      </div>

      {/* Quick actions */}
      <div className="quick-grid">
        {[
          { to:'/issues',    emoji:'🛣️',  label:'Report Issue'    },
          { to:'/map',       emoji:'🗺️',  label:'View Map'        },
          { to:'/help',      emoji:'🤝',  label:'Ask for Help'    },
          { to:'/help',      emoji:'💪',  label:'Offer Help'      },
          { to:'/emergency', emoji:'🆘',  label:'Send SOS'        },
          { to:'/alerts',    emoji:'🌦️',  label:'Check Alerts'    },
          { to:'/volunteers',emoji:'🧑‍🤝‍🧑','label':'Volunteer'     },
          { to:'/budget',    emoji:'🏛️',  label:'Vote on Budget'  },
        ].map(({ to, emoji, label }) => (
          <Link to={to} key={label} className="quick-card card">
            <span style={{fontSize:'1.7rem'}}>{emoji}</span>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
