import Link from "next/link";
import StaffLoginForm from "./StaffLoginForm";

export const metadata = { title: "Staff sign-in — WaitWise" };

export default async function StaffLoginPage({ searchParams }) {
  const params = (await searchParams) || {};
  const from = typeof params.from === "string" ? params.from : "/staff";
  const denied = params.denied === "1";
  return (
    <div className="min-h-svh bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:26px_26px] text-neutral-900">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6 lg:px-[3.25rem]">
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
        <StaffLoginForm from={from} denied={denied} />
      </main>
    </div>
  );
}
