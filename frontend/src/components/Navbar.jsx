import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
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
  { to: '/how-it-works', label: 'How it works' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
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
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 40 40" focusable="false">
            <path className="brand-house-fill" d="M7 18.5 20 8l13 10.5V32a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2Z" />
            <path className="brand-house-line" d="M4.5 19.5 20 7l15.5 12.5M16 34v-9a4 4 0 0 1 8 0v9M11.5 22h3v3h-3z" />
            <path className="brand-leaf" d="M21 19.5c2.1-3.5 5.8-3.7 8-3.4-.2 2.9-2 5.4-6.2 5.8" />
            <path className="brand-leaf-vein" d="M22.7 21.3c1.2-1.6 2.8-2.9 4.8-4.1" />
          </svg></span>
          <span className="brand-copy"><span className="brand-name">Bloom<span className="brand-light">care</span></span><small>HOME SERVICES</small></span>
        </Link>

        <button className={`nav-menu-toggle ${menuOpen ? 'is-open' : ''}`} type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="primary-navigation" onClick={() => { setMenuOpen((open) => !open); setAccountOpen(false) }}>
          <span /><span /><span />
        </button>

        <nav id="primary-navigation" className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
          {publicLinks.map(({ to, label, end }) => <NavLink key={label} to={to} end={end} onClick={closeMenus}>{label}</NavLink>)}
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
