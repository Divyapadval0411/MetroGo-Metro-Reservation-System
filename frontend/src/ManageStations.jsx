
import { useEffect, useState } from 'react'
import api from './api'

function ManageStations() {
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
    const [stationName, setStationName] = useState('')
    const [stationCode, setStationCode] = useState('')
    const [lineName, setLineName] = useState('')
    const [editingStationId, setEditingStationId] = useState(null)
const [editStationName, setEditStationName] = useState('')
    
const [city, setCity] = useState('')
const [saving, setSaving] = useState(false)
const [success, setSuccess] = useState('')

async function handleAddStation(event) {
  event.preventDefault()
  setError('')
  setSuccess('')
  setSaving(true)

  try {
    const response = await api.post('/stations', {
      station_name: stationName.trim(),
      station_code: stationCode.trim().toUpperCase(),
      line_name: lineName.trim(),
      city: city.trim() || null,
    })

    setSuccess('Station added successfully. The station is now available in the station list. Route integration and booking availability may require additional configuration. Please contact the MetroGo development team for assistance.')

    setStationName('')
    setStationCode('')
    setLineName('')
    setCity('')
    setShowAddForm(false)

    const stationsResponse = await api.get('/stations')
    const data = stationsResponse.data

    setStations(
      Array.isArray(data) ? data : data.stations || []
    )
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      'Could not add station. Please try again.'
    )
  } finally {
    setSaving(false)
  }
}


  useEffect(() => {
    async function fetchStations() {
      try {
        const response = await api.get('/stations')
        const data = response.data

        setStations(
          Array.isArray(data) ? data : data.stations || []
        )
      } catch (err) {
        setError(
          err.response?.data?.detail ||
          'Could not load metro stations.'
        )
      } finally {
        setLoading(false)
      }
    }

    fetchStations()
  }, [])

  
async function handleUpdateStation(event) {
  event.preventDefault()
  setError('')
  setSuccess('')

  try {
    const response = await api.put(
      `/stations/${editingStationId}`,
      {
        station_name: editStationName.trim(),
      }
    )

    setSuccess(
      response.data.message || 'Station updated successfully.'
    )

    setEditingStationId(null)
    setEditStationName('')

    const stationsResponse = await api.get('/stations')
    const data = stationsResponse.data

    setStations(
      Array.isArray(data) ? data : data.stations || []
    )
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      'Could not update station.'
    )
  }
}

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <a
          href="/admin-dashboard"
          className="text-indigo-700 hover:underline"
        >
          ← Back to Admin Dashboard
        </a>

        <h1 className="mt-6 text-3xl font-bold text-indigo-900">
          Manage Stations
        </h1>
        
<div className="mt-6">
  <button
    onClick={() => setShowAddForm(!showAddForm)}
    className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
  >
    {showAddForm ? 'Close Form' : '+ Add Station'}
  </button>

  {showAddForm && (
    <form
      onSubmit={handleAddStation}
      className="mt-5 grid gap-4 rounded-xl bg-white p-6 shadow sm:grid-cols-2"
    >
      <div>
        <label className="mb-1 block font-medium">
          Station Name
        </label>
        <input
          type="text"
          value={stationName}
          onChange={(e) => setStationName(e.target.value)}
          required
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 p-3"
          placeholder="Enter station name"
        />
      </div>

      <div>
        <label className="mb-1 block font-medium">
          Station Code
        </label>
        <input
          type="text"
          value={stationCode}
          onChange={(e) => setStationCode(e.target.value)}
          required
          maxLength={20}
          className="w-full rounded-lg border border-gray-300 p-3"
          placeholder="Enter unique station code"
        />
      </div>

      <div>
        <label className="mb-1 block font-medium">
          Metro Line
        </label>
        <input
          type="text"
          value={lineName}
          onChange={(e) => setLineName(e.target.value)}
          required
          maxLength={100}
          className="w-full rounded-lg border border-gray-300 p-3"
          placeholder="Enter metro line"
        />
      </div>
      <div>
  <label className="mb-1 block font-medium">
    City (Optional)
  </label>
  <input
    type="text"
    value={city}
    onChange={(e) => setCity(e.target.value)}
    maxLength={100}
    className="w-full rounded-lg border border-gray-300 p-3"
    placeholder="Enter city"
  />
</div>

      <div className="flex items-end">
        <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800 disabled:opacity-50"
        >
        {saving ? 'Saving...' : 'Save Station'}
        </button>
      </div>
    </form>
  )}
  
