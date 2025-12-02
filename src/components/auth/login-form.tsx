'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth, setDocumentNonBlocking, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, updateProfile, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';

export function LoginForm() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const createUserDocument = async (user: User) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (!userDocSnap.exists()) {
      // Use setDocumentNonBlocking com o UID do usuário como ID do documento
      setDocumentNonBlocking(doc(firestore, 'users', user.uid), {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
      });
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
        // O objeto do usuário pode não ser atualizado imediatamente com o nome de exibição,
        // então passamos o usuário novo do userCredential.
        await createUserDocument(userCredential.user);
        await sendEmailVerification(userCredential.user);
        
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Enviamos um e-mail de verificação para você. Por favor, confirme seu e-mail.",
        });
        setIsSignUp(false); // Alterna para a visualização de login após o cadastro bem-sucedido
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // Após o login bem-sucedido, garante que o documento do usuário exista.
        await createUserDocument(userCredential.user);
        // onAuthStateChanged no provider cuidará do redirecionamento para o painel.
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
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar email",
        description: "Não foi possível enviar o email de redefinição. Verifique o email digitado.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">
          {isSignUp ? 'Criar uma conta' : 'Bem-vindo de volta'}
        </CardTitle>
        <CardDescription>
          {isSignUp ? 'Preencha os campos para se cadastrar.' : 'Faça login para gerenciar as finanças da sua clínica.'}
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
                <Button type="button" variant="link" size="sm" className="p-0 h-auto font-normal" onClick={handlePasswordReset} disabled={isLoading}>
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
           <Button type="button" variant="link" size="sm" onClick={() => setIsSignUp(!isSignUp)} disabled={isLoading}>
            {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
