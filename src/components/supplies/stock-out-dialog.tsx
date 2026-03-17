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
import { Loader2, ArrowDownCircle, Check, ChevronsUpDown } from 'lucide-react';
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
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { increment, serverTimestamp, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { StockItem } from '@/lib/types';

const formSchema = z.object({
  itemId: z.string().min(1, 'Selecione um item.'),
  outQuantity: z.coerce.number().positive('A quantidade deve ser maior que zero.'),
  reason: z.string().min(3, 'Informe o motivo da saída.'),
});

type FormValues = z.infer<typeof formSchema>;

export function StockOutDialog({ 
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemId: initialItem?.id || '',
      outQuantity: 0,
      reason: 'Uso em Procedimento',
    },
  });

  const selectedItemId = useWatch({ control: form.control, name: 'itemId' });
  const selectedItem = useMemo(() => 
    items.find(i => i.id === selectedItemId) || initialItem
  , [items, selectedItemId, initialItem]);

  useEffect(() => {
    if (open) {
      form.reset({
        itemId: initialItem?.id || '',
        outQuantity: 0,
        reason: 'Uso em Procedimento',
      });
    }
  }, [open, initialItem, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore || !selectedItem) return;

    if (values.outQuantity > selectedItem.quantity) {
        toast({ 
            variant: 'destructive', 
            title: 'Saldo Insuficiente', 
            description: `Você tentou retirar ${values.outQuantity}, mas só existem ${selectedItem.quantity} unidades em estoque.` 
        });
        return;
    }

    try {
      const stockRef = doc(firestore, 'stock', values.itemId);
      
      // Subtrai a quantidade do saldo total
      updateDocumentNonBlocking(stockRef, {
        quantity: increment(-values.outQuantity),
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'Usuário',
      });
      
      toast({ 
        title: 'Baixa Realizada', 
        description: `Retirado ${values.outQuantity} ${selectedItem.unit} de ${selectedItem.name}.` 
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro na Baixa', description: 'Não foi possível atualizar o estoque.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-red-600">
            <ArrowDownCircle className="h-5 w-5" />
            Registrar Saída / Baixa
          </DialogTitle>
          <DialogDescription>O valor abaixo será subtraído do saldo total do item.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Item para Baixa</FormLabel>
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
            
            <div className="grid grid-cols-1 gap-4">
                <FormField
                control={form.control}
                name="outQuantity"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Quantidade de Saída ({selectedItem?.unit})</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Motivo da Baixa</FormLabel>
                    <FormControl>
                        <Input placeholder="Ex: Uso em paciente, Descarte, Vencimento..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-[11px] text-muted-foreground italic">
                Saldo após a operação: <span className="font-bold">{(selectedItem?.quantity || 0) - (form.watch('outQuantity') || 0)}</span> {selectedItem?.unit}
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting} variant="destructive">
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Saída
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}