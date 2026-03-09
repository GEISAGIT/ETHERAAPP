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
import { Loader2, Wallet, Briefcase, Settings, ShieldAlert, User as UserIcon } from 'lucide-react';
import type { UserProfile, Permissions, CrudActions, ViewEditActions, ViewOnlyActions } from '@/lib/types';
import { useEffect, useState } from 'react';
import { defaultPermissions } from '@/lib/data';

type PermissionConfig = {
  key: keyof Permissions;
  label: string;
  actions: (keyof (CrudActions | ViewEditActions | ViewOnlyActions))[];
};

type ModuleConfig = {
  title: string;
  icon: React.ElementType;
  permissions: PermissionConfig[];
};

const modules: ModuleConfig[] = [
  {
    title: 'Financeiro',
    icon: Wallet,
    permissions: [
      { key: 'dashboard', label: 'Painel Geral', actions: ['view'] },
      { key: 'transactions', label: 'Transações', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'contracts', label: 'Cadastro de Contratos', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'expenses', label: 'Classificação de Despesas', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'budgets', label: 'Orçamentos', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'reports', label: 'Relatórios', actions: ['view'] },
      { key: 'apiBank', label: 'API BANK (BETA)', actions: ['view'] },
    ]
  },
  {
    title: 'Recursos Humanos',
    icon: Briefcase,
    permissions: [
      { key: 'timeCard', label: 'Cartão de Ponto', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'timeTracking', label: 'Controle de Ponto (Beta)', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'employees', label: 'Cadastro de Funcionários', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'hrTimesheet', label: 'Gestão de Horários', actions: ['view', 'create', 'edit', 'delete'] },
    ]
  },
  {
    title: 'Administração',
    icon: ShieldAlert,
    permissions: [
      { key: 'upload', label: 'Upload de Arquivos', actions: ['view', 'create', 'edit', 'delete'] },
      { key: 'userManagement', label: 'Gerenciar Usuários', actions: ['view', 'create', 'edit', 'delete'] },
    ]
  },
  {
    title: 'Geral & Perfil',
    icon: UserIcon,
    permissions: [
      { key: 'home', label: 'Página Inicial', actions: ['view'] },
      { key: 'profile', label: 'Perfil do Usuário', actions: ['view', 'edit'] },
      { key: 'settings', label: 'Configurações do Sistema', actions: ['view'] },
    ]
  }
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
  const { user } = useUser();
  
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  const targetUserRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);
  
  const { data: targetUser, isLoading: isTargetUserLoading } = useDoc<UserProfile>(targetUserRef);

  useEffect(() => {
    if (targetUser) {
        setPermissions(targetUser.permissions || defaultPermissions.user);
    }
  }, [targetUser]);

  const handlePermissionChange = (
    page: keyof Permissions,
    action: string,
    checked: boolean
  ) => {
    setPermissions(prev => {
        if (!prev) return null;
        return {
            ...prev,
            [page]: {
                ...prev[page as keyof Permissions],
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
        description: `As permissões de acesso para ${targetUser?.displayName} foram atualizadas com sucesso.`,
      });
      setIsSaving(false);
    }, 500);
  };

  if (isTargetUserLoading) {
    return (
      <AppLayout>
        <div className="space-y-8">
            <header><Skeleton className="h-9 w-80" /><Skeleton className="h-5 w-96 mt-2" /></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-64 w-full" />))}
            </div>
        </div>
      </AppLayout>
    );
  }

  if (!targetUser) notFound();

  return (
    <AppLayout>
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Controle de Acesso</h1>
            <p className="text-muted-foreground">
              Configure detalhadamente o que <span className="font-semibold text-foreground">{targetUser.displayName}</span> pode acessar no sistema.
            </p>
          </div>
          <Button onClick={handleSaveChanges} disabled={isSaving} className="shadow-lg">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Configurações
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modules.map((module) => (
            <Card key={module.title} className="border-primary/10">
              <CardHeader className="bg-primary/5 border-b border-primary/10">
                <CardTitle className="flex items-center gap-2 text-primary">
                  <module.icon className="h-5 w-5" />
                  {module.title}
                </CardTitle>
                <CardDescription>Permissões do módulo {module.title.toLowerCase()}.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {module.permissions.map((perm) => (
                  <div key={perm.key} className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">{perm.label}</h4>
                    <div className="grid grid-cols-2 gap-3 pl-4 border-l-2 border-primary/20">
                      {perm.actions.map((action) => (
                        <div key={action} className="flex items-center space-x-2">
                          <Checkbox
                            id={`${perm.key}-${action}`}
                            checked={(permissions?.[perm.key] as any)?.[action] ?? false}
                            onCheckedChange={(checked) => handlePermissionChange(perm.key, action, !!checked)}
                            disabled={targetUser.role === 'admin' && (perm.key === 'userManagement')}
                          />
                          <Label htmlFor={`${perm.key}-${action}`} className="text-xs cursor-pointer">
                            {actionLabels[action] || action}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

export default UserAccessControlPage;
