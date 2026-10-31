
import { useEffect, useState } from 'react'
import api from '../api'

function Dashboard() {
  const user = JSON.parse(localStorage.getItem('metroUser') || 'null')

  const [showBookings, setShowBookings] = useState(false)
  const [bookings, setBookings] = useState([])
  const [showProfile, setShowProfile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadBookings() {
    const userId = user?.user_id ?? user?.id

    if (!userId) {
      setError('User ID not found. Please log in again.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await api.get(`/users/${userId}/bookings`)
      const data = response.data

      setBookings(
        Array.isArray(data) ? data : data.bookings || []
      )
      setShowBookings(true)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not load bookings. Please try again.'
      )
      setShowBookings(true)
    } finally {
      setLoading(false)
    }
  }

  return (
  <div className="min-h-screen bg-slate-100">
    <nav className="bg-blue-900 px-6 py-4 text-white shadow-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <a href="/dashboard" className="text-2xl font-bold">
          MetroGo
        </a>

        <div className="flex flex-wrap items-center gap-5 text-sm font-medium">
          <a href="/" className="transition hover:text-blue-200">
            Home
          </a>

          <a href="/my-bookings" className="transition hover:text-blue-200">
            My Bookings
          </a>

          <a href="/about-us" className="transition hover:text-blue-200">
            About Us
          </a>

          <button
            type="button"
            onClick={() => {
              setShowProfile(!showProfile)
              setShowBookings(false)
            }}
            className="transition hover:text-blue-200"
          >
            My Profile
          </button>
        </div>
      </div>
    </nav>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <h2 className="text-3xl font-bold text-slate-800">
          Welcome, {user?.full_name || 'MetroGo User'}!
        </h2>

        <p className="mt-2 text-slate-600">
          Your dashboard for Mumbai Metro reservations.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <a
            href="/"
            className="rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h3 className="text-xl font-bold text-blue-900">
              Book Metro Tickets
            </h3>
            <p className="mt-2 text-slate-600">
              Search stations and find your metro journey.
            </p>
          </a>

          <a
            href="/my-bookings"
            className="block rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h3 className="text-xl font-bold text-blue-900">
              My Bookings
            </h3>
            <p className="mt-2 text-slate-600">
              View your reservation history.
            </p>
          </a>

          <button
          type="button"
          onClick={() => setShowProfile(!showProfile)}
          className="rounded-xl bg-white p-6 text-left shadow transition hover:shadow-lg"
        >
          <h3 className="text-xl font-bold text-blue-900">
            My Profile
          </h3>
          <p className="mt-2 text-slate-600">
            Manage your account details.
          </p>
        </button>
       
        </div>

        {showProfile && (
  <section className="mt-8 rounded-xl bg-white p-6 shadow">
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-2xl font-bold text-blue-900">
        My Profile
      </h3>

      <button
        type="button"
        onClick={() => setShowProfile(false)}
        className="rounded-lg bg-slate-200 px-4 py-2 hover:bg-slate-300"
      >
        Close
      </button>
    </div>

    <div className="mt-5 space-y-4">
      <div>
        <p className="text-sm text-slate-500">Full Name</p>
        <p className="font-semibold text-slate-800">
          {user?.full_name || 'Not available'}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-500">Email</p>
        <p className="font-semibold text-slate-800">
          {user?.email || 'Not available'}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-500">Phone</p>
        <p className="font-semibold text-slate-800">
          {user?.phone || 'Not available'}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-500">Gender</p>
        <p className="font-semibold text-slate-800">
          {user?.gender || 'Not available'}
        </p>
      </div>

      <div>
        <p className="text-sm text-slate-500">Date of Birth</p>
        <p className="font-semibold text-slate-800">
          {user?.date_of_birth
            ? String(user.date_of_birth).slice(0, 10)
            : 'Not available'}
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
  <button
    type="button"
    onClick={() => {
      window.location.href = '/edit-profile'
    }}
    className="rounded-lg bg-blue-900 px-5 py-3 font-semibold text-white hover:bg-blue-800"
  >
    Edit Profile
  </button>

  <button
    type="button"
    onClick={() => {
      localStorage.removeItem('metroUser')
      window.location.href = '/choose-login'
    }}
    className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700"
  >
    Logout
  </button>
</div>
    </div>
  </section>
)}

        {showBookings && (
          <section className="mt-8 rounded-xl bg-white p-6 shadow">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-2xl font-bold text-blue-900">
                My Booking History
              </h3>

              <button
                type="button"
                onClick={() => setShowBookings(false)}
                className="rounded-lg bg-slate-200 px-4 py-2 hover:bg-slate-300"
              >
                Close
              </button>
            </div>

            {loading && (
              <p className="mt-4">Loading your bookings...</p>
            )}

            {error && (
              <p className="mt-4 text-red-600">{error}</p>
            )}

            {!loading && !error && bookings.length === 0 && (
              <p className="mt-4 text-slate-600">
                No bookings found for your account.
              </p>
            )}

            {!loading && bookings.length > 0 && (
              <div className="mt-5 space-y-4">
                {bookings.map((booking, index) => (
                  <div
                    key={booking.booking_id ?? index}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <p className="font-bold text-slate-800">
                      Booking ID: {booking.booking_id}
                    </p>

                    <p className="mt-1 text-slate-600">
                      Journey date: {
                        booking.journey_date ||
                        booking.schedule_date ||
                        'Not available'
                      }
                    </p>

                    <p className="mt-1 text-slate-600">
                      Amount: ₹{
                        booking.total_amount ??
                        booking.total_fare ??
                        booking.fare ??
                        'Not available'
                      }
                    </p>

                    <p className="mt-1 text-slate-600">
                      Booking status: {
                        booking.booking_status ||
                        booking.status ||
                        'Not available'
                      }
                    </p>

                    <p className="mt-1 text-slate-600">
                      Payment status: {
                        booking.payment_status || 'Not available'
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

export default Dashboard
