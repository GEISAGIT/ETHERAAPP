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
import { useFirestore, useUser, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DataTableToolbar } from '../data-table/data-table-toolbar';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { isSameDay, format } from 'date-fns';

export function TransactionsClient({ data, isLoading }: { data: Transaction[], isLoading: boolean }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  // State for filters moved from DataTable to here
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

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

    if (filterDate) {
      filtered = filtered.filter(item => isSameDay(item.date.toDate(), filterDate));
    }

    return filtered;
  }, [data, searchTerm, filterType, filterCategory, filterDate]);


  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditOpen(true);
  };
  
  const handleDelete = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!user || !selectedTransaction) {
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Não foi possível excluir a transação. Tente novamente.',
        });
        return;
    }

    const collectionName = selectedTransaction.type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, 'users', user.uid, collectionName, selectedTransaction.id);
    
    deleteDocumentNonBlocking(docRef);

    toast({
        title: 'Transação Excluída',
        description: 'A transação foi excluída com sucesso.',
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

    const csv = Papa.unparse(dataToExport);
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
        />
        <DataTable columns={dynamicColumns} data={filteredData} />
      </div>
    </>
  );
}
