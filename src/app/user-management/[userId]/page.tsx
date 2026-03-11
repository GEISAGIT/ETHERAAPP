
'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { useDoc, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wallet, Briefcase, Settings, ShieldAlert, ChevronDown, ChevronUp, Package, MapPin } from 'lucide-react';
import type { UserProfile, Permissions, CrudActions } from '@/lib/types';
import { useEffect, useState, Suspense } from 'react';
import { defaultPermissions } from '@/lib/data';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type ModuleConfig = {
  title: string;
  icon: React.ElementType;
  permissions: { key: keyof Permissions; label: string }[];
};

const modules: ModuleConfig[] = [
  {
    title: 'Financeiro',
    icon: Wallet,
    permissions: [
      { key: 'dashboard', label: 'Painel Geral' },
      { key: 'transactions', label: 'Transações' },
      { key: 'contracts', label: 'Cadastro de Contratos' },
      { key: 'expenses', label: 'Classificação de Despesas' },
      { key: 'budgets', label: 'Orçamentos' },
      { key: 'reports', label: 'Relatórios' },
      { key: 'apiBank', label: 'API BANK (BETA)' },
    ]
  },
  {
    title: 'Recursos Humanos',
    icon: Briefcase,
    permissions: [
      { key: 'timeCard', label: 'Cartão de Ponto' },
      { key: 'timeTracking', label: 'Controle de Ponto (Beta)' },
      { key: 'employees', label: 'Cadastro de Funcionários' },
      { key: 'hrTimesheet', label: 'Gestão de Horários' },
    ]
  },
  {
    title: 'Suprimentos',
    icon: Package,
    permissions: [
      { key: 'suppliesStock', label: 'Controle de Estoque' },
      { key: 'addresses', label: 'Locais de Armazenamento' },
    ]
  },
  {
    title: 'Administração',
    icon: ShieldAlert,
    permissions: [
      { key: 'upload', label: 'Upload de Arquivos' },
      { key: 'userManagement', label: 'Gerenciar Usuários' },
    ]
  },
  {
    title: 'Geral & Configurações',
    icon: Settings,
    permissions: [
      { key: 'home', label: 'Página Inicial' },
      { key: 'profile', label: 'Perfil do Usuário' },
      { key: 'settings', label: 'Configurações do Sistema' },
    ]
  }
];

const actionLabels: Record<keyof CrudActions, string> = {
    view: 'Visualizar',
    create: 'Criar',
    edit: 'Editar',
    delete: 'Excluir'
};

function UserAccessControlContent() {
  const params = useParams();
  const userId = params?.userId as string;
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isSaving, setIsSaving] = useState(false);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({
    'Financeiro': true,
    'Recursos Humanos': false,
    'Suprimentos': false,
    'Administração': false,
    'Geral & Configurações': false,
  });

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
    moduleKey: keyof Permissions,
    action: keyof CrudActions,
    checked: boolean
  ) => {
    setPermissions(prev => {
        if (!prev) return null;
        return {
            ...prev,
            [moduleKey]: {
                ...prev[moduleKey],
                [action]: checked,
            },
        };
    });
  };

  const handleToggleModule = (moduleKey: keyof Permissions, checked: boolean) => {
    setPermissions(prev => {
        if (!prev) return null;
        return {
            ...prev,
            [moduleKey]: {
                view: checked,
                create: checked,
                edit: checked,
                delete: checked,
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

  const toggleAccordion = (title: string) => {
    setOpenModules(prev => ({ ...prev, [title]: !prev[title] }));
  };

  if (isTargetUserLoading) {
    return (
        <div className="space-y-8">
            <header><Skeleton className="h-9 w-80" /><Skeleton className="h-5 w-96 mt-2" /></header>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-64 w-full" />))}
            </div>
        </div>
    );
  }

  if (!targetUser && !isTargetUserLoading && userId) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-center">
              <h2 className="text-xl font-bold">Usuário não encontrado</h2>
              <p className="text-muted-foreground">O ID do usuário é inválido ou o documento foi removido.</p>
          </div>
      )
  }

  return (
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Controle de Acesso</h1>
            <p className="text-muted-foreground">
              Configurando permissões para <span className="font-semibold text-foreground">{targetUser?.displayName || 'Usuário'}</span>.
            </p>
          </div>
          <Button onClick={handleSaveChanges} disabled={isSaving || !targetUser} className="shadow-lg">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Configurações
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-6">
          {modules.map((module) => (
            <Collapsible
              key={module.title}
              open={openModules[module.title]}
              onOpenChange={() => toggleAccordion(module.title)}
              className="w-full"
            >
              <Card className="border-primary/10 overflow-hidden shadow-sm">
                <CollapsibleTrigger asChild>
                  <CardHeader className="bg-primary/5 border-b border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-md">
                          <module.icon className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg text-primary font-headline">
                          {module.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {openModules[module.title] ? 'Clique para recolher' : 'Clique para expandir'}
                        </span>
                        {openModules[module.title] ? (
                          <ChevronUp className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="p-0 animate-in fade-in-0 slide-in-from-top-2 duration-300">
                    <div className="divide-y divide-border">
                      {module.permissions.map((perm) => {
                        const currentPerms = permissions?.[perm.key] || { view: false, create: false, edit: false, delete: false };
                        const isAllChecked = Object.values(currentPerms).every(v => v === true);

                        return (
                          <div key={perm.key} className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-foreground/80 uppercase tracking-wider">{perm.label}</h4>
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`all-${perm.key}`} className="text-[10px] text-muted-foreground uppercase">Marcar Tudo</Label>
                                <Checkbox 
                                  id={`all-${perm.key}`}
                                  checked={isAllChecked}
                                  onCheckedChange={(checked) => handleToggleModule(perm.key, !!checked)}
                                  disabled={targetUser?.role === 'admin' && (perm.key === 'userManagement')}
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pl-4 border-l-2 border-primary/20">
                              {(Object.keys(actionLabels) as (keyof CrudActions)[]).map((action) => (
                                <div key={action} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`${perm.key}-${action}`}
                                    checked={permissions?.[perm.key]?.[action] ?? false}
                                    onCheckedChange={(checked) => handlePermissionChange(perm.key, action, !!checked)}
                                    disabled={targetUser?.role === 'admin' && (perm.key === 'userManagement')}
                                  />
                                  <Label htmlFor={`${perm.key}-${action}`} className="text-xs cursor-pointer">
                                    {actionLabels[action]}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      </div>
  );
}

export default function UserAccessControlPage() {
    return (
        <AppLayout>
            <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
                <UserAccessControlContent />
            </Suspense>
        </AppLayout>
    )
}
