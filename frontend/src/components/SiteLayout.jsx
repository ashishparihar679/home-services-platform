import { Link, Outlet } from 'react-router-dom'
import Navbar from './Navbar'

const CURRENT_YEAR = new Date().getFullYear()

export default function SiteLayout() {
  return <>
    <Navbar />
    <main><Outlet /></main>
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand-column"><Link className="brand brand-footer" to="/"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><path className="brand-house-fill" d="M7 18.5 20 8l13 10.5V32a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" /><path className="brand-house-line" d="M4.5 19.5 20 7l15.5 12.5M16 34v-9a4 4 0 0 1 8 0v9M11.5 22h3v3h-3z" /><path className="brand-leaf" d="M21 19.5c2.1-3.5 5.8-3.7 8-3.4-.2 2.9-2 5.4-6.2 5.8" /><path className="brand-leaf-vein" d="M22.7 21.3c1.2-1.6 2.8-2.9 4.8-4.1" /></svg></span><span>Bloom<span className="brand-light">care</span><small>HOME SERVICES</small></span></Link><p>Thoughtful home services, booked in a few simple steps.</p></div>
        <div className="footer-link-column"><strong>Explore</strong><Link to="/services">Services</Link><Link to="/how-it-works">How it works</Link><Link to="/about">About Bloomcare</Link><Link to="/contact">Contact</Link></div>
        <div className="footer-link-column"><strong>Your account</strong><Link to="/login">Customer login</Link><Link to="/register">Create an account</Link><Link to="/register">Join as a worker</Link></div>
        <div className="footer-link-column footer-contact-column"><strong>Booking support</strong><p>Sign in to view booking updates and manage your requests.</p><Link to="/contact">Contact options <span aria-hidden="true">↗</span></Link></div>
      </div>
      <div className="footer-bottom"><span>© {CURRENT_YEAR} Bloom IT Solutions</span><span>Made for the place that matters most.</span></div>
    </footer>
  </>
}
