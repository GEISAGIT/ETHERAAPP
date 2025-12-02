import { LoginForm } from '@/components/auth/login-form';
import { ClinicFlowLogo } from '@/components/icons';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center text-primary">
           <ClinicFlowLogo className="h-16 w-16" />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
