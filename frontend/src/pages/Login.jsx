
import { useState } from 'react'
import api from '../api'

import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

    const handleLogin = async (event) => {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await api.post('/login', {
        email: email,
        password: password,
      })
      localStorage.setItem('metroUser', JSON.stringify(response.data))
      setMessage('Login successful! Redirecting...')

       setTimeout(() => {
        window.location.href = '/dashboard'
        }, 1000) 
      setMessage(
        error.response?.data?.detail || 'Login failed. Please check your email and password.'
      )
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-900">
            MetroGo
          </h1>
          <p className="mt-2 text-slate-500">
            Welcome back! Log in to continue.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-medium text-slate-700"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-900 px-4 py-3 font-bold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
            {loading ? 'Logging in...' : 'Login'}
</button>
        </form>
        {message && (
            <p className="mt-4 text-center text-sm" role="status">
                {message}
            </p>
)}

        <p className="mt-6 text-center text-sm text-slate-600">
          Don't have an account?{" "}
          <a
            href="/register"
            className="font-semibold text-blue-700 hover:underline"
          >
            Register
          </a>
        </p>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-sm text-slate-500 hover:text-blue-700"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}

export default Login
