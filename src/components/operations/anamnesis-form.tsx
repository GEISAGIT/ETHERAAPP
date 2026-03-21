'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  ClipboardList, 
  Save, 
  X, 
  Stethoscope, 
  Pill, 
  Activity, 
  Users,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, Consultation } from '@/lib/types';

const anamnesisSchema = z.object({
  chiefComplaint: z.string().min(3, 'A queixa principal é obrigatória.'),
  historyOfPresentIllness: z.string().min(5, 'A HMA é obrigatória.'),
  pastMedicalHistory: z.string().optional(),
  familyHistory: z.string().optional(),
  socialHistory: z.string().optional(),
  physicalExam: z.string().optional(),
  diagnosis: z.string().min(2, 'O diagnóstico é obrigatório.'),
  prescription: z.string().optional(),
  evolution: z.string().min(5, 'A evolução clínica é obrigatória para o prontuário.'),
});

type AnamnesisValues = z.infer<typeof anamnesisSchema>;

interface AnamnesisFormProps {
  appointment: Appointment;
  onComplete: () => void;
  onCancel: () => void;
}

export function AnamnesisForm({ appointment, onComplete, onCancel }: AnamnesisFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<AnamnesisValues>({
    resolver: zodResolver(anamnesisSchema),
    defaultValues: {
      chiefComplaint: appointment.notes || '',
      historyOfPresentIllness: '',
      pastMedicalHistory: '',
      familyHistory: '',
      socialHistory: '',
      physicalExam: '',
      diagnosis: '',
      prescription: '',
      evolution: '',
    },
  });

  const onSubmit = async (values: AnamnesisValues) => {
    if (!firestore) return;
    setIsSubmitting(true);

    try {
      const consultationData = {
        patientId: appointment.patientId,
        patientName: appointment.patientName,
        appointmentId: appointment.id,
        professionalId: appointment.professionalId,
        professionalName: appointment.professionalName,
        date: Timestamp.now(),
        anamnesis: {
          chiefComplaint: values.chiefComplaint,
          historyOfPresentIllness: values.historyOfPresentIllness,
          pastMedicalHistory: values.pastMedicalHistory || '',
          familyHistory: values.familyHistory || '',
          socialHistory: values.socialHistory || '',
        },
        physicalExam: values.physicalExam || '',
        diagnosis: values.diagnosis,
        prescription: values.prescription || '',
        evolution: values.evolution,
        status: 'completed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 1. Salva a consulta
      await addDocumentNonBlocking(collection(firestore, 'consultations'), consultationData);

      // 2. Finaliza o agendamento
      await updateDocumentNonBlocking(doc(firestore, 'appointments', appointment.id), {
        status: 'finished',
        updatedAt: serverTimestamp()
      });

      toast({ title: 'Atendimento Finalizado', description: 'Prontuário e evolução clínica registrados.' });
      onComplete();
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao Salvar', description: 'Ocorreu um problema ao registrar o atendimento.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in zoom-in-95">
      <Card className="border-primary/20 shadow-lg">
        <CardHeader className="bg-primary/5 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Stethoscope className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="font-headline text-xl">Atendimento: {appointment.patientName}</CardTitle>
                <CardDescription>Preencha os dados clínicos para evolução do prontuário.</CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel}><X className="h-5 w-5" /></Button>
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 p-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Coluna 1: Anamnese Básica */}
              <div className="space-y-6">
                <h3 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" /> Anamnese
                </h3>
                
                <FormField control={form.control} name="chiefComplaint" render={({ field }) => (
                  <FormItem><FormLabel>Queixa Principal</FormLabel><FormControl><Input placeholder="O que o paciente relata?" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="historyOfPresentIllness" render={({ field }) => (
                  <FormItem><FormLabel>HMA (História da Moléstia Atual)</FormLabel><FormControl><Textarea rows={4} placeholder="Detalhamento do início, duração e sintomas..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-1 gap-4">
                  <FormField control={form.control} name="pastMedicalHistory" render={({ field }) => (
                    <FormItem><FormLabel>Histórico Patológico Pregresso</FormLabel><FormControl><Textarea rows={2} placeholder="Cirurgias, doenças prévias, alergias..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="familyHistory" render={({ field }) => (
                    <FormItem><FormLabel>Histórico Familiar</FormLabel><FormControl><Textarea rows={2} placeholder="Doenças hereditárias..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              {/* Coluna 2: Exame e Conduta */}
              <div className="space-y-6">
                <h3 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Exame e Conduta
                </h3>

                <FormField control={form.control} name="physicalExam" render={({ field }) => (
                  <FormItem><FormLabel>Exame Físico / Sinais Vitais</FormLabel><FormControl><Textarea rows={3} placeholder="PA, Peso, Frequência, Inspeção..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="diagnosis" render={({ field }) => (
                  <FormItem><FormLabel>Diagnóstico / Hipótese</FormLabel><FormControl><Input placeholder="Conclusão diagnóstica..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <FormField control={form.control} name="prescription" render={({ field }) => (
                  <FormItem><FormLabel><Pill className="h-3 w-3 inline mr-1" /> Prescrição / Conduta</FormLabel><FormControl><Textarea rows={3} placeholder="Medicamentos, exames solicitados ou orientações..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            {/* Evolução Clínica (Destaque) */}
            <div className="border-t pt-6 bg-muted/20 p-4 rounded-lg">
              <FormField control={form.control} name="evolution" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-primary font-bold">Evolução Clínica do Dia</FormLabel>
                  <FormControl>
                    <Textarea 
                      rows={4} 
                      className="bg-white border-primary/30" 
                      placeholder="Resumo técnico do atendimento que constará na ficha de evolução do paciente..." 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>Este texto será o principal registro histórico para futuras consultas.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Descartar</Button>
              <Button type="submit" className="h-12 px-8" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Finalizar e Salvar Atendimento
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
