
'use client';

import { useEffect } from 'react';
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
import { Loader2, ArrowDownCircle, Hash, Truck, Box } from 'lucide-react';
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
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { increment, serverTimestamp, doc } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

const formSchema = z.object({
  outQuantity: z.coerce.number().positive('A quantidade deve ser maior que zero.'),
  reason: z.string().min(3, 'Informe o motivo da saída.'),
});

type FormValues = z.infer<typeof formSchema>;

export function StockOutDialog({ 
  open, 
  onOpenChange, 
  initialItem 
}: { 
  open: boolean, 
  onOpenChange: (open: boolean) => void,
  initialItem: any | null
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { outQuantity: 0, reason: 'Uso em Procedimento' },
  });

  useEffect(() => {
    if (open) form.reset({ outQuantity: 0, reason: 'Uso em Procedimento' });
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore || !initialItem) return;
    if (values.outQuantity > initialItem.quantity) {
        toast({ variant: 'destructive', title: 'Saldo Insuficiente', description: 'Quantidade maior que o disponível no lote.' });
        return;
    }
    try {
      updateDocumentNonBlocking(doc(firestore, 'stock', initialItem.id), {
        quantity: increment(-values.outQuantity),
        updatedAt: serverTimestamp(),
        updatedBy: user.displayName || 'Usuário',
      });
      toast({ title: 'Baixa Realizada', description: `Retirado ${values.outQuantity} de ${initialItem.name} do lote ${initialItem.batch}.` });
      onOpenChange(false);
    } catch (e) { toast({ variant: 'destructive', title: 'Erro na Baixa' }); }
  };

  if (!initialItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2"><ArrowDownCircle className="h-5 w-5" /> Registrar Saída do Lote</DialogTitle>
          <DialogDescription>A baixa será aplicada especificamente no lote e fornecedor abaixo.</DialogDescription>
        </DialogHeader>
        <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm border">
            <div className="flex justify-between items-start">
                <span className="font-bold text-base">{initialItem.name}</span>
                <Badge variant="outline" className="font-mono">{initialItem.code}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5 text-muted-foreground" /> <b>Lote:</b> {initialItem.batch}</div>
                <div className="flex items-center gap-1.5"><Truck className="h-3.5 w-3.5 text-muted-foreground" /> <b>Fornecedor:</b> {initialItem.supplier}</div>
                <div className="flex items-center gap-1.5"><Box className="h-3.5 w-3.5 text-muted-foreground" /> <b>Local:</b> {initialItem.locationName}</div>
                <div className="flex items-center gap-1.5 text-primary"><b>Saldo Disponível:</b> {initialItem.quantity} {initialItem.unit}</div>
            </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="outQuantity" render={({ field }) => (
                <FormItem><FormLabel>Quantidade de Saída ({initialItem.unit})</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="reason" render={({ field }) => (
                <FormItem><FormLabel>Motivo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter className="pt-2"><Button type="submit" variant="destructive" className="w-full">Confirmar Baixa do Lote</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
