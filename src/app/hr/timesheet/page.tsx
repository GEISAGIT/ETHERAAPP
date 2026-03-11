'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, useStorage, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, Timestamp, serverTimestamp, where, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Employee, EmployeeDiscount, TimeAdjustment, AdjustmentType, WorkSchedule, WorkScheduleType, AttendanceRecord, AttendanceType } from '@/lib/types';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { CalendarIcon, Loader2, Save, Plus, Trash2, Clock, UserCheck, CalendarDays, UploadCloud, FileText, Download, Info, Printer, ClipboardCheck, Stethoscope, AlertTriangle, Check } from 'lucide-react';
import { format, differenceInMinutes, isSameDay, setHours, setMinutes, parse, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

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
  '12x36': {
    type: '12x36',
    days: {}
  },
  'custom': {
    type: 'custom',
    days: {}
  }
};

const ADJUSTMENT_LABELS: Record<AdjustmentType, string> = {
  absence: 'Falta Injustificada',
  medical_certificate: 'Atestado Médico',
  holiday: 'Feriado',
  day_off: 'Folga',
  compensation: 'Compensação',
  other: 'Outro'
};

function HRTimesheetContent() {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('contract');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // States for Adjustments
  const [isAdjDialogOpen, setIsAdjDialogOpen] = useState(false);
  const [adjDate, setAdjDate] = useState<Date>(new Date());
  const [adjType, setAdjType] = useState<AdjustmentType>('medical_certificate');
  const [adjNotes, setAdjNotes] = useState('');

  useEffect(() => {
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

    const cleanData = Object.entries(formData).reduce((acc, [key, value]) => {
      if (value !== undefined) (acc as any)[key] = value;
      return acc;
    }, {} as any);

    const employeeRef = doc(firestore, 'employees', selectedEmployeeId);
    updateDocumentNonBlocking(employeeRef, {
      ...cleanData,
      updatedAt: serverTimestamp(),
    });

    setTimeout(() => {
      toast({ title: 'Dados Atualizados' });
      setIsSaving(false);
    }, 500);
  };

  const handleAddAdjustment = () => {
    const newAdj: TimeAdjustment = {
      id: crypto.randomUUID(),
      date: Timestamp.fromDate(adjDate),
      type: adjType,
      description: adjNotes,
    };
    const updatedAdj = [...(formData.adjustments || []), newAdj];
    handleUpdateField('adjustments', updatedAdj);
    setIsAdjDialogOpen(false);
    setAdjNotes('');
    toast({ title: 'Ocorrência lançada' });
  };

  const handleDeleteAdjustment = (id: string) => {
    handleUpdateField('adjustments', formData.adjustments?.filter(a => a.id !== id));
  };

  // Cálculo da Folha Ponto Mensal (Baseado em CLT)
  const currentMonthDays = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return eachDayOfInterval({ start, end });
  }, []);

  const fullHistory = useMemo(() => {
    if (!currentMonthDays) return [];
    
    return currentMonthDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayRecords = rawAttendance?.filter(r => format(r.timestamp.toDate(), 'yyyy-MM-dd') === dayStr)
        .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis()) || [];
      
      const dayAdj = formData.adjustments?.find(a => isSameDay(a.date.toDate(), day));
      
      return { date: day, records: dayRecords, adjustment: dayAdj };
    }).reverse();
  }, [currentMonthDays, rawAttendance, formData.adjustments]);

  const calculateHours = (records: AttendanceRecord[], dayDate: Date, adjustment?: TimeAdjustment) => {
    const clockIn = records.find(r => r.type === 'clock_in')?.timestamp.toDate();
    const clockOut = records.find(r => r.type === 'clock_out')?.timestamp.toDate();
    const breakStart = records.find(r => r.type === 'break_start')?.timestamp.toDate();
    const breakEnd = records.find(r => r.type === 'break_end')?.timestamp.toDate();

    const dayOfWeek = getDay(dayDate);
    const daySchedule = formData.workSchedule?.days[dayOfWeek];
    
    let expectedMinutes = 0;
    if (daySchedule?.workDay) {
      const [sH, sM] = daySchedule.start.split(':').map(Number);
      const [eH, eM] = daySchedule.end.split(':').map(Number);
      const [lsH, lsM] = daySchedule.lunchStart.split(':').map(Number);
      const [leH, leM] = daySchedule.lunchEnd.split(':').map(Number);
      expectedMinutes = (eH * 60 + eM) - (sH * 60 + sM);
      if (lsH && leH) expectedMinutes -= (leH * 60 + leM) - (lsH * 60 + lsM);
    }

    let workedMinutes = 0;
    const alerts: string[] = [];

    if (clockIn && clockOut) {
      workedMinutes = differenceInMinutes(clockOut, clockIn);
      if (breakStart && breakEnd) {
        workedMinutes -= differenceInMinutes(breakEnd, breakStart);
      }
    }

    // Lógica de Ocorrências
    if (adjustment) {
      if (adjustment.type === 'medical_certificate' || adjustment.type === 'holiday' || adjustment.type === 'day_off') {
        workedMinutes = expectedMinutes; // Abona o dia
      }
    }

    const balance = workedMinutes - expectedMinutes;
    const isWeekend = dayOfWeek === 0 || (dayOfWeek === 6 && !daySchedule?.workDay);

    return { worked: workedMinutes, expected: expectedMinutes, balance, isWeekend, alerts };
  };

  const formatMinutes = (min: number) => {
    const sign = min < 0 ? '-' : '';
    const absMin = Math.abs(min);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const handlePrint = () => {
    window.print();
  };

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
      updateDocumentNonBlocking(doc(firestore!, 'employees', selectedEmployeeId), { documents: updatedDocs });
      toast({ title: 'Documento anexado' });
    } catch (e) { toast({ variant: 'destructive', title: 'Erro no upload' }); }
    finally { setIsUploading(false); }
  };

  if (employeesLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Diálogo Ocorrência */}
      <Dialog open={isAdjDialogOpen} onOpenChange={setIsAdjDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar Ocorrência / Justificativa</DialogTitle>
            <DialogDescription>Ajuste o saldo de horas ou registre ausências legais.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Data da Ocorrência</Label>
              <Input type="date" value={format(adjDate, 'yyyy-MM-dd')} onChange={(e) => setAdjDate(parse(e.target.value, 'yyyy-MM-dd', new Date()))} />
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
              <Label>Observações / Descritivo</Label>
              <Textarea value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Ex: Protocolo atestado 12345..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdjDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddAdjustment}>Salvar Ocorrência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Gestão de Colaboradores</h1>
          <p className="text-muted-foreground">Controle de jornada e espelho de ponto CLT.</p>
        </div>
        <div className="flex gap-2">
          {selectedEmployeeId && (
            <>
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir Espelho
              </Button>
              <Button onClick={handleSaveEmployee} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Alterações
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Header específico para Impressão */}
      <div className="hidden print:block border-b-2 border-primary pb-4 mb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-primary">Ethera - Espelho de Ponto</h1>
            <p className="text-sm font-medium">Competência: {format(new Date(), 'MMMM / yyyy', { locale: ptBR })}</p>
          </div>
          <div className="text-right text-xs">
            <p>Emissão: {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p><strong>Colaborador:</strong> {selectedEmployee?.fullName}</p>
            <p><strong>CPF:</strong> {selectedEmployee?.cpf}</p>
            <p><strong>Cargo:</strong> {selectedEmployee?.position}</p>
          </div>
          <div className="text-right">
            <p><strong>Admissão:</strong> {selectedEmployee?.hireDate ? format(selectedEmployee.hireDate.toDate(), 'dd/MM/yyyy') : '--'}</p>
            <p><strong>Regime:</strong> {selectedEmployee?.regimeType} / {selectedEmployee?.overtimePolicy}</p>
          </div>
        </div>
      </div>

      <Card className="border-primary/20 shadow-sm print:hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Selecionar Funcionário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Escolha um colaborador..." /></SelectTrigger>
            <SelectContent>
              {employees?.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>{emp.fullName} ({emp.position})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEmployee ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 h-auto p-1 bg-muted/50 print:hidden">
            <TabsTrigger value="contract" className="py-2">Contrato & Escala</TabsTrigger>
            <TabsTrigger value="attendance" className="py-2">Folha Ponto</TabsTrigger>
            <TabsTrigger value="adjustments" className="py-2">Ajustes & Ocorrências</TabsTrigger>
            <TabsTrigger value="experience" className="py-2">Férias & Exp.</TabsTrigger>
            <TabsTrigger value="discounts" className="py-2">Financeiro</TabsTrigger>
            <TabsTrigger value="documents" className="py-2">Arquivos</TabsTrigger>
          </TabsList>

          <TabsContent value="contract" className="space-y-6 print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader><CardTitle className="text-md">Escala de Trabalho</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Escala</Label>
                    <Select value={formData.workSchedule?.type} onValueChange={(v: WorkScheduleType) => handleUpdateField('workSchedule', DEFAULT_SCHEDULES[v])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5x2">5x2 (Seg a Sex)</SelectItem>
                        <SelectItem value="6x1">6x1 (Folga Variável)</SelectItem>
                        <SelectItem value="12x36">12x36 (Plantão)</SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-md">Detalhamento da Jornada</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                    const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day];
                    const schedule = formData.workSchedule?.days[day];
                    return (
                      <div key={day} className="flex flex-wrap items-center gap-4 p-3 border rounded-lg hover:bg-muted/30">
                        <div className="w-24 font-medium text-sm">{dayName}</div>
                        <Checkbox checked={schedule?.workDay} onCheckedChange={(checked) => {
                          const updatedDays = { ...formData.workSchedule?.days, [day]: { ...schedule, workDay: !!checked } };
                          handleUpdateField('workSchedule', { ...formData.workSchedule, days: updatedDays });
                        }} />
                        {schedule?.workDay && (
                          <div className="flex gap-2 items-center">
                            <Input type="time" className="w-24 h-8" value={schedule.start} onChange={(e) => {
                              const updatedDays = { ...formData.workSchedule?.days, [day]: { ...schedule, start: e.target.value } };
                              handleUpdateField('workSchedule', { ...formData.workSchedule, days: updatedDays });
                            }} />
                            <span className="text-xs">às</span>
                            <Input type="time" className="w-24 h-8" value={schedule.end} onChange={(e) => {
                              const updatedDays = { ...formData.workSchedule?.days, [day]: { ...schedule, end: e.target.value } };
                              handleUpdateField('workSchedule', { ...formData.workSchedule, days: updatedDays });
                            }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <Card className="print:border-none print:shadow-none">
              <CardHeader className="flex flex-row items-center justify-between print:hidden">
                <div>
                  <CardTitle className="text-lg">Espelho de Ponto Automatizado</CardTitle>
                  <CardDescription>Cálculo de horas baseado em Batidas + Ocorrências.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Saldo: {formatMinutes(fullHistory.reduce((acc, day) => acc + calculateHours(day.records, day.date, day.adjustment).balance, 0))}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="rounded-md border print:border-slate-300">
                  <Table className="print:text-[10px]">
                    <TableHeader className="bg-muted/50 print:bg-slate-100">
                      <TableRow>
                        <TableHead className="w-32">Data</TableHead>
                        <TableHead>Batidas Reais</TableHead>
                        <TableHead className="text-center">Intervalo</TableHead>
                        <TableHead className="text-center">Trab.</TableHead>
                        <TableHead className="text-center">Saldo</TableHead>
                        <TableHead>Ocorrência/Nota</TableHead>
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
                          <TableRow key={day.date.toISOString()} className={cn(stats.isWeekend && "bg-muted/20 print:bg-slate-50")}>
                            <TableCell className="font-medium">
                              {format(day.date, "dd/MM (eee)", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {day.records.length > 0 ? day.records.map(r => (
                                  <span key={r.id} className="font-mono">{format(r.timestamp.toDate(), 'HH:mm')}</span>
                                )).reduce((prev, curr) => [prev, ' - ', curr] as any) : '--:--'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {breakStart && breakEnd ? formatMinutes(differenceInMinutes(breakEnd.timestamp.toDate(), breakStart.timestamp.toDate())) : '--'}
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {formatMinutes(stats.worked)}
                            </TableCell>
                            <TableCell className={cn("text-center font-bold", stats.balance > 0 ? "text-emerald-600" : stats.balance < 0 ? "text-red-600" : "")}>
                              {formatMinutes(stats.balance)}
                            </TableCell>
                            <TableCell>
                              {day.adjustment ? (
                                <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/30">
                                  {ADJUSTMENT_LABELS[day.adjustment.type]}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">{day.records[0]?.notes || ''}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="hidden print:grid grid-cols-2 gap-20 mt-16 text-sm">
                  <div className="border-t border-black pt-2 text-center">
                    <p>{selectedEmployee?.fullName}</p>
                    <p className="text-[10px]">Assinatura do Colaborador</p>
                  </div>
                  <div className="border-t border-black pt-2 text-center">
                    <p>Ethera Longevidade</p>
                    <p className="text-[10px]">Assinatura do Gestor</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-6 print:hidden">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-primary" /> Histórico de Ajustes</CardTitle>
                  <CardDescription>Lance faltas, atestados ou compensações manuais.</CardDescription>
                </div>
                <Button onClick={() => setIsAdjDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Lançar Ocorrência</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.adjustments?.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">Nenhuma ocorrência lançada.</TableCell></TableRow>
                    ) : (
                      formData.adjustments?.sort((a,b) => b.date.toMillis() - a.date.toMillis()).map(adj => (
                        <TableRow key={adj.id}>
                          <TableCell className="font-medium">{format(adj.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="gap-1">
                              {adj.type === 'medical_certificate' ? <Stethoscope className="h-3 w-3" /> : <Info className="h-3 w-3" />}
                              {ADJUSTMENT_LABELS[adj.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{adj.description}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteAdjustment(adj.id)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 print:hidden">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-md">Documentos Digitalizados</CardTitle>
                <div className="relative">
                  <Input type="file" className="hidden" id="doc-upload-hr" onChange={handleFileUpload} disabled={isUploading} />
                  <Button variant="outline" size="sm" asChild disabled={isUploading}>
                    <label htmlFor="doc-upload-hr" className="cursor-pointer">
                      {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                      Anexar Novo
                    </label>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.documents?.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md group hover:border-primary/50 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="h-5 w-5 text-primary shrink-0" />
                        <div className="flex flex-col overflow-hidden">
                          <span className="text-sm font-medium truncate">{doc.name}</span>
                          <span className="text-[10px] text-muted-foreground">{format(doc.uploadedAt.toDate(), 'dd/MM/yy')}</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={doc.url} target="_blank"><Download className="h-4 w-4" /></Link>
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed bg-muted/10 print:hidden">
          <p className="text-muted-foreground font-medium">Selecione um colaborador acima para começar a gestão.</p>
        </div>
      )}
    </div>
  );
}

export default function HRTimesheetPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <HRTimesheetContent />
      </Suspense>
    </AppLayout>
  );
}
