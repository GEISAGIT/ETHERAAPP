'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, useStorage, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, Timestamp, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Employee, TimeAdjustment, AdjustmentType, WorkSchedule, WorkScheduleType, AttendanceRecord, AttendanceType, EmployeeDiscount } from '@/lib/types';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { CalendarIcon, Loader2, Save, Plus, Trash2, UserCheck, UploadCloud, FileText, Download, Printer, Stethoscope, Edit, PlusCircle, MessageSquare, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { format, differenceInMinutes, isSameDay, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const DEFAULT_SCHEDULES: Record<WorkScheduleType, WorkSchedule> = {
  '5x2': {
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
  },
  '6x1': {
    type: '6x1',
    days: {
      1: { workDay: true, start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
      2: { workDay: true, start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
      3: { workDay: true, start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
      4: { workDay: true, start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
      5: { workDay: true, start: '08:00', end: '17:00', lunchStart: '12:00', lunchEnd: '13:00' },
      6: { workDay: true, start: '08:00', end: '12:00', lunchStart: '', lunchEnd: '' },
      0: { workDay: false, start: '', end: '', lunchStart: '', lunchEnd: '' },
    }
  },
  '12x36': { type: '12x36', days: {} },
  'custom': { type: 'custom', days: {} }
};

const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  absence: 'Falta Injustificada',
  medical_certificate: 'Atestado Médico',
  holiday: 'Feriado',
  day_off: 'Folga',
  compensation: 'Compensação',
  other: 'Outro'
};

const ATTENDANCE_LABELS: Record<AttendanceType, string> = {
  clock_in: 'Entrada',
  clock_out: 'Saída',
  break_start: 'Saída Almoço',
  break_end: 'Retorno Almoço'
};

function HRTimesheetContent() {
  const [isClient, setIsClient] = useState(false);
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('attendance');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [isAdjDialogOpen, setIsAdjDialogOpen] = useState(false);
  const [adjDate, setAdjDate] = useState<Date>(new Date());
  const [adjType, setAdjType] = useState<AdjustmentType>('medical_certificate');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjFile, setAdjFile] = useState<File | null>(null);

  const [isManualPunchOpen, setIsManualPunchOpen] = useState(false);
  const [manualPunchDate, setManualPunchDate] = useState<Date>(new Date());
  const [manualPunchTime, setManualPunchTime] = useState('08:00');
  const [manualPunchType, setManualPunchType] = useState<AttendanceType>('clock_in');
  const [manualPunchNotes, setManualPunchNotes] = useState('');

  const [isEditPunchOpen, setIsEditPunchOpen] = useState(false);
  const [editingPunch, setEditingPunch] = useState<AttendanceRecord | null>(null);
  const [editPunchTime, setEditPunchTime] = useState('');
  const [editPunchNotes, setEditPunchNotes] = useState('');

  useEffect(() => {
    setIsClient(true);
    const urlId = searchParams.get('id');
    if (urlId) setSelectedEmployeeId(urlId);
  }, [searchParams]);

  const employeesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'employees'));
  }, [firestore, user]);

  const { data: employees, isLoading: employeesLoading } = useCollection<Employee>(employeesQuery);

  const selectedEmployee = useMemo(() => 
    employees?.find(e => e.id === selectedEmployeeId) || null
  , [employees, selectedEmployeeId]);

  const attendanceQuery = useMemoFirebase(() => {
    if (!firestore || !selectedEmployeeId) return null;
    return query(
      collection(firestore, 'attendanceRecords'),
      where('employeeId', '==', selectedEmployeeId)
    );
  }, [firestore, selectedEmployeeId]);

  const { data: rawAttendance, isLoading: attendanceLoading } = useCollection<AttendanceRecord>(attendanceQuery);

  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (selectedEmployee) {
      setFormData({
        ...selectedEmployee,
        workSchedule: selectedEmployee.workSchedule || DEFAULT_SCHEDULES['5x2'],
        adjustments: selectedEmployee.adjustments || [],
        discounts: selectedEmployee.discounts || [],
      });
    } else {
      setFormData({});
    }
  }, [selectedEmployee]);

  const handleUpdateField = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEmployee = () => {
    if (!firestore || !selectedEmployeeId) return;
    setIsSaving(true);

    const employeeRef = doc(firestore, 'employees', selectedEmployeeId);
    updateDocumentNonBlocking(employeeRef, {
      ...formData,
      updatedAt: serverTimestamp(),
    });

    setTimeout(() => {
      toast({ title: 'Dados Atualizados', description: 'As informações foram salvas.' });
      setIsSaving(false);
    }, 500);
  };

  const handleAddAdjustment = async () => {
    if (!firestore || !selectedEmployeeId) return;
    setIsSaving(true);

    let attachmentUrl = '';
    let attachmentName = '';

    if (adjFile && storage) {
      try {
        const storageRef = ref(storage, `adjustment-docs/${selectedEmployeeId}/${Date.now()}_${adjFile.name}`);
        const snapshot = await uploadBytes(storageRef, adjFile);
        attachmentUrl = await getDownloadURL(snapshot.ref);
        attachmentName = adjFile.name;
      } catch (e) {
        toast({ variant: 'destructive', title: 'Erro no anexo' });
      }
    }

    const newAdj: TimeAdjustment = {
      id: crypto.randomUUID(),
      date: Timestamp.fromDate(adjDate),
      type: adjType,
      description: adjNotes,
      attachmentUrl,
      attachmentName,
    };

    const updatedAdj = [...(formData.adjustments || []), newAdj];
    handleUpdateField('adjustments', updatedAdj);
    
    const employeeRef = doc(firestore, 'employees', selectedEmployeeId);
    updateDocumentNonBlocking(employeeRef, { adjustments: updatedAdj });

    setIsAdjDialogOpen(false);
    setAdjNotes('');
    setAdjFile(null);
    setIsSaving(false);
    toast({ title: 'Ocorrência lançada' });
  };

  const handleDeleteAdjustment = (id: string) => {
    const updated = formData.adjustments?.filter(a => a.id !== id);
    handleUpdateField('adjustments', updated);
    if (firestore && selectedEmployeeId) {
      updateDocumentNonBlocking(doc(firestore, 'employees', selectedEmployeeId), { adjustments: updated });
    }
  };

  const handleManualPunch = () => {
    if (!firestore || !selectedEmployee || !user) return;
    
    const [h, m] = manualPunchTime.split(':');
    const punchTimestamp = new Date(manualPunchDate);
    punchTimestamp.setHours(parseInt(h), parseInt(m), 0, 0);

    const recordData = {
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.fullName,
      timestamp: Timestamp.fromDate(punchTimestamp),
      type: manualPunchType,
      manual: true,
      notes: manualPunchNotes,
      updatedBy: user.uid,
      updatedByName: user.displayName || 'Gestor'
    };

    addDocumentNonBlocking(collection(firestore, 'attendanceRecords'), recordData);
    
    setIsManualPunchOpen(false);
    setManualPunchNotes('');
    toast({ title: 'Batida Manual Registrada' });
  };

  const handleEditPunchSubmit = () => {
    if (!firestore || !editingPunch || !user) return;

    const [h, m] = editPunchTime.split(':');
    const newDate = editingPunch.timestamp.toDate();
    newDate.setHours(parseInt(h), parseInt(m), 0, 0);

    updateDocumentNonBlocking(doc(firestore, 'attendanceRecords', editingPunch.id), {
      timestamp: Timestamp.fromDate(newDate),
      notes: editPunchNotes,
      updatedBy: user.uid,
      updatedByName: user.displayName || 'Gestor'
    });

    setIsEditPunchOpen(false);
    setEditingPunch(null);
    setEditPunchTime('');
    setEditPunchNotes('');
    toast({ title: 'Horário Atualizado' });
  };

  const handleDeletePunch = (id: string) => {
    if (!firestore) return;
    if (confirm('Deseja realmente excluir esta marcação de ponto?')) {
      deleteDocumentNonBlocking(doc(firestore, 'attendanceRecords', id));
      toast({ title: 'Batida Removida' });
    }
  };

  const calculateHours = (records: AttendanceRecord[], dayDate: Date, adjustment?: TimeAdjustment) => {
    const clockIn = records.find(r => r.type === 'clock_in')?.timestamp?.toDate();
    const clockOut = records.find(r => r.type === 'clock_out')?.timestamp?.toDate();
    const breakStart = records.find(r => r.type === 'break_start')?.timestamp?.toDate();
    const breakEnd = records.find(r => r.type === 'break_end')?.timestamp?.toDate();

    const dayOfWeek = getDay(dayDate);
    const daySchedule = formData.workSchedule?.days[dayOfWeek];
    const isWorkDay = daySchedule?.workDay ?? false;
    
    let expectedMinutes = 0;
    if (isWorkDay) {
      const [sH, sM] = (daySchedule.start || "00:00").split(':').map(Number);
      const [eH, eM] = (daySchedule.end || "00:00").split(':').map(Number);
      const [lsH, lsM] = (daySchedule.lunchStart || "00:00").split(':').map(Number);
      const [leH, leM] = (daySchedule.lunchEnd || "00:00").split(':').map(Number);
      expectedMinutes = (eH * 60 + eM) - (sH * 60 + sM);
      if (lsH && leH) expectedMinutes -= (leH * 60 + leM) - (lsH * 60 + lsM);
    }

    let workedMinutes = 0;
    if (clockIn && clockOut) {
      workedMinutes = differenceInMinutes(clockOut, clockIn);
      if (breakStart && breakEnd) workedMinutes -= differenceInMinutes(breakEnd, breakStart);
    }

    if (adjustment && isWorkDay) {
      if (['medical_certificate', 'holiday', 'day_off'].includes(adjustment.type)) {
        workedMinutes = expectedMinutes;
      }
    }

    const balance = workedMinutes - expectedMinutes;
    const isWeekend = !isWorkDay;

    let status = 'Jornada Normal';
    if (adjustment) {
      status = ADJUSTMENT_LABELS[adjustment.type];
    } else if (isWeekend) {
      status = workedMinutes > 0 ? 'Extra no Descanso' : 'Descanso (DSR)';
    } else if (workedMinutes === 0 && isWorkDay) {
      status = 'Falta';
    } else if (balance > 0) {
      status = 'Crédito Banco de Horas';
    } else if (balance < 0) {
      status = 'Débito Banco de Horas';
    }

    return { worked: workedMinutes, expected: expectedMinutes, balance, isWeekend, status };
  };

  const formatMinutes = (min: number) => {
    const sign = min < 0 ? '-' : '';
    const absMin = Math.abs(min);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const fullHistory = useMemo(() => {
    if (!isClient) return [];
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    const days = eachDayOfInterval({ start, end });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRecords = rawAttendance?.filter(r => {
        if (!r.timestamp) return false;
        const date = r.timestamp instanceof Timestamp ? r.timestamp.toDate() : new Date(r.timestamp);
        return format(date, 'yyyy-MM-dd') === dayStr;
      }).sort((a, b) => {
        const tA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
        const tB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
        return tA - tB;
      }) || [];
      
      const dayAdj = formData.adjustments?.find(a => {
        if (!a.date) return false;
        const adjDateObj = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
        return isSameDay(adjDateObj, day);
      });
      
      return { date: day, records: dayRecords, adjustment: dayAdj };
    });
  }, [rawAttendance, formData.adjustments, isClient]);

  const monthlySummary = useMemo(() => {
    let totalWorked = 0;
    let totalCredits = 0;
    let totalDebits = 0;
    let totalAbsences = 0;
    let totalCertificates = 0;

    fullHistory.forEach(day => {
      const stats = calculateHours(day.records, day.date, day.adjustment);
      totalWorked += stats.worked;
      if (stats.balance > 0) totalCredits += stats.balance;
      if (stats.balance < 0) totalDebits += Math.abs(stats.balance);
      
      if (stats.status === 'Falta') totalAbsences++;
      if (day.adjustment?.type === 'medical_certificate') totalCertificates++;
    });

    return {
      worked: totalWorked,
      credits: totalCredits,
      debits: totalDebits,
      balance: totalCredits - totalDebits,
      absences: totalAbsences,
      certificates: totalCertificates
    };
  }, [fullHistory, formData.workSchedule, formData.adjustments]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !storage || !selectedEmployeeId) return;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `employee-docs/${selectedEmployeeId}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      const newDoc = { id: crypto.randomUUID(), name: file.name, url, uploadedAt: Timestamp.now() };
      const updatedDocs = [...(formData.documents || []), newDoc];
      handleUpdateField('documents', updatedDocs);
      toast({ title: 'Documento anexado' });
    } catch (e) { toast({ variant: 'destructive', title: 'Erro no upload' }); }
    finally { setIsUploading(false); }
  };

  const PunchCell = ({ record, dayDate, type }: { record?: AttendanceRecord, dayDate: Date, type: AttendanceType }) => {
    return (
      <TableCell className="relative group/cell p-1.5 border-x text-center print:p-0 print:border-x-[0.5px] min-w-[65px] print:min-w-[50px] print:h-4">
        {record ? (
          <div className="flex items-center justify-center gap-1 print:gap-0">
            <span className={cn("text-xs font-medium print:text-[8pt]", record.manual && "text-amber-600 underline decoration-dotted")}>
              {format(record.timestamp.toDate(), 'HH:mm')}
            </span>
            {record.notes && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <MessageSquare className="h-2.5 w-2.5 text-muted-foreground opacity-50 print:hidden" />
                  </TooltipTrigger>
                  <TooltipContent><p className="max-w-[200px] text-xs">{record.notes}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center gap-1 print:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-primary hover:bg-primary/10"
                onClick={() => {
                  setEditingPunch(record);
                  setEditPunchTime(format(record.timestamp.toDate(), 'HH:mm'));
                  setEditPunchNotes(record.notes || '');
                  setIsEditPunchOpen(true);
                }}
              >
                <Edit className="h-3 w-3" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                onClick={() => handleDeletePunch(record.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1">
            <span className="text-[10px] text-muted-foreground opacity-30 print:hidden">--:--</span>
            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center justify-center print:hidden">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-primary hover:bg-primary/10"
                onClick={() => {
                  setManualPunchDate(dayDate);
                  setManualPunchType(type);
                  setManualPunchTime(type === 'clock_in' ? '08:00' : type === 'break_start' ? '12:00' : type === 'break_end' ? '13:00' : '18:00');
                  setIsManualPunchOpen(true);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </TableCell>
    );
  };

  if (!isClient) return null;
  if (employeesLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 print:space-y-0 print:m-0">
      <style jsx global>{`
        @media print {
          @page { margin: 0.4cm; }
          body { background: white !important; font-size: 8pt; line-height: 1.1; }
          .app-layout-main { padding: 0 !important; margin: 0 !important; }
          header, .print\\:hidden { display: none !important; }
          .card { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
          .table { border-collapse: collapse !important; width: 100% !important; margin-bottom: 0 !important; }
          .table th, .table td { border: 0.5px solid #000 !important; padding: 0 !important; height: 14px !important; }
          .tabs-content { margin: 0 !important; padding: 0 !important; }
          .card-content { padding: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Dialogs */}
      <Dialog open={isAdjDialogOpen} onOpenChange={setIsAdjDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar Ocorrência / Justificativa</DialogTitle>
            <DialogDescription>Ajuste o saldo de horas ou registre ausências legais.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={format(adjDate, 'yyyy-MM-dd')} onChange={(e) => setAdjDate(new Date(e.target.value + 'T12:00:00'))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={adjType} onValueChange={(v: AdjustmentType) => setAdjType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ADJUSTMENT_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Justificativa obrigatória..." />
            </div>
            <div className="space-y-2">
              <Label>Anexo do Documento (Opcional)</Label>
              <Input type="file" onChange={e => setAdjFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdjDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddAdjustment} disabled={isSaving || !adjNotes}>Salvar Ocorrência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManualPunchOpen} onOpenChange={setIsManualPunchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançamento Manual de Ponto</DialogTitle>
            <DialogDescription>Insira uma batida retroativa com justificativa.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={format(manualPunchDate, 'yyyy-MM-dd')} onChange={e => setManualPunchDate(new Date(e.target.value + 'T12:00:00'))} />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={manualPunchTime} onChange={e => setManualPunchTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Marcação</Label>
              <Select value={manualPunchType} onValueChange={(v: AttendanceType) => setManualPunchType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTENDANCE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Justificativa do Lançamento</Label>
              <Textarea value={manualPunchNotes} onChange={e => setManualPunchNotes(e.target.value)} placeholder="Obrigatório para auditoria..." required />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsManualPunchOpen(false)}>Cancelar</Button>
            <Button onClick={handleManualPunch} disabled={!manualPunchNotes}>Gravar no Histórico</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPunchOpen} onOpenChange={setIsEditPunchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Horário Registrado</DialogTitle>
            <DialogDescription>Corrija marcações com erro ou esquecimento.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Novo Horário</Label>
              <Input type="time" value={editPunchTime} onChange={e => setEditPunchTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Justificativa do Ajuste</Label>
              <Textarea value={editPunchNotes} onChange={e => setEditPunchNotes(e.target.value)} placeholder="Motivo da alteração..." required />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditPunchOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditPunchSubmit} disabled={!editPunchNotes}>Confirmar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Controle de Funcionários</h1>
          <p className="text-muted-foreground">Ficha completa, escala CLT e espelho de ponto oficial.</p>
        </div>
        <div className="flex gap-2">
          {selectedEmployeeId && (
            <>
              <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir Espelho</Button>
              <Button onClick={handleSaveEmployee} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Ficha
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Print-only Header (Ultra Compact) */}
      <div className="hidden print:block border-b border-black pb-0.5 mb-1 leading-none">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-sm font-bold text-primary">ETHERA SAÚDE & LONGEVIDADE</h1>
            <p className="text-[7pt] font-semibold uppercase">Espelho de Ponto Mensal - CLT</p>
          </div>
          <p className="text-[7pt] font-bold">MES: {format(new Date(), 'MMMM / yyyy', { locale: ptBR }).toUpperCase()}</p>
        </div>
        <div className="mt-1 grid grid-cols-2 gap-x-2 text-[6.5pt] leading-tight">
          <div className="space-y-0">
            <p><strong>COLABORADOR:</strong> {selectedEmployee?.fullName.toUpperCase()}</p>
            <p><strong>CPF:</strong> {selectedEmployee?.cpf} | <strong>MATRICULA:</strong> {selectedEmployee?.registrationNumber || '--'}</p>
            <p><strong>CARGO:</strong> {selectedEmployee?.position?.toUpperCase() || '--'}</p>
          </div>
          <div className="space-y-0 text-right">
            <p><strong>PIS:</strong> {selectedEmployee?.pisPasep || '--'} | <strong>CTPS:</strong> {selectedEmployee?.ctps || '--'}</p>
            <p><strong>ADMISSÃO:</strong> {selectedEmployee?.hireDate ? format(selectedEmployee.hireDate.toDate(), 'dd/MM/yyyy') : '--'} | <strong>VENC. FERIAS:</strong> {selectedEmployee?.vacationExpirationDate ? format(selectedEmployee.vacationExpirationDate.toDate(), 'dd/MM/yyyy') : '--'}</p>
          </div>
        </div>
      </div>

      <Card className="border-primary/20 shadow-sm print:hidden">
        <CardHeader className="pb-4"><CardTitle className="text-lg flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /> Selecione o Colaborador</CardTitle></CardHeader>
        <CardContent>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Escolha um colaborador para gerenciar..." /></SelectTrigger>
            <SelectContent>
              {employees?.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.fullName} ({emp.position})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEmployee ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 print:space-y-0">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto p-1 bg-muted/50 print:hidden">
            <TabsTrigger value="attendance" className="py-2">Folha Ponto</TabsTrigger>
            <TabsTrigger value="contract" className="py-2">Contrato & Escala</TabsTrigger>
            <TabsTrigger value="finance" className="py-2">Financeiro</TabsTrigger>
            <TabsTrigger value="documents" className="py-2">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-6 print:space-y-0">
            <Card className="print:border-none print:shadow-none overflow-hidden border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between print:hidden">
                <div>
                  <CardTitle className="text-lg">Registro de Frequência</CardTitle>
                  <CardDescription>Detalhamento diário da jornada contratada vs. realizada.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsAdjDialogOpen(true)}>
                    <Stethoscope className="mr-2 h-4 w-4" /> Lançar Atestado/Falta
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-0 print:p-0">
                <div className="overflow-x-auto">
                  <Table className="print:text-[7.5pt] border-collapse border leading-none">
                    <TableHeader>
                      <TableRow className="bg-muted/50 print:bg-slate-100 h-10 print:h-4 border-b">
                        <TableHead className="w-28 print:w-14 border-r pl-4 print:pl-0.5 font-bold text-foreground">DATA</TableHead>
                        <TableHead className="text-center font-bold text-foreground">ENTRADA</TableHead>
                        <TableHead className="text-center font-bold text-foreground">ALM. (S)</TableHead>
                        <TableHead className="text-center font-bold text-foreground">ALM. (R)</TableHead>
                        <TableHead className="text-center border-r font-bold text-foreground">SAIDA</TableHead>
                        <TableHead className="text-center w-16 print:w-10 font-bold text-foreground">TRAB.</TableHead>
                        <TableHead className="text-center w-16 print:w-10 font-bold text-foreground">SALDO</TableHead>
                        <TableHead className="pl-4 print:pl-0.5 font-bold text-foreground">STATUS</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fullHistory.map((day) => {
                        const stats = calculateHours(day.records, day.date, day.adjustment);
                        const clockIn = day.records.find(r => r.type === 'clock_in');
                        const breakStart = day.records.find(r => r.type === 'break_start');
                        const breakEnd = day.records.find(r => r.type === 'break_end');
                        const clockOut = day.records.find(r => r.type === 'clock_out');

                        return (
                          <TableRow key={day.date.toISOString()} className={cn(stats.isWeekend && "bg-muted/30 print:bg-slate-50", "h-9 print:h-4 border-b border-black")}>
                            <TableCell className="font-medium border-r pl-4 print:pl-0.5 whitespace-nowrap">
                              {format(day.date, "dd/MM (eee)", { locale: ptBR })}
                            </TableCell>
                            
                            <PunchCell record={clockIn} dayDate={day.date} type="clock_in" />
                            <PunchCell record={breakStart} dayDate={day.date} type="break_start" />
                            <PunchCell record={breakEnd} dayDate={day.date} type="break_end" />
                            <PunchCell record={clockOut} dayDate={day.date} type="clock_out" />

                            <TableCell className="text-center border-l bg-muted/5 font-mono print:font-bold">{formatMinutes(stats.worked)}</TableCell>
                            <TableCell className={cn("text-center font-bold border-l font-mono", stats.balance > 0 ? "text-emerald-600" : stats.balance < 0 ? "text-red-600" : "text-muted-foreground")}>
                              {stats.balance !== 0 ? formatMinutes(stats.balance) : '--:--'}
                            </TableCell>
                            <TableCell className="pl-4 print:pl-0.5 border-l">
                              <span className={cn("text-[9px] print:text-[6.5pt] uppercase font-semibold", 
                                stats.status === 'Falta' ? 'text-red-600' : 
                                stats.status.includes('Atestado') ? 'text-blue-600' : 
                                stats.status.includes('Descanso') ? 'text-muted-foreground' : 'text-foreground'
                              )}>
                                {stats.status}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Resumo e Assinaturas (Ultra Compacto) */}
                <div className="grid grid-cols-2 gap-0 border-t border-black print:mt-0.5">
                  <div className="p-3 print:p-1 bg-muted/10 border-r border-black">
                    <h3 className="font-bold text-[10px] mb-1 uppercase tracking-widest text-primary flex items-center gap-1 print:hidden">
                      <History className="h-3 w-3" /> Resumo do Mês
                    </h3>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] print:text-[7pt] leading-none">
                      <span className="text-muted-foreground">Horas Trabalhadas:</span>
                      <span className="font-bold text-right font-mono">{formatMinutes(monthlySummary.worked)}</span>
                      <span className="text-muted-foreground">Créditos:</span>
                      <span className="font-bold text-right text-emerald-600 font-mono">+{formatMinutes(monthlySummary.credits)}</span>
                      <span className="text-muted-foreground">Débitos:</span>
                      <span className="font-bold text-right text-red-600 font-mono">-{formatMinutes(monthlySummary.debits)}</span>
                      <div className="col-span-2 border-t border-dashed border-black mt-0.5 pt-0.5 flex justify-between items-center">
                        <span className="font-bold">SALDO ACUMULADO:</span>
                        <Badge className={cn("text-[9px] print:text-[7pt] font-mono px-1.5 h-4 print:h-3", monthlySummary.balance >= 0 ? "bg-emerald-600" : "bg-red-600")}>
                          {formatMinutes(monthlySummary.balance)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 print:p-1 bg-primary/5">
                    <h3 className="font-bold text-[10px] mb-1 uppercase tracking-widest text-primary flex items-center gap-1 print:hidden">
                      <AlertTriangle className="h-3 w-3" /> Estatísticas
                    </h3>
                    <div className="space-y-0.5 text-[9px] print:text-[7pt] leading-none">
                      <div className="flex justify-between"><span>Faltas:</span><span className="font-bold">{monthlySummary.absences} dias</span></div>
                      <div className="flex justify-between"><span>Atestados:</span><span className="font-bold">{monthlySummary.certificates} dias</span></div>
                      <p className="text-[6.5pt] text-muted-foreground mt-0.5 italic leading-tight">* Documento gerado conforme Art. 59 da CLT.</p>
                    </div>
                  </div>
                </div>

                <div className="hidden print:grid grid-cols-2 gap-8 mt-2 text-center text-[6.5pt]">
                  <div className="border-t border-black pt-0.5">
                    <p className="font-bold">{selectedEmployee?.fullName.toUpperCase()}</p>
                    <p>ASSINATURA DO COLABORADOR</p>
                  </div>
                  <div className="border-t border-black pt-0.5">
                    <p className="font-bold">ETHERA LONGEVIDADE - RH</p>
                    <p>CARIMBO E ASSINATURA DA EMPRESA</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contract" className="space-y-6 print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-primary/10">
                <CardHeader><CardTitle className="text-md flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Dados Contratuais & CLT</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Matrícula Interna</Label><Input value={formData.registrationNumber || ''} onChange={e => handleUpdateField('registrationNumber', e.target.value)} placeholder="0000" /></div>
                  <div className="space-y-2"><Label>PIS / PASEP</Label><Input value={formData.pisPasep || ''} onChange={e => handleUpdateField('pisPasep', e.target.value)} placeholder="000.00000.00-0" /></div>
                  <div className="space-y-2"><Label>CTPS (Nº e Série)</Label><Input value={formData.ctps || ''} onChange={e => handleUpdateField('ctps', e.target.value)} placeholder="000000 / 000-0" /></div>
                  <div className="space-y-2"><Label>Telefone</Label><Input value={formData.phone || ''} onChange={e => handleUpdateField('phone', e.target.value)} placeholder="(00) 00000-0000" /></div>
                  <div className="space-y-2">
                    <Label>Fim da Experiência</Label>
                    <Popover modal>
                      <PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.experienceEndDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.experienceEndDate ? format(formData.experienceEndDate instanceof Timestamp ? formData.experienceEndDate.toDate() : new Date(formData.experienceEndDate), "dd/MM/yyyy") : <span>Selecionar data</span>}</Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={formData.experienceEndDate instanceof Timestamp ? formData.experienceEndDate.toDate() : (formData.experienceEndDate ? new Date(formData.experienceEndDate) : undefined)} onSelect={d => handleUpdateField('experienceEndDate', d ? Timestamp.fromDate(d) : null)} initialFocus locale={ptBR} /></PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Vencimento de Férias</Label>
                    <Popover modal>
                      <PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.vacationExpirationDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{formData.vacationExpirationDate ? format(formData.vacationExpirationDate instanceof Timestamp ? formData.vacationExpirationDate.toDate() : new Date(formData.vacationExpirationDate), "dd/MM/yyyy") : <span>Selecionar data</span>}</Button></PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={formData.vacationExpirationDate instanceof Timestamp ? formData.vacationExpirationDate.toDate() : (formData.vacationExpirationDate ? new Date(formData.vacationExpirationDate) : undefined)} onSelect={d => handleUpdateField('vacationExpirationDate', d ? Timestamp.fromDate(d) : null)} initialFocus locale={ptBR} /></PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
              <Card className="lg:col-span-1 border-primary/10">
                <CardHeader><CardTitle className="text-md flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Escala Contratada</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2"><Label>Modelo de Escala</Label><Select value={formData.workSchedule?.type} onValueChange={(v: WorkScheduleType) => handleUpdateField('workSchedule', DEFAULT_SCHEDULES[v])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5x2">5x2 (Seg a Sex)</SelectItem><SelectItem value="6x1">6x1 (Sábado Parcial)</SelectItem><SelectItem value="12x36">12x36 (Plantão)</SelectItem><SelectItem value="custom">Personalizada</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Regime de Contratação</Label><Select value={formData.regimeType} onValueChange={v => handleUpdateField('regimeType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CLT">CLT (Consolidado)</SelectItem><SelectItem value="PJ">PJ (Prestador)</SelectItem><SelectItem value="intern">Estagiário</SelectItem></SelectContent></Select></div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6 print:hidden">
            <Card className="border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-lg">Verbas e Descontos</CardTitle></div></CardHeader>
              <CardContent className="space-y-4">
                {formData.discounts?.map((disc, idx) => (
                  <div key={disc.id} className="flex items-end gap-4 border p-4 rounded-lg bg-card group hover:border-primary/30 transition-colors">
                    <div className="flex-1 space-y-2"><Label>Descrição</Label><Input value={disc.name} onChange={e => { const newDiscounts = [...(formData.discounts || [])]; newDiscounts[idx].name = e.target.value; handleUpdateField('discounts', newDiscounts); }} /></div>
                    <div className="w-32 space-y-2"><Label>Percentual (%)</Label><Input type="number" value={disc.percentage} onChange={e => { const newDiscounts = [...(formData.discounts || [])]; newDiscounts[idx].percentage = Number(e.target.value); handleUpdateField('discounts', newDiscounts); }} /></div>
                    <Button variant="ghost" size="icon" className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleUpdateField('discounts', formData.discounts?.filter(d => d.id !== disc.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 print:hidden">
            <Card className="border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between"><div><CardTitle className="text-md">Documentos</CardTitle></div><div className="relative"><Input type="file" className="hidden" id="doc-upload-hr" onChange={handleFileUpload} disabled={isUploading} /><Button variant="outline" size="sm" asChild disabled={isUploading}><label htmlFor="doc-upload-hr" className="cursor-pointer">{isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />} Anexar</label></Button></div></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {formData.documents?.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-xl group hover:border-primary/50 bg-card transition-all">
                    <div className="flex items-center gap-3 overflow-hidden"><FileText className="h-6 w-6 text-primary shrink-0" /><div className="flex flex-col overflow-hidden"><span className="text-sm font-bold truncate">{doc.name}</span><span className="text-[10px] text-muted-foreground">Enviado em {doc.uploadedAt ? format(doc.uploadedAt.toDate(), 'dd/MM/yy') : '--'}</span></div></div>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-primary" asChild><Link href={doc.url} target="_blank"><Download className="h-4 w-4" /></Link></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex h-96 flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-muted/5 print:hidden">
          <UserCheck className="h-12 w-12 text-primary/20 mb-4" />
          <p className="text-muted-foreground font-semibold text-lg text-center px-8">Selecione um colaborador acima para visualizar a ficha e o espelho de ponto.</p>
        </div>
      )}
    </div>
  );
}

export default function HRTimesheetPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <HRTimesheetContent />
      </Suspense>
    </AppLayout>
  );
}
