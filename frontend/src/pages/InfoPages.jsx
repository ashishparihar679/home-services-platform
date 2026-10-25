import { Link } from 'react-router-dom'

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 4l6 6-6 6" /></svg>
}

const bookingSteps = [
  { number: '01', title: 'Choose your service', description: 'Browse the active services and see the listed price before you book.' },
  { number: '02', title: 'Set a time and place', description: 'Tell us the date, time, contact number, address, and what needs attention. You can request an available professional when suggestions appear.' },
  { number: '03', title: 'Follow your request', description: 'Your request starts as pending. Check My Bookings for status updates and see the professional’s name after the assignment is accepted.' },
]

export function HowItWorksPage() {
  return (
    <section className="content-section page-section info-page how-page">
      <div className="info-page-hero">
        <div className="eyebrow">HOW BLOOMCARE WORKS</div>
        <h1 className="page-title">A simple path from booking to done.</h1>
        <p className="section-intro">Tell us what your home needs. We’ll keep your request and its updates together in your account.</p>
      </div>
      <div className="info-step-grid">
        {bookingSteps.map((step) => <article className="info-step-card" key={step.number}>
          <span className="info-step-number">{step.number}</span>
          <span className="info-step-icon" aria-hidden="true">{step.number === '01' ? '⌕' : step.number === '02' ? '◷' : '✓'}</span>
          <h2>{step.title}</h2>
          <p>{step.description}</p>
        </article>)}
      </div>
      <div className="info-note">
        <div><div className="eyebrow">AFTER YOU BOOK</div><h2>Know where things stand.</h2><p>Requests remain pending until reviewed. When a worker accepts an assignment, their name appears in your booking details. You can cancel while the booking status allows it.</p></div>
        <Link className="button button-dark" to="/services">Explore services <Arrow /></Link>
      </div>
    </section>
  )
}

export function AboutPage() {
  return (
    <section className="content-section page-section info-page about-page">
      <div className="info-page-hero">
        <div className="eyebrow">ABOUT BLOOMCARE</div>
        <h1 className="page-title">A little more care in every step.</h1>
        <p className="section-intro">Bloomcare brings home service requests, professional applications, and booking updates into one place.</p>
      </div>
      <div className="about-story-panel">
        <div className="about-story-mark" aria-hidden="true">⌂</div>
        <div><div className="eyebrow">CARE THAT’S EASY TO FOLLOW</div><h2>Made for the work that makes a house feel like home.</h2><p>Customers can browse active services, see their prices, send a booking request, and follow its status. Professionals can apply to join and manage assigned work after approval. Administrators review worker profiles and coordinate bookings.</p></div>
      </div>
      <div className="info-value-grid">
        <article><span aria-hidden="true">₹</span><h2>Prices shown upfront</h2><p>Service prices come from the current service listing, so customers can review the listed amount before requesting a booking.</p></article>
        <article><span aria-hidden="true">✓</span><h2>Profiles reviewed</h2><p>Worker profiles are reviewed by an administrator before professionals can receive eligible jobs.</p></article>
        <article><span aria-hidden="true">↗</span><h2>Updates in one place</h2><p>Signed-in customers can see booking status, appointment details, and an accepted professional in My Bookings.</p></article>
      </div>
      <div className="info-page-cta"><div><div className="eyebrow">GET STARTED</div><h2>Find the help your home needs.</h2></div><Link className="button button-dark" to="/services">Browse services <Arrow /></Link></div>
    </section>
  )
}

export function ContactPage() {
  return (
    <section className="content-section page-section info-page contact-page">
      <div className="info-page-hero">
        <div className="eyebrow">CONTACT BLOOMCARE</div>
        <h1 className="page-title">How can we help?</h1>
        <p className="section-intro">Choose the option that best matches what you need. Your account keeps booking information private and easy to find.</p>
      </div>
      <div className="contact-options-grid">
        <article className="contact-option-card"><span className="contact-option-icon" aria-hidden="true">◷</span><div className="eyebrow">EXISTING BOOKING</div><h2>Check a booking or its status</h2><p>Sign in to view your appointment, current status, accepted professional, and cancellation option when available.</p><Link className="text-link" to="/login">Go to sign in <Arrow /></Link></article>
        <article className="contact-option-card"><span className="contact-option-icon" aria-hidden="true">⌂</span><div className="eyebrow">HOME SERVICE</div><h2>Request a service</h2><p>Browse active services, compare the listed prices, and send a request with your preferred date and details.</p><Link className="text-link" to="/services">Browse services <Arrow /></Link></article>
        <article className="contact-option-card"><span className="contact-option-icon" aria-hidden="true">✳</span><div className="eyebrow">WORK WITH BLOOMCARE</div><h2>Join as a professional</h2><p>Create an account and submit your worker profile for administrator review.</p><Link className="text-link" to="/register">Create an account <Arrow /></Link></article>
      </div>
      <p className="contact-availability-note">Public phone and email contact details are not configured on this website yet.</p>
    </section>
  )
}
