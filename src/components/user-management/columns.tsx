'use client';

import type { UserManagement } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { MoreHorizontal, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return 'Data não disponível';
    return timestamp.toDate().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
}

const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
};

interface ColumnsProps {
    onRoleChange: (uid: string, role: 'admin' | 'user') => void;
}

export const columns = ({ onRoleChange }: ColumnsProps) => [
  {
    accessorKey: 'displayName',
    header: 'Nome',
    cell: ({ row }: { row: { original: UserManagement } }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
            {/* Assuming photoURL might exist on the user doc, but it's not in UserManagement type */}
            {/* @ts-ignore */}
            {row.original.photoURL && <AvatarImage src={row.original.photoURL} alt={row.original.displayName} />}
            <AvatarFallback>{getInitials(row.original.displayName)}</AvatarFallback>
        </Avatar>
        <div className='flex flex-col'>
            <span className="font-medium">{row.original.displayName || 'Nome não definido'}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'role',
    header: 'Perfil',
    cell: ({ row }: { row: { original: UserManagement } }) => {
      const role = row.original.role || 'user';
      const variant = role === 'admin' ? 'default' : 'secondary';
      const text = role === 'admin' ? 'Administrador' : 'Usuário';
      return <Badge variant={variant}>{text}</Badge>
    },
    filterFn: (row: any, id: any, value: any) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Data de Cadastro',
    cell: ({ row }: { row: { original: UserManagement } }) => (
      <span>{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }: { row: { original: UserManagement } }) => {
      const user = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Alterar Perfil
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => onRoleChange(user.uid, 'admin')}>
                            <ShieldCheck className="mr-2 h-4 w-4" />
                            Administrador
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onRoleChange(user.uid, 'user')}>
                            <UserCheck className="mr-2 h-4 w-4" />
                            Usuário
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

    