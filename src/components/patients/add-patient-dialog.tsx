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
} from '@/components/ui/dialog';
import { Loader2, UserRound, MapPin, ShieldCheck, HeartPulse, CalendarIcon, Phone, AlertCircle } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { useFirestore, useUser, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, doc, Timestamp } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Patient, PatientStatus, Gender, BloodType } from '@/lib/types';

const formSchema = z.object({
  fullName: z.string().min(3, 'Nome completo é obrigatório.'),
  cpf: z.string().min(11, 'CPF inválido.').max(14, 'CPF inválido.'),
  rg: z.string().optional(),
  birthDate: z.date({ required_error: 'Data de nascimento é obrigatória.' }),
  gender: z.enum(['male', 'female', 'other', 'not_informed'] as const),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const).optional(),
  motherName: z.string().optional(),
  email: z.string().email('E-mail inválido.').optional().or(z.literal('')),
  phone: z.string().min(10, 'Telefone obrigatório.'),
  // Address
  zipCode: z.string().min(8, 'CEP inválido.'),
  street: z.string().min(3, 'Rua é obrigatória.'),
  number: z.string().min(1, 'Número é obrigatório.'),
  complement: z.string().optional(),
  district: z.string().min(2, 'Bairro é obrigatório.'),
  city: z.string().min(2, 'Cidade é obrigatória.'),
  state: z.string().length(2, 'UF deve ter 2 letras.'),
  // Clinical
  allergies: z.string().optional(),
  chronicConditions: z.string().optional(),
  clinicalNotes: z.string().optional(),
  // Insurance
  insuranceProvider: z.string().optional(),
  insurancePlan: z.string().optional(),
  insuranceCardNumber: z.string().optional(),
  insuranceExpiration: z.date().optional(),
  // Emergency
  emergencyName: z.string().optional(),
  emergencyRelation: z.string().optional(),
  emergencyPhone: z.string().optional(),
  status: z.enum(['active', 'inactive', 'death'] as const),
});

type FormValues = z.infer<typeof formSchema>;

