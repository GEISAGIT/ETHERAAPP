'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCollection, useFirestore, useUser, useMemoFirebase, updateDocumentNonBlocking, useStorage } from '@/firebase';
import { collection, doc, query, Timestamp, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { Employee, TimeAdjustment, AdjustmentType, WorkSchedule, WorkScheduleType, AttendanceRecord } from '@/lib/types';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { CalendarIcon, Loader2, Save, Plus, Trash2, UserCheck, UploadCloud, FileText, Download, Info, Printer, ClipboardCheck, Stethoscope, AlertTriangle, ShieldCheck } from 'lucide-react';
import { format, differenceInMinutes, isSameDay, getDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

function HRTimesheetContent() {
  const [isClient, setIsClient] = useState(false);
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

  // Hydration fix
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

    // INFORMATIVE VALIDATION
    if (!formData.fullName) return showValidationError('Nome Completo');
    if (!formData.cpf) return showValidationError('CPF');
    if (!formData.position) return showValidationError('Cargo');

    // Limpeza de campos undefined para evitar erros no Firestore
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
      toast({ title: 'Dados Atualizados', description: 'As informações foram salvas no banco de dados.' });
      setIsSaving(false);
    }, 500);
  };

  const showValidationError = (fieldName: string) => {
    toast({ variant: 'destructive', title: 'Campo Obrigatório', description: `O campo "${fieldName}" deve ser preenchido.` });
    setIsSaving(false);
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

  const handleAddDiscount = () => {
    const newDiscount = { id: crypto.randomUUID(), name: '', percentage: 0 };
    handleUpdateField('discounts', [...(formData.discounts || []), newDiscount]);
  };

  // Monthly History Calculation
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
        const tA = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : 0;
        return tA - tB;
      }) || [];
      
      const dayAdj = formData.adjustments?.find(a => {
        if (!a.date) return false;
        const adjDateObj = a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date);
        return isSameDay(adjDateObj, day);
      });
      
      return { date: day, records: dayRecords, adjustment: dayAdj };
    }).reverse();
  }, [rawAttendance, formData.adjustments, isClient]);

  const calculateHours = (records: AttendanceRecord[], dayDate: Date, adjustment?: TimeAdjustment) => {
    const clockIn = records.find(r => r.type === 'clock_in')?.timestamp?.toDate();
    const clockOut = records.find(r => r.type === 'clock_out')?.timestamp?.toDate();
    const breakStart = records.find(r => r.type === 'break_start')?.timestamp?.toDate();
    const breakEnd = records.find(r => r.type === 'break_end')?.timestamp?.toDate();

    const dayOfWeek = getDay(dayDate);
    const daySchedule = formData.workSchedule?.days[dayOfWeek];
    
    let expectedMinutes = 0;
    if (daySchedule?.workDay) {
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

    if (adjustment) {
      if (['medical_certificate', 'holiday', 'day_off'].includes(adjustment.type)) {
        workedMinutes = expectedMinutes;
      }
    }

    const balance = workedMinutes - expectedMinutes;
    const isWeekend = dayOfWeek === 0 || (dayOfWeek === 6 && !daySchedule?.workDay);

    return { worked: workedMinutes, expected: expectedMinutes, balance, isWeekend };
  };

  const formatMinutes = (min: number) => {
    const sign = min < 0 ? '-' : '';
    const absMin = Math.abs(min);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    return `${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
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
      toast({ title: 'Documento anexado' });
    } catch (e) { toast({ variant: 'destructive', title: 'Erro no upload' }); }
    finally { setIsUploading(false); }
  };

  if (!isClient) return null;
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
              <Textarea value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} placeholder="Ex: Protocolo atestado 12345..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdjDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddAdjustment}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Gestão de Horários</h1>
          <p className="text-muted-foreground">Ficha completa e espelho de ponto CLT.</p>
        </div>
        <div className="flex gap-2">
          {selectedEmployeeId && (
            <>
              <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir</Button>
              <Button onClick={handleSaveEmployee} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar Ficha
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Header Impressão */}
      <div className="hidden print:block border-b-2 border-primary pb-4 mb-6">
        <div className="flex justify-between items-end">
          <h1 className="text-2xl font-bold text-primary">Ethera - Espelho de Ponto</h1>
          <p className="text-sm font-medium">Competência: {format(new Date(), 'MMMM / yyyy', { locale: ptBR })}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p><strong>Colaborador:</strong> {selectedEmployee?.fullName}</p>
            <p><strong>CPF:</strong> {selectedEmployee?.cpf} | <strong>Matrícula:</strong> {selectedEmployee?.registrationNumber || '--'}</p>
          </div>
          <div className="text-right">
            <p><strong>PIS:</strong> {selectedEmployee?.pisPasep || '--'} | <strong>CTPS:</strong> {selectedEmployee?.ctps || '--'}</p>
            <p><strong>Admissão:</strong> {selectedEmployee?.hireDate ? format(selectedEmployee.hireDate.toDate(), 'dd/MM/yyyy') : '--'}</p>
          </div>
        </div>
      </div>

      <Card className="border-primary/20 shadow-sm print:hidden">
        <CardHeader className="pb-4"><CardTitle className="text-lg flex items-center gap-2"><UserCheck className="h-5 w-5 text-primary" /> Colaborador</CardTitle></CardHeader>
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
            <TabsTrigger value="contract" className="py-2">Ficha & Escala</TabsTrigger>
            <TabsTrigger value="attendance" className="py-2">Folha Ponto</TabsTrigger>
            <TabsTrigger value="adjustments" className="py-2">Ocorrências</TabsTrigger>
            <TabsTrigger value="finance" className="py-2">Financeiro</TabsTrigger>
            <TabsTrigger value="documents" className="py-2">Arquivos</TabsTrigger>
          </TabsList>

          <TabsContent value="contract" className="space-y-6 print:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-md flex items-center gap-2"><FileText className="h-4 w-4" /> Documentação & Pessoal</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Matrícula Interna</Label>
                    <Input value={formData.registrationNumber || ''} onChange={e => handleUpdateField('registrationNumber', e.target.value)} placeholder="0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>PIS / PASEP</Label>
                    <Input value={formData.pisPasep || ''} onChange={e => handleUpdateField('pisPasep', e.target.value)} placeholder="000.00000.00-0" />
                  </div>
                  <div className="space-y-2">
                    <Label>CTPS (Nº e Série)</Label>
                    <Input value={formData.ctps || ''} onChange={e => handleUpdateField('ctps', e.target.value)} placeholder="000000 / 000-0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={formData.phone || ''} onChange={e => handleUpdateField('phone', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim do Período de Experiência</Label>
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.experienceEndDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.experienceEndDate ? format(formData.experienceEndDate instanceof Timestamp ? formData.experienceEndDate.toDate() : new Date(formData.experienceEndDate), "dd/MM/yyyy") : <span>Selecionar data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={formData.experienceEndDate instanceof Timestamp ? formData.experienceEndDate.toDate() : (formData.experienceEndDate ? new Date(formData.experienceEndDate) : undefined)} onSelect={d => handleUpdateField('experienceEndDate', d ? Timestamp.fromDate(d) : null)} initialFocus locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Próximo Vencimento de Férias</Label>
                    <Popover modal>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.vacationExpirationDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.vacationExpirationDate ? format(formData.vacationExpirationDate instanceof Timestamp ? formData.vacationExpirationDate.toDate() : new Date(formData.vacationExpirationDate), "dd/MM/yyyy") : <span>Selecionar data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={formData.vacationExpirationDate instanceof Timestamp ? formData.vacationExpirationDate.toDate() : (formData.vacationExpirationDate ? new Date(formData.vacationExpirationDate) : undefined)} onSelect={d => handleUpdateField('vacationExpirationDate', d ? Timestamp.fromDate(d) : null)} initialFocus locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>

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
                  <div className="space-y-2">
                    <Label>Regime</Label>
                    <Select value={formData.regimeType} onValueChange={v => handleUpdateField('regimeType', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                        <SelectItem value="intern">Estagiário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <Card className="print:border-none print:shadow-none">
              <CardHeader className="flex flex-row items-center justify-between print:hidden">
                <div>
                  <CardTitle className="text-lg">Folha Mensal</CardTitle>
                  <CardDescription>Cálculo de horas baseado em Batidas + Ocorrências.</CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700">Saldo: {formatMinutes(fullHistory.reduce((acc, day) => acc + calculateHours(day.records, day.date, day.adjustment).balance, 0))}</Badge>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <Table className="print:text-[10px]">
                  <TableHeader className="bg-muted/50 print:bg-slate-100">
                    <TableRow>
                      <TableHead className="w-32">Data</TableHead>
                      <TableHead>Batidas</TableHead>
                      <TableHead className="text-center">Trab.</TableHead>
                      <TableHead className="text-center">Saldo</TableHead>
                      <TableHead>Ocorrência</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fullHistory.map((day) => {
                      const stats = calculateHours(day.records, day.date, day.adjustment);
                      return (
                        <TableRow key={day.date.toISOString()} className={cn(stats.isWeekend && "bg-muted/20")}>
                          <TableCell className="font-medium">{format(day.date, "dd/MM (eee)", { locale: ptBR })}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {day.records.length > 0 ? day.records.map(r => r.timestamp ? format(r.timestamp.toDate(), 'HH:mm') : '--:--').join(' - ') : '--:--'}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{formatMinutes(stats.worked)}</TableCell>
                          <TableCell className={cn("text-center font-bold", stats.balance > 0 ? "text-emerald-600" : stats.balance < 0 ? "text-red-600" : "")}>{formatMinutes(stats.balance)}</TableCell>
                          <TableCell>{day.adjustment ? <Badge variant="outline" className="text-[10px] uppercase">{ADJUSTMENT_LABELS[day.adjustment.type]}</Badge> : ''}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="hidden print:grid grid-cols-2 gap-20 mt-16 text-center text-sm">
                  <div className="border-t border-black pt-2"><p>{selectedEmployee?.fullName}</p><p className="text-[10px]">Assinatura do Colaborador</p></div>
                  <div className="border-t border-black pt-2"><p>Ethera Longevidade</p><p className="text-[10px]">Assinatura do Gestor</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="space-y-6 print:hidden">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div><CardTitle className="text-lg">Descontos & Benefícios</CardTitle><CardDescription>Configure verbas fixas mensais.</CardDescription></div>
                <Button variant="outline" onClick={handleAddDiscount}><Plus className="mr-2 h-4 w-4" /> Adicionar Verba</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.discounts?.map((disc, idx) => (
                  <div key={disc.id} className="flex items-end gap-4 border p-4 rounded-lg">
                    <div className="flex-1 space-y-2"><Label>Descrição da Verba</Label><Input value={disc.name} onChange={e => {
                      const newDiscounts = [...(formData.discounts || [])];
                      newDiscounts[idx].name = e.target.value;
                      handleUpdateField('discounts', newDiscounts);
                    }} placeholder="Ex: Vale Transporte" /></div>
                    <div className="w-32 space-y-2"><Label>Percentual (%)</Label><Input type="number" value={disc.percentage} onChange={e => {
                      const newDiscounts = [...(formData.discounts || [])];
                      newDiscounts[idx].percentage = Number(e.target.value);
                      handleUpdateField('discounts', newDiscounts);
                    }} /></div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleUpdateField('discounts', formData.discounts?.filter(d => d.id !== disc.id))}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
                {(!formData.discounts || formData.discounts.length === 0) && <p className="text-center py-8 text-muted-foreground italic">Nenhuma verba configurada.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adjustments" className="space-y-6 print:hidden">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Ocorrências Lançadas</CardTitle>
                  <CardDescription>Atestados, faltas e folgas que afetam o espelho de ponto.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setIsAdjDialogOpen(true)}><Stethoscope className="mr-2 h-4 w-4" /> Lançar Nova</Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formData.adjustments?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma ocorrência registrada.</TableCell></TableRow>
                      ) : (
                        formData.adjustments?.sort((a,b) => b.date.toMillis() - a.date.toMillis()).map((adj) => (
                          <TableRow key={adj.id}>
                            <TableCell className="font-medium">{format(adj.date.toDate(), 'dd/MM/yyyy')}</TableCell>
                            <TableCell><Badge variant="outline">{ADJUSTMENT_LABELS[adj.type]}</Badge></TableCell>
                            <TableCell className="max-w-xs truncate">{adj.description || '-'}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteAdjustment(adj.id)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6 print:hidden">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-md">Documentos Digitalizados</CardTitle>
                <div className="relative">
                  <Input type="file" className="hidden" id="doc-upload-hr" onChange={handleFileUpload} disabled={isUploading} />
                  <Button variant="outline" size="sm" asChild disabled={isUploading}><label htmlFor="doc-upload-hr" className="cursor-pointer">
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />} Anexar Novo
                  </label></Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {formData.documents?.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 border rounded-md group hover:border-primary/50">
                    <div className="flex items-center gap-3 overflow-hidden"><FileText className="h-5 w-5 text-primary shrink-0" />
                      <div className="flex flex-col overflow-hidden"><span className="text-sm font-medium truncate">{doc.name}</span><span className="text-[10px] text-muted-foreground">{format(doc.uploadedAt.toDate(), 'dd/MM/yy')}</span></div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild><Link href={doc.url} target="_blank"><Download className="h-4 w-4" /></Link></Button>
                  </div>
                ))}
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