import { Link } from 'react-router-dom'

const categoryPaths = {
  electrician: 'M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4',
  plumber: 'M12 3c-2.5 3.2-6 7.2-6 11a6 6 0 0 0 12 0c0-3.8-3.5-7.8-6-11Z',
  painter: 'm4 20 8-8m-5 5 3 3M15 4l5 5-8 8-5-5 8-8ZM4 20h4',
  cleaner: 'm12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l1 2.5 2.5 1-2.5 1L19 23l-1-2.5-2.5-1 2.5-1 1-2.5Z',
  carpenter: 'M4 7h16v3H4zM7 10v10m10-10v10M4 20h16M8 4h8v3H8z',
  other: 'M4 11.5 12 5l8 6.5v8H4v-8ZM9 19v-5h6v5',
}

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 4l6 6-6 6" /></svg>
}

export default function ServiceCard({ service }) {
  const category = categoryPaths[service.category] ? service.category : 'other'
  const label = service.category?.replaceAll('_', ' ') || 'Home service'
  return (
    <article className="service-card">
      <div className="service-card-top"><span className={`service-icon service-icon-${category}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d={categoryPaths[category]} /></svg></span><span className="service-category">{label}</span></div>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="service-card-bottom"><span className="service-price">₹{Number(service.price).toLocaleString('en-IN')}<small> / visit</small></span><Link className="card-arrow" to={`/services/${service.id}/book`} aria-label={`Book ${service.name}`}><Arrow /></Link></div>
    </article>
  )
}
