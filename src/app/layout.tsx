import './globals.css';
import NavbarWrapper from '@/components/NavbarWrapper';

export const metadata = {
  title: 'Verifier App',
  description: 'Next.js + ES + Auth + Verifier',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900"
      style={{ backgroundImage: "url('/Background.png')", backgroundSize: "cover" }}>
        <NavbarWrapper />
        <main className="container mx-auto max-w-6xl px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
