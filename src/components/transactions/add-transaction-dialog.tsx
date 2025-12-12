'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { collection, Timestamp, query, serverTimestamp } from 'firebase/firestore';
import type { IncomeCategory, ExpenseCategoryGroup } from '@/lib/types';


const formSchema = z.object({
  date: z.date({ required_error: 'A data é obrigatória.'}),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'A descrição/classificação é obrigatória.'),
  category: z.string().optional(),
  group: z.string().optional(),
  costType: z.enum(['fixed', 'variable']).optional(),
  notes: z.string().optional(),
});


type FormValues = z.infer<typeof formSchema>;

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [descriptionSearch, setDescriptionSearch] = useState('');
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
      group: '',
      notes: '',
    },
  });
  
  const transactionType = useWatch({ control: form.control, name: 'type' });
  const selectedGroup = useWatch({ control: form.control, name: 'group' });
  const selectedCategory = useWatch({ control: form.control, name: 'category' });
  
  useEffect(() => {
    if (!open) {
        form.reset({
          date: new Date(),
          description: '',
          amount: 0,
          type: 'expense',
          category: '',
          group: '',
          notes: '',
        });
        setDescriptionSearch('');
    }
  }, [open, form]);

  // --- Data Fetching ---
  const incomeCategoriesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'incomeCategories'));
  }, [firestore, user]);

  const expenseCategoryGroupsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenseCategoryGroups'));
  }, [firestore, user]);

  const { data: incomeCategories } = useCollection<IncomeCategory>(incomeCategoriesQuery);
  const { data: expenseCategoryGroups } = useCollection<ExpenseCategoryGroup>(expenseCategoryGroupsQuery);


  // --- Memoized Select Options ---
  const incomeCategoryOptions = useMemo(() => {
    return incomeCategories?.map(c => c.name).sort() ?? [];
  }, [incomeCategories]);

  const groupOptions = useMemo(() => {
    return expenseCategoryGroups?.map(g => g.name).sort() ?? [];
  }, [expenseCategoryGroups]);

  const categoryOptions = useMemo(() => {
    if (!selectedGroup) return [];
    return expenseCategoryGroups
      ?.find(g => g.name === selectedGroup)
      ?.categories.map(c => c.name).sort() ?? [];
  }, [expenseCategoryGroups, selectedGroup]);

  const descriptionOptions = useMemo(() => {
    if (!selectedGroup || !selectedCategory) return [];
    const descriptions = expenseCategoryGroups
      ?.find(g => g.name === selectedGroup)
      ?.categories.find(c => c.name === selectedCategory)
      ?.subCategories.map(sc => sc.name).sort() ?? [];
    
    if (descriptionSearch) {
      return descriptions.filter(d => d.toLowerCase().includes(descriptionSearch.toLowerCase()));
    }
    return descriptions;
  }, [expenseCategoryGroups, selectedGroup, selectedCategory, descriptionSearch]);

  const handleGroupChange = (value: string) => {
    form.setValue('group', value);
    form.resetField('category');
    form.resetField('description');
  }

  const handleCategoryChange = (value: string) => {
    form.setValue('category', value);
    form.resetField('description');
  }

  
  const onSubmit = (values: FormValues) => {
    if (!user || !firestore) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado. Por favor, faça login novamente.',
      });
      return;
    }
    
    const isExpense = values.type === 'expense';
    const collectionName = isExpense ? 'expenses' : 'incomes';
    const transactionsCollection = collection(firestore, collectionName);

    const transactionData: Record<string, any> = {
      date: Timestamp.fromDate(values.date),
      description: values.description,
      amount: values.amount,
      notes: values.notes,
      userId: user.uid,
      createdByName: user.displayName || 'Usuário Desconhecido',
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    if (isExpense) {
      if (!values.group || !values.category || !values.description) {
        toast({
          variant: 'destructive',
          title: 'Classificação Incompleta',
          description: 'Por favor, selecione Grupo, Categoria e Descrição para a despesa.',
        });
        return;
      }
      transactionData.costType = values.costType;
      transactionData.category = values.category;
      transactionData.fullCategoryPath = {
        group: values.group,
        category: values.category,
        description: values.description,
      };
    } else {
      if (!values.category) {
         toast({
          variant: 'destructive',
          title: 'Categoria de Receita',
          description: 'Por favor, selecione uma categoria para a receita.',
        });
        return;
      }
      transactionData.category = values.category;
    }

    addDocumentNonBlocking(transactionsCollection, transactionData);
    
    toast({
      title: 'Transação Adicionada',
      description: 'Sua transação foi registrada com sucesso.',
    });
    setOpen(false);
  };

  const handleTypeChange = (value: string) => {
    form.setValue('type', value as 'income' | 'expense');
    form.resetField('description');
    form.resetField('category');
    form.resetField('group');
  }


  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Transação
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
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
                    <Select onValueChange={handleTypeChange} defaultValue={field.value}>
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
                      <Popover open={isDatePickerOpen} onOpenChange={setDatePickerOpen}>
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
                            onSelect={(date) => {
                              if (date) field.onChange(date);
                              setDatePickerOpen(false);
                            }}
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
              
              {transactionType === 'income' ? (
                 <>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input placeholder="ex: Consulta Dr. João" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            {incomeCategoryOptions.map((cat) => (
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
                </>
              ) : (
                <div className="space-y-4 rounded-md border p-4">
                  <h4 className="font-medium text-sm">Classificação da Despesa</h4>
                  <FormField
                    control={form.control}
                    name="group"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grupo</FormLabel>
                        <Select onValueChange={handleGroupChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o Grupo" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {groupOptions.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select onValueChange={handleCategoryChange} value={field.value} disabled={!selectedGroup}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione a Categoria" /></SelectTrigger></FormControl>
                          <SelectContent>
                             {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <div className="space-y-2">
                        <Label>Pesquisar Descrição</Label>
                        <Input 
                            placeholder="Filtre pela descrição..."
                            onChange={(e) => setDescriptionSearch(e.target.value)}
                            disabled={!selectedCategory}
                        />
                    </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione a Descrição" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {descriptionOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}


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
