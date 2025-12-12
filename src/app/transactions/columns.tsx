'use client';

import type { Transaction, ExpenseTransaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import { MoreHorizontal, Edit, Trash2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
}

const AuditTooltipContent = ({ transaction }: { transaction: Transaction }) => {
  return (
    <div className="text-xs">
      <p>
        <span className="font-semibold">Criado por:</span> {transaction.createdByName || 'N/A'}
      </p>
      {transaction.updatedAt && (
        <p>
          <span className="font-semibold">Última edição:</span> {formatDate(transaction.updatedAt)}
        </p>
      )}
    </div>
  );
};


interface ColumnsProps {
    onEdit: (transaction: Transaction) => void;
    onDelete: (transaction: Transaction) => void;
    userRole: 'admin' | 'user' | undefined;
}

export const columns = ({ onEdit, onDelete, userRole }: ColumnsProps) => [
  {
    accessorKey: 'date',
    header: 'Data',
    cell: ({ row }: { row: { original: Transaction } }) => (
      <span>{row.original.date.toDate().toLocaleDateString('pt-BR')}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Descrição',
    cell: ({ row }: { row: { original: Transaction } }) => {
        const transaction = row.original;
        return (
            <div className="flex items-center gap-2">
                <span className="max-w-[200px] truncate" title={transaction.description}>{transaction.description}</span>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent>
                        <AuditTooltipContent transaction={transaction} />
                    </TooltipContent>
                </Tooltip>
            </div>
        );
    },
  },
  {
    accessorKey: 'category',
    header: 'Categoria',
    cell: ({ row }: { row: { original: Transaction } }) => (
        <Badge variant="outline">{row.original.category}</Badge>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Tipo',
    cell: ({ row }: { row: { original: Transaction } }) => {
      const isIncome = row.original.type === 'income';
      const typeText = isIncome ? 'Receita' : 'Despesa';
      return (
        <Badge variant={isIncome ? 'default' : 'secondary'} className={isIncome ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}>
          {typeText}
        </Badge>
      );
    },
    filterFn: (row: any, id: any, value: any) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'costType',
    header: 'Tipo de Custo',
    cell: ({ row }: { row: { original: Transaction } }) => {
      if (row.original.type === 'income') return null;

      const costType = (row.original as ExpenseTransaction).costType;
      if (!costType) return <Badge variant="outline">N/A</Badge>;

      const costTypeText = costType === 'fixed' ? 'Fixo' : 'Variável';
      const variant = costType === 'fixed' ? 'destructive' : 'secondary';
      return (
        <Badge variant={variant}>{costTypeText}</Badge>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Valor</div>,
    cell: ({ row }: { row: { original: Transaction } }) => {
      const amount = parseFloat(row.original.amount.toString());
      const isIncome = row.original.type === 'income';
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(amount);

      return <div className={`text-right font-medium ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{formatted}</div>;
    },
  },
  {
    accessorKey: 'notes',
    header: 'Observação',
    cell: ({ row }: { row: { original: Transaction } }) => (
      <span className="max-w-[200px] truncate block" title={row.original.notes}>
        {row.original.notes || '-'}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }: { row: { original: Transaction } }) => {
      if (userRole !== 'admin') {
        return null; // Don't render the actions menu for non-admins
      }
      
      const transaction = row.original;
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
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(transaction)} className="text-red-500 focus:text-red-500">
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
