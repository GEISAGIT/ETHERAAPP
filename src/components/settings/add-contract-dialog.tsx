

'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { addDocumentNonBlocking, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, serverTimestamp, query } from 'firebase/firestore';
import type { Contract, ExpenseCategoryGroup, ContractStatus } from '@/lib/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';


const formSchema = z.object({
  name: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  description: z.string().optional(),
  type: z.enum(['fixed', 'variable']),
  amount: z.coerce.number().optional(),
  paymentFrequency: z.enum(['monthly', 'bimonthly', 'quarterly', 'semiannually', 'annually']),
  paymentDueDate: z.coerce.number().min(1, "O dia deve ser entre 1 e 31").max(31, "O dia deve ser entre 1 e 31").optional(),
  expirationDate: z.date().optional(),
  expenseDescription: z.string().min(1, 'A classificação é obrigatória.'),
  group: z.string().optional(),
  category: z.string().optional(),
}).refine(data => {
    if (data.type === 'fixed') {
        return data.amount !== undefined && data.amount > 0;
    }
    return true;
}, {
    message: 'O valor é obrigatório para contratos do tipo Fixo.',
    path: ['amount'],
});


type FormValues = z.infer<typeof formSchema>;

interface AddContractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddContractDialog({ open, onOpenChange }: AddContractDialogProps) {
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'fixed',
      paymentFrequency: 'monthly',
      expenseDescription: '',
    },
  });

  const contractType = useWatch({ control: form.control, name: 'type' });
  const selectedGroup = useWatch({ control: form.control, name: "group" });
  const selectedCategory = useWatch({ control: form.control, name: "category" });

  useEffect(() => {
    if (!open) {
      form.reset({
        name: '',
        description: '',
        type: 'fixed',
        paymentFrequency: 'monthly',
        amount: undefined,
        paymentDueDate: undefined,
        expirationDate: undefined,
        expenseDescription: '',
        group: '',
        category: '',
      });
       setManualEntry(false);
    }
  }, [open, form]);

  const expenseCategoryGroupsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'expenseCategoryGroups'));
  }, [firestore, user]);

  const { data: expenseCategoryGroups } = useCollection<ExpenseCategoryGroup>(expenseCategoryGroupsQuery);
  
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
        form.setValue('expenseDescription', selected.value);
    }
    form.trigger('expenseDescription');
    setComboboxOpen(false);
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

     if (!values.group || !values.category || !values.expenseDescription) {
        toast({
          variant: 'destructive',
          title: 'Classificação Incompleta',
          description: 'Por favor, selecione ou preencha a classificação de despesa completa.',
        });
        return;
      }
    
    const contractsCollection = collection(firestore, 'contracts');

    const contractData: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
      userId: user.uid,
      name: values.name,
      description: values.description,
      type: values.type,
      status: 'active',
      paymentFrequency: values.paymentFrequency,
      paymentDueDate: values.paymentDueDate,
      fullCategoryPath: {
        group: values.group,
        category: values.category,
        description: values.expenseDescription,
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (values.type === 'fixed') {
        contractData.amount = values.amount;
    }
    if (values.expirationDate) {
        contractData.expirationDate = Timestamp.fromDate(values.expirationDate);
    }

    addDocumentNonBlocking(contractsCollection, contractData);
    
    toast({
      title: 'Contrato Adicionado',
      description: `O contrato "${values.name}" foi registrado com sucesso.`,
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">Novo Contrato</DialogTitle>
            <DialogDescription>
              Adicione um novo contrato ou cobrança recorrente.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Contrato</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Aluguel do Consultório" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalhes sobre o contrato..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                     <h4 className="font-medium text-sm">Classificação da Despesa</h4>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="manual-entry-switch" className="text-sm font-normal">Entrada Manual</Label>
                        <Switch
                          id="manual-entry-switch"
                          checked={manualEntry}
                          onCheckedChange={setManualEntry}
                        />
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
                              <Select onValueChange={(value) => { field.onChange(value); form.resetField('category'); form.resetField('expenseDescription'); }} value={field.value}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecione um grupo" /></SelectTrigger>
                                </FormControl>
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
                              <Select onValueChange={(value) => { field.onChange(value); form.resetField('expenseDescription'); }} value={field.value} disabled={!selectedGroup}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecione uma categoria" /></SelectTrigger>
                                </FormControl>
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
                          name="expenseDescription"
                          render={({ field }) => (
                             <FormItem>
                              <FormLabel>Descrição</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory}>
                                <FormControl>
                                  <SelectTrigger><SelectValue placeholder="Selecione a descrição final" /></SelectTrigger>
                                </FormControl>
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
                      name="expenseDescription"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Classificação da Despesa</FormLabel>
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
                                    ? field.value
                                    : "Selecione uma classificação"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                              <Command
                                filter={(value, search) => {
                                  const option = expenseClassificationOptions.find(opt => opt.value === value);
                                  if (option) {
                                    if (option.label.toLowerCase().includes(search.toLowerCase())) return 1;
                                  }
                                  return 0;
                                }}
                              >
                                <CommandInput placeholder="Pesquisar descrição..." />
                                <CommandList>
                                  <CommandEmpty>Nenhuma descrição encontrada.</CommandEmpty>
                                  <CommandGroup>
                                    {expenseClassificationOptions.map((option) => (
                                      <CommandItem
                                        value={option.value}
                                        key={option.value}
                                        onSelect={handleExpenseSelection}
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

              <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
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
                    name="amount"
                    render={({ field }) => (
                      <FormItem className={contractType === 'variable' ? 'hidden' : ''}>
                        <FormLabel>Valor (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="1500,00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

               <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentFrequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Frequência</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="monthly">Mensal</SelectItem>
                            <SelectItem value="bimonthly">Bimestral</SelectItem>
                            <SelectItem value="quarterly">Trimestral</SelectItem>
                            <SelectItem value="semiannually">Semestral</SelectItem>
                            <SelectItem value="annually">Anual</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="paymentDueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia do Vencimento</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 5" min="1" max="31" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>

                <FormField
                    control={form.control}
                    name="expirationDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col pt-2">
                      <FormLabel>Vencimento do Contrato (Opcional)</FormLabel>
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
              
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button type="button" variant="ghost">Cancelar</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Contrato
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
