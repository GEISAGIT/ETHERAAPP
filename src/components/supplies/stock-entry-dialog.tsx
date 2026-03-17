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
import { Loader2, ArrowUpCircle, Check, ChevronsUpDown } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc, increment, serverTimestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import type { StockItem } from '@/lib/types';

const formSchema = z.object({
  itemId: z.string().min(1, 'Selecione um item.'),
  addedQuantity: z.coerce.number().positive('A quantidade deve ser maior que zero.'),
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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemId: '',
      addedQuantity: 0,
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
      if (!selectedItem) throw new Error('Item não encontrado');

      const stockRef = doc(firestore, 'stock', values.itemId);
      
      updateDocumentNonBlocking(stockRef, {
        quantity: increment(values.addedQuantity),
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-primary">
            <ArrowUpCircle className="h-5 w-5" />
            Dar Entrada no Estoque
          </DialogTitle>
          <DialogDescription>Atualize a quantidade de um item que já possui cadastro.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
            
            <FormField
              control={form.control}
              name="addedQuantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantidade de Entrada</FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        placeholder="Ex: 10" 
                        {...field} 
                        className="text-lg font-bold"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
