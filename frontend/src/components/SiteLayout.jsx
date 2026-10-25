import { Link, Outlet } from 'react-router-dom'
import Navbar from './Navbar'

const CURRENT_YEAR = new Date().getFullYear()

export default function SiteLayout() {
  return <>
    <Navbar />
    <main><Outlet /></main>
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-column"><Link className="brand brand-footer" to="/"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z" /></svg></span><span>Bloom<span className="brand-light">care</span><small>HOME SERVICES</small></span></Link><p>Thoughtful home services, booked in a few simple steps.</p></div>
        <div className="footer-link-column"><strong>Explore</strong><Link to="/services">Services</Link><Link to="/#how-it-works">How it works</Link><Link to="/#about">About Bloomcare</Link></div>
        <div className="footer-link-column"><strong>Your account</strong><Link to="/login">Customer login</Link><Link to="/register">Create an account</Link><Link to="/register">Join as a worker</Link></div>
        <div className="footer-link-column footer-contact-column"><strong>Booking support</strong><p>Sign in to view booking updates and manage your requests.</p><Link to="/login">Go to your account <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className="footer-bottom"><span>© {CURRENT_YEAR} Bloom IT Solutions</span><span>Made for the place that matters most.</span></div>
    </footer>
  </>
}
