'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { Loader2, CalendarIcon, User, Search, Check, ChevronsUpDown, Clock } from 'lucide-react';
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
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { format, addHours, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import type { Patient, UserManagement } from '@/lib/types';

const formSchema = z.object({
  patientId: z.string().min(1, 'Selecione um paciente.'),
  professionalId: z.string().min(1, 'Selecione o profissional.'),
  serviceName: z.string().min(2, 'O serviço é obrigatório.'),
  date: z.date({ required_error: 'A data é obrigatória.' }),
  startTime: z.string().min(5, 'Hora de início obrigatória.'),
  endTime: z.string().min(5, 'Hora de término obrigatória.'),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddAppointmentDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);

  // Queries
  const patientsQuery = useMemoFirebase(() => {
    if (!firestore || !open) return null;
    return query(collection(firestore, 'patients'), orderBy('fullName', 'asc'));
  }, [firestore, open]);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !open) return null;
    return query(collection(firestore, 'users'), orderBy('displayName', 'asc'));
  }, [firestore, open]);

  const { data: patients } = useCollection<Patient>(patientsQuery);
  const { data: users } = useCollection<UserManagement>(usersQuery);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: '',
      professionalId: '',
      serviceName: '',
      date: new Date(),
      startTime: '08:00',
      endTime: '09:00',
      notes: '',
    },
  });

  const selectedPatientId = useWatch({ control: form.control, name: 'patientId' });
  const selectedDate = useWatch({ control: form.control, name: 'date' });

  useEffect(() => {
    if (!open) form.reset();
  }, [open, form]);

  const onSubmit = async (values: FormValues) => {
    if (!currentUser || !firestore) return;

    try {
      const selectedPatient = patients?.find(p => p.id === values.patientId);
      const selectedProfessional = users?.find(u => u.uid === values.professionalId);

      const [startH, startM] = values.startTime.split(':').map(Number);
      const [endH, endM] = values.endTime.split(':').map(Number);

      const startTime = setMinutes(setHours(values.date, startH), startM);
      const endTime = setMinutes(setHours(values.date, endH), endM);

      const appointmentData = {
        patientId: values.patientId,
        patientName: selectedPatient?.fullName || 'Paciente',
        patientPhone: selectedPatient?.phone || '',
        professionalId: values.professionalId,
        professionalName: selectedProfessional?.displayName || 'Profissional',
        serviceName: values.serviceName,
        startTime: Timestamp.fromDate(startTime),
        endTime: Timestamp.fromDate(endTime),
        status: 'scheduled',
        notes: values.notes || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser.uid,
      };

      addDocumentNonBlocking(collection(firestore, 'appointments'), appointmentData);
      
      toast({ title: 'Agendamento Realizado', description: `Consulta marcada para ${selectedPatient?.fullName}.` });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao Agendar' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2 text-primary">
            <CalendarIcon className="h-5 w-5" />
            Novo Agendamento
          </DialogTitle>
          <DialogDescription>Reserve um horário para atendimento.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Paciente</FormLabel>
                  <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? patients?.find(p => p.id === field.value)?.fullName : "Pesquisar paciente..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Nome ou CPF..." />
                        <CommandList>
                          <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {patients?.map((p) => (
                              <CommandItem
                                value={p.fullName}
                                key={p.id}
                                onSelect={() => { form.setValue("patientId", p.id); setPatientSearchOpen(false); }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{p.fullName}</span>
                                  <span className="text-[10px] text-muted-foreground">{p.cpf}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="professionalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional / Executor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      {users?.map(u => (
                        <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="serviceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviço / Procedimento</FormLabel>
                  <FormControl><Input placeholder="Ex: Consulta Médica, RPG, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data</FormLabel>
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "dd/MM/yy") : <span>Selecione</span>}
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
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Término</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Internas</FormLabel>
                  <FormControl><Textarea placeholder="Queixa principal ou recados..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Agendamento
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
