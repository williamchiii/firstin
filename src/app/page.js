import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:26px_26px] text-neutral-900">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6 lg:px-[3.25rem]">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-neutral-800 sm:text-xl"
        >
          FirstIn
        </Link>
        <div className="flex items-center gap-2.5">
          <Link
            href="/patient"
            className="inline-flex h-9 items-center rounded-md border border-neutral-900 bg-neutral-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-700 sm:h-10 sm:px-4 sm:text-sm"
          >
            Patient Login
          </Link>
          <Link
            href="/staff"
            className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50 sm:h-10 sm:px-4 sm:text-sm"
          >
            Staff Access
          </Link>
        </div>
      </div>

      <main className="mx-auto flex min-h-[calc(100vh-4.25rem)] w-full max-w-4xl flex-col items-center px-5 pb-16 pt-32 text-center sm:min-h-[calc(100vh-4.75rem)] sm:px-8 sm:pt-40">
        <div className="inline-flex max-w-full flex-col items-stretch">
          <h1 className="text-[3.6rem] font-bold leading-none tracking-tight text-neutral-800 sm:text-[4.8rem] lg:text-[6.4rem]">
            FirstIn
          </h1>

          <p className="mt-6 w-full text-xl font-normal leading-snug text-neutral-500 sm:text-2xl">
            The next generation triage management.
          </p>
        </div>

        <section
          className="mt-10 w-full max-w-[23.2rem] text-center"
          aria-label="Choose how to continue"
        >
          <Link
            href="/patient"
            className="group block rounded-lg border border-neutral-800 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-4 sm:p-[1.6rem]"
          >
            <span className="block text-base font-semibold tracking-tight text-neutral-800 sm:text-[1.2rem]">
              Patient check-in
            </span>
            <span className="mx-auto mt-2.5 block max-w-xs text-sm leading-relaxed text-neutral-500 sm:text-[0.9rem]">
              Answer a few questions and receive guidance on your next step.
            </span>
            <span className="mt-5 inline-flex items-center justify-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-neutral-500 transition group-hover:text-neutral-900">
              Start intake
            </span>
          </Link>
        </section>
      </main>
    </div>
  );
}
