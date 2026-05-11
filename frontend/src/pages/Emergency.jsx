import { useEffect, useState } from 'react'
import { offlineAPI } from '../utils/api'
import { Radio, WifiOff, Wifi, Send, RefreshCw, AlertCircle } from 'lucide-react'
import './Emergency.css'

const QUEUE_KEY = 'cs_offline_queue'
const readQ  = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]') } catch { return [] } }
const saveQ  = q => localStorage.setItem(QUEUE_KEY, JSON.stringify(q))

export default function Emergency() {
  const [templates, setTemplates] = useState([])
  const [queue,     setQueue]     = useState(readQ())
  const [nearby,    setNearby]    = useState([])
  const [online,    setOnline]    = useState(navigator.onLine)
  const [syncing,   setSyncing]   = useState(false)
  const [syncMsg,   setSyncMsg]   = useState('')
  const [custom,    setCustom]    = useState('')
  const [deviceId]                = useState(() => {
    let id = localStorage.getItem('cs_device_id')
    if (!id) { id = 'dev_'+Math.random().toString(36).slice(2,10); localStorage.setItem('cs_device_id',id) }
    return id
  })

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online',on); window.removeEventListener('offline',off) }
  }, [])

  useEffect(() => {
    offlineAPI.templates().then(r => setTemplates(r.data)).catch(() => {
      setTemplates([
        {id:'need_food',    label:'🍚 Need Food',         text:'I need food urgently.'},
        {id:'need_water',   label:'💧 Need Water',        text:'I need clean drinking water.'},
        {id:'need_medical', label:'🏥 Need Medical Help', text:'I need urgent medical assistance.'},
        {id:'need_shelter', label:'🏠 Need Shelter',      text:'I need a safe place to stay.'},
        {id:'iam_safe',     label:'✅ I Am Safe',         text:'I am safe. Do not send help.'},
        {id:'need_rescue',  label:'🆘 Need Rescue',       text:'I am trapped. Send rescue immediately.'},
        {id:'can_help',     label:'🤝 I Can Help',        text:'I am safe and can help others nearby.'},
      ])
    })
    loadNearby()
  }, [])

  // Auto-sync when back online
  useEffect(() => { if (online && queue.length > 0) syncNow() }, [online])

  function queueMsg(msg) {
    const item = { ...msg, device_id:deviceId, timestamp:new Date().toISOString(), id:Date.now() }
    const nq = [...queue, item]
    setQueue(nq); saveQ(nq)
  }

  async function syncNow() {
    if (queue.length===0) return
    setSyncing(true); setSyncMsg('')
    try {
      const r = await offlineAPI.sync(queue)
      setSyncMsg(`✅ ${r.data.synced} message(s) synced successfully!`)
      setQueue([]); saveQ([])
      loadNearby()
    } catch {
      setSyncMsg('❌ Sync failed. Will retry when connection improves.')
    } finally { setSyncing(false) }
  }

  async function loadNearby() {
    try { const r = await offlineAPI.nearby(); setNearby(r.data||[]) } catch {}
  }

  const SOS_COLORS = {
    need_food:'#dc2626', need_water:'#2563eb', need_medical:'#dc2626',
    need_shelter:'#d97706', need_rescue:'#dc2626', iam_safe:'#16a34a', can_help:'#2563eb'
  }

  return (
    <div className="emergency-page">
      {/* Connection bar */}
      <div className={`conn-bar ${online?'conn-bar--on':'conn-bar--off'}`}>
        {online ? <><Wifi size={15}/>Online — messages sync automatically</> 
                : <><WifiOff size={15}/>Offline — messages saved locally, will sync on reconnection</>}
      </div>

      <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
        <Radio size={26} color="#dc2626" className="pulse-icon"/>
        <div>
          <h1 className="page-title" style={{color:'#dc2626'}}>Emergency Mode</h1>
          <p className="page-sub">Send SOS even without internet. Messages sync automatically when you reconnect.</p>
        </div>
      </div>

      {/* Queue banner */}
      {queue.length > 0 && (
        <div className="queue-banner">
          <AlertCircle size={15}/>
          <span>{queue.length} message(s) queued locally</span>
          <button className="btn btn-primary btn-sm" style={{marginLeft:'auto'}}
            onClick={syncNow} disabled={syncing||!online}>
            <RefreshCw size={13} className={syncing?'spinning':''}/>{syncing?'Syncing…':'Sync Now'}
          </button>
        </div>
      )}
      {syncMsg && (
        <div className={`sync-msg ${syncMsg.startsWith('✅')?'sync-msg--ok':'sync-msg--err'}`}>{syncMsg}</div>
      )}

      {/* SOS templates */}
      <div className="card sos-section">
        <h2>📡 Quick SOS Messages</h2>
        <p>Tap to queue a message. It broadcasts when connectivity returns.</p>
        <div className="sos-grid">
          {templates.map(t => (
            <button key={t.id} className="sos-btn" style={{borderColor:SOS_COLORS[t.id]||'#6b7280',color:SOS_COLORS[t.id]||'#6b7280'}}
              onClick={() => queueMsg({message_type:t.id, custom_text:t.text})}>
              <span className="sos-btn__label">{t.label}</span>
              <span className="sos-btn__text">{t.text}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom message */}
      <div className="card" style={{padding:'18px 20px',display:'flex',flexDirection:'column',gap:10}}>
        <h2 style={{fontSize:'.95rem',color:'var(--navy)'}}>✍️ Custom Message</h2>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input className="form-input" style={{flex:1,minWidth:200}} placeholder="Type your emergency message…"
            value={custom} onChange={e=>setCustom(e.target.value)}/>
          <button className="btn btn-danger btn-sm" onClick={()=>{if(custom.trim()){queueMsg({message_type:'custom',custom_text:custom});setCustom('')}}}>
            <Send size={13}/> Queue
          </button>
        </div>
      </div>

      {/* Queued messages */}
      {queue.length > 0 && (
        <div className="card" style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:9}}>
          <h2 style={{fontSize:'.9rem',color:'var(--navy)'}}>📋 Queued ({queue.length})</h2>
          {queue.map(m => (
            <div key={m.id} className="queue-item">
              <span>{m.custom_text}</span>
              <span style={{fontSize:'.7rem',color:'var(--muted)',flexShrink:0}}>{new Date(m.timestamp).toLocaleTimeString('en-IN')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Nearby */}
      <div className="card" style={{padding:'16px 18px',display:'flex',flexDirection:'column',gap:9}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h2 style={{fontSize:'.9rem',color:'var(--navy)'}}>📍 Nearby Activity</h2>
          <button className="btn btn-ghost btn-sm" onClick={loadNearby}><RefreshCw size={13}/></button>
        </div>
        {nearby.length===0 ? <p style={{fontSize:'.82rem',color:'var(--muted)'}}>No nearby messages yet.</p>
          : nearby.slice(0,8).map(m => (
            <div key={m.id} className="queue-item">
              <span>{m.custom_text}</span>
              <span style={{fontSize:'.7rem',color:'var(--muted)',flexShrink:0}}>{new Date(m.synced_at).toLocaleTimeString('en-IN')}</span>
            </div>
          ))}
      </div>

      {/* Emergency contacts */}
      <div className="card emergency-contacts-box">
        <h2>🆘 Emergency Contacts — Call Now</h2>
        <div className="emergency-call-grid">
          {[{n:'Emergency',num:'112'},{n:'NDRF',num:'1078'},{n:'Ambulance',num:'108'},{n:'Police',num:'100'},{n:'Fire',num:'101'},{n:'Women Helpline',num:'1091'}].map(c=>(
            <a key={c.num} href={`tel:${c.num}`} className="call-chip">
              <span>{c.n}</span><strong>{c.num}</strong>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
