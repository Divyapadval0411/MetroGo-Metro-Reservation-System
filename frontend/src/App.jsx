
import { useEffect, useRef, useState } from 'react'
import api from './api'
import { Routes, Route } from 'react-router-dom'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './AdminDashboard'
import ManageStations from './ManageStations'
import ManageRoutes from './ManageRoutes'
import ManageSchedules from './ManageSchedules'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import MyBookings from './pages/MyBookings'
import AboutUs from './pages/AboutUs'
import EditProfile from './pages/EditProfile'
import AdminBookings from './AdminBookings'
import ChooseLogin from './pages/ChooseLogin'
function formatMetroTime(value) {
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const totalSeconds = Number(value)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)

    const time = new Date()
    time.setHours(hours, minutes, 0, 0)

    return time.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  return String(value).slice(0, 5)
}

function App() {
  const savedUser = localStorage.getItem('metroUser')
const isLoggedIn = Boolean(savedUser)
const passengerDetailsRef = useRef(null)
  const [selectedSchedule, setSelectedSchedule] = useState(null)
  const [passengerName, setPassengerName] = useState('')
  const [passengerAge, setPassengerAge] = useState('')
  const [passengerGender, setPassengerGender] = useState('Other')
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)
  const [stations, setStations] = useState([])
  const [source, setSource] = useState('')
  const [destination, setDestination] = useState('')
  const [travelDate, setTravelDate] = useState(
    new Date().toLocaleDateString('en-CA')
  )
  
  const [loadingStations, setLoadingStations] = useState(true)
  const [stationError, setStationError] = useState('')
  
const [routeResult, setRouteResult] = useState(null)
const [routeError, setRouteError] = useState('')
const [schedules, setSchedules] = useState([])
const [scheduleError, setScheduleError] = useState('')


  useEffect(() => {
    async function fetchStations() {
      try {
        
          const response = await api.get('/stations')
          setStations(response.data.stations)

      } catch (error) {
        setStationError(
          'Could not load stations. Please check that the backend is running.'
        )
      } finally {
        setLoadingStations(false)
      }
    }

    fetchStations()
  }, [])

  const availableDestinations = stations.filter(
    (station) => String(station.station_id) !== source
  )


async function handleSearch(event) {
  event.preventDefault()

  if (!source || !destination) {
    setRouteError('Please select both source and destination stations.')
    setRouteResult(null)
    return
  }

  if (source === destination) {
    setRouteError('Source and destination stations must be different.')
    setRouteResult(null)
    return
  }

  if (!travelDate) {
    setRouteError('Please select a travel date.')
    setRouteResult(null)
    return
  }

  const today = new Date()
today.setMinutes(today.getMinutes() - today.getTimezoneOffset())
if (travelDate < today.toISOString().slice(0, 10)) {
    setRouteError('Please select today or a future travel date.')
    setRouteResult(null)
    return
  }

  setRouteError('')
  setScheduleError('')
  setSchedules([])
  setRouteResult(null)

  try {
    const response = await api.get('/search-route', {
      params: {
        source_station_id: Number(source),
        destination_station_id: Number(destination),
      },
    })

    setRouteResult(response.data)
    
    const scheduleResponse = await api.get('/schedules', {
      params: {
        travel_date: travelDate,
        route_id: response.data.route_id,
        source_station_id: Number(source),
        destination_station_id: Number(destination),
      },
    })

console.log('Schedule response:', scheduleResponse.data.schedules)
setSchedules(scheduleResponse.data.schedules)

  } catch (error) {
    setRouteError(
      error.response?.data?.detail ||
      'No matching route found, or the server could not complete the search.'
    )
  }
}

