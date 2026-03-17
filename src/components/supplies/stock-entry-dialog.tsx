'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, ArrowUpCircle, Check, ChevronsUpDown, CalendarIcon, Box } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
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
});

type FormValues = z.infer<typeof formSchema>;

export function StockEntryDialog({ 
  open, 
  onOpenChange, 
  items 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  items: StockItem[]
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
      itemId: '',
      addedQuantity: 0,
      locationId: '',
      batch: '',
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) return;

    try {
      const selectedItem = items.find(i => i.id === values.itemId);
      const selectedLocation = locations?.find(l => l.id === values.locationId);
      
      if (!selectedItem) throw new Error('Item não encontrado');

      const stockRef = doc(firestore, 'stock', values.itemId);
      
      updateDocumentNonBlocking(stockRef, {
        quantity: increment(values.addedQuantity),
        locationId: values.locationId,
        locationName: selectedLocation?.name || 'Não definido',
        batch: values.batch,
        manufacturingDate: values.manufacturingDate ? Timestamp.fromDate(values.manufacturingDate) : null,
        expiryDate: values.expiryDate ? Timestamp.fromDate(values.expiryDate) : null,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'Usuário',
        lastRestock: serverTimestamp(),
      });
      
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
          <DialogTitle className="font-headline flex items-center gap-2 text-primary">
            <ArrowUpCircle className="h-5 w-5" />
            Entrada de Estoque
          </DialogTitle>
          <DialogDescription>Atualize o saldo, local e validade do item.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Localizar Item</FormLabel>
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
                                    <span className="text-[10px] text-muted-foreground uppercase">{item.category} | Atual: {item.quantity} {item.unit}</span>
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
                    <FormLabel>Qtd. Entrada</FormLabel>
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
                    <FormLabel>Lote</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: LT-2024" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Destino (Local de Armazenamento)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormLabel>Data de Fabricação</FormLabel>
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
                    <FormLabel>Data de Validade</FormLabel>
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
              <Button type="submit" disabled={form.formState.isSubmitting}>
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
