'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth, useUser, useStorage, useFirestore } from '@/firebase';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Camera, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const storage = useStorage();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !storage || !auth?.currentUser || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível iniciar o upload. Verifique sua autenticação.',
      });
      return;
    }
    
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `profile-pictures/${user.uid}`);
      
      const snapshot = await uploadBytes(storageRef, file);
      const photoURL = await getDownloadURL(snapshot.ref);

      await updateProfile(auth.currentUser, { photoURL });
      
      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, { photoURL }, { merge: true });

      toast({
        title: 'Sucesso!',
        description: 'Sua foto de perfil foi atualizada.',
      });
    } catch (error: any) {
      console.error("Erro no upload da imagem:", error);
      toast({
        variant: 'destructive',
        title: 'Erro no Upload',
        description: error.message || 'Ocorreu um erro inesperado ao fazer o upload.',
      });
    } finally {
      setIsUploading(false);
    }
  };


  const handleNameUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !auth?.currentUser) return;

    setIsUpdatingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName });
      
      if (firestore) {
        const userDocRef = doc(firestore, 'users', user.uid);
        await setDoc(userDocRef, { displayName }, { merge: true });
      }

      toast({
        title: 'Sucesso!',
        description: 'Seu nome foi atualizado.',
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro ao Atualizar',
        description: 'Não foi possível atualizar seu nome. Tente novamente.',
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email || !auth) return;

    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'E-mail enviado',
        description: 'Um link para redefinição de senha foi enviado para seu e-mail.',
      });
    } catch (error: any) {
      console.error(error);
       toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível enviar o e-mail de redefinição. Tente novamente mais tarde.',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  if (isUserLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground">Gerencie as informações da sua conta.</p>
      </header>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'Avatar'} />
                  <AvatarFallback className="text-3xl">
                    {getInitials(user?.displayName)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  <span className="sr-only">Trocar foto</span>
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/png, image/jpeg, image/gif"
                />
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-xl font-semibold">{user?.displayName}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>Atualize seu nome de exibição.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleNameUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Nome de exibição</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isUpdatingName}
                  />
                </div>
                <Button type="submit" disabled={isUpdatingName || displayName === user?.displayName}>
                  {isUpdatingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar nome
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Segurança</CardTitle>
              <CardDescription>Gerencie suas configurações de segurança.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Senha</p>
                  <p className="text-sm text-muted-foreground">••••••••</p>
                </div>
                <Button variant="outline" onClick={handlePasswordReset} disabled={isSendingReset}>
                  {isSendingReset && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Redefinir senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <header>
        <Skeleton className="h-9 w-32" />
        <Skeleton className="mt-2 h-5 w-72" />
      </header>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="items-center">
              <Skeleton className="h-24 w-24 rounded-full" />
            </CardHeader>
            <CardContent className="text-center space-y-2">
              <Skeleton className="h-6 w-40 mx-auto" />
              <Skeleton className="h-5 w-48 mx-auto" />
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-64 mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
           <Card className="mt-8">
            <CardHeader>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-5 w-56 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                 <div className='w-full'>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-24 mt-2" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
