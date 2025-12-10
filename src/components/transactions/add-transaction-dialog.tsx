'use client';

import { useState, useMemo } from 'react';
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
import { PlusCircle, Loader2 } from 'lucide-react';
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
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { addDocumentNonBlocking, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, query } from 'firebase/firestore';
import type { IncomeCategory, ExpenseCategory } from '@/lib/types';


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

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      description: '',
      amount: 0,
      type: 'expense',
      category: '',
      notes: '',
    },
  });
  
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
    if (!user?.uid) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado. Por favor, faça login novamente.',
      });
      return;
    }
    
    const collectionName = values.type === 'income' ? 'incomes' : 'expenses';
    const transactionsCollection = collection(firestore, 'users', user.uid, collectionName);

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

    addDocumentNonBlocking(transactionsCollection, transactionData);
    
    toast({
      title: 'Transação Adicionada',
      description: 'Sua transação foi registrada com sucesso.',
    });
    form.reset();
    setOpen(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Transação
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Nova Transação</DialogTitle>
            <DialogDescription>
              Adicione uma nova receita ou despesa aos seus registros.
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
                    }} defaultValue={field.value}>
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
                      <div className="relative">
                        <Input placeholder="ex: Material de escritório" {...field} />
                      </div>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  Salvar Transação
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
