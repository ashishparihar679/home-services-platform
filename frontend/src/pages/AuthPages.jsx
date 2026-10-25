import { useId, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { dashboardPath } from '../utils/auth'
import { notifyError, notifySuccess, notifyWarning } from '../utils/notifications'

const workerSkills = ['electrician', 'plumber', 'painter', 'cleaner', 'carpenter', 'other']

function getErrorMessage(error) {
  const data = error.response?.data
  if (!data) return error.message || 'Could not reach the server. Please check your connection and try again.'
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data).flat()[0]
  return typeof first === 'string' ? first : 'Please check your details and try again.'
}

function AuthFrame({ eyebrow, title, subtitle, children, footer }) {
  return (
    <section className="auth-section">
      <div className="auth-aside"><div className="auth-aside-content"><span className="auth-spark">⌂</span><div className="eyebrow">A LITTLE CARE, A LOT OF COMFORT</div><h2>Home is where the help is.</h2><p>Book the everyday fixes and thoughtful touches that make your space feel like yours.</p><div className="auth-aside-rule" /><span className="auth-aside-caption">GOOD HELP. RIGHT AT HOME.</span></div></div>
      <div className="auth-main"><div className="auth-card"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}<div className="auth-footer">{footer}</div></div></div>
    </section>
  )
}

function PasswordField({ label, hint, ...inputProps }) {
  const [visible, setVisible] = useState(false)
  const inputId = useId()
  return <div className="password-field"><label htmlFor={inputId}>{label}</label><span className="password-control"><input {...inputProps} id={inputId} type={visible ? 'text' : 'password'} /><button type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>{visible ? 'Hide' : 'Show'}</button></span>{hint && <small className="field-hint">{hint}</small>}</div>
}

export function LoginPage() {
  const { login, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState('customer')
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={dashboardPath(user)} replace />

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      const profile = await login({ ...form, account_type: accountType })
      notifySuccess('Welcome back.')
      navigate(location.state?.from?.pathname || dashboardPath(profile), { replace: true })
    } catch (requestError) { notifyError(getErrorMessage(requestError)) } finally { setBusy(false) }
  }

  return <AuthFrame eyebrow="WELCOME BACK" title="Come on in." subtitle="Choose your account type, then log in securely." footer={<>New to Bloomcare? <Link to="/register">Create an account <span aria-hidden="true">↗</span></Link></>}>
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <fieldset className="account-type-fieldset"><legend>Sign in as</legend><div className="account-type-options">
        {[['customer', 'User Login'], ['worker', 'Worker Login'], ['admin', 'Admin Login']].map(([value, label]) => (
          <label className={`account-type-option ${accountType === value ? 'selected' : ''}`} key={value}>
            <input type="radio" name="account_type" value={value} checked={accountType === value} onChange={() => setAccountType(value)} />
            <span>{label}</span>
          </label>
        ))}
      </div><small className="field-hint">Your selected type is checked against your account by the server.</small></fieldset>
      <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" required /></label>
      <PasswordField label="Password" name="password" value={form.password} onChange={update} autoComplete="current-password" required />
      <button className="button button-dark button-wide" disabled={busy}>{busy ? 'Logging in…' : 'Log in'} <span aria-hidden="true">↗</span></button>
    </form>
  </AuthFrame>
}

