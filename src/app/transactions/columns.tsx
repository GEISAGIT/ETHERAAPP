'use client';

import type { Transaction, ExpenseTransaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Timestamp } from 'firebase/firestore';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { FileText } from 'lucide-react';


const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString('pt-BR');
}

export const columns = [
  {
    accessorKey: 'date',
    header: 'Data',
    cell: ({ row }: { row: { original: Transaction } }) => (
      <span>{formatDate(row.original.date)}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Descrição',
    cell: ({ row }: { row: { original: Transaction } }) => (
      <div className="flex items-center gap-2">
         {row.original.notes && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">{row.original.notes}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <span>{row.original.description}</span>
      </div>
    ),
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
];
