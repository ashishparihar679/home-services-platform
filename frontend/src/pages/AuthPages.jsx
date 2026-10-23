import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function getErrorMessage(error) {
  const data = error.response?.data
  if (!data) return 'Could not reach the server. Please check your connection and try again.'
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data).flat()[0]
  return typeof first === 'string' ? first : 'Please check your details and try again.'
}

function AuthFrame({ eyebrow, title, subtitle, children, footer }) {
  return (
    <section className="auth-section">
      <div className="auth-aside"><div className="auth-aside-content"><span className="auth-spark">✳</span><div className="eyebrow">A LITTLE CARE, A LOT OF COMFORT</div><h2>Home is where the help is.</h2><p>Book the everyday fixes and thoughtful touches that make your space feel like yours.</p><div className="auth-aside-rule" /><span className="auth-aside-caption">GOOD HELP. RIGHT AT HOME.</span></div></div>
      <div className="auth-main"><div className="auth-card"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}<div className="auth-footer">{footer}</div></div></div>
    </section>
  )
}

export function LoginPage() {
  const { login, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/services'} replace />

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const profile = await login(form)
      navigate(location.state?.from?.pathname || (profile.role === 'admin' ? '/admin' : '/services'), { replace: true })
    } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setBusy(false) }
  }

  return <AuthFrame eyebrow="WELCOME BACK" title="Come on in." subtitle="Log in to pick up right where you left off." footer={<>New to Bloomcare? <Link to="/register">Create an account <span aria-hidden="true">↗</span></Link></>}>
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" value={form.password} onChange={update} autoComplete="current-password" required /></label>
      <button className="button button-dark button-wide" disabled={busy}>{busy ? 'Logging in…' : 'Log in'} <span aria-hidden="true">↗</span></button>
    </form>
  </AuthFrame>
}

export function RegisterPage() {
  const { register, login, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to="/services" replace />

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      await register(form)
      await login({ username: form.username, password: form.password })
      navigate('/services', { replace: true })
    } catch (requestError) { setError(getErrorMessage(requestError)) } finally { setBusy(false) }
  }

  return <AuthFrame eyebrow="A WARM WELCOME" title="Make yourself at home." subtitle="Create an account to book a little help, whenever you need it." footer={<>Already have an account? <Link to="/login">Log in <span aria-hidden="true">↗</span></Link></>}>
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <div className="form-two"><label>First name<input name="first_name" value={form.first_name} onChange={update} autoComplete="given-name" /></label><label>Last name<input name="last_name" value={form.last_name} onChange={update} autoComplete="family-name" /></label></div>
      <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" required /></label>
      <label>Email address<input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" value={form.password} onChange={update} autoComplete="new-password" minLength="8" required /><small className="field-hint">Use a strong password with at least 8 characters.</small></label>
      <button className="button button-dark button-wide" disabled={busy}>{busy ? 'Creating your account…' : 'Create account'} <span aria-hidden="true">↗</span></button>
    </form>
  </AuthFrame>
}
