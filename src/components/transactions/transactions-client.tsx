'use client';
import type { Transaction } from '@/lib/types';
import { columns } from '@/app/transactions/columns';
import { DataTable } from '../data-table/data-table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { Skeleton } from '../ui/skeleton';
import { ImportTransactionsDialog } from './import-transactions-dialog';

export function TransactionsClient({ data, isLoading }: { data: Transaction[], isLoading: boolean }) {
  if (isLoading) {
    return (
        <div className="space-y-8">
            <header className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-80 mt-2" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-28" />
                    <Skeleton className="h-10 w-44" />
                </div>
            </header>
            <div className="space-y-4">
                <div className="rounded-md border">
                    <div className="w-full">
                        <div className="border-b">
                            <div className="flex h-12 items-center px-4">
                                <Skeleton className="h-5 w-1/5" />
                                <Skeleton className="h-5 w-1/5 ml-4" />
                                <Skeleton className="h-5 w-1/5 ml-4" />
                                <Skeleton className="h-5 w-1/5 ml-4" />
                                <Skeleton className="h-5 w-1/5 ml-4" />
                            </div>
                        </div>
                        <div>
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="flex h-14 items-center px-4 border-b">
                                    <Skeleton className="h-5 w-1/5" />
                                    <Skeleton className="h-5 w-2/5 ml-4" />
                                    <Skeleton className="h-5 w-1/5 ml-4" />
                                    <Skeleton className="h-5 w-1/5 ml-4" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex items-center justify-between px-2">
                    <Skeleton className="h-8 w-24" />
                    <div className="flex items-center space-x-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                    </div>
                </div>
            </div>
        </div>
    )
  }
  
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
          <div className="flex items-center gap-2">
            <ImportTransactionsDialog />
            <AddTransactionDialog />
          </div>
      </header>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
