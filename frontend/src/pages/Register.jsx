import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ShieldAlert, Eye, EyeOff, Check, X } from 'lucide-react'
import './AuthPages.css'

function PwdStrength({ pw }) {
  const checks = [
    { ok: pw.length >= 6,    label: 'At least 6 chars' },
    { ok: /\d/.test(pw),     label: 'Contains number'  },
    { ok: /[a-z]/i.test(pw), label: 'Contains letter'  },
  ]
  if (!pw) return null
  return (
    <div className="pwd-strength">
      {checks.map(c => (
        <span key={c.label} className={`pwd-check ${c.ok?'pwd-check--ok':'pwd-check--no'}`}>
          {c.ok ? <Check size={10}/> : <X size={10}/>} {c.label}
        </span>
      ))}
    </div>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate     = useNavigate()
  const [form, setForm]       = useState({ username:'',email:'',full_name:'',password:'',confirm:'' })
  const [showPwd, setShowPwd] = useState(false)
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)
  const set = k => e => setForm(f => ({...f,[k]:e.target.value}))

  async function handleSubmit(e) {
    e.preventDefault(); setErr('')
    if (form.password !== form.confirm) return setErr("Passwords don't match")
    if (form.password.length < 6)       return setErr("Minimum 6 characters")
    setLoading(true)
    try {
      await register({ username:form.username, email:form.email, full_name:form.full_name, password:form.password })
      navigate('/')
    } catch (ex) { setErr(ex.response?.data?.error || 'Registration failed.') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide card">
        <div className="auth-brand">
          <ShieldAlert size={30} color="#f59e0b"/>
          <h1>CivicSense</h1>
        </div>
        <h2 className="auth-title">Create your account</h2>
        <p className="auth-subtitle">Join citizens making their communities better.</p>

        {err && <div className="auth-error">{err}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-grid">
            <div className="form-group">
              <label className="form-label">Username *</label>
              <input className="form-input" type="text" autoFocus required minLength={3}
                placeholder="civic_user" value={form.username} onChange={set('username')} />
              <span className="form-hint">Min 3 chars, no spaces</span>
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="Optional"
                value={form.full_name} onChange={set('full_name')} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email *</label>
            <input className="form-input" type="email" required
              placeholder="you@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div className="auth-grid">
            <div className="form-group">
              <label className="form-label">Password *</label>
              <div className="password-wrap">
                <input className="form-input" required minLength={6}
                  type={showPwd?'text':'password'} placeholder="Min 6 chars"
                  value={form.password} onChange={set('password')} />
                <button type="button" className="pwd-toggle" onClick={() => setShowPwd(v=>!v)}>
                  {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
              <PwdStrength pw={form.password}/>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input className="form-input" required
                type={showPwd?'text':'password'} placeholder="Repeat"
                value={form.confirm} onChange={set('confirm')} />
              {form.confirm && form.password !== form.confirm && (
                <span className="form-hint" style={{color:'var(--red)'}}>Passwords don't match</span>
              )}
            </div>
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </div>
      </div>
      <div className="auth-bg">
        <div className="auth-bg__blob auth-bg__blob--1"/>
        <div className="auth-bg__blob auth-bg__blob--2"/>
      </div>
    </div>
  )
}
