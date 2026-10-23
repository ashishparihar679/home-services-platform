import { useCallback, useEffect, useState } from 'react'
import api from '../api/client'

const blankService = { name: '', category: 'electrician', description: '', price: '', is_active: true }
const statusLabels = { pending: 'Pending', confirmed: 'Confirmed', in_progress: 'In progress', completed: 'Completed', cancelled: 'Cancelled' }
const transitions = {
  pending: ['confirmed', 'cancelled'], confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed'], completed: [], cancelled: [],
}

function errorText(error) {
  const data = error.response?.data
  if (!data) return 'Could not reach the server. Please try again.'
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data).flat()[0]
  return typeof first === 'string' ? first : 'Please review your changes and try again.'
}

export default function AdminDashboard() {
  const [services, setServices] = useState([])
  const [bookings, setBookings] = useState([])
  const [form, setForm] = useState(blankService)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    try {
      const [serviceResponse, bookingResponse] = await Promise.all([
        api.get('/services/'), api.get('/admin/bookings/'),
      ])
      setError('')
      setServices(serviceResponse.data)
      setBookings(bookingResponse.data)
    } catch (requestError) { setError(errorText(requestError)) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    Promise.all([api.get('/services/'), api.get('/admin/bookings/')])
      .then(([serviceResponse, bookingResponse]) => {
        if (!active) return
        setServices(serviceResponse.data)
        setBookings(bookingResponse.data)
      })
      .catch((requestError) => { if (active) setError(errorText(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value })
  const editService = (service) => {
    setEditingId(service.id)
    setForm({ name: service.name, category: service.category, description: service.description, price: service.price, is_active: service.is_active })
    document.getElementById('service-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  const resetForm = () => { setEditingId(null); setForm(blankService) }

  const saveService = async (event) => {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true)
    try {
      if (editingId) await api.patch(`/services/${editingId}/`, form)
      else await api.post('/services/', form)
      setNotice(editingId ? 'Service details saved.' : 'New service added.')
      resetForm()
      await loadDashboard()
    } catch (requestError) { setError(errorText(requestError)) } finally { setBusy(false) }
  }

  const toggleService = async (service) => {
    setError(''); setNotice('')
    try {
      await api.patch(`/services/${service.id}/`, { is_active: !service.is_active })
      setNotice(`${service.name} ${service.is_active ? 'paused' : 'made available'}.`)
      await loadDashboard()
    } catch (requestError) { setError(errorText(requestError)) }
  }

  const updateStatus = async (bookingId, newStatus) => {
    setError(''); setNotice('')
    try {
      await api.patch(`/bookings/${bookingId}/status/`, { status: newStatus })
      setNotice('Booking status updated.')
      await loadDashboard()
    } catch (requestError) { setError(errorText(requestError)) }
  }

  return (
    <section className="content-section page-section admin-page">
      <div className="eyebrow">BLOOMCARE OPERATIONS</div><div className="section-heading page-title-row"><div><h1 className="page-title">Good morning, admin.</h1><p className="section-intro">A clear view of the care happening around town.</p></div><button className="button button-outline" onClick={() => { setLoading(true); loadDashboard() }}>↻ Refresh</button></div>
      {error && <div className="notice notice-error" role="alert">{error}</div>}{notice && <div className="notice notice-success" role="status">{notice}</div>}
      {loading ? <div className="page-state">Loading your dashboard…</div> : <>
        <div className="admin-stats"><div className="admin-stat"><span>AVAILABLE SERVICES</span><strong>{services.filter((item) => item.is_active).length}</strong></div><div className="admin-stat"><span>ALL SERVICES</span><strong>{services.length}</strong></div><div className="admin-stat"><span>BOOKING REQUESTS</span><strong>{bookings.length}</strong></div><div className="admin-stat"><span>NEED ATTENTION</span><strong>{bookings.filter((item) => ['pending', 'confirmed', 'in_progress'].includes(item.status)).length}</strong></div></div>

        <section className="admin-panel" id="service-editor">
          <div className="admin-panel-heading"><div><div className="eyebrow">THE SERVICE MENU</div><h2>{editingId ? 'A thoughtful little edit.' : 'Add a new service.'}</h2></div><span className="panel-count">{services.length} total</span></div>
          <form className="admin-service-form" onSubmit={saveService}>
            <label>Service name<input name="name" value={form.name} onChange={update} required maxLength="120" placeholder="e.g. Ceiling fan installation" /></label>
            <label>Category<select name="category" value={form.category} onChange={update}><option value="electrician">Electrician</option><option value="plumber">Plumber</option><option value="painter">Painter</option><option value="cleaner">Cleaner</option><option value="carpenter">Carpenter</option><option value="other">Other</option></select></label>
            <label>Price per visit (₹)<input name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={update} required placeholder="450.00" /></label>
            <label className="form-full">Description<textarea name="description" rows="2" value={form.description} onChange={update} required placeholder="What can customers expect?" /></label>
            {editingId && <label className="toggle-label"><input name="is_active" type="checkbox" checked={form.is_active} onChange={update} /> Available to customers</label>}
            <div className="form-full form-actions"><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Add service'} <span aria-hidden="true">↗</span></button>{editingId && <button className="button button-outline" type="button" onClick={resetForm}>Cancel edit</button>}</div>
          </form>
          <div className="admin-service-list">{services.map((service) => <div className="admin-service-row" key={service.id}><div><strong>{service.name}</strong><span>{service.category} · ₹{Number(service.price).toLocaleString('en-IN')} · {service.is_active ? 'Available' : 'Paused'}</span></div><div className="row-actions"><button className="text-button" onClick={() => editService(service)}>Edit</button><button className="text-button" onClick={() => toggleService(service)}>{service.is_active ? 'Pause' : 'Activate'}</button></div></div>)}</div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><div><div className="eyebrow">THE PEOPLE WE’RE HELPING</div><h2>Booking requests.</h2></div><span className="panel-count">{bookings.length} total</span></div>
          {bookings.length ? <div className="admin-booking-list">{bookings.map((booking) => <article className="admin-booking-row" key={booking.id}><div className="admin-booking-main"><div className="admin-booking-title"><strong>{booking.service_name}</strong><span className={`status-pill status-${booking.status}`}>{statusLabels[booking.status] || booking.status}</span></div><span>{booking.customer_username} · {booking.customer_id}</span><span>{new Date(`${booking.booking_date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {booking.booking_time.slice(0, 5)} · ₹{Number(booking.price_at_booking).toLocaleString('en-IN')}</span><span>{booking.address}</span>{booking.notes && <span className="admin-booking-notes">Note: {booking.notes}</span>}</div><label className="status-control">Update status<select value={booking.status} onChange={(event) => updateStatus(booking.id, event.target.value)} disabled={!transitions[booking.status]?.length}><option value={booking.status}>{statusLabels[booking.status]}</option>{(transitions[booking.status] || []).map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label></article>)}</div> : <div className="empty-state empty-state-compact"><span className="empty-icon">⌂</span><h3>No bookings just yet</h3><p>New requests will appear here as customers book a service.</p></div>}
        </section>
      </>}
    </section>
  )
}
