import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import homeServiceFallback from '../assets/bloomcare-home-fallback.webp'

const serviceImages = [
  { terms: ['electric', 'wiring'], source: 'https://images.unsplash.com/photo-1758101755915-462eddc23f57?auto=format&fit=crop&w=1100&q=80', alt: 'Electrician testing home electrical equipment' },
  { terms: ['plumb', 'sink', 'tap'], source: 'https://images.unsplash.com/photo-1749532125405-70950966b0e5?auto=format&fit=crop&w=1100&q=80', alt: 'Plumber repairing bathroom plumbing' },
  { terms: ['clean', 'sweep'], source: 'https://images.unsplash.com/photo-1775178120132-f0ff7fd5cb40?auto=format&fit=crop&w=1100&q=80', alt: 'Professional cleaner washing a window' },
  { terms: ['paint'], source: 'https://images.unsplash.com/photo-1652829069834-2c05031199c5?auto=format&fit=crop&w=1100&q=80', alt: 'Painter rolling paint onto a wall' },
  { terms: ['weld'], source: 'https://images.unsplash.com/photo-1764245546004-e6b743242a80?auto=format&fit=crop&w=1100&q=80', alt: 'Welder working safely in a workshop' },
]

function imageFor(service) {
  const searchable = `${service?.category || ''} ${service?.name || ''}`.toLowerCase()
  return serviceImages.find(({ terms }) => terms.some((term) => searchable.includes(term))) || {
    source: homeServiceFallback,
    alt: `${service?.name || 'Home maintenance'} professional at work`,
  }
}

function handleImageError(event) {
  if (event.currentTarget.dataset.fallbackApplied) return
  event.currentTarget.dataset.fallbackApplied = 'true'
  if (!event.currentTarget.hasAttribute('aria-hidden')) event.currentTarget.alt = 'Home service professional at work'
  event.currentTarget.src = homeServiceFallback
}

function Arrow({ direction = 'next' }) {
  return <svg className={direction === 'previous' ? 'arrow-flip' : ''} viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 4l6 6-6 6" /></svg>
}

function modulo(value, length) {
  return ((value % length) + length) % length
}

