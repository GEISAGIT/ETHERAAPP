
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
import { Loader2, MapPin, Box } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import type { StorageLocation } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, 'O nome do local é obrigatório (ex: Sala 1).'),
  description: z.string().min(2, 'A descrição é obrigatória (ex: Armário A, Gaveta 2).'),
});

type FormValues = z.infer<typeof formSchema>;

interface AddAddressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingAddress?: StorageLocation | null;
}

export function AddAddressDialog({ open, onOpenChange, editingAddress }: AddAddressDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (editingAddress && open) {
      form.reset({
        name: editingAddress.name,
        description: editingAddress.description || '',
      });
    } else if (!open) {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [editingAddress, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) return;

    try {
      const locationData = {
        ...values,
        userId: user.uid,
        updatedAt: serverTimestamp(),
      };

      if (editingAddress) {
        updateDocumentNonBlocking(doc(firestore, 'storageLocations', editingAddress.id), locationData);
        toast({ title: 'Local Atualizado' });
      } else {
        const newData = {
            ...locationData,
            createdAt: serverTimestamp(),
        };
        addDocumentNonBlocking(collection(firestore, 'storageLocations'), newData);
        toast({ title: 'Local Cadastrado', description: `O local "${values.name}" foi salvo.` });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: 'Não foi possível salvar o local.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-primary">
            <Box className="h-5 w-5" />
            {editingAddress ? 'Editar Local' : 'Novo Local de Armazenamento'}
          </DialogTitle>
          <DialogDescription>Defina onde os itens de suprimento serão guardados.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Local (Principal)</FormLabel>
                  <FormControl><Input placeholder="Ex: Sala 1, Almoxarifado Central" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalhamento (Sub-local)</FormLabel>
                  <FormControl><Input placeholder="Ex: Armário A, Gaveta 2, Prateleira Superior" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAddress ? 'Salvar Alterações' : 'Cadastrar Local'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
