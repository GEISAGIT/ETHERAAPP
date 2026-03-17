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
import { Loader2, ArrowUpCircle, Check, ChevronsUpDown, CalendarIcon, Box, Pill } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
import { useFirestore, useUser, updateDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, increment, serverTimestamp, Timestamp, query, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import type { StockItem, StorageLocation } from '@/lib/types';

const formSchema = z.object({
  itemId: z.string().min(1, 'Selecione um item.'),
  addedQuantity: z.coerce.number().positive('A quantidade deve ser maior que zero.'),
  locationId: z.string().min(1, 'Selecione o local de armazenamento.'),
  batch: z.string().min(1, 'Informe o lote da mercadoria.'),
  manufacturingDate: z.date().optional(),
  expiryDate: z.date().optional(),
  ampuleQuantity: z.coerce.number().optional(),
  doseQuantity: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function StockEntryDialog({ 
  open, 
  onOpenChange, 
  items,
  initialItem 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  items: StockItem[],
  initialItem?: StockItem | null
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Buscar locais de armazenamento
  const locationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'storageLocations'));
  }, [firestore, user]);

  const { data: locations } = useCollection<StorageLocation>(locationsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemId: initialItem?.id || '',
      addedQuantity: 0,
      locationId: '',
      batch: '',
      ampuleQuantity: 0,
      doseQuantity: 0,
    },
  });

  const selectedItemId = useWatch({ control: form.control, name: 'itemId' });
  const selectedItem = useMemo(() => 
    items.find(i => i.id === selectedItemId) || initialItem
  , [items, selectedItemId, initialItem]);

  const isMedication = useMemo(() => 
    selectedItem?.category.toUpperCase().includes('MEDICAMENTO')
  , [selectedItem]);

  useEffect(() => {
    if (open) {
      form.reset({
        itemId: initialItem?.id || '',
        addedQuantity: 0,
        locationId: initialItem?.locationId || '',
        batch: initialItem?.batch || '',
        ampuleQuantity: initialItem?.ampuleQuantity || 0,
        doseQuantity: initialItem?.doseQuantity || 0,
      });
    }
  }, [open, initialItem, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) return;

    try {
      if (!selectedItem) throw new Error('Item não encontrado');

      const stockRef = doc(firestore, 'stock', values.itemId);
      
      // A quantidade adicionada é somada ao saldo total (quantity)
      const updateData: any = {
        quantity: increment(values.addedQuantity),
        locationId: values.locationId,
        locationName: locations?.find(l => l.id === values.locationId)?.name || 'Não definido',
        batch: values.batch,
        manufacturingDate: values.manufacturingDate ? Timestamp.fromDate(values.manufacturingDate) : null,
        expiryDate: values.expiryDate ? Timestamp.fromDate(values.expiryDate) : null,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'Usuário',
        lastRestock: serverTimestamp(),
      };

      if (isMedication) {
        updateData.ampuleQuantity = values.ampuleQuantity;
        updateData.doseQuantity = values.doseQuantity;
      }

      updateDocumentNonBlocking(stockRef, updateData);
      
      toast({ 
        title: 'Entrada Registrada', 
        description: `Adicionado ${values.addedQuantity} ${selectedItem.unit} ao item ${selectedItem.name}.` 
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro na Entrada', description: 'Não foi possível atualizar o estoque.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-emerald-600">
            <ArrowUpCircle className="h-5 w-5" />
            Entrada de Estoque
          </DialogTitle>
          <DialogDescription>A quantidade abaixo será somada ao saldo atual do item.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Item para Reposição</FormLabel>
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
                          disabled={!!initialItem}
                        >
                          {field.value
                            ? items.find((item) => item.id === field.value)?.name
                            : "Selecione o item..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Pesquisar item..." />
                        <CommandList>
                          <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                          <CommandGroup>
                            {items.map((item) => (
                              <CommandItem
                                value={item.name}
                                key={item.id}
                                onSelect={() => {
                                  form.setValue("itemId", item.id);
                                  setComboboxOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    item.id === field.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                    <span>{item.name}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase">{item.category} | Saldo: {item.quantity} {item.unit}</span>
                                </div>
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
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="addedQuantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantidade que Entrou</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="batch"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Número do Lote</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: LT-2024" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            {isMedication && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Pill className="h-4 w-4" />
                  Composição do Medicamento
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ampuleQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase text-muted-foreground">Qtd. Ampolas/Frascos p/ un.</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 10" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="doseQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[11px] uppercase text-muted-foreground">Volume da Dose (ml/mg)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Onde será armazenado?</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o local..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {locations?.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.description})</SelectItem>
                      ))}
                      {(!locations || locations.length === 0) && <SelectItem value="none" disabled>Nenhum local cadastrado</SelectItem>}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dashed">
                <FormField
                control={form.control}
                name="manufacturingDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Fabricação</FormLabel>
                    <Popover modal>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>DD/MM/AAAA</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                    <FormLabel>Validade</FormLabel>
                    <Popover modal>
                        <PopoverTrigger asChild>
                        <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>DD/MM/AAAA</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} />
                        </PopoverContent>
                    </Popover>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Entrada
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}