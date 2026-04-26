import Link from "next/link";
import StaffDashboard from "./StaffDashboard";
import StaffTopActions from "./StaffTopActions";

export const metadata = { title: "Staff dashboard — FirstIn" };

export default function StaffPage() {
  return (
    <div className="min-h-svh bg-white bg-[radial-gradient(circle_at_1.5px_1.5px,rgba(23,23,23,0.2)_1.5px,transparent_0)] bg-[length:39px_39px] text-neutral-900">
      <div className="flex items-center justify-between px-5 pt-5 sm:px-8 sm:pt-6 lg:px-[3.25rem]">
        <Link
          href="/"
          className="text-base font-semibold tracking-tight text-neutral-800 sm:text-xl"
        >
          FirstIn
        </Link>
        <StaffTopActions />
      </div>

      <main className="p-5 sm:p-6">
        <StaffDashboard />
      </main>
    </div>
  );
}
