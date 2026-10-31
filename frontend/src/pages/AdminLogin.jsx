import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
try{
    const response = await api.post('/admin/login', {
        email,
        password,
        })

      localStorage.setItem('metroAdmin', JSON.stringify(response.data))
      window.location.href = '/admin-dashboard'
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Admin login failed. Please check your credentials.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold text-teal-800">
          MetroGo Admin
        </h1>

        <p className="mt-2 text-center text-slate-600">
          Sign in to manage the metro reservation system.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block font-medium">
                Admin Email
            </label>
            <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
                placeholder="Enter admin email"
            />
            </div>

          <div>
            <label htmlFor="password" className="mb-2 block font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-teal-600"
              placeholder="Enter password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-700 px-5 py-3 font-bold text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Admin Login'}
          </button>
        </form>

        <button
  type="button"
  onClick={() => {
    window.location.href = '/choose-login'
  }}
  className="mt-6 w-full text-center font-medium text-slate-600 hover:text-teal-800"
>
  ← Back to User / Admin Selection
</button>
            </div>
          </div>
        )
}

export default AdminLogin