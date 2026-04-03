import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Load Google Identity Services script
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      })
      window.google?.accounts.id.renderButton(
        document.getElementById('google-btn'),
        { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
      )
    }
    document.body.appendChild(script)
  }, [])

  async function handleGoogleResponse(response) {
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/google/', { id_token: response.credential })
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', String(data.user_id))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Google login failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data } = await api.post('/auth/login/', form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', String(data.user_id))
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-box">
      <h1>🧠 MindSpace</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
          </div>
          <div style={{textAlign:'right', marginBottom:12}}>
            <Link to="/forgot-password" style={{fontSize:13, color:'#6c63ff'}}>Forgot password?</Link>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {GOOGLE_CLIENT_ID && (
          <>
            <div style={{textAlign:'center', margin:'16px 0', color:'#aaa', fontSize:13}}>or</div>
            <div id="google-btn" style={{display:'flex', justifyContent:'center'}}></div>
          </>
        )}

        <p style={{textAlign:'center', marginTop:16, fontSize:14}}>
          No account? <Link to="/signup" style={{color:'#6c63ff'}}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}
