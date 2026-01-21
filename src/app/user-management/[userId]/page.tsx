
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { notFound, useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { UserProfile, Permissions, CrudActions, ViewEditActions, ViewOnlyActions } from '@/lib/types';
import { useEffect, useState } from 'react';
import { defaultPermissions } from '@/lib/data';

const allPermissionsConfig: {
  key: keyof Permissions;
  label: string;
  actions: (keyof (CrudActions | ViewEditActions | ViewOnlyActions))[];
}[] = [
  { key: 'dashboard', label: 'Painel', actions: ['view'] },
  { key: 'transactions', label: 'Transações', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'budgets', label: 'Orçamentos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'reports', label: 'Relatórios', actions: ['view'] },
  { key: 'upload', label: 'Upload de Arquivos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'userManagement', label: 'Gerenciar Usuários', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'profile', label: 'Perfil', actions: ['view', 'edit'] },
  { key: 'settings', label: 'Configurações', actions: ['view'] },
];

const actionLabels: Record<string, string> = {
    view: 'Visualizar',
    create: 'Criar',
    edit: 'Editar',
    delete: 'Excluir'
}


function UserAccessControlPage() {
  const params = useParams();
  const userId = params.userId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  // Reference to the user being edited. It now depends on `user` being loaded.
  const userDocRef = useMemoFirebase(() => {
    // Wait until the admin user is loaded and confirmed before creating the reference
    if (!firestore || !userId || !user) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId, user]);
  
  const { data: targetUser, isLoading: isTargetUserLoading } = useDoc<UserProfile>(userDocRef);

  // Initialize local permissions state once target user data is loaded
  useEffect(() => {
    if (targetUser) {
        const userPerms = targetUser.permissions || defaultPermissions.user;
        const mergedPerms = JSON.parse(JSON.stringify(defaultPermissions.user));

        for (const page in mergedPerms) {
            if (userPerms[page as keyof Permissions]) {
                for (const action in mergedPerms[page as keyof Permissions]) {
                    const pageKey = page as keyof Permissions;
                    const actionKey = action as keyof Permissions[typeof pageKey];
                    if (typeof userPerms[pageKey]?.[actionKey] === 'boolean') {
                        (mergedPerms[pageKey] as any)[actionKey] = userPerms[pageKey]?.[actionKey];
                    }
                }
            }
        }
        setPermissions(mergedPerms);
    }
  }, [targetUser]);


  const handlePermissionChange = (
    page: keyof Permissions,
    action: keyof (CrudActions | ViewEditActions | ViewOnlyActions),
    checked: boolean
  ) => {
    setPermissions(prev => {
        if (!prev) return null;
        return {
            ...prev,
            [page]: {
                ...prev[page],
                [action]: checked,
            },
        };
    });
  };
  
  const handleSaveChanges = () => {
    if (!firestore || !permissions || !userId) return;
    setIsSaving(true);

    const userToUpdateRef = doc(firestore, 'users', userId);
    updateDocumentNonBlocking(userToUpdateRef, { permissions });

    setTimeout(() => {
      toast({
        title: 'Permissões Salvas!',
        description: `As permissões para ${targetUser?.displayName} foram atualizadas.`,
      });
      setIsSaving(false);
    }, 500);
  };

  const pageLoading = isUserLoading || isTargetUserLoading || !permissions;

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
              Selecione as ações que este usuário pode realizar em cada página.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {allPermissionsConfig.map(permissionInfo => (
                <div key={permissionInfo.key}>
                    <h3 className="font-semibold mb-3">{permissionInfo.label}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-2 border-l-2 ml-2">
                        {permissionInfo.actions.map(action => (
                            <div key={action} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${permissionInfo.key}-${action}`}
                                    checked={permissions?.[permissionInfo.key]?.[action as keyof typeof permissions[typeof permissionInfo.key]] ?? false}
                                    onCheckedChange={(checked) => handlePermissionChange(permissionInfo.key, action, !!checked)}
                                    disabled={targetUser.role === 'admin' && permissionInfo.key === 'userManagement'}
                                />
                                <Label htmlFor={`${permissionInfo.key}-${action}`} className="font-normal capitalize">
                                    {actionLabels[action] || action}
                                </Label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}

export default UserAccessControlPage;
