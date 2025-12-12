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
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, updateProfile, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  const [authMessage, setAuthMessage] = useState<string | null>(null);

  useEffect(() => {
    const message = searchParams.get('message');
    if (message) {
      setAuthMessage(message);
    }
  }, [searchParams]);

  const handleUserDocument = async (user: User, isNewUser: boolean = false) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    
    // Define o role do usuário
    const userRole = user.email === 'grupodallax@gmail.com' ? 'admin' : 'user';

    try {
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists() && isNewUser) {
            // Admin user is active by default, others are pending
            const initialStatus = userRole === 'admin' ? 'active' : 'pending';
            await setDoc(userDocRef, {
                uid: user.uid,
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                role: userRole,
                status: initialStatus,
                createdAt: serverTimestamp()
            }, { merge: false });
        } else if (userDocSnap.exists()) {
            // If user exists, ensure role is correct, but don't change status.
            await setDoc(userDocRef, { role: userRole }, { merge: true });
        }

        // CRÍTICO: Força a atualização do token de ID para obter as custom claims mais recentes no cliente.
        // Isso garante que isAdmin() nas regras de segurança funcione corretamente após o login.
        await user.getIdToken(true);

    } catch (error) {
        console.error("Erro ao gerenciar documento do usuário:", error);
        toast({
            variant: "destructive",
            title: "Erro de Banco de Dados",
            description: "Não foi possível criar ou atualizar as informações do usuário.",
        });
    }
  };

  const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage(null); // Clear previous messages
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
        await handleUserDocument(userCredential.user, true); // `true` indicates it's a new user
        
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Sua conta foi criada e está pendente de aprovação pelo administrador.",
        });
        setIsSignUp(false); // Switch to login view
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await handleUserDocument(userCredential.user);
        router.push('/'); // Redirect to home, which will handle routing based on status
      }
    } catch (error: any) {
      let message = "Ocorreu um erro. Tente novamente.";
      if (error.code === 'auth/email-already-in-use') {
        message = "Este email já está em uso. Tente fazer login.";
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        message = "Email ou senha inválidos.";
      } else if (error.code === 'auth/weak-password') {
        message = "A senha deve ter pelo menos 6 caracteres.";
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
        {authMessage ? (
          <CardDescription className="text-primary font-medium">{authMessage}</CardDescription>
        ) : (
          <CardDescription>
            {isSignUp ? 'Preencha os campos para se cadastrar.' : 'Bem-vindo de volta!'}
          </CardDescription>
        )}
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
