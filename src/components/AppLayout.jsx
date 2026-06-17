import { Outlet, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'
import Sidebar from './Sidebar'

const AUTH_PATHS = ['/login', '/signup']

export default function AppLayout() {
  const location = useLocation()

  if (AUTH_PATHS.includes(location.pathname)) {
    return <Outlet />
  }

  return (
    <div className="min-h-screen bg-[#F0F2F7] dark:bg-[#0F0C29] transition-colors duration-300">
      <Sidebar />

      <div className="md:ml-60">
        <main className="pb-36 md:pb-0">
          <Outlet />
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
