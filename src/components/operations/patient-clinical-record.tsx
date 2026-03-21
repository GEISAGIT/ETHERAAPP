'use client';

import { useState, useMemo } from 'react';
import type { Patient, Consultation } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, UserRound, Calendar, FileText, ChevronRight, AlertCircle, Phone, Fingerprint } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PatientClinicalRecordProps {
  patientId: string | null;
  consultations: Consultation[];
}

export function PatientClinicalRecord({ patientId, consultations }: PatientClinicalRecordProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [localSelectedPatientId, setLocalSelectedPatientId] = useState<string | null>(patientId);
  const firestore = useFirestore();

  const patientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'patients'), orderBy('fullName', 'asc'));
  }, [firestore]);

  const { data: patients } = useCollection<Patient>(patientsQuery);

  const selectedPatient = useMemo(() => {
    return patients?.find(p => p.id === (localSelectedPatientId || patientId));
  }, [patients, localSelectedPatientId, patientId]);

  const patientHistory = useMemo(() => {
    const id = localSelectedPatientId || patientId;
    if (!id) return [];
    return consultations
      .filter(c => c.patientId === id)
      .sort((a, b) => b.date.toMillis() - a.date.toMillis());
  }, [consultations, localSelectedPatientId, patientId]);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return patients || [];
    return patients?.filter(p => 
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.cpf.includes(searchTerm)
    ) || [];
  }, [patients, searchTerm]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Coluna 1: Lista de Pacientes / Pesquisa */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar paciente por nome ou CPF..." 
            className="pl-8" 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <Card className="max-h-[600px] overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30 py-3">
            <CardTitle className="text-sm uppercase tracking-widest font-bold">Prontuários</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto">
            <div className="divide-y">
              {filteredPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => setLocalSelectedPatientId(p.id)}
                  className={cn(
                    "w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-center justify-between group",
                    (localSelectedPatientId || patientId) === p.id && "bg-primary/5 border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{p.fullName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">CPF: {p.cpf}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coluna 2 e 3: Ficha Clínica e Evolução */}
      <div className="lg:col-span-2 space-y-6">
        {selectedPatient ? (
          <>
            {/* Header Ficha */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20 shrink-0">
                <UserRound className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold font-headline">{selectedPatient.fullName}</h2>
                  <Badge variant="outline" className="text-[10px] uppercase">{selectedPatient.gender === 'male' ? 'Masc' : 'Fem'}</Badge>
                  <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-600 border-red-200">Tipo: {selectedPatient.bloodType || 'N/A'}</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Fingerprint className="h-3.5 w-3.5" /> {selectedPatient.cpf}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> {format(selectedPatient.birthDate.toDate(), 'dd/MM/yyyy')}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {selectedPatient.phone}
                  </div>
                </div>
              </div>
            </div>

            {/* Informações Críticas */}
            {selectedPatient.allergies && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex gap-3 animate-pulse">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-800 uppercase tracking-wider">Alergias Detectadas</p>
                  <p className="text-sm font-medium text-red-900">{selectedPatient.allergies}</p>
                </div>
              </div>
            )}

            {/* Linha do Tempo de Evolução */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-primary flex items-center gap-2">
                <History className="h-4 w-4" /> Evolução Clínica Cronológica
              </h3>
              
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-primary/20 before:to-transparent">
                {patientHistory.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground italic">Nenhuma evolução registrada para este paciente.</div>
                ) : (
                  patientHistory.map((cons, idx) => (
                    <div key={cons.id} className="relative flex items-start gap-6 group">
                      <div className="absolute left-0 mt-1 h-10 w-10 rounded-full border-2 border-primary/20 bg-background flex items-center justify-center shrink-0 group-hover:border-primary group-hover:scale-110 transition-all z-10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <Card className="ml-12 flex-1 hover:shadow-md transition-all border-primary/10">
                        <CardHeader className="py-3 px-4 bg-muted/20">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-bold">{format(cons.date.toDate(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</CardTitle>
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-tighter">{cons.professionalName}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Evolução do Dia:</p>
                            <p className="text-sm leading-relaxed text-foreground/90">{cons.evolution}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-dashed">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-muted-foreground">Diagnóstico:</p>
                              <p className="text-xs font-medium italic">{cons.diagnosis}</p>
                            </div>
                            {cons.prescription && (
                              <div>
                                <p className="text-[10px] font-bold uppercase text-primary">Prescrição / Conduta:</p>
                                <p className="text-xs">{cons.prescription}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-[500px] items-center justify-center border-2 border-dashed rounded-3xl bg-muted/5">
            <div className="text-center space-y-2 opacity-40">
              <Users className="h-16 w-16 mx-auto mb-4" />
              <p className="text-xl font-bold">Selecione um paciente</p>
              <p className="text-sm">Consulte o histórico clínico e evolução do prontuário.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
