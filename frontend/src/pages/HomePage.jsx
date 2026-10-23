import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import ServiceCard from '../components/ServiceCard'

export default function HomePage() {
  const [services, setServices] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/services/')
      .then(({ data }) => setServices(data.slice(0, 3)))
      .catch(() => setError('Services are temporarily unavailable. Please try again soon.'))
  }, [])

  return (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> YOUR HOME, IN GOOD HANDS</div>
          <h1>Good help.<br /><em>Right at home.</em></h1>
          <p>From a leaky tap to a fresh coat of paint, find trusted local professionals who make home care feel simple.</p>
          <div className="hero-actions">
            <Link className="button button-dark" to="/services">Explore services <span aria-hidden="true">↗</span></Link>
            <span className="hero-note"><span className="avatar-stack"><i>A</i><i>R</i><i>M</i></span> Helpful hands, right around the corner</span>
          </div>
          <div className="hero-stats">
            <div><strong>On your time</strong><span>Pick a slot that works</span></div>
            <div><strong>Clear pricing</strong><span>Know before you book</span></div>
            <div><strong>Local care</strong><span>Made for your home</span></div>
          </div>
        </div>
        <div className="hero-art" aria-label="Illustration of a cozy home and a service professional" role="img">
          <div className="sun-shape" />
          <div className="art-note note-top"><span>✳</span> A little help goes a long way</div>
          <div className="home-illustration">
            <div className="roof" /><div className="house"><div className="window window-left" /><div className="door" /><div className="window window-right" /><div className="plant plant-one">✿</div><div className="plant plant-two">✿</div></div>
            <div className="worker"><div className="worker-head"><span /></div><div className="worker-body"><i /></div><div className="worker-leg leg-one" /><div className="worker-leg leg-two" /></div>
            <div className="toolbox">⌁</div>
          </div>
          <div className="art-note note-bottom"><span>✓</span> Book with confidence</div>
        </div>
      </section>

      <section className="trust-strip">
        <span>THE EVERYDAY FIXES, MADE EASY</span><span className="trust-separator" />
        <span>Electrician</span><span>Plumber</span><span>Painter</span><span>Cleaner</span><span>Carpenter</span>
      </section>

      <section className="content-section featured-section">
        <div className="section-heading">
          <div><div className="eyebrow">A GOOD PLACE TO START</div><h2>Care for every corner.</h2></div>
          <Link className="text-link" to="/services">See all services <span aria-hidden="true">↗</span></Link>
        </div>
        {error ? <div className="notice notice-error">{error}</div> : services.length ? (
          <div className="service-grid">{services.map((service) => <ServiceCard key={service.id} service={service} />)}</div>
        ) : <div className="empty-state"><span className="empty-icon">✳</span><h3>Our service list is growing.</h3><p>Check back soon for more ways we can help at home.</p></div>}
      </section>

      <section className="promise-band">
        <div><span className="promise-icon">✳</span><div><strong>Simple from the start</strong><span>Choose a service, pick a time, and let us take it from there.</span></div></div>
        <div className="promise-divider" />
        <div><span className="promise-icon">⌂</span><div><strong>Care that feels close</strong><span>Thoughtful help for the place that matters most.</span></div></div>
        <Link to="/services" className="promise-link">Find your service <span aria-hidden="true">↗</span></Link>
      </section>
    </>
  )
}