async function handleBooking(event) {
  event.preventDefault()
  setBookingMessage('')
  setBookingError('')

  const savedUser = localStorage.getItem('metroUser')

  if (!savedUser) {
    window.location.href = '/login'
    return
  }

  let user

  try {
    user = JSON.parse(savedUser)
  } catch {
    setBookingError('Please log in again.')
    return
  }

  const userId = Number(user.user_id ?? user.id)

  if (!Number.isInteger(userId) || userId <= 0) {
    setBookingError('Please log in again. Your user ID is invalid.')
    return
  }

  if (!selectedSchedule) {
    setBookingError('Please select a metro departure.')
    return
  }

  setBookingLoading(true)

  try {
    // Step 1: Create the booking in the backend.
    const bookingResponse = await api.post('/bookings', {
      user_id: userId,
      schedule_id: Number(selectedSchedule.schedule_id),
      source_station_id: Number(source),
      destination_station_id: Number(destination),
      number_of_tickets: 1,
      passengers: [
        {
          passenger_name: passengerName.trim(),
          age: Number(passengerAge),
          gender: passengerGender,
        },
      ],
    })

    const bookingId = bookingResponse.data.booking_id

    if (!bookingId) {
      throw new Error('The booking was created without a booking ID.')
    }

    // Step 2: Ask FastAPI to create the Razorpay order.
    const orderResponse = await api.post('/payments', {
      booking_id: bookingId,
      payment_method: 'Razorpay',
    })

    const order = orderResponse.data

    if (!order.razorpay_order_id || !order.razorpay_key_id) {
      throw new Error('The payment order details are incomplete.')
    }

    if (!window.Razorpay) {
      throw new Error(
        'Razorpay Checkout did not load. Please refresh the page and try again.'
      )
    }

    // Step 3: Open Razorpay Checkout.
    const checkout = new window.Razorpay({
      key: order.razorpay_key_id,
      order_id: order.razorpay_order_id,
      amount: order.amount,
      currency: order.currency || 'INR',
      name: 'MetroGo',
      description: `Metro ticket booking #${bookingId}`,
      handler: async function (paymentResponse) {
        try {
          // Step 4: Verify the payment on the backend.
          const verificationResponse = await api.post('/payments/verify', {
            booking_id: bookingId,
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          })

          setBookingMessage(
            `Payment successful! Booking ID: ${bookingId}. ` +
            'Your booking is confirmed.'
          )

          setSelectedSchedule(null)
          setPassengerName('')
          setPassengerAge('')
          setPassengerGender('Other')

          // Refresh available seats.
          try {
            const scheduleResponse = await api.get('/schedules', {
              params: {
                travel_date: travelDate,
                route_id: routeResult.route_id,
                source_station_id: Number(source),
                destination_station_id: Number(destination),
              },
            })

            setSchedules(scheduleResponse.data.schedules)
          } catch {
            console.warn('Could not refresh schedule availability.')
          }
        } catch (error) {
          setBookingError(
            error.response?.data?.detail ||
            'Payment verification failed. Please check My Bookings before trying to pay again.'
          )
        }
      },
      modal: {
        ondismiss: function () {
          setBookingMessage(
            `Booking #${bookingId} was created, but payment was not completed. ` +
            'Check My Bookings before trying again.'
          )
        },
      },
      theme: {
        color: '#1e3a8a',
      },
    })

    checkout.on('payment.failed', function () {
      setBookingError(
        `Payment failed for booking #${bookingId}. ` +
        'Your booking has not been confirmed. Check My Bookings before retrying.'
      )
    })

    checkout.open()
  } catch (error) {
    setBookingError(
      error.response?.data?.detail ||
      error.message ||
      'Could not start booking or payment. Please try again.'
    )
  } finally {
    setBookingLoading(false)
  }
}

const location = window.location.pathname
if (location === '/choose-login') {
  return <ChooseLogin />
}
if (location === '/admin-login') {
  return <AdminLogin />
}
if (location === '/admin-dashboard') {
  return <AdminDashboard />
}
if (location === '/admin-bookings') {
  return <AdminBookings />
}
if (location === '/manage-stations') {
  return <ManageStations />
}
if (location === '/manage-routes') {
  return <ManageRoutes />
}
if (location === '/manage-schedules') return <ManageSchedules />
if (location === '/login') {
  return <Login />
}
if (location === '/register') {
  return <Register />
}
if (location === '/dashboard') {
  return <Dashboard />
}
if (location === '/my-bookings') {
  return <MyBookings />
}
if (location === '/about-us') {
  return <AboutUs />
}
if (location === '/edit-profile') {
  return <EditProfile />
}
return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <nav className="bg-blue-900 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <h1 className="text-2xl font-bold">MetroGo</h1>
          <div className="flex items-center gap-5 text-sm font-medium">
           
<a href="/" className="hover:text-blue-200">
  Home
</a>

