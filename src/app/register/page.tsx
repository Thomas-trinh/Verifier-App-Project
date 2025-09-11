import AuthForm from '@/components/AuthForm';

export default function Page() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-2">Register</h1>
        <AuthForm mode="register" />
        
        {/* Instructions */}
        <div className="mt-6 mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 border border-slate-200">
          <p className="mb-1 font-medium">Username requirements:</p>
          <ul className="list-disc list-inside">
            <li>At least contains 3 characters</li>
            <li>
              Letters, numbers, dot (<code>.</code>), underscore (<code>_</code>),
              and dash (<code>-</code>) only
            </li>
          </ul>
          <p className="mt-2 mb-1 font-medium">Password requirements:</p>
          <ul className="list-disc list-inside">
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
            <li>One special character (e.g. !@#$%)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
