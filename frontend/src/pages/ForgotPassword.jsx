import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/password/reset/', { email })
    } catch {}
    // Always show success to prevent user enumeration
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="auth-box">
      <h1>Reset Password</h1>
      <div className="card">
        {sent ? (
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:15, marginBottom:16}}>
              If that email exists, a reset link has been sent. Check your inbox.
            </p>
            <Link to="/login" style={{color:'#6c63ff'}}>Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your account email"
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <p style={{textAlign:'center', marginTop:16, fontSize:14}}>
              <Link to="/login" style={{color:'#6c63ff'}}>Back to Login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
