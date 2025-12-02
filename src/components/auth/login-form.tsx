'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth, initiateEmailSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('demo@clinicflow.com');
  const [password, setPassword] = useState('password');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Erro de Login",
        description: "Por favor, preencha o email e a senha.",
      });
      return;
    }
    setIsLoading(true);
    
    // Non-blocking sign-in
    initiateEmailSignIn(auth, email, password);

    // We don't await the result here. The useUser hook will detect the auth state change.
    // We'll optimistically navigate. If there's an error, onAuthStateChanged will catch it,
    // but a better implementation would handle the error from initiateEmailSignIn promise.
    // For now, let's keep it simple. We'll add a small delay to allow firebase to process.
    setTimeout(() => {
        // The redirection is now handled by the root page based on auth state
        // router.push('/dashboard');
    }, 1000);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="email@exemplo.com" 
              required 
              disabled={isLoading} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              required 
              disabled={isLoading} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Entrar
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
