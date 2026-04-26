import "./globals.css";

export const metadata = {
  title: "FirstIn — Hospital Triage",
  description: "Voice-first AI triage for emergency departments",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
