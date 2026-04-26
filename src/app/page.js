import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:26px_26px] text-neutral-900">
      <div className="flex items-center justify-between px-6 pt-6 sm:px-10 sm:pt-8 lg:px-16">
        <Link
          href="/"
          className="text-xl font-semibold tracking-tight text-neutral-800 sm:text-2xl"
        >
          FirstIn
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/patient"
            className="inline-flex h-11 items-center rounded-lg border border-neutral-900 bg-neutral-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 sm:h-12 sm:px-5 sm:text-base"
          >
            Patient login
          </Link>
          <Link
            href="/api/queue"
            className="inline-flex h-11 items-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50 sm:h-12 sm:px-5 sm:text-base"
          >
            Staff access
          </Link>
        </div>
      </div>

      <main className="mx-auto flex min-h-[calc(100vh-5.25rem)] w-full max-w-5xl flex-col items-center px-6 pb-20 pt-24 text-center sm:min-h-[calc(100vh-5.75rem)] sm:px-10 sm:pt-32">
        <div className="inline-flex max-w-full flex-col items-stretch">
          <h1 className="text-7xl font-bold tracking-tight text-neutral-800 sm:text-8xl lg:text-9xl">
            FirstIn
          </h1>

          <p className="mt-8 w-full text-2xl font-normal leading-snug text-neutral-500 sm:text-3xl">
            Know how urgent your symptoms are before you leave home.
          </p>
        </div>

        <section
          className="mt-12 w-full max-w-xl text-left"
          aria-label="Choose how to continue"
        >
          <Link
            href="/patient"
            className="group block rounded-2xl border-2 border-neutral-800 bg-white p-8 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-4 sm:p-10"
          >
            <span className="block text-2xl font-semibold tracking-tight text-neutral-800 sm:text-3xl">
              Patient check-in
            </span>
            <span className="mt-4 block max-w-md text-lg leading-relaxed text-neutral-500 sm:text-xl">
              Answer a few questions and receive guidance on your next step.
            </span>
            <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-neutral-500 transition group-hover:text-neutral-900">
              Start intake
            </span>
          </Link>
        </section>
      </main>
    </div>
  );
}
