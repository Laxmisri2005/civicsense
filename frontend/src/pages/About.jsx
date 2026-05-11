import { useEffect, useState } from 'react'
import { analyticsAPI } from '../utils/api'
import './About.css'

const QUOTES = [
  { text: 'यदा यदा हि धर्मस्य ग्लानिर्भवति भारत। अभ्युत्थानमधर्मस्य तदात्मानं सृजाम्यहम्॥', trans: 'Whenever righteousness declines and injustice rises, I manifest myself to restore what is right.', src: '— Bhagavad Gita 4.7' },
  { text: 'सर्वे भवन्तु सुखिनः। सर्वे सन्तु निरामयाः।', trans: 'May all be happy. May all be free from illness.', src: '— Bṛhadāraṇyaka Upaniṣad' },
  { text: 'अहिंसा परमो धर्मः।', trans: 'Non-violence is the highest dharma.', src: '— Mahabharata' },
  { text: 'धर्मो रक्षति रक्षितः।', trans: 'Dharma protects those who protect it.', src: '— Manusmṛti' },
  { text: 'Arise, awake, and stop not till the goal is reached.', trans: 'Keep moving forward until justice is served.', src: '— Swami Vivekananda' },
]

const FEATURES = [
  { icon: '📍', title: 'Civic Issue Reporting',   desc: '16 real categories with sub-types. GPS tagging, dual image upload, ward & PIN code. AI auto-categorization and duplicate detection.' },
  { icon: '🗺️', title: 'Interactive Issue Map',    desc: 'OpenStreetMap with Leaflet.js. Color-coded markers by priority. Filter by category, status, priority. GPS auto-center.' },
  { icon: '🌦️', title: 'Disaster Alert System',    desc: 'Live weather via OpenWeatherMap. Do\'s & Don\'ts per disaster type. SMS broadcast via Twilio. Emergency contacts always visible.' },
  { icon: '📡', title: 'Emergency Offline Mode',   desc: 'SOS messages queue in localStorage with zero internet. Auto-syncs when back online. Service Worker caches app shell.' },
  { icon: '🤝', title: 'Community Help Board',     desc: 'Need/Offer system with urgency levels. Haversine distance filtering for nearby requests. Contact method selection.' },
  { icon: '📖', title: 'Stories & Dharma',         desc: 'Share experiences with moral lessons from Indian wisdom. Dharma tags link to Mahabharata, Ramayana, Upanishads.' },
  { icon: '🧑‍🤝‍🧑','title': 'Volunteer Missions',    desc: 'Create disaster-relief missions. Enroll with skills, track capacity. Badges auto-awarded on completion.' },
  { icon: '🏛️', title: 'Budget Voting',            desc: 'Citizens vote on municipal budget priorities. Live approval bars, dedup voting, ward filtering.' },
  { icon: '📊', title: 'Analytics Dashboard',      desc: 'Live KPI cards, bar/donut/line charts, geo heatmap. Per-ward breakdowns. Resolution rate tracking.' },
  { icon: '🤖', title: 'AI Categorization',        desc: 'Keyword-based ML categorizer suggests the right category as you type. TF-IDF duplicate detection using scikit-learn.' },
  { icon: '🌐', title: 'Multi-Language',           desc: 'Translate any issue to Hindi, Telugu, or Tamil via Google Translate API. Language auto-detection.' },
  { icon: '🔔', title: 'Real-Time Notifications',  desc: 'In-app notification bell. Auto-polled every 30 seconds. Fires on escalation, status change, new comments.' },
  { icon: '📧', title: 'Email Verification',       desc: 'OTP-based email verification after registration. Forgot password via 15-minute OTP. Flask-Mail integration.' },
  { icon: '🏢', title: 'NGO Badge System',         desc: 'NGOs and RWAs can request verified badge with registration number. Admin review workflow.' },
  { icon: '🔐', title: 'Security',                 desc: 'bcrypt password hashing, JWT tokens, role-based access (citizen/authority/admin). Dedup upvoting. Full audit trail.' },
  { icon: '📱', title: 'Progressive Web App',      desc: 'Installable on Android & iOS. Service Worker for offline caching. App manifest with shortcuts.' },
]

const CONTACTS = [
  { name: 'Emergency',    num: '112' }, { name: 'Police',         num: '100' },
  { name: 'Fire',         num: '101' }, { name: 'Ambulance',      num: '108' },
  { name: 'NDRF',         num: '1078'}, { name: 'Women Helpline', num: '1091'},
  { name: 'Child Helpline', num:'1098'}, { name: 'Cyber Crime',   num: '1930'},
]

export default function About() {
  const [stats, setStats]   = useState(null)
  const [qIdx, setQIdx]     = useState(0)

  useEffect(() => {
    analyticsAPI.dashboard().then(r => setStats(r.data?.summary)).catch(() => {})
    const t = setInterval(() => setQIdx(i => (i + 1) % QUOTES.length), 6000)
    return () => clearInterval(t)
  }, [])

  const q = QUOTES[qIdx]

  return (
    <div className="about-page">
      {/* Hero with rotating quote */}
      <div className="about-hero card">
        <div className="about-hero__badge">🇮🇳 Built for India</div>
        <h1>CivicSense</h1>
        <p className="about-hero__tagline">
          Anonymous · Purpose-driven · Always available
        </p>
        <div className="about-quote" key={qIdx}>
          <p className="about-quote__verse">{q.text}</p>
          <p className="about-quote__trans">"{q.trans}"</p>
          <p className="about-quote__src">{q.src}</p>
        </div>
      </div>

      {/* Live stats from real DB */}
      {stats && (
        <div className="about-stats">
          {[
            { label: 'Issues Reported',   value: stats.total_issues,   color: 'blue'  },
            { label: 'Resolved',          value: stats.resolved,        color: 'green' },
            { label: 'Resolution Rate',   value: `${stats.resolution_rate}%`, color: 'amber' },
            { label: 'Citizens',          value: stats.total_users,     color: 'navy'  },
            { label: 'Help Requests',     value: stats.total_help,      color: 'green' },
            { label: 'SOS Messages',      value: stats.sos_messages,    color: 'red'   },
          ].map(s => (
            <div key={s.label} className={`stat-tile card stat-tile--${s.color}`}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Features */}
      <div className="about-section">
        <h2 className="about-section__title">Platform Features</h2>
        <div className="features-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency contacts */}
      <div className="emergency-contacts card">
        <h2>🆘 Emergency Contacts — Always Available</h2>
        <p>Save these numbers to your phone. They work even when offline.</p>
        <div className="contacts-grid">
          {CONTACTS.map(c => (
            <a key={c.num} href={`tel:${c.num}`} className="contact-tile">
              <span className="contact-name">{c.name}</span>
              <span className="contact-num">{c.num}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Tech stack */}
      <div className="tech-stack card">
        <h2>⚙️ Technology Stack</h2>
        <div className="tech-pills">
          {['Python 3.12', 'Flask 3.0', 'SQLAlchemy', 'SQLite / MySQL', 'Flask-JWT-Extended',
            'bcrypt', 'Flask-Mail', 'scikit-learn', 'deep-translator', 'React 18',
            'Vite 5', 'React Router 6', 'Axios', 'Leaflet.js', 'OpenStreetMap',
            'OpenWeatherMap API', 'Twilio SMS', 'Progressive Web App', 'Service Worker'].map(t => (
            <span key={t} className="tech-pill">{t}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
