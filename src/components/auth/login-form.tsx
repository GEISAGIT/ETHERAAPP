'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

export function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('demo@clinicflow.com');
  const [password, setPassword] = useState('password');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth || !email || !password) {
      toast({
        variant: "destructive",
        title: "Erro de Login",
        description: "Por favor, preencha o email e a senha.",
      });
      return;
    }
    setIsLoading(true);

    try {
      // Tenta criar um novo usuário.
      await createUserWithEmailAndPassword(auth, email, password);
      // O onAuthStateChanged irá redirecionar para o dashboard.
    } catch (creationError: any) {
      // Se o usuário já existe, tenta fazer o login.
      if (creationError.code === 'auth/email-already-in-use') {
        try {
          await signInWithEmailAndPassword(auth, email, password);
          // O onAuthStateChanged irá redirecionar para o dashboard.
        } catch (signInError: any) {
          toast({
            variant: "destructive",
            title: "Erro de Login",
            description: "A senha está incorreta. Por favor, tente novamente.",
          });
        }
      } else {
        // Outros erros durante a criação da conta.
        toast({
          variant: "destructive",
          title: "Erro de Cadastro",
          description: creationError.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
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
