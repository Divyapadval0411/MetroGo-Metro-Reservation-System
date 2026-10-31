
import { useEffect, useState } from 'react'
import api from './api'

export default function ManageRoutes() {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingRouteId, setEditingRouteId] = useState(null)
  const [newFare, setNewFare] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    async function fetchRoutes() {
      try {
        const response = await api.get('/routes')
        const data = response.data

        setRoutes(
          Array.isArray(data) ? data : data.routes || []
        )
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Could not load routes. Please try again.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchRoutes()
  }, [])

  function openFareEditor(route) {
    setEditingRouteId(route.route_id)
    setNewFare(String(route.base_fare ?? ''))
    setError('')
    setSuccess('')
  }

  function cancelFareEdit() {
    setEditingRouteId(null)
    setNewFare('')
  }

  
async function handleFareSave(event) {
  event.preventDefault()

  const fare = Number(newFare)

  if (newFare.trim() === '' || !Number.isFinite(fare) || fare <= 0) {
    setError('Please enter a valid fare greater than ₹0.')
    return
  }

  try {
    setError('')
    setSuccess('')

    await api.put(`/routes/${editingRouteId}/fare`, {
      base_fare: fare,
    })

    setRoutes((currentRoutes) =>
      currentRoutes.map((route) =>
        route.route_id === editingRouteId
          ? { ...route, base_fare: fare }
          : route
      )
    )

    setSuccess('Route fare updated successfully.')
    setEditingRouteId(null)
    setNewFare('')
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      'Could not update fare. Please try again.'
    )
  }
}


  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <button
            onClick={() => {
              window.location.href = '/admin-dashboard'
            }}
            className="mb-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            ← Back to Admin Dashboard
          </button>

          <h1 className="text-3xl font-bold text-indigo-900">
            Manage Routes
          </h1>

          <p className="mt-2 text-gray-600">
            View routes and edit their base fares.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-100 p-4 text-green-800">
            {success}
          </div>
        )}

        {loading ? (
          <p className="rounded-xl bg-white p-6 shadow">
            Loading routes...
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-white shadow">
            <table className="w-full text-left">
              <thead className="bg-indigo-900 text-white">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Route Name</th>
                  <th className="p-4">Source</th>
                  <th className="p-4">Destination</th>
                  <th className="p-4">Distance</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Base Fare</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {routes.map((route) => (
                  <tr
                    key={route.route_id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="p-4">{route.route_id}</td>
                    <td className="p-4 font-medium">
                      {route.route_name}
                    </td>
                    <td className="p-4">
                      {route.source_station}
                    </td>
                    <td className="p-4">
                      {route.destination_station}
                    </td>
                    <td className="p-4">
                      {route.distance_km ?? '—'} km
                    </td>
                    <td className="p-4">
                      {route.estimated_duration ?? '—'} min
                    </td>
                    <td className="p-4">
                      ₹{route.base_fare}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => openFareEditor(route)}
                        className="rounded-lg bg-indigo-700 px-4 py-2 text-white hover:bg-indigo-800"
                      >
                        Edit Fare
                      </button>
                    </td>
                  </tr>
                ))}

                {routes.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-6 text-center text-gray-500"
                    >
                      No routes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {editingRouteId !== null && (
          <div className="mt-6 rounded-xl bg-white p-6 shadow">
            <h2 className="text-xl font-semibold text-indigo-900">
              Edit Fare — Route {editingRouteId}
            </h2>

            <form onSubmit={handleFareSave} className="mt-4 max-w-md">
              <label
                htmlFor="newFare"
                className="mb-2 block font-medium text-gray-700"
              >
                New Base Fare (₹)
              </label>

              <input
                id="newFare"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={newFare}
                onChange={(event) => setNewFare(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-indigo-500 focus:outline-none"
                placeholder="Enter new fare"
              />

              <div className="mt-4 flex gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-700 px-5 py-2 text-white hover:bg-indigo-800"
                >
                  Save Fare
                </button>

                <button
                  type="button"
                  onClick={cancelFareEdit}
                  className="rounded-lg border border-gray-300 px-5 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <p className="mt-4 text-gray-600">
          Total routes: {routes.length}
        </p>
      </div>
    </div>
  )
}
