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
import type { Employee, EmployeeDiscount, TimeAdjustment, CompensationRecord, WorkStatus, EmployeeDocument, AttendanceRecord, AttendanceType, WorkSchedule, WorkScheduleType } from '@/lib/types';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { CalendarIcon, Loader2, Save, Plus, Trash2, Clock, UserCheck, CreditCard, CalendarDays, History, UploadCloud, FileText, Download, Paperclip, ClipboardList, Stethoscope, AlertCircle, Edit, Check, AlertTriangle, Info } from 'lucide-react';
import { format, differenceInMinutes, startOfMonth, endOfMonth, isSameDay, setHours, setMinutes, parse, getDay } from 'date-fns';
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
    days: {} // Implementado via lógica de alternância
  },
  'custom': {
    type: 'custom',
    days: {}
  }
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
  
  const [isManualRecordOpen, setIsManualRecordOpen] = useState(false);
  const [isEditRecordOpen, setIsEditRecordOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  
  const [manualDate, setManualDate] = useState<Date>(new Date());
  const [manualTime, setManualTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [manualType, setManualType] = useState<AttendanceType>('clock_in');
  const [manualNotes, setManualTypeNotes] = useState('');

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
      });
    } else {
      setFormData({});
    }
  }, [selectedEmployee]);

  const handleUpdateField = (field: keyof Employee, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpdateScheduleType = (type: WorkScheduleType) => {
    handleUpdateField('workSchedule', DEFAULT_SCHEDULES[type]);
  };

  const handleUpdateDailySchedule = (day: number, field: string, value: any) => {
    const currentSchedule = formData.workSchedule || DEFAULT_SCHEDULES['5x2'];
    const updatedDays = {
      ...currentSchedule.days,
      [day]: { ...currentSchedule.days[day], [field]: value }
    };
    handleUpdateField('workSchedule', { ...currentSchedule, days: updatedDays });
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

  const groupedHistory = useMemo(() => {
    if (!rawAttendance) return [];
    const groups: Record<string, AttendanceRecord[]> = {};
    rawAttendance.forEach(record => {
      const dateKey = format(record.timestamp.toDate(), 'yyyy-MM-dd');
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(record);
    });

    return Object.entries(groups).map(([date, records]) => ({
      date: parse(date, 'yyyy-MM-dd', new Date()),
      records: records.sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
    })).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [rawAttendance]);

  const calculateHours = (records: AttendanceRecord[], dayDate: Date) => {
    const clockIn = records.find(r => r.type === 'clock_in')?.timestamp.toDate();
    const breakStart = records.find(r => r.type === 'break_start')?.timestamp.toDate();
    const breakEnd = records.find(r => r.type === 'break_end')?.timestamp.toDate();
    const clockOut = records.find(r => r.type === 'clock_out')?.timestamp.toDate();

    if (!clockIn || !clockOut) return { worked: 0, extra: 0, balance: 0, alerts: [] };

    let totalMinutes = differenceInMinutes(clockOut, clockIn);
    const alerts: string[] = [];

    // Almoço
    if (breakStart && breakEnd) {
      const lunchMinutes = differenceInMinutes(breakEnd, breakStart);
      if (lunchMinutes < 60 && totalMinutes > 360) alerts.push('Intervalo inferior a 1h');
      totalMinutes -= lunchMinutes;
    } else if (totalMinutes > 360) {
      alerts.push('Sem registro de almoço');
    }

    // Escala
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

    const balance = totalMinutes - expectedMinutes;
    const isWeekend = dayOfWeek === 0 || (dayOfWeek === 6 && !daySchedule?.workDay);
    
    return {
      worked: totalMinutes,
      expected: expectedMinutes,
      balance,
      isWeekend,
      alerts
    };
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
      updateDocumentNonBlocking(doc(firestore!, 'employees', selectedEmployeeId), { documents: updatedDocs });
      toast({ title: 'Documento anexado' });
    } catch (e) { toast({ variant: 'destructive', title: 'Erro no upload' }); }
    finally { setIsUploading(false); }
  };

  if (employeesLoading) return <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight text-primary">Gestão de Colaboradores</h1>
          <p className="text-muted-foreground">Controle de jornada, escalas e documentação CLT.</p>
        </div>
        <div className="flex gap-2">
          {selectedEmployeeId && (
            <Button onClick={handleSaveEmployee} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Alterações
            </Button>
          )}
        </div>
      </header>

      <Card className="border-primary/20 shadow-sm">
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
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto p-1 bg-muted/50">
            <TabsTrigger value="contract" className="py-2">Contrato & Escala</TabsTrigger>
            <TabsTrigger value="attendance" className="py-2">Folha Ponto</TabsTrigger>
            <TabsTrigger value="experience" className="py-2">Status & Férias</TabsTrigger>
            <TabsTrigger value="discounts" className="py-2">Financeiro</TabsTrigger>
            <TabsTrigger value="documents" className="py-2">Arquivos</TabsTrigger>
          </TabsList>

          <TabsContent value="contract" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader><CardTitle className="text-md">Escala de Trabalho</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tipo de Escala</Label>
                    <Select value={formData.workSchedule?.type} onValueChange={(v: WorkScheduleType) => handleUpdateScheduleType(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5x2">5x2 (Seg a Sex)</SelectItem>
                        <SelectItem value="6x1">6x1 (Folga Variável)</SelectItem>
                        <SelectItem value="12x36">12x36 (Plantão)</SelectItem>
                        <SelectItem value="custom">Personalizada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-3 bg-primary/5 rounded-md border border-primary/10">
                    <p className="text-xs text-muted-foreground flex gap-2">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Configure os horários padrão para cálculo automático de horas extras e banco de horas.</span>
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-md">Detalhamento da Jornada Semanal</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                      const dayName = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day];
                      const schedule = formData.workSchedule?.days[day];
                      return (
                        <div key={day} className="flex flex-wrap items-center gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                          <div className="w-24 font-medium text-sm">{dayName}</div>
                          <div className="flex items-center gap-2">
                            <Checkbox 
                              checked={schedule?.workDay} 
                              onCheckedChange={(checked) => handleUpdateDailySchedule(day, 'workDay', !!checked)} 
                            />
                            <span className="text-xs">Trabalha</span>
                          </div>
                          {schedule?.workDay && (
                            <>
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] uppercase">Entrada</Label>
                                <Input type="time" className="w-24 h-8" value={schedule.start} onChange={(e) => handleUpdateDailySchedule(day, 'start', e.target.value)} />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] uppercase">Almoço</Label>
                                <Input type="time" className="w-24 h-8" value={schedule.lunchStart} onChange={(e) => handleUpdateDailySchedule(day, 'lunchStart', e.target.value)} />
                                <span className="text-xs">às</span>
                                <Input type="time" className="w-24 h-8" value={schedule.lunchEnd} onChange={(e) => handleUpdateDailySchedule(day, 'lunchEnd', e.target.value)} />
                              </div>
                              <div className="flex items-center gap-2">
                                <Label className="text-[10px] uppercase">Saída</Label>
                                <Input type="time" className="w-24 h-8" value={schedule.end} onChange={(e) => handleUpdateDailySchedule(day, 'end', e.target.value)} />
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Espelho de Ponto Automatizado</CardTitle>
                  <CardDescription>Cálculo de horas baseado na escala CLT configurada.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Total Mensal: {formatMinutes(groupedHistory.reduce((acc, day) => acc + calculateHours(day.records, day.date).balance, 0))}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-32">Data</TableHead>
                        <TableHead>Batidas</TableHead>
                        <TableHead className="text-center">Jornada</TableHead>
                        <TableHead className="text-center">Intervalo</TableHead>
                        <TableHead className="text-center">Total Trab.</TableHead>
                        <TableHead className="text-center">Saldo (B.H)</TableHead>
                        <TableHead>Alertas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedHistory.map((day) => {
                        const stats = calculateHours(day.records, day.date);
                        const clockIn = day.records.find(r => r.type === 'clock_in');
                        const breakStart = day.records.find(r => r.type === 'break_start');
                        const breakEnd = day.records.find(r => r.type === 'break_end');
                        const clockOut = day.records.find(r => r.type === 'clock_out');

                        return (
                          <TableRow key={day.date.toISOString()} className={cn(stats.isWeekend && "bg-muted/20")}>
                            <TableCell className="font-medium text-xs">
                              {format(day.date, "dd/MM (eee)", { locale: ptBR })}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {day.records.map(r => (
                                  <Badge key={r.id} variant="secondary" className="text-[10px] px-1 font-mono">
                                    {format(r.timestamp.toDate(), 'HH:mm')}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {formatMinutes(stats.expected)}
                            </TableCell>
                            <TableCell className="text-center text-xs">
                              {breakStart && breakEnd ? formatMinutes(differenceInMinutes(breakEnd.timestamp.toDate(), breakStart.timestamp.toDate())) : '--'}
                            </TableCell>
                            <TableCell className="text-center font-bold text-xs">
                              {formatMinutes(stats.worked)}
                            </TableCell>
                            <TableCell className={cn("text-center font-bold text-xs", stats.balance > 0 ? "text-emerald-600" : stats.balance < 0 ? "text-red-600" : "")}>
                              {formatMinutes(stats.balance)}
                            </TableCell>
                            <TableCell>
                              {stats.alerts.map((alert, i) => (
                                <div key={i} className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                                  <AlertTriangle className="h-3 w-3" /> {alert}
                                </div>
                              ))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experience" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-md">Período de Experiência</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Fim da Experiência (90 dias)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.experienceEndDate ? format(formData.experienceEndDate.toDate(), "PPP", { locale: ptBR }) : <span>Definir...</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formData.experienceEndDate?.toDate()} onSelect={(d) => handleUpdateField('experienceEndDate', d ? Timestamp.fromDate(d) : null)} initialFocus locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-md">Próximas Férias</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Vencimento do Período Aquisitivo</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.vacationExpirationDate ? format(formData.vacationExpirationDate.toDate(), "PPP", { locale: ptBR }) : <span>Definir...</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={formData.vacationExpirationDate?.toDate()} onSelect={(d) => handleUpdateField('vacationExpirationDate', d ? Timestamp.fromDate(d) : null)} initialFocus locale={ptBR} />
                      </PopoverContent>
                    </Popover>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="discounts" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-md">Vencimentos e Descontos</CardTitle>
                <Button variant="outline" size="sm" onClick={() => handleUpdateField('discounts', [...(formData.discounts || []), { id: crypto.randomUUID(), name: '', percentage: 0 }])}>
                  <Plus className="h-4 w-4 mr-2" /> Novo
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.discounts?.map((discount, index) => (
                  <div key={discount.id} className="flex items-end gap-4 border p-4 rounded-md bg-muted/20">
                    <div className="flex-1 space-y-2">
                      <Label>Descrição</Label>
                      <Input value={discount.name} onChange={(e) => {
                        const nd = [...(formData.discounts || [])];
                        nd[index].name = e.target.value;
                        handleUpdateField('discounts', nd);
                      }} />
                    </div>
                    <div className="w-32 space-y-2">
                      <Label>Percentual (%)</Label>
                      <Input type="number" value={discount.percentage} onChange={(e) => {
                        const nd = [...(formData.discounts || [])];
                        nd[index].percentage = parseFloat(e.target.value) || 0;
                        handleUpdateField('discounts', nd);
                      }} />
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleUpdateField('discounts', formData.discounts?.filter(d => d.id !== discount.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
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
        <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed bg-muted/10">
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
