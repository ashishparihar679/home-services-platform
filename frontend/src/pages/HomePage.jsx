import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/client'
import HeroServiceCarousel from '../components/HeroServiceCarousel'
import ServiceCard from '../components/ServiceCard'

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 4l6 6-6 6" /></svg>
}

const benefits = [
  { icon: '⌕', title: 'Easy booking', description: 'Choose a listed service and share the time and details that work for you.' },
  { icon: '✓', title: 'Reviewed professionals', description: 'Worker profiles are reviewed by an administrator before they can receive jobs.' },
  { icon: '₹', title: 'Transparent pricing', description: 'Review the listed service price before you send a booking request.' },
  { icon: '↗', title: 'Booking updates', description: 'Follow your request and see the accepted professional in your account.' },
]

const steps = [
  { number: '01', title: 'Choose your service', description: 'Browse active services and review their listed prices.' },
  { number: '02', title: 'Submit your booking', description: 'Share your preferred date, time, address, and service details.' },
  { number: '03', title: 'Track your booking', description: 'Check the status and accepted professional from your account.' },
]

export default function HomePage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api.get('/services/')
      .then(({ data }) => { if (active) setServices(data.filter((service) => service.is_active).slice(0, 6)) })
      .catch(() => { if (active) setError('Services are temporarily unavailable. Please try again soon.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const sections = document.querySelectorAll('.home-page [data-reveal]')
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-revealed'))
      return undefined
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        }
      })
    }, { threshold: 0.14, rootMargin: '0px 0px -35px 0px' })
    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="home-page">
      <section className="home-hero cinematic-home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> A BETTER WAY TO CARE FOR YOUR HOME</div>
          <h1 id="home-hero-title">Your Home,<br /><em>Our Care.</em></h1>
          <p>Book trusted professionals for all your home service needs.</p>
          <div className="home-hero-actions">
            <Link className="button button-dark" to="/services">Book a Service <Arrow /></Link>
            <Link className="button button-outline" to="/services">Explore Services</Link>
          </div>
          <div className="home-hero-trust" aria-label="Bloomcare booking features">
            <span><i aria-hidden="true">✓</i> Clear service prices</span>
            <span><i aria-hidden="true">✓</i> Professional services</span>
            <span><i aria-hidden="true">✓</i> Booking status updates</span>
          </div>
        </div>
        <HeroServiceCarousel services={services} loading={loading} error={error} />
      </section>

      <section className="home-service-section featured-glass-section" aria-labelledby="popular-services-title" data-reveal>
        <div className="home-section-heading">
          <div><div className="eyebrow">REAL SERVICES, CURRENT PRICES</div><h2 id="popular-services-title">Find the help that fits.</h2><p>Explore the services currently available through Bloomcare.</p></div>
          <Link className="text-link" to="/services">View all services <Arrow /></Link>
        </div>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {loading ? <div className="service-grid home-service-grid" aria-label="Loading services">{[0, 1, 2, 3].map((item) => <div className="service-skeleton" key={item} aria-hidden="true"><span /><span /><span /><span /></div>)}</div> : services.length ? (
          <div className="featured-service-rail">{services.slice(0, 6).map((service) => <ServiceCard key={service.id} service={service} />)}</div>
        ) : !error ? <div className="empty-state home-empty-state"><span className="empty-icon" aria-hidden="true">⌂</span><h3>We’re getting the service list ready.</h3><p>Check back soon for available home services.</p></div> : null}
      </section>

      <section className="home-benefits-section" aria-labelledby="why-bloomcare-title" data-reveal>
        <div className="home-section-heading home-section-heading-centered"><div className="eyebrow">BUILT AROUND YOUR BOOKING</div><h2 id="why-bloomcare-title">A little more clarity at every step.</h2><p>Thoughtful details that help you plan and follow your request.</p></div>
        <div className="benefit-glass-grid">{benefits.map((benefit) => <article className="benefit-glass-card" key={benefit.title}><span aria-hidden="true">{benefit.icon}</span><h3>{benefit.title}</h3><p>{benefit.description}</p></article>)}</div>
      </section>

      <section className="how-it-works-section cinematic-steps" aria-labelledby="how-it-works-title" data-reveal>
        <div className="home-section-heading home-section-heading-centered"><div className="eyebrow">A CLEARER WAY TO BOOK</div><h2 id="how-it-works-title">From request to right at home.</h2><p>A few simple steps take your request from idea to doorstep.</p></div>
        <div className="process-grid">{steps.map((step) => <article className="process-card" key={step.number}><span className="process-number">{step.number}</span><span className="process-symbol" aria-hidden="true">{step.number === '01' ? '⌕' : step.number === '02' ? '◷' : '✓'}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
        <Link className="text-link cinematic-more-link" to="/how-it-works">See how booking works <Arrow /></Link>
      </section>

      <section className="home-about-section cinematic-about" aria-labelledby="about-title" data-reveal>
        <div className="about-orbit" aria-hidden="true"><span>⌂</span><i /><i /><i /></div>
        <div className="about-copy"><div className="eyebrow">WHY BLOOMCARE</div><h2 id="about-title">Good help, with a little more clarity.</h2><p>Bloomcare brings active services, professional applications, and booking updates into one simple place.</p>
          <Link className="text-link" to="/about">More about Bloomcare <Arrow /></Link>
        </div>
      </section>

      <section className="home-final-cta cinematic-cta" aria-labelledby="home-final-title" data-reveal>
        <div><div className="eyebrow">READY WHEN YOU ARE</div><h2 id="home-final-title">Ready to take care of your home?</h2><p>Explore current services and send a booking request in just a few steps.</p></div>
        <div className="home-final-actions"><Link className="button button-light" to="/services">Book a service <Arrow /></Link><Link className="home-contact-link" to="/login">Need a booking update? Sign in <Arrow /></Link></div>
      </section>
    </div>
  )
}
