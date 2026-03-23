
'use client';
import type { Role, Permissions, MenuItemKey } from '@/lib/types';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const allPermissions: { key: MenuItemKey; label: string }[] = [
  { key: 'dashboard', label: 'Painel' },
  { key: 'transactions', label: 'Transações' },
  { key: 'budgets', label: 'Orçamentos' },
  { key: 'reports', label: 'Relatórios' },
  { key: 'upload', label: 'Upload' },
  { key: 'profile', label: 'Perfil' },
  { key: 'settings', label: 'Configurações' },
  { key: 'userManagement', label: 'Gerenciar Usuários' },
  { key: 'accessControl', label: 'Controle de Acesso' },
];

const defaultAdminPermissions: Permissions = {
  dashboard: true,
  transactions: true,
  budgets: true,
  reports: true,
  upload: true,
  profile: true,
  settings: true,
  userManagement: true,
  accessControl: true,
};

const defaultUserPermissions: Permissions = {
  dashboard: true,
  transactions: true,
  budgets: true,
  reports: true,
  upload: true,
  profile: true,
  settings: true,
  userManagement: false,
  accessControl: false,
};

export function AccessControlClient({ roles: initialRoles }: { roles: Role[] }) {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [isLoading, setIsLoading] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    // Seed default roles if they don't exist
    if (firestore) {
      if (!initialRoles.some(r => r.id === 'admin')) {
        const adminRoleRef = doc(firestore, 'roles', 'admin');
        setDocumentNonBlocking(adminRoleRef, { permissions: defaultAdminPermissions }, { merge: true });
      }
      if (!initialRoles.some(r => r.id === 'user')) {
        const userRoleRef = doc(firestore, 'roles', 'user');
        setDocumentNonBlocking(userRoleRef, { permissions: defaultUserPermissions }, { merge: true });
      }
    }
  }, [firestore, initialRoles]);

  useEffect(() => {
    // Ensure local state has default roles if they come in late or are seeded.
    const updatedRoles = [...initialRoles];
    if (!updatedRoles.find(r => r.id === 'admin')) {
      updatedRoles.push({ id: 'admin', permissions: defaultAdminPermissions });
    }
    if (!updatedRoles.find(r => r.id === 'user')) {
      updatedRoles.push({ id: 'user', permissions: defaultUserPermissions });
    }
    setRoles(updatedRoles);
  }, [initialRoles]);

  const handlePermissionChange = (roleId: 'admin' | 'user', permissionKey: MenuItemKey, checked: boolean) => {
    setRoles(prevRoles =>
      prevRoles.map(role =>
        role.id === roleId
          ? { ...role, permissions: { ...role.permissions, [permissionKey]: checked } }
          : role
      )
    );
  };

  const handleSaveChanges = (roleId: 'admin' | 'user') => {
    if (!firestore) return;
    setIsLoading(true);

    const roleToSave = roles.find(r => r.id === roleId);
    if (!roleToSave) return;

    const roleDocRef = doc(firestore, 'roles', roleId);
    setDocumentNonBlocking(roleDocRef, { permissions: roleToSave.permissions }, { merge: true });

    setTimeout(() => {
      toast({
        title: 'Permissões Salvas!',
        description: `As permissões para o perfil ${roleId === 'admin' ? 'Administrador' : 'Usuário'} foram atualizadas.`,
      });
      setIsLoading(false);
    }, 500); // Simulate network latency
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Controle de Acesso</h1>
        <p className="text-muted-foreground">Defina quais páginas cada perfil de usuário pode acessar.</p>
      </header>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {roles.sort((a,b) => a.id.localeCompare(b.id)).map(role => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="font-headline capitalize">{role.id === 'admin' ? 'Administrador' : 'Usuário'}</CardTitle>
              <CardDescription>
                Selecione as páginas que este perfil pode visualizar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {allPermissions.map(permission => (
                <div key={permission.key} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${role.id}-${permission.key}`}
                    checked={role.permissions[permission.key] ?? false}
                    onCheckedChange={(checked) =>
                      handlePermissionChange(role.id, permission.key, !!checked)
                    }
                    disabled={role.id === 'admin' && (permission.key === 'userManagement' || permission.key === 'accessControl')}
                  />
                  <Label htmlFor={`${role.id}-${permission.key}`} className="font-normal">
                    {permission.label}
                  </Label>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button onClick={() => handleSaveChanges(role.id)} disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

    