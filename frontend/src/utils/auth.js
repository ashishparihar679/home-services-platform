export function dashboardPath(user) {
  if (user?.role === 'admin') return '/admin'
  if (user?.role === 'worker') return '/worker/dashboard'
  if (user?.role === 'customer') return '/dashboard'
  return '/services'
}
