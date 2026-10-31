import { useState } from 'react'
import api from '../api'

function Register() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  
  const handleRegister = async (event) => {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    try {
      const response = await api.post('/register', {
        full_name: fullName,
        email: email,
        phone: phone,
        password: password,
      })

      setMessage('Registration successful! You can now log in.')
      console.log('Registered user:', response.data)
    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
        'Registration failed. Please check your details and try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-blue-900">MetroGo</h1>
          <p className="mt-2 text-slate-500">
            Create your account to start booking metro tickets.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          <div>
            <label htmlFor="full_name" className="mb-2 block font-medium text-slate-700">
              Full Name
            </label>
            <input
              id="full_name"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-2 block font-medium text-slate-700">
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
            <label htmlFor="phone" className="mb-2 block font-medium text-slate-700">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Create a password (minimum 8 characters)"
              minLength={8}
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
            {loading ? 'Creating Account...' : 'Create Account'}
            </button>
        </form>
        {message && (
            <p className="mt-4 text-center text-sm" role="status">
                {message}
            </p>
            )}

        <p className="mt-6 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <a href="/login" className="font-semibold text-blue-700 hover:underline">
            Login
          </a>
        </p>

        <div className="mt-6 text-center">
          <a href="/" className="text-sm text-slate-500 hover:text-blue-700">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}

export default Register
