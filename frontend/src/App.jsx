import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import SiteLayout from './components/SiteLayout'
import ProtectedRoute from './components/ProtectedRoute'
import AdminDashboard from './pages/AdminDashboard'
import { BookServicePage, MyBookingsPage } from './pages/BookingsPages'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { CustomerDashboard, ProfilePage, SuperDashboard, WorkerDashboard, WorkerProfilePage } from './pages/DashboardPages'
import WorkerManagement from './pages/WorkerManagement'
import HomePage from './pages/HomePage'
import ServicesPage from './pages/ServicesPage'
import { AuthProvider } from './context/AuthContext'
import './App.css'

function NotFoundPage() {
  return <section className="empty-state not-found"><span className="empty-icon">⌂</span><div className="eyebrow">A LITTLE DETOUR</div><h1>We can’t find that page.</h1><p>Let’s get you back to the good stuff.</p><Link className="button button-dark" to="/">Back home <span aria-hidden="true">↗</span></Link></section>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route element={<ProtectedRoute allowedRoles={['customer']} />}>
              <Route path="services/:serviceId/book" element={<BookServicePage />} />
              <Route path="my-bookings" element={<MyBookingsPage />} />
              <Route path="dashboard" element={<CustomerDashboard />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="profile" element={<ProfilePage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['worker']} />}>
              <Route path="worker/dashboard" element={<WorkerDashboard />} />
              <Route path="worker/profile" element={<WorkerProfilePage />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/workers" element={<WorkerManagement />} />
            </Route>
            <Route element={<ProtectedRoute superuserOnly />}>
              <Route path="super-dashboard" element={<SuperDashboard />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
