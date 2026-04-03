import { Outlet, Link, useNavigate } from 'react-router-dom'

export default function Layout() {
  const navigate = useNavigate()

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
    navigate('/login')
  }

  return (
    <>
      <nav>
        <span className="brand">🧠 MindSpace</span>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/journal">Journal</Link>
        <Link to="/insights">Insights</Link>
        <Link to="/support">Support</Link>
        <button className="btn-secondary" onClick={logout} style={{marginLeft:'auto'}}>Logout</button>
      </nav>
      <Outlet />
    </>
  )
}
