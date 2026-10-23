import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="nav-shell">
        <Link className="brand" to="/" aria-label="Bloom home">
          <span className="brand-mark">b</span>
          <span>Bloom<span className="brand-light">care</span><small>HOME SERVICES</small></span>
        </Link>
        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/services">Services</NavLink>
          {user && <NavLink to="/my-bookings">My bookings</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-greeting">Hi, {user.first_name || user.username}</span>
              <button className="button button-outline button-small" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <Link className="nav-login" to="/login">Log in</Link>
              <Link className="button button-primary button-small" to="/register">Get started <span aria-hidden="true">↗</span></Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
