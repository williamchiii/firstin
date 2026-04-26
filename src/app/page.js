import Link from "next/link";
import TypewriterHeadline from "@/components/TypewriterHeadline";
import TypewriterText from "@/components/TypewriterText";

// --- Static data ---
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Patient self-checks in",
    description:
      "Patients arrive at the kiosk or mobile interface. No staff involvement required for the initial intake.",
  },
  {
    step: "02",
    title: "AI scores the case",
    description:
      "Gemini analyzes symptoms, vitals context, and reported severity. An ESI score from 1 (immediate) to 5 (non-urgent) is generated in seconds with a clinical summary.",
  },
  {
    step: "03",
    title: "Staff acts immediately",
    description:
      "The live priority queue surfaces the highest-acuity patients at the top. Staff mark cases, view SOAP notes, and move through their queue from a single dashboard screen.",
  },
];

const FEATURES = [
  {
    title: "Smart symptom intake",
    description:
      "Guided questions capture the right information without overwhelming patients in distress.",
  },
  {
    title: "AI-powered prioritization",
    description:
      "Gemini ranks every case by severity so critical patients are never buried in the queue.",
  },
  {
    title: "Live staff dashboard",
    description:
      "Nurses and physicians see the full queue in real time, with one-click status updates.",
  },
  {
    title: "Prescription workflow",
    description:
      "Authorized staff can issue and log prescriptions directly inside the platform.",
  },
  {
    title: "Patient status tracking",
    description:
      "Patients receive a live view of their position and estimated wait — reducing front-desk interruptions.",
  },
  {
    title: "Secure by design",
    description:
      "Role-based access ensures patients only see their own data and staff see only what they need.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-size-[39px_39px] text-neutral-900">
      {/* --- Nav --- */}
      <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6 lg:px-13">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-neutral-800 sm:text-xl"
        >
          FirstIn
        </Link>
        <div className="flex items-center gap-2.5">
          <Link
            href="/patient/dashboard"
            className="inline-flex h-9 items-center rounded-md border border-neutral-900 bg-neutral-900 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-700 sm:h-10 sm:px-4 sm:text-sm"
          >
            Patient Dashboard
          </Link>
          <Link
            href="/staff"
            className="inline-flex h-9 items-center rounded-md border border-neutral-300 bg-white px-3 text-xs font-semibold text-neutral-800 shadow-sm transition hover:border-neutral-500 hover:bg-neutral-50 sm:h-10 sm:px-4 sm:text-sm"
          >
            Staff Access
          </Link>
        </div>
      </div>

      {/* --- Hero --- */}
      <main className="mx-auto flex min-h-[calc(100vh-4.25rem)] w-full max-w-4xl flex-col items-center px-5 pb-16 pt-32 text-center sm:min-h-[calc(100vh-4.75rem)] sm:px-8 sm:pt-40">
        <div className="inline-flex max-w-full flex-col items-stretch">
          <h1 className="text-[3.6rem] font-bold leading-none tracking-tight text-neutral-800 sm:text-[4.8rem] lg:text-[6.4rem]">
            FirstIn
          </h1>
          <TypewriterHeadline />
        </div>

        <section
          className="mt-8 w-full max-w-[20rem] text-center"
          aria-label="Patient check-in"
        >
          <Link
            href="/intake"
            className="group block rounded-lg border border-neutral-800 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800 focus-visible:ring-offset-4 sm:p-4"
          >
            <span className="block text-sm font-semibold tracking-tight text-neutral-800 sm:text-base">
              Patient check-in
            </span>
            <span className="mx-auto mt-1.5 block max-w-xs text-xs leading-snug text-neutral-500 sm:text-sm">
              Answer a few questions and receive guidance on your next step.
            </span>
            <span className="mt-3 inline-flex items-center justify-center gap-1 text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-neutral-500 transition group-hover:text-neutral-900">
              Start intake
            </span>
          </Link>
        </section>
      </main>

      {/* --- How it works --- */}
      <section className="border-t border-neutral-200 bg-white px-5 py-20 sm:px-8 sm:py-28 lg:px-13">
        <div className="mx-auto max-w-4xl">
          <p className="mb-8 text-lg text-neutral-500 sm:text-xl">
            <TypewriterText text="How it works" />
          </p>

          <ol className="grid divide-y divide-neutral-200 rounded-lg border border-neutral-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {HOW_IT_WORKS.map(({ step, title, description }) => (
              <li key={step} className="flex flex-col gap-4 p-6">
                <span className="text-[0.65rem] font-semibold tabular-nums tracking-[0.15em] text-neutral-400">
                  {step}
                </span>
                <h3 className="font-semibold tracking-tight text-neutral-800">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-500">
                  {description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --- Features --- */}
      <section className="border-t border-neutral-200 bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-size-[39px_39px] px-5 py-20 sm:px-8 sm:py-28 lg:px-13">
        <div className="mx-auto max-w-4xl">
          <p className="mb-8 text-lg text-neutral-500 sm:text-xl">
            <TypewriterText text="What's included" />
          </p>
          <ul className="grid gap-px border border-neutral-200 bg-neutral-200 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ title, description }) => (
              <li key={title} className="bg-neutral-50 p-6">
                <h3 className="font-semibold tracking-tight text-neutral-800">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

    </div>
  );
}
