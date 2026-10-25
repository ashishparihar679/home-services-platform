import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M10 4l6 6-6 6" /></svg>
}

function Chevron() {
  return <svg className="account-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
}

const publicLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/services', label: 'Services' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/#about', label: 'About' },
  { to: '/#contact', label: 'Contact' },
]

function accountLinks(user) {
  if (user?.role === 'customer') return [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/my-bookings', label: 'My bookings' },
    { to: '/profile', label: 'Profile' },
  ]
  if (user?.role === 'worker') return [
    { to: '/worker/dashboard', label: 'Worker dashboard' },
    { to: '/worker/profile', label: 'Worker profile' },
  ]
  if (user?.role === 'admin') return [
    { to: '/admin', label: 'Admin dashboard' },
    { to: '/admin/workers', label: 'Worker applications' },
    { to: '/profile', label: 'Profile' },
    ...(user.is_superuser === true ? [{ to: '/super-dashboard', label: 'Analytics' }] : []),
  ]
  return []
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const accountRef = useRef(null)
  const roleLinks = accountLinks(user)

  useEffect(() => {
    if (!accountOpen && !menuOpen) return undefined

    const closeOnOutsideClick = (event) => {
      if (accountOpen && !accountRef.current?.contains(event.target)) setAccountOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') { setAccountOpen(false); setMenuOpen(false) }
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [accountOpen, menuOpen])

  const closeMenus = () => { setMenuOpen(false); setAccountOpen(false) }
  const handleLogout = () => { logout(); closeMenus(); navigate('/') }
  const displayName = user?.first_name || user?.username || 'Account'
  const canBook = !user || user.role === 'customer'

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" to="/" aria-label="Bloomcare home" onClick={closeMenus}>
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1V10Z" /><path d="M8 9h.01M16 9h.01" /></svg></span>
          <span>Bloom<span className="brand-light">care</span><small>HOME SERVICES</small></span>
        </Link>

        <button className={`nav-menu-toggle ${menuOpen ? 'is-open' : ''}`} type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => { setMenuOpen((open) => !open); setAccountOpen(false) }}>
          <span /><span /><span />
        </button>

        <nav id="primary-navigation" className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {publicLinks.map(({ to, label, end }) => to.includes('#')
            ? <Link key={label} to={to} className={location.hash === to.slice(to.indexOf('#')) ? 'active' : undefined} aria-current={location.hash === to.slice(to.indexOf('#')) ? 'page' : undefined} onClick={closeMenus}>{label}</Link>
            : <NavLink key={label} to={to} end={end} onClick={closeMenus}>{label}</NavLink>)}
          <div className="mobile-nav-secondary">
            {user ? <>
              {roleLinks.map(({ to, label }) => <NavLink key={label} to={to} onClick={closeMenus}>{label}</NavLink>)}
              <button className="mobile-logout" type="button" onClick={handleLogout}>Log out</button>
            </> : <>
              <Link to="/login" onClick={closeMenus}>Log in</Link>
              <Link to="/register" onClick={closeMenus}>Sign up</Link>
            </>}
          </div>
        </nav>

        <div className={`nav-actions ${user ? `is-authenticated role-${user.role}` : 'is-guest'}`}>
          {user && <div className="nav-account" ref={accountRef}>
            <button className="nav-account-trigger" type="button" aria-expanded={accountOpen} aria-controls="account-navigation" onClick={() => { setAccountOpen((open) => !open); setMenuOpen(false) }}>
              <span className="account-avatar" aria-hidden="true">{displayName.slice(0, 1).toUpperCase()}</span><span className="account-trigger-label">{displayName}</span><Chevron />
            </button>
            {accountOpen && <div className="nav-account-menu" id="account-navigation" aria-label="Account navigation">
              <span className="account-menu-heading">Your account</span>
              {roleLinks.map(({ to, label }) => <NavLink key={label} to={to} onClick={closeMenus}>{label}</NavLink>)}
              <button className="account-logout" type="button" onClick={handleLogout}>Log out</button>
            </div>}
          </div>}
          {!user && <div className="nav-guest-links"><Link className="nav-login" to="/login">Log in</Link><Link className="nav-signup" to="/register">Sign up</Link></div>}
          {canBook && <Link className="button button-nav-primary" to="/services" onClick={closeMenus}>Book a service <Arrow /></Link>}
        </div>
      </div>
    </header>
  )
}