{editingStationId !== null && (
  <form
  onSubmit={handleUpdateStation}
  className="mt-5 rounded-xl bg-white p-6 shadow"
>
    <h2 className="mb-4 text-xl font-bold text-indigo-900">
      Edit Station
    </h2>

    <label className="mb-1 block font-medium">
      Station Name
    </label>

    <input
      type="text"
      value={editStationName}
      onChange={(event) =>
        setEditStationName(event.target.value)
      }
      required
      maxLength={100}
      className="mb-4 w-full rounded-lg border border-gray-300 p-3"
    />

    <button
      type="submit"
      className="rounded-lg bg-indigo-700 px-5 py-3 font-semibold text-white hover:bg-indigo-800"
    >
      Save Changes
    </button>

    <button
      type="button"
      onClick={() => {
        setEditingStationId(null)
        setEditStationName('')
      }}
      className="ml-3 rounded-lg bg-gray-200 px-5 py-3 font-semibold text-gray-800 hover:bg-gray-300"
    >
      Cancel
    </button>
  </form>
)}

</div>


        <p className="mt-2 text-gray-600">
          View the metro stations available in the system.
        </p>
        {success && (
  <p className="mt-4 rounded-lg bg-green-50 p-4 text-green-700">
    {success}
  </p>
)}

        {loading && (
          <p className="mt-6">Loading stations...</p>
        )}

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}

        {!loading && !error && (
          <>
            <p className="mt-6 font-semibold text-gray-700">
              Total stations: {stations.length}
            </p>

            {stations.length === 0 ? (
              <p className="mt-4 rounded-lg bg-white p-5">
                No stations found.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow">
                <table className="w-full text-left">
                  <thead className="bg-indigo-50 text-indigo-900">
                    <tr>
                      <th className="p-4">Station ID</th>
                      <th className="p-4">Station Name</th>
                      <th className="p-4">Line</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stations.map((station, index) => (
                      <tr
                        key={station.station_id ?? index}
                        className="border-t border-gray-200"
                      >
                        <td className="p-4">
                          {station.station_id ?? '—'}
                        </td>
                        <td className="p-4">
                          {station.station_name ??
                            station.name ??
                            '—'}
                        </td>
                        <td className="p-4">
                          {station.line_name ??
                            station.line ??
                            station.metro_line ??
                            '—'}
                        </td>
                        
<td className="p-4">
  <div className="flex gap-2">
    <button
      onClick={() => {
        setEditingStationId(station.station_id)
        setEditStationName(station.station_name)
      }}
      className="rounded-lg bg-blue-600 px-3 py-2 text-white hover:bg-blue-700"
    >
      Edit
    </button>

    <button
      onClick={async () => {
  const confirmed = window.confirm(
    `Are you sure you want to delete "${station.station_name}"?`
  )

  if (!confirmed) return

  setError('')
  setSuccess('')

  try {
    const response = await api.delete(
      `/stations/${station.station_id}`
    )

    setSuccess(
      response.data.message || 'Station deleted successfully.'
    )

    const stationsResponse = await api.get('/stations')
    const data = stationsResponse.data

    setStations(
      Array.isArray(data) ? data : data.stations || []
    )
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      'Could not delete station.'
    )
  }
}}
      className="rounded-lg bg-red-600 px-3 py-2 text-white hover:bg-red-700"
    >
      Delete
    </button>
  </div>
</td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}

export default ManageStations
