
'use client';

import { useEffect, useState } from 'react';
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
import { Loader2, CalendarIcon } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking, useFirestore } from '@/firebase';
import { doc, Timestamp, serverTimestamp } from 'firebase/firestore';
import type { Employee } from '@/lib/types';

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  cpf: z.string().min(11, 'CPF inválido.').max(14, 'CPF inválido.'),
  email: z.string().email('Email inválido.').optional().or(z.literal('')),
  phone: z.string().optional(),
  position: z.string().min(2, 'Cargo é obrigatório.'),
  department: z.string().optional(),
  hireDate: z.date().optional(),
  status: z.enum(['active', 'inactive', 'on_leave'] as const),
  regimeType: z.enum(['CLT', 'PJ', 'intern', 'other'] as const),
  overtimePolicy: z.enum(['overtime', 'time_bank'] as const),
});

type FormValues = z.infer<typeof formSchema>;

export function EditEmployeeDialog({ open, onOpenChange, employee }: { open: boolean, onOpenChange: (open: boolean) => void, employee: Employee | null }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [hireDateInput, setHireDateInput] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const hireDateValue = form.watch("hireDate");

  useEffect(() => {
    if (employee && open) {
      form.reset({
        fullName: employee.fullName,
        cpf: employee.cpf,
        email: employee.email || '',
        phone: employee.phone || '',
        position: employee.position || '',
        department: employee.department || '',
        hireDate: employee.hireDate ? employee.hireDate.toDate() : undefined,
        status: employee.status,
        regimeType: employee.regimeType || 'CLT',
        overtimePolicy: employee.overtimePolicy || 'overtime',
      });
    }
  }, [employee, open, form]);

  useEffect(() => {
    if (hireDateValue) {
      setHireDateInput(format(hireDateValue, "dd/MM/yyyy"));
    } else {
      setHireDateInput("");
    }
  }, [hireDateValue]);

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setHireDateInput(val);
    
    const parts = val.split("/");
    if (parts.length === 3 && parts[2].length === 4) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const date = new Date(y, m, d);
      if (!isNaN(date.getTime()) && y > 1900 && d === date.getDate()) {
        form.setValue("hireDate", date, { shouldValidate: true });
      }
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!employee || !firestore) return;

    const docRef = doc(firestore, 'employees', employee.id);
    updateDocumentNonBlocking(docRef, {
      ...values,
      hireDate: values.hireDate ? Timestamp.fromDate(values.hireDate) : null,
      updatedAt: serverTimestamp(),
    });
    
    toast({ title: 'Funcionário Atualizado', description: 'As alterações foram salvas com sucesso.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Editar Funcionário</DialogTitle>
          <DialogDescription>Atualize os dados cadastrais do colaborador.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Departamento</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="regimeType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Regime</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                        <SelectItem value="intern">Estagiário</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="overtimePolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Compensação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="overtime">Hora Extra</SelectItem>
                        <SelectItem value="time_bank">Banco de Horas</SelectItem>
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
                name="hireDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col pt-2">
                    <FormLabel>Data de Contratação</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input 
                          placeholder="DD/MM/AAAA"
                          value={hireDateInput}
                          onChange={handleDateInputChange}
                          className="flex-1"
                        />
                      </FormControl>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="shrink-0">
                            <CalendarIcon className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar 
                            mode="single" 
                            selected={field.value} 
                            onSelect={(date) => {
                              field.onChange(date);
                              if (date) setHireDateInput(format(date, "dd/MM/yyyy"));
                            }} 
                            initialFocus 
                            locale={ptBR} 
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                        <SelectItem value="on_leave">Afastado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
