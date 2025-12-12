'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, type User, updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { defaultPermissions } from '@/lib/data';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const handleUserDocument = async (user: User, isNewUser: boolean = false) => {
    if (!firestore) return null;
    const userDocRef = doc(firestore, 'users', user.uid);
    const isAdmin = user.email === 'grupodallax@gmail.com';

    try {
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        const initialStatus = isAdmin ? 'active' : 'pending';
        const initialRole = isAdmin ? 'admin' : 'user';

        const newUserProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || name || 'Usuário',
          email: user.email!,
          role: initialRole,
          status: initialStatus,
          createdAt: serverTimestamp() as any,
          permissions: defaultPermissions[initialRole],
        };
        await setDoc(userDocRef, newUserProfile);
        
        if (isNewUser) {
          if (isAdmin) {
             toast({
              title: "Bem-vindo Administrador!",
              description: "Sua conta de administrador foi criada e está ativa.",
            });
          } else {
            toast({
              title: "Cadastro realizado com sucesso!",
              description: "Sua conta foi criada e está pendente de aprovação.",
            });
          }
        }
        return newUserProfile;
      } else {
        await user.getIdToken(true);
        return docSnap.data() as UserProfile;
      }

    } catch (error) {
      console.error("Erro ao gerenciar documento do usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro de Banco de Dados",
        description: "Não foi possível criar ou verificar suas informações de usuário.",
      });
      throw error;
    }
  };

  const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth || !email || !password || (isSignUp && !name)) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, preencha todos os campos.",
      });
      return;
    }
    setIsLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await handleUserDocument(userCredential.user, true);
        setIsSignUp(false); 
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userProfile = await handleUserDocument(userCredential.user, false);

        if (userProfile?.status !== 'active') {
          const message = userProfile?.status === 'pending'
            ? 'Sua conta está pendente de aprovação. Contate o administrador.'
            : 'Sua conta foi rejeitada. Contate o administrador.';
          
          await signOut(auth); // Desloga o usuário
          
          toast({
            variant: "destructive",
            title: "Acesso Negado",
            description: message,
          });

        } else {
           router.push('/'); // Redireciona para home, que vai para o dashboard
        }
      }
    } catch (error: any) {
      let message = "Ocorreu um erro. Tente novamente.";
      if (error.code) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                message = "Este email já está em uso. Tente fazer login.";
                break;
            case 'auth/wrong-password':
            case 'auth/user-not-found':
            case 'auth/invalid-credential':
                message = "Email ou senha inválidos.";
                break;
            case 'auth/weak-password':
                message = "A senha deve ter pelo menos 6 caracteres.";
                break;
        }
      }
      toast({
        variant: "destructive",
        title: isSignUp ? "Erro no Cadastro" : "Erro de Login",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!auth || !email) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Por favor, insira seu email para redefinir a senha.",
      });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Email de redefinição enviado",
        description: "Verifique sua caixa de entrada e pasta de spam para redefinir sua senha.",
      });
    } catch (error: any) {
      let message = "Não foi possível enviar o email de redefinição.";
      if (error.code === 'auth/user-not-found') {
        message = "Este email não está cadastrado. Verifique o email digitado.";
      }
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Card className="bg-card/80 backdrop-blur-sm border-border/50">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          {isSignUp ? 'Crie sua conta' : 'Acesse sua conta'}
        </CardTitle>
        <CardDescription>
          {isSignUp ? 'Preencha os campos para se cadastrar.' : 'Bem-vindo de volta!'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleAuthAction}>
        <CardContent className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="Seu nome completo" 
                required 
                disabled={isLoading} 
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
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
              placeholder="••••••••"
              required 
              disabled={isLoading} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {!isSignUp && (
             <div className="text-right">
                <Button type="button" variant="link" size="sm" className="p-0 h-auto font-normal text-primary" onClick={handlePasswordReset} disabled={isLoading}>
                  Esqueceu a senha?
                </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSignUp ? 'Cadastrar' : 'Entrar'}
          </Button>
           <Button type="button" variant="link" size="sm" onClick={() => setIsSignUp(!isSignUp)} disabled={isLoading} className="text-primary">
            {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
