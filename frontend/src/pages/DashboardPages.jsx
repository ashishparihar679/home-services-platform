import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api/client'
import { useAuth } from '../context/useAuth'

const bookingStatuses = [
  ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['in_progress', 'In progress'],
  ['completed', 'Completed'], ['cancelled', 'Cancelled'],
]
const skillOptions = ['electrician', 'plumber', 'painter', 'cleaner', 'carpenter', 'other']

function errorText(error) {
  const data = error.response?.data
  if (!data) return 'Could not reach the server. Please try again.'
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') return data.detail
  if (typeof data !== 'object') return 'Please review the details and try again.'
  const messages = Object.values(data).flat(Infinity).filter((value) => typeof value === 'string' && value.trim())
  return messages[0] || 'Please review the details and try again.'
}

function StatusPill({ value }) {
  return <span className={`status-pill status-${value}`}>{value?.replaceAll('_', ' ') || 'Unassigned'}</span>
}

function StatCard({ label, value, icon }) {
  return <article className="dashboard-stat"><span className="dashboard-stat-icon" aria-hidden="true">{icon}</span><span className="dashboard-stat-label">{label}</span><strong>{value}</strong></article>
}

function BookingRows({ bookings, emptyMessage }) {
  if (!bookings.length) return <div className="empty-state empty-state-compact"><span className="empty-icon">⌂</span><h3>Nothing here yet</h3><p>{emptyMessage}</p></div>
  return <div className="dashboard-list">{bookings.map((booking) => <article className="dashboard-list-row" key={booking.id}>
    <div className="dashboard-list-main"><strong>{booking.service_name}</strong><span>{new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} · {booking.booking_time?.slice(0, 5)}</span></div>
    <StatusPill value={booking.status} /><strong className="dashboard-list-price">₹{Number(booking.price_at_booking).toLocaleString('en-IN')}</strong>
  </article>)}</div>
}

