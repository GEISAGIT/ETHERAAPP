
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
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { defaultPermissions } from '@/lib/data';
import type { UserProfile } from '@/lib/types';

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

export function AddEmployeeDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: adminUser } = useUser();
  const [showPassword, setShowPassword] = useState(false);

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

  useEffect(() => {
    if (!open) {
      form.reset();
      setShowPassword(false);
    }
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!adminUser || !firestore) return;

    try {
      // 1. Initialize a secondary Firebase Auth instance to create the user without logging out the admin
      const secondaryApp = getApps().find(app => app.name === 'secondary') || initializeApp(firebaseConfig, 'secondary');
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, values.email, values.tempPassword);
      const newUser = userCredential.user;

      // 3. Set display name for the new user
      await updateProfile(newUser, { 
        displayName: values.fullName,
        photoURL: 'https://firebasestorage.googleapis.com/v0/b/studio-1445297951-c95ca.firebasestorage.app/o/uploads%2FjZm8ue98mEO7A0GSDTmExq8HYD82%2Fsimbolo_semfundo_verdeclaro.png?alt=media&token=c68144ba-c10e-4921-8fe7-eb791d34eebe'
      });

      // 4. Create the User Profile in Firestore
      const userProfile: UserProfile = {
        uid: newUser.uid,
        displayName: values.fullName,
        email: values.email,
        role: 'user',
        status: 'active',
        createdAt: serverTimestamp() as any,
        permissions: defaultPermissions.user,
        mustChangePassword: true, // Key flag for the password change flow
      };
      await setDoc(doc(firestore, 'users', newUser.uid), userProfile);

      // 5. Create the Employee Record
      const employeeData = {
        id: newUser.uid, // Use same UID for consistency
        fullName: values.fullName,
        cpf: values.cpf,
        email: values.email,
        phone: values.phone || '',
        position: values.position,
        department: values.department || '',
        status: values.status,
        regimeType: values.regimeType,
        overtimePolicy: values.overtimePolicy,
        userId: adminUser.uid, // Admin who created it
        hireDate: values.hireDate ? Timestamp.fromDate(values.hireDate) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(firestore, 'employees', newUser.uid), employeeData);

      // 6. Sign out the secondary instance
      await signOut(secondaryAuth);

      toast({ 
        title: 'Funcionário Cadastrado', 
        description: `${values.fullName} foi adicionado. A senha temporária é: ${values.tempPassword}` 
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao cadastrar funcionário:", error);
      let message = 'Ocorreu um erro ao criar a conta do funcionário.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este e-mail já está em uso por outro usuário.';
      }
      toast({ variant: 'destructive', title: 'Erro no Cadastro', description: message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline">Cadastrar Funcionário</DialogTitle>
          <DialogDescription>
            Ao salvar, uma conta de acesso será criada automaticamente para o funcionário com os dados abaixo.
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
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Senha de acesso" 
                          {...field} 
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
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
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
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
