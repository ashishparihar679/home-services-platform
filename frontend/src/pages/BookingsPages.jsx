import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../api/client'

function errorText(error) {
  const data = error.response?.data
  if (!data) return 'Could not reach the server. Please try again.'
  if (typeof data === 'string') return data
  if (typeof data.detail === 'string') return data.detail
  if (typeof data !== 'object') return 'Please review the form and try again.'
  const messages = Object.values(data).flat(Infinity).filter((value) => typeof value === 'string' && value.trim())
  return messages[0] || 'Please review the form and try again.'
}

function workerInitials(name) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

const statusLabels = {
  pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In progress',
  completed: 'Completed', cancelled: 'Cancelled',
}
const BOOKING_MIN_DATE = (() => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
})()

export function BookServicePage() {
  const { serviceId } = useParams()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [availability, setAvailability] = useState({ key: '', status: 'idle', workers: [], error: '' })
  const [form, setForm] = useState({ booking_date: BOOKING_MIN_DATE, booking_time: '', address: '', notes: '' })
  const availabilityKey = service && form.booking_date && form.booking_time
    ? `${serviceId}|${form.booking_date}|${form.booking_time}`
    : ''

  useEffect(() => {
    api.get(`/services/${serviceId}/`).then(({ data }) => setService(data))
      .catch(() => setError('This service could not be found or is no longer available.'))
      .finally(() => setLoading(false))
  }, [serviceId])

  useEffect(() => {
    if (!availabilityKey) return undefined

    let active = true
    const [requestedServiceId, date, time] = availabilityKey.split('|')
    api.get(`/services/${requestedServiceId}/available-workers/`, {
      params: { date, time },
    })
      .then(({ data }) => {
        if (active) {
          setAvailability({ key: availabilityKey, status: 'ready', workers: data.workers || [], error: '' })
        }
      })
      .catch((requestError) => {
        if (active) setAvailability({ key: availabilityKey, status: 'error', workers: [], error: errorText(requestError) })
      })

    return () => { active = false }
  }, [availabilityKey])

  const currentAvailability = availability.key === availabilityKey
    ? availability
    : { key: availabilityKey, status: availabilityKey ? 'loading' : 'idle', workers: [], error: '' }

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true)
    try {
      await api.post('/bookings/', { ...form, service: Number(serviceId) })
      setSuccess(true)
    } catch (requestError) { setError(errorText(requestError)) } finally { setBusy(false) }
  }

  if (loading) return <div className="page-state">Preparing your booking…</div>
  if (!service) return <section className="content-section page-section"><div className="notice notice-error">{error}</div><Link to="/services" className="text-link">Browse services ↗</Link></section>
  if (success) return <section className="success-state"><span className="success-mark">✓</span><div className="eyebrow">REQUEST RECEIVED</div><h1>We’ll take it from here.</h1><p>Your {service.name.toLowerCase()} booking is pending. You can follow its progress in your bookings.</p><div className="success-actions"><Link className="button button-dark" to="/my-bookings">View my bookings <span aria-hidden="true">↗</span></Link><Link className="text-link" to="/services">Back to services</Link></div></section>

  return (
    <section className="content-section page-section booking-page">
      <Link to="/services" className="back-link">← All services</Link>
      <div className="booking-layout">
        <div className="booking-form-column">
          <div className="eyebrow">LET’S GET IT SORTED</div><h1 className="page-title">Book a little help.</h1><p className="section-intro">Tell us when and where you need us. We’ll confirm your booking soon.</p>
          {error && <div className="notice notice-error" role="alert">{error}</div>}
          <form className="form-stack booking-form" onSubmit={submit}>
            <div className="form-two"><label>Preferred date<input type="date" name="booking_date" min={BOOKING_MIN_DATE} value={form.booking_date} onChange={update} required /></label><label>Preferred time<input type="time" name="booking_time" value={form.booking_time} onChange={update} required /></label></div>
            <section className="booking-professionals" aria-labelledby="booking-professionals-heading">
              <div className="booking-professionals-heading"><div><div className="eyebrow">THE PEOPLE BEHIND THE GOOD WORK</div><h2 id="booking-professionals-heading">Available professionals.</h2><p>Suggestions for your selected service and time. Bloomcare confirms the assignment after you request a booking.</p></div></div>
              {!availabilityKey && <p className="booking-availability-message">Choose a preferred date and time to check availability.</p>}
              {currentAvailability.status === 'loading' && <p className="booking-availability-message" role="status">Checking professionals for this date and time…</p>}
              {currentAvailability.status === 'error' && <div className="notice notice-error" role="alert">{currentAvailability.error}</div>}
              {currentAvailability.status === 'ready' && !currentAvailability.workers.some((worker) => worker.availability_status === 'available') && <p className="booking-availability-message booking-availability-empty">No workers are available for this service at the selected date and time. Please try another time.</p>}
              {currentAvailability.status === 'ready' && currentAvailability.workers.length > 0 && <div className="professional-list">{currentAvailability.workers.map((worker) => <article className="professional-card" key={worker.id}>
                <span className="professional-avatar" aria-hidden="true">{workerInitials(worker.name)}</span>
                <div className="professional-card-main"><div className="professional-card-heading"><h3>{worker.name}</h3><span className={`professional-availability professional-availability-${worker.availability_status}`}>{worker.availability_status}</span></div>
                  <p>{worker.skills.map((skill) => skill[0].toUpperCase() + skill.slice(1)).join(' · ')} · {worker.experience_years} years’ experience</p><p>{worker.city}</p>
                </div>
              </article>)}</div>}
            </section>
            <label>Service address<textarea name="address" rows="3" placeholder="House / flat, street, area, city, PIN code" value={form.address} onChange={update} required /></label>
            <label>Anything we should know? <span className="optional-label">Optional</span><textarea name="notes" rows="3" placeholder="Share a detail that will help us prepare" value={form.notes} onChange={update} /></label>
            <button className="button button-dark button-wide" disabled={busy}>{busy ? 'Sending your request…' : 'Request this service'} <span aria-hidden="true">↗</span></button>
          </form>
        </div>
        <aside className="booking-summary"><span className="summary-icon">✳</span><div className="eyebrow">YOUR PICK</div><h2>{service.name}</h2><p>{service.description}</p><div className="summary-price">₹{Number(service.price).toLocaleString('en-IN')}<span> / visit</span></div><div className="summary-line" /><div className="summary-detail"><span>✓</span> Clear pricing, no surprises</div><div className="summary-detail"><span>✓</span> You’ll see every status update</div></aside>
      </div>
    </section>
  )
}

