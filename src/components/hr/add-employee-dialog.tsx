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
import { Loader2, CalendarIcon, UserPlus, Eye, EyeOff } from 'lucide-react';
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
import { useFirestore, useUser } from '@/firebase';
import { collection, Timestamp, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { defaultPermissions } from '@/lib/data';
import type { UserProfile, WorkSchedule } from '@/lib/types';

const formSchema = z.object({
  fullName: z.string().min(3, 'O nome deve ter pelo menos 3 caracteres.'),
  cpf: z.string().min(11, 'CPF inválido.').max(14, 'CPF inválido.'),
  email: z.string().email('Email inválido.'),
  tempPassword: z.string().min(6, 'A senha temporária deve ter pelo menos 6 caracteres.'),
  phone: z.string().optional(),
  position: z.string().min(2, 'Cargo é obrigatório.'),
  department: z.string().optional(),
  hireDate: z.date().optional(),
  status: z.enum(['active', 'inactive', 'on_leave'] as const),
  regimeType: z.enum(['CLT', 'PJ', 'intern', 'other'] as const),
  overtimePolicy: z.enum(['overtime', 'time_bank'] as const),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_SCHEDULE_5X2: WorkSchedule = {
  type: '5x2',
  days: {
    1: { workDay: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    2: { workDay: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    3: { workDay: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    4: { workDay: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    5: { workDay: true, start: '08:00', end: '18:00', lunchStart: '12:00', lunchEnd: '13:00' },
    6: { workDay: false, start: '', end: '', lunchStart: '', lunchEnd: '' },
    0: { workDay: false, start: '', end: '', lunchStart: '', lunchEnd: '' },
  }
};

export function AddEmployeeDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const [showPassword, setShowPassword] = useState(false);
  const [hireDateInput, setHireDateInput] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      cpf: '',
      email: '',
      tempPassword: '',
      phone: '',
      position: '',
      department: '',
      status: 'active',
      regimeType: 'CLT',
      overtimePolicy: 'overtime',
    },
  });

  const hireDateValue = form.watch("hireDate");

  useEffect(() => {
    if (!open) {
      form.reset();
      setShowPassword(false);
      setHireDateInput("");
    }
  }, [open, form]);

  useEffect(() => {
    if (hireDateValue) {
      setHireDateInput(format(hireDateValue, "dd/MM/yyyy"));
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
    if (!adminUser || !firestore) return;

    try {
      const mainApp = getApp();
      const config = mainApp.options;
      const secondaryApp = getApps().find(app => app.name === 'secondary') || initializeApp(config, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.tempPassword);
      const newUser = userCredential.user;

      await updateProfile(newUser, { 
        displayName: values.fullName,
        photoURL: 'https://firebasestorage.googleapis.com/v0/b/clinicflow-api-banc-3871-3813b.appspot.com/o/uploads%2FjZm8ue98mEO7A0GSDTmExq8HYD82%2Fsimbolo_semfundo_verdeclaro.png?alt=media'
      });

      const userProfile: UserProfile = {
        uid: newUser.uid,
        displayName: values.fullName,
        email: values.email,
        role: 'user',
        status: 'active',
        createdAt: serverTimestamp() as any,
        permissions: defaultPermissions.user,
        mustChangePassword: true,
      };
      
      await setDoc(doc(firestore, 'users', newUser.uid), userProfile);

      const employeeData = {
        id: newUser.uid,
        fullName: values.fullName,
        cpf: values.cpf,
        email: values.email,
        phone: values.phone || '',
        position: values.position,
        department: values.department || '',
        status: values.status,
        regimeType: values.regimeType,
        overtimePolicy: values.overtimePolicy,
        workSchedule: DEFAULT_SCHEDULE_5X2, // Escala padrão Seg-Sex
        userId: adminUser.uid,
        hireDate: values.hireDate ? Timestamp.fromDate(values.hireDate) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(firestore, 'employees', newUser.uid), employeeData);

      await signOut(secondaryAuth);

      toast({ 
        title: 'Funcionário Cadastrado', 
        description: `${values.fullName} foi adicionado. Defina a escala detalhada na aba Gestão de Horários.` 
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error(error);
      let message = 'Erro ao criar conta.';
      if (error.code === 'auth/email-already-in-use') message = 'E-mail já em uso.';
      toast({ variant: 'destructive', title: 'Falha no Cadastro', description: message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Cadastrar Funcionário</DialogTitle>
          <DialogDescription>
            Ao salvar, uma conta de acesso será criada. A escala padrão é 5x2 (08h-18h).
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl><Input placeholder="Ex: Maria Oliveira" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail (Login)</FormLabel>
                    <FormControl><Input placeholder="email@exemplo.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tempPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Temporária</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} {...field} />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 py-2" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl><Input placeholder="Ex: Recepcionista" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="Ex: Administrativo" {...field} /></FormControl>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="overtime">Hora Extra (+50%/+100%)</SelectItem>
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
                        <Input placeholder="DD/MM/AAAA" value={hireDateInput} onChange={handleDateInputChange} className="flex-1" />
                      </FormControl>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon"><CalendarIcon className="h-4 w-4 opacity-50" /></Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                          <Calendar mode="single" selected={field.value} onSelect={(date) => { field.onChange(date); if (date) setHireDateInput(format(date, "dd/MM/yyyy")); }} initialFocus locale={ptBR} />
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
                    <FormLabel>Status Inicial</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                Cadastrar Funcionário
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
