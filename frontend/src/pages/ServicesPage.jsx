import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import ServiceCard from '../components/ServiceCard'

const filters = ['all', 'electrician', 'plumber', 'painter', 'cleaner', 'carpenter', 'other']

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/services/')
      .then(({ data }) => setServices(data))
      .catch(() => setError('We could not load services. Check that the Django API is running and try again.'))
      .finally(() => setLoading(false))
  }, [])

  const visibleServices = useMemo(
    () => category === 'all' ? services : services.filter((service) => service.category === category),
    [category, services],
  )

  return (
    <section className="content-section page-section">
      <div className="eyebrow">A LITTLE HELP, RIGHT ON TIME</div>
      <div className="section-heading page-title-row">
        <div><h1 className="page-title">Find your kind of help.</h1><p className="section-intro">Good people, ready to care for your home.</p></div>
        <span className="result-count">{services.length} {services.length === 1 ? 'service' : 'services'}</span>
      </div>
      <div className="filter-row" aria-label="Filter services by category">
        {filters.map((item) => <button key={item} className={`filter-chip ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item === 'all' ? 'All services' : item}</button>)}
      </div>
      {loading ? <div className="page-state">Finding the right people for your home…</div> : error ? <div className="notice notice-error">{error}</div> : visibleServices.length ? (
        <div className="service-grid">{visibleServices.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
      ) : <div className="empty-state"><span className="empty-icon">⌂</span><h3>No services in this category yet</h3><p>Try another category or come back soon.</p></div>}
    </section>
  )
}
