
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
  { key: 'home', label: 'Início', actions: ['view'] },
  { key: 'dashboard', label: 'Painel', actions: ['view'] },
  { key: 'transactions', label: 'Transações', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'budgets', label: 'Orçamentos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'reports', label: 'Relatórios', actions: ['view'] },
  { key: 'upload', label: 'Upload de Arquivos', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'apiBank', label: 'API BANK (BETA)', actions: ['view'] },
  { key: 'userManagement', label: 'Gerenciar Usuários', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'profile', label: 'Perfil', actions: ['view', 'edit'] },
  { key: 'settings', label: 'Configurações', actions: ['view'] },
  { key: 'employees', label: 'Funcionários', actions: ['view', 'create', 'edit', 'delete'] },
  { key: 'hrTimesheet', label: 'Folha Ponto', actions: ['view', 'create', 'edit', 'delete'] },
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

  const targetUserRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);
  
  const { data: targetUser, isLoading: isTargetUserLoading } = useDoc<UserProfile>(targetUserRef);

  const viewerRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: viewerProfile, isLoading: isViewerLoading } = useDoc<UserProfile>(viewerRef);

  useEffect(() => {
    if (targetUser) {
        // Deep merge logic to ensure UI has all keys even if missing in DB
        const userPerms = targetUser.permissions || defaultPermissions.user;
        const basePerms = JSON.parse(JSON.stringify(defaultPermissions.user));

        const mergedPerms = { ...basePerms };
        allPermissionsConfig.forEach(config => {
            const key = config.key;
            if (userPerms[key]) {
                mergedPerms[key] = { ...mergedPerms[key], ...userPerms[key] };
            }
        });

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

  const pageLoading = isUserLoading || isTargetUserLoading || isViewerLoading;

  if (pageLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
            <header><Skeleton className="h-9 w-80" /><Skeleton className="h-5 w-96 mt-2" /></header>
            <Card><CardHeader><Skeleton className="h-8 w-64" /></CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(8)].map((_, i) => (<div key={i} className="flex items-center space-x-2"><Skeleton className="h-4 w-4" /><Skeleton className="h-4 w-40" /></div>))}
                </CardContent>
            </Card>
        </div>
      </AppLayout>
    );
  }
  
  if (!viewerProfile || (viewerProfile.role !== 'admin' && !viewerProfile.permissions?.userManagement?.edit)) {
      return (
          <AppLayout>
              <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">Você não tem permissão para gerenciar acessos de usuários.</p>
              </div>
          </AppLayout>
      );
  }

  // Only throw notFound if loading is finished and we definitely have no data
  if (!isTargetUserLoading && !targetUser) {
    notFound();
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <header>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Controle de Acesso</h1>
          <p className="text-muted-foreground">
            Defina quais páginas <span className="font-semibold text-foreground">{targetUser?.displayName}</span> pode acessar.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Permissões de Acesso</CardTitle>
            <CardDescription>Selecione as ações que este usuário pode realizar.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {allPermissionsConfig.map(permissionInfo => (
                <div key={permissionInfo.key}>
                    <h3 className="font-semibold mb-3 text-primary">{permissionInfo.label}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-2 border-l-2 border-primary/20 ml-2">
                        {permissionInfo.actions.map(action => (
                            <div key={action} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${permissionInfo.key}-${action}`}
                                    checked={permissions?.[permissionInfo.key]?.[action as keyof typeof permissions[typeof permissionInfo.key]] ?? false}
                                    onCheckedChange={(checked) => handlePermissionChange(permissionInfo.key, action, !!checked)}
                                    disabled={targetUser?.role === 'admin' && (permissionInfo.key === 'userManagement' || permissionInfo.key === 'home')}
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
