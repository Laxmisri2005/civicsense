import { useEffect, useState } from 'react'
import { alertsAPI } from '../utils/api'
import { AlertTriangle, Wind, Droplets, Zap, Thermometer, Phone, RefreshCw, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import './Alerts.css'

const SEV_CLS   = { Low:'sev-low', Moderate:'sev-moderate', High:'sev-high', Critical:'sev-critical' }
const TYPE_EMOJI= { flood:'🌊', cyclone:'🌪️', earthquake:'🏚️', heatwave:'🌡️', tsunami:'🌊', default:'⚠️' }
const TYPE_ICON = { flood:Droplets, cyclone:Wind, earthquake:Zap, heatwave:Thermometer, default:AlertTriangle }

export default function Alerts() {
  const [alerts,   setAlerts]   = useState([])
  const [weather,  setWeather]  = useState(null)
  const [wxErr,    setWxErr]    = useState('')
  const [loading,  setLoading]  = useState(true)
  const [wxLoad,   setWxLoad]   = useState(false)
  const [city,     setCity]     = useState('Chennai')
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { loadAlerts() }, [])

  async function loadAlerts() {
    setLoading(true)
    try { const r = await alertsAPI.getAll(); setAlerts(Array.isArray(r.data) ? r.data : []) }
    finally { setLoading(false) }
  }

  async function fetchWeather(params) {
    setWxLoad(true); setWeather(null); setWxErr('')
    try {
      const r = await alertsAPI.getWeather(params)
      if (r.data.error) setWxErr(r.data.message)
      else setWeather(r.data)
    } catch { setWxErr('Could not fetch weather data.') }
    finally { setWxLoad(false) }
  }

  function handleGPS() {
    if (!navigator.geolocation) return setWxErr('Geolocation not supported.')
    navigator.geolocation.getCurrentPosition(
      p => fetchWeather({ lat:p.coords.latitude, lon:p.coords.longitude }),
      () => setWxErr('Could not get location. Try entering a city name.')
    )
  }

  const DEFAULT_CONTACTS = [
    {name:'Emergency',number:'112'},{name:'NDRF',number:'1078'},
    {name:'Police',number:'100'},{name:'Ambulance',number:'108'},{name:'Fire',number:'101'},
  ]

  return (
    <div className="alerts-page">
      <h1 className="page-title">Disaster Alerts</h1>
      <p className="page-sub">Live weather risk and active disaster alerts. Know what to do before disaster strikes.</p>

      {/* Live Weather */}
      <div className={`weather-card card ${weather ? SEV_CLS[weather.severity]||'' : ''}`}>
        <div className="weather-header">
          <h2><Zap size={17}/> Live Weather Risk</h2>
          <div className="weather-search">
            <input className="form-input" value={city} onChange={e=>setCity(e.target.value)}
              style={{width:160}} placeholder="Enter city…"
              onKeyDown={e=>e.key==='Enter' && fetchWeather({city})}/>
            <button className="btn btn-ghost btn-sm" onClick={()=>fetchWeather({city})} disabled={wxLoad}>
              <RefreshCw size={13} className={wxLoad?'spinning':''}/> Check
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleGPS} disabled={wxLoad}>📍 GPS</button>
          </div>
        </div>

        {wxLoad && <div className="wx-status"><div className="mini-spinner"/>Fetching live weather…</div>}
        {wxErr  && <div className="wx-error">⚠️ {wxErr}</div>}
        {!wxLoad && !weather && !wxErr && (
          <p className="wx-prompt">Enter a city or use GPS to check live weather risk for your area.</p>
        )}

        {weather && !wxLoad && (
          <>
            <div className="weather-result">
              <div className="weather-icon-wrap">
                <span style={{fontSize:'2rem'}}>{TYPE_EMOJI[weather.alert_type]||'⚠️'}</span>
              </div>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:5}}>
                  <span className={`sev-badge sev-badge--${weather.severity?.toLowerCase()}`}>{weather.severity} Risk</span>
                  <span style={{fontSize:'.78rem',color:'var(--muted)'}}>📍 {weather.city}{weather.country?`, ${weather.country}`:''}</span>
                </div>
                <h3 style={{fontSize:'1rem',color:'var(--navy)',marginBottom:4}}>{weather.title}</h3>
                <p style={{fontSize:'.83rem',color:'var(--muted)'}}>{weather.description}</p>
              </div>
            </div>

            <div className="safety-box">
              <p><strong>⚠️</strong> {weather.instructions}</p>
            </div>

            {(weather.do_list?.length>0 || weather.dont_list?.length>0) && (
              <div className="do-dont-grid">
                {weather.do_list?.length>0 && (
                  <div className="do-list">
                    <h4><CheckCircle size={13}/> DO</h4>
                    {weather.do_list.map((d,i) => <div key={i} className="do-item"><CheckCircle size={11}/>{d}</div>)}
                  </div>
                )}
                {weather.dont_list?.length>0 && (
                  <div className="dont-list">
                    <h4><XCircle size={13}/> DON'T</h4>
                    {weather.dont_list.map((d,i) => <div key={i} className="dont-item"><XCircle size={11}/>{d}</div>)}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Emergency contacts always visible */}
        <div className="contacts-section">
          <h4><Phone size={13}/> Emergency Contacts</h4>
          <div className="contacts-list">
            {(weather?.contacts ?? DEFAULT_CONTACTS).map((c,i) => (
              <a key={i} href={`tel:${c.number}`} className="contact-chip">
                <span>{c.name}</span><strong>{c.number}</strong>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Active DB Alerts */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'2px solid var(--border)',paddingBottom:10}}>
        <h2 style={{fontSize:'.95rem',color:'var(--navy)'}}>Active Alerts ({alerts.length})</h2>
      </div>

      {loading ? <p className="loading-text">Loading alerts…</p>
        : alerts.length===0 ? (
          <div className="empty-state"><h3>No active alerts</h3><p>No disaster alerts for your area right now.</p></div>
        ) : (
          <div className="alerts-list">
            {alerts.map(alert => {
              const isOpen = expanded===alert.id
              return (
                <div key={alert.id} className={`alert-card card ${SEV_CLS[alert.severity]||''}`}>
                  <div className="alert-header" onClick={()=>setExpanded(isOpen?null:alert.id)}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <span style={{fontSize:'1.4rem'}}>{TYPE_EMOJI[alert.alert_type]||'⚠️'}</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:'.9rem',color:'var(--text)'}}>{alert.title}</div>
                        <div style={{fontSize:'.72rem',color:'var(--muted)',marginTop:2}}>
                          {[alert.district,alert.state,alert.region].filter(Boolean).join(', ')||'India'}
                          {' · '}{new Date(alert.created_at).toLocaleDateString('en-IN')}
                          {alert.source && ` · ${alert.source}`}
                        </div>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                      <span className={`sev-badge sev-badge--${alert.severity?.toLowerCase()}`}>{alert.severity}</span>
                      {isOpen ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="alert-body">
                      <p style={{fontSize:'.85rem',color:'var(--muted)'}}>{alert.description}</p>
                      {alert.instructions && (
                        <div className="safety-box"><p><strong>⚠️</strong> {alert.instructions}</p></div>
                      )}
                      {(alert.do_list?.length>0 || alert.dont_list?.length>0) && (
                        <div className="do-dont-grid">
                          {alert.do_list?.length>0 && (
                            <div className="do-list">
                              <h4><CheckCircle size={13}/> DO</h4>
                              {alert.do_list.map((d,i)=><div key={i} className="do-item"><CheckCircle size={11}/>{d}</div>)}
                            </div>
                          )}
                          {alert.dont_list?.length>0 && (
                            <div className="dont-list">
                              <h4><XCircle size={13}/> DON'T</h4>
                              {alert.dont_list.map((d,i)=><div key={i} className="dont-item"><XCircle size={11}/>{d}</div>)}
                            </div>
                          )}
                        </div>
                      )}
                      {alert.contacts?.length>0 && (
                        <div className="contacts-section">
                          <h4><Phone size={13}/> Contacts</h4>
                          <div className="contacts-list">
                            {alert.contacts.map((c,i)=>(
                              <a key={i} href={`tel:${c.number}`} className="contact-chip">
                                <span>{c.name}</span><strong>{c.number}</strong>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
    </div>
  )
}
