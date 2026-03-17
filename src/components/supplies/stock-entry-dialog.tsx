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
import { Loader2, ArrowUpCircle, Check, ChevronsUpDown, CalendarIcon, Box, Pill, Truck, Hash } from 'lucide-react';
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
import { useFirestore, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, Timestamp, query } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import type { StockItem, StorageLocation } from '@/lib/types';

const formSchema = z.object({
  templateItemId: z.string().min(1, 'Selecione um item modelo.'),
  addedQuantity: z.coerce.number().positive('A quantidade deve ser maior que zero.'),
  locationId: z.string().min(1, 'Selecione o local de armazenamento.'),
  batch: z.string().min(1, 'Informe o lote da mercadoria.'),
  supplier: z.string().optional(),
  manufacturingDate: z.date().optional(),
  expiryDate: z.date().optional(),
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

  // Agrupar itens únicos para servirem de "template" no cadastro de novos lotes
  const uniqueTemplates = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const key = `${item.name.toLowerCase()}-${item.category.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, item);
      }
    });
    return Array.from(map.values()) as StockItem[];
  }, [items]);

  // Buscar locais de armazenamento
  const locationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'storageLocations'));
  }, [firestore, user]);

  const { data: locations } = useCollection<StorageLocation>(locationsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateItemId: initialItem?.id || '',
      addedQuantity: 0,
      locationId: '',
      batch: '',
      supplier: '',
      doseQuantity: 0,
    },
  });

  const selectedTemplateId = useWatch({ control: form.control, name: 'templateItemId' });
  const selectedTemplate = useMemo(() => 
    items.find(i => i.id === selectedTemplateId) || initialItem
  , [items, selectedTemplateId, initialItem]);

  const isMedication = useMemo(() => 
    selectedTemplate?.category.toUpperCase().includes('MEDICAMENTO')
  , [selectedTemplate]);

  useEffect(() => {
    if (open) {
      form.reset({
        templateItemId: initialItem?.id || '',
        addedQuantity: 0,
        locationId: initialItem?.locationId || '',
        batch: '',
        supplier: initialItem?.supplier || '',
        doseQuantity: initialItem?.doseQuantity || 0,
      });
    }
  }, [open, initialItem, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) return;

    try {
      if (!selectedTemplate) throw new Error('Item modelo não encontrado');

      // CRIAÇÃO DE UM NOVO REGISTRO PARA O NOVO LOTE/ENDEREÇO
      const newStockData: any = {
        code: selectedTemplate.code || '00000', // Herda o código do modelo
        name: selectedTemplate.name,
        category: selectedTemplate.category,
        subCategory: selectedTemplate.subCategory || '',
        derivation: selectedTemplate.derivation || '',
        unit: selectedTemplate.unit,
        minQuantity: selectedTemplate.minQuantity,
        quantity: values.addedQuantity,
        locationId: values.locationId,
        locationName: locations?.find(l => l.id === values.locationId)?.name || 'Não definido',
        batch: values.batch,
        supplier: values.supplier || '',
        manufacturingDate: values.manufacturingDate ? Timestamp.fromDate(values.manufacturingDate) : null,
        expiryDate: values.expiryDate ? Timestamp.fromDate(values.expiryDate) : null,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'Usuário',
        lastRestock: serverTimestamp(),
      };

      if (isMedication) {
        newStockData.doseQuantity = values.doseQuantity;
      }

      addDocumentNonBlocking(collection(firestore, 'stock'), newStockData);
      
      toast({ 
        title: 'Lote Cadastrado', 
        description: `Novo lote ${values.batch} de ${selectedTemplate.name} (Cód: ${newStockData.code}) registrado com sucesso.` 
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro na Entrada', description: 'Não foi possível registrar o novo lote.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-emerald-600">
            <ArrowUpCircle className="h-5 w-5" />
            Entrada de Estoque (Novo Lote)
          </DialogTitle>
          <DialogDescription>
            Cada entrada gera um novo registro. O SKU será herdado do produto selecionado.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="templateItemId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Item Modelo (Template)</FormLabel>
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
                            : "Selecione o produto..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Pesquisar produto..." />
                        <CommandList>
                          <CommandEmpty>Nenhum produto cadastrado.</CommandEmpty>
                          <CommandGroup>
                            {uniqueTemplates.map((item) => (
                              <CommandItem
                                value={item.name}
                                key={item.id}
                                onSelect={() => {
                                  form.setValue("templateItemId", item.id);
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
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[9px] h-4 font-mono">{item.code || '---'}</Badge>
                                        <span>{item.name}</span>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground uppercase">{item.category} | Modelo base</span>
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
                    <FormLabel>Qtd. Recebida ({selectedTemplate?.unit || 'un'})</FormLabel>
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

            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Truck className="h-3 w-3" /> Fornecedor
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Farmácia Central, Distribuidora X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isMedication && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider mb-2">
                  <Pill className="h-3.5 w-3.5" />
                  Especificação do Medicamento
                </div>
                <FormField
                  control={form.control}
                  name="doseQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[11px] uppercase text-muted-foreground">Volume da Dose / Frasco (ml/mg)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Ex: 5" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local de Armazenamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Onde será guardado?" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {locations?.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.description})</SelectItem>
                      ))}
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
                Cadastrar Lote
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
