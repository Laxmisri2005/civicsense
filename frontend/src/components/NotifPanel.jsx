import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck } from 'lucide-react'
import { notifAPI } from '../utils/api'
import { useAuth } from '../context/AuthContext'
import './NotifPanel.css'

const TYPE_ICON = {
  issue_escalated:'🔥', issue_update:'🏛️', new_comment:'💬',
  alert:'🚨', help_fulfilled:'✅', badge_earned:'🏅',
  verified:'✅', ngo_request:'🏢', volunteer_enrolled:'🤝', default:'📢'
}

export default function NotifPanel() {
  const { user }           = useAuth()
  const [open, setOpen]    = useState(false)
  const [notifs, setNotifs]= useState([])
  const [unread, setUnread]= useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef           = useRef(null)

  useEffect(() => {
    if (!user) return
    fetchUnread()
    const iv = setInterval(fetchUnread, 30000)
    return () => clearInterval(iv)
  }, [user])

  useEffect(() => { if (open) fetchNotifs() }, [open])

  useEffect(() => {
    function handler(e) { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function fetchUnread() {
    try { const r = await notifAPI.unreadCount(); setUnread(r.data.count) } catch {}
  }

  async function fetchNotifs() {
    setLoading(true)
    try { const r = await notifAPI.getAll(); setNotifs(r.data.items||[]) }
    finally { setLoading(false) }
  }

  async function markRead(id) {
    await notifAPI.markRead(id)
    setNotifs(n => n.map(x => x.id===id ? {...x,is_read:true} : x))
    setUnread(u => Math.max(0,u-1))
  }

  async function markAll() {
    await notifAPI.markAllRead()
    setNotifs(n => n.map(x => ({...x,is_read:true})))
    setUnread(0)
  }

  if (!user) return null

  return (
    <div className="notif-wrap" ref={panelRef}>
      <button className="notif-bell" onClick={() => setOpen(o=>!o)}>
        <Bell size={17}/>
        {unread>0 && <span className="notif-badge">{unread>99?'99+':unread}</span>}
      </button>

      {open && (
        <div className="notif-panel card">
          <div className="notif-panel-header">
            <h3>Notifications</h3>
            <div style={{display:'flex',gap:5}}>
              {unread>0 && <button className="icon-btn" onClick={markAll} title="Mark all read"><CheckCheck size={14}/></button>}
              <button className="icon-btn" onClick={()=>setOpen(false)}><X size={14}/></button>
            </div>
          </div>
          <div className="notif-list">
            {loading && <p className="notif-empty">Loading…</p>}
            {!loading && notifs.length===0 && <p className="notif-empty">No notifications yet.</p>}
            {notifs.map(n => (
              <div key={n.id} className={`notif-item ${!n.is_read?'notif-item--unread':''}`}
                onClick={() => !n.is_read && markRead(n.id)}>
                <span className="notif-icon">{TYPE_ICON[n.type]||TYPE_ICON.default}</span>
                <div className="notif-body">
                  <div className="notif-title">{n.title}</div>
                  {n.message && <div className="notif-msg">{n.message}</div>}
                  <div className="notif-time">{new Date(n.created_at).toLocaleString('en-IN')}</div>
                </div>
                {!n.is_read && <div className="notif-dot"/>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
