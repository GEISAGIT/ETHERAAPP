'use client';

import type { Transaction } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

// This is a simplified column definition without sorting/filtering actions
// to avoid adding @tanstack/react-table.
// A real implementation would use `import type { ColumnDef } from '@tanstack/react-table'`

export const columns = [
  {
    accessorKey: 'date',
    header: 'Date',
    cell: ({ row }: { row: { original: Transaction } }) => (
      <span>{row.original.date.toLocaleDateString()}</span>
    ),
  },
  {
    accessorKey: 'description',
    header: 'Description',
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({ row }: { row: { original: Transaction } }) => (
        <Badge variant="outline">{row.original.category}</Badge>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ row }: { row: { original: Transaction } }) => {
      const isIncome = row.original.type === 'income';
      return (
        <Badge variant={isIncome ? 'default' : 'secondary'} className={isIncome ? 'bg-emerald-500/20 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : ''}>
          {row.original.type}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'amount',
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }: { row: { original: Transaction } }) => {
      const amount = parseFloat(row.original.amount.toString());
      const isIncome = row.original.type === 'income';
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);

      return <div className={`text-right font-medium ${isIncome ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{formatted}</div>;
    },
  },
];