export function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/my-bookings/').then(({ data }) => setBookings(data))
      .catch(() => setError('Your bookings could not be loaded. Please refresh and try again.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="content-section page-section">
      <div className="eyebrow">HERE WHEN YOU NEED US</div><div className="section-heading page-title-row"><div><h1 className="page-title">My bookings.</h1><p className="section-intro">A little peace of mind, in one place.</p></div><Link className="button button-primary" to="/services">Book a service <span aria-hidden="true">↗</span></Link></div>
      {loading ? <div className="page-state">Gathering your bookings…</div> : error ? <div className="notice notice-error">{error}</div> : bookings.length ? (
        <div className="booking-list">{bookings.map((booking) => <article className="booking-card" key={booking.id}><div className="booking-card-icon">✳</div><div className="booking-card-main"><div className="booking-card-top"><h2>{booking.service_name}</h2><span className={`status-pill status-${booking.status}`}>{statusLabels[booking.status] || booking.status}</span></div><p>{new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} <span>·</span> {booking.booking_time.slice(0, 5)}</p>{booking.assignment_status === 'accepted' && booking.worker_name && <p className="booking-worker-name">Professional: {booking.worker_name}</p>}<p className="booking-address">{booking.address}</p></div><div className="booking-card-price">₹{Number(booking.price_at_booking).toLocaleString('en-IN')}</div></article>)}</div>
      ) : <div className="empty-state"><span className="empty-icon">⌂</span><h3>Your next good day starts here.</h3><p>You haven’t booked a service yet. Pick the little fix you need, and we’ll take it from there.</p><Link className="button button-dark" to="/services">Explore services <span aria-hidden="true">↗</span></Link></div>}
    </section>
  )
}
