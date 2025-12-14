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
import { Loader2, UploadCloud } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, useFirestore, useUser, useStorage } from '@/firebase';
import { collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Contract } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const createFormSchema = (contractType: 'fixed' | 'variable') => {
    return z.object({
        amount: z.coerce.number().positive('O valor deve ser um número positivo.'),
        paymentDate: z.date(),
        receipt: z.instanceof(File).optional(),
    }).refine(data => contractType === 'fixed' || (data.amount > 0), {
        message: "O valor é obrigatório para despesas variáveis.",
        path: ["amount"],
    });
}

type FormValues = z.infer<ReturnType<typeof createFormSchema>>;

interface PayRecurringTransactionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    payment: { contract: Contract; dueDate: Date } | null;
}

const formatCurrency = (value?: number) => {
  if (value === undefined) return 'N/A';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};


export function PayRecurringTransactionDialog({ open, onOpenChange, payment }: PayRecurringTransactionDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();

  const contractType = payment?.contract.type ?? 'fixed';
  const formSchema = createFormSchema(contractType);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      paymentDate: new Date(),
    },
  });

  useEffect(() => {
    if (payment) {
      form.reset({
        paymentDate: new Date(),
        amount: payment.contract.amount,
        receipt: undefined,
      });
    }
  }, [payment, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore || !storage || !payment) {
      toast({ variant: 'destructive', title: 'Erro de sistema' });
      return;
    }
    
    setIsUploading(true);

    let receiptUrl: string | undefined = undefined;
    if (values.receipt) {
        try {
            const receiptRef = ref(storage, `receipts/${user.uid}/${Date.now()}_${values.receipt.name}`);
            const snapshot = await uploadBytes(receiptRef, values.receipt);
            receiptUrl = await getDownloadURL(snapshot.ref);
        } catch (error) {
            console.error("Erro no upload do comprovante:", error);
            toast({
                variant: 'destructive',
                title: 'Erro no Upload',
                description: 'Não foi possível enviar o comprovante. A transação não foi salva.',
            });
            setIsUploading(false);
            return;
        }
    }
    
    const expensesCollection = collection(firestore, 'expenses');
    
    const expenseData: Record<string, any> = {
        userId: user.uid,
        createdByName: user.displayName || 'Usuário',
        date: Timestamp.fromDate(values.paymentDate),
        amount: values.amount,
        description: payment.contract.name,
        type: 'expense' as const,
        costType: payment.contract.type,
        fullCategoryPath: payment.contract.fullCategoryPath,
        category: payment.contract.fullCategoryPath?.category || 'N/A', // Legacy
        notes: `Pagamento recorrente. Vencimento original: ${format(payment.dueDate, 'dd/MM/yyyy')}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
    };

    if (receiptUrl) {
      expenseData.receiptUrl = receiptUrl;
    }

    addDocumentNonBlocking(expensesCollection, expenseData);
    
    toast({
      title: 'Pagamento Registrado!',
      description: `A despesa para "${payment.contract.name}" foi adicionada aos seus lançamentos.`,
    });
    
    setIsUploading(false);
    onOpenChange(false);
  };
  
  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Registrar Pagamento de Contrato</DialogTitle>
          <DialogDescription>
            Confirme os detalhes do pagamento para <span className="font-semibold">{payment.contract.name}</span>.
            Vencimento em {format(payment.dueDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor do Pagamento (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="1500,00" 
                      {...field} 
                      disabled={contractType === 'fixed' || isUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
                control={form.control}
                name="receipt"
                render={({ field: { onChange, value, ...rest }}) => (
                    <FormItem>
                        <FormLabel>Comprovante (Opcional)</FormLabel>
                        <FormControl>
                            <div className="flex items-center gap-2">
                                <label
                                    htmlFor="receipt-upload"
                                    className="flex-1 cursor-pointer items-center gap-2 rounded-md border border-input bg-background p-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                >
                                    <UploadCloud className="mr-2 inline h-4 w-4" />
                                    {value?.name || 'Selecionar arquivo'}
                                </label>
                                <Input 
                                    id="receipt-upload"
                                    type="file" 
                                    className="sr-only"
                                    onChange={e => onChange(e.target.files?.[0])}
                                    {...rest}
                                    disabled={isUploading}
                                />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="ghost" disabled={isUploading}>Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isUploading}>
                {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
