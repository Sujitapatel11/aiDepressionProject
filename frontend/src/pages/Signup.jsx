import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '', password_confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.password_confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/signup/', form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('userId', String(data.user_id))
      navigate('/dashboard')
    } catch (err) {
      const d = err.response?.data
      setError(d?.username?.[0] || d?.email?.[0] || d?.password?.[0] || d?.detail || 'Signup failed.')
    } finally {
      setLoading(false)
    }
  }

  const f = (k) => ({ value: form[k], onChange: e => setForm({...form, [k]: e.target.value}) })

  return (
    <div className="auth-box">
      <h1>Create Account</h1>
      <div className="card">
        <form onSubmit={handleSubmit}>
          {['username','email'].map(k => (
            <div className="form-group" key={k}>
              <label>{k.charAt(0).toUpperCase()+k.slice(1)}</label>
              <input {...f(k)} type={k==='email'?'email':'text'} required />
            </div>
          ))}
          <div className="form-group">
            <label>Password</label>
            <input {...f('password')} type="password" required minLength={6} />
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input {...f('password_confirm')} type="password" required />
          </div>
          {error && <p className="error">{error}</p>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p style={{textAlign:'center', marginTop:16, fontSize:14}}>
          Have an account? <Link to="/login" style={{color:'#6c63ff'}}>Log in</Link>
        </p>
      </div>
    </div>
  )
}
