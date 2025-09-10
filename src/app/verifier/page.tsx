import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import VerifierForm from '@/components/VerifierForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Address Verifier',
  description: 'Validate Australian postcode, suburb, and state',
};

export default async function VerifierPage() {
  const session = await getSession();
  if (!session?.username) {
    redirect('/login?next=/verifier');
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-start sm:justify-center px-4">
      {/* Centered page title */}
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Address Verifier</h1>
        <p className="mt-1 text-sm text-slate-500">
          Validate <span className="font-medium">postcode</span> •{' '}
          <span className="font-medium">suburb</span> •{' '}
          <span className="font-medium">state</span>
        </p>
      </header>

      {/* Grid: form + tips side by side */}
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-5">
        {/* Main form */}
        <section className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <VerifierForm />
          </div>
        </section>

        {/* Tips */}
        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <h2 className="text-base font-semibold mb-3">Tips</h2>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <span className="font-medium">Postcode</span>: must be 4 digits
                (e.g. 2000, 3000).
              </li>
              <li>
                <span className="font-medium">State</span>: NSW, VIC, QLD, WA,
                SA, TAS, ACT, NT.
              </li>
              <li>
                The suburb e.g. Melbourne, Perth, Adelaide, etc.
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
