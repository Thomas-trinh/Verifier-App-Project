import VerifierForm from '@/components/VerifierForm';

export const dynamic = 'force-dynamic';

export default function VerifierPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold mb-3">Address Verifier</h1>
      <VerifierForm />
    </div>
  );
}
