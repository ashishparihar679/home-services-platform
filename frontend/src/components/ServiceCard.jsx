import { Link } from 'react-router-dom'

const categoryIcons = {
  electrician: '✳', plumber: '◉', painter: '◒', cleaner: '✦', carpenter: '⌘', other: '⌂',
}

export default function ServiceCard({ service }) {
  return (
    <article className="service-card">
      <div className="service-card-top">
        <span className={`service-icon service-icon-${service.category}`} aria-hidden="true">
          {categoryIcons[service.category] || categoryIcons.other}
        </span>
        <span className="service-category">{service.category.replace('_', ' ')}</span>
      </div>
      <h3>{service.name}</h3>
      <p>{service.description}</p>
      <div className="service-card-bottom">
        <span className="service-price">₹{Number(service.price).toLocaleString('en-IN')}<small> / visit</small></span>
        <Link className="card-arrow" to={`/services/${service.id}/book`} aria-label={`Book ${service.name}`}>↗</Link>
      </div>
    </article>
  )
}
