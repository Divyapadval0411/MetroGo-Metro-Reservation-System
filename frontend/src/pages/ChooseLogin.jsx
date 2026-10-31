function ChooseLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-8 shadow-xl sm:p-12">
        <h1 className="text-center text-3xl font-bold text-blue-900">
          Welcome to MetroGo
        </h1>

        <p className="mt-3 text-center text-slate-600">
          Please choose how you want to log in.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/login'
            }}
            className="w-full cursor-pointer rounded-xl border-2 border-blue-200 p-8 text-left transition hover:border-blue-700 hover:bg-blue-50"
          >
            <div className="text-4xl">👤</div>
            <h2 className="mt-4 text-2xl font-bold text-blue-900">
              User Login
            </h2>
            <p className="mt-3 text-slate-600">
              Search metro routes, book tickets, and view your bookings.
            </p>
            <span className="mt-6 inline-block font-semibold text-blue-800">
              Continue as User →
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              window.location.href = '/admin-login'
            }}
            className="w-full cursor-pointer rounded-xl border-2 border-teal-200 p-8 text-left transition hover:border-teal-700 hover:bg-teal-50"
          >
            <div className="text-4xl">🛡️</div>
            <h2 className="mt-4 text-2xl font-bold text-teal-800">
              Admin Login
            </h2>
            <p className="mt-3 text-slate-600">
              Manage stations, routes, metro schedules, and reservations.
            </p>
            <span className="mt-6 inline-block font-semibold text-teal-800">
              Continue as Admin →
            </span>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => {
              window.location.href = '/'
            }}
            className="cursor-pointer font-medium text-slate-600 hover:text-blue-800"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChooseLogin