
import { useEffect, useState } from 'react'
import api from './api'

function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchBookings() {
      try {
        const response = await api.get('/admin/bookings')
        setBookings(response.data.bookings || [])
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Could not load customer bookings.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchBookings()
  }, [])

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <a
          href="/admin-dashboard"
          className="text-indigo-700 hover:underline"
        >
          ← Back to Admin Dashboard
        </a>

        <h1 className="mt-6 text-3xl font-bold text-indigo-900">
          Customer Bookings
        </h1>

        <p className="mt-2 text-gray-600">
          View customer reservations and their payment status.
        </p>

        {loading && (
          <p className="mt-6">Loading bookings...</p>
        )}

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && bookings.length === 0 && (
          <p className="mt-6 rounded-lg bg-white p-5 shadow">
            No bookings found.
          </p>
        )}

        {!loading && !error && bookings.length > 0 && (
          <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="bg-indigo-50 text-indigo-900">
                <tr>
                  <th className="p-3">Booking ID</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Destination</th>
                  <th className="p-3">Travel Date</th>
                  <th className="p-3">Tickets</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Booking Status</th>
                  <th className="p-3">Payment Status</th>
                </tr>
              </thead>

              <tbody>
                {bookings.map((booking) => (
                  <tr
                    key={booking.booking_id}
                    className="border-t border-gray-100"
                  >
                    <td className="p-3">{booking.booking_id}</td>
                    <td className="p-3">
                      {booking.customer_name || 'N/A'}
                    </td>
                    <td className="p-3">
                      {booking.source_station || 'N/A'}
                    </td>
                    <td className="p-3">
                      {booking.destination_station || 'N/A'}
                    </td>
                    <td className="p-3">
                      {booking.journey_date
                        ? String(booking.journey_date).slice(0, 10)
                        : 'N/A'}
                    </td>
                    <td className="p-3">
                      {booking.number_of_tickets}
                    </td>
                    <td className="p-3">
                      ₹{booking.total_amount}
                    </td>
                    <td className="p-3">
                      {booking.booking_status || 'N/A'}
                    </td>
                    <td className="p-3">
                      {booking.payment_status || 'No payment record'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

export default AdminBookings
