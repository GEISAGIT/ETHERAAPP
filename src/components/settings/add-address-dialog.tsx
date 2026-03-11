
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
import { Loader2, MapPin, CalendarIcon } from 'lucide-react';
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
import { collection, serverTimestamp, doc, Timestamp } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Address } from '@/lib/types';

const formSchema = z.object({
  label: z.string().min(2, 'O apelido do endereço é obrigatório.'),
  street: z.string().min(3, 'Rua é obrigatória.'),
  number: z.string().min(1, 'Número é obrigatório.'),
  complement: z.string().optional(),
  district: z.string().min(3, 'Bairro é obrigatório.'),
  city: z.string().min(3, 'Cidade é obrigatória.'),
  state: z.string().length(2, 'Estado (UF) deve ter 2 caracteres.'),
  zipCode: z.string().min(8, 'CEP inválido.'),
  validityDate: z.date().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AddAddressDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingAddress?: Address | null;
}

export function AddAddressDialog({ open, onOpenChange, editingAddress }: AddAddressDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: '',
      street: '',
      number: '',
      complement: '',
      district: '',
      city: '',
      state: '',
      zipCode: '',
    },
  });

  useEffect(() => {
    if (editingAddress && open) {
      form.reset({
        label: editingAddress.label,
        street: editingAddress.street,
        number: editingAddress.number,
        complement: editingAddress.complement || '',
        district: editingAddress.district,
        city: editingAddress.city,
        state: editingAddress.state,
        zipCode: editingAddress.zipCode,
        validityDate: editingAddress.validityDate?.toDate(),
      });
    } else if (!open) {
      form.reset({
        label: '',
        street: '',
        number: '',
        complement: '',
        district: '',
        city: '',
        state: '',
        zipCode: '',
      });
    }
  }, [editingAddress, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) return;

    try {
      const addressData = {
        ...values,
        userId: user.uid,
        validityDate: values.validityDate ? Timestamp.fromDate(values.validityDate) : null,
        updatedAt: serverTimestamp(),
      };

      if (editingAddress) {
        updateDocumentNonBlocking(doc(firestore, 'addresses', editingAddress.id), addressData);
        toast({ title: 'Endereço Atualizado' });
      } else {
        const newData = {
            ...addressData,
            createdAt: serverTimestamp(),
        };
        addDocumentNonBlocking(collection(firestore, 'addresses'), newData);
        toast({ title: 'Endereço Cadastrado', description: `O endereço "${values.label}" foi salvo.` });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: 'Não foi possível salvar o endereço.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {editingAddress ? 'Editar Endereço' : 'Cadastrar Novo Endereço'}
          </DialogTitle>
          <DialogDescription>Insira os dados de localização e o prazo de validade.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apelido / Identificação</FormLabel>
                  <FormControl><Input placeholder="Ex: Sede Principal, Casa, Filial" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl><Input placeholder="00000-000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rua / Logradouro</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="complement"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Complemento</FormLabel>
                    <FormControl><Input placeholder="Apto, Sala, Loja" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="district"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado (UF)</FormLabel>
                    <FormControl><Input maxLength={2} placeholder="SP" className="uppercase" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="validityDate"
              render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel>Prazo de Validade (Opcional)</FormLabel>
                  <Popover modal>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                          {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione uma data...</span>}
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

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingAddress ? 'Salvar Alterações' : 'Cadastrar Endereço'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
