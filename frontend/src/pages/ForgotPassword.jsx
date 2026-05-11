import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../utils/api'
import { ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react'
import './AuthPages.css'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep]       = useState(1)
  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState('')
  const [pwd, setPwd]         = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg]         = useState('')
  const [err, setErr]         = useState('')
  const [loading, setLoading] = useState(false)

  async function sendOTP(e) {
    e.preventDefault(); setErr(''); setMsg(''); setLoading(true)
    try {
      const r = await authAPI.forgotPassword({ email })
      setMsg(r.data.message); setStep(2)
    } catch (ex) { setErr(ex.response?.data?.error || 'Failed to send OTP.') }
    finally { setLoading(false) }
  }

  async function resetPwd(e) {
    e.preventDefault(); setErr('')
    if (pwd !== confirm) return setErr("Passwords don't match")
    if (pwd.length < 6)  return setErr("Minimum 6 characters")
    setLoading(true)
    try {
      const r = await authAPI.resetPassword({ email, otp, new_password: pwd })
      setMsg(r.data.message)
      setTimeout(() => navigate('/login'), 2200)
    } catch (ex) { setErr(ex.response?.data?.error || 'Reset failed.') }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <Link to="/login" className="auth-back"><ArrowLeft size={15} /> Back to Sign In</Link>
        <div className="auth-brand">
          <KeyRound size={28} color="#f59e0b" />
          <h1>Reset Password</h1>
        </div>

        {msg && <div className="auth-success">{msg}</div>}
        {err && <div className="auth-error">{err}</div>}

        {step === 1 ? (
          <form onSubmit={sendOTP} className="auth-form">
            <p className="auth-subtitle">Enter your registered email. We'll send a 6-digit OTP.</p>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" autoFocus required
                value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPwd} className="auth-form">
            <p className="auth-subtitle">Enter the OTP sent to <strong>{email}</strong> and your new password.</p>
            <div className="form-group">
              <label className="form-label">OTP</label>
              <input className="form-input otp-input" maxLength={6} autoFocus required
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,''))} placeholder="6-digit OTP" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" required minLength={6}
                value={pwd} onChange={e => setPwd(e.target.value)} placeholder="Minimum 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input className="form-input" type="password" required
                value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
            </div>
            <button type="submit" className="btn btn-primary auth-submit" disabled={loading || otp.length < 6}>
              {loading ? 'Resetting…' : 'Reset Password'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} style={{fontSize:'.8rem'}}>
              ← Change email
            </button>
          </form>
        )}
      </div>
      <div className="auth-bg">
        <div className="auth-bg__blob auth-bg__blob--1" />
        <div className="auth-bg__blob auth-bg__blob--2" />
      </div>
    </div>
  )
}
