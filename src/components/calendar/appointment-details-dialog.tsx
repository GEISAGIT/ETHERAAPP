'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Clock, 
  User, 
  Phone, 
  Trash2, 
  CheckCircle2, 
  Loader2, 
  UserCheck, 
  Play, 
  XCircle,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Appointment, AppointmentStatus } from '@/lib/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AppointmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string; icon: any }[] = [
  { value: 'scheduled', label: 'Agendado', icon: Clock },
  { value: 'confirmed', label: 'Confirmado', icon: CheckCircle2 },
  { value: 'arrived', label: 'Chegou na Clínica', icon: UserCheck },
  { value: 'in_progress', label: 'Em Atendimento', icon: Play },
  { value: 'finished', label: 'Finalizado', icon: CheckCircle2 },
  { value: 'cancelled', label: 'Cancelado', icon: XCircle },
  { value: 'no_show', label: 'Faltou', icon: AlertTriangle },
];

export function AppointmentDetailsDialog({ open, onOpenChange, appointment }: AppointmentDetailsDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    if (!firestore) return;
    setIsUpdating(true);
    updateDocumentNonBlocking(doc(firestore, 'appointments', appointment.id), {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });
    toast({ title: 'Status Atualizado', description: `O agendamento agora está como: ${newStatus}` });
    setIsUpdating(false);
  };

  const handleDelete = () => {
    if (!firestore || !confirm('Deseja realmente excluir este agendamento?')) return;
    deleteDocumentNonBlocking(doc(firestore, 'appointments', appointment.id));
    toast({ title: 'Agendamento Excluído' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Detalhes do Agendamento
          </DialogTitle>
          <DialogDescription>Informações completas da reserva.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header Card */}
          <div className="bg-muted/30 p-4 rounded-xl border border-primary/10">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="text-lg font-bold leading-tight">{appointment.patientName}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Phone className="h-3.5 w-3.5" />
                  {appointment.patientPhone || 'Telefone não informado'}
                </div>
              </div>
              <Badge variant="outline" className="font-bold uppercase tracking-tight">{appointment.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Profissional</span>
                <p className="text-sm font-medium flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-primary" /> {appointment.professionalName}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Serviço</span>
                <p className="text-sm font-medium truncate">{appointment.serviceName}</p>
              </div>
            </div>
          </div>

          {/* Horário */}
          <div className="flex items-center justify-center gap-8 py-2">
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Data</span>
              <div className="text-lg font-bold">{format(appointment.startTime.toDate(), "dd/MM/yyyy")}</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Horário</span>
              <div className="text-lg font-bold text-primary">
                {format(appointment.startTime.toDate(), 'HH:mm')} - {format(appointment.endTime.toDate(), 'HH:mm')}
              </div>
            </div>
          </div>

          {/* Seletor de Status */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground px-1">Alterar Situação</label>
            <Select onValueChange={(v: AppointmentStatus) => handleStatusChange(v)} defaultValue={appointment.status}>
              <SelectTrigger className="w-full h-11">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      <opt.icon className="h-4 w-4 opacity-70" />
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notas */}
          {appointment.notes && (
            <div className="space-y-1 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200/50">
              <span className="text-[10px] font-bold uppercase text-amber-700">Observações</span>
              <p className="text-xs italic leading-relaxed text-amber-900 dark:text-amber-300">"{appointment.notes}"</p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between flex-row gap-2">
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
