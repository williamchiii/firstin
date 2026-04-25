export default function ConfirmationPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-sm p-10 max-w-md w-full text-center flex flex-col items-center gap-4">
        <span className="text-6xl">✅</span>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re checked in</h1>
        <p className="text-gray-600">Please take a seat. A nurse will call your name shortly.</p>
        <p className="text-sm text-gray-400">Do not leave the waiting area.</p>
      </div>
    </div>
  );
}
