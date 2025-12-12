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
import { Loader2, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking, useFirestore, useUser, useCollection, useMemoFirebase, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, query, doc, serverTimestamp } from 'firebase/firestore';
import type { IncomeCategory, ExpenseCategoryGroup, Transaction, ExpenseTransaction } from '@/lib/types';


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

interface EditTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    transaction: Transaction | null;
}

export function EditTransactionDialog({ open, onOpenChange, transaction }: EditTransactionDialogProps) {
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const transactionType = useWatch({ control: form.control, name: 'type' });


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


  useEffect(() => {
    if (transaction && open) {
      const isExpense = transaction.type === 'expense';
      const expenseTransaction = transaction as ExpenseTransaction;
      
      form.reset({
        date: transaction.date.toDate(),
        description: isExpense ? expenseTransaction.fullCategoryPath?.description : transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: isExpense ? expenseTransaction.fullCategoryPath?.category : transaction.category,
        notes: transaction.notes || '',
        costType: isExpense ? expenseTransaction.costType : undefined,
        group: isExpense ? expenseTransaction.fullCategoryPath?.group : undefined,
      });
    } else if (!open) {
      form.reset();
    }
  }, [transaction, open, form]);


  // --- Memoized Select Options ---
  const incomeCategoryOptions = useMemo(() => {
    return incomeCategories?.map(c => c.name).sort() ?? [];
  }, [incomeCategories]);

  const expenseClassificationOptions = useMemo(() => {
    if (!expenseCategoryGroups) return [];
    return expenseCategoryGroups.flatMap(group =>
      group.categories.flatMap(category =>
        category.subCategories.map(subCategory => ({
          label: `${group.name} > ${category.name} > ${subCategory.name}`,
          value: subCategory.name,
          group: group.name,
          category: category.name
        }))
      )
    );
  }, [expenseCategoryGroups]);

  const handleExpenseSelection = (label: string) => {
    const selected = expenseClassificationOptions.find(opt => opt.label === label);
    if (selected) {
        form.setValue('group', selected.group);
        form.setValue('category', selected.category);
        form.setValue('description', selected.value);
    }
    setComboboxOpen(false);
  }

  const onSubmit = (values: FormValues) => {
    if (!user || !transaction) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar a transação. Tente novamente.',
      });
      return;
    }
    
    const isExpense = values.type === 'expense';
    
    const baseTransactionData: Record<string, any> = {
      date: Timestamp.fromDate(values.date),
      description: values.description,
      amount: values.amount,
      notes: values.notes,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    if (isExpense) {
        if (!values.group || !values.category || !values.description) {
            toast({
                variant: 'destructive',
                title: 'Classificação Incompleta',
                description: 'Por favor, selecione uma classificação de despesa completa.',
            });
            return;
        }
        baseTransactionData.costType = values.costType;
        baseTransactionData.category = values.category; // Legacy category for now
        baseTransactionData.fullCategoryPath = {
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
      baseTransactionData.category = values.category;
    }
    
    // If the transaction type changed, we need to delete the old document and create a new one in the correct collection
    if (values.type !== transaction.type) {
        // Delete from old collection
        const oldCollectionName = transaction.type === 'income' ? 'incomes' : 'expenses';
        const oldDocRef = doc(firestore, oldCollectionName, transaction.id);
        deleteDocumentNonBlocking(oldDocRef);

        // Add to new collection
        const newCollectionName = values.type === 'income' ? 'incomes' : 'expenses';
        const newCollectionRef = collection(firestore, newCollectionName);
        const newTransactionData = {
          ...baseTransactionData,
          userId: transaction.userId, // Preserve original creator
          createdByName: transaction.createdByName, // Preserve original creator name
        };
        addDocumentNonBlocking(newCollectionRef, newTransactionData);

    } else {
        // Type is the same, just update the existing document
        const collectionName = values.type === 'income' ? 'incomes' : 'expenses';
        const docRef = doc(firestore, collectionName, transaction.id);
        updateDocumentNonBlocking(docRef, baseTransactionData);
    }
    
    toast({
      title: 'Transação Atualizada',
      description: 'Sua transação foi atualizada com sucesso.',
    });
    onOpenChange(false);
  };
  
    const handleTypeChange = (value: string) => {
        form.setValue('type', value as 'income' | 'expense');
        form.resetField('description');
        form.resetField('category');
        form.resetField('group');
    }

  return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
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
                    <Select onValueChange={handleTypeChange} value={field.value}>
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
                                if (date) field.onChange(date)
                                setDatePickerOpen(false)
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
                    name="description"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Descrição</FormLabel>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? expenseClassificationOptions.find(
                                      (opt) => opt.value === field.value
                                    )?.label
                                  : "Selecione uma classificação"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Pesquisar classificação..." />
                              <CommandEmpty>Nenhuma classificação encontrada.</CommandEmpty>
                              <CommandGroup>
                                {expenseClassificationOptions.map((option) => (
                                  <CommandItem
                                    value={option.label}
                                    key={option.label}
                                    onSelect={() => handleExpenseSelection(option.label)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        field.value === option.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {option.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

                <FormField
                  control={form.control}
                  name="costType"
                  render={({ field }) => (
                      <FormItem className={cn(transactionType !== 'expense' && 'hidden')}>
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

    