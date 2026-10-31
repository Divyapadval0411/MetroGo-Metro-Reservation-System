
import { useState } from 'react'
import api from '../api'

function EditProfile() {
  const savedUser = localStorage.getItem('metroUser')
  let user = null

  try {
    user = savedUser ? JSON.parse(savedUser) : null
  } catch {
    user = null
  }

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [gender, setGender] = useState(user?.gender || '')
  const [dateOfBirth, setDateOfBirth] = useState(
    user?.date_of_birth ? String(user.date_of_birth).slice(0, 10) : ''
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setError('')

    const userId = Number(user?.user_id ?? user?.id)

    if (!userId) {
      setError('Please log in again.')
      return
    }

    setSaving(true)

    try {
      const response = await api.put(`/users/${userId}/profile`, null, {
        params: {
          full_name: fullName.trim(),
          email: email.trim(),
          phone,
          gender,
          date_of_birth: dateOfBirth,
        },
      })

      const updatedUser = {
        ...user,
        ...response.data,
        user_id: userId,
      }

      localStorage.setItem('metroUser', JSON.stringify(updatedUser))
      setMessage('Profile updated successfully!')
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Could not update your profile.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        Please log in to edit your profile.
        <a href="/choose-login" className="ml-2 text-blue-700 underline">
          Go to Login
        </a>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10">
      <section className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow">
        <a href="/dashboard" className="text-blue-700 hover:underline">
          ← Back to Dashboard
        </a>

        <h1 className="mt-5 text-3xl font-bold text-blue-900">
          Edit Profile
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block font-medium">Full Name</label>
            <input
              required
              minLength={2}
              maxLength={100}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Email</label>
            <input
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
            >
              <option value="">Select gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium">Date of Birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3"
            />
          </div>

          {message && (
            <p className="rounded-lg bg-green-50 p-3 text-green-700">
              {message}
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-900 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default EditProfile
