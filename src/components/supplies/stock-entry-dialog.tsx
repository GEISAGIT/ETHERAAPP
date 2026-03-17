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
} from '@/components/ui/dialog';
import { Loader2, ArrowUpCircle, Check, ChevronsUpDown, CalendarIcon, Box, Pill, Truck } from 'lucide-react';
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
import type { StorageLocation } from '@/lib/types';

const formSchema = z.object({
  catalogItemId: z.string().min(1, 'Selecione um item do catálogo.'),
  addedQuantity: z.coerce.number().positive('A quantidade deve ser positiva.'),
  locationId: z.string().min(1, 'Selecione o local.'),
  batch: z.string().min(1, 'Informe o lote.'),
  supplier: z.string().min(1, 'Informe o fornecedor.'),
  manufacturingDate: z.date().optional(),
  expiryDate: z.date().optional(),
  vialVolume: z.coerce.number().optional(),
  doseVolume: z.coerce.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function StockEntryDialog({ open, onOpenChange, items }: { open: boolean, onOpenChange: (open: boolean) => void, items: any[] }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const locationsQuery = useMemoFirebase(() => {
    if (!firestore || !open) return null;
    return query(collection(firestore, 'storageLocations'));
  }, [firestore, open]);

  const { data: locations } = useCollection<StorageLocation>(locationsQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { 
      catalogItemId: '', 
      addedQuantity: 0, 
      locationId: '', 
      batch: '', 
      supplier: '', 
      vialVolume: 0, 
      doseVolume: 0 
    },
  });

  const selectedItemId = useWatch({ control: form.control, name: 'catalogItemId' });
  const selectedItem = useMemo(() => items.find(i => i.id === selectedItemId), [items, selectedItemId]);
  const isMedication = useMemo(() => selectedItem?.category?.toUpperCase().includes('MEDICAMENTO'), [selectedItem]);

  useEffect(() => {
    if (open) form.reset();
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore || !selectedItem) return;
    try {
      const stockData = {
        catalogId: selectedItem.id,
        code: selectedItem.code,
        name: selectedItem.name,
        category: selectedItem.category,
        unit: selectedItem.unit,
        minQuantity: selectedItem.minQuantity,
        quantity: values.addedQuantity,
        locationId: values.locationId,
        locationName: locations?.find(l => l.id === values.locationId)?.name || 'N/A',
        batch: values.batch,
        supplier: values.supplier,
        manufacturingDate: values.manufacturingDate ? Timestamp.fromDate(values.manufacturingDate) : null,
        expiryDate: values.expiryDate ? Timestamp.fromDate(values.expiryDate) : null,
        vialVolume: values.vialVolume || 0,
        doseVolume: values.doseVolume || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'Usuário',
      };
      addDocumentNonBlocking(collection(firestore, 'stock'), stockData);
      toast({ title: 'Entrada Registrada', description: `Lote ${values.batch} de ${selectedItem.name} adicionado.` });
      onOpenChange(false);
    } catch (e) { toast({ variant: 'destructive', title: 'Erro na Entrada' }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-emerald-600 flex items-center gap-2"><ArrowUpCircle className="h-5 w-5" /> Entrada de Estoque</DialogTitle>
          <DialogDescription>Selecione um item do catálogo para registrar uma nova remessa/lote.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="catalogItemId" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Item do Catálogo</FormLabel>
                  <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}><PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>{field.value ? items.find(i => i.id === field.value)?.name : "Escolha o produto..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Pesquisar..." /><CommandList><CommandEmpty>Nada encontrado.</CommandEmpty><CommandGroup>{items.map((item) => (
                        <CommandItem value={item.name} key={item.id} onSelect={() => { form.setValue("catalogItemId", item.id); setComboboxOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", item.id === field.value ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col"><div className="flex items-center gap-2"><Badge variant="outline" className="text-[9px] h-4">{item.code}</Badge><span>{item.name}</span></div><span className="text-[10px] text-muted-foreground uppercase">{item.category}</span></div>
                        </CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                  </Popover><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="addedQuantity" render={({ field }) => (<FormItem><FormLabel>Quantidade ({selectedItem?.unit || '---'})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="batch" render={({ field }) => (<FormItem><FormLabel>Lote</FormLabel><FormControl><Input placeholder="Ex: LT-123" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="supplier" render={({ field }) => (<FormItem><FormLabel><Truck className="h-3 w-3 inline mr-1" /> Fornecedor</FormLabel><FormControl><Input placeholder="Nome do fornecedor" {...field} /></FormControl><FormMessage /></FormItem>)} />
            
            {isMedication && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg border border-dashed border-primary/30">
                <div className="col-span-2 text-[10px] uppercase font-bold text-primary mb-1">Composição do Medicamento</div>
                <FormField control={form.control} name="vialVolume" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Volume do frasco (mg/ml)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="doseVolume" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Volume da dose (ml)</FormLabel>
                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            <FormField control={form.control} name="locationId" render={({ field }) => (
                <FormItem><FormLabel>Local de Armazenamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Onde guardar?" /></SelectTrigger></FormControl>
                    <SelectContent>{locations?.map(loc => <SelectItem key={loc.id} value={loc.id}>{loc.name} ({loc.description})</SelectItem>)}</SelectContent>
                  </Select><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="manufacturingDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Fabricação</FormLabel><Popover modal><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>DD/MM/AAAA</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} locale={ptBR} /></PopoverContent></Popover><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="expiryDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Validade</FormLabel><Popover modal><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>DD/MM/AAAA</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} locale={ptBR} /></PopoverContent></Popover><FormMessage /></FormItem>
                )} />
            </div>
            <DialogFooter className="pt-4"><Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700">Registrar Entrada de Lote</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
