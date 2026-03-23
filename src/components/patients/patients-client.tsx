'use client';

import { useState, useMemo } from 'react';
import type { Patient, UserProfile, PatientStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { PlusCircle, Search, MoreHorizontal, Edit, Trash2, UserRound, Phone, Mail, FileText, HeartPulse, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddPatientDialog } from './add-patient-dialog';
import { DeletePatientAlert } from './delete-patient-alert';
import { Badge } from '@/components/ui/badge';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusConfig: Record<PatientStatus, { text: string; variant: "default" | "secondary" | "destructive" }> = {
    active: { text: "Ativo", variant: "default" },
    inactive: { text: "Inativo", variant: "secondary" },
    death: { text: "Óbito", variant: "destructive" }
};

export function PatientsClient({ patients, userProfile }: { patients: Patient[], userProfile: UserProfile | null | undefined }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const isAdmin = userProfile?.role === 'admin';
  const canCreate = !!(isAdmin || userProfile?.permissions?.patients?.create);
  const canEdit = !!(isAdmin || userProfile?.permissions?.patients?.edit);
  const canDelete = !!(isAdmin || userProfile?.permissions?.patients?.delete);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => 
        patient.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.cpf.includes(searchTerm) ||
        (patient.email && patient.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [patients, searchTerm]);

  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsAddOpen(true);
  };

  const handleDelete = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!firestore || !selectedPatient) return;
    deleteDocumentNonBlocking(doc(firestore, 'patients', selectedPatient.id));
    toast({ title: 'Paciente Removido', description: 'O registro foi excluído permanentemente.' });
    setIsDeleteAlertOpen(false);
    setSelectedPatient(null);
  };

  return (
    <div className="space-y-8">
      <AddPatientDialog 
        open={isAddOpen} 
        onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) setSelectedPatient(null);
        }} 
        patient={selectedPatient}
      />
      <DeletePatientAlert 
        open={isDeleteOpen} 
        onOpenChange={setIsDeleteAlertOpen} 
        onConfirm={handleConfirmDelete} 
      />

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Cadastro de Pacientes</h1>
          <p className="text-muted-foreground">Gestão centralizada de dados clínicos e demográficos.</p>
        </div>
        {canCreate && (
          <Button onClick={() => setIsAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        )}
      </header>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>CPF / Nascimento</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Convênio</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                  Nenhum paciente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <UserRound className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{patient.fullName}</span>
                        <div className="flex items-center gap-2">
                            {patient.bloodType && <Badge variant="outline" className="text-[10px] h-4 px-1">{patient.bloodType}</Badge>}
                            <span className="text-[10px] text-muted-foreground uppercase">{patient.gender === 'male' ? 'Masc' : patient.gender === 'female' ? 'Fem' : 'Outro'}</span>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="font-mono">{patient.cpf}</span>
                      <span className="text-muted-foreground">{format(patient.birthDate.toDate(), 'dd/MM/yyyy')}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs gap-1">
                      <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-primary" /> {patient.phone}</div>
                      {patient.email && <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="h-3 w-3" /> {patient.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {patient.insurance?.provider ? (
                        <div className="flex flex-col text-xs">
                            <div className="flex items-center gap-1.5 font-medium"><ShieldCheck className="h-3 w-3 text-emerald-600" /> {patient.insurance.provider}</div>
                            <span className="text-muted-foreground text-[10px]">{patient.insurance.plan || 'Plano não informado'}</span>
                        </div>
                    ) : (
                        <Badge variant="outline" className="text-[10px] font-normal opacity-60">Particular</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[patient.status].variant} className="text-[10px]">
                      {statusConfig[patient.status].text}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {(canEdit || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Gerenciar</DropdownMenuLabel>
                          {canEdit && (
                            <DropdownMenuItem onClick={() => handleEdit(patient)}>
                              <Edit className="mr-2 h-4 w-4" /> Editar Prontuário
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem disabled>
                            <FileText className="mr-2 h-4 w-4" /> Ver Histórico
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem onClick={() => handleDelete(patient)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Excluir Registro
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
