import './globals.css';
import NavbarWrapper from '@/components/NavbarWrapper';

export const metadata = {
  title: 'Verifier App',
  description: 'Next.js + ES + Auth + Verifier',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning để chặn warning khi Navbar hydrate */}
      <body suppressHydrationWarning>
        <NavbarWrapper />
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
