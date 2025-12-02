'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { addDocumentNonBlocking, useFirestore, useUser } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import type { Transaction, Category } from '@/lib/types';
import { categories } from '@/lib/data';

const requiredHeaders = ['date', 'description', 'amount', 'type', 'category'];

export function ImportTransactionsDialog() {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Nenhum arquivo selecionado',
        description: 'Por favor, selecione um arquivo CSV para importar.',
      });
      return;
    }

    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Usuário não autenticado',
        description: 'Você precisa estar logado para importar transações.',
      });
      return;
    }

    setIsLoading(true);

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields;
        if (!headers || !requiredHeaders.every(h => headers.includes(h))) {
          toast({
            variant: 'destructive',
            title: 'Cabeçalhos inválidos',
            description: `O arquivo CSV deve conter os seguintes cabeçalhos: ${requiredHeaders.join(', ')}`,
          });
          setIsLoading(false);
          return;
        }

        const transactionsToAdd = results.data;
        let successfulImports = 0;
        let failedImports = 0;

        transactionsToAdd.forEach((row, index) => {
          try {
            const amount = parseFloat(row.amount);
            if (isNaN(amount) || amount <= 0) {
              throw new Error(`Valor inválido na linha ${index + 2}: ${row.amount}`);
            }

            const type = row.type.toLowerCase();
            if (type !== 'income' && type !== 'expense') {
              throw new Error(`Tipo inválido na linha ${index + 2}: ${row.type}. Use 'income' ou 'expense'.`);
            }
            
            if (!categories.includes(row.category as Category)) {
              throw new Error(`Categoria inválida na linha ${index + 2}: ${row.category}`);
            }

            const transactionData = {
              date: Timestamp.fromDate(new Date(row.date)),
              description: row.description,
              amount: amount,
              category: row.category as Category,
            };

            const collectionName = type === 'income' ? 'incomes' : 'expenses';
            const transactionsCollection = collection(firestore, 'users', user.uid, collectionName);
            addDocumentNonBlocking(transactionsCollection, transactionData);
            successfulImports++;

          } catch (error: any) {
            console.error(`Erro na linha ${index + 2}: `, error);
            failedImports++;
          }
        });

        setIsLoading(false);
        setOpen(false);
        setFile(null);

        if (successfulImports > 0) {
            toast({
              title: 'Importação Concluída',
              description: `${successfulImports} transações foram importadas com sucesso.`,
            });
        }
        if (failedImports > 0) {
             toast({
              variant: 'destructive',
              title: 'Falhas na Importação',
              description: `${failedImports} transações falharam ao importar. Verifique o console para mais detalhes.`,
            });
        }
      },
      error: (error) => {
        toast({
          variant: 'destructive',
          title: 'Erro ao analisar o arquivo',
          description: error.message,
        });
        setIsLoading(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadCloud className="mr-2 h-4 w-4" />
          Importar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Importar Transações</DialogTitle>
          <DialogDescription>
            Envie um arquivo CSV para adicionar múltiplas transações de uma vez.
            O arquivo deve conter as colunas: date, description, amount, type, category.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                 <label htmlFor="file-upload" className="text-sm font-medium">Arquivo CSV</label>
                 <Input id="file-upload" type="file" accept=".csv" onChange={handleFileChange} />
                 <p className="text-xs text-muted-foreground">O tipo da transação deve ser 'income' ou 'expense'.</p>
            </div>
            {file && (
                <p className="text-sm text-muted-foreground">Arquivo selecionado: {file.name}</p>
            )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={isLoading}>Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleImport} disabled={isLoading || !file}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Importar Transações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
