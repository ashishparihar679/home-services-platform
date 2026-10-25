import { useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import ServiceCard from '../components/ServiceCard'

const categories = ['electrician', 'plumber', 'painter', 'cleaner', 'carpenter', 'other']

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/services/')
      .then(({ data }) => { if (active) setServices(data.filter((service) => service.is_active)) })
      .catch(() => { if (active) setError('We could not load services. Check your connection and try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const visibleServices = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    return services.filter((service) => {
      const inCategory = category === 'all' || service.category === category
      const inSearch = !search || `${service.name} ${service.description} ${service.category}`.toLocaleLowerCase().includes(search)
      return inCategory && inSearch
    })
  }, [category, query, services])

  return (
    <section className="content-section page-section services-page">
      <div className="eyebrow">A LITTLE HELP, RIGHT ON TIME</div>
      <div className="section-heading page-title-row services-heading">
        <div><h1 className="page-title">Find your kind of help.</h1><p className="section-intro">Good people, ready to care for your home.</p></div>
        <span className="result-count">{loading ? 'Loading services' : `${visibleServices.length} ${visibleServices.length === 1 ? 'service' : 'services'}`}</span>
      </div>
      <div className="services-toolbar">
        <label className="service-search"><span className="search-icon" aria-hidden="true">⌕</span><span className="visually-hidden">Search services</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search home services" /></label>
        <div className="filter-row" aria-label="Filter services by category">
          <button type="button" className={`filter-chip ${category === 'all' ? 'selected' : ''}`} aria-pressed={category === 'all'} onClick={() => setCategory('all')}>All services</button>
          {categories.map((item) => <button type="button" key={item} className={`filter-chip ${category === item ? 'selected' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      </div>
      {loading ? <div className="service-grid services-results" aria-label="Loading services">{[0, 1, 2, 3, 4, 5].map((item) => <div className="service-skeleton" key={item} aria-hidden="true"><span /><span /><span /><span /></div>)}</div> : error ? <div className="notice notice-error" role="alert">{error}</div> : visibleServices.length ? (
        <div className="service-grid services-results">{visibleServices.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
      ) : <div className="empty-state services-empty"><span className="empty-icon" aria-hidden="true">⌕</span><h3>{services.length ? 'No matching services.' : 'Our service list is growing.'}</h3><p>{services.length ? 'Try a different search or category.' : 'Check back soon for available home services.'}</p>{(query || category !== 'all') && <button className="button button-outline" type="button" onClick={() => { setQuery(''); setCategory('all') }}>Clear filters</button>}</div>}
    </section>
  )
}
