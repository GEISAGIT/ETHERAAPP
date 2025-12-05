'use client';
import type { UserManagement } from '@/lib/types';
import { columns } from './columns';
import { DataTable } from '../data-table/data-table';
import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';


export function UserManagementClient({ data }: { data: UserManagement[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterRole !== 'all') {
      filtered = filtered.filter(item => item.role === filterRole);
    }

    return filtered;
  }, [data, searchTerm, filterRole]);
  
  const handleRoleChange = (uid: string, role: 'admin' | 'user') => {
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Erro de autenticação',
        });
        return;
    }

    if (user.uid === uid) {
        toast({
            variant: 'destructive',
            title: 'Ação não permitida',
            description: 'Você não pode alterar seu próprio perfil.',
        });
        return;
    }

    const userDocRef = doc(firestore, 'users', uid);
    updateDocumentNonBlocking(userDocRef, { role });

    toast({
        title: 'Perfil de usuário atualizado',
        description: `O usuário foi definido como ${role}.`,
    });
  }

  const dynamicColumns = columns({ onRoleChange: handleRoleChange });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Gerenciamento de Usuários
        </h1>
        <p className="text-muted-foreground">
          Visualize e gerencie os usuários do sistema.
        </p>
      </header>
      <div className="flex items-center gap-4">
        <Input
            placeholder="Filtrar por nome ou email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="max-w-sm"
        />
        <Select value={filterRole} onValueChange={(value: 'all' | 'admin' | 'user') => setFilterRole(value)}>
            <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por perfil" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos os Perfis</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="user">Usuários</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <DataTable columns={dynamicColumns} data={filteredData} />
    </div>
  );
}

    