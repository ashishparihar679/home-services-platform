import { Link, Outlet } from 'react-router-dom'
import Navbar from './Navbar'

const CURRENT_YEAR = new Date().getFullYear()

export default function SiteLayout() {
  return (
    <>
      <Navbar />
      <main><Outlet /></main>
      <footer className="site-footer">
        <Link className="brand brand-footer" to="/">
          <span className="brand-mark">b</span><span>Bloom<span className="brand-light">care</span><small>HOME SERVICES</small></span>
        </Link>
        <span>Making home feel like home, every day.</span>
        <span>© {CURRENT_YEAR} Bloom IT Solutions</span>
      </footer>
    </>
  )
}
