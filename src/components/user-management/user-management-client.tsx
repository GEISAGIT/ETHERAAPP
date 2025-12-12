
'use client';
import type { UserManagement, UserStatus } from '@/lib/types';
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
  const [filterStatus, setFilterStatus] = useState<'all' | UserStatus>('all');
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

    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    return filtered;
  }, [data, searchTerm, filterRole, filterStatus]);

  const handleUpdate = (uid: string, data: Partial<UserManagement>) => {
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
            description: 'Você não pode alterar seu próprio perfil ou status aqui.',
        });
        return;
    }

    const userDocRef = doc(firestore, 'users', uid);
    updateDocumentNonBlocking(userDocRef, data);
  }
  
  const handleRoleChange = (uid: string, role: 'admin' | 'user') => {
    handleUpdate(uid, { role });
    toast({
        title: 'Perfil de usuário atualizado',
        description: `O usuário foi definido como ${role}.`,
    });
  }

  const handleStatusChange = (uid: string, status: UserStatus) => {
    handleUpdate(uid, { status });
    toast({
        title: 'Status do usuário atualizado',
        description: `O usuário foi marcado como ${status}.`,
    });
  }

  const dynamicColumns = columns({ 
    onRoleChange: handleRoleChange, 
    onStatusChange: handleStatusChange,
    currentUserId: user?.uid 
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Gerenciamento de Usuários
        </h1>
        <p className="text-muted-foreground">
          Aprove, rejeite e gerencie os usuários e perfis do sistema.
        </p>
      </header>
      <div className="flex flex-wrap items-center gap-4">
        <Input
            placeholder="Filtrar por nome ou email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="max-w-sm"
        />
        <Select value={filterRole} onValueChange={(value: 'all' | 'admin' | 'user') => setFilterRole(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por perfil" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos os Perfis</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
                <SelectItem value="user">Usuários</SelectItem>
            </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(value: 'all' | UserStatus) => setFilterStatus(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="rejected">Rejeitados</SelectItem>
            </SelectContent>
        </Select>
      </div>
      <DataTable columns={dynamicColumns} data={filteredData} />
    </div>
  );
}

    
