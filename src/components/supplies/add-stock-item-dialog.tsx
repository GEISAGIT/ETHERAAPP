'use client';

import { useEffect, useMemo } from 'react';
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
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query } from 'firebase/firestore';
import type { StockCategory } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, 'O nome do item é obrigatório.'),
  category: z.string().min(1, 'Selecione uma categoria.'),
  subCategory: z.string().optional(),
  derivation: z.string().optional(),
  quantity: z.coerce.number().min(0, 'A quantidade não pode ser negativa.'),
  minQuantity: z.coerce.number().min(0, 'A quantidade mínima não pode ser negativa.'),
  unit: z.string().min(1, 'Unidade é obrigatória.'),
});

type FormValues = z.infer<typeof formSchema>;

export function AddStockItemDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  // Buscar categorias de suprimentos
  const categoriesQuery = useMemoFirebase(() => {
    if (!firestore || !open) return null;
    return query(collection(firestore, 'stockCategories'));
  }, [firestore, open]);

  const { data: categories } = useCollection<StockCategory>(categoriesQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      subCategory: '',
      derivation: '',
      quantity: 0,
      minQuantity: 5,
      unit: 'un',
    },
  });

  const selectedCategoryName = useWatch({ control: form.control, name: 'category' });
  const selectedSubCategoryName = useWatch({ control: form.control, name: 'subCategory' });

  const currentCategory = useMemo(() => 
    categories?.find(c => c.name === selectedCategoryName)
  , [categories, selectedCategoryName]);

  const currentSubCategory = useMemo(() => 
    currentCategory?.subCategories?.find(s => s.name === selectedSubCategoryName)
  , [currentCategory, selectedSubCategoryName]);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  // Reset dependent fields when category changes
  useEffect(() => {
    form.setValue('subCategory', '');
    form.setValue('derivation', '');
  }, [selectedCategoryName, form]);

  // Reset dependent field when subcategory changes
  useEffect(() => {
    form.setValue('derivation', '');
  }, [selectedSubCategoryName, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) return;

    try {
      const stockData = {
        ...values,
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'Usuário',
        lastRestock: serverTimestamp(),
        locationId: '',
        locationName: '',
        batch: '',
        manufacturingDate: null,
        expiryDate: null,
      };

      addDocumentNonBlocking(collection(firestore, 'stock'), stockData);
      
      toast({ title: 'Item Cadastrado', description: `${values.name} foi adicionado ao sistema.` });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao Adicionar', description: 'Não foi possível salvar o item.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-primary">
            <PlusCircle className="h-5 w-5" />
            Cadastrar Novo Item
          </DialogTitle>
          <DialogDescription>Identifique o produto para iniciar o controle de estoque.</DialogDescription>
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
                  <FormLabel>Categoria Principal</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {categories?.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="subCategory"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Subcategoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategoryName}>
                        <FormControl><SelectTrigger><SelectValue placeholder="---" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {currentCategory?.subCategories?.map(sub => (
                            <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="derivation"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Derivação / Opção</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={!selectedSubCategoryName}>
                        <FormControl><SelectTrigger><SelectValue placeholder="---" /></SelectTrigger></FormControl>
                        <SelectContent>
                        {currentSubCategory?.options?.map(opt => (
                            <SelectItem key={opt.id} value={opt.name}>{opt.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Saldo Inicial</FormLabel>
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
                Cadastrar Item
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
