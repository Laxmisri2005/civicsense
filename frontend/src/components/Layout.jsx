import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, AlertTriangle, MapPin, HandHeart, Radio,
  BookOpen, Menu, X, ShieldAlert, LogIn, UserCircle, LogOut,
  Map, Info, Users, Vote, BarChart2, Shield, ClipboardList
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import NotifPanel from './NotifPanel'
import SearchBar  from './SearchBar'
import './Layout.css'

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard'       },
  { to: '/issues',    icon: MapPin,          label: 'Civic Issues'    },
  { to: '/map',       icon: Map,             label: 'Issue Map'       },
  { to: '/alerts',    icon: AlertTriangle,   label: 'Alerts'          },
  { to: '/help',      icon: HandHeart,       label: 'Community Help'  },
  { to: '/emergency', icon: Radio,           label: 'Emergency', danger: true },
  { to: '/stories',   icon: BookOpen,        label: 'Stories'         },
  { to: '/volunteers',icon: Users,           label: 'Volunteers'      },
  { to: '/budget',    icon: Vote,            label: 'Budget Votes'    },
  { to: '/about',     icon: Info,            label: 'About'           },
]
const NAV_ADMIN = [
  { to: '/authority', icon: ClipboardList, label: 'Authority Dashboard' },
  { to: '/analytics', icon: BarChart2,     label: 'Analytics'           },
  { to: '/admin',     icon: Shield,        label: 'Admin'                },
]

export default function Layout() {
  const [open, setOpen]  = useState(false)
  const loc              = useLocation()
  const navigate         = useNavigate()
  const { user, logout } = useAuth()

  const allNav = [...NAV, ...(user && ['admin','authority'].includes(user.role) ? NAV_ADMIN : [])]
  const currentLabel = allNav.find(n => n.to === loc.pathname)?.label ?? 'CivicSense'

  async function handleLogout() { await logout(); navigate('/login') }

  return (
    <div className="layout">
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="sidebar-brand">
          <ShieldAlert size={22} color="#f59e0b" />
          <span>CivicSense</span>
        </div>

        <nav className="sidebar-nav">
          {allNav.map(({ to, icon: Icon, label, danger }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link--active' : ''} ${danger ? 'nav-link--danger' : ''}`
              }
              onClick={() => setOpen(false)}>
              <Icon size={17} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          {user ? (
            <>
              <NavLink to="/profile" className="user-card" onClick={() => setOpen(false)}>
                <div className="user-avatar">{user.username[0].toUpperCase()}</div>
                <div className="user-info">
                  <span className="user-name">
                    {user.full_name || user.username}
                    {user.is_verified && <span title="Verified" style={{marginLeft:3}}>✅</span>}
                  </span>
                  <span className="user-role">{user.role}</span>
                </div>
                <UserCircle size={14} style={{marginLeft:'auto',opacity:.4}} />
              </NavLink>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={13} /> Sign out
              </button>
            </>
          ) : (
            <div className="auth-btns">
              <NavLink to="/login" className="nav-link" onClick={() => setOpen(false)}>
                <LogIn size={17} /><span>Sign In</span>
              </NavLink>
              <NavLink to="/register" className="register-btn" onClick={() => setOpen(false)}>
                Create Account
              </NavLink>
            </div>
          )}
        </div>

        <div className="sidebar-footer">CivicSense · Built for India 🇮🇳</div>
      </aside>

      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <div className="main-wrap">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setOpen(o => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="topbar-title">{currentLabel}</span>
          <SearchBar />
          <div className="topbar-right">
            <NotifPanel />
            {user ? (
              <NavLink to="/profile" className="topbar-user">
                <div className="topbar-avatar">{user.username[0].toUpperCase()}</div>
                <span className="topbar-username">{user.username}</span>
              </NavLink>
            ) : (
              <div className="topbar-auth">
                <NavLink to="/login"    className="topbar-signin">Sign In</NavLink>
                <NavLink to="/register" className="btn btn-saffron btn-sm">Register</NavLink>
              </div>
            )}
          </div>
        </header>
        <main className="main-content"><Outlet /></main>
      </div>
    </div>
  )
}
