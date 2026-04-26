import Link from "next/link";

export default function ConfirmationPage() {
  return (
    <div className="min-h-svh bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-size-[39px_39px] text-neutral-900">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6 lg:px-13">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-neutral-800 sm:text-xl"
        >
          FirstIn
        </Link>
        <Link
          href="/"
          className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50 sm:h-10 sm:px-4 sm:text-sm"
        >
          Home
        </Link>
      </div>

      <main className="flex min-h-[calc(100svh-4rem)] items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm ring-1 ring-neutral-900/10 p-10 max-w-md w-full text-center flex flex-col items-center gap-4">
          <svg className="w-12 h-12 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900">You&apos;re checked in</h1>
          <p className="text-gray-600">Please take a seat. A nurse will call your name shortly.</p>
          <p className="text-sm text-gray-400">Do not leave the waiting area.</p>
        </div>
      </main>
    </div>
  );
}
