

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
import { Loader2, CalendarIcon, ChevronsUpDown, Check, FileWarning } from 'lucide-react';
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
import { format, isFuture } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, serverTimestamp, query, doc } from 'firebase/firestore';
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
  status: z.enum(['active', 'cancelled', 'expired']),
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

interface EditContractDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contract: Contract | null;
}

export function EditContractDialog({ open, onOpenChange, contract }: EditContractDialogProps) {
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isDatePickerOpen, setDatePickerOpen] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const contractType = useWatch({ control: form.control, name: 'type' });
  const selectedGroup = useWatch({ control: form.control, name: "group" });
  const selectedCategory = useWatch({ control: form.control, name: "category" });
  const newExpirationDate = useWatch({ control: form.control, name: 'expirationDate' });


  useEffect(() => {
    if (contract && open) {
      form.reset({
        name: contract.name,
        description: contract.description || '',
        type: contract.type,
        amount: contract.amount,
        paymentFrequency: contract.paymentFrequency,
        paymentDueDate: contract.paymentDueDate,
        expirationDate: contract.expirationDate ? contract.expirationDate.toDate() : undefined,
        expenseDescription: contract.fullCategoryPath?.description || '',
        group: contract.fullCategoryPath?.group || '',
        category: contract.fullCategoryPath?.category || '',
        status: contract.status || 'active',
      });
      setManualEntry(false);
    }
  }, [contract, open, form]);

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

  const handleUpdate = (data: Partial<Contract>) => {
    if (!user || !firestore || !contract) return;
    
    const contractDocRef = doc(firestore, 'contracts', contract.id);
    updateDocumentNonBlocking(contractDocRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
  }
  
  const onSubmit = (values: FormValues) => {
     if (!values.group || !values.category || !values.expenseDescription) {
        toast({
          variant: 'destructive',
          title: 'Classificação Incompleta',
          description: 'Por favor, selecione ou preencha a classificação de despesa completa.',
        });
        return;
      }
    
    const contractData: Partial<Contract> = {
      name: values.name,
      description: values.description,
      type: values.type,
      paymentFrequency: values.paymentFrequency,
      paymentDueDate: values.paymentDueDate,
      fullCategoryPath: {
        group: values.group,
        category: values.category,
        description: values.expenseDescription,
      },
    };

    if (values.type === 'fixed') {
        contractData.amount = values.amount;
    } else {
        // Explicitly set amount to undefined if not fixed, so it can be handled below
        contractData.amount = undefined;
    }

    if (values.expirationDate) {
        contractData.expirationDate = Timestamp.fromDate(values.expirationDate);
    } else {
        contractData.expirationDate = undefined;
    }

    // Clean up undefined fields before sending to Firestore
    const cleanedContractData = Object.entries(contractData).reduce((acc, [key, value]) => {
        if (value !== undefined) {
            (acc as any)[key] = value;
        }
        return acc;
    }, {} as Partial<Contract>);


    handleUpdate(cleanedContractData);
    
    toast({
      title: 'Contrato Atualizado',
      description: `O contrato "${values.name}" foi atualizado com sucesso.`,
    });
    onOpenChange(false);
  };
  
  const handleCancelContract = () => {
    handleUpdate({ status: 'cancelled' });
    toast({
        title: 'Contrato Cancelado',
        description: 'O contrato foi marcado como cancelado e não gerará novas pendências.'
    });
    onOpenChange(false);
  }
  
  const handleRenewContract = () => {
     if (!newExpirationDate || !isFuture(newExpirationDate)) {
        toast({
            variant: 'destructive',
            title: 'Data de Renovação Inválida',
            description: 'Por favor, selecione uma data de vencimento futura para renovar.',
        });
        return;
    }
    form.setValue('status', 'active');
    form.handleSubmit(onSubmit)();
  }


  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-headline">Editar Contrato</DialogTitle>
            <DialogDescription>
              Atualize os detalhes, renove ou cancele o contrato.
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
                      <Input placeholder="Ex: Aluguel do Consultório" {...field} disabled={contract?.status === 'cancelled'} />
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
                      <Textarea placeholder="Detalhes sobre o contrato..." {...field} disabled={contract?.status === 'cancelled'}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center justify-between">
                     <h4 className="font-medium text-sm">Classificação da Despesa</h4>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="manual-entry-switch-edit" className="text-sm font-normal">Entrada Manual</Label>
                        <Switch
                          id="manual-entry-switch-edit"
                          checked={manualEntry}
                          onCheckedChange={setManualEntry}
                          disabled={contract?.status === 'cancelled'}
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
                              <Select onValueChange={(value) => { field.onChange(value); form.resetField('category'); form.resetField('expenseDescription'); }} value={field.value} disabled={contract?.status === 'cancelled'}>
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
                              <Select onValueChange={(value) => { field.onChange(value); form.resetField('expenseDescription'); }} value={field.value} disabled={!selectedGroup || contract?.status === 'cancelled'}>
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
                              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory || contract?.status === 'cancelled'}>
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
                                  disabled={contract?.status === 'cancelled'}
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={contract?.status === 'cancelled'}>
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
                          <Input type="number" placeholder="1500,00" {...field} disabled={contract?.status === 'cancelled'}/>
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
                        <Select onValueChange={field.onChange} value={field.value} disabled={contract?.status === 'cancelled'}>
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
                          <Input type="number" placeholder="Ex: 5" min="1" max="31" {...field} disabled={contract?.status === 'cancelled'} />
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
                              disabled={contract?.status === 'cancelled'}
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
                
                {contract?.status === 'expired' && (
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-300">
                        <div className='flex items-start gap-2'>
                           <FileWarning className="h-5 w-5 mt-0.5"/>
                            <div>
                                <h4 className='font-semibold'>Este contrato expirou.</h4>
                                <p className='text-xs'>Para reativá-lo, defina uma nova data de vencimento futura e clique em "Salvar e Renovar".</p>
                            </div>
                        </div>
                    </div>
                )}
              
              <DialogFooter className="pt-4 sm:justify-between gap-2">
                 <Button type="button" variant="destructive" onClick={handleCancelContract} disabled={form.formState.isSubmitting || contract?.status === 'cancelled'}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cancelar Contrato
                </Button>
                <div className='flex gap-2'>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">Fechar</Button>
                  </DialogClose>
                  {contract?.status === 'expired' ? (
                     <Button type="button" onClick={handleRenewContract} disabled={form.formState.isSubmitting || !newExpirationDate || !isFuture(newExpirationDate)}>
                        Salvar e Renovar
                    </Button>
                  ) : (
                     <Button type="submit" disabled={form.formState.isSubmitting || contract?.status === 'cancelled'}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Salvar Alterações
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
