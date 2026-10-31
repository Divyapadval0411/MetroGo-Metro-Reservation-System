function AboutUs() {
  return (
    <div className="min-h-screen bg-slate-100">
      <nav className="bg-blue-900 px-6 py-4 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold">MetroGo</h1>

          <a
            href={localStorage.getItem('metroUser') ? '/dashboard' : '/'}
            className="hover:text-blue-200"
          >
            Back to page
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <section className="rounded-xl bg-white p-8 shadow-md">
          <h2 className="text-3xl font-bold text-blue-900">
            About MetroGo
          </h2>

          <p className="mt-4 leading-7 text-slate-600">
            MetroGo is a web-based metro reservation system
            designed to help users search metro routes, view
            schedules and fares, and manage their bookings
            through a simple interface.
          </p>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-bold text-blue-900">
              Our Purpose
            </h3>

            <p className="mt-3 leading-7 text-slate-600">
              Our goal is to make metro journey planning and
              reservation management simple and convenient.
            </p>
          </div>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-bold text-blue-900">
              Contact Us
            </h3>

            <p className="mt-3 text-slate-600">
              Email: metro123@gmai.com<br></br>
              Phone: 9876543210
            </p>
          </div>

          <p className="mt-8 text-sm text-slate-500">
            © 2026 MetroGo — Metro Reservation System
          </p>
        </section>
      </main>
    </div>
  )
}

export default AboutUs