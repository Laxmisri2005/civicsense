import { useEffect, useState } from 'react'
import { analyticsAPI } from '../utils/api'
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Users, HandHeart, Radio, BarChart2 } from 'lucide-react'
import './Analytics.css'

function BarChart({ data, labelKey, valueKey, color = '#0f1f3d' }) {
  if (!data?.length) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data</p>
  const max = Math.max(...data.map(d => d[valueKey]))
  return (
    <div className="bar-chart">
      {data.map((d, i) => (
        <div key={i} className="bar-chart__row">
          <div className="bar-chart__label">{d[labelKey]}</div>
          <div className="bar-chart__track">
            <div className="bar-chart__fill"
              style={{ width: `${(d[valueKey] / max) * 100}%`, background: color }} />
          </div>
          <div className="bar-chart__val">{d[valueKey]}</div>
        </div>
      ))}
    </div>
  )
}

function LineChart({ data }) {
  if (!data?.length) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data</p>
  const max = Math.max(...data.map(d => d.count), 1)
  const W = 600, H = 120, PAD = 20
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.count / max) * (H - PAD * 2))
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="line-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="line-chart">
        <polyline points={pts} fill="none" stroke="#0f1f3d" strokeWidth="2.5" strokeLinejoin="round" />
        {data.map((d, i) => {
          const x = PAD + (i / (data.length - 1 || 1)) * (W - PAD * 2)
          const y = H - PAD - ((d.count / max) * (H - PAD * 2))
          return <circle key={i} cx={x} cy={y} r="4" fill="#f59e0b" />
        })}
      </svg>
      <div className="line-chart-labels">
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map(d => (
          <span key={d.date}>{d.date?.slice(5)}</span>
        ))}
      </div>
    </div>
  )
}

function DonutChart({ data, labelKey, valueKey }) {
  if (!data?.length) return null
  const total = data.reduce((s, d) => s + d[valueKey], 0)
  const COLORS = ['#0f1f3d','#f59e0b','#16a34a','#dc2626','#3b82f6','#9333ea','#f97316','#06b6d4']
  let offset = 0
  const slices = data.map((d, i) => {
    const pct   = d[valueKey] / total
    const slice = { ...d, pct, offset, color: COLORS[i % COLORS.length] }
    offset += pct
    return slice
  })

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 42 42" className="donut-svg">
        {slices.map((s, i) => {
          const r = 15.91549430918954
          const dash = s.pct * 100
          const gap  = 100 - dash
          const strokeDashoffset = 100 - (s.offset * 100)
          return (
            <circle key={i} className="donut-segment"
              cx="21" cy="21" r={r}
              fill="transparent"
              stroke={s.color}
              strokeWidth="5"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={strokeDashoffset}
            />
          )
        })}
        <circle cx="21" cy="21" r="13" fill="white" />
        <text x="21" y="21" textAnchor="middle" dy=".3em" fontSize="5" fontWeight="bold" fill="#0f1f3d">
          {total}
        </text>
      </svg>
      <div className="donut-legend">
        {slices.map((s, i) => (
          <div key={i} className="donut-legend__item">
            <div className="donut-legend__dot" style={{ background: s.color }} />
            <span>{s[labelKey]}</span>
            <strong>{s[valueKey]}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Analytics() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    analyticsAPI.dashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="analytics-loading">Loading analytics…</div>
  if (!data)   return <div className="empty-state"><h3>Analytics unavailable</h3></div>

  const { summary, by_category, by_status, by_priority, daily_issues, heatmap } = data

  return (
    <div className="analytics-page">
      <h1 className="page-title">📊 Authority Dashboard</h1>
      <p className="page-subtitle">Live civic data, resolution rates, and community impact.</p>

      {/* KPI cards */}
      <div className="kpi-grid">
        {[
          { label: 'Total Issues',      value: summary.total_issues,    icon: BarChart2,   color: 'blue'  },
          { label: 'Resolved',          value: summary.resolved,         icon: CheckCircle, color: 'green' },
          { label: 'In Progress',       value: summary.in_progress,      icon: Clock,       color: 'amber' },
          { label: 'High Priority',     value: summary.high_priority,    icon: AlertTriangle,color:'red'   },
          { label: 'Registered Users',  value: summary.total_users,      icon: Users,       color: 'navy'  },
          { label: 'Help Requests',     value: summary.total_help,       icon: HandHeart,   color: 'green' },
          { label: 'SOS Messages',      value: summary.sos_messages,     icon: Radio,       color: 'red'   },
          { label: 'Avg Resolution (days)', value: summary.avg_resolution_days, icon: TrendingUp, color: 'blue' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`kpi-card card kpi-card--${color}`}>
            <div className="kpi-card__icon"><Icon size={20} /></div>
            <div className="kpi-card__value">{value}</div>
            <div className="kpi-card__label">{label}</div>
          </div>
        ))}
      </div>

      {/* Resolution rate */}
      <div className="card resolution-card">
        <h2>Overall Resolution Rate</h2>
        <div className="resolution-bar">
          <div className="resolution-bar__fill" style={{ width: `${summary.resolution_rate}%` }} />
        </div>
        <div className="resolution-bar__labels">
          <span>0%</span>
          <strong style={{ color: 'var(--green)' }}>{summary.resolution_rate}% Resolved</strong>
          <span>100%</span>
        </div>
      </div>

      {/* Charts grid */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h2>Issues by Category</h2>
          <BarChart data={by_category} labelKey="category" valueKey="count" color="#0f1f3d" />
        </div>

        <div className="card chart-card">
          <h2>Issues by Status</h2>
          <DonutChart data={by_status} labelKey="status" valueKey="count" />
        </div>

        <div className="card chart-card chart-card--wide">
          <h2>Daily Issues (Last 30 Days)</h2>
          <LineChart data={daily_issues} />
        </div>

        <div className="card chart-card">
          <h2>Priority Distribution</h2>
          <BarChart data={by_priority} labelKey="priority" valueKey="count" color="#f59e0b" />
        </div>

        {/* Geo heatmap table */}
        <div className="card chart-card">
          <h2>📍 Issues with Location ({heatmap.length})</h2>
          <div className="heatmap-list">
            {heatmap.slice(0, 8).map((p, i) => (
              <div key={i} className="heatmap-row">
                <span className="heatmap-row__coords">{Number(p.lat).toFixed(3)}, {Number(p.lng).toFixed(3)}</span>
                <span className={`badge ${p.priority === 'Critical' ? 'badge-red' : p.priority === 'High Priority' ? 'badge-amber' : 'badge-navy'}`}>{p.priority}</span>
                <span className={`badge ${p.status === 'Resolved' ? 'badge-green' : 'badge-blue'}`}>{p.status}</span>
              </div>
            ))}
            {heatmap.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No geotagged issues yet</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
