
function AdminDashboard() {
  const admin = JSON.parse(
    localStorage.getItem('metroAdmin') || 'null'
  )

  function handleLogout() {
    localStorage.removeItem('metroAdmin')
    window.location.href = '/choose-login'
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="flex items-center justify-between bg-indigo-700 px-8 py-5 text-white">
        <h1 className="text-2xl font-bold">MetroGo Admin</h1>

        <button
          onClick={handleLogout}
          className="rounded-lg bg-white px-4 py-2 font-medium text-indigo-700 hover:bg-gray-100"
        >
          Logout
        </button>
      </header>

      <main className="mx-auto max-w-6xl p-8">
        <h2 className="text-3xl font-bold text-gray-800">
          Admin Dashboard
        </h2>

        <p className="mt-3 text-gray-600">
          Welcome, {admin?.name || 'Administrator'}!
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
            onClick={() => {
              window.location.href = '/manage-stations'
            }}
            className="cursor-pointer rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
            >
            <h3 className="text-xl font-semibold text-gray-800">
                Manage Stations
            </h3>
            <p className="mt-2 text-gray-600">
                View and manage metro stations.
            </p>
            </div>

          
          <div
            onClick={() => {
              window.location.href = '/manage-routes'
            }}
            className="cursor-pointer rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h3 className="text-xl font-semibold text-gray-800">
              Manage Routes
            </h3>
            <p className="mt-2 text-gray-600">
              Vies and Manage routes and station fare.
            </p>
          </div>


          
          <div
            onClick={() => {
              window.location.href = '/manage-schedules'
            }}
            className="cursor-pointer rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h3 className="text-xl font-semibold text-gray-800">
              Manage Schedules
            </h3>
            <p className="mt-2 text-gray-600">
              View and manage metro schedules.
            </p>
          </div>

          <div
            onClick={() => {
              window.location.href = '/admin-bookings'
            }}
            className="cursor-pointer rounded-xl bg-white p-6 shadow transition hover:shadow-lg"
          >
            <h3 className="text-xl font-semibold text-gray-800">
              View Bookings
            </h3>
            <p className="mt-2 text-gray-600">
              Review customer reservations.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default AdminDashboard
