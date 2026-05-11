import { useEffect, useRef, useState } from 'react'
import { mapAPI, issuesAPI } from '../utils/api'
import { Filter, RefreshCw, MapPin } from 'lucide-react'
import './IssueMap.css'

const PRIORITY_COLOR = { Critical:'#dc2626', 'High Priority':'#f59e0b', Normal:'#2563eb' }

export default function IssueMap() {
  const mapRef     = useRef(null)
  const leafletRef = useRef(null)
  const markersRef = useRef([])
  const [cats, setCats]       = useState({})
  const [filters, setFilters] = useState({ category:'', priority:'', status:'' })
  const [count, setCount]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [ready, setReady]     = useState(false)
  const [error, setError]     = useState('')

  // Load Leaflet from CDN
  useEffect(() => {
    if (document.getElementById('leaflet-css')) { setReady(true); return }
    const css = document.createElement('link')
    css.id = 'leaflet-css'; css.rel = 'stylesheet'
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(css)
    const js = document.createElement('script')
    js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    js.onload  = () => setReady(true)
    js.onerror = () => setError('Could not load map library. Please check your internet connection.')
    document.head.appendChild(js)
  }, [])

  // Init map
  useEffect(() => {
    if (!ready || leafletRef.current || !mapRef.current) return
    const L = window.L; if (!L) return
    const map = L.map(mapRef.current, { zoomControl: true }).setView([17.385, 78.487], 11)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
        () => {}
      )
    }
    leafletRef.current = map
    issuesAPI.categories().then(r => setCats(r.data || {}))
    loadMarkers()
  }, [ready])

  useEffect(() => { if (leafletRef.current) loadMarkers() }, [filters])

  async function loadMarkers() {
    const L = window.L; if (!L || !leafletRef.current) return
    setLoading(true)
    try {
      const params = {}
      if (filters.category) params.category = filters.category
      if (filters.priority) params.priority = filters.priority
      if (filters.status)   params.status   = filters.status
      const res = await mapAPI.issuesGeoJSON(params)
      const features = res.data.features || []
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []
      features.forEach(f => {
        const [lng, lat] = f.geometry.coordinates
        const p = f.properties
        const color = PRIORITY_COLOR[p.priority] || '#6b7280'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:700;">${p.upvotes}</div>`,
          iconSize: [28, 28], iconAnchor: [14, 14],
        })
        const marker = L.marker([lat, lng], { icon }).addTo(leafletRef.current)
          .bindPopup(`
            <div style="min-width:200px;font-family:Inter,sans-serif;font-size:13px">
              <div style="font-weight:700;margin-bottom:5px;color:#0f1f3d">${p.title}</div>
              <div style="color:#6b7280;font-size:11px;margin-bottom:6px">${p.category}</div>
              <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:8px">
                <span style="background:${color}22;color:${color};padding:1px 7px;border-radius:99px;font-size:10px;font-weight:700">${p.priority}</span>
                <span style="background:#f1f5f9;padding:1px 7px;border-radius:99px;font-size:10px">${p.status}</span>
              </div>
              <a href="/issues/${p.id}" style="color:#2563eb;font-size:11px;font-weight:600">View Issue →</a>
            </div>
          `, { maxWidth: 240 })
        markersRef.current.push(marker)
      })
      setCount(features.length)
    } catch { setError('Failed to load issue locations.') }
    finally { setLoading(false) }
  }

  const setF = (k,v) => setFilters(f => ({...f,[k]:v}))

  return (
    <div className="map-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Issue Map</h1>
          <p className="page-sub">{loading ? 'Loading…' : `${count} geotagged issues`}</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={loadMarkers} disabled={loading}>
          <RefreshCw size={14} className={loading?'spinning':''}/> Refresh
        </button>
      </div>

      <div className="filters-bar card">
        <Filter size={13} color="var(--muted)"/>
        <select className="form-input filter-sel" value={filters.category} onChange={e=>setF('category',e.target.value)}>
          <option value="">All Categories</option>
          {Object.keys(cats).map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-input filter-sel" value={filters.priority} onChange={e=>setF('priority',e.target.value)}>
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High Priority">High Priority</option>
          <option value="Normal">Normal</option>
        </select>
        <select className="form-input filter-sel" value={filters.status} onChange={e=>setF('status',e.target.value)}>
          <option value="">All Statuses</option>
          <option value="Reported">Reported</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
        </select>
      </div>

      <div className="map-legend">
        {Object.entries(PRIORITY_COLOR).map(([k,v]) => (
          <div key={k} className="legend-item">
            <div className="legend-dot" style={{background:v}}/>
            <span>{k}</span>
          </div>
        ))}
        <span style={{fontSize:'.72rem',color:'var(--muted)'}}>· Number in circle = upvotes</span>
      </div>

      {error && <div style={{background:'var(--red-soft)',color:'var(--red)',padding:'10px 14px',borderRadius:8,fontSize:'.85rem'}}>{error}</div>}

      <div className="map-container card">
        {!ready && !error && (
          <div className="map-loading">
            <div style={{width:28,height:28,border:'3px solid var(--border)',borderTopColor:'var(--navy)',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
            <p>Loading OpenStreetMap…</p>
          </div>
        )}
        <div ref={mapRef} style={{width:'100%',height:'100%',opacity:ready?1:0}}/>
      </div>

      <div className="map-hint card">
        <MapPin size={15} color="var(--muted)"/>
        <p>Issues appear on the map only when GPS location is attached. When reporting, tap <strong>GPS</strong> to pin your exact location.</p>
      </div>
    </div>
  )
}
