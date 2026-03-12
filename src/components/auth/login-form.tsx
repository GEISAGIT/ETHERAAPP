
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, type User, updateProfile, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { defaultPermissions } from '@/lib/data';

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
  
  const handleUserDocument = async (user: User, isNewUser: boolean = false) => {
    if (!firestore) return null;
    const userDocRef = doc(firestore, 'users', user.uid);
    const emailLower = user.email?.toLowerCase();
    const isAdminEmail = emailLower === 'grupodallax@gmail.com' || emailLower === 'vasin71888@him6.com';
    const defaultPhotoUrl = 'https://firebasestorage.googleapis.com/v0/b/clinicflow-api-banc-3871-3813b.appspot.com/o/uploads%2FjZm8ue98mEO7A0GSDTmExq8HYD82%2Fsimbolo_semfundo_verdeclaro.png?alt=media';

    try {
      const docSnap = await getDoc(userDocRef);

      if (!docSnap.exists()) {
        const initialStatus = isAdminEmail ? 'active' : 'pending';
        const initialRole = isAdminEmail ? 'admin' : 'user';

        if (isNewUser) {
           await updateProfile(user, { photoURL: defaultPhotoUrl });
        }

        const newUserProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || name || 'Usuário',
          email: user.email!,
          photoURL: user.photoURL || defaultPhotoUrl,
          role: initialRole,
          status: initialStatus,
          createdAt: serverTimestamp() as any,
          permissions: defaultPermissions[initialRole],
        };
        await setDoc(userDocRef, newUserProfile);
        return newUserProfile;
      } else {
        const currentData = docSnap.data() as UserProfile;
        const updates: Partial<UserProfile> = {};
        
        // Garante que o administrador mestre sempre tenha permissão total
        if (isAdminEmail) {
          if (currentData.role !== 'admin' || currentData.status !== 'active') {
            updates.role = 'admin';
            updates.status = 'active';
            updates.permissions = defaultPermissions.admin;
          }
        }

        // Auto-reparo de perfis antigos (migração de permissões para novos módulos)
        const role = currentData.role || 'user';
        const expectedPermissions = defaultPermissions[role];
        let permissionsUpdated = false;
        
        if (!currentData.permissions) {
          updates.permissions = expectedPermissions;
          permissionsUpdated = true;
        } else {
          // Verifica se algum módulo novo está faltando nas permissões atuais
          const currentPerms = currentData.permissions as any;
          const newPerms = { ...currentPerms };
          
          Object.keys(expectedPermissions).forEach(key => {
            if (!currentPerms[key]) {
              newPerms[key] = (expectedPermissions as any)[key];
              permissionsUpdated = true;
            }
          });
          
          if (permissionsUpdated) {
            updates.permissions = newPerms;
          }
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(userDocRef, updates);
          return { ...currentData, ...updates };
        }

        return currentData;
      }

    } catch (error) {
      console.error("Erro ao gerenciar documento do usuário:", error);
      if (isAdminEmail) return { role: 'admin', status: 'active' } as any;
      throw error;
    }
  };

  const handleAuthAction = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!auth || !email || !password || (isSignUp && !name)) {
      toast({ variant: "destructive", title: "Erro", description: "Preencha todos os campos." });
      return;
    }
    setIsLoading(true);

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        await handleUserDocument(userCredential.user, true);
        setIsSignUp(false);
        toast({ title: "Cadastro realizado!", description: "Sua conta aguarda aprovação." });
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userProfile = await handleUserDocument(userCredential.user, false);

        if (userProfile?.status !== 'active') {
          await signOut(auth);
          toast({ variant: "destructive", title: "Acesso Pendente", description: "Sua conta ainda não foi ativada pelo administrador." });
        } else {
           router.push('/');
        }
      }
    } catch (error: any) {
      console.error(error);
      let message = "E-mail ou senha inválidos.";
      if (error.code === 'auth/email-already-in-use') message = "E-mail já cadastrado.";
      toast({ variant: "destructive", title: "Falha na Autenticação", description: message });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordReset = async () => {
    if (!auth || !email) {
      toast({ variant: "destructive", title: "Erro", description: "Insira seu email para redefinir a senha." });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Sucesso", description: "E-mail de redefinição enviado." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível enviar o email." });
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
          {isSignUp ? 'Preencha os campos para se cadastrar.' : 'Bem-vindo à Ethera!'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleAuthAction}>
        <CardContent className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" type="text" placeholder="Seu nome completo" required disabled={isLoading} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="email@exemplo.com" required disabled={isLoading} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" placeholder="••••••••" required disabled={isLoading} value={password} onChange={(e) => setPassword(e.target.value)} />
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