<a href="/about-us" className="hover:text-blue-200">
  About Us
</a>

{isLoggedIn ? (
  <>
    <a href="/dashboard" className="hover:text-blue-200">
      Dashboard
    </a>

    <a href="/my-bookings" className="hover:text-blue-200">
      My Bookings
    </a>

    <button
      type="button"
      onClick={() => {
        localStorage.removeItem('metroUser')
        window.location.href = '/'
      }}
      className="hover:text-blue-200"
    >
      Logout
    </button>
  </>
) : (
  <>
    <a href="/choose-login" className="hover:text-blue-200">
      Login
    </a>

    <a
      href="/register"
      className="rounded-lg bg-white px-4 py-2 text-blue-900 hover:bg-blue-100"
    >
      Register
    </a>
  </>
)}

            
          </div>
        </div>
      </nav>

      <section className="bg-gradient-to-r from-blue-900 to-blue-700 px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="mb-3 font-semibold uppercase tracking-widest text-blue-200">
            Your city, your journey
          </p>
          <h2 className="max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Your Metro Journey Starts Here
          </h2>
          <p className="mt-4 max-w-xl text-lg text-blue-100">
            Search metro routes, check fares, and reserve your journey with ease.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="-mt-24 rounded-2xl bg-white p-8 shadow-xl">
          <h3 className="mb-2 text-2xl font-bold">Plan Your Journey</h3>
          <p className="mb-8 text-slate-500">
            Choose your stations and travel date to get started.
          </p>

          {stationError && (
            <p className="mb-5 rounded-lg bg-red-50 p-3 text-red-700">
              {stationError}
            </p>
          )}

          <form
            onSubmit={handleSearch}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4"
          >
            <div>
              <label htmlFor="source" className="mb-2 block font-medium">
                From Station
              </label>
              <select
                id="source"
                value={source}
                onChange={(event) => {
                  setSource(event.target.value)
                  if (event.target.value === destination) {
                    setDestination('')
                  }
                }}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  {loadingStations ? 'Loading stations...' : 'Select source station'}
                </option>
                {stations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name} ({station.line_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="destination" className="mb-2 block font-medium">
                To Station
              </label>
              <select
                id="destination"
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Select destination station</option>
                {availableDestinations.map((station) => (
                  <option key={station.station_id} value={station.station_id}>
                    {station.station_name} ({station.line_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="travelDate" className="mb-2 block font-medium">
                Travel Date
              </label>
              <input
                id="travelDate"
                type="date"
                
                min={new Date().toLocaleDateString('en-CA')}
                value={travelDate}
                onChange={(event) => setTravelDate(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loadingStations || stations.length === 0}
                className="w-full rounded-lg bg-orange-500 px-5 py-3 font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Search Metro
              </button>
            </div>
          </form>
        </div>
        
{routeError && (
  <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
    {routeError}
  </div>
)}

{routeResult && (
  <div className="mt-8 rounded-2xl border border-blue-200 bg-white p-6 shadow-md">
    <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
      Route found
    </p>

    <h3 className="mt-2 text-2xl font-bold">
      {routeResult.route_name}
    </h3>

    <p className="mt-2 text-slate-600">
      {routeResult.source_station} → {routeResult.destination_station}
    </p>

    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Distance</p>
        <p className="mt-1 text-xl font-bold">
          {routeResult.distance_km} km
        </p>
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Estimated duration</p>
        <p className="mt-1 text-xl font-bold">
          {routeResult.estimated_duration} minutes
        </p>
      </div>

      <div className="rounded-lg bg-slate-50 p-4">
        <p className="text-sm text-slate-500">Base fare per ticket</p>
        <p className="mt-1 text-xl font-bold text-green-700">
          ₹{routeResult.base_fare}
        </p>
      </div>
    </div>

    <p className="mt-4 text-sm text-slate-500">
      Selected travel date: {travelDate}. Available departure times will be connected next.
    </p>
  </div>
)}


{scheduleError && (
  <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
    {scheduleError}
  </div>
)}

{routeResult && (
  <section className="mt-8">
    <h3 className="mb-2 text-2xl font-bold">
      Available Departure Times
    </h3>
    <p className="mb-5 text-slate-600">
      {travelDate} · {schedules.length} departures available
    </p>

    {schedules.length === 0 ? (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">
        No departures are available for this route and date.
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        
{schedules.map((schedule) => (
  <div
    key={schedule.schedule_id}
    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
  >
    <p className="text-sm text-slate-500">Departure</p>

    <p className="mt-1 text-2xl font-bold text-blue-900">
      {formatMetroTime(schedule.departure_time)}
    </p>

    <p className="mt-3 text-sm text-slate-600">
      {schedule.source_station} → {schedule.destination_station}
    </p>

    <p className="mt-2 text-sm text-slate-600">
      Arrival: {formatMetroTime(schedule.arrival_time)}
    </p>

    <p className="mt-2 text-sm text-slate-600">
      Journey duration: {schedule.journey_duration_minutes} minutes
    </p>

    <p className="mt-2 text-sm text-slate-600">
      Distance: {schedule.distance_km} km
    </p>

    <p className="mt-2 text-sm text-slate-600">
      Seats available: {schedule.available_seats}
    </p>

    <p className="mt-3 text-lg font-semibold text-green-700">
      ₹{schedule.fare} per ticket
    </p>
    <button
  type="button"
  onClick={() => {
  setSelectedSchedule(schedule)
  setBookingMessage('')
  setBookingError('')

  setTimeout(() => {
    passengerDetailsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, 100)
}}
  className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-3 font-bold text-white hover:bg-orange-600"
>
  Book Ticket
</button>
  </div>
))}

      </div>
    )}
  </section>
)}
  {selectedSchedule && (
  <section
    ref={passengerDetailsRef}
    className="mt-8 rounded-2xl border border-blue-200 bg-white p-6 shadow-md"
  >
    <h3 className="text-2xl font-bold">Passenger Details</h3>

    <p className="mt-2 text-slate-600">
      {selectedSchedule.source_station} →{' '}
      {selectedSchedule.destination_station}
    </p>

    <p className="mt-1 text-slate-600">
      Departure: {formatMetroTime(selectedSchedule.departure_time)}
    </p>

    <p className="mt-1 font-semibold text-green-700">
      Fare: ₹{selectedSchedule.fare}
    </p>

    <form onSubmit={handleBooking} className="mt-6 space-y-4">
      <div>
        <label className="mb-2 block font-medium">
          Passenger name
        </label>
        <input
          value={passengerName}
          onChange={(e) => setPassengerName(e.target.value)}
          minLength={2}
          maxLength={100}
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3"
          placeholder="Enter passenger name"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">Age</label>
        <input
          type="number"
          value={passengerAge}
          onChange={(e) => setPassengerAge(e.target.value)}
          min="1"
          max="120"
          required
          className="w-full rounded-lg border border-slate-300 px-4 py-3"
          placeholder="Enter age"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">Gender</label>
        <select
          value={passengerGender}
          onChange={(e) => setPassengerGender(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
        >
          <option value="Other">Other</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </div>

      {bookingError && (
        <p className="rounded-lg bg-red-50 p-3 text-red-700">
          {bookingError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={bookingLoading}
          className="rounded-lg bg-blue-900 px-6 py-3 font-bold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {bookingLoading ? 'Booking...' : 'Confirm Booking'}
        </button>

        <button
          type="button"
          onClick={() => setSelectedSchedule(null)}
          className="rounded-lg border border-slate-300 px-6 py-3 font-semibold"
        >
          Cancel
        </button>
      </div>
    </form>
  </section>
)}

{bookingMessage && (
  <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
    {bookingMessage}
  </div>
)}



        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 text-3xl">🚇</div>
            <h4 className="text-lg font-bold">Find Routes</h4>
            <p className="mt-2 text-slate-600">Explore available metro routes between stations.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 text-3xl">🎫</div>
            <h4 className="text-lg font-bold">Book Tickets</h4>
            <p className="mt-2 text-slate-600">Check journey details and reserve tickets.</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-3 text-3xl">📱</div>
            <h4 className="text-lg font-bold">Digital Tickets</h4>
            <p className="mt-2 text-slate-600">Access booking details and confirmation.</p>
          </div>
        </div>
      </main>

      <footer className="mt-12 bg-slate-900 px-6 py-6 text-center text-sm text-slate-300">
        © 2026 MetroGo — Metro Reservation System
      </footer>
    </div>
  )
}

export default App
