
import { useEffect, useState } from 'react'
import api from '../api'

function MyBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState(null)
  const [message, setMessage] = useState('')

  function formatTime(value) {
  if (value == null || value === '') {
    return 'Not available'
  }

  // Handle MySQL TIME values returned as seconds
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const totalSeconds = Number(value)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }

  // Handle values such as "09:15:00"
  return String(value).slice(0, 5)
}
  async function fetchBookings() {
    try {
      setError('')
      const user = JSON.parse(
        localStorage.getItem('metroUser') || 'null'
      )
      const userId = user?.user_id ?? user?.id

      if (!userId) {
        setError('Please log in again to view your bookings.')
        setBookings([])
        return
      }

      const response = await api.get(`/users/${userId}/bookings`)
      const data = response.data
      setBookings(Array.isArray(data) ? data : data.bookings || [])
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not load your bookings.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookings()
  }, [])

  async function handleCancel(booking) {
    const confirmed = window.confirm(
      `Are you sure you want to cancel Booking ID ${booking.booking_id}?`
    )

    if (!confirmed) return

    try {
      setCancellingId(booking.booking_id)
      setError('')
      setMessage('')

      const user = JSON.parse(
        localStorage.getItem('metroUser') || 'null'
      )
      const userId = user?.user_id ?? user?.id

      await api.put(
        `/users/${userId}/bookings/${booking.booking_id}/cancel`
      )

      setMessage(`Booking ID ${booking.booking_id} cancelled successfully.`)
      await fetchBookings()
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not cancel this booking.'
      )
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <a
          href="/dashboard"
          className="text-blue-800 hover:underline"
        >
          ← Back to Dashboard
        </a>

        <h1 className="mt-6 text-3xl font-bold text-blue-900">
          My Bookings
        </h1>

        {message && (
          <p className="mt-5 rounded-lg bg-green-50 p-4 text-green-700">
            {message}
          </p>
        )}

        {loading && <p className="mt-5">Loading bookings...</p>}

        {error && (
          <p className="mt-5 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && bookings.length === 0 && (
          <p className="mt-5 rounded-lg bg-white p-5">
            No bookings found.
          </p>
        )}

        {!loading && bookings.map((booking, index) => {
          const status = String(
            booking.booking_status || booking.status || ''
          )

          return (
            <article
              key={booking.booking_id ?? index}
              className="mt-5 rounded-xl bg-white p-6 shadow"
            >
                    
          <h2 className="text-xl font-bold">
            Booking ID: {booking.booking_id}
          </h2>

          <p className="mt-2">
            Metro Name: {booking.metro_name || 'Not available'}
          </p>

          <p className="mt-2">
            Metro Number: {booking.metro_number || 'Not available'}
          </p>

          <p className="mt-2">
            Source Station: {booking.source_station || 'Not available'}
          </p>

          <p className="mt-2">
            Destination Station: {booking.destination_station || 'Not available'}
          </p>

          <p className="mt-2">
          Departure Time: {formatTime(booking.departure_time)}
        </p>

        <p className="mt-2">
          Arrival Time: {formatTime(booking.arrival_time)}
        </p>

              <p className="mt-2">
                Travel date: {
                  booking.journey_date ||
                  booking.schedule_date ||
                  'Not available'
                }
              </p>

              <p className="mt-2">
                Amount: ₹{
                  booking.total_amount ??
                  booking.total_fare ??
                  booking.fare ??
                  'Not available'
                }
              </p>

              <p className="mt-2">
                Status: {status || 'Not available'}
              </p>

              <p className="mt-2">
                Payment: {booking.payment_status || 'Not available'}
              </p>

              {status.toLowerCase() === 'pending' && (
                <button
                  type="button"
                  onClick={() => handleCancel(booking)}
                  disabled={cancellingId === booking.booking_id}
                  className="mt-4 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cancellingId === booking.booking_id
                    ? 'Cancelling...'
                    : 'Cancel Booking'}
                </button>
              )}
            </article>
          )
        })}
      </div>
    </main>
  )
}

export default MyBookings
