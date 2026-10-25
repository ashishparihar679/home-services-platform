import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 4l6 6-6 6" /></svg>
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogout = () => { logout(); setMenuOpen(false); navigate('/') }
  const links = [
    { to: '/', label: 'Home', end: true },
    { to: '/services', label: 'Services' },
    { to: '/#how-it-works', label: 'How it works' },
    { to: '/#about', label: 'About' },
    { to: '/#contact', label: 'Contact' },
    ...(user?.role === 'customer' ? [
      { to: '/dashboard', label: 'Dashboard' }, { to: '/my-bookings', label: 'My bookings' }, { to: '/profile', label: 'Profile' },
    ] : user?.role === 'worker' ? [
      { to: '/worker/dashboard#jobs', label: 'My jobs' }, { to: '/worker/profile', label: 'Worker profile' },
    ] : user?.role === 'admin' ? [
      { to: '/admin', label: 'Admin' }, { to: '/admin/workers', label: 'Workers' },
      ...(user.is_superuser === true ? [{ to: '/super-dashboard', label: 'Analytics' }] : []),
    ] : []),
  ]

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" to="/" aria-label="Bloomcare home"><span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z" /><path d="M8 9h.01M16 9h.01" /></svg></span><span>Bloom<span className="brand-light">care</span><small>HOME SERVICES</small></span></Link>
        <button className="nav-menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => setMenuOpen((open) => !open)}><span /><span /><span /></button>
        <nav id="primary-navigation" className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {links.map(({ to, label, end }) => <NavLink key={label} to={to} end={end} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
          {!user && <div className="mobile-auth-links"><Link to="/login" onClick={() => setMenuOpen(false)}>Log in</Link><Link to="/register" onClick={() => setMenuOpen(false)}>Create account</Link></div>}
        </nav>
        <div className={`nav-actions ${user ? 'is-authenticated' : 'is-guest'}`}>
          {user ? <><span className="nav-greeting">Hi, {user.first_name || user.username}</span><Link className="button button-nav-primary" to="/services">Book a service <Arrow /></Link><button className="button button-nav-logout" type="button" onClick={handleLogout}>Log out</button></> : <><Link className="nav-login" to="/login">Log in</Link><Link className="button button-nav-primary" to="/services">Book a service <Arrow /></Link></>}
        </div>
      </div>
    </header>
  )
}
