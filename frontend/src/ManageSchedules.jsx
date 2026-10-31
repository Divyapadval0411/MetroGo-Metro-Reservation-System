
import { useEffect, useState } from 'react'
import api from './api'

export default function ManageSchedules() {
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingScheduleId, setUpdatingScheduleId] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')

  useEffect(() => {
  if (!selectedDate) {
    setSchedules([])
    setLoading(false)
    setError('')
    return
  }

  async function fetchSchedules() {
    try {
      setLoading(true)
      setError('')

      const response = await api.get('/admin/schedules', {
        params: { travel_date: selectedDate },
      })

      setSchedules(response.data.schedules || [])
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not load schedules. Please try again.'
      )
      setSchedules([])
    } finally {
      setLoading(false)
    }
  }

  fetchSchedules()
}, [selectedDate])

  const filteredSchedules = selectedDate
  ? schedules.filter(
      (schedule) =>
        String(schedule.schedule_date).slice(0, 10) === selectedDate
    )
  : []

  async function handleStatusToggle(schedule) {
  const newStatus =
    schedule.running_status === 'Scheduled'
      ? 'Cancelled'
      : 'Scheduled'

  try {
    setError('')
    setUpdatingScheduleId(schedule.schedule_id)

    await api.put(
      `/admin/schedules/${schedule.schedule_id}/status`,
      null,
      { params: { status: newStatus } }
    )

    setSchedules((currentSchedules) =>
      currentSchedules.map((item) =>
        item.schedule_id === schedule.schedule_id
          ? { ...item, running_status: newStatus }
          : item
      )
    )
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      'Could not update schedule status. Please try again.'
    )
  } finally {
    setUpdatingScheduleId(null)
  }
}
function formatTime(value) {
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const totalSeconds = Number(value)
    const hours = Math.floor(totalSeconds / 3600) % 24
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return [hours, minutes, seconds]
      .map((part) => String(part).padStart(2, '0'))
      .join(':')
  }

  return String(value).slice(0, 8)
}
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => {
            window.location.href = '/admin-dashboard'
          }}
          className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          ← Back to Admin Dashboard
        </button>

        <h1 className="text-3xl font-bold text-indigo-900">
        Manage Schedules
        </h1>

        <p className="mb-6 mt-2 text-gray-600">
        Select a travel date to view and manage its schedules.
        </p>

        <div className="mb-6 rounded-xl bg-white p-5 shadow">
        <label
            htmlFor="schedule-date"
            className="mb-2 block font-medium text-gray-700"
        >
            Select Travel Date
        </label>

        <input
            id="schedule-date"
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-300 p-3"
        />
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

      

        {loading ? (
          <p className="rounded-xl bg-white p-6 shadow">
            Loading schedules...
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left">
              <thead className="bg-indigo-900 text-white">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Route</th>
                  <th className="p-4">Travel Date</th>
                  <th className="p-4">Departure</th>
                  <th className="p-4">Arrival</th>
                  <th className="p-4">Available Seats</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSchedules.map((schedule) => (
                  <tr
                    key={schedule.schedule_id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="p-4">{schedule.schedule_id}</td>
                    <td className="p-4 font-medium">
                      {schedule.route_name}
                    </td>
                    <td className="p-4">
                      {String(schedule.schedule_date).slice(0, 10)}
                    </td>
                    <td className="p-4">
                      {formatTime(schedule.departure_time)}
                    </td>
                    <td className="p-4">
                      {formatTime(schedule.arrival_time)}
                    </td>
                    <td className="p-4">{schedule.available_seats}</td>
                    <td className="p-4">
                      <span
                        className={
                          schedule.running_status === 'Scheduled'
                            ? 'rounded-full bg-green-100 px-3 py-1 text-green-800'
                            : 'rounded-full bg-gray-100 px-3 py-1 text-gray-700'
                        }
                      >
                        {schedule.running_status}
                      </span>
                    </td>
                    <td className="p-4">
                        <button
                            onClick={() => handleStatusToggle(schedule)}
                            disabled={updatingScheduleId === schedule.schedule_id}
                            className={
                            schedule.running_status === 'Scheduled'
                                ? 'rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700 disabled:opacity-50'
                                : 'rounded-lg bg-green-600 px-3 py-2 text-white hover:bg-green-700 disabled:opacity-50'
                            }
                        >
                            {updatingScheduleId === schedule.schedule_id
                            ? 'Updating...'
                            : schedule.running_status === 'Scheduled'
                                ? 'Cancel Schedule'
                                : 'Enable Schedule'}
                        </button>
                    </td>
                  </tr>
                ))}

                {selectedDate && filteredSchedules.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center text-gray-500"
                    >
                      No schedules found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-gray-600">
          Total schedules for selected date: {filteredSchedules.length}
        </p>
      </div>
    </div>
  )
}
