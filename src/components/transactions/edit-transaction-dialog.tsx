'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Loader2, CalendarIcon } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query, doc } from 'firebase/firestore';
import type { IncomeCategory, ExpenseCategory, Transaction } from '@/lib/types';


const formSchema = z.object({
  date: z.date(),
  description: z.string().min(3, 'A descrição é muito curta'),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Por favor, selecione uma categoria'),
  costType: z.enum(['fixed', 'variable']).optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction | null;
}

export function EditTransactionDialog({ open, onOpenChange, transaction }: EditTransactionDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  useEffect(() => {
    if (transaction) {
      form.reset({
        date: transaction.date.toDate(),
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        notes: transaction.notes || '',
        costType: transaction.type === 'expense' ? transaction.costType : undefined,
      });
    }
  }, [transaction, form]);


  const transactionType = useWatch({
    control: form.control,
    name: 'type',
  });

  const incomeCategoriesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'incomeCategories'));
  }, [firestore, user?.uid]);

  const expenseCategoriesQuery = useMemoFirebase(() => {
    if (!user?.uid) return null;
    return query(collection(firestore, 'users', user.uid, 'expenseCategories'));
  }, [firestore, user?.uid]);

  const { data: incomeCategories } = useCollection<IncomeCategory>(incomeCategoriesQuery);
  const { data: expenseCategories } = useCollection<ExpenseCategory>(expenseCategoriesQuery);
  
  const categories = useMemo(() => {
    let categoryNames: string[];
    if (transactionType === 'income') {
      categoryNames = incomeCategories?.map(c => c.name) ?? [];
    } else {
      categoryNames = expenseCategories?.map(c => c.name) ?? [];
    }
    return [...new Set(categoryNames)].sort();
  }, [transactionType, incomeCategories, expenseCategories]);


  const onSubmit = (values: FormValues) => {
    if (!user?.uid || !transaction) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a transação. Tente novamente.',
      });
      return;
    }
    
    const collectionName = values.type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, 'users', user.uid, collectionName, transaction.id);

    const transactionData: Record<string, any> = {
      date: Timestamp.fromDate(values.date),
      description: values.description,
      amount: values.amount,
      category: values.category,
      notes: values.notes,
    };

    if (values.type === 'expense' && values.costType) {
      transactionData.costType = values.costType;
    }

    // Since we don't know if the type changed, we can't easily update. 
    // For now, we assume the type doesn't change. A more robust solution would handle moving the document.
    if (values.type !== transaction.type) {
        toast({
            variant: 'destructive',
            title: 'Erro',
            description: 'A alteração do tipo de transação (receita/despesa) não é suportada na edição.',
        });
        return;
    }

    updateDocumentNonBlocking(docRef, transactionData);
    
    toast({
      title: 'Transação Atualizada',
      description: 'Sua transação foi atualizada com sucesso.',
    });
    onOpenChange(false);
  };

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Editar Transação</DialogTitle>
            <DialogDescription>
              Atualize os detalhes da sua transação.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(value);
                        form.setValue('category', '');
                    }} defaultValue={field.value} disabled>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo de transação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="expense">Despesa</SelectItem>
                        <SelectItem value="income">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                        <Input placeholder="ex: Material de escritório" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="0,00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col pt-2">
                      <FormLabel>Data da Transação</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP", { locale: ptBR })
                              ) : (
                                <span>Escolha uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                       <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {transactionType === 'expense' && (
                      <FormField
                      control={form.control}
                      name="costType"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Tipo de Custo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Fixo ou Variável" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="fixed">Custo Fixo</SelectItem>
                              <SelectItem value="variable">Custo Variável</SelectItem>
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                  )}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Adicione uma nota ou detalhe extra sobre a transação..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  );
}
