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
import { Loader2, CalendarIcon, ChevronsUpDown, Check } from 'lucide-react';
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
import { updateDocumentNonBlocking, useFirestore, useUser, useCollection, useMemoFirebase, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, query, doc, serverTimestamp } from 'firebase/firestore';
import type { IncomeCategory, ExpenseCategoryGroup, Transaction, ExpenseTransaction } from '@/lib/types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"


const formSchema = z.object({
  date: z.date({ required_error: 'A data é obrigatória.'}),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'A descrição/classificação é obrigatória.'),
  category: z.string().optional(),
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
  const [isComboboxOpen, setComboboxOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string>('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });
  
  const transactionType = useWatch({
    control: form.control,
    name: 'type',
  });

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
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category || '',
        notes: transaction.notes || '',
        costType: isExpense ? expenseTransaction.costType : undefined,
      });

      if (isExpense && expenseTransaction.fullCategoryPath) {
        setSelectedGroup(expenseTransaction.fullCategoryPath.group || '');
        setSelectedExpenseCategory(expenseTransaction.fullCategoryPath.category || '');
        // The description field now holds the subcategory name
        form.setValue('description', expenseTransaction.fullCategoryPath.description);
      }
    } else if (!open) {
      form.reset();
      setSelectedGroup('');
      setSelectedExpenseCategory('');
    }
  }, [transaction, open, form]);


  // --- Memoized Select Options ---
  const incomeCategoryOptions = useMemo(() => {
    return incomeCategories?.map(c => c.name).sort() ?? [];
  }, [incomeCategories]);

 const expenseSearchOptions = useMemo(() => {
    if (!expenseCategoryGroups) return [];
    return expenseCategoryGroups.flatMap(group =>
      group.categories.flatMap(category =>
        category.subCategories.map(subCategory => ({
          value: `${group.name} > ${category.name} > ${subCategory.name}`.toLowerCase(),
          label: `${group.name} > ${category.name} > ${subCategory.name}`,
          group: group.name,
          category: category.name,
          subCategory: subCategory.name,
        }))
      )
    );
  }, [expenseCategoryGroups]);



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
    
    // Base data for both update and potential re-creation
    const baseTransactionData: Record<string, any> = {
      date: Timestamp.fromDate(values.date),
      description: values.description,
      amount: values.amount,
      notes: values.notes,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    if (isExpense) {
        if (!selectedGroup || !selectedExpenseCategory) {
            toast({
                variant: 'destructive',
                title: 'Classificação Incompleta',
                description: 'Por favor, selecione uma classificação de despesa válida.',
            });
            return;
        }
        baseTransactionData.costType = values.costType;
        baseTransactionData.category = selectedExpenseCategory; // Middle-level category
        baseTransactionData.fullCategoryPath = {
            group: selectedGroup,
            category: selectedExpenseCategory,
            description: values.description, // This is the subCategory name
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
    
    // If the type has changed, we need to delete the old doc and create a new one
    if (values.type !== transaction.type) {
        // Delete the old document
        const oldCollectionName = transaction.type === 'income' ? 'incomes' : 'expenses';
        const oldDocRef = doc(firestore, oldCollectionName, transaction.id);
        deleteDocumentNonBlocking(oldDocRef);

        // Create the new document in the correct collection
        const newCollectionName = values.type === 'income' ? 'incomes' : 'expenses';
        const newCollectionRef = collection(firestore, newCollectionName);
        const newTransactionData = {
          ...baseTransactionData,
          userId: transaction.userId, // Preserve original creator
          createdByName: transaction.createdByName, // Preserve original creator name
        };
        addDocumentNonBlocking(newCollectionRef, newTransactionData);

    } else {
        // Type is the same, just update the document in place
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
        setSelectedGroup('');
        setSelectedExpenseCategory('');
    }

    const handleExpenseSelection = (option: { group: string; category: string; subCategory: string; }) => {
        form.setValue("description", option.subCategory, { shouldValidate: true });
        setSelectedGroup(option.group);
        setSelectedExpenseCategory(option.category);
        setComboboxOpen(false);
    };

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
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Classificação da Despesa</FormLabel>
                         <Popover open={isComboboxOpen} onOpenChange={setComboboxOpen}>
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
                                  ? expenseSearchOptions.find(
                                      (option) => option.subCategory === field.value
                                    )?.label
                                  : "Selecione ou pesquise a descrição"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Pesquisar descrição..." />
                               <CommandList>
                                <CommandEmpty>Nenhuma descrição encontrada.</CommandEmpty>
                                <CommandGroup>
                                  {expenseSearchOptions.map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      value={option.label}
                                      onSelect={() => handleExpenseSelection(option)}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === option.subCategory
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {option.label}
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
