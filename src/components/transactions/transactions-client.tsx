'use client';
import type { Transaction } from '@/lib/types';
import { columns } from '@/app/transactions/columns';
import { DataTable } from '../data-table/data-table';
import { AddTransactionDialog } from './add-transaction-dialog';

export function TransactionsClient({ data }: { data: Transaction[] }) {
  return (
    <div className="space-y-8">
       <header className="flex items-center justify-between">
          <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
              Transações
            </h1>
            <p className="text-muted-foreground">
              Acompanhe todas as suas receitas e despesas.
            </p>
          </div>
          <AddTransactionDialog />
      </header>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
