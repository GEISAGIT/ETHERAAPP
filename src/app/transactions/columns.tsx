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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"


const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
}

const DescriptionCell = ({ transaction }: { transaction: Transaction }) => {
    return (
        <div className="flex items-center gap-2">
            <span className="max-w-[200px] truncate" title={transaction.description}>
                {transaction.description}
            </span>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-60">
                    <div className="space-y-2 text-sm">
                        <h4 className="font-semibold">Log de Auditoria</h4>
                        <p>
                            <span className="font-semibold text-muted-foreground">Criado por:</span> {transaction.createdByName || 'N/A'}
                        </p>
                        <p>
                            <span className="font-semibold text-muted-foreground">Última edição:</span> {formatDate(transaction.updatedAt)}
                        </p>
                    </div>
                </PopoverContent>
            </Popover>
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
        return <DescriptionCell transaction={row.original} />;
    },
  },
  {
    accessorKey: 'group',
    header: 'Grupo',
    cell: ({ row }: { row: { original: Transaction } }) => {
        const expense = row.original as ExpenseTransaction;
        if (expense.type === 'expense' && expense.fullCategoryPath?.group) {
            return <Badge variant="outline">{expense.fullCategoryPath.group}</Badge>;
        }
        return null;
    },
  },
  {
    accessorKey: 'category',
    header: 'Categoria',
    cell: ({ row }: { row: { original: Transaction } }) => {
        const expense = row.original as ExpenseTransaction;
        if (expense.type === 'expense' && expense.fullCategoryPath?.category) {
             return <Badge variant="secondary">{expense.fullCategoryPath.category}</Badge>;
        }
        // For income, just show the regular category
        if(row.original.type === 'income') {
            return <Badge variant="outline">{row.original.category}</Badge>
        }
        return null;
    },
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