export function CustomerDashboard() {
  const { user, loadProfile } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyBusy, setApplyBusy] = useState(false)
  const [applyError, setApplyError] = useState('')
  const [applySuccess, setApplySuccess] = useState('')
  const [application, setApplication] = useState({ phone_number: '', skills: [], experience_years: '0', city: '', address: '', bio: '' })

  useEffect(() => {
    let active = true
    api.get('/my-bookings/')
      .then(({ data }) => { if (active) { setBookings(data); setError('') } })
      .catch((requestError) => { if (active) setError(errorText(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const counts = useMemo(() => Object.fromEntries(bookingStatuses.map(([value]) => [
    value, bookings.filter((booking) => booking.status === value).length,
  ])), [bookings])

  const changeApplication = (event) => setApplication((current) => ({ ...current, [event.target.name]: event.target.value }))
  const toggleSkill = (skill) => setApplication((current) => ({
    ...current,
    skills: current.skills.includes(skill) ? current.skills.filter((item) => item !== skill) : [...current.skills, skill],
  }))

  const submitApplication = async (event) => {
    event.preventDefault(); setApplyError(''); setApplySuccess(''); setApplyBusy(true)
    const phone = application.phone_number.trim()
    const phoneDigits = phone.replace(/\D/g, '')
    const experienceYears = Number(application.experience_years)
    if (!application.skills.length) {
      setApplyError('Please select at least one service skill.')
      setApplyBusy(false)
      return
    }
    if (!/^\+?[0-9\s().-]+$/.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
      setApplyError('Enter a valid phone number with 7 to 15 digits.')
      setApplyBusy(false)
      return
    }
    if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 100) {
      setApplyError('Experience must be a whole number between 0 and 100.')
      setApplyBusy(false)
      return
    }
    try {
      await api.post('/worker/apply/', { ...application, phone_number: phone, experience_years: experienceYears })
    } catch (requestError) {
      setApplyError(errorText(requestError))
      setApplyBusy(false)
      return
    }

    const successMessage = 'Aapka worker application submit ho gaya hai. Admin approval ke baad aap kaam shuru kar sakte hain.'
    setApplySuccess(successMessage)
    setApplyOpen(false)
    setApplyBusy(false)
    window.alert(successMessage)

    try {
      await loadProfile()
      navigate('/worker/dashboard', { replace: true, state: { applicationSubmitted: true } })
    } catch {
      setApplyError('Application submit ho gaya hai, lekin profile refresh nahi ho paya. Page reload karke status dekhein.')
    }
  }

  return <section className="content-section page-section dashboard-page">
    <div className="eyebrow">YOUR HOME, IN GOOD HANDS</div>
    <div className="section-heading page-title-row"><div><h1 className="page-title">Welcome back, {user.first_name || user.username}.</h1><p className="section-intro">Here’s what’s happening with your bookings.</p></div><Link className="button button-primary" to="/services">Book a service <span aria-hidden="true">↗</span></Link></div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {loading ? <div className="page-state">Loading your dashboard…</div> : <>
      <div className="dashboard-stats">
        <StatCard label="TOTAL BOOKINGS" value={bookings.length} icon="▤" />
        <StatCard label="PENDING" value={counts.pending} icon="◷" />
        <StatCard label="CONFIRMED" value={counts.confirmed} icon="✓" />
        <StatCard label="IN PROGRESS" value={counts.in_progress} icon="↗" />
        <StatCard label="COMPLETED" value={counts.completed} icon="✦" />
      </div>
      <section className="dashboard-panel"><div className="admin-panel-heading"><div><div className="eyebrow">YOUR RECENT ACTIVITY</div><h2>Recent bookings.</h2></div><Link className="text-link" to="/my-bookings">All bookings ↗</Link></div>
        <BookingRows bookings={bookings.slice(0, 5)} emptyMessage="When you book a service, your requests and their status will appear here." />
      </section>
      <section className="dashboard-panel profile-summary-panel"><div><div className="eyebrow">YOUR ACCOUNT</div><h2>Profile details.</h2><p>{user.first_name} {user.last_name}</p><span>{user.email}</span><span>@{user.username}</span></div><Link className="button button-outline" to="/profile">View profile</Link></section>
      <section className="dashboard-panel apply-worker-panel"><div><div className="eyebrow">WORK WITH BLOOMCARE</div><h2>Join as a home service worker.</h2><p>Apply using this account. Your profile will remain pending until an administrator reviews it.</p></div>
        {applyError && <div className="notice notice-error" role="alert">{applyError}</div>}
        {applySuccess && <div className="notice notice-success" role="status">{applySuccess}</div>}
        {!applyOpen ? <button className="button button-dark" type="button" onClick={() => setApplyOpen(true)}>Apply to become a worker <span aria-hidden="true">↗</span></button> : <form className="worker-application-form" onSubmit={submitApplication}>
          <label>Phone number<input name="phone_number" type="tel" autoComplete="tel" value={application.phone_number} onChange={changeApplication} required /></label>
          <fieldset className="skills-fieldset"><legend>Service skills</legend><div className="skill-options">{skillOptions.map((skill) => <label key={skill}><input type="checkbox" checked={application.skills.includes(skill)} onChange={() => toggleSkill(skill)} /><span>{skill}</span></label>)}</div></fieldset>
          <label>Experience (years)<input name="experience_years" type="number" min="0" max="100" step="1" value={application.experience_years} onChange={changeApplication} required /></label>
          <label>City<input name="city" value={application.city} onChange={changeApplication} required /></label>
          <label>Address<textarea name="address" rows="2" value={application.address} onChange={changeApplication} required /></label>
          <label>Short bio <span className="optional-label">Optional</span><textarea name="bio" rows="2" maxLength="500" value={application.bio} onChange={changeApplication} /></label>
          <div className="form-actions"><button className="button button-dark" disabled={applyBusy}>{applyBusy ? 'Submitting…' : 'Submit application'}</button><button className="button button-outline" type="button" onClick={() => setApplyOpen(false)}>Cancel</button></div>
        </form>}
      </section>
    </>}
  </section>
}

export function WorkerDashboard() {
  const { user, loadProfile } = useAuth()
  const location = useLocation()
  const worker = user.worker_profile
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(user.worker_profile?.verification_status === 'approved' && user.worker_profile?.is_active)
  const [error, setError] = useState('')
  const [busyJob, setBusyJob] = useState(null)
  const [notice, setNotice] = useState(location.state?.applicationSubmitted ? 'Your worker application was submitted and is pending administrator approval.' : '')

  const loadJobs = useCallback(async () => {
    if (!worker || worker.verification_status !== 'approved' || !worker.is_active) return
    try {
      const { data } = await api.get('/worker/jobs/')
      setJobs(data)
      setError('')
    } catch (requestError) { setError(errorText(requestError)) } finally { setLoading(false) }
  }, [worker])

  useEffect(() => {
    if (!worker || worker.verification_status !== 'approved' || !worker.is_active) return undefined
    let active = true
    api.get('/worker/jobs/')
      .then(({ data }) => { if (active) { setJobs(data); setError('') } })
      .catch((requestError) => { if (active) setError(errorText(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [worker])

  const count = (predicate) => jobs.filter(predicate).length
  const actOnJob = async (job, action, value) => {
    setBusyJob(job.id); setError(''); setNotice('')
    try {
      if (action === 'response') await api.patch(`/worker/jobs/${job.id}/response/`, { action: value })
      else await api.patch(`/worker/jobs/${job.id}/progress/`, { status: value })
      setNotice('Job updated successfully.')
      await loadJobs()
    } catch (requestError) { setError(errorText(requestError)) } finally { setBusyJob(null) }
  }

  const toggleAvailability = async () => {
    try {
      await api.patch('/worker/profile/', { is_available: !worker.is_available })
      await loadProfile()
      setNotice(`Availability ${worker.is_available ? 'turned off' : 'turned on'}.`)
    } catch (requestError) { setError(errorText(requestError)) }
  }

  const refreshJobs = () => { setLoading(true); loadJobs() }

  const jobCounts = {
    total: jobs.length,
    awaiting: count((job) => job.assignment_status === 'awaiting_response'),
    accepted: count((job) => job.assignment_status === 'accepted' && job.status === 'confirmed'),
    inProgress: count((job) => job.status === 'in_progress'),
    completed: count((job) => job.status === 'completed'),
  }
  const canWork = worker?.verification_status === 'approved' && worker?.is_active

  return <section className="content-section page-section dashboard-page">
    <div className="eyebrow">WORKER WORKSPACE</div>
    <div className="section-heading page-title-row"><div><h1 className="page-title">Your jobs, {user.first_name || user.username}.</h1><p className="section-intro">Review assignments and keep your work up to date.</p></div><Link className="button button-outline" to="/worker/profile">Edit worker profile</Link></div>
    <div className={`verification-banner verification-${worker?.verification_status || 'pending'}`}><span><strong>Profile status: {worker?.verification_status || 'pending'}</strong><small>{worker?.verification_status === 'approved' && worker.is_active ? 'Your profile is approved and active.' : worker?.verification_status === 'suspended' || !worker?.is_active ? 'Your worker access is inactive. Contact an administrator for help.' : 'An administrator must approve your profile before you can receive jobs.'}</small></span>
      {canWork && <button className={`availability-toggle ${worker.is_available ? 'is-available' : ''}`} type="button" onClick={toggleAvailability} aria-pressed={worker.is_available}>{worker.is_available ? 'Available' : 'Unavailable'}</button>}
    </div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}{notice && <div className="notice notice-success" role="status">{notice}</div>}
    {canWork && <>
      <div className="dashboard-stats worker-stats"><StatCard label="ASSIGNED JOBS" value={jobCounts.total} icon="▤" /><StatCard label="AWAITING RESPONSE" value={jobCounts.awaiting} icon="◷" /><StatCard label="ACCEPTED" value={jobCounts.accepted} icon="✓" /><StatCard label="IN PROGRESS" value={jobCounts.inProgress} icon="↗" /><StatCard label="COMPLETED" value={jobCounts.completed} icon="✦" /></div>
      <section className="dashboard-panel" id="jobs"><div className="admin-panel-heading"><div><div className="eyebrow">YOUR ASSIGNMENTS</div><h2>My jobs.</h2></div><button className="button button-outline" type="button" onClick={refreshJobs} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh jobs'}</button></div>
        {loading ? <div className="page-state dashboard-loading">Loading assigned jobs…</div> : jobs.length ? <div className="worker-job-list">{jobs.map((job) => <article className="worker-job-card" key={job.id}>
          <div className="worker-job-heading"><div><div className="eyebrow">JOB #{job.id}</div><h3>{job.service_name}</h3></div><StatusPill value={job.status} /></div>
          <div className="worker-job-meta"><span>{new Date(`${job.booking_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} · {job.booking_time?.slice(0, 5)}</span><span>Assignment: {job.assignment_status?.replaceAll('_', ' ')}</span><strong>₹{Number(job.price_at_booking).toLocaleString('en-IN')}</strong></div>
          {job.assignment_status === 'accepted' && <div className="worker-customer-details"><strong>Service location</strong><span>{job.address}</span>{job.notes && <span>Customer note: {job.notes}</span>}<span>Customer: {job.customer_username}</span></div>}
          <div className="worker-job-actions">
            {job.assignment_status === 'awaiting_response' && <><button className="button button-primary" disabled={busyJob === job.id} onClick={() => actOnJob(job, 'response', 'accept')}>Accept job</button><button className="button button-outline" disabled={busyJob === job.id} onClick={() => actOnJob(job, 'response', 'reject')}>Reject</button></>}
            {job.assignment_status === 'accepted' && job.status === 'confirmed' && <button className="button button-dark" disabled={busyJob === job.id} onClick={() => actOnJob(job, 'progress', 'in_progress')}>Start work</button>}
            {job.assignment_status === 'accepted' && job.status === 'in_progress' && <button className="button button-dark" disabled={busyJob === job.id} onClick={() => actOnJob(job, 'progress', 'completed')}>Mark completed</button>}
          </div>
        </article>)}</div> : <div className="empty-state empty-state-compact"><span className="empty-icon">⌂</span><h3>No assigned jobs yet</h3><p>Approved and available workers will see new assignments here.</p></div>}
      </section>
    </>}
  </section>
}

export function WorkerProfilePage() {
  const { user, loadProfile } = useAuth()
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api.get('/worker/profile/').then(({ data }) => setForm(data))
      .catch((requestError) => setError(errorText(requestError)))
      .finally(() => setLoading(false))
  }, [])

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const toggleSkill = (skill) => setForm((current) => ({
    ...current, skills: current.skills.includes(skill) ? current.skills.filter((item) => item !== skill) : [...current.skills, skill],
  }))
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      await api.patch('/worker/profile/', { ...form, experience_years: Number(form.experience_years) })
      await loadProfile()
      setNotice('Worker profile saved.')
    } catch (requestError) { setError(errorText(requestError)) } finally { setBusy(false) }
  }

  if (loading) return <div className="page-state">Loading worker profile…</div>
  if (!form) return <section className="content-section page-section"><div className="notice notice-error">{error || 'Worker profile is unavailable.'}</div></section>
  return <section className="content-section page-section dashboard-page">
    <div className="eyebrow">YOUR WORKER PROFILE</div><h1 className="page-title">Profile details.</h1>
    {error && <div className="notice notice-error" role="alert">{error}</div>}{notice && <div className="notice notice-success" role="status">{notice}</div>}
    <div className="verification-banner"><span><strong>Verification: {form.verification_status}</strong><small>Your account role and verification status are managed by the server.</small></span></div>
    <form className="dashboard-panel worker-profile-form" onSubmit={save}>
      <div className="form-two"><label>First name<input value={form.first_name || ''} readOnly /></label><label>Last name<input value={form.last_name || ''} readOnly /></label></div>
      <label>Email<input value={form.email || ''} readOnly /></label><label>Phone number<input name="phone_number" type="tel" value={form.phone_number || ''} onChange={update} required /></label>
      <fieldset className="skills-fieldset"><legend>Service skills</legend><div className="skill-options">{skillOptions.map((skill) => <label key={skill}><input type="checkbox" checked={form.skills.includes(skill)} onChange={() => toggleSkill(skill)} /><span>{skill}</span></label>)}</div></fieldset>
      <label>Experience (years)<input name="experience_years" type="number" min="0" max="100" value={form.experience_years} onChange={update} required /></label>
      <label>City<input name="city" value={form.city} onChange={update} required /></label><label>Address<textarea name="address" rows="3" value={form.address} onChange={update} required /></label>
      <label>Short bio<textarea name="bio" rows="3" maxLength="500" value={form.bio || ''} onChange={update} /></label>
      <button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      <small className="field-hint">Signed in as {user.username}. Approval and active status can only be changed by an administrator.</small>
    </form>
  </section>
}

export function ProfilePage() {
  const { user } = useAuth()
  return <section className="content-section page-section dashboard-page"><div className="eyebrow">ACCOUNT SETTINGS</div><h1 className="page-title">Your profile.</h1>
    <div className="dashboard-panel profile-details"><div><span>Full name</span><strong>{[user.first_name, user.last_name].filter(Boolean).join(' ') || 'Not provided'}</strong></div><div><span>Username</span><strong>{user.username}</strong></div><div><span>Email</span><strong>{user.email}</strong></div><div><span>Account type</span><strong>{user.role}</strong></div>
      {user.role === 'worker' && <><div><span>Verification</span><strong>{user.worker_profile?.verification_status}</strong></div><Link className="button button-dark" to="/worker/profile">Edit worker details</Link></>}
    </div>
  </section>
}

export function SuperDashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/super/analytics/')
      .then(({ data }) => setAnalytics(data))
      .catch((requestError) => setError(errorText(requestError)))
      .finally(() => setLoading(false))
  }, [])

  const statusCounts = analytics?.bookings_by_status ?? {}
  const categoryCounts = analytics?.bookings_by_category ?? []
  const highestCategoryCount = Math.max(1, ...categoryCounts.map((item) => item.count))

  return <section className="content-section page-section dashboard-page">
    <div className="eyebrow">SUPERUSER ANALYTICS</div><h1 className="page-title">Platform overview.</h1><p className="section-intro">Figures below are calculated from live authorized API records.</p>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    {loading ? <div className="page-state">Loading platform records…</div> : !analytics ? <div className="empty-state"><h3>Analytics unavailable</h3><p>Could not load authorized platform metrics.</p></div> : <>
      <div className="dashboard-stats analytics-stats"><StatCard label="TOTAL WORKER PROFILES" value={analytics.worker_count} icon="♙" /><StatCard label="PENDING APPROVALS" value={analytics.pending_worker_count} icon="◷" /><StatCard label="TOTAL BOOKINGS" value={analytics.booking_count} icon="▤" /><StatCard label="ACTIVE SERVICES" value={analytics.active_service_count} icon="✦" /></div>
      <section className="dashboard-panel"><div className="admin-panel-heading"><div><div className="eyebrow">BOOKING STATUS</div><h2>Current distribution.</h2></div></div><div className="analytics-status-grid">{bookingStatuses.map(([value, label]) => <div key={value}><span>{label}</span><strong>{statusCounts[value]}</strong></div>)}</div></section>
      <section className="dashboard-panel"><div className="admin-panel-heading"><div><div className="eyebrow">SERVICE DEMAND</div><h2>Bookings by service category.</h2></div></div>
        {categoryCounts.length ? <div className="category-bars">{categoryCounts.map(({ category, count }) => <div className="category-bar-row" key={category}><span>{category}</span><div><i style={{ width: `${Math.max(8, count / highestCategoryCount * 100)}%` }} /></div><strong>{count}</strong></div>)}</div> : <div className="empty-state empty-state-compact"><h3>No booking data yet</h3><p>Category counts will appear when bookings exist.</p></div>}
      </section>
      <div className="notice notice-info analytics-note">The current backend has no all-customer count, registration trends, or normalized booking-city analytics endpoint. Those metrics are not estimated or fabricated here.</div>
    </>}
  </section>
}
