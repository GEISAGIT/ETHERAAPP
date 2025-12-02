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
import { PlusCircle, Loader2, Check, ChevronsUpDown } from 'lucide-react';
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
import { suggestCategory } from '@/app/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
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
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [comboboxOpen, setComboboxOpen] = useState(false);

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
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'incomeCategories'));
  }, [firestore, user]);

  const expenseCategoriesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(firestore, 'users', user.uid, 'expenseCategories'));
  }, [firestore, user]);

  const { data: incomeCategories } = useCollection<IncomeCategory>(incomeCategoriesQuery);
  const { data: expenseCategories } = useCollection<ExpenseCategory>(expenseCategoriesQuery);
  
  const categories = useMemo(() => {
    let categoryNames: string[];
    if (transactionType === 'income') {
      categoryNames = incomeCategories?.map(c => c.name) ?? [];
    } else {
      categoryNames = expenseCategories?.map(c => c.name) ?? [];
    }
    // Garantir que não há duplicatas que possam causar problemas de chave
    return [...new Set(categoryNames)];
  }, [transactionType, incomeCategories, expenseCategories]);


  const handleDescriptionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('description', e.target.value);
    const description = e.target.value;
    const type = form.getValues('type');
    if (description.length > 5 && categories.length > 0) {
      setIsSuggesting(true);
      try {
        const result = await suggestCategory({
          transactionDescription: description,
          transactionType: type,
        });
        if (result.category && categories.includes(result.category)) {
          form.setValue('category', result.category);
          toast({
            title: 'Categoria Sugerida',
            description: `Sugerimos "${result.category}" com base na descrição.`,
          });
        }
      } catch (error) {
        console.error('Falha na sugestão da IA:', error);
      } finally {
        setIsSuggesting(false);
      }
    }
  };
  
  const onSubmit = (values: FormValues) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Você precisa estar logado para adicionar uma transação.',
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
    <Dialog open={open} onOpenChange={setOpen}>
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
                      <Input placeholder="ex: Material de escritório" {...field} onChange={handleDescriptionChange} />
                      {isSuggesting && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
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
                    <FormItem className="flex flex-col">
                      <FormLabel>Categoria</FormLabel>
                      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={comboboxOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? categories.find(
                                    (cat) => cat === field.value
                                  )
                                : "Selecione uma categoria"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0">
                          <Command>
                            <CommandInput placeholder="Pesquisar categoria..." />
                            <CommandList>
                                <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                                <CommandGroup>
                                {categories.map((cat) => (
                                    <CommandItem
                                      value={cat}
                                      key={cat}
                                      onSelect={() => {
                                        form.setValue("category", cat);
                                        setComboboxOpen(false);
                                      }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        cat === field.value
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                    />
                                    {cat}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
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
  );
}