export default function HeroServiceCarousel({ services, loading, error }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const touchStartX = useRef(null)
  const count = services.length
  const activeService = count ? services[modulo(activeIndex, count)] : null
  const range = count > 2 ? 2 : Math.max(0, count - 1)

  useEffect(() => {
    if (count < 2 || hovered || focused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const timer = window.setInterval(() => setActiveIndex((index) => (index + 1) % count), 5200)
    return () => window.clearInterval(timer)
  }, [count, hovered, focused])

  const previous = () => setActiveIndex((index) => modulo(index - 1, count))
  const next = () => setActiveIndex((index) => (index + 1) % count)
  const handleKeyDown = (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); previous() }
    if (event.key === 'ArrowRight') { event.preventDefault(); next() }
  }
  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return
    const touch = event.changedTouches[0]
    if (!touch) { touchStartX.current = null; return }
    const distance = touch.clientX - touchStartX.current
    if (Math.abs(distance) > 45) {
      if (distance > 0) previous()
      else next()
    }
    touchStartX.current = null
  }

  return (
    <section className="hero-carousel" aria-label="Featured home services">
      <div className="hero-carousel-backdrop" style={{ backgroundImage: `url(${imageFor(activeService).source})` }} aria-hidden="true" />
      <div className="hero-carousel-glow" aria-hidden="true" />
      {loading ? <div className="carousel-status" role="status">Finding available services…</div> : error ? <div className="carousel-status carousel-status-error" role="alert">Services are temporarily unavailable. Please browse again shortly.</div> : !activeService ? <div className="carousel-status"><span className="eyebrow">BLOOMCARE SERVICES</span><h2>New services are on the way.</h2><p>Check back soon to explore what’s available in your area.</p><Link className="button button-carousel" to="/services">View services <Arrow /></Link></div> : <>
        <div className="hero-carousel-stage" role="group" aria-roledescription="carousel" aria-label={`Featured service ${activeIndex + 1} of ${count}`} tabIndex="0" onKeyDown={handleKeyDown} onMouseEnter={() => setHovered(true)} onMouseLeave={(event) => { setHovered(false); event.currentTarget.style.setProperty('--parallax-x', '0px'); event.currentTarget.style.setProperty('--parallax-y', '0px') }} onPointerMove={(event) => { if (event.pointerType === 'touch') return; const bounds = event.currentTarget.getBoundingClientRect(); event.currentTarget.style.setProperty('--parallax-x', `${((event.clientX - bounds.left) / bounds.width - .5) * 7}px`); event.currentTarget.style.setProperty('--parallax-y', `${((event.clientY - bounds.top) / bounds.height - .5) * 7}px`) }} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }} onTouchStart={(event) => { touchStartX.current = event.touches[0].clientX }} onTouchEnd={handleTouchEnd}>
          {Array.from({ length: range * 2 + 1 }, (_, position) => position - range).map((offset) => {
            const service = services[modulo(activeIndex + offset, count)]
            const active = offset === 0
            const position = Math.abs(offset)
            const cardStyle = {
              transform: `translate(calc(-50% + var(--parallax-x, 0px)), calc(-50% + var(--parallax-y, 0px))) translateX(${offset * 49}%) translateZ(${-position * 95}px) rotateY(${offset * -11}deg) scale(${1 - position * 0.11})`,
              zIndex: 10 - position,
              opacity: 1 - position * 0.24,
            }
            const cardImage = imageFor(service)
            return active ? <article className="hero-service-card is-active" key={`${service.id}-${offset}`} style={cardStyle} aria-current="true">
              <img className="hero-card-image" src={cardImage.source} alt={cardImage.alt} loading="eager" fetchPriority="high" decoding="async" onError={handleImageError} />
              <div className="hero-card-topline"><span className="hero-card-mark" aria-hidden="true">✳</span><span className="hero-card-index">{String(activeIndex + 1).padStart(2, '0')} <i>/</i> {String(count).padStart(2, '0')}</span></div>
              <div className="hero-card-content"><span className="hero-card-category">{service.category?.replaceAll('_', ' ') || 'Home service'}</span><h2>{service.name}</h2><p>{service.description}</p><div className="hero-card-bottom"><strong>₹{Number(service.price).toLocaleString('en-IN')}<small> / visit</small></strong><Link className="button button-carousel" to={`/services/${service.id}/book`}>Book this service <Arrow /></Link></div></div>
            </article> : <button className="hero-service-card hero-service-preview" key={`${service.id}-${offset}`} type="button" style={cardStyle} aria-label={`Show ${service.name}`} onClick={() => setActiveIndex(modulo(activeIndex + offset, count))}>
              <img className="hero-card-image" src={cardImage.source} alt="" aria-hidden="true" loading="lazy" decoding="async" onError={handleImageError} />
              <span className="hero-preview-category">{service.category?.replaceAll('_', ' ') || 'Home service'}</span><strong>{service.name}</strong><span className="hero-preview-price">₹{Number(service.price).toLocaleString('en-IN')}</span>
            </button>
          })}
        </div>
        <div className="hero-carousel-controls" aria-label="Service carousel controls">
          <button type="button" className="carousel-arrow" onClick={previous} aria-label="Previous service" disabled={count < 2}><Arrow direction="previous" /></button>
          <div className="carousel-dots" role="group" aria-label="Choose a featured service">{services.map((service, index) => <button key={service.id} type="button" className={`carousel-dot ${index === activeIndex ? 'is-active' : ''}`} aria-label={`Show ${service.name}`} aria-current={index === activeIndex ? 'true' : undefined} onClick={() => setActiveIndex(index)} />)}</div>
          <button type="button" className="carousel-arrow" onClick={next} aria-label="Next service" disabled={count < 2}><Arrow /></button>
        </div>
      </>}
    </section>
  )
}