export function AddPatientDialog({ open, onOpenChange, patient }: { open: boolean, onOpenChange: (open: boolean) => void, patient: Patient | null }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('basic');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      cpf: '',
      gender: 'not_informed',
      status: 'active',
      phone: '',
      zipCode: '',
      street: '',
      number: '',
      district: '',
      city: '',
      state: 'SP',
    },
  });

  useEffect(() => {
    if (patient && open) {
      form.reset({
        fullName: patient.fullName,
        cpf: patient.cpf,
        rg: patient.rg || '',
        birthDate: patient.birthDate.toDate(),
        gender: patient.gender,
        bloodType: patient.bloodType,
        motherName: patient.motherName || '',
        email: patient.email || '',
        phone: patient.phone,
        zipCode: patient.address.zipCode,
        street: patient.address.street,
        number: patient.address.number,
        complement: patient.address.complement || '',
        district: patient.address.district,
        city: patient.address.city,
        state: patient.address.state,
        allergies: patient.allergies || '',
        chronicConditions: patient.chronicConditions || '',
        clinicalNotes: patient.clinicalNotes || '',
        insuranceProvider: patient.insurance?.provider || '',
        insurancePlan: patient.insurance?.plan || '',
        insuranceCardNumber: patient.insurance?.cardNumber || '',
        insuranceExpiration: patient.insurance?.expirationDate?.toDate(),
        emergencyName: patient.emergencyContact?.name || '',
        emergencyRelation: patient.emergencyContact?.relation || '',
        emergencyPhone: patient.emergencyContact?.phone || '',
        status: patient.status,
      });
    } else if (!open) {
      form.reset();
      setActiveTab('basic');
    }
  }, [patient, open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!user || !firestore) return;

    const patientData = {
      fullName: values.fullName,
      cpf: values.cpf,
      rg: values.rg,
      birthDate: Timestamp.fromDate(values.birthDate),
      gender: values.gender,
      bloodType: values.bloodType,
      motherName: values.motherName,
      email: values.email,
      phone: values.phone,
      address: {
        zipCode: values.zipCode,
        street: values.street,
        number: values.number,
        complement: values.complement,
        district: values.district,
        city: values.city,
        state: values.state,
      },
      allergies: values.allergies,
      chronicConditions: values.chronicConditions,
      clinicalNotes: values.clinicalNotes,
      insurance: {
        provider: values.insuranceProvider,
        plan: values.insurancePlan,
        cardNumber: values.insuranceCardNumber,
        expirationDate: values.insuranceExpiration ? Timestamp.fromDate(values.insuranceExpiration) : null,
      },
      emergencyContact: {
        name: values.emergencyName,
        relation: values.emergencyRelation,
        phone: values.emergencyPhone,
      },
      status: values.status,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    };

    try {
      if (patient) {
        updateDocumentNonBlocking(doc(firestore, 'patients', patient.id), patientData);
        toast({ title: 'Prontuário Atualizado' });
      } else {
        const newData = {
          ...patientData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        };
        addDocumentNonBlocking(collection(firestore, 'patients'), newData);
        toast({ title: 'Paciente Cadastrado', description: `${values.fullName} foi adicionado ao sistema.` });
      }
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-primary">
            <UserRound className="h-5 w-5" />
            {patient ? 'Editar Prontuário' : 'Novo Cadastro de Paciente'}
          </DialogTitle>
          <DialogDescription>Preencha os dados seguindo os padrões de prontuário eletrônico.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1 overflow-y-auto px-1">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="basic" className="gap-2"><UserRound className="h-4 w-4" /> Identificação</TabsTrigger>
                <TabsTrigger value="address" className="gap-2"><MapPin className="h-4 w-4" /> Endereço</TabsTrigger>
                <TabsTrigger value="clinical" className="gap-2"><HeartPulse className="h-4 w-4" /> Clínico</TabsTrigger>
                <TabsTrigger value="insurance" className="gap-2"><ShieldCheck className="h-4 w-4" /> Convênio</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 animate-in fade-in slide-in-from-left-2">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Ex: João da Silva Santos" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="cpf" render={({ field }) => (
                    <FormItem><FormLabel>CPF</FormLabel><FormControl><Input placeholder="000.000.000-00" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="rg" render={({ field }) => (
                    <FormItem><FormLabel>RG</FormLabel><FormControl><Input placeholder="00.000.000-0" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="birthDate" render={({ field }) => (
                    <FormItem className="flex flex-col mt-2">
                      <FormLabel>Data de Nascimento</FormLabel>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>DD/MM/AAAA</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="gender" render={({ field }) => (
                    <FormItem><FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="male">Masculino</SelectItem><SelectItem value="female">Feminino</SelectItem><SelectItem value="other">Outro</SelectItem><SelectItem value="not_informed">Não Informado</SelectItem></SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="bloodType" render={({ field }) => (
                    <FormItem><FormLabel>Tipo Sanguíneo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                        <SelectContent>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Telefone / WhatsApp</FormLabel><FormControl><Input placeholder="(00) 00000-0000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input placeholder="paciente@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="motherName" render={({ field }) => (
                  <FormItem><FormLabel>Nome da Mãe</FormLabel><FormControl><Input placeholder="Filiação" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </TabsContent>

              <TabsContent value="address" className="space-y-4 animate-in fade-in slide-in-from-left-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="zipCode" render={({ field }) => (
                    <FormItem><FormLabel>CEP</FormLabel><FormControl><Input placeholder="00000-000" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="md:col-span-2">
                    <FormField control={form.control} name="street" render={({ field }) => (
                      <FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input placeholder="Rua, Avenida, etc." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="number" render={({ field }) => (
                    <FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="md:col-span-2">
                    <FormField control={form.control} name="complement" render={({ field }) => (
                      <FormItem><FormLabel>Complemento</FormLabel><FormControl><Input placeholder="Apto, Bloco, etc." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="district" render={({ field }) => (
                    <FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem><FormLabel>Estado (UF)</FormLabel><FormControl><Input maxLength={2} className="uppercase" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="clinical" className="space-y-4 animate-in fade-in slide-in-from-left-2">
                <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 p-4 flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-3 flex-1">
                        <FormField control={form.control} name="allergies" render={({ field }) => (
                            <FormItem><FormLabel className="text-red-800 font-bold">ALERGIAS (CRÍTICO)</FormLabel><FormControl><Textarea className="bg-white/50" placeholder="Informe alergias a medicamentos ou alimentos..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                </div>
                <FormField control={form.control} name="chronicConditions" render={({ field }) => (
                  <FormItem><FormLabel>Condições Crônicas / Patologias</FormLabel><FormControl><Textarea placeholder="Diabetes, Hipertensão, etc." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="clinicalNotes" render={({ field }) => (
                  <FormItem><FormLabel>Observações Clínicas Gerais</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="pt-4 border-t space-y-4">
                    <h4 className="font-bold text-sm uppercase flex items-center gap-2"><Phone className="h-4 w-4" /> Contato de Emergência</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="emergencyName" render={({ field }) => (
                            <FormItem><FormLabel>Nome do Contato</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="emergencyRelation" render={({ field }) => (
                            <FormItem><FormLabel>Parentesco</FormLabel><FormControl><Input placeholder="Esposo(a), Pai, Filho..." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="emergencyPhone" render={({ field }) => (
                            <FormItem><FormLabel>Telefone Emergência</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                </div>
              </TabsContent>

              <TabsContent value="insurance" className="space-y-4 animate-in fade-in slide-in-from-left-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="insuranceProvider" render={({ field }) => (
                    <FormItem><FormLabel>Operadora / Convênio</FormLabel><FormControl><Input placeholder="Ex: Unimed, Bradesco, Cassi..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="insurancePlan" render={({ field }) => (
                    <FormItem><FormLabel>Plano</FormLabel><FormControl><Input placeholder="Ex: Ouro, Premium, Empresarial..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="insuranceCardNumber" render={({ field }) => (
                    <FormItem><FormLabel>Número da Carteirinha</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="insuranceExpiration" render={({ field }) => (
                    <FormItem className="flex flex-col mt-2">
                      <FormLabel>Validade</FormLabel>
                      <Popover modal>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yyyy") : <span>DD/MM/AAAA</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem className="pt-4"><FormLabel>Status do Cadastro</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent><SelectItem value="active">Ativo (Em atendimento)</SelectItem><SelectItem value="inactive">Inativo (Sem visitas recentes)</SelectItem><SelectItem value="death">Óbito</SelectItem></SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-6 border-t">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {patient ? 'Salvar Alterações' : 'Finalizar Cadastro'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
