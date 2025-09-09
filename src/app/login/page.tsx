import AuthForm from '@/components/AuthForm';
export default function Page() {
  return (
    <div className="flex items-center justify-center p-8">
      <div>
        <h1 className="text-xl font-semibold mb-4">Login</h1>
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
