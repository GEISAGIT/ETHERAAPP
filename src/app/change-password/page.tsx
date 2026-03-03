
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { useAuth, useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { updatePassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export default function ChangePasswordPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !user || !firestore) return;

    if (password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Senha muito curta',
        description: 'A senha deve ter pelo menos 6 caracteres.',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Senhas não coincidem',
        description: 'As senhas digitadas são diferentes.',
      });
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update password in Firebase Auth
      await updatePassword(auth.currentUser, password);

      // 2. Clear the mustChangePassword flag in Firestore
      const userRef = doc(firestore, 'users', user.uid);
      updateDocumentNonBlocking(userRef, { mustChangePassword: false });

      toast({
        title: 'Senha Atualizada!',
        description: 'Sua senha foi alterada com sucesso. Bem-vindo à Ethera.',
      });

      // 3. Redirect to home
      router.push('/home');
    } catch (error: any) {
      console.error(error);
      let message = 'Não foi possível atualizar a senha.';
      if (error.code === 'auth/requires-recent-login') {
        message = 'Para sua segurança, faça login novamente para trocar a senha.';
        auth.signOut().then(() => router.push('/login'));
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao Atualizar',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="font-headline text-2xl">Troca de Senha Obrigatória</CardTitle>
          <CardDescription>
            Este é o seu primeiro acesso. Por favor, escolha uma nova senha segura para continuar.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleUpdatePassword}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Repita a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Salvar e Entrar
                </>
              )}
            </Button>
            <Button 
              type="button" 
              variant="ghost" 
              className="text-muted-foreground text-xs"
              onClick={() => auth.signOut().then(() => router.push('/login'))}
              disabled={isLoading}
            >
              Cancelar e Sair
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
