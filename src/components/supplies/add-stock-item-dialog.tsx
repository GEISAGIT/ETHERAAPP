
'use client';

import { useState } from 'react';
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
import { Loader2, PlusCircle } from 'lucide-react';
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
import { useFirestore, useUser, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(2, 'O nome do item é obrigatório.'),
  category: z.string().min(1, 'Selecione uma categoria.'),
  quantity: z.coerce.number().min(0, 'A quantidade não pode ser negativa.'),
  minQuantity: z.coerce.number().min(0, 'A quantidade mínima não pode ser negativa.'),
  unit: z.string().min(1, 'Unidade é obrigatória.'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddStockItemDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      quantity: 0,
      minQuantity: 5,
      unit: 'un',
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) return;

    try {
      const stockData = {
        ...values,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'Usuário',
        lastRestock: serverTimestamp(),
      };

      addDocumentNonBlocking(collection(firestore, 'stock'), stockData);
      
      toast({ title: 'Item Adicionado', description: `${values.name} foi adicionado ao estoque.` });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao Adicionar', description: 'Não foi possível salvar o item.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Adicionar Item ao Estoque</DialogTitle>
          <DialogDescription>Cadastre um novo material ou suprimento.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Item</FormLabel>
                  <FormControl><Input placeholder="Ex: Luvas de Látex (M)" {...field} /></FormControl>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Materiais Médicos">Materiais Médicos</SelectItem>
                      <SelectItem value="Medicamentos">Medicamentos</SelectItem>
                      <SelectItem value="Escritório">Escritório</SelectItem>
                      <SelectItem value="Limpeza">Limpeza</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade Inicial</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque Mínimo</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidade de Medida</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="un">Unidade (un)</SelectItem>
                      <SelectItem value="cx">Caixa (cx)</SelectItem>
                      <SelectItem value="ml">Mililitros (ml)</SelectItem>
                      <SelectItem value="pct">Pacote (pct)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
