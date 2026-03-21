'use client';

import { useState, useMemo } from 'react';
import type { Appointment, Consultation, UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Stethoscope, 
  History, 
  Search, 
  Play, 
  CheckCircle2, 
  Clock, 
  UserPlus,
  ClipboardList,
  FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { AnamnesisForm } from './anamnesis-form';
import { PatientClinicalRecord } from './patient-clinical-record';

interface ConsultationClientProps {
  appointments: Appointment[];
  consultations: Consultation[];
  userProfile: UserProfile | null | undefined;
}

export function ConsultationClient({ appointments, consultations, userProfile }: ConsultationClientProps) {
  const [activeTab, setActiveTab] = useState('waiting');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [viewingPatientId, setViewingPatientId] = useState<string | null>(null);
  
  const firestore = useFirestore();
  const { toast } = useToast();

  const waitingPatients = useMemo(() => {
    return appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'arrived');
  }, [appointments]);

  const inProgressPatients = useMemo(() => {
    return appointments.filter(a => a.status === 'in_progress');
  }, [appointments]);

  const handleCheckIn = (appointmentId: string) => {
    if (!firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'appointments', appointmentId), {
      status: 'arrived',
      updatedAt: serverTimestamp()
    });
    toast({ title: 'Check-in Realizado', description: 'Paciente marcado como presente.' });
  };

  const handleStartConsultation = (appointment: Appointment) => {
    if (!firestore) return;
    updateDocumentNonBlocking(doc(firestore, 'appointments', appointment.id), {
      status: 'in_progress',
      updatedAt: serverTimestamp()
    });
    setSelectedAppointment(appointment);
    setActiveTab('active-call');
    toast({ title: 'Atendimento Iniciado', description: `Iniciando consulta para ${appointment.patientName}.` });
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Atendimento Clínico</h1>
        <p className="text-muted-foreground">Gerencie o fluxo de pacientes, anamnese e histórico clínico.</p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-8">
          <TabsTrigger value="waiting" className="gap-2">
            <Users className="h-4 w-4" /> Recepção / Fila
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{waitingPatients.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="active-call" className="gap-2">
            <Stethoscope className="h-4 w-4" /> Consultório
            <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{inProgressPatients.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="records" className="gap-2">
            <FileText className="h-4 w-4" /> Prontuários
          </TabsTrigger>
        </TabsList>

        {/* ABA: RECEPÇÃO / FILA */}
        <TabsContent value="waiting" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" /> Pacientes para Hoje
              </CardTitle>
              <CardDescription>Confirme a chegada dos pacientes para iniciar o fluxo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {waitingPatients.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground italic">
                    Nenhum paciente aguardando ou agendado para este período.
                  </div>
                ) : (
                  waitingPatients.map((app) => (
                    <div key={app.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "p-2.5 rounded-full",
                          app.status === 'arrived' ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
                        )}>
                          <Clock className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-base">{app.patientName}</span>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-medium text-primary uppercase">{format(app.startTime.toDate(), 'HH:mm')}</span>
                            <span className="bullet">•</span>
                            <span>{app.serviceName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={cn(
                          "uppercase font-bold text-[10px]",
                          app.status === 'arrived' ? "text-emerald-600 border-emerald-200" : "text-blue-600 border-blue-200"
                        )}>
                          {app.status === 'arrived' ? 'Presente' : 'Agendado'}
                        </Badge>
                        {app.status !== 'arrived' ? (
                          <Button size="sm" onClick={() => handleCheckIn(app.id)}>Confirmar Chegada</Button>
                        ) : (
                          <Button size="sm" variant="default" className="bg-amber-600 hover:bg-amber-700" onClick={() => handleStartConsultation(app)}>
                            <Play className="mr-2 h-3.5 w-3.5" /> Chamar Paciente
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: CONSULTÓRIO (ATENDIMENTO ATIVO) */}
        <TabsContent value="active-call" className="space-y-6">
          {selectedAppointment ? (
            <AnamnesisForm 
              appointment={selectedAppointment} 
              onComplete={() => {
                setSelectedAppointment(null);
                setActiveTab('history');
              }}
              onCancel={() => setSelectedAppointment(null)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle>Nenhum paciente selecionado</CardTitle>
                  <CardDescription>Selecione um paciente na aba "Recepção" para iniciar a anamnese.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-10">
                  <Stethoscope className="h-20 w-20 text-primary/20" />
                </CardContent>
              </Card>
              
              {inProgressPatients.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Atendimentos em Aberto</CardTitle>
                    <CardDescription>Retome uma consulta que já foi iniciada.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {inProgressPatients.map(app => (
                      <Button key={app.id} variant="outline" className="w-full justify-between h-auto py-3 px-4" onClick={() => setSelectedAppointment(app)}>
                        <div className="text-left">
                          <p className="font-bold">{app.patientName}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">{app.serviceName}</p>
                        </div>
                        <Play className="h-4 w-4 text-primary" />
                      </Button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ABA: HISTÓRICO DE CONSULTAS */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico Recente de Atendimentos</CardTitle>
              <CardDescription>Consulte as últimas consultas realizadas na clínica.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-y">
                    <tr>
                      <th className="text-left py-3 px-4 font-bold uppercase text-[10px] text-muted-foreground">Data</th>
                      <th className="text-left py-3 px-4 font-bold uppercase text-[10px] text-muted-foreground">Paciente</th>
                      <th className="text-left py-3 px-4 font-bold uppercase text-[10px] text-muted-foreground">Profissional</th>
                      <th className="text-left py-3 px-4 font-bold uppercase text-[10px] text-muted-foreground">Diagnóstico</th>
                      <th className="text-right py-3 px-4 font-bold uppercase text-[10px] text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {consultations.map(cons => (
                      <tr key={cons.id} className="hover:bg-muted/20">
                        <td className="py-3 px-4 font-medium">{format(cons.date.toDate(), 'dd/MM/yy HH:mm')}</td>
                        <td className="py-3 px-4 font-bold">{cons.patientName}</td>
                        <td className="py-3 px-4 text-muted-foreground">{cons.professionalName}</td>
                        <td className="py-3 px-4 italic truncate max-w-[200px]">{cons.diagnosis || 'Não informado'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setViewingPatientId(cons.patientId); setActiveTab('records'); }}>Ver Ficha</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA: PRONTUÁRIOS (FICHA DO PACIENTE) */}
        <TabsContent value="records" className="space-y-6">
          <PatientClinicalRecord 
            patientId={viewingPatientId} 
            consultations={consultations} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
