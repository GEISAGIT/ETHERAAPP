'use client';
import type { Transaction, UserProfile, ExpenseTransaction, Contract } from '@/lib/types';
import { columns } from '@/app/transactions/columns';
import { DataTable } from '../data-table/data-table';
import { AddTransactionDialog } from './add-transaction-dialog';
import { Skeleton } from '../ui/skeleton';
import { ImportTransactionsDialog } from './import-transactions-dialog';
import { useState, useMemo } from 'react';
import { EditTransactionDialog } from './edit-transaction-dialog';
import { DeleteTransactionAlert } from './delete-transaction-alert';
import { useFirestore, useUser, deleteDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { DataTableToolbar } from '../data-table/data-table-toolbar';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { TooltipProvider } from '../ui/tooltip';
import { TransactionsSummary } from './transactions-summary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RecurringTransactions } from './recurring-transactions';

export function TransactionsClient({ data, contracts, isLoading }: { data: Transaction[], contracts: Contract[], isLoading: boolean }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCostType, setFilterCostType] = useState<'all' | 'fixed' | 'variable'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<DateRange | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userDocRef);

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
    
    if (filterCostType !== 'all') {
        filtered = filtered.filter(item => {
            // This filter only applies to expenses.
            if (item.type !== 'expense') return false; 
            return (item as ExpenseTransaction).costType === filterCostType;
        });
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
  }, [data, searchTerm, filterType, filterCostType, filterCategory, filterDate, sortOrder]);


  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsEditOpen(true);
  };
  
  const handleDelete = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!firestore || !user || !selectedTransaction) {
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'Não foi possível excluir a transação. Tente novamente.',
        });
        return;
    }

    const { type, id } = selectedTransaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';

    const docRef = doc(firestore, collectionName, id);
    
    deleteDocumentNonBlocking(docRef);

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
      'Tipo de Custo': t.type === 'expense' ? (t as ExpenseTransaction).costType === 'fixed' ? 'Fixo' : 'Variável' : 'N/A',
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

  const dynamicColumns = columns({ 
    onEdit: handleEdit, 
    onDelete: handleDelete, 
    userRole: userProfile?.role 
  });

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
            <Skeleton className="h-10 w-full" />
            <div className="space-y-4">
                <Skeleton className="h-[400px] w-full" />
            </div>
        </div>
    )
  }
  
  return (
    <TooltipProvider>
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

        <Tabs defaultValue="recurring" className="space-y-4">
          <TabsList>
            <TabsTrigger value="recurring">Transações Recorrentes</TabsTrigger>
            <TabsTrigger value="manual">Lançamentos Manuais</TabsTrigger>
          </TabsList>
          <TabsContent value="recurring" className="space-y-4">
            <RecurringTransactions contracts={contracts.filter(c => c.status === 'active')} />
          </TabsContent>
          <TabsContent value="manual" className="space-y-4">
            <TransactionsSummary transactions={filteredData} />
            <DataTableToolbar
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                filterType={filterType}
                onFilterTypeChange={setFilterType}
                filterCostType={filterCostType}
                onFilterCostTypeChange={setFilterCostType}
                filterCategory={filterCategory}
                onFilterCategoryChange={setFilterCategory}
                allCategories={allCategories}
                filterDate={filterDate}
                onFilterDateChange={setFilterDate}
                sortOrder={sortOrder}
                onSortOrderChange={setSortOrder}
            />
            <DataTable columns={dynamicColumns} data={filteredData} />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
