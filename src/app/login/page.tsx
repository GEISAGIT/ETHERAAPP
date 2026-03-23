'use client';

import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const imageUrl = 'https://firebasestorage.googleapis.com/v0/b/studio-1445297951-c95ca.firebasestorage.app/o/uploads%2FjZm8ue98mEO7A0GSDTmExq8HYD82%2Fsimbolo_semfundo_verdeclaro.png?alt=media&token=c68144ba-c10e-4921-8fe7-eb791d34eebe';

  return (
    <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-background p-8 text-foreground">
        <img src={imageUrl} alt="Ethera Logo" className="w-24 h-24 mb-6" />
        <div className="text-center">
            <h1 className="font-headline text-4xl font-bold">Bem-vindo à Ethera</h1>
            <p className="mt-2 text-muted-foreground">Saúde e longevidade ao seu alcance.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-4 bg-card text-card-foreground lg:bg-background lg:text-foreground">
        <div className="w-full max-w-md space-y-8">
            <div className="flex flex-col items-center justify-center lg:hidden">
              <img src={imageUrl} alt="Ethera Logo" className="w-20 h-20 mb-4" />
              <h1 className="font-headline text-3xl font-bold">Ethera</h1>
            </div>
            <LoginForm />
        </div>
      </div>
    </div>
  );
}
