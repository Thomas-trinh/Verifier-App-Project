import AuthForm from '@/components/AuthForm';

export default function Page() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold mb-4">Register</h1>
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
