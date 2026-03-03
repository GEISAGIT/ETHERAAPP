
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
import { PlusCircle, Loader2, Check, ChevronsUpDown, UploadCloud, CalendarIcon } from 'lucide-react';
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { addDocumentNonBlocking, useFirestore, useUser, useCollection, useMemoFirebase, useStorage } from '@/firebase';
import { collection, Timestamp, query, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { IncomeCategory, ExpenseCategoryGroup } from '@/lib/types';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';


const formSchema = z.object({
  date: z.date({ required_error: 'A data é obrigatória.'}),
  amount: z.coerce.number().positive('O valor deve ser positivo'),
  type: z.enum(['income', 'expense']),
  description: z.string().min(1, 'A descrição/classificação é obrigatória.'),
  category: z.string().optional(),
  group: z.string().optional(),
  costType: z.enum(['fixed', 'variable']).optional(),
  notes: z.string().optional(),
  receipt: z.instanceof(File).optional(),
});


type FormValues = z.infer<typeof formSchema>;

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dateInput, setDateInput] = useState("");
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
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
      receipt: undefined,
    },
  });
  
  const transactionType = useWatch({ control: form.control, name: 'type' });
  const selectedGroup = useWatch({ control: form.control, name: "group" });
  const selectedCategory = useWatch({ control: form.control, name: "category" });
  const dateValue = form.watch("date");
  
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
          receipt: undefined,
        });
        setManualEntry(false);
        setDateInput("");
    }
  }, [open, form]);

  useEffect(() => {
    if (dateValue) {
      setDateInput(format(dateValue, "dd/MM/yyyy"));
    }
  }, [dateValue]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateInput(val);
    
    const parts = val.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime()) && y > 1900 && d === date.getDate()) {
        form.setValue("date", date, { shouldValidate: true });
      }
    }
  };

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

  const incomeCategoryOptions = useMemo(() => {
    return incomeCategories?.map(c => c.name).sort() ?? [];
  }, [incomeCategories]);

  const expenseClassificationOptions = useMemo(() => {
    if (!expenseCategoryGroups) return [];
    return expenseCategoryGroups.flatMap(group =>
      group.categories.flatMap(category =>
        category.subCategories.map(subCategory => ({
          label: subCategory.name,
          value: subCategory.name,
          group: group.name,
          category: category.name
        }))
      )
    ).filter((value, index, self) => self.findIndex(t => t.label === value.label) === index)
     .sort((a, b) => a.label.localeCompare(b.label));
  }, [expenseCategoryGroups]);

  const groupOptions = useMemo(() => expenseCategoryGroups?.map(g => g.name) ?? [], [expenseCategoryGroups]);
  
  const categoryOptions = useMemo(() => {
    if (!selectedGroup) return [];
    const group = expenseCategoryGroups?.find(g => g.name === selectedGroup);
    return group?.categories.map(c => c.name) ?? [];
  }, [selectedGroup, expenseCategoryGroups]);

  const descriptionOptions = useMemo(() => {
    if (!selectedGroup || !selectedCategory) return [];
    const group = expenseCategoryGroups?.find(g => g.name === selectedGroup);
    const category = group?.categories.find(c => c.name === selectedCategory);
    return category?.subCategories.map(sc => sc.name) ?? [];
  }, [selectedGroup, selectedCategory, expenseCategoryGroups]);

  const handleExpenseSelection = (currentValue: string) => {
    const selected = expenseClassificationOptions.find(opt => opt.value === currentValue);
    if (selected) {
        form.setValue('group', selected.group);
        form.setValue('category', selected.category);
        form.setValue('description', selected.value);
    }
    form.trigger('description');
    setComboboxOpen(false);
  }
  
  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore || !storage) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Usuário não autenticado.',
      });
      return;
    }
    
    setIsUploading(true);

    const isExpense = values.type === 'expense';
    const collectionName = isExpense ? 'expenses' : 'incomes';
    const transactionsCollection = collection(firestore, collectionName);

    let receiptUrl: string | undefined = undefined;
    if (isExpense && values.receipt) {
      try {
        const receiptRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${values.receipt.name}`);
        const snapshot = await uploadBytes(receiptRef, values.receipt);
        receiptUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
          console.error("Erro no upload do comprovante:", error);
      }
    }
    
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
      transactionData.costType = values.costType;
      transactionData.category = values.category;
      if (receiptUrl) transactionData.receiptUrl = receiptUrl;
      transactionData.fullCategoryPath = {
        group: values.group,
        category: values.category,
        description: values.description,
      };
    } else {
      transactionData.category = values.category;
    }

    addDocumentNonBlocking(transactionsCollection, transactionData);
    
    toast({ title: 'Transação Adicionada' });
    setIsUploading(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Transação</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Nova Transação</DialogTitle>
          <DialogDescription>Registre uma nova movimentação financeira.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={(v) => { field.onChange(v); form.resetField('description'); form.resetField('category'); }} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                    <FormControl><Input type="number" placeholder="0,00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Data</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="DD/MM/AAAA"
                          value={dateInput}
                          onChange={handleDateInputChange}
                          className="flex-1"
                        />
                      </FormControl>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="shrink-0">
                            <CalendarIcon className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar 
                            mode="single" 
                            selected={field.value} 
                            onSelect={(date) => {
                              field.onChange(date);
                              if (date) setDateInput(format(date, "dd/MM/yyyy"));
                            }} 
                            initialFocus 
                            locale={ptBR} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
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
                      <FormControl><Input placeholder="ex: Consulta Dr. João" {...field} /></FormControl>
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
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {incomeCategoryOptions.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            ) : (
              <div className="space-y-4 rounded-md border p-4">
                <div className="flex items-center justify-between">
                   <h4 className="font-medium text-sm">Classificação</h4>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="manual-entry-switch" className="text-sm font-normal">Manual</Label>
                      <Switch id="manual-entry-switch" checked={manualEntry} onCheckedChange={setManualEntry} />
                    </div>
                </div>
                {manualEntry ? (
                  <div className="space-y-4">
                     <FormField
                        control={form.control}
                        name="group"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grupo</FormLabel>
                            <Select onValueChange={(v) => { field.onChange(v); form.resetField('category'); form.resetField('description'); }} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                            <Select onValueChange={(v) => { field.onChange(v); form.resetField('description'); }} value={field.value} disabled={!selectedGroup}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {categoryOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                            <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {descriptionOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Buscar Classificação</FormLabel>
                        <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                {field.value ? field.value : "Selecione..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Pesquisar..." />
                              <CommandList>
                                <CommandEmpty>Não encontrado.</CommandEmpty>
                                <CommandGroup>
                                  {expenseClassificationOptions.map((opt) => (
                                    <CommandItem value={opt.value} key={opt.value} onSelect={handleExpenseSelection}>
                                      <Check className={cn("mr-2 h-4 w-4", field.value === opt.value ? "opacity-100" : "opacity-0")} />
                                      {opt.label}
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
              </div>
            )}

            {transactionType === 'expense' && (
              <>
              <FormField
                control={form.control}
                name="costType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Custo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="fixed">Fixo</SelectItem>
                        <SelectItem value="variable">Variável</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="receipt"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                        <FormLabel>Comprovante</FormLabel>
                        <FormControl>
                            <div className="flex items-center gap-2">
                                <label htmlFor="receipt-add" className="flex-1 cursor-pointer items-center gap-2 rounded-md border border-input bg-background p-2 text-sm text-muted-foreground hover:bg-accent flex">
                                    <UploadCloud className="mr-2 h-4 w-4" /> {value?.name || 'Selecionar'}
                                </label>
                                <Input id="receipt-add" type="file" className="sr-only" onChange={e => onChange(e.target.files?.[0])} {...rest} />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
              />
              </>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação</FormLabel>
                  <FormControl><Textarea placeholder="..." className="resize-none" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isUploading || form.formState.isSubmitting}>
                {(isUploading || form.formState.isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
