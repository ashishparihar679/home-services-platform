import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import { notifyError, notifySuccess } from '../utils/notifications'

const statuses = ['all', 'pending', 'approved', 'rejected', 'suspended']

function errorText(error) {
  const data = error.response?.data
  if (!data) return 'Could not reach the server. Please try again.'
  if (typeof data.detail === 'string') return data.detail
  const first = Object.values(data).flat()[0]
  return typeof first === 'string' ? first : 'Please review the request and try again.'
}

export default function WorkerManagement() {
  const [workers, setWorkers] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadWorkers = useCallback(async () => {
    try {
      const query = filter === 'all' ? '' : `?verification_status=${encodeURIComponent(filter)}`
      const { data } = await api.get(`/admin/workers/${query}`)
      setWorkers(data)
      setError('')
    } catch (requestError) { setError(errorText(requestError)) } finally { setLoading(false) }
  }, [filter])

  useEffect(() => {
    let active = true
    const query = filter === 'all' ? '' : `?verification_status=${encodeURIComponent(filter)}`
    api.get(`/admin/workers/${query}`)
      .then(({ data }) => { if (active) { setWorkers(data); setError('') } })
      .catch((requestError) => { if (active) setError(errorText(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filter])

  const updateWorker = async (worker, action) => {
    const updates = {
      approve: { verification_status: 'approved', is_active: true },
      reject: { verification_status: 'rejected', is_active: false },
      suspend: { verification_status: 'suspended', is_active: false },
      reactivate: { verification_status: 'approved', is_active: true },
      deactivate: { is_active: false },
    }
    setBusyId(worker.id); setError(''); setNotice('')
    try {
      await api.patch(`/admin/workers/${worker.id}/`, updates[action])
      const labels = { approve: 'approved', reject: 'rejected', suspend: 'suspended', reactivate: 'reactivated', deactivate: 'deactivated' }
      const label = labels[action]
      setNotice(''); notifySuccess(`${worker.first_name || worker.username} was ${label}.`)
      await loadWorkers()
    } catch (requestError) { setError(errorText(requestError)); notifyError(errorText(requestError)) } finally { setBusyId(null) }
  }

  return <section className="content-section page-section dashboard-page">
    <div className="eyebrow">PEOPLE BEHIND THE SERVICE</div><div className="section-heading page-title-row"><div><h1 className="page-title">Worker management.</h1><p className="section-intro">Review profiles and control who can receive job assignments.</p></div><Link className="button button-outline" to="/admin">Back to admin dashboard</Link></div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}{notice && <div className="notice notice-success" role="status">{notice}</div>}
    <section className="dashboard-panel">
      <div className="admin-panel-heading"><div><div className="eyebrow">WORKER APPLICATIONS</div><h2>{filter === 'pending' ? 'Awaiting review.' : 'Worker profiles.'}</h2></div><label className="worker-filter">Verification status<select value={filter} onChange={(event) => { setLoading(true); setFilter(event.target.value) }}>{statuses.map((value) => <option key={value} value={value}>{value === 'all' ? 'All statuses' : value}</option>)}</select></label></div>
      {loading ? <div className="page-state dashboard-loading">Loading worker profiles…</div> : workers.length ? <div className="worker-management-grid">{workers.map((worker) => <article className="worker-management-card" key={worker.id}>
        <div className="worker-management-card-top"><div><span className="worker-avatar" aria-hidden="true">{(worker.first_name || worker.username || 'W').slice(0, 1).toUpperCase()}</span><div><h3>{[worker.first_name, worker.last_name].filter(Boolean).join(' ') || worker.username}</h3><span>@{worker.username} · {worker.email}</span></div></div><span className={`status-pill status-${worker.verification_status}`}>{worker.verification_status}</span></div>
        <div className="worker-management-meta"><span><strong>Phone</strong>{worker.phone_number || 'Not provided'}</span><span><strong>Experience</strong>{worker.experience_years} years</span><span><strong>City</strong>{worker.city}</span><span><strong>Availability</strong>{worker.is_available ? 'Available' : 'Unavailable'} · {worker.is_active ? 'Active' : 'Inactive'}</span></div>
        <div className="worker-skill-tags" aria-label="Worker skills">{worker.skills.map((skill) => <span key={skill}>{skill}</span>)}</div>
        <p className="worker-bio">{worker.bio || 'No bio provided.'}</p><p className="worker-address">{worker.address}</p>
        <div className="worker-management-actions">
          {worker.verification_status === 'pending' && <><button className="button button-primary" disabled={busyId === worker.id} onClick={() => updateWorker(worker, 'approve')}>Approve</button><button className="button button-outline danger-button" disabled={busyId === worker.id} onClick={() => updateWorker(worker, 'reject')}>Reject</button></>}
          {worker.verification_status === 'approved' && worker.is_active && <><button className="button button-outline danger-button" disabled={busyId === worker.id} onClick={() => updateWorker(worker, 'suspend')}>Suspend</button><button className="text-button" disabled={busyId === worker.id} onClick={() => updateWorker(worker, 'deactivate')}>Deactivate</button></>}
          {(worker.verification_status === 'suspended' || worker.verification_status === 'rejected' || !worker.is_active) && <button className="button button-primary" disabled={busyId === worker.id} onClick={() => updateWorker(worker, 'reactivate')}>Reactivate and approve</button>}
        </div>
      </article>)}</div> : <div className="empty-state"><span className="empty-icon">♙</span><h3>No workers found</h3><p>No profiles match this verification status.</p></div>}
    </section>
  </section>
}
