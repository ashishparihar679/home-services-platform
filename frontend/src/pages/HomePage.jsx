import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import heroImage from '../assets/bloomcare-home-hero.png'
import ServiceCard from '../components/ServiceCard'

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 4l6 6-6 6" /></svg>
}

const steps = [
  { number: '01', title: 'Choose a service', description: 'Find the home service you need and see its price before you book.' },
  { number: '02', title: 'Pick a time and place', description: 'Share your preferred slot, address, and an optional professional preference.' },
  { number: '03', title: 'Follow your booking', description: 'See the booking status in your account as the request is reviewed and assigned.' },
]

export default function HomePage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/services/')
      .then(({ data }) => { if (active) setServices(data.filter((service) => service.is_active).slice(0, 4)) })
      .catch(() => { if (active) setError('Services are temporarily unavailable. Please try again soon.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> HOME CARE, MADE SIMPLE</div>
          <h1 id="home-hero-title">Your Home,<br /><em>In Good Hands.</em></h1>
          <p>Book thoughtful help for the repairs and home projects that make everyday life feel a little easier.</p>
          <div className="home-hero-actions">
            <Link className="button button-dark" to="/services">Book a service <Arrow /></Link>
            <Link className="button button-outline" to="/services">Explore services</Link>
          </div>
          <div className="home-hero-trust" aria-label="Bloomcare booking features">
            <span><i aria-hidden="true">✓</i> Clear service prices</span>
            <span><i aria-hidden="true">✓</i> Approved professionals</span>
            <span><i aria-hidden="true">✓</i> Booking status updates</span>
          </div>
        </div>
        <div className="home-hero-image-wrap">
          <img className="home-hero-image" src={heroImage} alt="A home service professional carefully repairing a kitchen sink" fetchPriority="high" />
          <div className="hero-image-caption"><span className="caption-mark" aria-hidden="true">✳</span><span><strong>Good help, right at home.</strong><small>Care for the place that matters most.</small></span></div>
          <span className="hero-image-index" aria-hidden="true">BLOOMCARE · HOME SERVICES</span>
        </div>
      </section>

      <section className="home-service-section" aria-labelledby="popular-services-title">
        <div className="home-section-heading">
          <div><div className="eyebrow">A GOOD PLACE TO START</div><h2 id="popular-services-title">The little fixes. The big relief.</h2><p>Explore the services currently available through Bloomcare.</p></div>
          <Link className="text-link" to="/services">View all services <Arrow /></Link>
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {loading ? <div className="service-grid home-service-grid" aria-label="Loading services">{[0, 1, 2, 3].map((item) => <div className="service-skeleton" key={item} aria-hidden="true"><span /><span /><span /><span /></div>)}</div> : services.length ? (
          <div className="service-grid home-service-grid">{services.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
        ) : !error ? <div className="empty-state home-empty-state"><span className="empty-icon" aria-hidden="true">⌂</span><h3>We’re getting the service list ready.</h3><p>Check back soon for available home services.</p></div> : null}
      </section>

      <section className="how-it-works-section" id="how-it-works" aria-labelledby="how-it-works-title">
        <div className="home-section-heading home-section-heading-centered"><div className="eyebrow">A CLEARER WAY TO BOOK</div><h2 id="how-it-works-title">From small fix to sorted.</h2><p>A few simple steps take your request from idea to doorstep.</p></div>
        <div className="process-grid">{steps.map((step) => <article className="process-card" key={step.number}><span className="process-number">{step.number}</span><span className="process-symbol" aria-hidden="true">{step.number === '01' ? '⌕' : step.number === '02' ? '◷' : '✓'}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
      </section>

      <section className="home-about-section" id="about" aria-labelledby="about-title">
        <div className="about-orbit" aria-hidden="true"><span>⌂</span><i /><i /><i /></div>
        <div className="about-copy"><div className="eyebrow">WHY BLOOMCARE</div><h2 id="about-title">A little more care in every step.</h2><p>Bloomcare brings home service requests, worker applications, and booking updates into one simple place.</p>
          <ul className="benefit-list"><li><span aria-hidden="true">✓</span><span><strong>Approved professionals</strong><small>Worker profiles are reviewed before they can receive jobs.</small></span></li><li><span aria-hidden="true">₹</span><span><strong>Price shown upfront</strong><small>See the listed service price before sending a booking request.</small></span></li><li><span aria-hidden="true">↗</span><span><strong>Updates in your account</strong><small>Check the status of your booking and see the accepted professional.</small></span></li></ul>
        </div>
      </section>

      <section className="professional-note-section" aria-labelledby="professional-note-title">
        <div className="professional-note-mark" aria-hidden="true">✳</div>
        <div><div className="eyebrow">THE RIGHT PERSON FOR THE JOB</div><h2 id="professional-note-title">Professionals matched to your service and time.</h2><p>Once you choose a service and booking slot, eligible professionals are shown when available. You can request a preference, and Bloomcare confirms the final assignment.</p></div>
        <Link className="button button-outline" to="/services">Find a service <Arrow /></Link>
      </section>

      <section className="home-final-cta" id="contact" aria-labelledby="home-final-title">
        <div><div className="eyebrow">READY WHEN YOU ARE</div><h2 id="home-final-title">Let’s make home feel like home.</h2><p>Find a service, choose a time, and send your request in a few simple steps.</p></div>
        <div className="home-final-actions"><Link className="button button-light" to="/services">Book a service <Arrow /></Link><Link className="home-contact-link" to="/login">Need a booking update? Sign in <Arrow /></Link></div>
      </section>
    </div>
  )
}
