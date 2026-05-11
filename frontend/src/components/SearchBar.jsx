import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { searchAPI } from '../utils/api'
import { useNavigate } from 'react-router-dom'
import './SearchBar.css'

export default function SearchBar() {
  const [q,      setQ]       = useState('')
  const [results,setResults] = useState(null)
  const [loading,setLoading] = useState(false)
  const [open,   setOpen]    = useState(false)
  const wrapRef  = useRef(null)
  const timer    = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const h = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  function handleChange(e) {
    const v = e.target.value; setQ(v)
    clearTimeout(timer.current)
    if (v.length < 2) { setResults(null); setOpen(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try { const r = await searchAPI.search(v); setResults(r.data); setOpen(true) }
      catch {} finally { setLoading(false) }
    }, 350)
  }

  function go(path) { setOpen(false); setQ(''); setResults(null); navigate(path) }
  function clear() { setQ(''); setResults(null); setOpen(false) }

  return (
    <div className="search-wrap" ref={wrapRef}>
      <div className="search-field">
        <Search size={14} className="search-icon"/>
        <input className="search-input" placeholder="Search issues, stories…" value={q}
          onChange={handleChange} onFocus={() => results && setOpen(true)}/>
        {q && <button className="search-x" onClick={clear}><X size={12}/></button>}
      </div>

      {open && results && (
        <div className="search-drop card">
          {loading && <p className="search-empty">Searching…</p>}
          {!loading && results.total===0 && <p className="search-empty">No results for "{q}"</p>}

          {results.issues?.length>0 && (
            <div className="search-group">
              <div className="search-group-label">📍 Issues</div>
              {results.issues.map(i => (
                <button key={i.id} className="search-result" onClick={()=>go(`/issues/${i.id}`)}>
                  <span className="search-result-title">{i.title}</span>
                  <span className="search-result-meta">{i.category} · {i.status}</span>
                </button>
              ))}
            </div>
          )}
          {results.stories?.length>0 && (
            <div className="search-group">
              <div className="search-group-label">📖 Stories</div>
              {results.stories.map(s => (
                <button key={s.id} className="search-result" onClick={()=>go('/stories')}>
                  <span className="search-result-title">{s.title}</span>
                  {s.dharma_tag && <span className="search-result-meta">✦ {s.dharma_tag}</span>}
                </button>
              ))}
            </div>
          )}
          {results.help?.length>0 && (
            <div className="search-group">
              <div className="search-group-label">🤝 Help</div>
              {results.help.map(h => (
                <button key={h.id} className="search-result" onClick={()=>go('/help')}>
                  <span className="search-result-title">{h.description}</span>
                  <span className="search-result-meta">{h.category} · {h.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
