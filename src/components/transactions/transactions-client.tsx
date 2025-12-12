'use client';
import type { Transaction } from '@/lib/types';
import { columns } from '@/app/transactions/columns';
import { DataTable } from '../data-table/data-table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { Skeleton } from '../ui/skeleton';
import { ImportTransactionsDialog } from './import-transactions-dialog';
import { useState, useMemo } from 'react';
import { EditTransactionDialog } from './edit-transaction-dialog';
import { DeleteTransactionAlert } from './delete-transaction-alert';
import { useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DataTableToolbar } from '../data-table/data-table-toolbar';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { deleteDocumentNonBlocking } from '@/firebase';

export function TransactionsClient({ data, isLoading }: { data: Transaction[], isLoading: boolean }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const allCategories = useMemo(() => {
    const categories = data.map(item => item.category);
    return ['all', ...Array.from(new Set(categories))];
  }, [data]);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(item => item.type === filterType);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    if (filterDate?.from && filterDate?.to) {
        filtered = filtered.filter(item => {
            const itemDate = item.date.toDate();
            return itemDate >= filterDate.from! && itemDate <= filterDate.to!;
        });
    } else if (filterDate?.from) {
        filtered = filtered.filter(item => {
            const itemDate = item.date.toDate();
            // Compare dates only, ignoring time
            const fromDate = filterDate.from!;
            return itemDate.getFullYear() === fromDate.getFullYear() &&
                   itemDate.getMonth() === fromDate.getMonth() &&
                   itemDate.getDate() === fromDate.getDate();
        });
    }
    
    // Apply sorting
    filtered = filtered.sort((a, b) => {
        const dateA = a.date?.toMillis() ?? 0;
        const dateB = b.date?.toMillis() ?? 0;
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [data, searchTerm, filterType, filterCategory, filterDate, sortOrder]);


  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditOpen(true);
  };
  
  const handleDelete = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!firestore || !selectedTransaction) {
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Não foi possível excluir a transação. Tente novamente.',
        });
        return;
    }

    const { type, id, userId } = selectedTransaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';

    // This is the correct, robust way to delete.
    // It attempts to delete from both the new global collection and the old nested collection.
    // Since delete operations don't throw an error if the doc doesn't exist,
    // this is an idempotent way to ensure the data is removed, wherever it might be.

    // 1. Define the path for the new, global collection structure.
    const globalDocRef = doc(firestore, collectionName, id);
    deleteDocumentNonBlocking(globalDocRef);

    // 2. If a userId exists on the transaction, it *might* be from the old nested structure.
    //    Define that path and attempt to delete from there as well.
    if (userId) {
        const nestedDocRef = doc(firestore, 'users', userId, collectionName, id);
        deleteDocumentNonBlocking(nestedDocRef);
    }

    toast({
        title: 'Transação Excluída',
        description: 'A transação foi removida com sucesso.',
    });
    
    setIsDeleteAlertOpen(false);
    setSelectedTransaction(null);
  }
  
  const handleExport = () => {
    if (filteredData.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Não há transações (filtradas) para exportar.',
      });
      return;
    }

    const dataToExport = filteredData.map(t => ({
      Data: format(t.date.toDate(), 'yyyy-MM-dd'),
      Descrição: t.description,
      Valor: t.amount,
      Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
      Categoria: t.category,
      'Tipo de Custo': t.type === 'expense' ? (t.costType === 'fixed' ? 'Fixo' : 'Variável') : 'N/A',
      Observação: t.notes || '',
    }));

    const csv = Papa.unparse(dataToExport, { delimiter: ';' });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const dynamicColumns = columns({ onEdit: handleEdit, onDelete: handleDelete });

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
                                    <Skeleton className="h-5 w-1/fiv" />
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
    <>
      <EditTransactionDialog 
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        transaction={selectedTransaction}
      />
      <DeleteTransactionAlert
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
        onConfirm={handleConfirmDelete}
      />
      <div className="space-y-8">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight">
                Transações
              </h1>
              <p className="text-muted-foreground">
                Acompanhe todas as suas receitas e despesas.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <ImportTransactionsDialog />
              <AddTransactionDialog />
            </div>
        </header>
         <DataTableToolbar
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            filterCategory={filterCategory}
            onFilterCategoryChange={setFilterCategory}
            allCategories={allCategories}
            filterDate={filterDate}
            onFilterDateChange={setFilterDate}
            sortOrder={sortOrder}
            onSortOrderChange={setSortOrder}
        />
        <DataTable columns={dynamicColumns} data={filteredData} />
      </div>
    </>
  );
}
