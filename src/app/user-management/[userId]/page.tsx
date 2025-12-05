
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { notFound, useRouter, useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { UserProfile, Permissions } from '@/lib/types';
import { useEffect, useState } from 'react';

const allPermissionsList: { key: keyof Permissions; label: string }[] = [
  { key: 'dashboard', label: 'Painel' },
  { key: 'transactions', label: 'Transações' },
  { key: 'budgets', label: 'Orçamentos' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'upload', label: 'Upload' },
  { key: 'userManagement', label: 'Gerenciar Usuários' },
  { key: 'profile', label: 'Perfil' },
  { key: 'settings', label: 'Configurações' },
];

const defaultPermissions: Permissions = {
  dashboard: true,
  transactions: true,
  budgets: true,
  reports: true,
  upload: true,
  profile: true,
  settings: true,
  userManagement: false,
};

function UserAccessControlPage() {
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  // Reference to the admin's own profile to check for role
  const adminDocRef = useMemoFirebase(() => {
    if (!adminUser) return null;
    return doc(firestore, 'users', adminUser.uid);
  }, [firestore, adminUser]);

  // Reference to the user being edited
  const userDocRef = useMemoFirebase(() => {
    if (!userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);
  
  const { data: adminProfile, isLoading: isAdminProfileLoading } = useDoc<UserProfile>(adminDocRef);
  const { data: targetUser, isLoading: isTargetUserLoading } = useDoc<UserProfile>(userDocRef);

  // Initialize local permissions state once target user data is loaded
  useEffect(() => {
    if (targetUser) {
      setPermissions(targetUser.permissions || defaultPermissions);
    }
  }, [targetUser]);

  // Handle security and redirects
  useEffect(() => {
    if (!isAdminProfileLoading && adminProfile?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [adminProfile, isAdminProfileLoading, router]);


  const handlePermissionChange = (permissionKey: keyof Permissions, checked: boolean) => {
    setPermissions(prev => prev ? { ...prev, [permissionKey]: checked } : null);
  };
  
  const handleSaveChanges = () => {
    if (!firestore || !permissions || !userId) return;
    setIsLoading(true);

    const userToUpdateRef = doc(firestore, 'users', userId);
    updateDocumentNonBlocking(userToUpdateRef, { permissions });

    setTimeout(() => {
      toast({
        title: 'Permissões Salvas!',
        description: `As permissões para ${targetUser?.displayName} foram atualizadas.`,
      });
      setIsLoading(false);
    }, 500);
  };

  const pageLoading = isAdminProfileLoading || isTargetUserLoading;

  if (pageLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
            <header>
                <Skeleton className="h-9 w-80" />
                <Skeleton className="h-5 w-96 mt-2" />
            </header>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-80 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    ))}
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </div>
      </AppLayout>
    );
  }
  
  if (adminProfile?.role !== 'admin') {
     return (
      <AppLayout>
        <div className="flex h-full w-full items-center justify-center">
            <p className="text-muted-foreground">Você não tem permissão para ver esta página.</p>
        </div>
      </AppLayout>
    );
  }

  if (!targetUser) {
    notFound();
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Controle de Acesso</h1>
          <p className="text-muted-foreground">
            Defina quais páginas <span className="font-semibold text-foreground">{targetUser.displayName}</span> pode acessar.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Permissões de Acesso</CardTitle>
            <CardDescription>
              Selecione as páginas que este usuário pode visualizar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allPermissionsList.map(permission => (
              <div key={permission.key} className="flex items-center space-x-2">
                <Checkbox
                  id={permission.key}
                  checked={permissions?.[permission.key] ?? false}
                  onCheckedChange={(checked) =>
                    handlePermissionChange(permission.key, !!checked)
                  }
                  // Admin users can't have their core permissions removed via this UI
                  disabled={targetUser.role === 'admin' && (permission.key === 'userManagement')}
                />
                <Label htmlFor={permission.key} className="font-normal">
                  {permission.label}
                </Label>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveChanges} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}

export default UserAccessControlPage;
    