export function RegisterPage() {
  const { register, login, user } = useAuth()
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState('customer')
  const [form, setForm] = useState({
    username: '', email: '', first_name: '', last_name: '', password: '', confirmPassword: '',
    phone_number: '', skills: [], experience_years: '0', city: '', address: '', bio: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  if (user) return <Navigate to={dashboardPath(user)} replace />

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value })
  const toggleSkill = (skill) => setForm((current) => ({
    ...current,
    skills: current.skills.includes(skill) ? current.skills.filter((item) => item !== skill) : [...current.skills, skill],
  }))

  const submit = async (event) => {
    event.preventDefault(); setError('')
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); notifyWarning('Passwords do not match.'); return }
    if (accountType === 'worker' && form.skills.length === 0) { setError('Select at least one service skill.'); notifyWarning('Select at least one service skill.'); return }
    setBusy(true)
    try {
      const payload = {
        username: form.username.trim(), email: form.email.trim(), first_name: form.first_name.trim(),
        last_name: form.last_name.trim(), password: form.password, account_type: accountType,
      }
      if (accountType === 'worker') {
        Object.assign(payload, {
          phone_number: form.phone_number.trim(), skills: form.skills,
          experience_years: Number(form.experience_years), city: form.city.trim(),
          address: form.address.trim(), bio: form.bio.trim(),
        })
      }
      await register(payload)
      const profile = await login({ username: payload.username, password: form.password, account_type: accountType })
      notifySuccess('Your account was created successfully.')
      navigate(dashboardPath(profile), { replace: true })
    } catch (requestError) { notifyError(getErrorMessage(requestError)) } finally { setBusy(false) }
  }

  return <AuthFrame eyebrow="A WARM WELCOME" title="Make yourself at home." subtitle="Choose a customer account or apply to join as a home service worker." footer={<>Already have an account? <Link to="/login">Log in <span aria-hidden="true">↗</span></Link></>}>
    <form className="form-stack" onSubmit={submit}>
      {error && <div className="notice notice-error" role="alert">{error}</div>}
      <fieldset className="account-type-fieldset"><legend>Create an account</legend><div className="account-type-options account-type-options-two">
        {[['customer', 'Customer'], ['worker', 'Worker']].map(([value, label]) => (
          <label className={`account-type-option ${accountType === value ? 'selected' : ''}`} key={value}>
            <input type="radio" name="registration_type" value={value} checked={accountType === value} onChange={() => setAccountType(value)} />
            <span>{label}</span>
          </label>
        ))}
      </div></fieldset>
      <div className="form-two"><label>First name<input name="first_name" value={form.first_name} onChange={update} autoComplete="given-name" /></label><label>Last name<input name="last_name" value={form.last_name} onChange={update} autoComplete="family-name" /></label></div>
      <label>Username<input name="username" value={form.username} onChange={update} autoComplete="username" required /></label>
      <label>Email address<input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required /></label>
      {accountType === 'worker' && <>
        <label>Phone number<input name="phone_number" type="tel" value={form.phone_number} onChange={update} autoComplete="tel" required /></label>
        <fieldset className="skills-fieldset"><legend>Service skills</legend><div className="skill-options">
          {workerSkills.map((skill) => <label key={skill}><input type="checkbox" checked={form.skills.includes(skill)} onChange={() => toggleSkill(skill)} /><span>{skill}</span></label>)}
        </div></fieldset>
        <label>Experience (years)<input name="experience_years" type="number" min="0" max="100" value={form.experience_years} onChange={update} required /></label>
        <label>City<input name="city" value={form.city} onChange={update} autoComplete="address-level2" required /></label>
        <label>Address<textarea name="address" rows="2" value={form.address} onChange={update} autoComplete="street-address" required /></label>
        <label>Short bio <span className="optional-label">Optional</span><textarea name="bio" rows="2" maxLength="500" value={form.bio} onChange={update} /></label>
        <div className="notice notice-info">Worker profiles start as pending. An administrator must approve your profile before you can receive jobs.</div>
      </>}
      <PasswordField label="Password" name="password" value={form.password} onChange={update} autoComplete="new-password" minLength="8" required hint="Use a strong password with at least 8 characters." />
      <PasswordField label="Confirm password" name="confirmPassword" value={form.confirmPassword} onChange={update} autoComplete="new-password" minLength="8" required />
      <button className="button button-dark button-wide" disabled={busy}>{busy ? 'Creating your account…' : accountType === 'worker' ? 'Create worker account' : 'Create customer account'} <span aria-hidden="true">↗</span></button>
    </form>
  </AuthFrame>
}
