import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await getSession();
  return (
    <div>
      <h1 className="text-xl font-semibold mb-2">Verifier App</h1>
      <p>{session ? `Welcome, ${session.username}` : 'Not logged in'}</p>
    </div>
  );
}
